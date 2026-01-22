# Configurazione JWT_SECRET

## 🔐 Perché serve JWT_SECRET?

Il `JWT_SECRET` è una chiave segreta utilizzata per firmare e verificare i token JWT. È fondamentale per la sicurezza dell'autenticazione.

**IMPORTANTE**: 
- Deve essere una stringa casuale e sicura (almeno 32 caratteri)
- Non deve mai essere committata nel repository
- Deve essere diversa per sviluppo e produzione

---

## 📝 Configurazione Locale (.env)

### Passo 1: Genera una chiave segreta

Puoi generare una chiave sicura in diversi modi:

#### Opzione A: Usando Node.js (raccomandato)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Opzione B: Usando OpenSSL
```bash
openssl rand -hex 32
```

#### Opzione C: Online
Visita https://randomkeygen.com/ e usa una "CodeIgniter Encryption Keys"

### Passo 2: Crea/modifica il file .env

Nel file `.env` nella root del progetto, aggiungi:

```env
JWT_SECRET=la-tua-chiave-generata-qui
```

**Esempio:**
```env
DATABASE_URL="postgresql://motorplanet_user:MotorPlanet2024!@57.129.4.62:5432/motorplanet?sslmode=require"
JWT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
```

### Passo 3: Verifica che .env sia nel .gitignore

Assicurati che il file `.env` sia presente nel `.gitignore`:

```bash
# Controlla se .env è ignorato
cat .gitignore | grep -E "^\.env$"
```

Se non c'è, aggiungilo:
```bash
echo ".env" >> .gitignore
```

### Passo 4: Riavvia il server di sviluppo

Dopo aver aggiunto `JWT_SECRET`, riavvia il server:

```bash
npm run dev
```

---

## ☁️ Configurazione su Vercel

### Metodo 1: Tramite Dashboard Vercel (Raccomandato)

1. **Accedi a Vercel**
   - Vai su https://vercel.com
   - Accedi al tuo account

2. **Seleziona il progetto**
   - Vai alla dashboard
   - Clicca sul progetto `ecommerce-pezzi-ricambio`

3. **Vai alle Settings**
   - Clicca su "Settings" nel menu del progetto
   - Seleziona "Environment Variables" nel menu laterale

4. **Aggiungi la variabile**
   - Clicca su "Add New"
   - **Key**: `JWT_SECRET`
   - **Value**: Incolla la chiave generata (usa la stessa del locale o generane una nuova per produzione)
   - **Environment**: Seleziona tutti gli ambienti (Production, Preview, Development) oppure solo Production
   - Clicca su "Save"

5. **Redeploy**
   - Dopo aver aggiunto la variabile, Vercel richiederà un nuovo deploy
   - Oppure vai su "Deployments" e clicca sui tre puntini → "Redeploy"

### Metodo 2: Tramite CLI Vercel

1. **Installa Vercel CLI** (se non l'hai già fatto)
   ```bash
   npm i -g vercel
   ```

2. **Login a Vercel**
   ```bash
   vercel login
   ```

3. **Aggiungi la variabile d'ambiente**
   ```bash
   vercel env add JWT_SECRET
   ```
   
   Ti chiederà:
   - Il valore della variabile (incolla la chiave generata)
   - Per quali ambienti (Production, Preview, Development)

4. **Redeploy**
   ```bash
   vercel --prod
   ```

### Metodo 3: Tramite file vercel.json (Non raccomandato per segreti)

⚠️ **NON usare questo metodo per JWT_SECRET** perché i file di configurazione sono committati nel repository.

---

## 🔍 Verifica della Configurazione

### Locale

1. **Verifica che la variabile sia caricata**
   ```bash
   node -e "require('dotenv').config(); console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configurato' : '❌ Mancante')"
   ```

2. **Testa il login**
   - Avvia il server: `npm run dev`
   - Prova a fare login
   - Se funziona, JWT_SECRET è configurato correttamente

### Vercel

1. **Controlla le variabili d'ambiente**
   - Vai su Vercel Dashboard → Settings → Environment Variables
   - Verifica che `JWT_SECRET` sia presente

2. **Controlla i log del deploy**
   - Vai su Deployments → Seleziona l'ultimo deploy → Logs
   - Cerca eventuali errori relativi a JWT_SECRET

3. **Testa in produzione**
   - Prova a fare login sul sito deployato
   - Se funziona, la configurazione è corretta

---

## 🚨 Troubleshooting

### Errore: "JWT_SECRET is not defined"

**Causa**: La variabile d'ambiente non è configurata o non è caricata.

**Soluzione**:
1. Verifica che `.env` esista e contenga `JWT_SECRET`
2. Riavvia il server di sviluppo
3. Su Vercel, verifica che la variabile sia aggiunta e il progetto sia stato redeployato

### Errore: "Invalid token" dopo il deploy

**Causa**: JWT_SECRET diverso tra locale e produzione.

**Soluzione**:
- Assicurati di usare la stessa chiave (o chiavi diverse ma valide)
- Su Vercel, verifica che la variabile sia corretta

### Token non funziona dopo il deploy

**Causa**: Il deploy è stato fatto prima di aggiungere JWT_SECRET.

**Soluzione**:
1. Aggiungi JWT_SECRET su Vercel
2. Fai un nuovo deploy o redeploy

---

## 🔐 Best Practices

1. **Chiavi diverse per ambiente**
   - Sviluppo: una chiave
   - Produzione: un'altra chiave (più sicura)

2. **Rotazione periodica**
   - Cambia JWT_SECRET periodicamente (es. ogni 6 mesi)
   - Quando cambi, tutti gli utenti dovranno rifare login

3. **Lunghezza minima**
   - Almeno 32 caratteri (64 caratteri esadecimali)
   - Più lunga = più sicura

4. **Non condividere mai**
   - Non committare JWT_SECRET nel codice
   - Non condividerla in chat o email
   - Usa un password manager per tenerla traccia

---

## 📋 Checklist

- [ ] Chiave JWT_SECRET generata (almeno 32 caratteri)
- [ ] File `.env` creato con JWT_SECRET
- [ ] `.env` aggiunto a `.gitignore`
- [ ] Server locale testato e funzionante
- [ ] JWT_SECRET aggiunto su Vercel (tutti gli ambienti)
- [ ] Deploy su Vercel completato
- [ ] Login testato in produzione

---

## 💡 Esempio Completo

### File .env (locale)
```env
DATABASE_URL="postgresql://motorplanet_user:MotorPlanet2024!@57.129.4.62:5432/motorplanet?sslmode=require"
JWT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
```

### Vercel Dashboard
```
Environment Variables:
┌─────────────┬──────────────────────────────────────────────────────────────┐
│ Key         │ Value                                                          │
├─────────────┼──────────────────────────────────────────────────────────────┤
│ DATABASE_URL│ postgresql://...                                              │
│ JWT_SECRET  │ a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2 │
└─────────────┴──────────────────────────────────────────────────────────────┘
```

---

## 🆘 Supporto

Se hai problemi:
1. Verifica i log del server (locale o Vercel)
2. Controlla che la variabile sia correttamente configurata
3. Assicurati di aver fatto redeploy dopo aver aggiunto la variabile

