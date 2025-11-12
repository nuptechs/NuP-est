#!/bin/bash
set -e

echo "🧪 Testing workspace dependency resolution..."

TEST_DIR="/tmp/test-bundle"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

echo "📋 Copying test package.json..."
cp apps/nup-study/package.json "$TEST_DIR/"

echo "📦 Copying packages..."
mkdir -p "$TEST_DIR/packages/@nup"
for pkg in packages/@nup/*; do
  if [ -d "$pkg/dist" ]; then
    PKG_NAME=$(basename "$pkg")
    mkdir -p "$TEST_DIR/packages/@nup/$PKG_NAME"
    cp -r "$pkg/dist" "$TEST_DIR/packages/@nup/$PKG_NAME/"
    cp "$pkg/package.json" "$TEST_DIR/packages/@nup/$PKG_NAME/"
  fi
done

echo "🎨 Copying features..."
mkdir -p "$TEST_DIR/features/@nup"
for feat in features/@nup/*; do
  if [ -d "$feat/dist" ]; then
    FEAT_NAME=$(basename "$feat")
    mkdir -p "$TEST_DIR/features/@nup/$FEAT_NAME"
    cp -r "$feat/dist" "$TEST_DIR/features/@nup/$FEAT_NAME/"
    cp "$feat/package.json" "$TEST_DIR/features/@nup/$FEAT_NAME/"
  fi
done

cd "$TEST_DIR"

echo ""
echo "🔧 Resolving workspace dependencies..."
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

console.log('✅ All workspace dependencies resolved!');
"

echo ""
echo "✅ Dependency resolution test complete!"
echo "📁 Test bundle at: $TEST_DIR"
