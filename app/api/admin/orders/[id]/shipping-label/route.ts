import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import PDFDocument from 'pdfkit'

// Funzione helper per loggare errori
async function logError(data: {
  component: string
  url: string
  user: string | null
  error: string
  stack?: string | null
  message?: string
  additionalInfo?: any
}) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/logs/error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Ignora errori di logging
    })
  } catch {
    // Ignora errori di logging
  }
}

// GET - Genera etichetta spedizione PDF
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id
  const userId = request.headers.get('x-user-id')

  try {
    // Log iniziale
    await logError({
      component: 'ShippingLabelAPI',
      url: `/api/admin/orders/${orderId}/shipping-label`,
      user: userId || null,
      error: 'Inizio generazione etichetta',
      message: `Generazione etichetta per ordine ${orderId}`,
      additionalInfo: { orderId, userId },
    })

    // Verifica autenticazione admin
    if (!userId) {
      await logError({
        component: 'ShippingLabelAPI',
        url: `/api/admin/orders/${orderId}/shipping-label`,
        user: null,
        error: 'Utente non autenticato',
        message: 'Header x-user-id mancante',
      })
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'admin')) {
      await logError({
        component: 'ShippingLabelAPI',
        url: `/api/admin/orders/${orderId}/shipping-label`,
        user: userId,
        error: 'Accesso negato',
        message: `Utente ${userId} non è admin. Ruolo: ${user?.role || 'null'}`,
        additionalInfo: { userRole: user?.role },
      })
      return NextResponse.json({ error: 'Accesso negato. Solo amministratori.' }, { status: 403 })
    }

    await logError({
      component: 'ShippingLabelAPI',
      url: `/api/admin/orders/${orderId}/shipping-label`,
      user: userId,
      error: 'Autenticazione OK',
      message: `Utente autenticato come admin, recupero ordine ${orderId}`,
    })

    // Recupera ordine con tutti i dati necessari
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shippingAddress: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                weight: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      await logError({
        component: 'ShippingLabelAPI',
        url: `/api/admin/orders/${orderId}/shipping-label`,
        user: userId,
        error: 'Ordine non trovato',
        message: `Ordine con ID ${orderId} non trovato nel database`,
        additionalInfo: { orderId },
      })
      return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 })
    }

    await logError({
      component: 'ShippingLabelAPI',
      url: `/api/admin/orders/${orderId}/shipping-label`,
      user: userId,
      error: 'Ordine recuperato',
      message: `Ordine ${order.orderNumber} recuperato con successo`,
      additionalInfo: {
        orderNumber: order.orderNumber,
        itemsCount: order.items.length,
        hasShippingAddress: !!order.shippingAddress,
      },
    })

    // Recupera dati azienda
    const companySettings = await prisma.companySettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (!companySettings) {
      await logError({
        component: 'ShippingLabelAPI',
        url: `/api/admin/orders/${orderId}/shipping-label`,
        user: userId,
        error: 'Dati azienda non configurati',
        message: 'Nessun CompanySettings trovato nel database',
        additionalInfo: { orderId },
      })
      return NextResponse.json(
        { error: 'Dati azienda non configurati. Configura il profilo azienda prima di generare etichette.' },
        { status: 400 }
      )
    }

    await logError({
      component: 'ShippingLabelAPI',
      url: `/api/admin/orders/${orderId}/shipping-label`,
      user: userId,
      error: 'CompanySettings recuperati',
      message: `CompanySettings recuperati per ${companySettings.companyName}`,
      additionalInfo: {
        companyName: companySettings.companyName,
        hasVatNumber: !!companySettings.vatNumber,
      },
    })

    // Parse shippingPackages se presente
    let packages: any[] = []
    if (order.shippingPackages) {
      try {
        packages = JSON.parse(order.shippingPackages)
        await logError({
          component: 'ShippingLabelAPI',
          url: `/api/admin/orders/${orderId}/shipping-label`,
          user: userId,
          error: 'ShippingPackages parsati',
          message: `Parsati ${packages.length} pacchi da shippingPackages`,
          additionalInfo: { packagesCount: packages.length },
        })
      } catch (e: any) {
        await logError({
          component: 'ShippingLabelAPI',
          url: `/api/admin/orders/${orderId}/shipping-label`,
          user: userId,
          error: 'Errore parsing shippingPackages',
          message: e.message || 'Errore nel parsing JSON',
          stack: e.stack,
          additionalInfo: { shippingPackages: order.shippingPackages },
        })
      }
    }

    // Se non ci sono pacchi definiti, crea un pacco unico con tutti gli items
    if (packages.length === 0) {
      packages = [
        {
          packageNumber: 1,
          items: order.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
          })),
        },
      ]
      await logError({
        component: 'ShippingLabelAPI',
        url: `/api/admin/orders/${orderId}/shipping-label`,
        user: userId,
        error: 'Pacco unico creato',
        message: `Creato pacco unico con ${packages[0].items.length} items`,
        additionalInfo: { itemsCount: packages[0].items.length },
      })
    }

    // Funzione helper per generare un PDF in modo asincrono
    const generatePDF = (pkg: any, currentUserId: string, currentOrderId: string): Promise<Buffer> => {
      return new Promise(async (resolve, reject) => {
        try {
          // Log inizio generazione
          logError({
            component: 'ShippingLabelAPI',
            url: `/api/admin/orders/${currentOrderId}/shipping-label`,
            user: currentUserId,
            error: 'Inizio generazione PDF',
            message: `Generazione PDF per pacco ${pkg.packageNumber}`,
            additionalInfo: {
              packageNumber: pkg.packageNumber,
              itemsCount: pkg.items?.length || 0,
            },
          }).catch(() => {})

          // A5 portrait: 148mm x 210mm (420.94pt x 595.28pt)
          const doc = new PDFDocument({
            size: [420.94, 595.28], // A5 portrait in punti
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
          })

          const buffers: Buffer[] = []
          doc.on('data', buffers.push.bind(buffers))
          doc.on('end', () => {
            const finalBuffer = Buffer.concat(buffers)
            // Log successo
            logError({
              component: 'ShippingLabelAPI',
              url: `/api/admin/orders/${currentOrderId}/shipping-label`,
              user: currentUserId,
              error: 'PDF generato con successo',
              message: `PDF generato per pacco ${pkg.packageNumber}, dimensione: ${finalBuffer.length} bytes`,
              additionalInfo: { bufferSize: finalBuffer.length },
            }).catch(() => {})
            resolve(finalBuffer)
          })
          doc.on('error', (err: any) => {
            // Log errore
            logError({
              component: 'ShippingLabelAPI',
              url: `/api/admin/orders/${currentOrderId}/shipping-label`,
              user: currentUserId,
              error: 'Errore generazione PDF',
              message: err.message || 'Errore durante la generazione del PDF',
              stack: err.stack,
              additionalInfo: { packageNumber: pkg.packageNumber },
            }).catch(() => {})
            reject(err)
          })

          const pageWidth = 420.94
          const marginLeft = 20
          const marginRight = 20
          const contentWidth = pageWidth - marginLeft - marginRight

          // Header Etichetta
          doc.fontSize(12).font('Helvetica-Bold').text('ETICHETTA SPEDIZIONE', { align: 'center' })
          doc.moveDown(0.4)

          // Linea separatrice
          doc.moveTo(marginLeft, doc.y).lineTo(pageWidth - marginRight, doc.y).stroke()
          doc.moveDown(0.4)

          // MITTENTE (Azienda) - COMPATTO
          doc.fontSize(8).font('Helvetica-Bold').text('MITTENTE:', marginLeft, doc.y)
          doc.moveDown(0.2)
          doc.fontSize(7).font('Helvetica')
          doc.text(companySettings.companyName, marginLeft, doc.y, { width: contentWidth })
          if (companySettings.vatNumber) {
            doc.text(`P.IVA: ${companySettings.vatNumber}`, marginLeft, doc.y, { width: contentWidth })
          }
          doc.text(companySettings.address, marginLeft, doc.y, { width: contentWidth })
          doc.text(`${companySettings.postalCode} ${companySettings.city}${companySettings.province ? ` (${companySettings.province})` : ''}`, marginLeft, doc.y, { width: contentWidth })
          doc.text(companySettings.country, marginLeft, doc.y, { width: contentWidth })

          doc.moveDown(0.5)

          // Linea separatrice
          doc.moveTo(marginLeft, doc.y).lineTo(pageWidth - marginRight, doc.y).stroke()
          doc.moveDown(0.6)

          // DESTINATARIO (Cliente) - GRANDE E EVIDENTE
          doc.fontSize(13).font('Helvetica-Bold').text('DESTINATARIO:', marginLeft, doc.y)
          doc.moveDown(0.4)
          doc.fontSize(12).font('Helvetica-Bold')
          doc.text(`${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`, marginLeft, doc.y, { width: contentWidth })
          doc.moveDown(0.3)
          doc.fontSize(10).font('Helvetica')
          doc.text(order.shippingAddress.address, marginLeft, doc.y, { width: contentWidth })
          doc.text(`${order.shippingAddress.postalCode} ${order.shippingAddress.city}${order.shippingAddress.province ? ` (${order.shippingAddress.province})` : ''}`, marginLeft, doc.y, { width: contentWidth })
          doc.text(order.shippingAddress.country, marginLeft, doc.y, { width: contentWidth })
          if (order.shippingAddress.phone) {
            doc.text(`Tel: ${order.shippingAddress.phone}`, marginLeft, doc.y, { width: contentWidth })
          }
          // Email del destinatario NON inclusa nell'etichetta

          doc.moveDown(0.8)

          // Linea separatrice
          doc.moveTo(marginLeft, doc.y).lineTo(pageWidth - marginRight, doc.y).stroke()
          doc.moveDown(0.4)

          // INFO ORDINE
          doc.fontSize(9).font('Helvetica-Bold').text('INFO ORDINE:', marginLeft, doc.y)
          doc.moveDown(0.3)
          doc.fontSize(8).font('Helvetica')
          doc.text(`Ordine: ${order.orderNumber}`, marginLeft, doc.y, { width: contentWidth })
          if (order.trackingNumber) {
            doc.text(`Tracking: ${order.trackingNumber}`, marginLeft, doc.y, { width: contentWidth })
          }
          doc.text(`Corriere: ${order.shippingCarrier || 'N/A'}`, marginLeft, doc.y, { width: contentWidth })
          if (packages.length > 1) {
            doc.text(`Collo ${pkg.packageNumber} di ${packages.length}`, marginLeft, doc.y, { width: contentWidth })
          }

          // PESO
          let packageWeight = pkg.totalWeight || pkg.weight || 0
          if (!packageWeight && pkg.items) {
            // Calcola peso dai prodotti se non disponibile nel pacco
            for (const item of pkg.items) {
              const orderItem = order.items.find((oi) => oi.productId === item.productId)
              if (orderItem?.product?.weight) {
                packageWeight += orderItem.product.weight * item.quantity
              }
            }
          }
          
          if (packageWeight > 0) {
            doc.text(`Peso: ${packageWeight.toFixed(2)} kg`, marginLeft, doc.y, { width: contentWidth })
          }

          doc.moveDown(0.6)

          // Linea separatrice
          doc.moveTo(marginLeft, doc.y).lineTo(pageWidth - marginRight, doc.y).stroke()
          doc.moveDown(0.4)

          // Contenuto Collo (opzionale, più compatto)
          if (pkg.items && pkg.items.length > 0) {
            doc.fontSize(8).font('Helvetica-Bold').text('CONTENUTO:', marginLeft, doc.y)
            doc.moveDown(0.2)
            doc.fontSize(7).font('Helvetica')

            for (const item of pkg.items) {
              const product = order.items.find((oi) => oi.productId === item.productId)
              const productName = product?.productName || item.productName || 'Prodotto'
              doc.text(`• ${productName} x${item.quantity}`, marginLeft + 8, doc.y, { width: contentWidth - 8 })
            }
          }

          // Note azienda se presenti
          if (companySettings.notes) {
            doc.moveDown(0.8)
            doc.fontSize(7).font('Helvetica-Oblique').text(companySettings.notes, marginLeft, doc.y, { width: contentWidth })
          }

          doc.end()
        } catch (error: any) {
          logError({
            component: 'ShippingLabelAPI',
            url: `/api/admin/orders/${currentOrderId}/shipping-label`,
            user: currentUserId,
            error: 'Errore catch generazione PDF',
            message: error.message || 'Errore nella generazione PDF',
            stack: error.stack,
            additionalInfo: { packageNumber: pkg.packageNumber },
          }).catch(() => {})
          reject(error)
        }
      })
    }

    // Genera PDF per il primo collo (per semplicità, generiamo solo il primo)
    // Se ci sono più colli, l'admin può generare etichette separate per ognuno
    await logError({
      component: 'ShippingLabelAPI',
      url: `/api/admin/orders/${orderId}/shipping-label`,
      user: userId,
      error: 'Avvio generazione PDF finale',
      message: `Generazione PDF per il primo pacco di ${packages.length}`,
      additionalInfo: { packagesCount: packages.length },
    }).catch(() => {})

    const finalBuffer = await generatePDF(packages[0], userId, orderId)

    await logError({
      component: 'ShippingLabelAPI',
      url: `/api/admin/orders/${orderId}/shipping-label`,
      user: userId,
      error: 'PDF finale generato',
      message: `PDF generato con successo, dimensione: ${finalBuffer.length} bytes`,
      additionalInfo: { bufferSize: finalBuffer.length, orderNumber: order.orderNumber },
    }).catch(() => {})

    return new NextResponse(new Uint8Array(finalBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="etichetta-spedizione-${order.orderNumber}${packages.length > 1 ? `-collo-${packages[0].packageNumber}` : ''}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Errore nella generazione etichetta:', error)
    
    await logError({
      component: 'ShippingLabelAPI',
      url: `/api/admin/orders/${orderId}/shipping-label`,
      user: userId || null,
      error: 'Errore fatale generazione etichetta',
      message: error.message || 'Errore sconosciuto nella generazione etichetta',
      stack: error.stack,
      additionalInfo: {
        orderId,
        userId,
        errorName: error.name,
        errorMessage: error.message,
      },
    }).catch(() => {})

    return NextResponse.json(
      { error: 'Errore nella generazione etichetta spedizione', details: error.message },
      { status: 500 }
    )
  }
}

