#!/bin/bash

# Script di deploy completo per VPS
# Esegui questo script sulla VPS dopo aver configurato Node.js, PM2, Nginx

set -e  # Exit on error

echo "🚀 Inizio deploy su VPS..."

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directory progetto
PROJECT_DIR="/home/ubuntu/ecommerce-pezzi-ricambio"
APP_NAME="ecommerce"

# Verifica che siamo nella directory corretta
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Directory progetto non trovata: $PROJECT_DIR${NC}"
    echo "Esegui prima: git clone https://github.com/nelloshotz/ecommerce-pezzi-ricambio.git $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# Verifica Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js non trovato. Installa Node.js 18+ prima.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js trovato: $NODE_VERSION${NC}"

# Verifica PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 non trovato. Installazione...${NC}"
    sudo npm install -g pm2
fi

echo -e "${GREEN}✅ PM2 trovato${NC}"

# Verifica file .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  File .env non trovato. Creazione template...${NC}"
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://motorplanet_user:MotorPlanet2024!@localhost:5432/motorplanet?schema=public"

# Next.js
NODE_ENV=production
PORT=3000

# JWT Secret (CAMBIALO!)
JWT_SECRET="$(openssl rand -base64 32)"

# Stripe (se necessario)
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."
# STRIPE_SECRET_KEY="sk_..."
EOF
    echo -e "${YELLOW}⚠️  Modifica .env con i valori corretti prima di continuare!${NC}"
    read -p "Premi Enter dopo aver modificato .env..."
fi

# Pull ultime modifiche
echo -e "${GREEN}📥 Pull ultime modifiche da Git...${NC}"
git pull origin main || echo -e "${YELLOW}⚠️  Git pull fallito (potrebbe essere normale se non hai fatto commit)${NC}"

# Installa dipendenze
echo -e "${GREEN}📦 Installazione dipendenze...${NC}"
npm install

# Genera Prisma Client
echo -e "${GREEN}🔧 Generazione Prisma Client...${NC}"
npm run db:generate

# Build applicazione
echo -e "${GREEN}🏗️  Build applicazione Next.js...${NC}"
npm run build

# Verifica che la build sia riuscita
if [ ! -d ".next" ]; then
    echo -e "${RED}❌ Build fallita: directory .next non trovata${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completata con successo${NC}"

# Gestione PM2
if pm2 list | grep -q "$APP_NAME"; then
    echo -e "${GREEN}🔄 Riavvio applicazione PM2...${NC}"
    pm2 restart "$APP_NAME"
else
    echo -e "${GREEN}▶️  Avvio applicazione con PM2...${NC}"
    pm2 start npm --name "$APP_NAME" -- start
    pm2 save
fi

# Mostra status
echo -e "${GREEN}📊 Status applicazione:${NC}"
pm2 status "$APP_NAME"

echo -e "${GREEN}✅ Deploy completato con successo!${NC}"
echo -e "${YELLOW}📝 Logs: pm2 logs $APP_NAME${NC}"
echo -e "${YELLOW}📊 Monitoring: pm2 monit${NC}"



