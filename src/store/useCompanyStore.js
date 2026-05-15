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
      .select('*, bids(*)')
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
  fetchDrivers: async (listingId) => {
    const { data, error } = await supabase
      .from('bids')
      .select('*, profiles(*)')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })

    if (error) { set({ error: error.message }); return }
    // Déduplique par chauffeur
    const seen = new Set()
    const unique = (data || []).filter(b => {
      if (seen.has(b.bidder_id)) return false
      seen.add(b.bidder_id)
      return true
    })
    set({ drivers: unique })
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
