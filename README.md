# E-commerce Pezzi di Ricambio

Un moderno e-commerce per la vendita di pezzi di ricambio, costruito con Next.js 14, TypeScript, Tailwind CSS e Zustand.

## 🚀 Caratteristiche

- ✅ Catalogo prodotti completo
- ✅ Dettagli prodotto con immagini
- ✅ Carrello della spesa persistente (localStorage)
- ✅ Interfaccia responsive e moderna
- ✅ Gestione stato con Zustand
- ✅ TypeScript per type safety
- ✅ Tailwind CSS per lo styling

## 📋 Prerequisiti

- Node.js 18+ 
- npm, yarn o pnpm

## 🛠️ Installazione

1. Clona o naviga nella directory del progetto:
```bash
cd ecommerce-pezzi-ricambio
```

2. Installa le dipendenze:
```bash
npm install
# oppure
yarn install
# oppure
pnpm install
```

3. Configura il database:
```bash
# Genera il client Prisma
npm run db:generate

# Crea il database e applica le migrazioni
npm run db:push

# (Opzionale) Popola il database con dati di esempio
npm run db:seed
```

4. Avvia il server di sviluppo:
```bash
npm run dev
# oppure
yarn dev
# oppure
pnpm dev
```

5. Apri [http://localhost:3000](http://localhost:3000) nel tuo browser per vedere l'applicazione.

## 📁 Struttura del Progetto

```
ecommerce-pezzi-ricambio/
├── app/                    # Next.js App Router
│   ├── catalogo/          # Pagina catalogo prodotti
│   ├── carrello/          # Pagina carrello
│   ├── prodotto/[id]/     # Pagina dettaglio prodotto
│   ├── layout.tsx         # Layout principale
│   ├── page.tsx           # Homepage
│   └── globals.css        # Stili globali
├── components/            # Componenti React
│   ├── layout/           # Header, Footer
│   ├── product/          # ProductCard, ProductDetails
│   └── cart/             # Componenti carrello
├── lib/                  # Utilità e helpers
│   └── products.ts       # Funzioni per gestire prodotti
├── store/                # Zustand store
│   └── cartStore.ts      # Store per il carrello
├── types/                # Definizioni TypeScript
│   └── index.ts          # Interfacce e tipi
└── public/               # File statici
    └── images/           # Immagini prodotti
```

## 🎯 Funzionalità Implementate

### Pagine
- **Home** (`/`) - Pagina principale con prodotti in evidenza
- **Catalogo** (`/catalogo`) - Lista completa di tutti i prodotti
- **Dettaglio Prodotto** (`/prodotto/[id]`) - Pagina dettaglio singolo prodotto
- **Carrello** (`/carrello`) - Gestione carrello con riepilogo

### Componenti
- `Header` - Header con navigazione e icona carrello
- `Footer` - Footer con informazioni e link utili
- `ProductCard` - Card prodotto per liste e griglie
- `ProductDetails` - Vista dettagliata prodotto singolo

### Store (Zustand)
- `cartStore` - Gestione stato carrello con persistenza localStorage
  - Aggiungi/rimuovi prodotti
  - Aggiorna quantità
  - Calcola totale
  - Persistenza automatica

## 📦 Prossimi Sviluppi

- [ ] Integrazione database (PostgreSQL/MongoDB)
- [ ] Sistema di autenticazione utenti
- [ ] Pagamento (Stripe/PayPal)
- [ ] Sistema di ricerca e filtri avanzati
- [ ] Gestione categorie dinamiche
- [ ] Pagina checkout completa
- [ ] Email di conferma ordine
- [ ] Dashboard admin
- [ ] Recensioni prodotti
- [ ] Sistema wishlist
- [ ] Multi-lingua support

## 🛠️ Tecnologie Utilizzate

- **Next.js 14** - Framework React con App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management leggero
- **React Icons** - Icone
- **Next/Image** - Ottimizzazione immagini
- **Prisma** - ORM per database
- **SQLite** - Database SQL (facilmente migrabile a PostgreSQL)
- **bcryptjs** - Hashing password

## 🗄️ Database

Il progetto utilizza **Prisma ORM** con **SQLite** per lo sviluppo (facilmente migrabile a PostgreSQL per produzione).

### Schema Database

Il database include le seguenti tabelle:

- **users** - Utenti registrati (clienti e admin)
- **addresses** - Indirizzi di spedizione e fatturazione
- **categories** - Categorie prodotti
- **product_types** - Configurazione tipi prodotto (campi dinamici)
- **products** - Prodotti dello store
- **orders** - Ordini effettuati
- **order_items** - Prodotti negli ordini (storico)
- **cart_items** - Carrello utenti (opzionale, può essere localStorage)
- **sales** - Storico vendite per statistiche
- **inventory_movements** - Movimenti stock per tracciabilità
- **sessions** - Sessioni utente
- **audit_logs** - Log attività per audit

### Migrazione a PostgreSQL

Per migrare a PostgreSQL in produzione, modifica `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/motorplanet?schema=public"
```

E aggiorna `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Poi esegui:
```bash
npm run db:push
```

## 📝 Script Disponibili

- `npm run dev` - Avvia server di sviluppo
- `npm run build` - Crea build di produzione
- `npm run start` - Avvia server di produzione
- `npm run lint` - Esegue ESLint
- `npm run db:generate` - Genera Prisma Client
- `npm run db:push` - Crea/aggiorna database schema (senza migrazioni)
- `npm run db:migrate` - Crea e applica migrazioni database
- `npm run db:studio` - Apre Prisma Studio (GUI per database)
- `npm run db:seed` - Popola database con dati di esempio

## 🤝 Contribuire

Senti libero di fare fork del progetto e creare pull requests per miglioramenti!

## 📄 Licenza

Questo progetto è open source e disponibile sotto licenza MIT.

