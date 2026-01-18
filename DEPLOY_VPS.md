# 🚀 Deploy su VPS - Guida Completa

## ✅ È possibile deployare su VPS? **SÌ!**

Deployare direttamente sulla tua VPS è **assolutamente possibile** e ha diversi vantaggi rispetto a Vercel.

---

## 📊 Confronto: VPS vs Vercel

### ✅ **Vantaggi VPS**
- **Controllo totale**: Hai accesso completo al server
- **Database locale**: Il database è sulla stessa macchina (latency minima)
- **Costi**: Spesso più economico per traffico elevato
- **Nessun limite**: Nessun limite di build time, funzioni serverless, ecc.
- **Customizzazione**: Puoi installare qualsiasi software necessario

### ❌ **Svantaggi VPS**
- **Manutenzione**: Devi gestire aggiornamenti, backup, sicurezza
- **Scalabilità**: Devi gestire manualmente il scaling
- **SSL/HTTPS**: Devi configurare e rinnovare certificati SSL
- **Monitoring**: Devi impostare il monitoring da solo

### ✅ **Vantaggi Vercel**
- **Zero configurazione**: Deploy automatico da GitHub
- **SSL automatico**: Certificati SSL gestiti automaticamente
- **CDN globale**: Contenuti serviti da edge locations
- **Auto-scaling**: Gestione automatica del traffico
- **Monitoring integrato**: Analytics e logs inclusi

### ❌ **Svantaggi Vercel**
- **Costi**: Può diventare costoso con traffico elevato
- **Limiti**: Build time, funzioni serverless, bandwidth limitati
- **Database esterno**: Richiede database remoto (latency)

---

## 🏗️ Architettura Deploy VPS

```
Internet
   ↓
Nginx (Porta 80/443) ← Reverse Proxy + SSL
   ↓
Next.js App (Porta 3000) ← PM2 Process Manager
   ↓
PostgreSQL (Porta 5432) ← Database
```

---

## 📋 Prerequisiti VPS

1. **Node.js 18+** (per Next.js)
2. **PM2** (process manager per Node.js)
3. **Nginx** (reverse proxy + SSL)
4. **PostgreSQL** (già installato ✅)
5. **Git** (per clonare il repository)
6. **Certbot** (per SSL/HTTPS)

---

## 🛠️ Setup Completo VPS

### 1. **Installa Node.js 18+**

```bash
# Su Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verifica installazione
node --version  # Dovrebbe essere v18+
npm --version
```

### 2. **Installa PM2 (Process Manager)**

```bash
sudo npm install -g pm2

# PM2 gestisce automaticamente:
# - Riavvio automatico dopo crash
# - Log rotation
# - Monitoring
# - Cluster mode (opzionale)
```

### 3. **Installa Nginx**

```bash
sudo apt update
sudo apt install nginx -y

# Avvia e abilita all'avvio
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. **Installa Certbot (per SSL)**

```bash
sudo apt install certbot python3-certbot-nginx -y
```

---

## 📁 Struttura Directory VPS

```
/home/ubuntu/
├── motorplanet/              # Database (già presente)
└── ecommerce-pezzi-ricambio/ # App Next.js
    ├── .env                  # Variabili d'ambiente
    ├── .next/                # Build Next.js
    ├── node_modules/
    └── ...
```

---

## 🔧 Configurazione

### 1. **Clona Repository sulla VPS**

```bash
cd /home/ubuntu
git clone https://github.com/nelloshotz/ecommerce-pezzi-ricambio.git
cd ecommerce-pezzi-ricambio
```

### 2. **Crea File `.env`**

```bash
nano .env
```

Contenuto:
```env
# Database (già configurato sulla VPS)
DATABASE_URL="postgresql://motorplanet_user:MotorPlanet2024!@localhost:5432/motorplanet?schema=public"

# Next.js
NODE_ENV=production
PORT=3000

# JWT Secret (genera uno casuale)
JWT_SECRET="il-tuo-secret-jwt-molto-sicuro"

# Stripe (se usi Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_SECRET_KEY="sk_..."

# Altri secrets necessari
```

### 3. **Installa Dipendenze e Builda**

```bash
npm install
npm run build
```

### 4. **Avvia con PM2**

```bash
# Avvia l'app
pm2 start npm --name "ecommerce" -- start

# Salva configurazione PM2
pm2 save

