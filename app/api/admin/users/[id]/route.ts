import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Dettaglio utente (solo admin)
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const user = await prisma.user.findUnique({
      where: { id },
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
        addresses: {
          select: {
            id: true,
            type: true,
            firstName: true,
            lastName: true,
            city: true,
            country: true,
            isDefault: true,
            createdAt: true,
          },
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' },
          ],
        },
        _count: {
          select: {
            orders: true,
            cartItems: true,
            reviews: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Recupera statistiche ordini
    const orders = await prisma.order.findMany({
      where: { userId: id },
      select: {
        id: true,
        total: true,
        paymentStatus: true,
        status: true,
        createdAt: true,
      },
    })

    const totalSpent = orders
      .filter((o) => o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + o.total, 0)

    const pendingOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED').length

    // Rimuovi duplicati dagli indirizzi (per ID)
    const uniqueAddresses = Array.from(
      new Map(user.addresses.map((addr) => [addr.id, addr])).values()
    )

    // Formatta risposta (escludi passwordHash)
    const formattedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      banned: user.banned || false,
      bannedAt: user.bannedAt?.toISOString() || null,
      bannedBy: user.bannedBy || null,
      bannedReason: user.bannedReason || null,
      addresses: uniqueAddresses,
      statistics: {
        ordersCount: user._count.orders,
        cartItemsCount: user._count.cartItems,
        reviewsCount: user._count.reviews,
        totalSpent,
        pendingOrders,
        completedOrders: orders.filter((o) => o.status === 'DELIVERED').length,
      },
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }

    return NextResponse.json({ user: formattedUser }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nel recupero utente:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero utente', details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Modifica utente (solo admin)
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const { email, name, phone, role, password } = body

    // Verifica utente esiste
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Verifica email univoca se cambiata
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, banned: true },
      })

      if (emailExists) {
        // Se l'email esiste ed è bannata, non permettere di usarla
        if (emailExists.banned) {
          return NextResponse.json(
            { error: 'Questa email è stata bannata e non può essere utilizzata' },
            { status: 403 }
          )
        }
        
        return NextResponse.json(
          { error: 'Email già registrata' },
          { status: 409 }
        )
      }
    }

    // Prepara dati update
    const updateData: any = {}
    if (email) updateData.email = email
    if (name) updateData.name = name
    if (phone !== undefined) updateData.phone = phone || null
    if (role) {
      updateData.role = role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'CUSTOMER'
    }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10)
    }

    // Aggiorna utente
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
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
    console.error('Errore nell\'aggiornamento utente:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento utente', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Elimina utente (solo admin)
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

    // Verifica che non si stia eliminando se stesso
    if (id === userId) {
      return NextResponse.json(
        { error: 'Non puoi eliminare il tuo stesso account' },
        { status: 400 }
      )
    }

    // Verifica utente esiste
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Elimina utente (cascade elimina ordini, indirizzi, carrello, etc.)
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json(
      { message: 'Utente eliminato con successo' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nell\'eliminazione utente:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione utente', details: error.message },
      { status: 500 }
    )
  }
}

