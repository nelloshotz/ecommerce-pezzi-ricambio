#!/bin/bash
# Script completo per setup database PostgreSQL sulla VPS e caricamento dati

set -e  # Exit on error

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Setup Completo Database VPS per MotorPlanet${NC}"
echo "=================================================="
echo ""

# Variabili
DB_NAME="motorplanet"
DB_USER="motorplanet_user"
VPS_IP="57.129.4.62"
VPS_USER="ubuntu"
VPS_PATH="/home/ubuntu/motorplanet"
SSH_KEY="~/.ssh/robomaestro"

# Chiedi password database
read -sp "Inserisci password per utente database PostgreSQL: " DB_PASSWORD
echo ""
echo ""

# Step 1: Connetti e installa PostgreSQL
echo -e "${YELLOW}📦 Step 1: Installazione PostgreSQL sulla VPS...${NC}"
ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_IP} <<EOF
set -e
cd ${VPS_PATH}

echo "Aggiornamento sistema..."
sudo apt update -qq

echo "Installazione PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

echo "✅ PostgreSQL installato"
EOF

echo -e "${GREEN}✅ Step 1 completato${NC}"
echo ""

# Step 2: Crea database e utente
echo -e "${YELLOW}🔧 Step 2: Creazione database e utente...${NC}"
ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_IP} <<EOF
set -e
sudo -u postgres psql <<PSQL
-- Crea database se non esiste
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Crea utente se non esiste
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
      CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
   ELSE
      ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
   END IF;
END
\$\$;

-- Concedi privilegi
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
PSQL

echo "✅ Database e utente creati"
EOF

echo -e "${GREEN}✅ Step 2 completato${NC}"
echo ""

# Step 3: Configura accesso remoto
echo -e "${YELLOW}🔐 Step 3: Configurazione accesso remoto...${NC}"
ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_IP} <<EOF
set -e

# Backup configurazioni
sudo cp /etc/postgresql/*/main/postgresql.conf /etc/postgresql/*/main/postgresql.conf.backup 2>/dev/null || true
sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup 2>/dev/null || true

# Abilita listen su tutte le interfacce
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf
sudo sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf

# Aggiungi regola pg_hba.conf se non esiste
if ! grep -q "host.*$DB_NAME.*$DB_USER" /etc/postgresql/*/main/pg_hba.conf; then
    echo "host    $DB_NAME    $DB_USER    0.0.0.0/0    md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf
fi

# Riavvia PostgreSQL
sudo systemctl restart postgresql

echo "✅ Accesso remoto configurato"
EOF

echo -e "${GREEN}✅ Step 3 completato${NC}"
echo ""

# Step 4: Configura firewall
echo -e "${YELLOW}🛡️  Step 4: Configurazione firewall...${NC}"
ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_IP} <<EOF
set -e
sudo ufw allow 5432/tcp || true
echo "✅ Firewall configurato"
EOF

echo -e "${GREEN}✅ Step 4 completato${NC}"
echo ""

# Step 5: Ottieni IP VPS
VPS_ACTUAL_IP=$(ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_IP} "hostname -I | awk '{print \$1}'")
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${VPS_ACTUAL_IP}:5432/${DB_NAME}?sslmode=require"

echo -e "${GREEN}✅ Setup VPS completato!${NC}"
echo ""
echo -e "${YELLOW}📋 Informazioni connessione:${NC}"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Host: $VPS_ACTUAL_IP"
echo "   Port: 5432"
echo ""
echo -e "${YELLOW}🔗 URL di connessione:${NC}"
echo "   $DATABASE_URL"
echo ""

# Step 6: Modifica schema Prisma localmente
echo -e "${YELLOW}📝 Step 5: Aggiornamento schema Prisma...${NC}"
cd "$(dirname "$0")/.."

# Backup schema originale
cp prisma/schema.prisma prisma/schema.prisma.backup

# Modifica schema per PostgreSQL
sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
sed -i.bak 's|url      = env("DATABASE_URL")|url      = env("DATABASE_URL")|' prisma/schema.prisma

echo -e "${GREEN}✅ Schema Prisma aggiornato${NC}"
echo ""

# Step 7: Genera Prisma Client e push schema
echo -e "${YELLOW}🔨 Step 6: Generazione Prisma Client e push schema...${NC}"
export DATABASE_URL="$DATABASE_URL"
npx prisma generate
npx prisma db push --skip-generate --accept-data-loss

echo -e "${GREEN}✅ Schema pushato al database${NC}"
echo ""

# Step 8: Seed dati
echo -e "${YELLOW}🌱 Step 7: Caricamento dati demo...${NC}"
export DATABASE_URL="$DATABASE_URL"
npm run db:seed

echo -e "${GREEN}✅ Dati demo caricati${NC}"
echo ""

# Step 9: Verifica connessione
echo -e "${YELLOW}🔍 Step 8: Verifica connessione...${NC}"
npx prisma db execute --stdin <<< "SELECT COUNT(*) as user_count FROM users;" || echo "⚠️  Verifica manuale necessaria"

echo ""
echo -e "${GREEN}🎉 Setup completato con successo!${NC}"
echo ""
echo -e "${YELLOW}📋 Prossimi passi:${NC}"
echo "   1. Configura DATABASE_URL su Vercel:"
echo "      $DATABASE_URL"
echo ""
echo "   2. Il database è pronto e popolato con dati demo"
echo ""
echo "   3. Credenziali demo:"
echo "      Admin: admin@motorplanet.it / Admin123!"
echo "      User: user@test.it / User123!"
echo ""
echo -e "${RED}⚠️  IMPORTANTE:${NC}"
echo "   - Salva questa URL in un posto sicuro"
echo "   - Non committare la password nel repository"
echo "   - Considera di limitare l'accesso IP su Vercel"

