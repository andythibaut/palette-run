# 🪵 Palette Run 2

Marketplace de palettes entre chauffeurs et entreprises.

## Stack

- **Frontend** : React + Vite + TailwindCSS
- **Backend**  : Supabase (auth + DB + realtime)
- **Cartes**   : Mapbox (react-map-gl)
- **State**    : Zustand

## Installation

```bash
# 1. Cloner le projet
git clone https://github.com/votre-compte/palette-run.git
cd palette-run

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Remplir les valeurs dans .env

# 4. Lancer en développement
npm run dev
```

## Configuration

### Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Copiez l'URL et la clé anonyme dans `.env`
3. Exécutez `palette-run-schema.sql` dans l'éditeur SQL Supabase
4. Activez le Realtime sur les tables : `listings`, `bids`, `notifications`
5. Configurez les providers OAuth :
   - Google : [console.cloud.google.com](https://console.cloud.google.com)
   - Apple  : [developer.apple.com](https://developer.apple.com)
   - Facebook : [developers.facebook.com](https://developers.facebook.com)

### Mapbox

1. Créez un compte sur [mapbox.com](https://mapbox.com)
2. Créez un token d'accès public
3. Ajoutez-le dans `.env` : `VITE_MAPBOX_TOKEN=pk.xxx`

## Structure du projet

```
src/
├── components/
│   ├── auth/        # Profil chauffeur
│   ├── company/     # Tableau de bord entreprise
│   ├── listing/     # Annonces (liste, bottom sheet)
│   ├── map/         # Carte Mapbox
│   └── shared/      # Composants communs
├── pages/           # Pages / routes principales
├── store/           # État global (Zustand)
│   ├── useAuthStore.js     # Auth + profil
│   ├── useListingStore.js  # Annonces + temps réel
│   └── useCompanyStore.js  # Gestion entreprise
├── lib/
│   ├── supabase.js  # Client Supabase
│   └── mapbox.js    # Config Mapbox + helpers
└── styles/
    └── index.css    # Styles globaux + Tailwind
```

## Déploiement

```bash
# Build production
npm run build

# Déployer sur Supabase Hosting
npx supabase deploy
```

## Tiers

| Tier    | Prix     | Palettes visibles | Fonctionnalités |
|---------|----------|-------------------|-----------------|
| Gratuit | 0€       | ≤ 2 palettes      | Liste + carte   |
| Premium | 9,90€/mois | ≤ 10 palettes   | + Favoris       |
| Gold    | 24,90€/mois | Illimité        | + Réservation + Enchères + Filtre |
