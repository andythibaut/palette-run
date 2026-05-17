import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useListingStore = create((set, get) => ({
  listings:    [],
  selected:    null,
  loading:     false,
  error:       null,
  realtimeSub: null,

  // Charge les annonces actives filtrées par type de véhicule
  fetchListings: async (vehicleType) => {
    set({ loading: true, error: null })

    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        companies (
          id, city,
          location, vehicle_required, has_loader
        )
      `)
      .eq('is_active', true)

    if (error) { set({ error: error.message, loading: false }); return }

    // Hiérarchie véhicule : vl > porteur > semi
    // Un VL voit tout, un porteur voit porteur+semi, un semi voit semi uniquement
    const vehicleRank = { vl: 3, porteur: 2, semi: 1 }
    const userRank    = vehicleRank[vehicleType] || 3 // défaut VL = voit tout

    const filtered = (data || []).filter(l => {
      const required = l.companies?.vehicle_required || 'semi'
      return vehicleRank[required] <= userRank
    })

    // Parse les coordonnées GPS depuis le format EWKB hex de Supabase
    const listings = (filtered || []).map(l => {
      if (l.companies?.location) {
        try {
          const hex = l.companies.location
          const buf = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)))
          const view = new DataView(buf.buffer)
          const byteOrder = buf[0]
          const hasSRID = (view.getUint32(1, byteOrder === 1) & 0x20000000) !== 0
          const offset = hasSRID ? 9 : 5
          l.companies._lng = view.getFloat64(offset,     byteOrder === 1)
          l.companies._lat = view.getFloat64(offset + 8, byteOrder === 1)
        } catch (e) {
          console.error('EWKB parse error:', e)
        }
      }
      return l
    })

    set({ listings, loading: false })
  },

  // Écoute les mises à jour en temps réel (enchères, réservations)
  subscribeRealtime: () => {
    const sub = supabase
      .channel('listings-realtime')
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'listings',
        // Pas de filtre — on gère is_active dans le handler
      }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload

        set((state) => {
          if (eventType === 'INSERT') {
            return { listings: [...state.listings, newRow] }
          }
          if (eventType === 'UPDATE') {
            // Si l'annonce est désactivée, on la retire comme un DELETE
            if (!newRow.is_active) {
              return {
                listings: state.listings.filter(l => l.id !== newRow.id),
                selected: state.selected?.id === newRow.id ? null : state.selected,
              }
            }
            return {
              listings: state.listings.map(l =>
                l.id === newRow.id ? { ...l, ...newRow } : l
              ),
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

  // Réserve une annonce et crée une transaction pending
  reserveListing: async (listingId) => {
    const { data: { user } } = await supabase.auth.getUser()

    // Récupère l'annonce
    const { data: listing } = await supabase
      .from('listings')
      .select('*, companies(id, owner_id)')
      .eq('id', listingId)
      .single()

    if (!listing) return false

    // Met à jour la réservation
    const { error: resError } = await supabase
      .from('listings')
      .update({
        reserved_by: user.id,
        reserved_at: new Date().toISOString(),
        reservation_expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', listingId)
      .is('reserved_by', null)

    if (resError) { set({ error: resError.message }); return false }

    // Crée une transaction pending visible dans "Achats"
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        listing_id:           listingId,
        company_id:           listing.company_id,
        driver_id:            user.id,
        qty:                  listing.qty,
        buy_price:            listing.current_bid || listing.price,
        status:               'pending',
        company_validated_at: null,
        had_active_bid:       listing.current_bid !== null,
      })

    if (txError) {
      // L'index unique en base a bloqué une double réservation
      // On annule la mise à jour de reserved_by pour remettre l'annonce disponible
      if (txError.code === '23505') {
        await supabase.from('listings').update({ reserved_by: null, reserved_at: null, reservation_expires_at: null }).eq('id', listingId)
        set({ error: 'Cette annonce vient d\'être réservée par un autre chauffeur.' })
      } else {
        set({ error: txError.message })
      }
      return false
    }
    return true
  },

  // Place une enchère
  placeBid: async (listingId, step, currentPrice, distKm) => {
    const { data: { user } } = await supabase.auth.getUser()
    const newPrice = parseFloat((currentPrice + step).toFixed(2))

    // Durée du gel selon le step
    const lockDurations = { 0.50: 60, 1.00: 120 } // minutes
    const lockMin = lockDurations[step] ?? null
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
        bid_auto_confirm: step >= 0.50,
        reserved_by:      user.id,
        reserved_at:      new Date().toISOString(),
      })
      .eq('id', listingId)

    if (listingError) { set({ error: listingError.message }); return false }

    // Met à jour le listing dans le store local pour que le prix s'affiche immédiatement
    set(state => ({
      listings: state.listings.map(l =>
        l.id === listingId
          ? { ...l, current_bid: newPrice, bid_locked_until: lockedUntil, reserved_by: user.id }
          : l
      ),
      selected: state.selected?.id === listingId
        ? { ...state.selected, current_bid: newPrice, bid_locked_until: lockedUntil, reserved_by: user.id }
        : state.selected
    }))

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
