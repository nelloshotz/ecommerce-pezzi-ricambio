import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Recupera dettaglio categoria (admin)
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

    const { id } = params

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            productTypes: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Categoria non trovata' },
        { status: 404 }
      )
    }

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
          productsCount: category._count.products,
          productTypesCount: category._count.productTypes,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel recupero categoria:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero categoria', details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Modifica categoria (admin)
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

    const { id } = params
    
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

    // Verifica che la categoria esista
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoria non trovata' },
        { status: 404 }
      )
    }

    // Prepara dati update
    const updateData: any = {}

    if (name !== undefined && name !== null && typeof name === 'string' && name.trim() !== '') {
      const trimmedName = name.trim()
      // Genera nuovo slug se il nome è cambiato
      if (trimmedName !== existingCategory.name) {
        const newSlug = trimmedName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')

        // Verifica unicità nuovo slug
        const slugExists = await prisma.category.findFirst({
          where: {
            slug: newSlug,
            id: { not: id },
          },
        })

        if (slugExists) {
          return NextResponse.json(
            { error: 'Una categoria con questo slug esiste già' },
            { status: 409 }
          )
        }

        updateData.name = trimmedName
        updateData.slug = newSlug
      }
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }
    
    // Gestione upload immagine
    let finalImageUrl: string | null | undefined = image !== undefined ? (image?.trim() || null) : undefined
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

      finalImageUrl = `/uploads/categories/${fileName}`
    }
    
    if (finalImageUrl !== undefined) {
      updateData.image = finalImageUrl
    }
    
    if (order !== undefined) {
      updateData.order = parseInt(String(order)) || 0
    }
    if (active !== undefined) {
      updateData.active = active === true || active === 'true'
    }

    // Aggiorna categoria
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            products: true,
            productTypes: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        category: {
          id: updatedCategory.id,
          name: updatedCategory.name,
          slug: updatedCategory.slug,
          description: updatedCategory.description,
          image: updatedCategory.image,
          order: updatedCategory.order,
          active: updatedCategory.active,
          productsCount: updatedCategory._count.products,
          productTypesCount: updatedCategory._count.productTypes,
          createdAt: updatedCategory.createdAt.toISOString(),
          updatedAt: updatedCategory.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nell\'aggiornamento categoria:', error)
    
    // Gestione errore unique constraint
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Una categoria con questo nome o slug esiste già' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento categoria', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Elimina categoria (admin)
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

    const { id } = params

    // Verifica che la categoria esista
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            productTypes: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Categoria non trovata' },
        { status: 404 }
      )
    }

    // Verifica che non ci siano prodotti associati
    if (category._count.products > 0) {
      return NextResponse.json(
        { error: `Non puoi eliminare questa categoria perché ha ${category._count.products} prodotto/i associato/i. Prima sposta i prodotti in un'altra categoria.` },
        { status: 400 }
      )
    }

    // Verifica che non ci siano tipi prodotto associati
    if (category._count.productTypes > 0) {
      return NextResponse.json(
        { error: `Non puoi eliminare questa categoria perché ha ${category._count.productTypes} tipo/i prodotto associato/i. Prima rimuovi i tipi prodotto.` },
        { status: 400 }
      )
    }

    // Elimina categoria
    await prisma.category.delete({
      where: { id },
    })

    return NextResponse.json(
      { message: 'Categoria eliminata con successo' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nell\'eliminazione categoria:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione categoria', details: error.message },
      { status: 500 }
    )
  }
}

