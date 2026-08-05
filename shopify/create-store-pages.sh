#!/usr/bin/env bash
# Crea su Shopify le pagine Spedizioni / Resi / Termini (testi già nel tema).
# Uso:
#   export SHOP="dj0wgt-0g.myshopify.com"
#   export SHOPIFY_ADMIN_TOKEN="shpat_..."
#   ./create-store-pages.sh
set -euo pipefail

SHOP="${SHOP:-dj0wgt-0g.myshopify.com}"
TOKEN="${SHOPIFY_ADMIN_TOKEN:-}"
API="2024-10"

if [[ -z "$TOKEN" ]]; then
  echo "Manca SHOPIFY_ADMIN_TOKEN."
  echo "Crea un'app custom in Admin → Impostazioni → App e canali di vendita → Sviluppa app"
  echo "con permesso write_content (o write_online_store_pages), poi:"
  echo "  export SHOPIFY_ADMIN_TOKEN=shpat_xxx"
  echo "  ./create-store-pages.sh"
  exit 1
fi

create_page() {
  local title="$1"
  local handle="$2"
  local template="$3"
  echo "→ Creo pagina: $title ($handle) template=$template"
  curl -sS -X POST "https://${SHOP}/admin/api/${API}/pages.json" \
    -H "X-Shopify-Access-Token: ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$(python3 - <<PY
import json
print(json.dumps({
  "page": {
    "title": """$title""",
    "handle": """$handle""",
    "body_html": "<p></p>",
    "published": True,
    "template_suffix": """$template"""
  }
}))
PY
)" | python3 -c "import sys,json; d=json.load(sys.stdin); p=d.get('page') or {}; print('  OK' if p.get('id') else '  ERR', p.get('id') or d)"
}

# Controlla se esiste già
list=$(curl -sS "https://${SHOP}/admin/api/${API}/pages.json?limit=50" \
  -H "X-Shopify-Access-Token: ${TOKEN}")
echo "$list" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Pagine attuali:', ', '.join(p['handle'] for p in d.get('pages',[])) or '(nessuna)')"

exists() {
  echo "$list" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if any(p.get('handle')==sys.argv[1] for p in d.get('pages',[])) else 'no')" "$1"
}

[[ "$(exists spedizioni)" == "yes" ]] || create_page "Spedizioni" "spedizioni" "spedizioni"
[[ "$(exists resi)" == "yes" ]] || create_page "Resi e rimborsi" "resi" "resi"
[[ "$(exists termini)" == "yes" ]] || create_page "Termini e condizioni" "termini" "termini"

echo "Fatto. Verifica:"
echo "  https://khamakeymoments.com/pages/spedizioni"
echo "  https://khamakeymoments.com/pages/resi"
echo "  https://khamakeymoments.com/pages/termini"
echo "Poi sulla pagina Contatti: template tema = contact"
