# ✅ Setup Database VPS Completato!

## 🎉 Cosa è stato fatto

1. ✅ **PostgreSQL installato** sulla VPS `57.129.4.62`
2. ✅ **Database creato**: `motorplanet`
3. ✅ **Utente creato**: `motorplanet_user`
4. ✅ **Accesso remoto configurato** (porta 5432 aperta)
5. ✅ **Schema Prisma pushato** (tutte le tabelle create)
6. ✅ **Dati demo caricati**:
   - 2 utenti (admin + customer)
   - 7 categorie
   - 30 prodotti demo
   - Indirizzi per customer

## 📋 Informazioni Database

**URL di connessione:**
```
postgresql://motorplanet_user:MotorPlanet2024!@57.129.4.62:5432/motorplanet?sslmode=require
```

## 🔧 Prossimo Passo: Configura Vercel

1. Vai su **Vercel Dashboard** → Il tuo progetto
2. **Settings** → **Environment Variables**
3. Aggiungi:
   - **Name**: `DATABASE_URL`
   - **Value**: `postgresql://motorplanet_user:MotorPlanet2024!@57.129.4.62:5432/motorplanet?sslmode=require`
   - **Environment**: Tutte (Production, Preview, Development)
4. **Save**
5. **Redeploy** il progetto

## 👤 Credenziali Demo

### Admin
- Email: `admin@motorplanet.it`
- Password: `Admin123!`

### Utente
- Email: `user@test.it`
- Password: `User123!`

## ✅ Verifica

Dopo il redeploy su Vercel, il sito dovrebbe:
- ✅ Mostrare i 30 prodotti demo
- ✅ Permettere login con le credenziali demo
- ✅ Funzionare completamente con il database VPS

## 🔒 Note Sicurezza

- La password del database è `MotorPlanet2024!`
- Considera di cambiarla in produzione
- Il database è accessibile solo tramite autenticazione PostgreSQL

## 📊 Stato Database

Il database è **attivo e popolato** sulla VPS. Vercel si connetterà automaticamente quando configuri `DATABASE_URL`.

