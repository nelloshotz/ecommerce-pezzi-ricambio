import { NextRequest, NextResponse } from 'next/server'
import { generateProductCode } from '@/lib/productCodeGenerator'
import { prisma } from '@/lib/prisma'

// POST - Genera codice prodotto automaticamente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categorySlug, categoryId } = body

    // Se abbiamo categoryId, usalo per ottenere il nome categoria
    let categorySlugForGeneration = categorySlug || null
    
    if (categoryId && !categorySlug) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { slug: true },
      })
      if (category) {
        categorySlugForGeneration = category.slug
      }
    }

    const generatedCode = await generateProductCode(categorySlugForGeneration, categoryId || null)

    return NextResponse.json({ code: generatedCode })
  } catch (error) {
    console.error('Errore nella generazione codice:', error)
    return NextResponse.json(
      { error: 'Errore nella generazione codice prodotto' },
      { status: 500 }
    )
  }
}

// GET - Verifica se un codice è già in uso
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'Codice richiesto' },
        { status: 400 }
      )
    }

    const { isProductCodeUnique } = await import('@/lib/productCodeGenerator')
    const isUnique = await isProductCodeUnique(code)

    return NextResponse.json({ unique: isUnique, code })
  } catch (error) {
    console.error('Errore nella verifica codice:', error)
    return NextResponse.json(
      { error: 'Errore nella verifica codice' },
      { status: 500 }
    )
  }
}

