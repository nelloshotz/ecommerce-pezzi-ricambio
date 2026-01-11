# 📋 Elenco Cose Mancanti da Implementare - MotorPlanet

Analisi completa del progetto e funzionalità ancora da implementare necessarie per completare l'e-commerce.

---

## 🔴 CRITICO - Funzionalità Necessarie

### 1. API Route per Prodotti (Pubblico)
**Stato:** ❌ MANCANTE - `lib/products.ts` usa ancora dati mock
- [ ] `/api/products` - GET (lista prodotti con filtri e ricerca)
- [ ] `/api/products/[id]` - GET (dettaglio prodotto)
- [ ] `/api/products/search` - GET (ricerca avanzata)
- [ ] `/api/products/categories` - GET (lista categorie dal DB)
- [ ] `/api/products/by-category/[categoryId]` - GET (prodotti per categoria)

**Priorità:** 🔴 ALTA - Il catalogo non funziona correttamente senza queste API

---

### 2. Pagina Gestione Utenti Admin
**Stato:** ❌ MANCANTE - Link presente nel menu ma pagina non esiste
- [ ] `/app/admin/utenti/page.tsx` - Lista utenti con filtri e ricerca
- [ ] `/app/admin/utenti/[id]/page.tsx` - Dettaglio/Modifica utente
- [ ] Funzionalità: visualizza, modifica, elimina utenti, cambio ruolo
- [ ] Statistiche per utente (ordini, spesa totale)

**Priorità:** 🔴 ALTA - Richiesto specificamente dall'utente

---

### 3. API Route per Gestione Utenti Admin
**Stato:** ❌ MANCANTE
- [ ] `/api/admin/users` - GET (lista utenti), POST (crea utente admin)
- [ ] `/api/admin/users/[id]` - GET, PUT, DELETE (gestione utente)
- [ ] `/api/admin/users/[id]/orders` - GET (ordini utente)
- [ ] `/api/admin/users/[id]/stats` - GET (statistiche utente)

**Priorità:** 🔴 ALTA - Necessario per gestione utenti

---

### 4. Gestione Categorie Admin (CRUD Completo)
**Stato:** ⚠️ PARZIALE - Esiste `/api/categories` ma manca gestione admin
- [ ] `/app/admin/categorie/page.tsx` - Lista categorie admin
- [ ] `/app/admin/categorie/nuovo/page.tsx` - Creazione categoria
- [ ] `/app/admin/categorie/[id]/page.tsx` - Modifica categoria
- [ ] `/api/admin/categories` - POST (crea categoria)
- [ ] `/api/admin/categories/[id]` - PUT, DELETE (modifica/elimina)
- [ ] Funzionalità: ordine visualizzazione, attivazione/disattivazione, immagine categoria

**Priorità:** 🟡 MEDIA-ALTA - Utile per organizzazione prodotti

---

### 5. Modifica Profilo Utente (Campi Modificabili)
**Stato:** ⚠️ PARZIALE - Esiste pagina profilo ma manca modifica dati account
- [ ] Modifica nome, email, telefono
- [ ] Cambio password (con verifica password corrente)
- [ ] `/api/users/[userId]/profile` - PUT (aggiorna profilo)
- [ ] `/api/users/[userId]/password` - PUT (cambio password)
- [ ] Validazione email univoca al cambio
- [ ] Conferma cambio email con link verifica

**Priorità:** 🟡 MEDIA - Migliora UX utente

---

### 6. Reset Password / Recupero Password
**Stato:** ❌ MANCANTE
- [ ] `/app/reset-password/page.tsx` - Richiesta reset password
- [ ] `/app/reset-password/[token]/page.tsx` - Form reset password
- [ ] `/api/auth/forgot-password` - POST (invia email reset)
- [ ] `/api/auth/reset-password` - POST (reset con token)
- [ ] Tabella `password_reset_tokens` o campo `resetToken` in User
- [ ] Sistema email per invio link reset

**Priorità:** 🟡 MEDIA - Standard per e-commerce

---

### 7. Pagina Checkout/Pagamento Dedicata
**Stato:** ⚠️ PARZIALE - Checkout gestito in `/carrello` ma manca pagina dedicata
- [ ] `/app/checkout/page.tsx` - Pagina checkout dedicata
- [ ] Riepilogo ordine, indirizzi, metodo pagamento
- [ ] Form dati carta (simulato per ora)
- [ ] Integrazione gateway pagamento (Stripe, PayPal, etc.)
- [ ] `/api/payments/create-intent` - POST (crea intent pagamento)
- [ ] `/api/payments/confirm` - POST (conferma pagamento)

**Priorità:** 🔴 ALTA - Necessario per completare flusso ordine

---

