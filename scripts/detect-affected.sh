#!/bin/bash
set -e

# Detect affected workspaces based on git changes
# Usage: ./detect-affected.sh [base-ref] [head-ref]

BASE_REF="${1:-HEAD^}"
HEAD_REF="${2:-HEAD}"

echo "🔍 Detecting affected workspaces..." >&2
echo "📊 Comparing $BASE_REF...$HEAD_REF" >&2

# Get changed files
CHANGED_FILES=$(git diff --name-only "$BASE_REF" "$HEAD_REF" 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
  echo "ℹ️  No changes detected" >&2
  echo '{"apps":[],"packages":[],"features":[]}'
  exit 0
fi

echo "" >&2
echo "📝 Changed files:" >&2
echo "$CHANGED_FILES" | head -10 >&2
if [ $(echo "$CHANGED_FILES" | wc -l) -gt 10 ]; then
  echo "... and $(( $(echo "$CHANGED_FILES" | wc -l) - 10 )) more" >&2
fi
echo "" >&2

# Detect changed apps
APPS=$(echo "$CHANGED_FILES" | grep '^apps/' | cut -d'/' -f2 | sort -u | tr '\n' ' ' | sed 's/ $//')

# Detect changed packages
PACKAGES=$(echo "$CHANGED_FILES" | grep '^packages/@nup/' | cut -d'/' -f3 | sort -u | tr '\n' ' ' | sed 's/ $//')

# Detect changed features
FEATURES=$(echo "$CHANGED_FILES" | grep '^features/@nup/' | cut -d'/' -f3 | sort -u | tr '\n' ' ' | sed 's/ $//')

# Detect if root configs changed (affects all)
ROOT_CHANGES=$(echo "$CHANGED_FILES" | grep -E '^(package.json|pnpm-workspace.yaml|tsconfig.json|turbo.json)' || true)

if [ -n "$ROOT_CHANGES" ]; then
  echo "⚠️  Root configuration changed - all workspaces affected" >&2
  
  # Dynamically detect all apps
  if [ -d "apps" ]; then
    ALL_APPS=$(ls -1 apps | tr '\n' ' ' | sed 's/ $//')
  fi
  
  # Dynamically detect all packages
  if [ -d "packages/@nup" ]; then
    ALL_PACKAGES=$(ls -1 packages/@nup | tr '\n' ' ' | sed 's/ $//')
  fi
  
  # Dynamically detect all features
  if [ -d "features/@nup" ]; then
    ALL_FEATURES=$(ls -1 features/@nup | tr '\n' ' ' | sed 's/ $//')
  fi
  
  # Merge with already detected (to avoid duplicates)
  APPS="$APPS $ALL_APPS"
  PACKAGES="$PACKAGES $ALL_PACKAGES"
  FEATURES="$FEATURES $ALL_FEATURES"
  
  # Remove duplicates
  APPS=$(echo "$APPS" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/ $//')
  PACKAGES=$(echo "$PACKAGES" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/ $//')
  FEATURES=$(echo "$FEATURES" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/ $//')
fi

echo "🎯 Affected workspaces:" >&2
echo "  Apps: ${APPS:-none}" >&2
echo "  Packages: ${PACKAGES:-none}" >&2
echo "  Features: ${FEATURES:-none}" >&2
echo "" >&2

# Convert space-separated lists to JSON arrays
to_json_array() {
  local items="$1"
  if [ -z "$items" ]; then
    echo "[]"
  else
    echo "$items" | tr ' ' '\n' | jq -R -s -c 'split("\n") | map(select(length > 0))'
  fi
}

APPS_JSON=$(to_json_array "$APPS")
PACKAGES_JSON=$(to_json_array "$PACKAGES")
FEATURES_JSON=$(to_json_array "$FEATURES")

# Output JSON for GitHub Actions
cat << EOF
{
  "apps": $APPS_JSON,
  "packages": $PACKAGES_JSON,
  "features": $FEATURES_JSON
}
EOF
