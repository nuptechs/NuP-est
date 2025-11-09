#!/bin/bash
# Script para rodar um app específico
# Usa workflows-config.json como fonte de verdade

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ID=$1

if [ -z "$APP_ID" ]; then
  echo "❌ Erro: Especifique o ID do app"
  echo ""
  echo "Uso: ./scripts/run-app.sh <app-id>"
  echo ""
  echo "Apps disponíveis:"
  node "$SCRIPT_DIR/manage-workflows.js" list
  exit 1
fi

# Delegar para o gerenciador
node "$SCRIPT_DIR/manage-workflows.js" run "$APP_ID"
