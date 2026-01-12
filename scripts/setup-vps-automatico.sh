#!/bin/bash
# Script automatico per setup VPS (richiede password come parametro)

set -e

VPS_IP="57.129.4.62"
VPS_USER="ubuntu"
VPS_PATH="/home/ubuntu/motorplanet"
SSH_KEY="~/.ssh/robomaestro"
DB_NAME="motorplanet"
DB_USER="motorplanet_user"
DB_PASSWORD="${1:-motorplanet_secure_2024!}"  # Password come parametro o default

echo "🚀 Setup automatico database VPS"
echo "Password database: [${DB_PASSWORD:0:3}***]"
echo ""

# Step 1: Installa PostgreSQL
echo "📦 Installazione PostgreSQL..."
ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_IP} <<EOF
set -e
sudo apt update -qq
sudo apt install -y postgresql postgresql-contrib
EOF

# Step 2: Crea database
echo "🔧 Creazione database..."
ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_IP} <<EOF
set -e
sudo -u postgres psql <<PSQL
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
      CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
   ELSE
      ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
   END IF;
END
\$\$;

GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
PSQL
EOF

# Step 3: Configura accesso remoto
echo "🔐 Configurazione accesso remoto..."
ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_IP} <<EOF
set -e
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf 2>/dev/null || true
sudo sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf 2>/dev/null || true

if ! grep -q "host.*$DB_NAME.*$DB_USER" /etc/postgresql/*/main/pg_hba.conf 2>/dev/null; then
    echo "host    $DB_NAME    $DB_USER    0.0.0.0/0    md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf
fi

sudo systemctl restart postgresql
sudo ufw allow 5432/tcp 2>/dev/null || true
EOF

# Step 4: Ottieni IP e URL
VPS_ACTUAL_IP=$(ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_IP} "hostname -I | awk '{print \$1}'")
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${VPS_ACTUAL_IP}:5432/${DB_NAME}?sslmode=require"

echo "✅ Setup VPS completato!"
echo ""
echo "URL Database: $DATABASE_URL"
echo ""

# Salva URL in file
echo "$DATABASE_URL" > .database_url_vps
echo "URL salvato in .database_url_vps"

