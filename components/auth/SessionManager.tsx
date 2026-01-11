'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

/**
 * Componente per gestire la persistenza della sessione e il logout automatico a mezzanotte
 * La sessione può durare fino a 23h 59min (fino a mezzanotte del giorno successivo)
 */
export default function SessionManager() {
  const router = useRouter()
  const { user, loginTimestamp, logout, setUser } = useAuthStore()
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const midnightCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Attendi che lo store sia idratato da localStorage
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    // Non fare nulla finché lo store non è idratato
    if (!isHydrated) {
      return
    }

    // Se l'utente è loggato ma non ha loginTimestamp, impostalo ora (per utenti che hanno fatto login prima dell'implementazione)
    // In questo caso, assumiamo che l'utente abbia fatto login molto recentemente (entro lo stesso giorno)
    if (user && !loginTimestamp) {
      const loginTime = Date.now()
      // Aggiorna lo stato nello store - Zustand persist salverà automaticamente nel localStorage
      useAuthStore.setState({ loginTimestamp: loginTime })
      return
    }

    if (!user || !loginTimestamp) {
      return
    }

    /**
     * Calcola il tempo rimanente fino alla mezzanotte successiva
     */
    const calculateTimeUntilMidnight = (): number => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0) // Imposta a mezzanotte di oggi
      
      const timeUntilMidnight = midnight.getTime() - now.getTime()
      
      // Se mezzanotte è già passata oggi, calcola per domani
      if (timeUntilMidnight <= 0) {
        midnight.setDate(midnight.getDate() + 1)
        return midnight.getTime() - now.getTime()
      }
      
      return timeUntilMidnight
    }

    /**
     * Verifica se la sessione è scaduta (siamo passati la mezzanotte)
     */
    const checkSessionExpiry = async () => {
      if (!user || !loginTimestamp) {
        return
      }

      const now = Date.now()
      const loginDate = new Date(loginTimestamp)
      const currentDate = new Date(now)
      
      // Verifica se siamo passati la mezzanotte rispetto al login
      // Se il giorno corrente è diverso dal giorno del login, la sessione è scaduta
      const loginDay = loginDate.getDate()
      const loginMonth = loginDate.getMonth()
      const loginYear = loginDate.getFullYear()
      
      const currentDay = currentDate.getDate()
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()
      
      const isNewDay = 
        currentDay !== loginDay || 
        currentMonth !== loginMonth || 
        currentYear !== loginYear
      
      if (isNewDay) {
        // Sessione scaduta - logout automatico
        console.log('Sessione scaduta: mezzanotte passata. Logout automatico...')
        await logout()
        router.push('/login')
        router.refresh()
      }
    }

    // Esegui controllo immediato
    checkSessionExpiry()

    // Calcola tempo fino alla mezzanotte e programma logout
    const timeUntilMidnight = calculateTimeUntilMidnight()
    
    // Programma il logout esatto alla mezzanotte
    const midnightTimeout = setTimeout(async () => {
      console.log('Mezzanotte raggiunta. Logout automatico...')
      await logout()
      router.push('/login')
      router.refresh()
    }, timeUntilMidnight)

    midnightCheckTimeoutRef.current = midnightTimeout

    // Controlla periodicamente ogni minuto se la sessione è scaduta
    // (in caso di cambio data manuale o altre anomalie)
    const interval = setInterval(() => {
      checkSessionExpiry()
    }, 60000) // Controlla ogni minuto

    checkIntervalRef.current = interval

    // Cleanup
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
      if (midnightCheckTimeoutRef.current) {
        clearTimeout(midnightCheckTimeoutRef.current)
      }
    }
  }, [user, loginTimestamp, logout, router, isHydrated])

  // Questo componente non renderizza nulla
  return null
}

