import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Valida un coupon
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Codice coupon obbligatorio' },
        { status: 400 }
      )
    }

    // Cerca il coupon nel database
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    })

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon non valido o scaduto', valid: false },
        { status: 404 }
      )
    }

    // Verifica se il coupon è già stato utilizzato
    if (coupon.isUsed) {
      return NextResponse.json(
        { error: 'Coupon già utilizzato', valid: false },
        { status: 400 }
      )
    }

    // Coupon valido
    return NextResponse.json(
      {
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discountPercent: coupon.discountPercent,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nella validazione coupon:', error)
    return NextResponse.json(
      { error: error.message || 'Errore nella validazione coupon', valid: false },
      { status: 500 }
    )
  }
}

