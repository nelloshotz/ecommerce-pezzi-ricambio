import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Recupera tutti i coupon
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

    // Recupera tutti i coupon, ordinati per data creazione (più recenti prima)
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ coupons }, { status: 200 })
  } catch (error) {
    console.error('Errore nel recupero coupon:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero coupon' },
      { status: 500 }
    )
  }
}

