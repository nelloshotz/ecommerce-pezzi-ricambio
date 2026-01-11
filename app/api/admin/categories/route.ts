import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// GET - Recupera tutte le categorie (admin - include inattive)
export async function GET(request: NextRequest) {
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

    // Recupera tutte le categorie (includi anche inattive)
    const categories = await prisma.category.findMany({
      orderBy: [
        { order: 'asc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        categories: categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          image: cat.image,
          order: cat.order,
          active: cat.active,
          productsCount: cat._count.products,
          createdAt: cat.createdAt.toISOString(),
          updatedAt: cat.updatedAt.toISOString(),
        })),
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel recupero categorie:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero categorie', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Crea nuova categoria (admin)
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

    // Supporta sia JSON che FormData
    const contentType = request.headers.get('content-type') || ''
    let name, description, image, imageFile, order, active
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      name = formData.get('name') as string | null
      description = formData.get('description') as string | null
      const imageData = formData.get('image')
      // Verifica se è un File o una stringa (URL)
      if (imageData && typeof imageData === 'object' && 'size' in imageData && 'name' in imageData) {
        imageFile = imageData as File
        image = null
      } else if (typeof imageData === 'string' && imageData.trim() !== '') {
        imageFile = null
        image = imageData.trim()
      } else {
        imageFile = null
        image = null
      }
      const orderStr = formData.get('order') as string | null
      order = orderStr ? parseInt(orderStr) : 0
      active = formData.get('active') === 'true'
    } else {
      const body = await request.json()
      name = body.name
      description = body.description
      image = body.image
      imageFile = null
      order = body.order
      active = body.active
    }

    // Validazione
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Il nome della categoria è obbligatorio' },
        { status: 400 }
      )
    }

    // Genera slug dal nome
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Verifica unicità nome e slug
    const existingCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { name: name.trim() },
          { slug },
        ],
      },
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Una categoria con questo nome o slug esiste già' },
        { status: 409 }
      )
    }

    // Determina l'ordine se non fornito
    let categoryOrder = order !== undefined ? parseInt(String(order)) : 0
    if (isNaN(categoryOrder)) {
      // Se non specificato, metti alla fine
      const maxOrder = await prisma.category.aggregate({
        _max: { order: true },
      })
      categoryOrder = (maxOrder._max.order || 0) + 1
    }

    // Gestione upload immagine
    let imagePath: string | null = null
    if (imageFile && typeof imageFile === 'object' && 'size' in imageFile && 'name' in imageFile) {
      // Upload nuova immagine
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'categories')
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      const fileType = (imageFile as any).type || ''
      const fileNameFromFile = (imageFile as any).name || 'image.jpg'
      
      if (fileType && !fileType.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Il file immagine deve essere un\'immagine' },
          { status: 400 }
        )
      }

      const fileSize = (imageFile as any).size || 0
      if (fileSize > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Il file immagine è troppo grande (massimo 5MB)' },
          { status: 400 }
        )
      }

      const timestamp = Date.now()
      const sanitizedName = fileNameFromFile.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${timestamp}_${sanitizedName}`
      const filePath = join(uploadDir, fileName)

      const arrayBuffer = await (imageFile as any).arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await writeFile(filePath, buffer)

      imagePath = `/uploads/categories/${fileName}`
    } else if (image !== null && image !== undefined && image.trim() !== '') {
      imagePath = image.trim()
    } else if (image === null || image === '') {
      // Se image è esplicitamente null o stringa vuota, rimuovi immagine
      imagePath = null
    }

    // Crea categoria
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        image: imagePath,
        order: categoryOrder,
        active: active !== undefined ? active : true,
      },
    })

    return NextResponse.json(
      {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          image: category.image,
          order: category.order,
          active: category.active,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Errore nella creazione categoria:', error)
    
    // Gestione errore unique constraint
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Una categoria con questo nome o slug esiste già' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Errore nella creazione categoria', details: error.message },
      { status: 500 }
    )
  }
}

