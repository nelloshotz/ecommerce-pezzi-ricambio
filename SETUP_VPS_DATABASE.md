# Setup Database PostgreSQL sulla VPS per Vercel

## Configurazione VPS con PostgreSQL

### 1. Connettiti alla VPS
```bash
ssh ubuntu@57.129.4.62
cd /home/ubuntu/motorplanet
```

### 2. Installa PostgreSQL
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
```

### 3. Crea database e utente
```bash
sudo -u postgres psql

# Nel prompt PostgreSQL:
CREATE DATABASE motorplanet;
CREATE USER motorplanet_user WITH PASSWORD 'tua_password_sicura';
GRANT ALL PRIVILEGES ON DATABASE motorplanet TO motorplanet_user;
\q
```

### 4. Configura accesso remoto (opzionale, solo se necessario)
Modifica `/etc/postgresql/*/main/postgresql.conf`:
```conf
listen_addresses = '*'
```

Modifica `/etc/postgresql/*/main/pg_hba.conf`:
```
host    motorplanet    motorplanet_user    0.0.0.0/0    md5
```

Riavvia PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 5. Configura firewall (se necessario)
```bash
sudo ufw allow 5432/tcp
```

### 6. URL di connessione
```
postgresql://motorplanet_user:password@57.129.4.62:5432/motorplanet?sslmode=require
```

### 7. Aggiorna Prisma per produzione

Modifica `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"  // Per sviluppo locale
  url      = env("DATABASE_URL")
}
```

Oppure usa provider condizionale (richiede script):
```prisma
datasource db {
  provider = env("DATABASE_PROVIDER") // "sqlite" o "postgresql"
  url      = env("DATABASE_URL")
}
```

### 8. Variabili d'ambiente

**Locale (`.env`):**
```env
DATABASE_URL="file:./dev.db"
DATABASE_PROVIDER="sqlite"
```

**Vercel (Environment Variables):**
```env
DATABASE_URL="postgresql://motorplanet_user:password@57.129.4.62:5432/motorplanet?sslmode=require"
DATABASE_PROVIDER="postgresql"
```

### 9. Push schema e seed
```bash
# In locale, con DATABASE_URL di produzione
export DATABASE_URL="postgresql://motorplanet_user:password@57.129.4.62:5432/motorplanet?sslmode=require"
npm run db:push
npm run db:seed
```

---

## Opzione 2: SQLite via HTTP Gateway (Complesso)

Se vuoi mantenere SQLite, puoi usare un gateway HTTP, ma è complesso e non raccomandato.

### Usando sqlite-http

1. Installa sulla VPS:
```bash
npm install -g sqlite-http
```

2. Avvia gateway:
```bash
sqlite-http /home/ubuntu/motorplanet/dev.db --port 8080
```

3. URL di connessione:
```
http://57.129.4.62:8080
```

**Problemi:**
- ❌ Non è sicuro (HTTP non crittografato)
- ❌ Performance scarse
- ❌ Non supportato nativamente da Prisma
- ❌ Richiede gateway sempre attivo

---

## Raccomandazione

**Usa PostgreSQL sulla VPS** perché:
- ✅ Supporta connessioni remote nativamente
- ✅ Sicuro (SSL/TLS)
- ✅ Performance migliori
- ✅ Supportato perfettamente da Prisma
- ✅ Facile da configurare

SQLite è ottimo per sviluppo locale, ma per produzione remota PostgreSQL è la scelta migliore.

