# NuP App Bootstrap Script - Guia Completo

Script para criar apps NuP standalone prontos para desenvolvimento e futura migração ao monorepo.

## 🚀 Uso Rápido

### No Novo Repl

1. **Crie um novo Repl no Replit** (template Node.js)
2. **Copie o script** para o Repl:
   ```bash
   curl -o bootstrap.sh https://raw.githubusercontent.com/.../bootstrap-nup-app.sh
   # OU copie manualmente do monorepo
   ```
3. **Execute:**
   ```bash
   bash bootstrap.sh
   ```

### Parâmetros

```bash
bash bootstrap-nup-app.sh [APP_NAME] [PORT] [USE_DATABASE]
```

- **APP_NAME** (default: `nup-dev`) - Nome do app
- **PORT** (default: `5004`) - Porta do servidor
- **USE_DATABASE** (default: `yes`) - Incluir configuração de database (`yes`/`no`)

### Exemplos

```bash
# Uso básico (defaults: nup-dev, porta 5004, com database)
bash bootstrap-nup-app.sh

# Customizado
bash bootstrap-nup-app.sh nup-meuapp 5005 yes

# Sem database
bash bootstrap-nup-app.sh nup-simples 5006 no
```

## 📦 O Que o Script Cria

### Estrutura Completa
```
nup-dev/
├── package.json              # Dependências standalone
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite dev server
├── tailwind.config.ts       # Tailwind CSS
├── postcss.config.js        # PostCSS
├── drizzle.config.ts        # Database (se USE_DATABASE=yes)
├── .gitignore               
├── client/
│   ├── index.html
│   └── src/
│       ├── main.tsx         # Entry point
│       ├── App.tsx          # Router setup
│       ├── index.css        # Global styles com tema shadcn/ui
│       ├── pages/
│       │   └── HomePage.tsx # Página inicial
│       ├── components/      # Seus componentes
│       └── lib/
│           └── queryClient.ts # TanStack Query configurado
├── server/
│   └── index.ts            # Express + Vite integration
└── shared/
    └── schema.ts           # Drizzle schemas (ou Zod se no-db)
```

### Tecnologias Incluídas

**Frontend:**
- ⚛️ React 18 + TypeScript
- 🎨 Tailwind CSS + tema shadcn/ui completo
- 🛣️ Wouter (routing leve)
- 🔄 TanStack Query v5 (data fetching)
- ⚡ Vite (dev server + HMR)

**Backend:**
- 🚀 Express.js
- 🗄️ Drizzle ORM + Neon (se database)
- 📝 TypeScript ESM

**Dev Tools:**
- 🔧 ESBuild (production build)
- 🎯 TypeScript strict mode
- 🔥 Replit integrations (error modal, cartographer)

## 💻 Desenvolvimento

Após executar o script:

```bash
# 1. Inicie o dev server
npm run dev

# 2. Abra no browser
# http://localhost:5004 (ou a porta escolhida)

# 3. Comece a desenvolver!
# Edite: client/src/pages/HomePage.tsx
```

### Comandos Disponíveis

```bash
npm run dev         # Desenvolvimento com Vite + Express
npm run build       # Build produção (frontend + backend)
npm run start       # Inicia servidor produção
npm run type-check  # Verifica tipos TypeScript
npm run db:push     # Push schema para database (se --database)
```

## 🔄 Migração para Monorepo

Quando o app estiver pronto para integração:

```bash
# 1. No Repl do monorepo easy-nup
cd /home/runner/workspace

# 2. Copie o app standalone
cp -r /path/to/nup-dev apps/

# 3. Registre no monorepo (CLI do app-kit)
npx nup-app register nup-dev

# 4. Instale dependências workspace
pnpm install --filter nup-dev...

# 5. Pronto! 🎉
```

