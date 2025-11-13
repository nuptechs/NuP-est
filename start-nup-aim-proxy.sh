#!/bin/bash
set -e

echo "🔧 [Proxy Mode] Starting NuP-AIM with BASE_PREFIX=/nup-aim"

cd "$(dirname "$0")/apps/nup-aim"

export BASE_PREFIX="/nup-aim"
export PORT=5003

exec npm run dev
