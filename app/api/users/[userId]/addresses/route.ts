import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ addresses }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nel caricamento indirizzi:', error)
    return NextResponse.json(
      { error: 'Errore nel caricamento indirizzi' },
      { status: 500 }
    )
  }
}

