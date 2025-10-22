# 🎯 NuP-est - Sistema de Análise de Editais

> **Sistema inteligente que extrai cargos e conhecimentos de editais de concurso automaticamente**

## 📋 O Que Faz

- ⬆️ **Upload de editais** em PDF
- 🤖 **Extração automática** de informações importantes  
- 👨‍💼 **Lista de cargos** com requisitos e salários
- 📚 **Conhecimentos organizados** por disciplinas
- 📊 **Acompanhamento em tempo real** do processamento

## 🏗️ Arquitetura Simples

O sistema funciona em **2 passos**:

### **Passo 1: Processamento** 🔄
1. Usuário envia PDF
2. Sistema externo "quebra" em pedaços
3. Pedaços viram coordenadas no Pinecone

### **Passo 2: Análise** 🤖  
1. Sistema pergunta: "onde estão os cargos?"
2. Sistema pergunta: "onde estão os conhecimentos?"
3. IA organiza as informações
4. Usuário recebe tudo pronto!

## 📁 Organização do Código

```
server/
├── 🛣️ routes/          # ROTAS DA API
│   ├── edital.ts       # Upload e gerenciar editais
│   ├── editalRAG.ts    # Busca com RAG/IA
│   └── rag.ts          # Sistema de busca
│
├── 🔧 services/        # LÓGICA DE NEGÓCIO
│   ├── newEditalService.ts    # Processamento de editais
│   ├── editalRAG.ts           # Análise com RAG
│   ├── pinecone.ts            # Banco vetorial
│   ├── ai.ts                  # Serviços de IA
│   └── rag.ts                 # Sistema RAG
│
├── 🔌 integrations/     # CONECTORES EXTERNOS
│   └── external-processor.ts  # Processador externo
│
├── ⚙️ core/            # CONFIGURAÇÕES
│   ├── types.ts         # Formatos dos dados
│   └── status.ts        # Estados dos editais
│
└── 🗄️ storage.ts      # Interface de dados
```

## 🚀 Como Usar

### **Desenvolvimento**
```bash
npm run dev
```

### **Upload de Edital**
```bash
curl -X POST http://localhost:5000/api/edital/upload \
  -F "file=@edital.pdf"
```

### **Verificar Status**
```bash
curl http://localhost:5000/api/edital/{id}/status
```

## 🔧 Configuração

### **Variáveis de Ambiente**
```env
PINECONE_API_KEY=sua_chave_aqui
OPENAI_API_KEY=sua_chave_aqui
EXTERNAL_PROCESSOR_URL=http://localhost:8000
DATABASE_URL=sua_url_do_banco
```

## 📊 Estados de um Edital

1. **⬆️ uploaded** - Arquivo recebido
2. **🔄 indexing** - Sistema externo processando
3. **📚 indexed** - Indexado no Pinecone  
4. **🤖 analyzing** - IA analisando
5. **✅ completed** - Pronto!

## ❗ Problemas Comuns

| Problema | Causa | Solução |
|----------|-------|---------|
| "Não encontrou informações" | IDs duplicados | Gerar ID único por documento |
| "Erro no JSON" | IA não retorna formato correto | Parser mais flexível |
| "Timeout" | IA demora para responder | Dividir em queries menores |

## 📞 Logs Importantes

Procure por estes símbolos:
- ✅ = Sucesso
- ❌ = Erro  
- 🔍 = Buscando
- 🤖 = IA trabalhando
- 📚 = Dados encontrados

## 📖 Documentação Completa

### 📚 Central de Documentação
Toda a documentação técnica está organizada na pasta **[docs/](./docs/)**:

- **[Índice Geral](./docs/README.md)** - Navegação completa por toda a documentação
- **[Visão Geral do Sistema](./docs/SYSTEM_OVERVIEW.md)** - Funcionalidades e arquitetura completa
- **[Arquitetura Técnica](./docs/arquitetura-atual.md)** - Detalhes de implementação
- **[Como Funciona](./docs/como-funciona.md)** - Explicação simplificada dos fluxos
- **[Integrações Técnicas](./docs/integrations-technical.md)** - OpenAI, Pinecone, Document AI
- **[Análise de Gaps](./docs/GAPS_ANALYSIS.md)** - Gaps conhecidos e melhorias

### 🔧 Para Desenvolvedores
Arquivos principais do código:
- `server/routes/edital.ts` - Endpoints de upload e gerenciamento
- `server/services/newEditalService.ts` - Lógica principal de processamento
- `server/services/editalRAG.ts` - Análise inteligente com RAG
- `server/services/pinecone.ts` - Conexão com banco vetorial

## 🤝 Para Não-Desenvolvedores

Este sistema foi organizado para ser **fácil de entender**:

- **Nomes claros** - cada arquivo tem um nome que explica o que faz
- **Comentários simples** - explicações em português claro  
- **Documentação visual** - diagramas e exemplos
- **Logs amigáveis** - mensagens que fazem sentido

Não tenha medo de explorar o código! 🚀