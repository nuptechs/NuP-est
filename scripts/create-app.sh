#!/bin/bash
# Script para criar estrutura básica de uma nova app no monorepo NuP

set -e

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se nome da app foi fornecido
if [ -z "$1" ]; then
  echo -e "${YELLOW}Uso: ./scripts/create-app.sh <nome-da-app> [porta]${NC}"
  echo "Exemplo: ./scripts/create-app.sh nup-chunks 5002"
  exit 1
fi

APP_NAME=$1
PORT=${2:-5001}
APP_DIR="apps/$APP_NAME"

echo -e "${BLUE}🚀 Criando estrutura para: $APP_NAME${NC}"

# Verificar se app já existe
if [ -d "$APP_DIR" ]; then
  echo -e "${YELLOW}⚠️  App já existe em $APP_DIR${NC}"
  read -p "Deseja sobrescrever? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operação cancelada."
    exit 1
  fi
  rm -rf "$APP_DIR"
fi

# Criar estrutura de diretórios
echo -e "${BLUE}📁 Criando diretórios...${NC}"
mkdir -p "$APP_DIR"/{client/src/{pages,components,hooks,lib},server/{routes,services,middleware},shared}

# Criar package.json
echo -e "${BLUE}📦 Criando package.json...${NC}"
cat > "$APP_DIR/package.json" <<EOF
{
  "name": "$APP_NAME",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@nup/ui": "workspace:*",
    "@nup/auth-client": "workspace:*",
    "@nup/api-client": "workspace:*",
    "@nup/shared-types": "workspace:*",
    "express": "^4.18.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "wouter": "^3.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.0.0",
    "tsx": "^4.7.0",
    "vite": "^5.0.0"
  }
}
EOF

# Criar tsconfig.json
echo -e "${BLUE}⚙️  Criando tsconfig.json...${NC}"
cat > "$APP_DIR/tsconfig.json" <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"],
      "@nup/ui": ["../../packages/@nup/ui/src"],
      "@nup/auth-client": ["../../packages/@nup/auth-client/src"],
      "@nup/api-client": ["../../packages/@nup/api-client/src"],
      "@nup/shared-types": ["../../packages/@nup/shared-types/src"]
    }
  },
  "include": ["client", "server", "shared"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Criar vite.config.ts
echo -e "${BLUE}⚡ Criando vite.config.ts...${NC}"
cat > "$APP_DIR/vite.config.ts" <<EOF
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@nup/ui': path.resolve(__dirname, '../../packages/@nup/ui/src'),
      '@nup/auth-client': path.resolve(__dirname, '../../packages/@nup/auth-client/src'),
      '@nup/api-client': path.resolve(__dirname, '../../packages/@nup/api-client/src'),
      '@nup/shared-types': path.resolve(__dirname, '../../packages/@nup/shared-types/src'),
    },
  },
  server: {
    port: $PORT,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:$PORT',
        changeOrigin: true,
      },
    },
  },
});
EOF

# Criar servidor básico
echo -e "${BLUE}🔧 Criando servidor Express...${NC}"
cat > "$APP_DIR/server/index.ts" <<'EOF'
import express from 'express';
import ViteExpress from 'vite-express';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());

// Rotas da API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: process.env.npm_package_name });
});

// Iniciar servidor
if (process.env.NODE_ENV === 'development') {
  ViteExpress.listen(app, PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}
EOF

# Criar App.tsx básico
echo -e "${BLUE}⚛️  Criando App.tsx...${NC}"
cat > "$APP_DIR/client/src/App.tsx" <<'EOF'
import { Route, Switch } from 'wouter';
import { Button } from '@nup/ui';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/" component={HomePage} />
        <Route>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <p className="text-muted-foreground mb-4">Página não encontrada</p>
              <Button onClick={() => window.location.href = '/'}>
                Voltar para Home
              </Button>
            </div>
          </div>
        </Route>
      </Switch>
    </div>
  );
}
EOF

# Criar HomePage básica
cat > "$APP_DIR/client/src/pages/HomePage.tsx" <<'EOF'
import { Button } from '@nup/ui';

export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to Your New App
        </h1>
        <p className="text-muted-foreground mb-6">
          Start building something amazing!
        </p>
        <Button>Get Started</Button>
      </div>
    </div>
  );
}
EOF

# Criar main.tsx
cat > "$APP_DIR/client/src/main.tsx" <<'EOF'
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
EOF

# Criar index.css
cat > "$APP_DIR/client/src/index.css" <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}
EOF

# Criar index.html
cat > "$APP_DIR/client/index.html" <<EOF
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>$APP_NAME</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# Criar README
echo -e "${BLUE}📄 Criando README...${NC}"
cat > "$APP_DIR/README.md" <<EOF
# $APP_NAME

## 🚀 Desenvolvimento

\`\`\`bash
# Rodar apenas esta app
pnpm dev:${APP_NAME#nup-}

# Ou, a partir da raiz:
pnpm --filter $APP_NAME dev
\`\`\`

## 📦 Build

\`\`\`bash
pnpm --filter $APP_NAME build
\`\`\`

## 🔧 Estrutura

- \`client/\` - Frontend React + Vite
- \`server/\` - Backend Express
- \`shared/\` - Código compartilhado (schemas, types)

## 📚 Packages Usados

- \`@nup/ui\` - Design system
- \`@nup/auth-client\` - Autenticação
- \`@nup/api-client\` - HTTP client
- \`@nup/shared-types\` - TypeScript types
EOF

echo -e "${GREEN}✅ Estrutura criada com sucesso!${NC}"
echo ""
echo -e "${BLUE}📋 Próximos passos:${NC}"
echo "1. cd $APP_DIR"
echo "2. Copie seu código existente para os diretórios apropriados:"
echo "   - Frontend → client/src/"
echo "   - Backend → server/"
echo "   - Schemas → shared/"
echo "3. Atualize os imports para usar @nup/* packages"
echo "4. Execute: pnpm install (na raiz do monorepo)"
echo "5. Teste: pnpm dev:${APP_NAME#nup-}"
echo ""
echo -e "${YELLOW}💡 Consulte docs/MIGRAR_APPS.md para mais detalhes${NC}"
