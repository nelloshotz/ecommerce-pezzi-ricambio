#!/bin/bash

# Script di setup completo VPS per Next.js
# Installa Node.js, PM2, Nginx e configura tutto

set -e

echo "🚀 Setup completo VPS per Next.js E-commerce..."

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verifica che siamo su Ubuntu/Debian
if [ ! -f /etc/os-release ]; then
    echo -e "${RED}❌ Sistema operativo non supportato${NC}"
    exit 1
fi

# Aggiorna sistema
echo -e "${GREEN}📦 Aggiornamento sistema...${NC}"
sudo apt update
sudo apt upgrade -y

# 1. Installa Node.js 18+
echo -e "${GREEN}📦 Installazione Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VERSION=$(node -v)
    echo -e "${YELLOW}⚠️  Node.js già installato: $NODE_VERSION${NC}"
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"

# 2. Installa PM2
echo -e "${GREEN}📦 Installazione PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
else
    echo -e "${YELLOW}⚠️  PM2 già installato${NC}"
fi

# Configura PM2 per avvio automatico
echo -e "${GREEN}⚙️  Configurazione PM2 per avvio automatico...${NC}"
pm2 startup | grep -v "PM2" | bash || echo -e "${YELLOW}⚠️  PM2 startup già configurato${NC}"

# 3. Installa Nginx
echo -e "${GREEN}📦 Installazione Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo apt install nginx -y
    sudo systemctl start nginx
    sudo systemctl enable nginx
else
    echo -e "${YELLOW}⚠️  Nginx già installato${NC}"
fi

# 4. Installa Certbot (per SSL)
echo -e "${GREEN}📦 Installazione Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    sudo apt install certbot python3-certbot-nginx -y
else
    echo -e "${YELLOW}⚠️  Certbot già installato${NC}"
fi

# 5. Installa Git (se non presente)
echo -e "${GREEN}📦 Verifica Git...${NC}"
if ! command -v git &> /dev/null; then
    sudo apt install git -y
else
    echo -e "${YELLOW}⚠️  Git già installato${NC}"
fi

# 6. Configura Firewall
echo -e "${GREEN}🔥 Configurazione Firewall (UFW)...${NC}"
if command -v ufw &> /dev/null; then
    sudo ufw --force enable
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # HTTP
    sudo ufw allow 443/tcp   # HTTPS
    echo -e "${GREEN}✅ Firewall configurato${NC}"
else
    echo -e "${YELLOW}⚠️  UFW non trovato, installazione...${NC}"
    sudo apt install ufw -y
    sudo ufw --force enable
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
fi

# 7. Crea directory progetto
PROJECT_DIR="/home/ubuntu/ecommerce-pezzi-ricambio"
echo -e "${GREEN}📁 Verifica directory progetto...${NC}"
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️  Directory non trovata. Clona il repository:${NC}"
    echo "   cd /home/ubuntu"
    echo "   git clone https://github.com/nelloshotz/ecommerce-pezzi-ricambio.git"
else
    echo -e "${GREEN}✅ Directory progetto trovata: $PROJECT_DIR${NC}"
fi

# 8. Crea template configurazione Nginx
NGINX_CONFIG="/etc/nginx/sites-available/ecommerce"
echo -e "${GREEN}📝 Creazione template configurazione Nginx...${NC}"

if [ ! -f "$NGINX_CONFIG" ]; then
    sudo tee "$NGINX_CONFIG" > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;  # Sostituisci con il tuo dominio

    # Logs
    access_log /var/log/nginx/ecommerce-access.log;
    error_log /var/log/nginx/ecommerce-error.log;

    # Reverse proxy a Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout per operazioni lunghe
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF
    echo -e "${GREEN}✅ Template Nginx creato${NC}"
    echo -e "${YELLOW}⚠️  Modifica $NGINX_CONFIG con il tuo dominio prima di abilitarlo${NC}"
else
    echo -e "${YELLOW}⚠️  Configurazione Nginx già presente${NC}"
fi

# Riepilogo
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup VPS completato!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "📋 Prossimi passi:"
echo ""
echo "1. Clona il repository (se non l'hai già fatto):"
echo "   cd /home/ubuntu"
echo "   git clone https://github.com/nelloshotz/ecommerce-pezzi-ricambio.git"
echo ""
echo "2. Configura .env:"
echo "   cd ecommerce-pezzi-ricambio"
echo "   nano .env"
echo "   # Aggiungi DATABASE_URL e altre variabili"
echo ""
echo "3. Esegui deploy:"
echo "   ./scripts/deploy-vps.sh"
echo ""
echo "4. Configura Nginx:"
echo "   sudo nano /etc/nginx/sites-available/ecommerce"
echo "   # Sostituisci 'server_name _;' con il tuo dominio"
echo "   sudo ln -s /etc/nginx/sites-available/ecommerce /etc/nginx/sites-enabled/"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""
echo "5. Configura SSL (opzionale ma consigliato):"
echo "   sudo certbot --nginx -d il-tuo-dominio.com"
echo ""
echo -e "${GREEN}✅ Tutto pronto!${NC}"



