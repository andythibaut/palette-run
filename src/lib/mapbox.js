export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

export const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11'

export const DEFAULT_CENTER = {
  longitude: 2.3522,
  latitude:  48.8566,
  zoom:      12,
}

// Couleur des marqueurs selon le bénéfice par palette
export const profitColor = (buyPrice, resalePrice, goldThreshold = 20) => {
  if (!resalePrice) return '#4A5568'
  const profit = resalePrice - buyPrice
  if (profit < 0)             return '#EF4444' // rouge
  if (profit < 2.0)           return '#F97316' // orange
  if (profit < goldThreshold) return '#2ECC71' // vert
  return '#FFD166'                             // or
}
