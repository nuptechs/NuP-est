# 🚀 Guia de Uso: NuP App Kit

## Visão Geral

O App Kit permite desenvolver apps **standalone** rapidamente e depois movê-los para o monorepo com **mínimas mudanças**.

---

## 📋 Workflow Completo

### 1️⃣ Criar Novo App

```bash
# Opção A: Criar app do template
npx nup-app create my-awesome-app

# Opção B: Criar com opções
npx nup-app create my-awesome-app --port 5004 --database
```

Isso cria:
```
my-awesome-app/
├── client/              # Frontend React
├── server/              # Backend Express
├── nup-app.config.json  # Metadata do app
├── package.json         # Dependencies
├── vite.config.ts       # Vite config (usa @nup/app-kit)
├── tailwind.config.ts   # Tailwind config (usa @nup/app-kit)
└── README.md            # Documentação
```

### 2️⃣ Desenvolver Standalone

```bash
cd my-awesome-app

# Instalar dependências
npm install

# Iniciar dev server
npm run dev
```

**Vantagens:**
- ⚡ Dev server rápido (~2s start)
- 🔥 Hot reload instantâneo (<100ms)
- 🎯 Zero overhead de monorepo
- 📦 Dependencies isoladas

### 3️⃣ Validar App (Opcional)

```bash
# Validar antes de mover
npx nup-app validate my-awesome-app
```

Verifica:
- ✅ Estrutura de pastas correta
- ✅ Config files presentes
- ✅ nup-app.config.json válido
- ✅ Package.json configurado

### 4️⃣ Mover para Monorepo

```bash
# 1. Copiar app para monorepo
cp -r my-awesome-app /path/to/easy-nup/apps/

# 2. Ir para monorepo
cd /path/to/easy-nup

# 3. Registrar app automaticamente
npx nup-app register my-awesome-app

# ✅ O CLI automaticamente:
# - Adiciona ao pnpm-workspace.yaml
# - Configura turbo.json
# - Cria .env
# - Valida configs
```

### 5️⃣ Rodar no Monorepo

```bash
# Instalar dependências
pnpm install --filter my-awesome-app...

# Rodar app
pnpm turbo run dev --filter my-awesome-app
```

**Total: ~5 comandos, 2 minutos!** 🎉

---

## 🎨 Customização

### Configs Compartilhados

O template usa configs compartilhados, mas você pode **customizar** tudo:

#### Vite Config

```typescript
// vite.config.ts
import { defineNupAppConfig } from '@nup/app-kit/vite';

export default defineNupAppConfig({
  // ✅ Config base já incluído
  
  // 🎨 Customizações:
  server: {
    port: 5004,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  
  build: {
    outDir: 'custom-dist'
  }
});
```

#### Tailwind Config

```typescript
// tailwind.config.ts
import { nupTailwindConfig } from '@nup/app-kit/tailwind';

export default {
  ...nupTailwindConfig,
  content: ["./client/src/**/*.{ts,tsx}"],
  
  // 🎨 Customizações:
  theme: {
    extend: {
      ...nupTailwindConfig.theme.extend,
      colors: {
        'brand': '#custom-color'
      }
    }
  }
};
```

#### App Metadata

```json
// nup-app.config.json
{
  "name": "nup-awesome",
  "displayName": "NuP-Awesome",
  "port": 5004,
  
  "gateway": {
    "path": "/nup-awesome",
    "enabled": true
  },
  
  "database": {
    "schema": "nup_awesome",
    "required": true
  },
  
  "env": {
    "required": ["DATABASE_URL"],
    "optional": ["OPENAI_API_KEY"]
  }
}
```

---

## 🔧 Comandos do CLI

### `npx nup-app create <name>`

Cria novo app do template.

**Opções:**
- `--port <port>` - Define porta (default: 5000)
- `--database` - Inclui config de database

**Exemplo:**
```bash
npx nup-app create nup-amazing --port 5005 --database
```

### `npx nup-app validate <name>`

Valida app antes de mover para monorepo.

**Verifica:**
- Config files
- Directory structure
- Package.json
- nup-app.config.json

**Exemplo:**
```bash
npx nup-app validate my-awesome-app
```

### `npx nup-app register <name>`

Registra app no monorepo (automático).

**Faz:**
- Atualiza pnpm-workspace.yaml
- Configura turbo.json
- Cria .env
- Valida app

**Opções:**
- `--skip-validation` - Pula validação

**Exemplo:**
```bash
npx nup-app register my-awesome-app
```

