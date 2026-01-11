import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

// POST - Banna utente
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Verifica autenticazione admin
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Utente non autenticato' },
        { status: 401 }
      )
    }

    // Verifica ruolo admin
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Accesso negato. Solo amministratori.' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { reason } = body

    // Verifica che non si stia bannando se stesso
    if (id === userId) {
      return NextResponse.json(
        { error: 'Non puoi bannare il tuo stesso account' },
        { status: 400 }
      )
    }

    // Verifica utente esiste
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, banned: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    if (user.banned) {
      return NextResponse.json(
        { error: 'Utente già bannato' },
        { status: 400 }
      )
    }

    // Banna utente
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        banned: true,
        bannedAt: new Date(),
        bannedBy: userId,
        bannedReason: reason || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        banned: true,
        bannedAt: true,
        bannedBy: true,
        bannedReason: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      {
        message: 'Utente bannato con successo',
        user: {
          ...updatedUser,
          bannedAt: updatedUser.bannedAt?.toISOString() || null,
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel ban utente:', error)
    return NextResponse.json(
      { error: 'Errore nel ban utente', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Sbanna utente
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Verifica autenticazione admin
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Utente non autenticato' },
        { status: 401 }
      )
    }

    // Verifica ruolo admin
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Accesso negato. Solo amministratori.' },
        { status: 403 }
      )
    }

    const { id } = params

    // Verifica utente esiste
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, banned: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    if (!user.banned) {
      return NextResponse.json(
        { error: 'Utente non è bannato' },
        { status: 400 }
      )
    }

    // Sbanna utente
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        banned: false,
        bannedAt: null,
        bannedBy: null,
        bannedReason: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        banned: true,
        bannedAt: true,
        bannedBy: true,
        bannedReason: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      {
        message: 'Utente sbannato con successo',
        user: {
          ...updatedUser,
          bannedAt: updatedUser.bannedAt?.toISOString() || null,
          createdAt: updatedUser.createdAt.toISOString(),
          updatedAt: updatedUser.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nello sban utente:', error)
    return NextResponse.json(
      { error: 'Errore nello sban utente', details: error.message },
      { status: 500 }
    )
  }
}

