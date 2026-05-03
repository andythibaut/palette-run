import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useListingStore = create((set, get) => ({
  listings:    [],
  selected:    null,
  loading:     false,
  error:       null,
  realtimeSub: null,

  // Charge les annonces actives avec les infos de la company
  fetchListings: async (userLocation) => {
    set({ loading: true, error: null })

    let query = supabase
      .from('listings')
      .select(`
        *,
        companies (
          id, name, city, address,
          location
        )
      `)
      .eq('is_active', true)

    const { data, error } = await query

    if (error) { set({ error: error.message, loading: false }); return }
    set({ listings: data || [], loading: false })
  },

  // Écoute les mises à jour en temps réel (enchères, réservations)
  subscribeRealtime: () => {
    const sub = supabase
      .channel('listings-realtime')
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'listings',
        filter: 'is_active=eq.true',
      }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload

        set((state) => {
          if (eventType === 'INSERT') {
            return { listings: [...state.listings, newRow] }
          }
          if (eventType === 'UPDATE') {
            return {
              listings: state.listings.map(l =>
                l.id === newRow.id ? { ...l, ...newRow } : l
              ),
              // Met à jour selected si ouvert
              selected: state.selected?.id === newRow.id
                ? { ...state.selected, ...newRow }
                : state.selected,
            }
          }
          if (eventType === 'DELETE') {
            return {
              listings: state.listings.filter(l => l.id !== oldRow.id),
              selected: state.selected?.id === oldRow.id ? null : state.selected,
            }
          }
          return state
        })
      })
      .subscribe()

    set({ realtimeSub: sub })
  },

  unsubscribeRealtime: () => {
    const { realtimeSub } = get()
    if (realtimeSub) {
      supabase.removeChannel(realtimeSub)
      set({ realtimeSub: null })
    }
  },

  setSelected: (listing) => set({ selected: listing }),

  // Réserve une annonce (Gold uniquement)
  reserveListing: async (listingId) => {
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('listings')
      .update({
        reserved_by: user.id,
        reserved_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .is('reserved_by', null) // vérifie qu'elle n'est pas déjà réservée

    if (error) { set({ error: error.message }); return false }
    return true
  },

  // Place une enchère
  placeBid: async (listingId, step, currentPrice, distKm) => {
    const { data: { user } } = await supabase.auth.getUser()
    const newPrice = parseFloat((currentPrice + step).toFixed(2))

    // Durée du gel selon le step
    const lockDurations = { 0.10: null, 0.20: 30, 0.50: 120 } // minutes
    const lockMin = lockDurations[step]
    const lockedUntil = lockMin
      ? new Date(Date.now() + lockMin * 60 * 1000).toISOString()
      : null

    // Insère l'enchère
    const { error: bidError } = await supabase
      .from('bids')
      .insert({
        listing_id: listingId,
        bidder_id:  user.id,
        price:      newPrice,
        step,
        dist_km:    distKm,
      })

    if (bidError) { set({ error: bidError.message }); return false }

    // Met à jour l'annonce
    const { error: listingError } = await supabase
      .from('listings')
      .update({
        current_bid:      newPrice,
        bid_lock_step:    step,
        bid_locked_until: lockedUntil,
        bid_auto_confirm: step === 0.50,
        reserved_by:      user.id,
        reserved_at:      new Date().toISOString(),
      })
      .eq('id', listingId)

    if (listingError) { set({ error: listingError.message }); return false }
    return true
  },

  // Confirme une transaction (commerçant)
  confirmTransaction: async (listingId, driverId, confirmedBy) => {
    // Récupère l'annonce
    const listing = get().listings.find(l => l.id === listingId)
    if (!listing) return false

    // Crée la transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        listing_id:    listingId,
        company_id:    listing.company_id,
        driver_id:     driverId,
        qty:           listing.qty,
        buy_price:     listing.current_bid || listing.price,
        confirmed_by:  confirmedBy,
        had_active_bid: listing.current_bid !== null,
      })

    if (txError) { set({ error: txError.message }); return false }

    // Désactive l'annonce
    await supabase
      .from('listings')
      .update({ is_active: false })
      .eq('id', listingId)

    return true
  },
}))
