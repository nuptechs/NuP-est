#!/bin/bash
set -e

echo "🔐 Deploying NuP-Identify..."
./scripts/deploy-app.sh nup-identify "$@"
