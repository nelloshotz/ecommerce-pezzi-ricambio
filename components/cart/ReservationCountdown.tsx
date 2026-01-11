'use client'

import { useState, useEffect } from 'react'
import { FiClock, FiAlertTriangle } from 'react-icons/fi'

interface ReservationCountdownProps {
  reservationExpiresAt: Date | string | null
  onExpired?: () => void
}

export default function ReservationCountdown({
  reservationExpiresAt,
  onExpired,
}: ReservationCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    if (!reservationExpiresAt) {
      return
    }

    const updateCountdown = () => {
      const now = new Date().getTime()
      const expires = new Date(reservationExpiresAt).getTime()
      const difference = expires - now

      if (difference <= 0) {
        setIsExpired(true)
        setTimeLeft('Scaduta')
        if (onExpired) {
          onExpired()
        }
        return
      }

      setIsExpired(false)

      // Calcola minuti e secondi rimanenti
      const minutes = Math.floor(difference / 1000 / 60)
      const seconds = Math.floor((difference / 1000) % 60)

      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    // Aggiorna immediatamente
    updateCountdown()

    // Aggiorna ogni secondo
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [reservationExpiresAt, onExpired])

  if (!reservationExpiresAt) {
    return null
  }

  return (
    <div
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
        isExpired
          ? 'bg-red-100 text-red-800 border border-red-200'
          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      }`}
    >
      {isExpired ? (
        <>
          <FiAlertTriangle className="w-4 h-4" />
          <span>Prenotazione scaduta</span>
        </>
      ) : (
        <>
          <FiClock className="w-4 h-4" />
          <span>Tempo rimanente: {timeLeft}</span>
        </>
      )}
    </div>
  )
}

