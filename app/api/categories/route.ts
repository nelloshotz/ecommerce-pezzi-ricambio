import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Recupera tutte le categorie (include inattive se admin)
export async function GET(request: NextRequest) {
  try {
    // Verifica se l'utente è admin
    const userId = request.headers.get('x-user-id')
    let isAdmin = false
    
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
      isAdmin = user?.role === 'ADMIN' || user?.role === 'admin'
    }

    // Se admin, includi anche categorie inattive, altrimenti solo attive
    const categories = await prisma.category.findMany({
      where: isAdmin ? {} : { active: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        ...(isAdmin ? { active: true } : {}), // Include stato solo per admin
      },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Errore nel recupero categorie:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero categorie' },
      { status: 500 }
    )
  }
}

