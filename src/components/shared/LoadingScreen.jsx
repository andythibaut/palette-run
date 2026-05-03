import PalletLogo from './PalletLogo'

export default function LoadingScreen({ message = 'Chargement…' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg gap-4">
      <div className="opacity-60 animate-pulse">
        <PalletLogo size={48} color="#F5A623" />
      </div>
      <p className="font-mono text-xs text-muted tracking-widest">{message}</p>
    </div>
  )
}
