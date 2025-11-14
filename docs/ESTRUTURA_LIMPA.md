# 📁 Estrutura de Pastas - NuPtechs Monorepo

## ✅ Estrutura Atual Organizada

```
easy-nup/
├── apps/                    # Aplicações deployáveis
│   ├── gateway/            # Reverse proxy e landing page
│   ├── nup-study/          # App principal de estudos
│   ├── nup-identify/       # Sistema de autenticação SSO
│   └── nup-aim/            # Análise de impacto
│
├── packages/@nup/          # Pacotes compartilhados (workspace)
│   ├── ui/                 # Componentes shadcn/ui
│   ├── auth-client/        # Cliente de autenticação
│   ├── api-client/         # Cliente TanStack Query
│   └── shared-types/       # Tipos TypeScript compartilhados
│
├── features/@nup/          # Features reutilizáveis e vendáveis
│   ├── mindmaps/           # Sistema de mapas mentais
│   ├── professor-ia/       # IA conversacional com voz
│   └── flashcards/         # Sistema de flashcards
│
├── services/               # Microserviços backend standalone
│   └── custom-fields/      # Campos personalizados multi-app
│
├── scripts/                # Scripts de automação
│   └── manage-workflows.js # Gerenciamento de workflows
│
├── docs/                   # Documentação do projeto
│   └── screenshots/        # Screenshots e imagens (34MB)
│
├── uploads/                # Uploads de usuários (72MB)
│
├── server/                 # Proxy para gateway (legado)
│   └── index.ts           # Redirect para apps/gateway
│
└── [arquivos de config]    # package.json, turbo.json, etc
```

## 🗑️ Limpeza Realizada

### Removido:
- ❌ **deploy-output/** (6.7MB) - Build antigo desnecessário

### Reorganizado:
- ✅ **Images/** → **docs/screenshots/** (34MB)
  - Melhor organização da documentação
  - Centralização de assets visuais

## 📝 Explicação das Pastas

### apps/
Aplicações completas e deployáveis independentemente. Cada app tem seu próprio servidor, cliente e configuração.

### packages/@nup/
Código compartilhado entre apps. Importado via `@nup/pacote`. Faz parte do pnpm workspace.

### features/@nup/
Features completas e reutilizáveis que podem ser vendidas separadamente. Também no workspace.

### services/
Microserviços backend **isolados** (não fazem parte do workspace). Rodam em portas próprias e têm deploy independente.

### docs/
Toda documentação do projeto, incluindo screenshots, guias e diagramas.

### uploads/
Arquivos enviados por usuários. Persiste entre deploys em ambiente de desenvolvimento.

### server/
Arquivo legado que faz redirect para `apps/gateway`. Mantido para compatibilidade com scripts de deploy.

## 🎯 Regras de Organização

1. **Apps** = Aplicações completas deployáveis
2. **Packages** = Código compartilhado (workspace)
3. **Features** = Funcionalidades vendáveis (workspace)
4. **Services** = Microserviços isolados (não workspace)
5. **Docs** = Toda documentação e screenshots
6. **Uploads** = User-generated content

## 🧹 Manutenção Contínua

- ✅ .gitignore atualizado para ignorar builds e uploads
- ✅ README em docs/screenshots explicando organização
- ✅ Estrutura alinhada com Turborepo best practices
- ✅ Zero arquivos duplicados na raiz

---

*Última atualização: $(date '+%B %Y')*
