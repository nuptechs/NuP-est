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

echo ""
echo "🔍 Validating app..."
if ! ./scripts/validate-app.sh "$APP_NAME" > /dev/null 2>&1; then
  echo "❌ App validation failed. Run ./scripts/validate-app.sh $APP_NAME for details."
  exit 1
fi
echo "✅ App validation passed"

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
echo "🔧 Step 5/6: Resolving workspace dependencies..."
cd "$DEPLOY_DIR"

# Function to resolve workspace deps in a package.json
node -e "
const fs = require('fs');
const path = require('path');

function resolveWorkspaceDeps(pkgPath, baseDir) {
  if (!fs.existsSync(pkgPath)) return false;
  
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  let changed = false;
  
  if (pkg.dependencies) {
    for (const [name, version] of Object.entries(pkg.dependencies)) {
      if (version.startsWith('workspace:')) {
        const pkgName = name.replace('@nup/', '');
        
        // Auto-detect if it's a package or feature by checking filesystem
        let basePath = 'packages';
        const packagePath = path.join(baseDir, 'packages', '@nup', pkgName);
        const featurePath = path.join(baseDir, 'features', '@nup', pkgName);
        
        if (fs.existsSync(featurePath)) {
          basePath = 'features';
        } else if (!fs.existsSync(packagePath)) {
          console.warn(\`⚠️  Warning: Could not find \${name} in packages or features\`);
          continue;
        }
        
        // Calculate relative path from current package to dependency
        const currentDir = path.dirname(pkgPath);
        const targetPath = path.join(baseDir, basePath, '@nup', pkgName);
        const relativePath = path.relative(currentDir, targetPath);
        
        pkg.dependencies[name] = \`file:\${relativePath}\`;
        changed = true;
      }
    }
  }
  
  if (changed) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  }
  
  return changed;
}

function findPackageJsons(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      const pkgJson = path.join(fullPath, 'package.json');
      if (fs.existsSync(pkgJson)) {
        results.push(pkgJson);
      }
    }
  }
  return results;
}

const baseDir = process.cwd();

// Resolve in main app package.json
console.log('📦 Resolving app dependencies...');
if (resolveWorkspaceDeps('./package.json', baseDir)) {
  console.log('  ✅ Resolved app dependencies');
}

// Resolve in all packages
console.log('📦 Resolving package dependencies...');
const packageJsons = findPackageJsons('packages/@nup');
packageJsons.forEach(pkgPath => {
  if (resolveWorkspaceDeps(pkgPath, baseDir)) {
    console.log(\`  ✅ Resolved: \${pkgPath}\`);
  }
});

// Resolve in all features
console.log('🎨 Resolving feature dependencies...');
const featureJsons = findPackageJsons('features/@nup');
featureJsons.forEach(pkgPath => {
  if (resolveWorkspaceDeps(pkgPath, baseDir)) {
    console.log(\`  ✅ Resolved: \${pkgPath}\`);
  }
});

console.log('✅ All workspace dependencies resolved to file: paths');
"

echo ""
echo "🌳 Step 6/6: Installing production dependencies..."
if ! pnpm install --prod --no-frozen-lockfile; then
  echo "❌ ERROR: Failed to install production dependencies"
  echo "Check the package.json for unresolved dependencies"
  cd ../..
  exit 1
fi

cd ../..

echo ""
echo "🔐 Step 7/7: Generating checksums..."
cd "$DEPLOY_DIR"
find . -type f \( -name "*.js" -o -name "*.json" \) | sort | xargs sha256sum > CHECKSUMS.txt 2>/dev/null || true
cd ../..

BUNDLE_SIZE=$(du -sh "$DEPLOY_DIR" | cut -f1)
FILE_COUNT=$(find "$DEPLOY_DIR" -type f | wc -l)
echo ""
echo "✅ Deployment bundle created successfully!"
echo "📊 Bundle size: $BUNDLE_SIZE"
echo "📁 File count: $FILE_COUNT"
echo "📍 Location: $DEPLOY_DIR"
echo "🔐 Checksums: $DEPLOY_DIR/CHECKSUMS.txt"
echo ""
echo "🎯 Next steps:"
echo "  1. Test locally: cd $DEPLOY_DIR && node dist/index.js"
echo "  2. Upload to target Repl: rsync or git push"
echo "  3. Set environment variables on target Repl"
echo "  4. Run on target: node dist/index.js"
echo "  5. Verify checksums on target to ensure integrity"
