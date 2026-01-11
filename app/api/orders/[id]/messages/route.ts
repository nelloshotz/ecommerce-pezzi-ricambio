import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Tipi validi per il subject/motivo del messaggio
const VALID_SUBJECTS = ['PROBLEMA_ORDINE', 'PARTI_MANCANTI', 'ALTRO']

// GET - Recupera tutti i messaggi di un ordine
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const isAdmin = searchParams.get('isAdmin') === 'true'

    // Verifica che l'ordine esista
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Ordine non trovato' },
        { status: 404 }
      )
    }

    // Verifica autorizzazione: utente può vedere solo i suoi ordini, admin può vedere tutto
    if (!isAdmin && order.userId !== userId) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      )
    }

    // Recupera messaggi
    const messages = await prisma.orderMessage.findMany({
      where: { orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        attachments: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Aggiorna stato lettura se richiesto
    if (userId && messages.length > 0) {
      const updateData: any = {}
      if (isAdmin) {
        updateData.isReadByAdmin = true
      } else {
        updateData.isReadByUser = true
      }

      // Aggiorna solo i messaggi non ancora letti
      const unreadMessageIds = messages
        .filter((msg) => (isAdmin ? !msg.isReadByAdmin : !msg.isReadByUser))
        .map((msg) => msg.id)

      if (unreadMessageIds.length > 0) {
        await prisma.orderMessage.updateMany({
          where: {
            id: { in: unreadMessageIds },
          },
          data: updateData,
        })
      }
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Errore nel recupero messaggi:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero messaggi' },
      { status: 500 }
    )
  }
}

// POST - Crea nuovo messaggio
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    const formData = await request.formData()
    
    const userId = formData.get('userId') as string
    const adminId = formData.get('adminId') as string | null
    const subject = formData.get('subject') as string
    const message = formData.get('message') as string
    const isAdmin = formData.get('isAdmin') === 'true'
    const files = formData.getAll('attachments') as File[]

    if (!message || !subject) {
      return NextResponse.json(
        { error: 'Subject e messaggio richiesti' },
        { status: 400 }
      )
    }

    if (!VALID_SUBJECTS.includes(subject)) {
      return NextResponse.json(
        { error: 'Subject non valido' },
        { status: 400 }
      )
    }

    // Verifica che l'ordine esista
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Ordine non trovato' },
        { status: 404 }
      )
    }

    // Verifica autorizzazione
    if (isAdmin) {
      if (!adminId) {
        return NextResponse.json(
          { error: 'AdminId richiesto per messaggi admin' },
          { status: 400 }
        )
      }
      // Verifica che sia effettivamente admin
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
      })
      if (!admin || admin.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Non autorizzato' },
          { status: 403 }
        )
      }
    } else {
      if (!userId || order.userId !== userId) {
        return NextResponse.json(
          { error: 'Non autorizzato' },
          { status: 403 }
        )
      }
    }

    // Verifica se questo è il primo messaggio della conversazione
    const existingMessages = await prisma.orderMessage.findMany({
      where: { orderId },
    })

    // Se è il primo messaggio e viene dall'utente, verifica che abbia specificato il subject
    if (existingMessages.length === 0 && !isAdmin && !subject) {
      return NextResponse.json(
        { error: 'Subject richiesto per il primo messaggio' },
        { status: 400 }
      )
    }

    // Processa allegati se presenti
    const attachments: Array<{ fileName: string; fileUrl: string; fileType: string; fileSize: number }> = []

    if (files && files.length > 0) {
      // Crea directory per upload se non esiste
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'messages', orderId)
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) { // 5MB max
          return NextResponse.json(
            { error: `File ${file.name} troppo grande. Massimo 5MB` },
            { status: 400 }
          )
        }

        // Verifica tipo file (solo immagini per ora)
        if (!file.type.startsWith('image/')) {
          return NextResponse.json(
            { error: `File ${file.name} deve essere un'immagine` },
            { status: 400 }
          )
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Genera nome file univoco
        const timestamp = Date.now()
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileName = `${timestamp}_${sanitizedName}`
        const filePath = join(uploadDir, fileName)

        await writeFile(filePath, buffer)

        const fileUrl = `/uploads/messages/${orderId}/${fileName}`
        attachments.push({
          fileName: file.name,
          fileUrl,
          fileType: file.type,
          fileSize: file.size,
        })
      }
    }

    // Crea messaggio con allegati in transazione
    const result = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.orderMessage.create({
        data: {
          orderId,
          userId: isAdmin ? null : userId,
          adminId: isAdmin ? adminId : null,
          subject,
          message,
          isRead: false,
          isReadByUser: isAdmin, // Se admin invia, utente non ha ancora letto
          isReadByAdmin: !isAdmin, // Se utente invia, admin non ha ancora letto
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })

      // Crea allegati se presenti
      if (attachments.length > 0) {
        await tx.orderMessageAttachment.createMany({
          data: attachments.map((att) => ({
            messageId: newMessage.id,
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileType: att.fileType,
            fileSize: att.fileSize,
          })),
        })

        // Recupera messaggio con allegati
        return await tx.orderMessage.findUnique({
          where: { id: newMessage.id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            attachments: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        })
      }

      return { ...newMessage, attachments: [] }
    })

    return NextResponse.json({ message: result }, { status: 201 })
  } catch (error) {
    console.error('Errore nella creazione messaggio:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione messaggio' },
      { status: 500 }
    )
  }
}

