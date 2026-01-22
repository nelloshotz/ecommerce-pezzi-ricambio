# Analisi Messaggi Login - Situazione Attuale e Modifiche Necessarie

## 📋 Situazione Attuale

### Messaggi Attuali

**Caso 1: Email non esiste**
- **API Response** (`app/api/auth/login/route.ts` riga 73-78):
  ```json
  {
    "error": "Email o password non corretti"
  }
  ```
- **Frontend** (`app/login/page.tsx`): Mostra solo il messaggio di errore
- **Problema**: ❌ Non mostra tentativi rimanenti

**Caso 2: Password errata**
- **API Response** (`app/api/auth/login/route.ts` riga 105-111):
  ```json
  {
    "error": "Email o password non corretti",
    "remainingAttempts": 2
  }
  ```
- **Frontend** (`app/login/page.tsx`): Mostra solo il messaggio di errore
- **Problema**: ❌ Non mostra i tentativi rimanenti anche se sono nel response

**Caso 3: Account bloccato**
- **API Response** (`app/api/auth/login/route.ts` riga 50-57):
  ```json
  {
    "error": "Troppi tentativi falliti. Account temporaneamente bloccato. Riprova tra X ore.",
    "blocked": true,
    "blockedUntil": "2024-12-19T..."
  }
  ```
- **Frontend**: Mostra correttamente il messaggio di blocco
- **Stato**: ✅ Funziona correttamente

---

## 🎯 Modifiche Necessarie

### 1. API Route (`app/api/auth/login/route.ts`)

#### Modifica 1: Caso Email non esiste (riga 73-78)

**PRIMA:**
```typescript
if (!user) {
  await recordLoginAttempt(email, ipAddress, false)
  return NextResponse.json(
    { error: 'Email o password non corretti' },
    { status: 401 }
  )
}
```

**DOPO:**
```typescript
if (!user) {
  await recordLoginAttempt(email, ipAddress, false)
  
  // Verifica se ora è bloccato dopo questo tentativo
  const newBlockStatus = await isBlocked(email, ipAddress)
  if (newBlockStatus.blocked) {
    const hoursRemaining = Math.ceil(
      (newBlockStatus.blockedUntil!.getTime() - Date.now()) / (1000 * 60 * 60)
    )
    return NextResponse.json(
      {
        error: `Troppi tentativi falliti. Account temporaneamente bloccato. Riprova tra ${hoursRemaining} ora${hoursRemaining > 1 ? 'e' : ''}.`,
        blocked: true,
        blockedUntil: newBlockStatus.blockedUntil?.toISOString(),
      },
      { status: 429 }
    )
  }
  
  // Mostra tentativi rimanenti
  return NextResponse.json(
    {
      error: 'Email o password non corretti',
      remainingAttempts: newBlockStatus.remainingAttempts,
    },
    { status: 401 }
  )
}
```

**Cosa fa:**
- Registra il tentativo fallito
- Verifica se ora è bloccato (dopo questo tentativo)
- Se bloccato → mostra messaggio di blocco
- Se non bloccato → mostra errore + tentativi rimanenti

#### Modifica 2: Messaggio unificato

**Cambiare "Email o password non corretti" in "Username o password errati"**

In entrambi i casi (email non esiste e password errata):
```typescript
error: 'Username o password errati'
```

---

### 2. Frontend (`app/login/page.tsx`)

#### Modifica: Mostrare tentativi rimanenti

**PRIMA (riga 34-36):**
```typescript
if (!response.ok) {
  throw new Error(data.error || 'Email o password non corretti')
}
```

**DOPO:**
```typescript
if (!response.ok) {
  let errorMessage = data.error || 'Username o password errati'
  
  // Se ci sono tentativi rimanenti, aggiungi il messaggio
  if (data.remainingAttempts !== undefined && data.remainingAttempts > 0) {
    errorMessage += `. Ancora ${data.remainingAttempts} tentativo${data.remainingAttempts > 1 ? 'i' : ''} rimanenti, poi l'account verrà bloccato per 24h.`
  }
  
  throw new Error(errorMessage)
}
```

**Risultato:**
- Se `remainingAttempts = 2`: "Username o password errati. Ancora 2 tentativi rimanenti, poi l'account verrà bloccato per 24h."
- Se `remainingAttempts = 1`: "Username o password errati. Ancora 1 tentativo rimanente, poi l'account verrà bloccato per 24h."
- Se `remainingAttempts = 0` o bloccato: Mostra messaggio di blocco

---

## 📝 Riepilogo Modifiche

### File da Modificare:

1. **`app/api/auth/login/route.ts`**
   - Riga 73-78: Aggiungere verifica blocco e `remainingAttempts` quando email non esiste
   - Riga 76, 107: Cambiare "Email o password non corretti" → "Username o password errati"

2. **`app/login/page.tsx`**
   - Riga 34-36: Gestire `remainingAttempts` dal response e costruire messaggio completo

---

## 🔍 Logica Attuale vs Desiderata

### Attuale:
- ❌ Email non esiste → Solo "Email o password non corretti" (senza tentativi)
- ✅ Password errata → "Email o password non corretti" + `remainingAttempts` (ma non mostrato)
- ✅ Bloccato → Messaggio di blocco completo

### Desiderata:
- ✅ Email non esiste → "Username o password errati. Ancora X tentativi rimanenti..."
- ✅ Password errata → "Username o password errati. Ancora X tentativi rimanenti..."
- ✅ Bloccato → Messaggio di blocco completo

---

## 🎨 Esempi Messaggi Finali

### Tentativo 1 fallito (2 rimanenti):
```
Username o password errati. Ancora 2 tentativi rimanenti, poi l'account verrà bloccato per 24h.
```

### Tentativo 2 fallito (1 rimanente):
```
Username o password errati. Ancora 1 tentativo rimanente, poi l'account verrà bloccato per 24h.
```

### Tentativo 3 fallito (bloccato):
```
Troppi tentativi falliti. Account temporaneamente bloccato. Riprova tra 24 ore.
```

---

## ✅ Vantaggi

1. **Sicurezza**: Non rivela se l'email esiste o meno (stesso messaggio)
2. **Trasparenza**: Utente sa quanti tentativi ha ancora
3. **Prevenzione**: Avviso chiaro prima del blocco
4. **Coerenza**: Stesso messaggio in entrambi i casi di errore

