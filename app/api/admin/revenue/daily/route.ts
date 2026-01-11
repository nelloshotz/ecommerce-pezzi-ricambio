import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Recupera fatturato giornaliero per un mese specifico
export async function GET(request: NextRequest) {
  try {
    // Solo admin può accedere
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Accesso negato. Solo amministratori.' }, { status: 403 })
    }

    // Recupera parametri dalla query string
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

    // Valida mese e anno
    if (month < 1 || month > 12 || year < 2020 || year > 2100) {
      return NextResponse.json(
        { error: 'Mese o anno non validi' },
        { status: 400 }
      )
    }

    // Calcola inizio e fine del mese
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    // Recupera ordini pagati del mese
    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        total: true,
        createdAt: true,
      },
    })

    // Calcola giorni nel mese
    const daysInMonth = endDate.getDate()
    
    // Inizializza array con tutti i giorni del mese
    const dailyRevenue: Array<{ date: string; revenue: number; day: number }> = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day)
      const dateStr = date.toISOString().split('T')[0]
      
      // Calcola fatturato per questo giorno
      const dayRevenue = orders
        .filter((o) => {
          const orderDate = new Date(o.createdAt)
          return orderDate.getDate() === day
        })
        .reduce((sum, o) => sum + o.total, 0)

      dailyRevenue.push({
        date: dateStr,
        revenue: dayRevenue,
        day: day,
      })
    }

    // Calcola totale del mese
    const monthlyTotal = orders.reduce((sum, o) => sum + o.total, 0)

    return NextResponse.json(
      {
        dailyRevenue,
        monthlyTotal,
        year,
        month,
        monthName: new Date(year, month - 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel recupero fatturato giornaliero:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero fatturato giornaliero', details: error.message },
      { status: 500 }
    )
  }
}

