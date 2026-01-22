import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'
import { verifyAdmin } from '@/lib/auth'

// GET - Lista utenti (solo admin)
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione admin
    const authResult = await verifyAdmin(request)

    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Utente non autenticato' },
        { status: authResult.error?.includes('Accesso negato') ? 403 : 401 }
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
        { phone: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { companyAddress: { contains: search, mode: 'insensitive' } },
        { companyTaxCode: { contains: search, mode: 'insensitive' } },
        { companyPec: { contains: search, mode: 'insensitive' } },
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
    const authResult = await verifyAdmin(request)

    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Utente non autenticato' },
        { status: authResult.error?.includes('Accesso negato') ? 403 : 401 }
      )
    }

    const userId = authResult.user.userId

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

