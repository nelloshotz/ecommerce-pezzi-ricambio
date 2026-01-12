# Usare SQLite su Vercel (Soluzioni Cloud)

## ⚠️ Perché SQLite locale NON funziona su Vercel

SQLite usa file locali che:
- ❌ Non persistono tra i deploy
- ❌ Non sono condivisi tra istanze serverless
- ❌ Vengono persi ad ogni riavvio

## ✅ Soluzione: SQLite in Cloud con Turso

**Turso** è SQLite distribuito in cloud, perfetto per Vercel. Mantiene la stessa sintassi SQLite ma in cloud.

### Setup Turso (Raccomandato)

#### 1. Crea account Turso
- Vai su https://turso.tech
- Crea account gratuito
- Crea un nuovo database chiamato `motorplanet`

#### 2. Installa Turso CLI
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

#### 3. Login e crea database
```bash
turso auth login
turso db create motorplanet
```

#### 4. Ottieni URL e Token
```bash
# URL del database
turso db show motorplanet --url

# Crea token di autenticazione
turso db tokens create motorplanet
```

#### 5. Configura variabili d'ambiente su Vercel
Vai su Vercel Dashboard → Il tuo progetto → Settings → Environment Variables

Aggiungi:
- `DATABASE_URL`: URL ottenuto (formato: `libsql://motorplanet-xxx.turso.io`)
- `TURSO_AUTH_TOKEN`: Token ottenuto

#### 6. Aggiorna `prisma/schema.prisma`
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")  // Cambia da "file:./dev.db"
}
```

#### 7. Installa driver Turso
```bash
npm install @libsql/client
```

#### 8. Aggiorna `lib/prisma.ts`
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL!,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

#### 9. Push schema e seed
```bash
# In locale (con DATABASE_URL di Turso)
npm run db:push
npm run db:seed
```

### Vantaggi Turso
- ✅ SQLite puro (stessa sintassi, zero migrazione codice)
- ✅ Piano gratuito generoso (500MB, 1 replica)
- ✅ Repliche globali per performance
- ✅ Compatibile con Prisma
- ✅ Funziona perfettamente con Vercel

### Costi Turso
- **Free**: 500MB storage, 1 replica, 1M query/mese
- **Pro**: $29/mese per più storage e repliche

---

## Alternativa: Cloudflare D1

**D1** è SQLite di Cloudflare, ma richiede deploy su Cloudflare Pages (non Vercel).

---

## Nota Importante

Anche con Turso, devi eseguire il seed manualmente dopo il primo setup:
```bash
npm run db:seed
```

Oppure crea un'API route temporanea per eseguirlo (vedi `SEED_VERCEL.md`).

