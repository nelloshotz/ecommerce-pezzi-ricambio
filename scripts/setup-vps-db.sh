#!/bin/bash
# Script per setup database PostgreSQL sulla VPS

echo "🚀 Setup Database PostgreSQL sulla VPS"
echo "======================================"

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variabili
DB_NAME="motorplanet"
DB_USER="motorplanet_user"
DB_PASSWORD=""

# Chiedi password
read -sp "Inserisci password per utente database: " DB_PASSWORD
echo ""

echo -e "${YELLOW}📦 Installazione PostgreSQL...${NC}"
sudo apt update
sudo apt install postgresql postgresql-contrib -y

echo -e "${YELLOW}🔧 Configurazione database...${NC}"
sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF

echo -e "${YELLOW}🔐 Configurazione accesso remoto...${NC}"
# Backup configurazione originale
sudo cp /etc/postgresql/*/main/postgresql.conf /etc/postgresql/*/main/postgresql.conf.backup
sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup

# Abilita listen su tutte le interfacce
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf

# Aggiungi regola pg_hba.conf
echo "host    $DB_NAME    $DB_USER    0.0.0.0/0    md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf

echo -e "${YELLOW}🔥 Riavvio PostgreSQL...${NC}"
sudo systemctl restart postgresql

echo -e "${YELLOW}🛡️  Configurazione firewall...${NC}"
sudo ufw allow 5432/tcp

echo -e "${GREEN}✅ Setup completato!${NC}"
echo ""
echo "📋 Informazioni connessione:"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Host: $(hostname -I | awk '{print $1}')"
echo "   Port: 5432"
echo ""
echo "🔗 URL di connessione:"
echo "   postgresql://$DB_USER:$DB_PASSWORD@$(hostname -I | awk '{print $1}'):5432/$DB_NAME?sslmode=require"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   1. Salva questa URL in un posto sicuro"
echo "   2. Configurala come DATABASE_URL su Vercel"
echo "   3. Considera di usare SSL/TLS per sicurezza"
echo "   4. Limita accesso IP se possibile"

