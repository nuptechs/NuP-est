#!/bin/bash

# =============================================================================
# NuP App Bootstrap Script
# Cria um app standalone pronto para desenvolvimento e futura migração
# =============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# =============================================================================
# CONFIGURATION
# =============================================================================

APP_NAME=${1:-"nup-dev"}
PORT=${2:-5004}
USE_DATABASE=${3:-"yes"}

print_header "NuP App Bootstrap - $APP_NAME"

echo "Configuration:"
echo "  App Name: $APP_NAME"
echo "  Port: $PORT"
echo "  Database: $USE_DATABASE"
echo ""

# =============================================================================
# STEP 1: Package.json
# =============================================================================

print_info "Creating package.json..."

cat > package.json <<EOF
{
  "name": "$APP_NAME",
  "version": "1.0.0",
  "description": "NuP App - $APP_NAME",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "type-check": "tsc --noEmit",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "express": "^4.21.2",
    "drizzle-orm": "^0.44.5",
    "@neondatabase/serverless": "^0.10.7",
    "drizzle-zod": "^0.7.0",
    "zod": "^3.24.1",
    "wouter": "^3.3.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@tanstack/react-query": "^5.62.11",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "lucide-react": "^0.469.0"
  },
  "devDependencies": {
    "@types/express": "4.17.21",
    "@types/node": "20.16.11",
    "@types/react": "^18.3.23",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react": "^4.3.2",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
    "@replit/vite-plugin-cartographer": "^0.3.0",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.31.4",
    "esbuild": "^0.25.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "tsx": "^4.19.1",
    "typescript": "5.6.3",
    "vite": "^5.4.19"
  }
}
EOF

print_success "package.json created"

# =============================================================================
# STEP 2: TypeScript Config
# =============================================================================

print_info "Creating tsconfig.json..."

cat > tsconfig.json <<EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["client", "server", "shared"],
  "exclude": ["node_modules", "dist"]
}
EOF

print_success "tsconfig.json created"

# =============================================================================
# STEP 3: Vite Config
# =============================================================================

print_info "Creating vite.config.ts..."

cat > vite.config.ts <<EOF
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorModal from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorModal(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: $PORT,
    strictPort: true,
  },
});
EOF

print_success "vite.config.ts created"

# =============================================================================
# STEP 4: Tailwind Config
# =============================================================================

print_info "Creating tailwind.config.ts..."

cat > tailwind.config.ts <<'EOF'
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
EOF

print_success "tailwind.config.ts created"

# =============================================================================
# STEP 5: PostCSS Config
# =============================================================================

print_info "Creating postcss.config.js..."

cat > postcss.config.js <<EOF
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOF

print_success "postcss.config.js created"

# =============================================================================
# STEP 6: Drizzle Config (if database)
# =============================================================================

if [ "$USE_DATABASE" = "yes" ]; then
    print_info "Creating drizzle.config.ts..."

    cat > drizzle.config.ts <<EOF
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
EOF

    print_success "drizzle.config.ts created"
fi

# =============================================================================
# STEP 7: Directory Structure
# =============================================================================

print_info "Creating directory structure..."

mkdir -p client/src/{components,pages,lib}
mkdir -p server
mkdir -p shared

if [ "$USE_DATABASE" = "yes" ]; then
    mkdir -p migrations
fi

print_success "Directories created"

# =============================================================================
# STEP 8: Shared Schema
# =============================================================================

print_info "Creating shared/schema.ts..."

if [ "$USE_DATABASE" = "yes" ]; then
    cat > shared/schema.ts <<EOF
import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const examples = pgTable("examples", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExampleSchema = createInsertSchema(examples).omit({
  id: true,
  createdAt: true,
});
export type InsertExample = z.infer<typeof insertExampleSchema>;
export type Example = typeof examples.\$inferSelect;
EOF
else
    cat > shared/schema.ts <<EOF
import { z } from "zod";

export const exampleSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
});

export type Example = z.infer<typeof exampleSchema>;
EOF
fi

