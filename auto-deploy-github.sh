#!/bin/bash

# Script automatico per deploy completo su GitHub
# E-commerce MotorPlanet

REPO_NAME="ecommerce-pezzi-ricambio"
GITHUB_USER="nelloshotz"

echo "🚀 Deploy automatico su GitHub"
echo "================================"
echo ""

# Verifica che siamo nella directory corretta
if [ ! -d ".git" ]; then
    echo "❌ Directory Git non trovata"
    exit 1
fi

# Verifica GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI non trovato. Installazione..."
    if command -v brew &> /dev/null; then
        brew install gh
    else
        echo "❌ Homebrew non trovato. Installa GitHub CLI manualmente:"
        echo "   https://cli.github.com/"
        exit 1
    fi
fi

# Verifica autenticazione GitHub
echo "🔐 Verifica autenticazione GitHub..."
if ! gh auth status &> /dev/null; then
    echo "⚠️  Autenticazione GitHub richiesta"
    echo "   Apri il browser per autenticarti..."
    gh auth login --web
fi

# Crea repository su GitHub
echo ""
echo "📦 Creazione repository su GitHub..."
if gh repo view "$GITHUB_USER/$REPO_NAME" &> /dev/null; then
    echo "⚠️  Repository già esistente: $GITHUB_USER/$REPO_NAME"
    read -p "Vuoi usare questo repository? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Operazione annullata"
        exit 1
    fi
else
    echo "✨ Creazione nuovo repository: $REPO_NAME"
    gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Repository creato e codice caricato con successo!"
        echo ""
        echo "🔗 Repository: https://github.com/$GITHUB_USER/$REPO_NAME"
        exit 0
    else
        echo "❌ Errore nella creazione del repository"
        exit 1
    fi
fi

# Se il repository esiste già, configura il remote e fai push
if ! git remote get-url origin &> /dev/null; then
    echo "🔗 Configurazione remote..."
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
fi

# Rinomina branch in main se necessario
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "🔄 Rinomina branch in 'main'..."
    git branch -M main
fi

# Push del codice
echo ""
echo "📤 Upload del codice..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deploy completato con successo!"
    echo ""
    echo "🔗 Repository: https://github.com/$GITHUB_USER/$REPO_NAME"
else
    echo ""
    echo "❌ Errore durante il push"
    exit 1
fi

