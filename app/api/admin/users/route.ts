import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'

// GET - Lista utenti (solo admin)
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione admin (da implementare middleware o verifica header)
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Utente non autenticato' },
        { status: 401 }
      )
    }

    // Verifica ruolo admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Accesso negato. Solo amministratori.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const role = searchParams.get('role') // 'CUSTOMER' o 'ADMIN'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : undefined

    // Costruisci filtro where
    const where: any = {}

    // Ricerca (nome, email, telefono, campi azienda)
    // PostgreSQL supporta mode: 'insensitive' per case-insensitive search
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { companyName: { contains: search } },
        { companyAddress: { contains: search } },
        { companyTaxCode: { contains: search } },
        { companyPec: { contains: search } },
      ]
    }

    // Filtro ruolo
    if (role) {
      where.role = role.toUpperCase()
    }

    // Query utenti
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          userType: true,
          companyName: true,
          companyAddress: true,
          companyTaxCode: true,
          companyPec: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              addresses: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: skip,
      }),
      prisma.user.count({ where }),
    ])

    // Formatta risposta
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      userType: user.userType || 'PRIVATE',
      companyName: user.companyName,
      companyAddress: user.companyAddress,
      companyTaxCode: user.companyTaxCode,
      companyPec: user.companyPec,
      ordersCount: user._count.orders,
      addressesCount: user._count.addresses,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }))

    return NextResponse.json(
      {
        users: formattedUsers,
        total,
        limit,
        skip,
        hasMore: limit ? (skip || 0) + limit < total : false,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel recupero utenti:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero utenti', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo utente (admin)
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { email, password, name, phone, role = 'CUSTOMER' } = body

    // Validazione
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password e nome sono obbligatori' },
        { status: 400 }
      )
    }

    // Verifica email univoca
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Crea utente
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone: phone || null,
        role: role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      {
        user: {
          ...newUser,
          createdAt: newUser.createdAt.toISOString(),
          updatedAt: newUser.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Errore nella creazione utente:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione utente', details: error.message },
      { status: 500 }
    )
  }
}

