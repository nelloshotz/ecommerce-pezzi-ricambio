#!/bin/bash

# Script per deploy automatico su GitHub
# E-commerce MotorPlanet

REPO_NAME="ecommerce-pezzi-ricambio"
GITHUB_USER="nelloshotz"  # Sostituisci con il tuo username GitHub se diverso

echo "🚀 Preparazione deploy su GitHub..."
echo ""

# Verifica che siamo nella directory corretta
if [ ! -d ".git" ]; then
    echo "❌ Directory Git non trovata. Assicurati di essere nella root del progetto."
    exit 1
fi

# Verifica che ci siano commit
if ! git rev-parse --verify HEAD > /dev/null 2>&1; then
    echo "❌ Nessun commit trovato. Esegui prima 'git add .' e 'git commit'"
    exit 1
fi

echo "✅ Repository Git trovato"
echo "✅ Commit trovati"
echo ""

# Verifica se il remote esiste già
if git remote get-url origin > /dev/null 2>&1; then
    echo "⚠️  Remote 'origin' già configurato:"
    git remote get-url origin
    read -p "Vuoi sovrascrivere? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
    else
        echo "❌ Operazione annullata"
        exit 1
    fi
fi

# Chiedi all'utente se ha già creato il repository su GitHub
echo ""
echo "📋 ISTRUZIONI:"
echo "1. Vai su https://github.com/new"
echo "2. Crea un nuovo repository chiamato: $REPO_NAME"
echo "3. NON inizializzare con README, .gitignore o licenza"
echo "4. Clicca 'Create repository'"
echo ""
read -p "Hai già creato il repository su GitHub? (y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "⏸️  Crea prima il repository su GitHub, poi esegui di nuovo questo script."
    echo "   Oppure apri: https://github.com/new"
    exit 0
fi

# Chiedi il nome utente GitHub
read -p "Inserisci il tuo username GitHub [$GITHUB_USER]: " input_user
GITHUB_USER=${input_user:-$GITHUB_USER}

# Aggiungi il remote
echo ""
echo "🔗 Configurazione remote..."
git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git

# Rinomina branch in main se necessario
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "🔄 Rinomina branch da '$current_branch' a 'main'..."
    git branch -M main
fi

# Push del codice
echo ""
echo "📤 Upload del codice su GitHub..."
echo "   (Potrebbe richiedere autenticazione)"
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deploy completato con successo!"
    echo ""
    echo "🔗 Il tuo repository è disponibile su:"
    echo "   https://github.com/$GITHUB_USER/$REPO_NAME"
    echo ""
    echo "📝 Prossimi passi:"
    echo "   1. Vai su https://vercel.com"
    echo "   2. Collega il repository GitHub"
    echo "   3. Deploy automatico!"
else
    echo ""
    echo "❌ Errore durante il push."
    echo ""
    echo "💡 Possibili soluzioni:"
    echo "   - Verifica che il repository esista su GitHub"
    echo "   - Controlla le credenziali GitHub"
    echo "   - Usa un Personal Access Token se necessario"
    echo ""
    echo "   Per creare un token:"
    echo "   https://github.com/settings/tokens"
fi

