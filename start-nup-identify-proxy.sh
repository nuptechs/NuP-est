#!/bin/bash
set -e

echo "🔧 [Proxy Mode] Starting NuP-Identify with BASE_PREFIX=/nup-identify"

cd "$(dirname "$0")/apps/nup-identify"

export BASE_PREFIX="/nup-identify"
export PORT=5002
export NODE_ENV=development

exec npm run dev
