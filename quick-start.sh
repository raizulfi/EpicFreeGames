#!/bin/bash

# Quick Start Guide for Epic Games Free Games Claimer
# This script helps you get started quickly

set -e

echo "====================================="
echo "Epic Games Claimer - Quick Start"
echo "====================================="
echo ""

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18 or higher"
    echo "   Download: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js $(node --version) found"

# Check npm installation
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi

echo "✓ npm $(npm --version) found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "⚙️  Setting up configuration..."
    cp .env.example .env
    echo "✓ Created .env file"
    echo ""
    echo "⚠️  Please edit .env file and add your credentials:"
    echo "   EPIC_EMAIL=your_email@example.com"
    echo "   EPIC_PASSWORD=your_password"
    echo ""
    echo "   Then run: npm run claim"
else
    echo ""
    echo "✓ .env file already exists"
fi

echo ""
echo "====================================="
echo "Setup Complete! ✓"
echo "====================================="
echo ""
echo "Next steps:"
echo "1. Edit .env with your Epic Games credentials"
echo "2. Run: npm run claim"
echo "3. Check logs in: ./logs/"
echo ""
echo "For more info, see README.md"
