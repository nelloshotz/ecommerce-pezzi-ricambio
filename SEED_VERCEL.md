# Come popolare il database su Vercel

## Problema
Il database su Vercel è vuoto perché il seed non viene eseguito automaticamente durante il deploy.

## Soluzione

### Opzione 1: Eseguire il seed manualmente (Raccomandato per test)

1. **Configura il database su Vercel:**
   - Vai su Vercel Dashboard → Il tuo progetto → Settings → Environment Variables
   - Aggiungi `DATABASE_URL` con la connessione al tuo database PostgreSQL
   - Esempio: `postgresql://user:password@host:5432/database?schema=public`

2. **Aggiorna `prisma/schema.prisma` per usare PostgreSQL:**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. **Esegui il seed manualmente:**
   - Connettiti al tuo server Vercel via SSH o usa Vercel CLI
   - Oppure crea un'API route temporanea per eseguire il seed

### Opzione 2: Creare un'API route per il seed (Solo per sviluppo/test)

⚠️ **ATTENZIONE**: Rimuovi questa route in produzione per sicurezza!

Crea `app/api/admin/seed/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  // ⚠️ AGGIUNGI AUTENTICAZIONE ADMIN QUI!
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SEED_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { stdout, stderr } = await execAsync('npm run db:seed')
    return NextResponse.json({ 
      success: true, 
      output: stdout,
      error: stderr 
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
```

Poi chiama: `POST /api/admin/seed` con header `Authorization: Bearer <SEED_SECRET>`

### Opzione 3: Usare Vercel Postgres + Script automatico

1. Aggiungi Vercel Postgres al tuo progetto
2. Configura `DATABASE_URL` automaticamente
3. Esegui il seed dopo il primo deploy usando Vercel CLI o dashboard

## Credenziali Demo

Dopo il seed, puoi usare:

**Admin:**
- Email: `admin@motorplanet.it`
- Password: `Admin123!`

**Utente:**
- Email: `user@test.it`
- Password: `User123!`

## Nota Importante

Il database locale (SQLite) e quello su Vercel sono **completamente separati**. 
I dati inseriti localmente non appaiono su Vercel e viceversa.

