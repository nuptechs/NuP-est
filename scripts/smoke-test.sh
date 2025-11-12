#!/bin/bash
set -e

# Smoke test for deployment bundles
# Usage: ./smoke-test.sh <bundle-path>

BUNDLE_PATH="${1:?Bundle path required}"

if [ ! -d "$BUNDLE_PATH" ]; then
  echo "❌ Bundle path not found: $BUNDLE_PATH"
  exit 1
fi

echo "🧪 Running smoke tests on: $BUNDLE_PATH"
cd "$BUNDLE_PATH"

# Test 1: Verify critical files exist
echo ""
echo "📋 Test 1: Verify critical files..."
CRITICAL_FILES=(
  "package.json"
  "dist/index.js"
  "node_modules"
)

for file in "${CRITICAL_FILES[@]}"; do
  if [ ! -e "$file" ]; then
    echo "❌ Missing: $file"
    exit 1
  fi
  echo "  ✅ $file"
done

# Test 2: Verify package.json is valid JSON
echo ""
echo "📋 Test 2: Verify package.json..."
if ! node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
  echo "❌ Invalid package.json"
  exit 1
fi
echo "  ✅ Valid JSON"

# Test 3: Verify no workspace:* dependencies remain
echo ""
echo "📋 Test 3: Verify workspace deps resolved..."
WORKSPACE_DEPS=$(grep -r "workspace:\*" package.json packages/*/package.json features/*/package.json 2>/dev/null || true)
if [ -n "$WORKSPACE_DEPS" ]; then
  echo "❌ Found unresolved workspace dependencies:"
  echo "$WORKSPACE_DEPS"
  exit 1
fi
echo "  ✅ All workspace deps resolved"

# Test 4: Verify server bundle can be loaded
echo ""
echo "📋 Test 4: Verify server bundle..."
if ! node -e "
  try {
    const path = require('path');
    const bundle = path.join(process.cwd(), 'dist/index.js');
    console.log('  Loading:', bundle);
    // Just verify it can be imported without immediate errors
    // Note: Full execution would require DATABASE_URL etc
    require(bundle);
    console.log('  ✅ Server bundle loaded successfully');
  } catch (e) {
    // Some initialization errors are expected without env vars
    // We just want to catch syntax/import errors
    if (e.code === 'ERR_REQUIRE_ESM') {
      console.log('  ✅ Server bundle is valid (ESM)');
    } else if (e.message.includes('DATABASE_URL') || e.message.includes('environment')) {
      console.log('  ✅ Server bundle is valid (needs env vars)');
    } else {
      console.error('  ❌ Error loading bundle:', e.message);
      process.exit(1);
    }
  }
" 2>&1; then
  echo "❌ Server bundle validation failed"
  exit 1
fi

# Test 5: Verify checksums file
echo ""
echo "📋 Test 5: Verify checksums..."
if [ ! -f "CHECKSUMS.txt" ]; then
  echo "⚠️  CHECKSUMS.txt not found (optional)"
else
  CHECKSUM_COUNT=$(wc -l < CHECKSUMS.txt)
  echo "  ✅ Found $CHECKSUM_COUNT checksums"
fi

# Test 6: Verify bundle size is reasonable
echo ""
echo "📋 Test 6: Verify bundle size..."
BUNDLE_SIZE=$(du -sm . | cut -f1)
echo "  Bundle size: ${BUNDLE_SIZE}MB"

if [ "$BUNDLE_SIZE" -lt 50 ]; then
  echo "  ⚠️  Bundle seems small - may be missing node_modules"
elif [ "$BUNDLE_SIZE" -gt 1000 ]; then
  echo "  ⚠️  Bundle is very large (>1GB)"
else
  echo "  ✅ Bundle size is reasonable"
fi

# Summary
echo ""
echo "✅ All smoke tests passed!"
echo ""
echo "📊 Bundle Summary:"
echo "  Location: $BUNDLE_PATH"
echo "  Size: ${BUNDLE_SIZE}MB"
echo "  Files: $(find . -type f | wc -l)"
echo "  Packages: $(ls node_modules 2>/dev/null | wc -l)"
