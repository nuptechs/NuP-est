# @nup/app-kit

🚀 Toolkit for creating portable NuP apps that work both standalone and in the monorepo.

## Features

- ✅ **Portable configs** - Vite, Tailwind, TypeScript configs that work anywhere
- ✅ **Development shims** - Mock `@nup/*` packages for standalone development
- ✅ **CLI automation** - One-command app registration
- ✅ **Zero friction** - Copy standalone app → register → done!

## Installation

```bash
# In monorepo
pnpm add -w @nup/app-kit

# In standalone app
npm install @nup/app-kit
```

## Usage

### Use Shared Configs

```typescript
// vite.config.ts
import { defineNupAppConfig } from "@nup/app-kit/vite"

export default defineNupAppConfig({
  server: { port: 5004 }
})
```

```typescript
// tailwind.config.ts
import { nupTailwindConfig } from "@nup/app-kit/tailwind"

export default {
  ...nupTailwindConfig,
  content: ["./client/src/**/*.{ts,tsx}"]
}
```

### CLI Commands

```bash
# Create new app from template
npx nup-app create my-awesome-app

# Register app in monorepo
npx nup-app register my-awesome-app

# Validate app before moving
npx nup-app validate my-awesome-app
```

## Architecture

```
@nup/app-kit/
├── configs/          # Shared configuration files
├── shims/            # Mock packages for standalone dev
├── cli/              # Automation CLI
└── templates/        # App templates
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm type-check
```

## License

MIT