---

## 📦 Desenvolvendo com Shims

Quando você desenvolve standalone, o App Kit fornece **shims** para packages do monorepo:

```typescript
// No código (funciona standalone E no monorepo!)
import { Button, Card } from '@nup/app-kit/shims';

export function MyComponent() {
  return (
    <Card>
      <Button>Click me</Button>
    </Card>
  );
}
```

**Standalone:** Usa componentes básicos (shims)  
**Monorepo:** Usa componentes reais de `@nup/ui`

---

## 🎯 Casos de Uso

### Caso 1: App Simples (Sem Database)

```bash
# Criar
npx nup-app create nup-simple

cd nup-simple

# Desenvolver
npm install
npm run dev

# Mover para monorepo
cp -r ../nup-simple /monorepo/apps/
cd /monorepo
npx nup-app register nup-simple
pnpm install --filter nup-simple...
pnpm turbo run dev --filter nup-simple
```

### Caso 2: App Completo (Com Database)

```bash
# Criar com database
npx nup-app create nup-advanced --database

cd nup-advanced

# Configurar database no nup-app.config.json
# Editar schema em shared/

# Desenvolver
npm install
npm run dev

# Mover para monorepo
cp -r ../nup-advanced /monorepo/apps/
cd /monorepo
npx nup-app register nup-advanced
pnpm install --filter nup-advanced...

# Database será criado automaticamente
pnpm turbo run dev --filter nup-advanced
```

### Caso 3: Protótipo Rápido

```bash
# Criar protótipo
npx nup-app create nup-prototype

# Desenvolver SUPER rápido (standalone)
cd nup-prototype
npm install
npm run dev

# Testar, iterar, validar

# Quando pronto, mover para monorepo
# (Mesmo fluxo acima)
```

---

## 🚨 Troubleshooting

### Erro: "Template not found"

```bash
# Solução: Certifique-se que @nup/app-kit está instalado
pnpm add -w @nup/app-kit
```

### Erro: "App directory not found"

```bash
# Certifique-se de copiar o app para apps/
cp -r my-app /path/to/monorepo/apps/
```

### Erro: "Validation failed"

```bash
# Veja os erros e corrija
npx nup-app validate my-app

# Ou pule validação (não recomendado)
npx nup-app register my-app --skip-validation
```

### Dev server não inicia

```bash
# Instale dependências primeiro
npm install  # Standalone
pnpm install --filter my-app...  # Monorepo
```

---

## 📚 Estrutura de Arquivos

### App Standalone

```
my-app/
├── client/
│   ├── src/
│   │   ├── App.tsx           # App principal
│   │   ├── main.tsx          # Entry point
│   │   ├── index.css         # Tailwind
│   │   └── pages/
│   │       └── HomePage.tsx  # Home page
│   └── index.html
│
├── server/
│   ├── index.ts              # Express server
│   └── tsconfig.json
│
├── shared/                   # Tipos compartilhados
│
├── nup-app.config.json       # ✨ Metadata
├── package.json
├── vite.config.ts            # ✨ Usa @nup/app-kit
├── tailwind.config.ts        # ✨ Usa @nup/app-kit
├── tsconfig.json
├── .env.example
└── README.md
```

### @nup/app-kit Structure

```
packages/@nup/app-kit/
├── configs/
│   ├── vite.config.shared.js      # Vite base config
│   ├── tailwind.config.shared.js  # Tailwind base config
│   └── tsconfig.base.json         # TypeScript base config
│
├── shims/
│   └── index.ts                   # Mock packages
│
├── cli/
│   ├── index.js                   # CLI entry
│   └── commands/
│       ├── create.js              # Create command
│       ├── register.js            # Register command
│       └── validate.js            # Validate command
│
├── templates/
│   └── standalone-app/            # App template
│
├── index.ts                       # Main export
├── package.json
└── README.md
```

---

## 🎓 Próximos Passos

1. ✅ Criar primeiro app: `npx nup-app create my-first-app`
2. ✅ Desenvolver standalone: `npm run dev`
3. ✅ Mover para monorepo: `npx nup-app register my-first-app`
4. ✅ Criar mais apps rapidamente!

---

## 📖 Recursos

- [Documentação Completa](../../docs/APP_PLUG_AND_PLAY.md)
- [Template Source](./templates/standalone-app/)
- [CLI Source](./cli/)
- [Configs Compartilhados](./configs/)

---

**Happy coding!** 🚀
