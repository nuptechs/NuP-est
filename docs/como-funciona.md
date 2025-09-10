# 🎯 Como o Sistema NuP-est Funciona

**Para pessoas não-técnicas** - Explicação simples de como o sistema analisa editais

## 📋 O Que o Sistema Faz

O NuP-est pega **editais de concurso em PDF** e extrai automaticamente:
- 👨‍💼 **Nomes dos cargos** disponíveis
- 📚 **Conhecimentos necessários** para estudar
- 📊 **Disciplinas organizadas** por tópicos

## 🔄 Como Funciona (2 Passos Simples)

### **Passo 1: Upload e Processamento** ⬆️
1. Você envia um arquivo PDF do edital
2. Sistema externo "quebra" o PDF em pedaços pequenos
3. Cada pedaço vira "coordenadas" no Pinecone (banco de dados especial)

### **Passo 2: Busca e Análise** 🤖
1. Sistema pergunta ao Pinecone: "onde estão os cargos?"
2. Sistema pergunta ao Pinecone: "onde estão os conhecimentos?"
3. IA analisa as respostas e organiza as informações
4. Você recebe tudo organizadinho!

## 📁 Como o Código Está Organizado

```
server/
├── 🛣️ routes/          # ROTAS DA API
│   ├── edital.ts       # ⬆️ Upload e gerenciar editais
│   ├── editalRAG.ts    # 🔍 Busca com RAG/IA
│   └── rag.ts          # 📚 Sistema de busca
│
├── 🔧 services/        # LÓGICA DE NEGÓCIO
│   ├── newEditalService.ts    # 🤖 Processamento de editais
│   ├── editalRAG.ts           # 🔍 Análise com RAG
│   ├── pinecone.ts            # 📚 Banco vetorial
│   ├── ai.ts                  # 🧠 Serviços de IA
│   └── rag.ts                 # 📖 Sistema RAG
│
├── 🔌 integrations/    # CONECTORES EXTERNOS
│   └── external-processor.ts  # 🌐 Processador externo
│
├── ⚙️ core/           # CONFIGURAÇÕES
│   ├── types.ts        # 📋 Formatos dos dados
│   └── status.ts       # 📊 Status dos editais
│
└── 🗄️ storage.ts      # 💾 Interface de dados
```

## 🚦 Estados de um Edital

Cada edital passa por estes passos:

1. **⬆️ uploaded** - Arquivo recebido
2. **🔄 indexing** - Sistema externo processando  
3. **📚 indexed** - Indexado no Pinecone
4. **🤖 analyzing** - IA analisando conteúdo
5. **✅ completed** - Pronto! Informações extraídas

## ❗ Problemas Comuns

### "Não encontrou informações"
- **Causa**: Sistema externo usando IDs duplicados
- **Solução**: Gerar ID único para cada documento

### "Erro no JSON"
- **Causa**: IA não retorna formato esperado
- **Solução**: Parser mais flexível + extração manual

### "Timeout na análise"
- **Causa**: IA demora para responder
- **Solução**: Dividir em queries menores

## 🔧 Onde Olhar Quando Algo Dá Errado

- **Upload falha**: `server/routes/edital.ts` e `server/services/newEditalService.ts`
- **Análise falha**: `server/services/editalRAG.ts`  
- **Busca falha**: `server/services/rag.ts`
- **IA falha**: `server/services/ai.ts`
- **Pinecone falha**: `server/services/pinecone.ts`

## 📞 Logs Que Importam

Procure por estes símbolos nos logs:
- ✅ = Sucesso
- ❌ = Erro  
- 🔍 = Buscando informações
- 🤖 = IA trabalhando
- 📚 = Dados encontrados