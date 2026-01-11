import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Import aggiornamento stock da CSV
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione admin
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN' && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const csvFile = formData.get('file') as File | null

    if (!csvFile) {
      return NextResponse.json(
        { error: 'File CSV richiesto' },
        { status: 400 }
      )
    }

    // Verifica tipo file
    if (!csvFile.name.endsWith('.csv') && csvFile.type !== 'text/csv') {
      return NextResponse.json(
        { error: 'Il file deve essere un CSV' },
        { status: 400 }
      )
    }

    // Leggi contenuto CSV
    const csvText = await csvFile.text()
    const lines = csvText.split('\n').filter((line) => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'File CSV vuoto o formato non valido' },
        { status: 400 }
      )
    }

    // Parse header (atteso: SKU,Stock oppure PartNumber,Stock oppure ID,Stock)
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const skuIndex = header.findIndex((h) => h === 'sku' || h === 'codice')
    const partNumberIndex = header.findIndex((h) => h === 'partnumber' || h === 'codice_produttore' || h === 'part number')
    const idIndex = header.findIndex((h) => h === 'id')
    const stockIndex = header.findIndex((h) => h === 'stock' || h === 'quantita' || h === 'quantity' || h === 'qty')

    if (stockIndex === -1) {
      return NextResponse.json(
        { error: 'Colonna Stock/Quantità non trovata nel CSV' },
        { status: 400 }
      )
    }

    if (skuIndex === -1 && partNumberIndex === -1 && idIndex === -1) {
      return NextResponse.json(
        { error: 'Colonna identificativa (SKU/PartNumber/ID) non trovata nel CSV' },
        { status: 400 }
      )
    }

    const results = {
      success: [] as Array<{ identifier: string; productName: string; oldStock: number; newStock: number }>,
      errors: [] as Array<{ line: number; identifier: string; error: string }>,
      skipped: [] as Array<{ line: number; identifier: string; reason: string }>,
    }

    // Processa ogni riga (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const columns = line.split(',').map((col) => col.trim())

      try {
        // Identifica prodotto
        let product = null
        let identifier = ''

        if (skuIndex !== -1 && columns[skuIndex]) {
          identifier = columns[skuIndex]
          product = await prisma.product.findUnique({
            where: { sku: identifier },
          })
        }

        if (!product && partNumberIndex !== -1 && columns[partNumberIndex]) {
          identifier = columns[partNumberIndex]
          product = await prisma.product.findFirst({
            where: { partNumber: identifier },
          })
        }

        if (!product && idIndex !== -1 && columns[idIndex]) {
          identifier = columns[idIndex]
          product = await prisma.product.findUnique({
            where: { id: identifier },
          })
        }

        if (!product) {
          results.errors.push({
            line: i + 1,
            identifier: identifier || `Linea ${i + 1}`,
            error: 'Prodotto non trovato',
          })
          continue
        }

        // Parse quantità stock
        const stockValue = parseInt(columns[stockIndex])
        if (isNaN(stockValue) || stockValue < 0) {
          results.errors.push({
            line: i + 1,
            identifier: product.sku || product.partNumber || product.id,
            error: `Quantità non valida: ${columns[stockIndex]}`,
          })
          continue
        }

        const oldStock = product.stockQuantity

        // Aggiorna stock in transazione
        const updatedProduct = await prisma.$transaction(async (tx) => {
          // Aggiorna prodotto
          const updated = await tx.product.update({
            where: { id: product!.id },
            data: {
              stockQuantity: stockValue,
              inStock: stockValue > 0,
            },
          })

          // Crea movimento inventario
          const quantityChange = stockValue - oldStock
          if (quantityChange !== 0) {
            await tx.inventoryMovement.create({
              data: {
                productId: product!.id,
                type: quantityChange > 0 ? 'PURCHASE' : 'ADJUSTMENT',
                quantity: quantityChange,
                quantityAfter: stockValue,
                reason: `Import CSV - ${quantityChange > 0 ? 'Aggiunta' : 'Rimozione'} stock`,
                userId,
              },
            })
          }

          return updated
        })

        results.success.push({
          identifier: product.sku || product.partNumber || product.id,
          productName: product.name,
          oldStock,
          newStock: stockValue,
        })
      } catch (error: any) {
        results.errors.push({
          line: i + 1,
          identifier: `Linea ${i + 1}`,
          error: error.message || 'Errore sconosciuto',
        })
      }
    }

    return NextResponse.json({
      message: 'Import completato',
      summary: {
        total: lines.length - 1,
        success: results.success.length,
        errors: results.errors.length,
        skipped: results.skipped.length,
      },
      results,
    })
  } catch (error: any) {
    console.error('Errore nell\'import CSV:', error)
    return NextResponse.json(
      { error: 'Errore nell\'import CSV', details: error.message },
      { status: 500 }
    )
  }
}

