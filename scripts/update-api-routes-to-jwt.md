# Script per aggiornare tutte le API routes a JWT

Le seguenti API routes devono ancora essere aggiornate per usare JWT invece di x-user-id:

## Route Admin (richiedono verifyAdmin):
- app/api/admin/orders/[id]/shipping-label/route.ts
- app/api/admin/stripe/config/route.ts
- app/api/admin/inventory/movements/route.ts
- app/api/admin/stripe/test-credentials/route.ts
- app/api/admin/products/[id]/offers/route.ts
- app/api/admin/products/[id]/route.ts
- app/api/admin/footer/route.ts
- app/api/admin/shipping/settings/route.ts
- app/api/admin/shipping/carriers/route.ts
- app/api/admin/inventory/alerts/route.ts
- app/api/admin/revenue/daily/route.ts
- app/api/admin/users/[id]/ban/route.ts
- app/api/admin/products/cleanup-images/route.ts
- app/api/admin/products/[id]/images/[imageId]/route.ts
- app/api/admin/products/[id]/images/route.ts
- app/api/admin/inventory/import-csv/route.ts
- app/api/admin/inventory/predictions/route.ts
- app/api/admin/inventory/settings/route.ts
- app/api/admin/coupons/[id]/route.ts
- app/api/admin/coupons/generate/route.ts
- app/api/admin/coupons/route.ts
- app/api/admin/company/settings/route.ts
- app/api/admin/categories/[id]/route.ts
- app/api/admin/categories/route.ts

## Route Utente (richiedono verifyAuth):
- app/api/orders/[id]/reviews/route.ts
- app/api/shipping/calculate/route.ts
- app/api/payments/create-intent/route.ts

## Route Pubbliche (non richiedono autenticazione):
- app/api/products/route.ts (già gestito)
- app/api/categories/route.ts (già gestito)

## Pattern di sostituzione:

### Per route admin:
```typescript
// PRIMA:
const userId = request.headers.get('x-user-id')
if (!userId) {
  return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 })
}
const admin = await prisma.user.findUnique({
  where: { id: userId },
  select: { role: true },
})
if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'admin')) {
  return NextResponse.json({ error: 'Accesso negato. Solo amministratori.' }, { status: 403 })
}

// DOPO:
const { verifyAdmin } = await import('@/lib/auth')
const authResult = await verifyAdmin(request)
if (authResult.error || !authResult.user) {
  return NextResponse.json(
    { error: authResult.error || 'Utente non autenticato' },
    { status: authResult.error?.includes('Accesso negato') ? 403 : 401 }
  )
}
const userId = authResult.user.userId
```

### Per route utente:
```typescript
// PRIMA:
const userId = request.headers.get('x-user-id')
if (!userId) {
  return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 })
}

// DOPO:
const { verifyAuth } = await import('@/lib/auth')
const authResult = await verifyAuth(request)
if (authResult.error || !authResult.user) {
  return NextResponse.json(
    { error: authResult.error || 'Utente non autenticato' },
    { status: 401 }
  )
}
const userId = authResult.user.userId
```