print_success "shared/schema.ts created"

# =============================================================================
# STEP 9: Server Index
# =============================================================================

print_info "Creating server/index.ts..."

cat > server/index.ts <<EOF
import express, { type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "$PORT", 10);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Routes
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../public");
  app.use(express.static(distPath));
  
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  // Development: Vite dev server handles frontend
  const vite = await import("vite");
  const viteDevServer = await vite.createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  
  app.use(viteDevServer.middlewares);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(\`
╔═══════════════════════════════════════╗
║  🚀 $APP_NAME Server Running          ║
║  📡 Port: $PORT                        ║
║  🌍 Environment: \${process.env.NODE_ENV || "development"}  ║
╚═══════════════════════════════════════╝
  \`);
});
EOF

print_success "server/index.ts created"

# =============================================================================
# STEP 10: Client Files
# =============================================================================

print_info "Creating client files..."

# index.html
cat > client/index.html <<EOF
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

# main.tsx
cat > client/src/main.tsx <<EOF
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
EOF

# App.tsx
cat > client/src/App.tsx <<EOF
import { Route, Switch } from "wouter";
import HomePage from "./pages/HomePage";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route>404 - Página não encontrada</Route>
    </Switch>
  );
}
EOF

# HomePage.tsx
cat > client/src/pages/HomePage.tsx <<EOF
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">
          🚀 $APP_NAME
        </h1>
        <p className="text-muted-foreground">
          App standalone pronto para desenvolvimento
        </p>
        <div className="mt-8 p-4 border rounded-lg bg-card">
          <p className="text-sm text-card-foreground">
            Comece editando <code className="bg-muted px-2 py-1 rounded">client/src/pages/HomePage.tsx</code>
          </p>
        </div>
      </div>
    </div>
  );
}
EOF

# index.css
cat > client/src/index.css <<'EOF'
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

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
EOF

# queryClient.ts
cat > client/src/lib/queryClient.ts <<EOF
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string);
        if (!res.ok) {
          throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);
        }
        return res.json();
      },
    },
  },
});

export async function apiRequest(
  url: string,
  method: "POST" | "PATCH" | "DELETE" = "POST",
  data?: any
) {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);
  }

  return res.json();
}
EOF

print_success "Client files created"

# =============================================================================
# STEP 11: .gitignore
# =============================================================================

print_info "Creating .gitignore..."

cat > .gitignore <<EOF
node_modules
dist
.env
.env.local
*.log
.DS_Store
.replit
replit.nix
EOF

print_success ".gitignore created"

# =============================================================================
# STEP 12: Install Dependencies
# =============================================================================

print_info "Installing dependencies (this may take a minute)..."

npm install --silent

print_success "Dependencies installed"

# =============================================================================
# COMPLETE
# =============================================================================

print_header "Setup Complete! 🎉"

echo -e "${GREEN}Your $APP_NAME app is ready!${NC}\n"

echo "Next steps:"
echo ""
echo "  1. Start development:"
echo -e "     ${YELLOW}npm run dev${NC}"
echo ""
echo "  2. Open browser at:"
echo -e "     ${YELLOW}http://localhost:$PORT${NC}"
echo ""
echo "  3. Start coding in:"
echo -e "     ${YELLOW}client/src/pages/HomePage.tsx${NC}"
echo ""

if [ "$USE_DATABASE" = "yes" ]; then
    echo "  4. Setup database:"
    echo -e "     ${YELLOW}export DATABASE_URL='your-postgres-url'${NC}"
    echo -e "     ${YELLOW}npm run db:push${NC}"
    echo ""
fi

echo "When ready to migrate to monorepo:"
echo -e "  ${YELLOW}cp -r . /path/to/easy-nup/apps/$APP_NAME${NC}"
echo -e "  ${YELLOW}cd /path/to/easy-nup${NC}"
echo -e "  ${YELLOW}npx nup-app register $APP_NAME${NC}"
echo ""

print_success "Happy coding! 🚀"
EOF
