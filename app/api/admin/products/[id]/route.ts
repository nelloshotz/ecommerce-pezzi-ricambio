import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

interface RouteParams {
  params: {
    id: string
  }
}

// GET - Recupera prodotto per ID (admin, include prodotti inattivi)
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

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        productType: {
          select: {
            id: true,
            name: true,
            slug: true,
            config: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Prodotto non trovato' },
        { status: 404 }
      )
    }

    // Converti al formato Product per il client
    const formattedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      vatRate: product.vatRate || undefined,
      image: product.image,
      category: product.category.name,
      categoryId: product.category.id,
      productType: product.productType?.slug || product.productTypeId || undefined,
      productTypeId: product.productTypeId || undefined,
      productTypeConfig: product.productType?.config
        ? JSON.parse(product.productType.config)
        : null,
      customFields: product.customFields ? JSON.parse(product.customFields) : {},
      brand: product.brand || undefined,
      partNumber: product.partNumber || undefined,
      compatibility: product.compatibility || undefined,
      sku: product.sku || undefined,
      inStock: product.inStock,
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity || undefined,
      active: product.active,
      featured: product.featured || false,
      technicalSheet: product.technicalSheet || undefined,
      slug: product.slug,
      metadata: product.metadata ? JSON.parse(product.metadata) : {},
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    }

    return NextResponse.json({ product: formattedProduct }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nel recupero prodotto:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero prodotto', details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Modifica prodotto (admin)
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
    let name, description, price, vatRate, imageUrl, imageFile, categoryId, productTypeId, brand, partNumber, compatibility, sku
    let stockQuantity, lowStockThreshold, active, featured, customFields, technicalSheetUrl, technicalSheetFile
    let height, width, depth, weight
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      name = formData.get('name') as string | null
      description = formData.get('description') as string | null
      price = formData.get('price') as string | null
      const vatRateStr = formData.get('vatRate') as string | null
      vatRate = vatRateStr ? parseFloat(vatRateStr) : null
      imageUrl = formData.get('imageUrl') as string | null
      imageFile = formData.get('image') as File | null
      categoryId = formData.get('categoryId') as string | null
      productTypeId = formData.get('productTypeId') as string | null
      brand = formData.get('brand') as string | null
      partNumber = formData.get('partNumber') as string | null
      compatibility = formData.get('compatibility') as string | null
      sku = formData.get('sku') as string | null
      stockQuantity = formData.get('stockQuantity') as string | null
      const lowStockThresholdStr = formData.get('lowStockThreshold') as string | null
      lowStockThreshold = lowStockThresholdStr ? parseInt(lowStockThresholdStr) : null
      active = formData.get('active') as string | null
      featured = formData.get('featured') as string | null
      const customFieldsStr = formData.get('customFields') as string | null
      customFields = customFieldsStr ? JSON.parse(customFieldsStr) : null
      technicalSheetUrl = formData.get('technicalSheetUrl') as string | null
      technicalSheetFile = formData.get('technicalSheet') as File | null
      height = formData.get('height') as string | null
      width = formData.get('width') as string | null
      depth = formData.get('depth') as string | null
      weight = formData.get('weight') as string | null
    } else {
      const body = await request.json()
      name = body.name
      description = body.description
      price = body.price
      vatRate = body.vatRate !== undefined ? (body.vatRate ? parseFloat(String(body.vatRate)) : null) : undefined
      imageUrl = body.imageUrl
      imageFile = body.imageFile
      categoryId = body.categoryId
      productTypeId = body.productTypeId
      brand = body.brand
      partNumber = body.partNumber
      compatibility = body.compatibility
      sku = body.sku
      stockQuantity = body.stockQuantity
      lowStockThreshold = body.lowStockThreshold
      active = body.active
      featured = body.featured
      customFields = body.customFields
      technicalSheetUrl = body.technicalSheetUrl
      technicalSheetFile = body.technicalSheetFile
      height = body.height
      width = body.width
      depth = body.depth
      weight = body.weight
    }

    // Verifica che il prodotto esista
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Prodotto non trovato' },
        { status: 404 }
      )
    }

    // Verifica SKU univoco se cambiato
    if (sku && sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku },
      })

      if (existingSku) {
        return NextResponse.json(
          { error: `Il Codice Prodotto (SKU) "${sku}" è già in uso` },
          { status: 409 }
        )
      }
    }

    // Prepara dati update
    const updateData: any = {}

    // Gestione upload immagine
    let finalImageUrl = imageUrl
    if (imageFile && typeof imageFile === 'object' && 'size' in imageFile && 'name' in imageFile) {
      // Upload nuova immagine
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'products')
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

      finalImageUrl = `/uploads/products/${fileName}`
    }

    // Gestione upload scheda tecnica
    let finalTechnicalSheetUrl = technicalSheetUrl
    if (technicalSheetFile && typeof technicalSheetFile === 'object' && 'size' in technicalSheetFile && 'name' in technicalSheetFile) {
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'technical-sheets')
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      const fileType = (technicalSheetFile as any).type || ''
      const fileNameFromFile = (technicalSheetFile as any).name || 'document.pdf'
      
      if (fileType && fileType !== 'application/pdf' && !fileNameFromFile.endsWith('.pdf')) {
        return NextResponse.json(
          { error: 'La scheda tecnica deve essere un file PDF' },
          { status: 400 }
        )
      }

      const fileSize = (technicalSheetFile as any).size || 0
      if (fileSize > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Il file scheda tecnica è troppo grande (massimo 10MB)' },
          { status: 400 }
        )
      }

      const timestamp = Date.now()
      const sanitizedName = fileNameFromFile.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${timestamp}_${sanitizedName}`
      const filePath = join(uploadDir, fileName)

      const arrayBuffer = await (technicalSheetFile as any).arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await writeFile(filePath, buffer)

      finalTechnicalSheetUrl = `/uploads/technical-sheets/${fileName}`
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = parseFloat(String(price))
    if (vatRate !== undefined) updateData.vatRate = vatRate || null
    if (finalImageUrl !== undefined) updateData.image = finalImageUrl
    if (categoryId !== undefined) updateData.categoryId = categoryId
    if (productTypeId !== undefined) updateData.productTypeId = productTypeId || null
    if (brand !== undefined) updateData.brand = brand || null
    if (partNumber !== undefined) updateData.partNumber = partNumber || null
    if (compatibility !== undefined) updateData.compatibility = compatibility || null
    if (sku !== undefined) updateData.sku = sku || null
    if (stockQuantity !== undefined) {
      const newQuantity = parseInt(String(stockQuantity))
      updateData.stockQuantity = Math.max(0, newQuantity)
      updateData.inStock = newQuantity > 0
    }
    if (lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = lowStockThreshold !== null && lowStockThreshold !== undefined && lowStockThreshold > 0 ? lowStockThreshold : null
    }
    if (active !== undefined) updateData.active = active === true || active === 'true'
    if (featured !== undefined) updateData.featured = featured === true || featured === 'true'
    if (customFields !== undefined) {
      if (typeof customFields === 'string') {
        updateData.customFields = customFields
      } else {
        updateData.customFields = JSON.stringify(customFields)
      }
    }
    if (finalTechnicalSheetUrl !== undefined) {
      updateData.technicalSheet = finalTechnicalSheetUrl || null
    }
    if (height !== undefined && height !== null && height !== '') {
      updateData.height = parseFloat(String(height))
    }
    if (width !== undefined && width !== null && width !== '') {
      updateData.width = parseFloat(String(width))
    }
    if (depth !== undefined && depth !== null && depth !== '') {
      updateData.depth = parseFloat(String(depth))
    }
    if (weight !== undefined && weight !== null && weight !== '') {
      updateData.weight = parseFloat(String(weight))
    }

    // Aggiorna slug se il nome è cambiato
    if (name && name !== existingProduct.name) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      // Verifica unicità slug
      let uniqueSlug = slug
      let counter = 1
      while (
        await prisma.product.findFirst({
          where: { slug: uniqueSlug, id: { not: id } },
        })
      ) {
        uniqueSlug = `${slug}-${counter}`
        counter++
      }
      updateData.slug = uniqueSlug
    }

    // Aggiorna prodotto
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        productType: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    // Formatta risposta
    const formattedProduct = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      description: updatedProduct.description,
      price: updatedProduct.price,
      image: updatedProduct.image,
      category: updatedProduct.category.name,
      categoryId: updatedProduct.category.id,
      productType: updatedProduct.productType?.slug || updatedProduct.productTypeId || undefined,
      productTypeId: updatedProduct.productTypeId || undefined,
      customFields: updatedProduct.customFields ? JSON.parse(updatedProduct.customFields) : {},
      brand: updatedProduct.brand || undefined,
      partNumber: updatedProduct.partNumber || undefined,
      compatibility: updatedProduct.compatibility || undefined,
      sku: updatedProduct.sku || undefined,
      inStock: updatedProduct.inStock,
      stockQuantity: updatedProduct.stockQuantity,
      reservedQuantity: updatedProduct.reservedQuantity || undefined,
      active: updatedProduct.active,
      featured: updatedProduct.featured || false,
      technicalSheet: updatedProduct.technicalSheet || undefined,
      createdAt: updatedProduct.createdAt.toISOString(),
      updatedAt: updatedProduct.updatedAt.toISOString(),
    }

    return NextResponse.json({ product: formattedProduct }, { status: 200 })
  } catch (error: any) {
    console.error('Errore nell\'aggiornamento prodotto:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento prodotto', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Elimina prodotto (admin)
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

    // Verifica che il prodotto esista
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Prodotto non trovato' },
        { status: 404 }
      )
    }

    // Elimina prodotto (cascade elimina ordini, carrello, etc. se configurato)
    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json(
      { message: 'Prodotto eliminato con successo' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nell\'eliminazione prodotto:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione prodotto', details: error.message },
      { status: 500 }
    )
  }
}

