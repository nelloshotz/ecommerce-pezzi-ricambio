import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validazione base
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e password sono obbligatori' },
        { status: 400 }
      )
    }

    // Trova utente
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        addresses: {
          where: { isDefault: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Email o password non corretti' },
        { status: 401 }
      )
    }

    // Verifica password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Email o password non corretti' },
        { status: 401 }
      )
    }

    // Verifica se l'utente è bannato
    if (user.banned) {
      return NextResponse.json(
        { 
          error: 'Account bannato. Non puoi effettuare il login. Contatta l\'amministratore per maggiori informazioni.',
          banned: true,
          bannedAt: user.bannedAt?.toISOString(),
          bannedReason: user.bannedReason,
        },
        { status: 403 }
      )
    }

    // Prepara risposta (senza passwordHash)
    const { passwordHash, ...userWithoutPassword } = user

    return NextResponse.json(
      {
        message: 'Login effettuato con successo',
        user: {
          ...userWithoutPassword,
          role: user.role.toLowerCase(), // Converti da ADMIN a admin per compatibilità
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore durante il login:', error)
    return NextResponse.json(
      { error: 'Errore durante il login. Riprova più tardi.' },
      { status: 500 }
    )
  }
}

