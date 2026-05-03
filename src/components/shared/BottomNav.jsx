export default function BottomNav({ tabs, active, onTab }) {
  return (
    <nav className="flex bg-bg/95 backdrop-blur-xl border-t border-border pb-safe shrink-0">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onTab(t.id)}
          className="flex-1 flex flex-col items-center gap-1 py-3 cursor-pointer bg-transparent border-none relative"
        >
          <span className="text-xl leading-none">{t.icon}</span>
          <span className={`text-[10px] font-mono tracking-wider ${active === t.id ? 'text-amber' : 'text-muted'}`}>
            {t.label}
          </span>
          {active === t.id && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber" />
          )}
        </button>
      ))}
    </nav>
  )
}