### 8. Sistema Pagamento (Simulato o Reale)
**Stato:** ❌ MANCANTE
- [ ] Integrazione gateway pagamento (Stripe consigliato)
- [ ] Sistema pagamento simulato per test
- [ ] Gestione webhook pagamenti
- [ ] Aggiornamento `paymentStatus` in base a risultato pagamento
- [ ] Gestione rimborsi (refund)

**Priorità:** 🔴 ALTA - Essenziale per e-commerce funzionante

---

### 9. Sistema Notifiche Email
**Stato:** ❌ MANCANTE
- [ ] Email conferma registrazione
- [ ] Email conferma ordine
- [ ] Email tracking spedizione (aggiornamento stato)
- [ ] Email notifica admin nuovo ordine
- [ ] Email notifica utente risposta messaggio ordine
- [ ] Email reset password
- [ ] Integrazione servizio email (Gmail)
- [ ] Template email HTML

**Priorità:** 🟡 MEDIA - Migliora comunicazione con clienti

---

## 🟡 IMPORTANTE - Miglioramenti Funzionalità

### 10. Download Scheda Tecnica Prodotto
**Stato:** ✅ IMPLEMENTATO ma da testare
- [ ] Verificare funzionamento download PDF scheda tecnica
- [ ] Validazione file upload (solo PDF, dimensione max)
- [ ] Gestione errori download

**Priorità:** 🟢 BASSA - Già implementato, solo testing necessario

---

### 11. Statistiche Avanzate Admin Dashboard
**Stato:** ⚠️ PARZIALE - Dashboard base esiste, mancano grafici
- [ ] Grafici vendite (giornaliero, settimanale, mensile)
- [ ] Top prodotti venduti
- [ ] Statistiche ordini per stato
- [ ] Fatturato per periodo
- [ ] Statistiche utenti (nuovi registrati)
- [ ] Export report CSV/PDF

**Priorità:** 🟢 BASSA - Miglioramento, non essenziale

---

### 12. Export/Import Prodotti (Admin)
**Stato:** ❌ MANCANTE
- [ ] Export prodotti in CSV/Excel
- [ ] Import prodotti da CSV/Excel
- [ ] Template CSV per import
- [ ] Validazione dati import
- [ ] `/api/admin/products/export` - GET
- [ ] `/api/admin/products/import` - POST

**Priorità:** 🟢 BASSA - Utile per gestione massiva

---

### 13. Ricerca Avanzata Prodotti
**Stato:** ⚠️ PARZIALE - Ricerca base presente, manca avanzata
- [ ] Filtri multipli (marca, prezzo, disponibilità)
- [ ] Ordinamento (prezzo, nome, data aggiunta)
- [ ] Ricerca per SKU
- [ ] Ricerca per codice produttore (partNumber)
- [ ] Suggerimenti ricerca (autocomplete)
- [ ] URL query params per filtri (condivisione link filtrati)

**Priorità:** 🟡 MEDIA - Migliora esperienza utente

---

### 14. Gestione Immagini Prodotti Migliorata
**Stato:** ⚠️ PARZIALE - Upload presente, manca ottimizzazione
- [ ] Resize automatico immagini
- [ ] Generazione thumbnail
- [ ] Ottimizzazione formato (WebP)
- [ ] Upload immagini multiple per prodotto
- [ ] Galleria immagini prodotto
- [ ] Eliminazione immagini non utilizzate

**Priorità:** 🟢 BASSA - Ottimizzazione performance

---

### 15. Gestione Stock Avanzata
**Stato:** ⚠️ PARZIALE - Base presente, manca avanzata
- [ ] Alert scorte basse (threshold configurabile)
- [ ] Notifica admin prodotti in esaurimento
- [ ] Storico movimenti stock dettagliato
- [ ] Previsione esaurimento (in base a vendite medie)
- [ ] Import aggiornamento stock da CSV

**Priorità:** 🟡 MEDIA - Utile per gestione inventario

---

## 🟢 OPZIONALE - Miglioramenti UI/UX

### 16. Validazioni Client-Side Complete
**Stato:** ⚠️ PARZIALE - Validazioni base presenti
- [ ] Validazione form con libreria (React Hook Form + Zod)
- [ ] Messaggi errore più chiari
- [ ] Validazione real-time
- [ ] Validazione email formato
- [ ] Validazione telefono formato italiano
- [ ] Validazione CAP formato italiano

**Priorità:** 🟢 BASSA - Migliora UX ma non critico

---

### 17. Gestione Errori Globale
**Stato:** ⚠️ PARZIALE - Gestione errori base presente
- [ ] Error boundary React
- [ ] Pagina 404 personalizzata
- [ ] Pagina 500 personalizzata
- [ ] Logging errori lato server
- [ ] Notifiche errore user-friendly
- [ ] Retry automatico per errori network

**Priorità:** 🟡 MEDIA - Migliora stabilità

---