# Configura PM2 per avviarsi all'avvio del sistema
pm2 startup
# Segui le istruzioni che ti mostra
```

### 5. **Configura Nginx come Reverse Proxy**

Crea file di configurazione Nginx:

```bash
sudo nano /etc/nginx/sites-available/ecommerce
```

Contenuto:
```nginx
server {
    listen 80;
    server_name il-tuo-dominio.com www.il-tuo-dominio.com;

    # Redirect HTTP → HTTPS (dopo aver configurato SSL)
    # return 301 https://$server_name$request_uri;

    # Temporaneo: rimuovi il redirect sopra e usa questo finché non configuri SSL
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
    }
}
```

Abilita il sito:
```bash
sudo ln -s /etc/nginx/sites-available/ecommerce /etc/nginx/sites-enabled/
sudo nginx -t  # Test configurazione
sudo systemctl reload nginx
```

### 6. **Configura SSL/HTTPS (Opzionale ma Consigliato)**

```bash
# Assicurati che il dominio punti al tuo IP VPS
sudo certbot --nginx -d il-tuo-dominio.com -d www.il-tuo-dominio.com

# Certbot modificherà automaticamente la configurazione Nginx
# Il certificato si rinnoverà automaticamente
```

---

## 🔄 Deploy Automatico (GitHub Actions o Script)

### Opzione 1: Script di Deploy Manuale

Crea `deploy.sh` sulla VPS:

```bash
#!/bin/bash
cd /home/ubuntu/ecommerce-pezzi-ricambio
git pull origin main
npm install
npm run build
pm2 restart ecommerce
echo "Deploy completato!"
```

Rendi eseguibile:
```bash
chmod +x deploy.sh
```

### Opzione 2: GitHub Actions (Deploy Automatico)

Crea `.github/workflows/deploy-vps.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/ubuntu/ecommerce-pezzi-ricambio
            git pull origin main
            npm install
            npm run build
            pm2 restart ecommerce
```

Configura i secrets su GitHub:
- `VPS_HOST`: `57.129.4.62`
- `VPS_USER`: `ubuntu`
- `VPS_SSH_KEY`: Contenuto della chiave SSH privata

---

## 📊 Monitoring e Logs

### PM2 Monitoring

```bash
# Dashboard monitoring
pm2 monit

# Logs in tempo reale
pm2 logs ecommerce

# Status
pm2 status

# Informazioni dettagliate
pm2 show ecommerce
```

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🔄 Aggiornamenti

### Deploy Nuova Versione

```bash
# 1. Pull ultime modifiche
cd /home/ubuntu/ecommerce-pezzi-ricambio
git pull origin main

# 2. Installa nuove dipendenze
npm install

# 3. Builda
npm run build

# 4. Riavvia app
pm2 restart ecommerce
```

### Aggiornare Dipendenze

```bash
npm update
npm run build
pm2 restart ecommerce
```

---

## 🛡️ Sicurezza

### 1. **Firewall (UFW)**

```bash
# Abilita firewall
sudo ufw enable

# Permetti SSH
sudo ufw allow 22/tcp

# Permetti HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Blocca tutto il resto
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

### 2. **Fail2Ban (Protezione da Brute Force)**

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. **Backup Database**

```bash
# Crea script backup
nano /home/ubuntu/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR
pg_dump -U motorplanet_user motorplanet > $BACKUP_DIR/motorplanet_$DATE.sql
# Mantieni solo ultimi 7 giorni
find $BACKUP_DIR -name "motorplanet_*.sql" -mtime +7 -delete
```

```bash
chmod +x /home/ubuntu/backup-db.sh

# Aggiungi a crontab (backup giornaliero alle 2:00)
crontab -e
# Aggiungi: 0 2 * * * /home/ubuntu/backup-db.sh
```

---

## 🚨 Troubleshooting

### App non si avvia

```bash
# Controlla logs PM2
pm2 logs ecommerce --lines 50

# Controlla se porta 3000 è in uso
sudo lsof -i :3000

# Riavvia PM2
pm2 restart ecommerce
```

### Nginx non funziona

```bash
# Test configurazione
sudo nginx -t

# Riavvia Nginx
sudo systemctl restart nginx

# Controlla logs
sudo tail -f /var/log/nginx/error.log
```

### Database non si connette

```bash
# Verifica che PostgreSQL sia attivo
sudo systemctl status postgresql

# Test connessione
psql -U motorplanet_user -d motorplanet -h localhost
```

---

## ✅ Checklist Deploy

- [ ] Node.js 18+ installato
- [ ] PM2 installato e configurato
- [ ] Nginx installato e configurato
- [ ] Repository clonato sulla VPS
- [ ] File `.env` creato con `DATABASE_URL`
- [ ] `npm install` eseguito
- [ ] `npm run build` completato senza errori
- [ ] App avviata con PM2
- [ ] Nginx configurato come reverse proxy
- [ ] Firewall configurato
- [ ] SSL/HTTPS configurato (opzionale)
- [ ] Backup database configurato
- [ ] Monitoring attivo

---

## 🎯 Conclusione

**Deploy su VPS è perfettamente fattibile!** Hai già il database configurato, quindi devi solo:
1. Installare Node.js, PM2, Nginx
2. Clonare il repository
3. Configurare `.env`
4. Buildare e avviare con PM2
5. Configurare Nginx come reverse proxy

Vuoi che crei gli script automatici per fare tutto questo?


