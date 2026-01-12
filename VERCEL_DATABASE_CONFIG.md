# Configurazione Database Vercel

## ✅ Database Configurato e Popolato

Il database PostgreSQL è stato configurato sulla VPS e popolato con dati demo.

## 📋 Informazioni Connessione

**URL Database:**
```
postgresql://motorplanet_user:MotorPlanet2024!@57.129.4.62:5432/motorplanet?sslmode=require
```

## 🔧 Configurazione Vercel

1. Vai su **Vercel Dashboard** → Il tuo progetto → **Settings** → **Environment Variables**

2. Aggiungi la variabile:
   - **Name**: `DATABASE_URL`
   - **Value**: `postgresql://motorplanet_user:MotorPlanet2024!@57.129.4.62:5432/motorplanet?sslmode=require`
   - **Environment**: Seleziona tutte (Production, Preview, Development)

3. Clicca **Save**

4. **Redeploy** il progetto per applicare le modifiche

## 👤 Credenziali Demo

Dopo il deploy, puoi usare queste credenziali:

### Admin
- **Email**: `admin@motorplanet.it`
- **Password**: `Admin123!`

### Utente
- **Email**: `user@test.it`
- **Password**: `User123!`

## 📊 Dati Caricati

- ✅ 2 utenti (1 admin + 1 customer)
- ✅ 7 categorie
- ✅ 30 prodotti demo
- ✅ Indirizzi per utente customer

## 🔒 Sicurezza

⚠️ **IMPORTANTE**: 
- La password del database è visibile in questo file solo per riferimento
- Considera di cambiare la password in produzione
- Limita l'accesso IP se possibile (solo IP Vercel)

## 🧪 Test Connessione

Per testare la connessione:
```bash
export DATABASE_URL="postgresql://motorplanet_user:MotorPlanet2024!@57.129.4.62:5432/motorplanet?sslmode=require"
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM users;"
```

## 📝 Note

- Il database è ora su PostgreSQL (non più SQLite)
- Lo schema Prisma è stato aggiornato per PostgreSQL
- I dati sono persistenti sulla VPS
- Vercel si connetterà alla VPS per tutte le query database

