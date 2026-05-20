import { useState, useEffect } from 'react'

function getTimeLeft(endsAt) {
  const diff = new Date(endsAt) - new Date()
  if (diff <= 0) return null
  const days    = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds, diff }
}

// Mode daysOnly : affiche uniquement le nombre de jours (anti-sniping)
function DaysOnlyCountdown({ endsAt }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(endsAt))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(endsAt))
    }, 60000) // rafraîchit toutes les minutes seulement
    return () => clearInterval(interval)
  }, [endsAt])

  if (!timeLeft) return (
    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-red">
      ⏱ Enchère terminée
    </div>
  )

  const isUrgent = timeLeft.days === 0
  const color    = isUrgent ? "#EF4444" : "#EC4899"
  const label    = timeLeft.days === 0
    ? "Dernier jour"
    : timeLeft.days === 1
      ? "1 jour restant"
      : `${timeLeft.days} jours restants`

  return (
    <div className="rounded-xl border px-4 py-3 text-center"
      style={{ borderColor: `${color}33`, background: `${color}08` }}>
      <p className="text-xs font-semibold mb-1" style={{ color }}>⏱ Enchère en cours</p>
      <p className="font-bebas text-2xl" style={{ color }}>{label}</p>
    </div>
  )
}

// Mode complet : affiche jours/heures/minutes/secondes (pour le commerçant)
export default function AuctionCountdown({ endsAt, daysOnly = false }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(endsAt))

  useEffect(() => {
    if (daysOnly) return // géré dans DaysOnlyCountdown
    const interval = setInterval(() => {
      const t = getTimeLeft(endsAt)
      setTimeLeft(t)
      if (!t) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [endsAt, daysOnly])

  if (daysOnly) return <DaysOnlyCountdown endsAt={endsAt} />

  if (!timeLeft) return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-red">
      ⏱ Enchère terminée
    </div>
  )

  const isUrgent = timeLeft.diff < 1000 * 60 * 60 * 24
  const color    = isUrgent ? "#EF4444" : "#EC4899"

  return (
    <div className="rounded-xl border px-4 py-3"
      style={{ borderColor: `${color}33`, background: `${color}08` }}>
      <p className="text-xs font-semibold mb-2 text-center" style={{ color }}>
        ⏱ Temps restant
      </p>
      <div className="flex items-center justify-center gap-2">
        {timeLeft.days > 0 && (
          <>
            <div className="text-center">
              <p className="font-bebas text-3xl leading-none" style={{ color }}>{timeLeft.days}</p>
              <p className="text-[9px] text-muted uppercase tracking-wide">jours</p>
            </div>
            <span className="font-bebas text-2xl pb-3" style={{ color }}>:</span>
          </>
        )}
        <div className="text-center">
          <p className="font-bebas text-3xl leading-none" style={{ color }}>
            {String(timeLeft.hours).padStart(2, "0")}
          </p>
          <p className="text-[9px] text-muted uppercase tracking-wide">heures</p>
        </div>
        <span className="font-bebas text-2xl pb-3" style={{ color }}>:</span>
        <div className="text-center">
          <p className="font-bebas text-3xl leading-none" style={{ color }}>
            {String(timeLeft.minutes).padStart(2, "0")}
          </p>
          <p className="text-[9px] text-muted uppercase tracking-wide">min</p>
        </div>
        <span className="font-bebas text-2xl pb-3" style={{ color }}>:</span>
        <div className="text-center">
          <p className="font-bebas text-3xl leading-none" style={{ color }}>
            {String(timeLeft.seconds).padStart(2, "0")}
          </p>
          <p className="text-[9px] text-muted uppercase tracking-wide">sec</p>
        </div>
      </div>
    </div>
  )
}
