// Ajoute N jours ouvrés à une date (exclut samedi et dimanche)
export function addWorkingDays(date, days) {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const day = result.getDay()
    if (day !== 0 && day !== 6) added++ // 0 = dimanche, 6 = samedi
  }
  return result
}

export const AUCTION_DURATION_DAYS  = 5 // durée enchère en jours ouvrés
export const PICKUP_DURATION_DAYS   = 5 // délai récupération en jours ouvrés
