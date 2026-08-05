#!/usr/bin/env bash
# Wrapper Shopify CLI locale (senza install globale).
# Uso:
#   ./shopify/shopify-cli.sh auth login
#   ./shopify/shopify-cli.sh theme list -e production
#   ./shopify/shopify-cli.sh theme push -e production --unpublished
#   ./shopify/shopify-cli.sh theme push -e production --live
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
CLI="$ROOT/shopify-cli-local/node_modules/.bin/shopify"
THEME_DIR="$ROOT/khamakey-moments"

if [[ ! -x "$CLI" ]]; then
  echo "CLI non trovata. Installa con:"
  echo "  cd \"$ROOT/shopify-cli-local\" && npm install @shopify/cli"
  exit 1
fi

# Default: comandi theme partono dalla cartella tema
if [[ "${1:-}" == theme ]]; then
  exec "$CLI" "$@" --path "$THEME_DIR"
else
  exec "$CLI" "$@"
fi
