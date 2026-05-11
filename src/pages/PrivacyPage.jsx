import { useNavigate } from 'react-router-dom'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg text-white px-5 py-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/')}
          className="text-muted text-sm cursor-pointer bg-transparent border-none">
          ← Retour
        </button>
      </div>

      <h1 className="font-bebas text-4xl text-amber mb-1">Politique de confidentialité</h1>
      <p className="text-muted text-xs font-mono mb-10">Dernière mise à jour : 11 mai 2026</p>

      <div className="flex flex-col gap-8 text-sub text-sm leading-relaxed">

        <section>
          <h2 className="font-bebas text-xl text-white mb-2">1. Qui sommes-nous ?</h2>
          <p>Palette Run est une application web de mise en relation entre acheteurs et vendeurs de palettes, accessible à l'adresse <a href="https://palette-run.fr" className="text-amber">palette-run.fr</a>.</p>
        </section>

        <section>
          <h2 className="font-bebas text-xl text-white mb-2">2. Données collectées</h2>
          <p>Lors de l'utilisation de Palette Run, nous collectons les données suivantes :</p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
            <li>Adresse email et nom lors de l'inscription</li>
            <li>Informations de profil (type de véhicule, prix de revente)</li>
            <li>Données de localisation GPS (uniquement avec votre consentement)</li>
            <li>Données de transaction (réservations effectuées)</li>
            <li>Données de connexion via Google OAuth (email, nom)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bebas text-xl text-white mb-2">3. Utilisation des données</h2>
          <p>Les données collectées sont utilisées exclusivement pour :</p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
            <li>Permettre la mise en relation entre acheteurs et vendeurs</li>
            <li>Afficher les annonces de palettes disponibles sur la carte</li>
            <li>Gérer les réservations et transactions</li>
            <li>Améliorer l'expérience utilisateur</li>
          </ul>
          <p className="mt-2">Vos données ne sont jamais vendues à des tiers ni utilisées à des fins publicitaires.</p>
        </section>

        <section>
          <h2 className="font-bebas text-xl text-white mb-2">4. Stockage des données</h2>
          <p>Les données sont stockées de manière sécurisée sur les serveurs de Supabase (infrastructure européenne) et ne sont accessibles qu'aux utilisateurs autorisés.</p>
        </section>

        <section>
          <h2 className="font-bebas text-xl text-white mb-2">5. Connexion via Google</h2>
          <p>Si vous choisissez de vous connecter via Google, nous accédons uniquement à votre adresse email et votre nom d'affichage. Nous ne publions rien sur votre compte Google.</p>
        </section>

        <section>
          <h2 className="font-bebas text-xl text-white mb-2">6. Données de localisation</h2>
          <p>La géolocalisation est utilisée uniquement pour centrer la carte sur votre position. Votre position exacte n'est jamais partagée avec d'autres utilisateurs. Les coordonnées des vendeurs sont volontairement décalées d'environ 500 mètres avant confirmation d'une réservation.</p>
        </section>

        <section>
          <h2 className="font-bebas text-xl text-white mb-2">7. Vos droits (RGPD)</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Droit d'accès à vos données personnelles</li>
            <li>Droit de rectification de vos données</li>
            <li>Droit à l'effacement (droit à l'oubli)</li>
            <li>Droit à la portabilité de vos données</li>
          </ul>
          <p className="mt-2">Pour exercer ces droits : <a href="mailto:contact@palette-run.fr" className="text-amber">contact@palette-run.fr</a></p>
        </section>

        <section>
          <h2 className="font-bebas text-xl text-white mb-2">8. Cookies</h2>
          <p>Palette Run utilise uniquement des cookies techniques nécessaires au fonctionnement (session de connexion). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.</p>
        </section>

        <section>
          <h2 className="font-bebas text-xl text-white mb-2">9. Contact</h2>
          <p>Pour toute question : <a href="mailto:contact@palette-run.fr" className="text-amber">contact@palette-run.fr</a></p>
        </section>

      </div>

      <div className="mt-12 pt-6 border-t border-border text-center text-muted text-xs">
        © 2026 Palette Run — <a href="https://palette-run.fr" className="text-amber">palette-run.fr</a>
      </div>
    </div>
  )
}
