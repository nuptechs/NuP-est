# 🗂️ Índice Visual da Documentação

## 📊 Mapa de Navegação Rápida

```
docs/
│
├── 🎯 COMEÇAR AQUI
│   ├── README.md ........................... Índice geral completo
│   └── SYSTEM_OVERVIEW.md .................. Visão geral do sistema
│
├── 🏗️ ARQUITETURA
│   ├── arquitetura-atual.md ................ Arquitetura técnica detalhada
│   └── DIAGRAMAS_DETALHADOS.md ............. Diagramas e fluxos visuais
│
├── 🔌 INTEGRAÇÕES
│   ├── integrations-technical.md ........... Status das integrações externas
│   ├── INTEGRACOES_APLICACAO.md ............ Documentação completa
│   └── RESUMO_EXECUTIVO_INTEGRACOES.md ..... Resumo executivo
│
├── 🔄 FLUXOS E PROCESSOS
│   └── como-funciona.md .................... Explicação simplificada (Chat vs Flashcards)
│
├── 🛠️ DESENVOLVIMENTO
│   ├── README-ErrorSystem.md ............... Sistema de tratamento de erros
│   └── GAPS_ANALYSIS.md .................... Análise de gaps e melhorias
│
└── 📌 ESTE ARQUIVO
    └── INDICE.md ........................... Você está aqui!
```

---

## 🎯 Guia por Persona

### 👨‍💻 Você é um Desenvolvedor Novo?
**Caminho recomendado:**
1. 📖 [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - Entenda o que o sistema faz
2. 🏗️ [arquitetura-atual.md](./arquitetura-atual.md) - Entenda como funciona
3. 🔄 [como-funciona.md](./como-funciona.md) - Veja fluxos práticos (chat e flashcards)
4. 🔌 [integrations-technical.md](./integrations-technical.md) - Conheça as integrações
5. 🛠️ [README-ErrorSystem.md](./README-ErrorSystem.md) - Aprenda a tratar erros

### 🔧 Você está Fazendo Manutenção?
**Caminho recomendado:**
1. 🛠️ [GAPS_ANALYSIS.md](./GAPS_ANALYSIS.md) - Veja gaps conhecidos
2. 🔌 [integrations-technical.md](./integrations-technical.md) - Status atual das integrações
3. 🏗️ [arquitetura-atual.md](./arquitetura-atual.md) - Arquitetura de referência
4. 📊 [DIAGRAMAS_DETALHADOS.md](./DIAGRAMAS_DETALHADOS.md) - Fluxos visuais

### 🐛 Você está Debugando?
**Caminho recomendado:**
1. 🔄 [como-funciona.md](./como-funciona.md) - Entenda o fluxo completo
2. 📊 [DIAGRAMAS_DETALHADOS.md](./DIAGRAMAS_DETALHADOS.md) - Visualize os fluxos
3. 🔌 [integrations-technical.md](./integrations-technical.md) - Verifique status das integrações
4. 🛠️ [README-ErrorSystem.md](./README-ErrorSystem.md) - Sistema de erros

### 📊 Você é Gestor/Stakeholder?
**Caminho recomendado:**
1. 📖 [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - Visão geral completa
2. 📊 [RESUMO_EXECUTIVO_INTEGRACOES.md](./RESUMO_EXECUTIVO_INTEGRACOES.md) - Resumo executivo
3. 🛠️ [GAPS_ANALYSIS.md](./GAPS_ANALYSIS.md) - Gaps e roadmap

---

## 📚 Documentos por Tipo

### 📖 Documentação Conceitual
- **SYSTEM_OVERVIEW.md** - O que o sistema faz e como está organizado
- **como-funciona.md** - Explicação simplificada com comparações visuais

### 🏗️ Documentação de Arquitetura
- **arquitetura-atual.md** - Estrutura técnica backend/frontend
- **DIAGRAMAS_DETALHADOS.md** - Diagramas e fluxos de dados

### 🔌 Documentação de Integrações
- **integrations-technical.md** - Status técnico (OpenAI, Pinecone, Document AI)
- **INTEGRACOES_APLICACAO.md** - Documentação completa de todas as integrações
- **RESUMO_EXECUTIVO_INTEGRACOES.md** - Visão de negócio

### 🛠️ Documentação de Desenvolvimento
- **README-ErrorSystem.md** - Como usar o sistema de erros
- **GAPS_ANALYSIS.md** - Gaps conhecidos e melhorias planejadas

---

## 🔍 Busca Rápida por Tópico

### IA e Machine Learning
- **OpenAI/OpenRouter**: [integrations-technical.md](./integrations-technical.md#-openaiOpenRouter-production-ready)
- **Circuit Breaker**: [integrations-technical.md](./integrations-technical.md#circuit-breaker-com-half_open-enforcement)
- **Rate Limiting**: [integrations-technical.md](./integrations-technical.md#rate-limit-handling-robusto)
- **Assistente Personalizado**: [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md#assistente-ia-personalizado)

### Banco de Dados
- **PostgreSQL/Neon**: [INTEGRACOES_APLICACAO.md](./INTEGRACOES_APLICACAO.md#1-postgresql-neon-database)
- **Pinecone Vector DB**: [integrations-technical.md](./integrations-technical.md#-pinecone-migrado--melhorado)
- **RAG Service**: [INTEGRACOES_APLICACAO.md](./INTEGRACOES_APLICACAO.md#-integracão-rag-retrieval-augmented-generation)

### Frontend
- **React + TypeScript**: [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md#-stack-tecnológico)
- **TanStack Query**: [INTEGRACOES_APLICACAO.md](./INTEGRACOES_APLICACAO.md#1-tanstack-query-react-query)
- **shadcn/ui**: [INTEGRACOES_APLICACAO.md](./INTEGRACOES_APLICACAO.md#3-shadcnui--radix-ui)

### Fluxos de Dados
- **Chat Flow**: [como-funciona.md](./como-funciona.md#-chat)
- **Flashcard Generation**: [como-funciona.md](./como-funciona.md#-fluxo-gerar-flashcards-a-partir-de-material)
- **Comparação Chat vs Flashcards**: [como-funciona.md](./como-funciona.md#-comparação-chat-vs-flashcards)

### Erros e Debugging
- **Sistema de Erros**: [README-ErrorSystem.md](./README-ErrorSystem.md)
- **Gaps Conhecidos**: [GAPS_ANALYSIS.md](./GAPS_ANALYSIS.md)
- **Troubleshooting**: [README.md](./README.md#-troubleshooting)

---

## 📅 Última Atualização

**Outubro 2025** - Reorganização completa da documentação

### Mudanças Recentes
- ✅ Todos os arquivos informativos movidos para `docs/`
- ✅ Criado índice geral em `README.md`
- ✅ Adicionado `INDICE.md` com navegação visual
- ✅ Documentação de fluxos (chat e flashcards)
- ✅ Status atualizado das integrações

---

## 🚀 Próximos Passos

Depois de ler a documentação, você pode:

1. **Contribuir** - Melhorar a documentação existente
2. **Reportar** - Adicionar novos gaps ao GAPS_ANALYSIS.md
3. **Atualizar** - Manter a documentação sincronizada com o código
4. **Expandir** - Adicionar novos diagramas e exemplos

---

*Documentação organizada para máxima clareza e facilidade de navegação* ✨