### 18. Loading States Migliorati
**Stato:** ⚠️ PARZIALE - Loading base presente
- [ ] Skeleton loaders invece di spinner
- [ ] Loading progress bar per operazioni lunghe
- [ ] Optimistic updates per azioni rapide
- [ ] Loading states consistenti in tutta app

**Priorità:** 🟢 BASSA - Migliora percezione performance

---

### 19. Responsive Design Completo
**Stato:** ⚠️ PARZIALE - Tailwind presente ma da verificare
- [ ] Test responsive su tutti dispositivi
- [ ] Menu mobile migliorato
- [ ] Tabelle responsive (scroll orizzontale o card)
- [ ] Form responsive ottimizzati
- [ ] Immagini responsive (Next Image già presente)

**Priorità:** 🟡 MEDIA - Essenziale per mobile

---

### 20. SEO e Metadati
**Stato:** ⚠️ PARZIALE - Metadata base presente
- [ ] Metadata dinamici per ogni prodotto
- [ ] Open Graph tags
- [ ] Twitter Card tags
- [ ] Sitemap.xml generata automaticamente
- [ ] robots.txt
- [ ] Structured data (JSON-LD) per prodotti

**Priorità:** 🟡 MEDIA - Importante per visibilità

---

### 21. Accessibilità (a11y)
**Stato:** ❌ DA VERIFICARE
- [ ] Test accessibilità (screen reader)
- [ ] Contrasti colori WCAG
- [ ] Focus visible su tutti elementi interattivi
- [ ] ARIA labels dove necessario
- [ ] Keyboard navigation completa

**Priorità:** 🟢 BASSA - Migliora inclusività

---

### 22. Internazionalizzazione (i18n)
**Stato:** ❌ MANCANTE (opzionale)
- [ ] Supporto lingue multiple
- [ ] Traduzione interfaccia
- [ ] Formato date/numeri localizzato
- [ ] Valute multiple

**Priorità:** 🟢 BASSA - Solo se necessario

---

### 23. Wishlist/Favoriti Utente
**Stato:** ❌ MANCANTE (opzionale)
- [ ] Tabella `wishlist` o campo in User
- [ ] Aggiungi/rimuovi da wishlist
- [ ] Pagina wishlist utente
- [ ] Notifica quando prodotto wishlist torna disponibile

**Priorità:** 🟢 BASSA - Feature opzionale

---

### 24. Sistema Recensioni Migliorato
**Stato:** ✅ IMPLEMENTATO ma da migliorare
- [ ] Visualizzazione recensioni su pagina prodotto
- [ ] Filtri recensioni (stelle, recenti)
- [ ] Foto recensioni utente
- [ ] Moderazione recensioni admin
- [ ] Statistiche recensioni per prodotto

**Priorità:** 🟢 BASSA - Già funzionante base

---

### 25. Sistema Messaggistica Migliorato
**Stato:** ✅ IMPLEMENTATO ma da migliorare
- [ ] Notifiche real-time (WebSocket o polling)
- [ ] Indicatore messaggi non letti
- [ ] Timestamp messaggi formattati
- [ ] Anteprima allegati immagini
- [ ] Cerca in conversazioni

**Priorità:** 🟢 BASSA - Già funzionante base

---

## 📊 Riepilogo Priorità

### 🔴 CRITICO (Da implementare subito):
1. API Route per Prodotti Pubblico
2. Pagina Gestione Utenti Admin
3. API Route Gestione Utenti Admin
4. Pagina Checkout/Pagamento
5. Sistema Pagamento

### 🟡 IMPORTANTE (Da implementare presto):
6. Gestione Categorie Admin (CRUD)
7. Modifica Profilo Utente
8. Reset Password
9. Sistema Notifiche Email
10. Ricerca Avanzata
11. Gestione Stock Avanzata
12. Responsive Design Completo
13. SEO e Metadati

### 🟢 OPZIONALE (Miglioramenti futuri):
14. Statistiche Avanzate
15. Export/Import Prodotti
16. Validazioni Complete
17. Gestione Errori Globale
18. Loading States Migliorati
19. Accessibilità
20. Altri miglioramenti UI/UX

---

## 📝 Note Implementazione

- **Database:** Prisma schema completo ✅
- **Autenticazione:** Sistema completo ✅
- **Carrello:** Persistente con prenotazioni ✅
- **Ordini:** Sistema completo ✅
- **Recensioni:** Sistema base ✅
- **Messaggistica:** Sistema base ✅
- **Admin Prodotti:** CRUD completo ✅
- **Admin Ordini:** Gestione completa ✅
- **Codice Prodotto (SKU):** Generazione automatica ✅

**Prossimi passi consigliati:**
1. Implementare API prodotti pubbliche (priorità massima)
2. Implementare gestione utenti admin
3. Implementare checkout/pagamento
4. Aggiungere notifiche email
5. Miglioramenti UI/UX

