#!/bin/bash
set -e

APP_NAME=$1
OUTPUT_DIR=${2:-"./deploy-output"}

if [ -z "$APP_NAME" ]; then
  echo "Usage: ./scripts/deploy-app.sh <app-name> [output-dir]"
  echo "Example: ./scripts/deploy-app.sh nup-study"
  exit 1
fi

APP_PATH="apps/$APP_NAME"

if [ ! -d "$APP_PATH" ]; then
  echo "Error: App directory $APP_PATH does not exist"
  exit 1
fi

echo "🚀 Starting deployment for $APP_NAME..."
echo "📦 Output directory: $OUTPUT_DIR/$APP_NAME"

DEPLOY_DIR="$OUTPUT_DIR/$APP_NAME"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo ""
echo "📦 Step 1/5: Building shared packages..."
pnpm -r --filter "./packages/@nup/*" run build

echo ""
echo "🎨 Step 2/5: Building features..."
pnpm -r --filter "./features/@nup/*" run build

echo ""
echo "🏗️  Step 3/5: Building app ($APP_NAME)..."
cd "$APP_PATH"
pnpm run build
cd ../..

echo ""
echo "📋 Step 4/5: Copying app files to deploy directory..."
cp -r "$APP_PATH/dist" "$DEPLOY_DIR/"
cp -r "$APP_PATH/server" "$DEPLOY_DIR/"
cp -r "$APP_PATH/client" "$DEPLOY_DIR/"
cp "$APP_PATH/package.json" "$DEPLOY_DIR/"
cp "$APP_PATH/tsconfig.json" "$DEPLOY_DIR/" 2>/dev/null || true
cp "$APP_PATH/vite.config.ts" "$DEPLOY_DIR/" 2>/dev/null || true

mkdir -p "$DEPLOY_DIR/packages/@nup"
mkdir -p "$DEPLOY_DIR/features/@nup"

echo ""
echo "📦 Step 4.1/5: Copying compiled packages to deploy directory..."
for pkg in packages/@nup/*; do
  if [ -d "$pkg/dist" ]; then
    PKG_NAME=$(basename "$pkg")
    echo "  → Copying $PKG_NAME..."
    mkdir -p "$DEPLOY_DIR/packages/@nup/$PKG_NAME"
    cp -r "$pkg/dist" "$DEPLOY_DIR/packages/@nup/$PKG_NAME/"
    cp "$pkg/package.json" "$DEPLOY_DIR/packages/@nup/$PKG_NAME/"
  fi
done

echo ""
echo "🎨 Step 4.2/5: Copying compiled features to deploy directory..."
for feat in features/@nup/*; do
  if [ -d "$feat/dist" ]; then
    FEAT_NAME=$(basename "$feat")
    echo "  → Copying $FEAT_NAME..."
    mkdir -p "$DEPLOY_DIR/features/@nup/$FEAT_NAME"
    cp -r "$feat/dist" "$DEPLOY_DIR/features/@nup/$FEAT_NAME/"
    cp "$feat/package.json" "$DEPLOY_DIR/features/@nup/$FEAT_NAME/"
  fi
done

echo ""
echo "🌳 Step 5/5: Creating pruned node_modules (production only)..."
cd "$DEPLOY_DIR"
pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod || echo "⚠️  Warning: pnpm install with --frozen-lockfile failed, continuing..."
cd ../..

BUNDLE_SIZE=$(du -sh "$DEPLOY_DIR" | cut -f1)
echo ""
echo "✅ Deployment bundle created successfully!"
echo "📊 Bundle size: $BUNDLE_SIZE"
echo "📍 Location: $DEPLOY_DIR"
echo ""
echo "🎯 Next steps:"
echo "  1. Test locally: cd $DEPLOY_DIR && node dist/index.js"
echo "  2. Upload to target Repl: rsync or git push"
echo "  3. Set environment variables on target Repl"
echo "  4. Run on target: node dist/index.js"
