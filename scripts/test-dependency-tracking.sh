#!/bin/bash
set -e

echo "🧪 Testing Dependency Tracking..."
echo ""

# Test 1: Simulate package change
echo "=== Test 1: Package @nup/ui changed ==="
echo "Expected: nup-study (depends on ui)"
echo ""

# Create temporary test by checking which apps depend on ui
for app in apps/*; do
  if [ -f "$app/package.json" ]; then
    APP_NAME=$(basename "$app")
    if grep -q '"@nup/ui":' "$app/package.json"; then
      echo "✓ $APP_NAME depends on @nup/ui"
    fi
  fi
done

echo ""
echo "=== Test 2: Package @nup/shared-types changed ==="
echo "Expected: All apps (most depend on shared-types)"
echo ""

for app in apps/*; do
  if [ -f "$app/package.json" ]; then
    APP_NAME=$(basename "$app")
    if grep -q '"@nup/shared-types":' "$app/package.json"; then
      echo "✓ $APP_NAME depends on @nup/shared-types"
    fi
  fi
done

echo ""
echo "=== Test 3: Feature @nup/flashcards changed ==="
echo "Expected: nup-study (only app using flashcards)"
echo ""

for app in apps/*; do
  if [ -f "$app/package.json" ]; then
    APP_NAME=$(basename "$app")
    if grep -q '"@nup/flashcards":' "$app/package.json"; then
      echo "✓ $APP_NAME depends on @nup/flashcards"
    fi
  fi
done

echo ""
echo "=== Dependency Matrix ==="
echo ""

echo "Package/Feature | Dependent Apps"
echo "----------------|---------------"

for pkg in packages/@nup/*; do
  PKG_NAME=$(basename "$pkg")
  DEPS=""
  for app in apps/*; do
    if [ -f "$app/package.json" ]; then
      APP_NAME=$(basename "$app")
      if grep -q "\"@nup/$PKG_NAME\":" "$app/package.json"; then
        DEPS="$DEPS $APP_NAME"
      fi
    fi
  done
  if [ -n "$DEPS" ]; then
    echo "@nup/$PKG_NAME |$DEPS"
  fi
done

for feat in features/@nup/*; do
  FEAT_NAME=$(basename "$feat")
  DEPS=""
  for app in apps/*; do
    if [ -f "$app/package.json" ]; then
      APP_NAME=$(basename "$app")
      if grep -q "\"@nup/$FEAT_NAME\":" "$app/package.json"; then
        DEPS="$DEPS $APP_NAME"
      fi
    fi
  done
  if [ -n "$DEPS" ]; then
    echo "@nup/$FEAT_NAME |$DEPS"
  fi
done

echo ""
echo "✅ Dependency tracking test complete!"
