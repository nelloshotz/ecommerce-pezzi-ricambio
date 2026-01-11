import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Recupera contenuto footer
export async function GET(request: NextRequest) {
  try {
    // Solo admin può accedere
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Accesso negato. Solo amministratori.' }, { status: 403 })
    }

    // Recupera contenuto footer (solo un record)
    let content
    try {
      // Verifica che il modello sia disponibile
      if (!prisma.footerContent) {
        console.error('Modello footerContent non disponibile nel client Prisma')
        return NextResponse.json(
          {
            chiSiamo: null,
            spedizioni: null,
            faq: [],
          },
          { status: 200 }
        )
      }
      
      content = await prisma.footerContent.findFirst({
        orderBy: { updatedAt: 'desc' },
      })
    } catch (dbError: any) {
      console.error('Errore database nel recupero footer:', dbError)
      console.error('Tipo errore:', dbError.constructor.name)
      console.error('Messaggio:', dbError.message)
      console.error('Stack:', dbError.stack)
      
      // Se il modello non esiste, ritorna valori vuoti
      if (
        dbError.message?.includes('footerContent') || 
        dbError.message?.includes('footer_content') ||
        dbError.message?.includes('Unknown model') ||
        dbError.message?.includes('does not exist')
      ) {
        return NextResponse.json(
          {
            chiSiamo: null,
            spedizioni: null,
            faq: [],
          },
          { status: 200 }
        )
      }
      throw dbError
    }

    if (!content) {
      return NextResponse.json(
        {
          chiSiamo: null,
          spedizioni: null,
          faq: [],
        },
        { status: 200 }
      )
    }

    // Parse FAQ JSON
    let faq = []
    if (content.faq) {
      try {
        faq = JSON.parse(content.faq)
      } catch (e) {
        faq = []
      }
    }

    return NextResponse.json(
      {
        chiSiamo: content.chiSiamo,
        spedizioni: content.spedizioni,
        faq: faq,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel recupero contenuto footer:', error)
    console.error('Stack trace:', error.stack)
    return NextResponse.json(
      { 
        error: 'Errore nel recupero contenuto footer', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// POST - Salva contenuto footer
export async function POST(request: NextRequest) {
  try {
    // Solo admin può accedere
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Accesso negato. Solo amministratori.' }, { status: 403 })
    }

    const body = await request.json()
    const { chiSiamo, spedizioni, faq } = body

    // Valida FAQ (deve essere un array)
    let faqJson = null
    if (faq && Array.isArray(faq)) {
      // Valida che ogni elemento abbia domanda e risposta
      const validFaq = faq.filter((item: any) => item.domanda && item.risposta)
      faqJson = JSON.stringify(validFaq)
    }

    // Verifica se esiste già un record
    const existing = await prisma.footerContent.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    let content

    if (existing) {
      // Aggiorna record esistente
      content = await prisma.footerContent.update({
        where: { id: existing.id },
        data: {
          chiSiamo: chiSiamo || null,
          spedizioni: spedizioni || null,
          faq: faqJson,
        },
      })
    } else {
      // Crea nuovo record
      content = await prisma.footerContent.create({
        data: {
          chiSiamo: chiSiamo || null,
          spedizioni: spedizioni || null,
          faq: faqJson,
        },
      })
    }

    // Parse FAQ per la risposta
    let parsedFaq = []
    if (content.faq) {
      try {
        parsedFaq = JSON.parse(content.faq)
      } catch (e) {
        parsedFaq = []
      }
    }

    return NextResponse.json(
      {
        chiSiamo: content.chiSiamo,
        spedizioni: content.spedizioni,
        faq: parsedFaq,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nel salvataggio contenuto footer:', error)
    return NextResponse.json(
      { error: 'Errore nel salvataggio contenuto footer', details: error.message },
      { status: 500 }
    )
  }
}

