import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { verifyAuth } from '@/lib/auth'

// POST - Crea nuovo prodotto con upload foto e scheda tecnica
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyAuth(request)
    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Utente non autenticato' },
        { status: 401 }
      )
    }

    // Verifica ruolo admin
    if (authResult.user.role !== 'ADMIN' && authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso negato. Solo amministratori.' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const priceStr = formData.get('price') as string
    const price = priceStr && priceStr.trim() !== '' ? parseFloat(priceStr.replace(',', '.')) : 0
    const vatRateStr = formData.get('vatRate') as string | null
    const vatRate = vatRateStr && vatRateStr.trim() !== '' ? parseFloat(vatRateStr.replace(',', '.')) : null
    const categoryId = formData.get('categoryId') as string
    const productTypeId = formData.get('productTypeId') as string | null
    const brand = formData.get('brand') as string | null
    const partNumber = formData.get('partNumber') as string | null
    const compatibility = formData.get('compatibility') as string | null
    const sku = formData.get('sku') as string | null // Codice prodotto univoco (SKU)
    const stockQuantityStr = formData.get('stockQuantity') as string
    const stockQuantity = stockQuantityStr && stockQuantityStr.trim() !== '' ? parseFloat(stockQuantityStr.replace(',', '.')) || 0 : 0
    const lowStockThresholdStr = formData.get('lowStockThreshold') as string | null
    const lowStockThreshold = lowStockThresholdStr && lowStockThresholdStr.trim() !== '' ? parseFloat(lowStockThresholdStr.replace(',', '.')) : null
    const active = formData.get('active') === 'true'
    const customFieldsJson = formData.get('customFields') as string | null
    const imageFile = formData.get('image') as File | null
    const imageUrl = formData.get('imageUrl') as string | null
    const technicalSheetFile = formData.get('technicalSheet') as File | null
    // Dimensioni e peso
    const heightStr = formData.get('height') as string | null
    const widthStr = formData.get('width') as string | null
    const depthStr = formData.get('depth') as string | null
    const weightStr = formData.get('weight') as string | null
    const height = heightStr && heightStr.trim() !== '' ? parseFloat(heightStr.replace(',', '.')) : null
    const width = widthStr && widthStr.trim() !== '' ? parseFloat(widthStr.replace(',', '.')) : null
    const depth = depthStr && depthStr.trim() !== '' ? parseFloat(depthStr.replace(',', '.')) : null
    const weight = weightStr && weightStr.trim() !== '' ? parseFloat(weightStr.replace(',', '.')) : null

    // Validazione campi obbligatori
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Il nome del prodotto è obbligatorio' },
        { status: 400 }
      )
    }
    if (!description || description.trim() === '') {
      return NextResponse.json(
        { error: 'La descrizione del prodotto è obbligatoria' },
        { status: 400 }
      )
    }
    if (price === undefined || price === null || isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: 'Il prezzo è obbligatorio e deve essere maggiore di 0' },
        { status: 400 }
      )
    }
    if (!categoryId || categoryId.trim() === '') {
      return NextResponse.json(
        { error: 'La categoria è obbligatoria' },
        { status: 400 }
      )
    }

    // Validazione SKU obbligatorio
    if (!sku || sku.trim() === '') {
      return NextResponse.json(
        { error: 'Il Codice Prodotto Univoco (SKU) è obbligatorio' },
        { status: 400 }
      )
    }

    // Verifica che la categoria esista
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Categoria non trovata' },
        { status: 404 }
      )
    }

    // Genera slug dal nome
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Verifica unicità slug
    let uniqueSlug = slug
    let counter = 1
    while (await prisma.product.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`
      counter++
    }

    // Verifica unicità SKU (codice prodotto)
    const providedSku = sku?.trim().toUpperCase() || ''
    
    // Verifica se lo SKU fornito è già in uso
    if (providedSku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: providedSku },
      })
      
      if (existingSku) {
        return NextResponse.json(
          { error: `Il Codice Prodotto (SKU) "${providedSku}" è già in uso. Scegli un altro codice.` },
          { status: 409 }
        )
      }
    }
    
    // Usa lo SKU fornito (già validato come univoco sopra)
    const uniqueSku = providedSku

    // Gestione upload immagine
    let imagePath = imageUrl || '/images/placeholder.svg'
    if (imageFile) {
      // Crea directory se non esiste
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'products')
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      // Verifica tipo file
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Il file immagine deve essere un\'immagine' },
          { status: 400 }
        )
      }

      // Verifica dimensione (max 5MB)
      if (imageFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Il file immagine è troppo grande (massimo 5MB)' },
          { status: 400 }
        )
      }

      // Genera nome file univoco
      const timestamp = Date.now()
      const sanitizedName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${timestamp}_${sanitizedName}`
      const filePath = join(uploadDir, fileName)

      // Salva file
      const bytes = await imageFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      imagePath = `/uploads/products/${fileName}`
    }

    // Gestione upload scheda tecnica
    let technicalSheetPath: string | null = null
    if (technicalSheetFile) {
      // Crea directory se non esiste
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'technical-sheets')
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      // Verifica tipo file (solo PDF)
      if (technicalSheetFile.type !== 'application/pdf' && !technicalSheetFile.name.endsWith('.pdf')) {
        return NextResponse.json(
          { error: 'La scheda tecnica deve essere un file PDF' },
          { status: 400 }
        )
      }

      // Verifica dimensione (max 10MB)
      if (technicalSheetFile.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Il file PDF è troppo grande (massimo 10MB)' },
          { status: 400 }
        )
      }

      // Genera nome file univoco
      const timestamp = Date.now()
      const sanitizedName = technicalSheetFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${timestamp}_${sanitizedName}`
      const filePath = join(uploadDir, fileName)

      // Salva file
      const bytes = await technicalSheetFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      technicalSheetPath = `/uploads/technical-sheets/${fileName}`
    }

    // Parse customFields
    let customFields: Record<string, any> | null = null
    if (customFieldsJson) {
      try {
        customFields = JSON.parse(customFieldsJson)
      } catch (error) {
        console.error('Errore parsing customFields:', error)
      }
    }

    // Crea prodotto
    // Featured di default è false (l'admin può impostarlo dopo)
    const featured = formData.get('featured') === 'true' || false

    const product = await prisma.product.create({
      data: {
        name,
        slug: uniqueSlug,
        description,
        price,
        vatRate: vatRate || null,
        image: imagePath,
        technicalSheet: technicalSheetPath,
        categoryId,
        productTypeId: productTypeId || null,
        brand: brand || null,
        partNumber: partNumber || null,
        compatibility: compatibility || null,
        sku: uniqueSku,
        stockQuantity,
        reservedQuantity: 0,
        lowStockThreshold: lowStockThreshold && lowStockThreshold > 0 ? lowStockThreshold : null,
        inStock: stockQuantity > 0,
        active,
        featured,
        customFields: customFields ? JSON.stringify(customFields) : null,
        height: height && height > 0 ? height : null,
        width: width && width > 0 ? width : null,
        depth: depth && depth > 0 ? depth : null,
        weight: weight && weight > 0 ? weight : null,
      },
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

    return NextResponse.json({ product }, { status: 201 })
  } catch (error: any) {
    console.error('Errore nella creazione prodotto:', error)
    
    // Restituisci un messaggio di errore più specifico
    let errorMessage = 'Errore nella creazione prodotto'
    
    if (error?.message) {
      errorMessage = error.message
    } else if (error?.code) {
      // Errori Prisma
      if (error.code === 'P2002') {
        errorMessage = 'Un prodotto con questo SKU o slug esiste già'
      } else if (error.code === 'P2003') {
        errorMessage = 'Categoria non valida o non trovata'
      } else {
        errorMessage = `Errore database: ${error.code}`
      }
    } else if (error?.name === 'PrismaClientKnownRequestError') {
      errorMessage = 'Errore nel salvataggio nel database. Verifica i dati inseriti.'
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

