import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE - Elimina un coupon
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const couponId = params.id

    // Verifica che il coupon esista
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    })

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon non trovato' }, { status: 404 })
    }

    // Se il coupon è già stato utilizzato, non permettere l'eliminazione (per sicurezza)
    if (coupon.isUsed) {
      return NextResponse.json(
        { error: 'Impossibile eliminare un coupon già utilizzato' },
        { status: 400 }
      )
    }

    // Elimina il coupon
    await prisma.coupon.delete({
      where: { id: couponId },
    })

    return NextResponse.json(
      { message: 'Coupon eliminato con successo' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Errore nell\'eliminazione coupon:', error)
    return NextResponse.json(
      { error: error.message || 'Errore nell\'eliminazione coupon' },
      { status: 500 }
    )
  }
}