O comando `register` automaticamente:
- ✅ Converte `npm` → `pnpm`
- ✅ Atualiza deps para `workspace:*`
- ✅ Adiciona ao `pnpm-workspace.yaml`
- ✅ Configura aliases para @nup/* packages
- ✅ Registra no Turborepo

## 📋 Casos de Uso

### 1. App Simples (Landing Page)
```bash
bash bootstrap-nup-app.sh nup-landing 5007 no
cd nup-landing
npm run dev
```

**Ideal para:**
- Landing pages
- Sites estáticos
- Protótipos rápidos

### 2. App com Database (Dashboard)
```bash
bash bootstrap-nup-app.sh nup-dashboard 5008 yes
cd nup-dashboard
export DATABASE_URL="postgresql://..."
npm run db:push
npm run dev
```

**Ideal para:**
- Dashboards
- CRUDs
- Apps com persistência

### 3. Múltiplos Apps Standalone
```bash
# Auth service
bash bootstrap-nup-app.sh nup-auth 5001 yes

# Analytics
bash bootstrap-nup-app.sh nup-analytics 5002 yes

# Admin panel
bash bootstrap-nup-app.sh nup-admin 5003 yes
```

**Ideal para:**
- Microservices
- Arquitetura Multi-Repl
- Desenvolvimento distribuído

## 🎨 Customização

### Adicionar shadcn/ui Components

O app já vem com o tema shadcn/ui. Para adicionar componentes:

```bash
# Não funciona standalone (sem CLI do shadcn)
# MAS você pode copiar componentes manualmente de:
# https://ui.shadcn.com/docs/components

# OU melhor: migre para o monorepo e use @nup/ui!
```

### Configurar Database

```bash
# 1. Crie database no Neon/Supabase/etc
# 2. Configure URL
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# 3. Edite shared/schema.ts
# 4. Push schema
npm run db:push
```

### Adicionar Rotas

```tsx
// client/src/App.tsx
import { Route, Switch } from "wouter";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage"; // Crie este arquivo

export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/about" component={AboutPage} />
      <Route>404 - Página não encontrada</Route>
    </Switch>
  );
}
```

## 🐛 Troubleshooting

### Porta em uso
```bash
# Use outra porta
bash bootstrap-nup-app.sh nup-dev 5005 yes
```

### Database connection error
```bash
# Verifique DATABASE_URL
echo $DATABASE_URL

# Configure se necessário
export DATABASE_URL="postgresql://..."
npm run db:push
```

### TypeScript errors
```bash
# Limpe e reinstale
rm -rf node_modules package-lock.json
npm install
```

### Build fails
```bash
# Verifique logs
npm run build

# Common issue: ESM vs CJS
# Certifique-se que package.json tem "type": "module"
```

## 📊 Comparação: Standalone vs Monorepo

| Aspecto | Standalone | Monorepo |
|---------|-----------|----------|
| **Setup** | 30 segundos | Já configurado |
| **Deps Install** | ~1 minuto | ~10 segundos |
| **Dev Speed** | Rápido | Médio (mais código) |
| **Shared Code** | ❌ Não | ✅ Sim (@nup/ui, etc) |
| **Build** | Simples | Turborepo |
| **Deploy** | Manual | CI/CD ready |
| **Ideal para** | Protótipos, MVPs | Produção, escala |

## 🎯 Quando Usar Cada Abordagem

### Use Standalone Quando:
- 🚀 Prototipando ideia nova
- ⚡ Precisa de velocidade máxima
- 🧪 Experimentando tecnologia
- 📦 App não precisa de shared code

### Migre para Monorepo Quando:
- ✅ MVP validado
- 🔄 Precisa compartilhar código
- 📈 Vai escalar
- 🎨 Quer usar @nup/ui components
- 🔐 Precisa de autenticação centralizada

## 💡 Dicas Profissionais

1. **Sempre use porta única** (5004, 5005, etc)
2. **Configure .env local** (não commite secrets!)
3. **Teste build antes de migrar** (`npm run build`)
4. **Use Git desde o início** (facilita migração)
5. **Documente decisões** em README local

## 🚀 Próximos Passos

Após criar seu app:

1. ✅ **Desenvolva standalone** até MVP funcional
2. ✅ **Teste localmente** (`npm run build` + `npm start`)
3. ✅ **Migre para monorepo** quando pronto
4. ✅ **Deploy via Multi-Repl** architecture

---

**Happy coding! 🎉**

Para mais informações:
- `docs/MIGRATION_TO_APP_KIT.md` - Guia de migração
- `replit.md` - Arquitetura do monorepo
