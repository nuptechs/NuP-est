# Testing Guide - @nup/app-kit

## Shim Functionality Tests

### Test 1: Standalone Development (UI Shims)

```bash
# Create new app
npx nup-app create test-app

cd test-app

# Install dependencies
npm install

# Test that UI components work
# ExampleComponent uses Button, Card, Input, Label from shims
npm run dev
```

**Expected Result:**
- ✅ Console shows: "ℹ️ Using @nup/app-kit UI shims (standalone mode)"
- ✅ Components render with Tailwind styles
- ✅ Button is clickable
- ✅ Input accepts text

### Test 2: API Client Shim

```typescript
// In any component
import { apiRequest } from '@nup/app-kit/shims/api';

const data = await apiRequest('/api/health');
console.log(data); // { status: 'ok', timestamp: ... }
```

**Expected Result:**
- ✅ Console shows: "ℹ️ Using @nup/app-kit API shims (standalone mode)"
- ✅ API request works using fetch fallback

### Test 3: Monorepo Mode

```bash
# Move app to monorepo
cp -r test-app /path/to/easy-nup/apps/

cd /path/to/easy-nup

# Register app
npx nup-app register test-app

# Install
pnpm install --filter test-app...

# Run in monorepo
pnpm turbo run dev --filter test-app
```

**Expected Result:**
- ✅ NO console message about shims (using real packages)
- ✅ Components render using @nup/ui
- ✅ API requests use @nup/api-client

## Validation Checklist

### Shims Work Standalone
- [ ] UI components render
- [ ] No runtime errors
- [ ] Console shows shim message
- [ ] Components are styled

### Shims Switch in Monorepo
- [ ] Real packages used when available
- [ ] No shim console messages
- [ ] Same UI/behavior

### CLI Commands
- [ ] `npx nup-app create` works
- [ ] `npx nup-app validate` works
- [ ] `npx nup-app register` works

### Template Complete
- [ ] All files present
- [ ] package.json valid
- [ ] Configs use app-kit
- [ ] ExampleComponent works

## Current Status

✅ **Shims Implemented:**
- `shims/ui.tsx` - Button, Card, Input, Label
- `shims/api.ts` - apiRequest
- `shims/index.ts` - Re-exports

✅ **Build Successful:**
```
ESM dist/shims/ui.js 114.00 B
ESM dist/shims/api.js 99.00 B
ESM dist/shims/index.js 246.00 B
ESM ⚡️ Build success in 4420ms
```

✅ **Example Usage:**
- `templates/standalone-app/client/src/components/ExampleComponent.tsx`
- Uses shims that work both modes

## Next Steps

1. ✅ Test standalone app creation
2. ✅ Test UI components render
3. ✅ Test migration to monorepo
4. ✅ Validate shim switching
