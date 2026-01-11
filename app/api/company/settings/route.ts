import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Recupera dati azienda (pubblico)
export async function GET(request: NextRequest) {
  try {
    // Recupera impostazioni azienda (solo un record attivo)
    const settings = await prisma.companySettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (!settings) {
      // Ritorna valori di default vuoti
      return NextResponse.json(
        {
          companyName: '',
          vatNumber: null,
          taxCode: null,
          address: '',
          city: '',
          postalCode: '',
          province: null,
          country: 'Italia',
          phone: '',
          email: '',
          website: null,
          notes: null,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        companyName: settings.companyName,
        vatNumber: settings.vatNumber,
        taxCode: settings.taxCode,
        address: settings.address,
        city: settings.city,
        postalCode: settings.postalCode,
        province: settings.province,
        country: settings.country,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        notes: settings.notes,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Errore nel recupero dati azienda:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero dati azienda' },
      { status: 500 }
    )
  }
}

