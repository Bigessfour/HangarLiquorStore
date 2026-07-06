#!/bin/bash
#
# Hangar Liquor Store - Cross-platform Development Setup
# Run this after cloning to get a working environment.
#
# Usage (macOS/Linux):
#   chmod +x scripts/dev-setup.sh
#   ./scripts/dev-setup.sh
#
# This script:
# - Installs npm dependencies (root + backend)
# - Installs Playwright browsers
# - Sets up .env if missing
# - Gives hints for AWS profile and MCP tools
#

set -e

echo "🚀 Hangar Liquor Store Dev Setup"
echo "=================================="
echo ""

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is required but not installed."
  echo "   Please install Node.js 20+ LTS from https://nodejs.org/"
  exit 1
fi
echo "✅ Node.js: $(node --version)"

# Check npm
if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm is required but not found."
  exit 1
fi
echo "✅ npm: $(npm --version)"

echo ""
echo "📦 Installing dependencies..."
npm install
npm --prefix backend install

echo ""
echo "🎭 Installing Playwright browsers (needed for E2E + MCP)..."
npx playwright install

# Setup .env
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "✅ Created .env from .env.example"
    echo "   Edit VITE_API_URL if you have a real backend."
  fi
else
  echo "ℹ️  .env already exists"
fi

echo ""
echo "🔐 AWS Profile"
echo "   For this project use the 'hanger-personal' profile."
echo "   Run: source scripts/set-aws-profile.sh"
echo "   (or on Windows: npm run aws:profile:win)"

echo ""
echo "🤖 MCP / AI Tools (Cursor, VS Code, Grok)"
echo "   The mcps/ folder + .cursor/mcp.json and .vscode/mcp.json are committed."
echo "   After cloning:"
echo "   1. Install Docker Desktop (required for terraform-mcp)"
echo "   2. Open the project in Cursor or VS Code"
echo "   3. Restart the IDE so MCP servers load"
echo "   4. (Optional) Set TFE_TOKEN / TFE_ADDRESS for Terraform registry"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  npm run dev                 # Start frontend"
echo "  npm run test:backend        # Backend tests"
echo "  npm run test:e2e            # E2E tests"
echo ""
echo "For AWS deployment / client setup see:"
echo "  - scripts/set-aws-profile.sh (or .ps1)"
echo "  - terraform/README.md"
echo "  - Docs/client-deployment.md"
echo ""
echo "Happy coding! 🍺"