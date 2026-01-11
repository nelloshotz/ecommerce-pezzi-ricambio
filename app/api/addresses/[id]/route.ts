import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const address = await prisma.address.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        postalCode: body.postalCode,
        province: body.province || null,
        country: body.country,
      },
    })

    return NextResponse.json({ address }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nell\'aggiornamento indirizzo:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento indirizzo' },
      { status: 500 }
    )
  }
}

