# Setup Completo Database VPS per Vercel

## 🎯 Obiettivo
Usare PostgreSQL sulla VPS `57.129.4.62` come database per l'app su Vercel.

## 📋 Passi da seguire

### 1. Setup PostgreSQL sulla VPS

```bash
# Connettiti alla VPS
ssh ubuntu@57.129.4.62
cd /home/ubuntu/motorplanet

# Esegui script di setup
chmod +x scripts/setup-vps-db.sh
./scripts/setup-vps-db.sh
```

Lo script ti chiederà una password per l'utente database. Scegli una password sicura.

### 2. Modifica Prisma Schema

**Opzione A: Cambio permanente a PostgreSQL**

Modifica `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // Cambia da "sqlite"
  url      = env("DATABASE_URL")
}
```

**Opzione B: Mantieni SQLite locale, PostgreSQL in produzione**

Crea due file:
- `prisma/schema.sqlite.prisma` (per sviluppo)
- `prisma/schema.postgresql.prisma` (per produzione)

E usa script per switchare.

### 3. Push Schema su VPS

```bash
# In locale, con DATABASE_URL della VPS
export DATABASE_URL="postgresql://motorplanet_user:password@57.129.4.62:5432/motorplanet?sslmode=require"

# Genera Prisma Client per PostgreSQL
npx prisma generate

# Push schema
npx prisma db push

# Seed dati
npm run db:seed
```

### 4. Configura Vercel

Vai su Vercel Dashboard → Il tuo progetto → Settings → Environment Variables

Aggiungi:
```
DATABASE_URL=postgresql://motorplanet_user:password@57.129.4.62:5432/motorplanet?sslmode=require
```

### 5. Variabili d'ambiente locali

Crea/aggiorna `.env`:
```env
# Sviluppo locale (SQLite)
# DATABASE_URL="file:./dev.db"

# Produzione (PostgreSQL VPS)
DATABASE_URL="postgresql://motorplanet_user:password@57.129.4.62:5432/motorplanet?sslmode=require"
```

## 🔒 Sicurezza

### Consigli importanti:

1. **Usa SSL/TLS**: Aggiungi `?sslmode=require` all'URL (già incluso)

2. **Limita accesso IP**: Su Vercel, puoi limitare l'accesso solo agli IP di Vercel:
   ```bash
   # Su VPS, modifica pg_hba.conf
   host    motorplanet    motorplanet_user    <vercel-ip>/32    md5
   ```

3. **Password forte**: Usa una password complessa per l'utente database

4. **Firewall**: La porta 5432 è aperta solo se necessario. Considera di limitarla agli IP Vercel.

## 🚨 Problemi comuni

### Errore: "connection refused"
- Verifica che PostgreSQL sia in ascolto: `sudo systemctl status postgresql`
- Verifica firewall: `sudo ufw status`

### Errore: "password authentication failed"
- Verifica password in `pg_hba.conf`
- Ricrea utente se necessario

### Errore: "database does not exist"
- Verifica nome database: `sudo -u postgres psql -l`

## 📊 Verifica connessione

Testa la connessione dalla tua macchina locale:
```bash
psql "postgresql://motorplanet_user:password@57.129.4.62:5432/motorplanet?sslmode=require"
```

## 🔄 Migrazione da SQLite a PostgreSQL

Prisma gestisce automaticamente la migrazione, ma alcuni tipi SQLite potrebbero richiedere attenzione:
- `TEXT` → `VARCHAR` o `TEXT`
- `INTEGER` → `INT` o `BIGINT`
- `REAL` → `DOUBLE PRECISION`

Prisma dovrebbe gestire tutto automaticamente con `db push`.

