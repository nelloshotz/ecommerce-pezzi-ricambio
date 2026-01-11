import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Recupera dati azienda
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

// POST - Salva dati azienda
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
    const {
      companyName,
      vatNumber,
      taxCode,
      address,
      city,
      postalCode,
      province,
      country,
      phone,
      email,
      website,
      notes,
    } = body

    // Validazione campi obbligatori
    if (!companyName || !address || !city || !postalCode || !country || !phone || !email) {
      return NextResponse.json(
        { error: 'Nome azienda, indirizzo, città, CAP, nazione, telefono e email sono obbligatori' },
        { status: 400 }
      )
    }

    // Verifica se esiste già un record
    const existing = await prisma.companySettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    let settings

    if (existing) {
      // Aggiorna record esistente
      settings = await prisma.companySettings.update({
        where: { id: existing.id },
        data: {
          companyName,
          vatNumber: vatNumber || null,
          taxCode: taxCode || null,
          address,
          city,
          postalCode,
          province: province || null,
          country,
          phone,
          email,
          website: website || null,
          notes: notes || null,
        },
      })
    } else {
      // Crea nuovo record
      settings = await prisma.companySettings.create({
        data: {
          companyName,
          vatNumber: vatNumber || null,
          taxCode: taxCode || null,
          address,
          city,
          postalCode,
          province: province || null,
          country,
          phone,
          email,
          website: website || null,
          notes: notes || null,
        },
      })
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
    console.error('Errore nel salvataggio dati azienda:', error)
    return NextResponse.json(
      { error: 'Errore nel salvataggio dati azienda' },
      { status: 500 }
    )
  }
}

