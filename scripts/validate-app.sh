#!/bin/bash
set -e

APP_NAME=$1

if [ -z "$APP_NAME" ]; then
  echo "Usage: ./scripts/validate-app.sh <app-name>"
  echo "Example: ./scripts/validate-app.sh nup-study"
  exit 1
fi

APP_PATH="apps/$APP_NAME"

echo "🔍 Validating app: $APP_NAME"
echo ""

ERRORS=0

if [ ! -d "$APP_PATH" ]; then
  echo "❌ App directory not found: $APP_PATH"
  exit 1
fi

echo "✅ App directory exists: $APP_PATH"

if [ ! -f "$APP_PATH/package.json" ]; then
  echo "❌ Missing package.json"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ package.json exists"
  
  if ! grep -q '"build"' "$APP_PATH/package.json"; then
    echo "⚠️  Warning: No 'build' script found in package.json"
    echo "   Add this to package.json scripts:"
    echo '   "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"'
    ERRORS=$((ERRORS + 1))
  else
    echo "✅ Build script exists"
  fi
fi

if [ ! -d "$APP_PATH/server" ]; then
  echo "⚠️  Warning: No server/ directory found"
else
  echo "✅ server/ directory exists"
fi

if [ ! -d "$APP_PATH/client" ]; then
  echo "⚠️  Warning: No client/ directory found"
else
  echo "✅ client/ directory exists"
fi

if [ ! -f "$APP_PATH/vite.config.ts" ] && [ ! -f "$APP_PATH/vite.config.js" ]; then
  echo "⚠️  Warning: No vite.config found"
else
  echo "✅ vite.config exists"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ App validation passed! Ready for deployment."
  exit 0
else
  echo "❌ App validation failed with $ERRORS error(s)."
  echo "   Fix the issues above before deploying."
  exit 1
fi
