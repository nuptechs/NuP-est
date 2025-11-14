# NuP App Template

A portable app template that works both standalone and in the easy-nup monorepo.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

- ✅ **Portable** - Works standalone and in monorepo
- ✅ **Fast Development** - Vite + HMR
- ✅ **Modern Stack** - React 18 + TypeScript + Tailwind
- ✅ **Ready to Deploy** - Production build included

## Adding to Monorepo

When your app is ready:

```bash
# 1. Copy to monorepo
cp -r my-app /path/to/easy-nup/apps/

# 2. Register in monorepo
cd /path/to/easy-nup
npx nup-app register my-app

# 3. Install and run
pnpm install --filter my-app...
pnpm turbo run dev --filter my-app
```

## Structure

```
my-app/
├── client/         # Frontend (React + Vite)
├── server/         # Backend (Express)
├── shared/         # Shared types
└── nup-app.config.json  # App metadata
```

## Configuration

Edit `nup-app.config.json` to customize:

- App name and display name
- Port number
- Gateway path (for monorepo)
- Database schema
- Required environment variables

## Learn More

- [NuP App Kit Documentation](https://github.com/yourusername/easy-nup)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
