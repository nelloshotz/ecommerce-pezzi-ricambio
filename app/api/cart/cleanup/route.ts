import { NextRequest, NextResponse } from 'next/server'
import { removeExpiredReservations } from '@/lib/cartReservations'

// API route per pulire manualmente le prenotazioni scadute
// Può essere chiamata periodicamente da un cron job o all'avvio dell'applicazione
export async function POST(request: NextRequest) {
  try {
    const result = await removeExpiredReservations()
    
    return NextResponse.json({
      success: true,
      removed: result.removed,
      items: result.items,
    })
  } catch (error) {
    console.error('Errore nella pulizia prenotazioni:', error)
    return NextResponse.json(
      { error: 'Errore nella pulizia prenotazioni' },
      { status: 500 }
    )
  }
}

// GET - Per verificare lo stato delle prenotazioni
export async function GET(request: NextRequest) {
  try {
    const result = await removeExpiredReservations()
    
    return NextResponse.json({
      cleaned: result.removed > 0,
      removed: result.removed,
      items: result.items,
    })
  } catch (error) {
    console.error('Errore nella verifica prenotazioni:', error)
    return NextResponse.json(
      { error: 'Errore nella verifica prenotazioni' },
      { status: 500 }
    )
  }
}

