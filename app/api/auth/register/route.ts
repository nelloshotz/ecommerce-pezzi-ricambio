import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      name,
      phone,
      userType,
      companyName,
      companyAddress,
      companyTaxCode,
      companyPec,
      shippingFirstName,
      shippingLastName,
      shippingEmail,
      shippingPhone,
      shippingAddress,
      shippingCity,
      shippingPostalCode,
      shippingProvince,
      shippingCountry,
      useSameAddress,
      billingFirstName,
      billingLastName,
      billingEmail,
      billingPhone,
      billingAddress,
      billingCity,
      billingPostalCode,
      billingProvince,
      billingCountry,
    } = body

    // Validazione base
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password e nome sono obbligatori' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La password deve essere di almeno 6 caratteri' },
        { status: 400 }
      )
    }

    // Verifica se l'utente esiste già (include utenti bannati)
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        banned: true,
        bannedAt: true,
        bannedReason: true,
      },
    })

    if (existingUser) {
      // Se l'utente è bannato, non permettere registrazione
      if (existingUser.banned) {
        return NextResponse.json(
          { 
            error: 'Questa email è stata bannata e non può essere utilizzata per registrarsi',
            banned: true,
            bannedAt: existingUser.bannedAt?.toISOString(),
            bannedReason: existingUser.bannedReason,
          },
          { status: 403 }
        )
      }
      
      // Se l'utente esiste e non è bannato, email già in uso
      return NextResponse.json(
        { error: 'Email già registrata. Utilizza un\'altra email o effettua il login.' },
        { status: 400 }
      )
    }

    // Hash della password
    const passwordHash = await bcrypt.hash(password, 10)

    // Crea utente e indirizzi in una transazione
    const result = await prisma.$transaction(async (tx) => {
      // Validazione dati azienda se userType === 'COMPANY'
      if (userType === 'COMPANY') {
        if (!companyName || !companyName.trim()) {
          throw new Error('Ragione sociale obbligatoria per aziende')
        }
        if (!companyAddress || !companyAddress.trim()) {
          throw new Error('Indirizzo obbligatorio per aziende')
        }
        if (!companyTaxCode || !companyTaxCode.trim()) {
          throw new Error('Codice fiscale o partita IVA obbligatorio per aziende')
        }
      }

      // Crea utente
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone: phone || null,
          role: 'CUSTOMER',
          userType: userType || 'PRIVATE',
          companyName: userType === 'COMPANY' && companyName ? companyName.trim() : null,
          companyAddress: userType === 'COMPANY' && companyAddress ? companyAddress.trim() : null,
          companyTaxCode: userType === 'COMPANY' && companyTaxCode ? companyTaxCode.trim() : null,
          companyPec: userType === 'COMPANY' && companyPec ? companyPec.trim() : null,
        },
      })

      // Crea indirizzo di spedizione
      const shippingAddr = await tx.address.create({
        data: {
          userId: user.id,
          type: 'SHIPPING',
          firstName: shippingFirstName || name.split(' ')[0] || '',
          lastName: shippingLastName || name.split(' ').slice(1).join(' ') || '',
          email: shippingEmail || email,
          phone: shippingPhone || phone || '',
          address: shippingAddress || '',
          city: shippingCity || '',
          postalCode: shippingPostalCode || '',
          province: shippingProvince || null,
          country: shippingCountry || 'Italia',
          isDefault: true,
        },
      })

      // Crea indirizzo di fatturazione (o usa spedizione se useSameAddress)
      let billingAddr = null

      if (!useSameAddress) {
        // Indirizzo fatturazione diverso
        billingAddr = await tx.address.create({
          data: {
            userId: user.id,
            type: 'BILLING',
            firstName: billingFirstName || name.split(' ')[0] || '',
            lastName: billingLastName || name.split(' ').slice(1).join(' ') || '',
            email: billingEmail || email,
            phone: billingPhone || phone || '',
            address: billingAddress || '',
            city: billingCity || '',
            postalCode: billingPostalCode || '',
            province: billingProvince || null,
            country: billingCountry || 'Italia',
            isDefault: true,
          },
        })
      } else {
        // Se usa lo stesso indirizzo, crea anche un record BILLING con gli stessi dati
        billingAddr = await tx.address.create({
          data: {
            userId: user.id,
            type: 'BILLING',
            firstName: shippingFirstName || name.split(' ')[0] || '',
            lastName: shippingLastName || name.split(' ').slice(1).join(' ') || '',
            email: shippingEmail || email,
            phone: shippingPhone || phone || '',
            address: shippingAddress || '',
            city: shippingCity || '',
            postalCode: shippingPostalCode || '',
            province: shippingProvince || null,
            country: shippingCountry || 'Italia',
            isDefault: true,
          },
        })
      }

      return { user, shippingAddr, billingAddr }
    })

    // Rimuovi passwordHash dalla risposta
    const { passwordHash: _, ...userWithoutPassword } = result.user

    return NextResponse.json(
      {
        message: 'Registrazione completata con successo',
        user: userWithoutPassword,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Errore durante la registrazione:', error)
    
    // Gestione errore email duplicata da Prisma
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json(
        { error: 'Email già registrata. Utilizza un\'altra email o effettua il login.' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Errore durante la registrazione. Riprova più tardi.' },
      { status: 500 }
    )
  }
}

