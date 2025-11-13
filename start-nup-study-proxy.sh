#!/bin/bash
set -e

echo "🔧 [Proxy Mode] Starting NuP-Study on dedicated port 5001"

cd "$(dirname "$0")/apps/nup-study"

export PORT=5001
export NODE_ENV=development

exec npm run dev
