import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Recupera contenuto footer (pubblico)
export async function GET(request: NextRequest) {
  try {
    // Recupera contenuto footer (solo un record)
    const content = await prisma.footerContent.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

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
    return NextResponse.json(
      { error: 'Errore nel recupero contenuto footer', details: error.message },
      { status: 500 }
    )
  }
}

