import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Recupera solo la soglia per spedizione gratuita (endpoint pubblico)
export async function GET(request: NextRequest) {
  try {
    // Recupera impostazioni attive
    const settings = await prisma.shippingSettings.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        freeShippingThreshold: true,
      },
    })

    return NextResponse.json(
      {
        freeShippingThreshold: settings?.freeShippingThreshold || null,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Errore nel recupero soglia spedizione gratuita:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero soglia spedizione gratuita' },
      { status: 500 }
    )
  }
}

