# 📚 Documentação das Integracões - NuP-est

## 📖 Índice da Documentação

Esta pasta contém a documentação completa de todas as integrações utilizadas na plataforma NuP-est. Use os links abaixo para navegar entre os diferentes documentos:

### 📋 Documentos Principais

| Documento | Descrição | Público-Alvo |
|-----------|-----------|--------------|
| **[Integracões da Aplicação](./INTEGRACOES_APLICACAO.md)** | Documentação técnica completa de todas as integrações | Desenvolvedores |
| **[Diagramas Detalhados](./DIAGRAMAS_DETALHADOS.md)** | Diagramas de arquitetura e fluxos de dados | Arquitetos/Desenvolvedores |
| **[Resumo Executivo](./RESUMO_EXECUTIVO_INTEGRACOES.md)** | Visão estratégica e valor de negócio | Gestores/Stakeholders |

---

## 🔍 Navegação Rápida por Categoria

### 🧠 Inteligência Artificial
- [OpenRouter Provider](./INTEGRACOES_APLICACAO.md#1-openrouter)
- [Google Generative AI](./INTEGRACOES_APLICACAO.md#2-google-generative-ai)
- [DeepSeek R1 Service](./INTEGRACOES_APLICACAO.md#3-deepseek-r1-service)
- [RAG Service](./INTEGRACOES_APLICACAO.md#-integracão-rag-retrieval-augmented-generation)

### 💾 Bancos de Dados
- [PostgreSQL (Neon)](./INTEGRACOES_APLICACAO.md#1-postgresql-neon-database)
- [Pinecone Vector Database](./INTEGRACOES_APLICACAO.md#2-pinecone-vector-database)

### 🔐 Autenticação
- [Replit Auth (OpenID Connect)](./INTEGRACOES_APLICACAO.md#replit-auth-openid-connect)

### 📄 Processamento de Arquivos
- [Upload Configuration (Multer)](./INTEGRACOES_APLICACAO.md#1-multer)
- [PDF Processing](./INTEGRACOES_APLICACAO.md#2-pdf-processing)
- [DOCX Processing](./INTEGRACOES_APLICACAO.md#3-docx-processing)
- [Excel/CSV Processing](./INTEGRACOES_APLICACAO.md#4-excelcsv-processing)

### 🌐 Serviços Externos
- [External Processing Service](./INTEGRACOES_APLICACAO.md#1-external-processing-service)
- [Web Scraping](./INTEGRACOES_APLICACAO.md#2-web-scraping)

### 🎨 Frontend
- [TanStack Query](./INTEGRACOES_APLICACAO.md#1-tanstack-query-react-query)
- [Wouter Router](./INTEGRACOES_APLICACAO.md#2-wouter)
- [shadcn/ui + Radix](./INTEGRACOES_APLICACAO.md#3-shadcnui--radix-ui)

---

## 📊 Diagramas Principais

### Arquitetura Geral
```
Frontend (React) ↔ Backend (Express.js) ↔ External Services
```
📁 [Ver diagrama completo](./DIAGRAMAS_DETALHADOS.md#-diagrama-de-interações-completo)

### Fluxo de Processamento de Arquivos
```
Upload → Validation → Processing → AI Analysis → Vector Indexing
```
📁 [Ver pipeline detalhado](./DIAGRAMAS_DETALHADOS.md#-pipeline-de-processamento-de-arquivos)

### Sistema RAG
```
Query → Embedding → Vector Search → Context → AI Response
```
📁 [Ver fluxo RAG completo](./DIAGRAMAS_DETALHADOS.md#-fluxo-rag-completo-com-contexto-do-usuário)

---

## ⚙️ Configuração Rápida

### Variáveis de Ambiente Essenciais
```bash
# AI Services
OPENROUTER_API_KEY=sk-or-...
GOOGLE_AI_API_KEY=...
PINECONE_API_KEY=...

# Database
DATABASE_URL=postgresql://...

# Authentication
REPLIT_DOMAINS=...
SESSION_SECRET=...
```

📁 [Ver configuração completa](./RESUMO_EXECUTIVO_INTEGRACOES.md#-configuração-necessária)

---

## 📈 Métricas e Performance

| Métrica | Valor | Integração |
|---------|-------|------------|
| Busca Semântica | < 100ms | Pinecone |
| Geração AI | < 3s | OpenRouter |
| Upload Max | 12MB | Multer |
| Session TTL | 7 dias | Express Session |

📁 [Ver métricas detalhadas](./RESUMO_EXECUTIVO_INTEGRACOES.md#-métricas-de-performance)

---

## 🔧 Troubleshooting

### Problemas Comuns

1. **Erro de API Key**
   - Verificar variáveis de ambiente
   - Validar chaves com providers

2. **Timeout de Upload**
   - Verificar limite de 12MB
   - Validar formato de arquivo

3. **Falha na Busca Vetorial**
   - Verificar conexão Pinecone
   - Validar dimensões de embedding

📁 [Ver guia completo de troubleshooting](./INTEGRACOES_APLICACAO.md#-variáveis-de-ambiente-necessárias)

---

## 🚀 Roadmap

### Próximas Integrações
- [ ] Stripe (Pagamentos)
- [ ] Twilio (Notificações)
- [ ] SendGrid (Email)
- [ ] Google Analytics
- [ ] Sentry (Monitoramento)

📁 [Ver roadmap completo](./RESUMO_EXECUTIVO_INTEGRACOES.md#-checklist-de-integração)

---

## 📞 Suporte

Para dúvidas técnicas sobre as integrações:

1. **Consulte primeiro** os documentos desta pasta
2. **Verifique** os logs de aplicação
3. **Validar** configurações de ambiente
4. **Testar** conectividade com serviços externos

---

*Documentação atualizada em: 18 de Setembro de 2025*
*Estrutura da documentação: v1.0*