import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useCompanyStore = create((set, get) => ({
  company:  null,
  listing:  null,
  drivers:  [],
  blacklist:[],
  loading:  false,
  error:    null,

  // Réinitialise le store (après déconnexion/suppression)
  reset: () => set({ company: null, listing: null, drivers: [], blacklist: [], loading: false, error: null }),

  // Charge les données de l'entreprise
  fetchCompany: async (ownerId) => {
    set({ loading: true })

    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', ownerId)
      .single()

    if (error && error.code !== 'PGRST116') {
      set({ error: error.message, loading: false })
      return
    }

    if (company) {
      set({ company })
      await get().fetchActiveListing(company.id)
      await get().fetchBlacklist(company.id)
    } else {
      // Aucune company trouvée — reset propre
      set({ company: null, listing: null, drivers: [], blacklist: [] })
    }

    set({ loading: false })
  },

  // Crée le profil entreprise
  createCompany: async ({ name, city, address, lat, lng, ownerId }) => {
    const { data, error } = await supabase
      .from('companies')
      .insert({
        owner_id: ownerId,
        name, city, address,
        location: `POINT(${lng} ${lat})`,
      })
      .select()
      .single()

    if (error) { set({ error: error.message }); return false }
    set({ company: data })
    return true
  },

  // Récupère l'annonce active
  fetchActiveListing: async (companyId) => {
    const { data, error } = await supabase
      .from('listings')
      .select('*, bids(*), companies(id, city, location)')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      set({ error: error.message })
      return
    }
    set({ listing: data || null })
  },

  // Publie une nouvelle annonce
  publishListing: async ({ qty, price, pickupBefore }) => {
    const { company } = get()
    if (!company) return false

    // Désactive l'ancienne si elle existe
    await supabase
      .from('listings')
      .update({ is_active: false })
      .eq('company_id', company.id)
      .eq('is_active', true)

    const { data, error } = await supabase
      .from('listings')
      .insert({
        company_id:    company.id,
        qty,
        price,
        pickup_before: pickupBefore,
        is_active:     true,
      })
      .select()
      .single()

    if (error) { set({ error: error.message }); return false }
    set({ listing: data })
    return true
  },

  // Met à jour l'annonce (quantité ou prix)
  updateListing: async (updates) => {
    const { listing } = get()
    if (!listing) return false

    const { data, error } = await supabase
      .from('listings')
      .update(updates)
      .eq('id', listing.id)
      .select()
      .single()

    if (error) { set({ error: error.message }); return false }
    set({ listing: data })
    return true
  },

  // Supprime l'annonce
  deleteListing: async () => {
    const { listing } = get()
    if (!listing) return false

    const { error } = await supabase
      .from('listings')
      .update({ is_active: false })
      .eq('id', listing.id)

    if (error) { set({ error: error.message }); return false }
    set({ listing: null })
    return true
  },

  // Récupère les chauffeurs qui ont consulté
  fetchDrivers: async (listingId, reservedBy) => {
    // 1. Chauffeurs ayant une transaction pending ou authorized
    const { data: txData } = await supabase
      .from('transactions')
      .select('*, profiles(*)')
      .eq('listing_id', listingId)
      .in('status', ['pending', 'authorized'])

    // 2. Chauffeurs ayant enchéri
    const { data: bidsData } = await supabase
      .from('bids')
      .select('*, profiles(*)')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })

    const seen = new Set()
    const result = []

    // Priorité aux réservations
    for (const tx of (txData || [])) {
      if (!seen.has(tx.driver_id)) {
        seen.add(tx.driver_id)
        result.push({ bidder_id: tx.driver_id, profiles: tx.profiles, isReservation: true, isAuthorized: tx.status === 'authorized', created_at: tx.created_at, transaction_id: tx.id })
      }
    }

    // Puis les enchères
    for (const bid of (bidsData || [])) {
      if (!seen.has(bid.bidder_id)) {
        seen.add(bid.bidder_id)
        result.push(bid)
      }
    }

    set({ drivers: result })
  },

  // Récupère la liste noire
  fetchBlacklist: async (companyId) => {
    const { data, error } = await supabase
      .from('blacklist')
      .select('*, profiles(id, full_name, phone)')
      .eq('company_id', companyId)

    if (error) { set({ error: error.message }); return }
    set({ blacklist: data || [] })
  },

  // Blackliste un chauffeur
  blacklistDriver: async (driverId, reason) => {
    const { company } = get()
    if (!company) return false

    const { error } = await supabase
      .from('blacklist')
      .insert({ company_id: company.id, driver_id: driverId, reason })

    if (error) { set({ error: error.message }); return false }
    await get().fetchBlacklist(company.id)
    return true
  },

  // Retire un chauffeur de la liste noire
  unblacklistDriver: async (driverId) => {
    const { company } = get()
    if (!company) return false

    const { error } = await supabase
      .from('blacklist')
      .delete()
      .eq('company_id', company.id)
      .eq('driver_id', driverId)

    if (error) { set({ error: error.message }); return false }
    await get().fetchBlacklist(company.id)
    return true
  },
}))
