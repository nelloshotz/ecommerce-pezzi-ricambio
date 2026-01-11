import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Genera un codice coupon alfanumerico a 6 caratteri
 */
function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Verifica se un codice coupon è già esistente
 */
async function isCouponCodeUnique(code: string): Promise<boolean> {
  const existing = await prisma.coupon.findUnique({
    where: { code },
  })
  return !existing
}

/**
 * Genera un codice coupon unico
 */
async function generateUniqueCouponCode(): Promise<string> {
  let code: string
  let attempts = 0
  const maxAttempts = 100

  do {
    code = generateCouponCode()
    attempts++
    if (attempts >= maxAttempts) {
      throw new Error('Impossibile generare un codice coupon unico dopo molti tentativi')
    }
  } while (!(await isCouponCodeUnique(code)))

  return code
}

// POST - Genera nuovi coupon
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { quantity, discountPercent } = body

    // Validazione
    if (!quantity || quantity < 1 || quantity > 100) {
      return NextResponse.json(
        { error: 'Quantità deve essere un numero tra 1 e 100' },
        { status: 400 }
      )
    }

    if (!discountPercent || discountPercent < 1 || discountPercent > 100) {
      return NextResponse.json(
        { error: 'Percentuale sconto deve essere un numero tra 1 e 100' },
        { status: 400 }
      )
    }

    // Genera coupon
    const generated = []
    for (let i = 0; i < quantity; i++) {
      const code = await generateUniqueCouponCode()
      
      const coupon = await prisma.coupon.create({
        data: {
          code,
          discountPercent: parseFloat(discountPercent.toString()),
          isUsed: false,
        },
      })

      generated.push({
        id: coupon.id,
        code: coupon.code,
        discountPercent: coupon.discountPercent,
      })
    }

    return NextResponse.json(
      {
        message: `${generated.length} coupon generati con successo`,
        generated,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nella generazione coupon:', error)
    return NextResponse.json(
      { error: error.message || 'Errore nella generazione coupon' },
      { status: 500 }
    )
  }
}

