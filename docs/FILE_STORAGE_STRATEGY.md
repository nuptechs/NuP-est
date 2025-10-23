# 📁 Estratégia de Armazenamento de Arquivos

## 🚨 Status Atual: DESENVOLVIMENTO (uploads/ local)

**Data:** Outubro 2025  
**Status da Migração:** Pendente (antes do deploy em produção)

---

## ⚠️ Problema Identificado

### Situação Atual
```
uploads/
├── editais/ .................. 12 PDFs
├── knowledge-base/ ........... 0 arquivos
├── materials/ ................ 0 arquivos
├── temp-files/ ............... 14 PDFs
└── Arquivos soltos ........... 6 PDFs

TOTAL: 32 arquivos (54 MB)
```

### O Problema
**A pasta `uploads/` local NÃO persiste no Replit após deploy!**

- ❌ Arquivos são deletados a cada restart/deploy
- ❌ Usuários perderão PDFs enviados
- ❌ Não escalável para produção

---

## ❌ Por Que NÃO Salvar no Banco de Dados?

### 1. Performance Horrível
- Queries SELECT ficam lentas com BLOBs
- Backup/restore demora horas
- Cache do banco fica poluído

### 2. Custos Altíssimos
- PDF de 5MB = 5MB no banco
- 1000 PDFs = 5GB de banco de dados
- Bancos cobram muito mais que object storage

### 3. Problemas Técnicos
- PostgreSQL limita BYTEA a ~1GB
- Memória RAM explode ao carregar arquivos
- Índices ficam ineficientes

### 4. Anti-Pattern
- Banco é para **dados estruturados**
- Arquivos são para **object storage**
- Misturar os dois é má prática reconhecida

---

## ✅ Solução Recomendada: Replit Object Storage

### Por Que Object Storage?

| Característica | uploads/ Local | PostgreSQL | Object Storage |
|----------------|----------------|------------|----------------|
| **Persiste deploy** | ❌ NÃO | ✅ Sim | ✅ Sim |
| **Performance** | ⚡ Rápida | 🐌 Lenta | ⚡ Muito rápida |
| **Custo (1GB)** | Grátis* | $$$$ | $ |
| **Escalabilidade** | ❌ Limitada | ❌ Ruim | ✅ Infinita |
| **CDN integrado** | ❌ Não | ❌ Não | ✅ Sim |
| **Backup** | ❌ Manual | ⚠️ Junto | ✅ Automático |

*Grátis mas SOME no restart!

### Benefícios do Replit Object Storage

✅ **Integração nativa** - Zero configuração manual  
✅ **Persistência garantida** - Arquivos nunca somem  
✅ **Performance** - CDN global integrado  
✅ **Custo** - Muito mais barato que banco  
✅ **Escalável** - GB → TB sem problemas  
✅ **API simples** - 3 linhas de código

---

## 🏗️ Arquitetura Recomendada

### Como Funciona

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ Usuário     │────▶│ Backend      │────▶│ Object       │
│ envia PDF   │     │ (Express)    │     │ Storage ☁️   │
└─────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ PostgreSQL   │
                    │ (metadados)  │
                    └──────────────┘
```

### O Que Salvar Onde

#### PostgreSQL (Metadados)
```typescript
{
  id: 1,
  name: "edital-concurso-2025.pdf",
  storageUrl: "https://storage.replit.com/abc123",
  size: 5242880,
  uploadedAt: "2025-10-23T10:00:00Z",
  userId: 42,
  type: "application/pdf"
}
```

#### Object Storage (Arquivos Binários)
- PDFs dos editais
- Materiais de estudo (DOC, DOCX)
- Imagens enviadas pelos usuários
- Qualquer arquivo > 1MB

---

## 📋 Timeline de Migração

### AGORA (Desenvolvimento) ✅
- ✅ Manter `uploads/` local
- ✅ Funciona bem para testes
- ✅ Continuar desenvolvendo features

### ANTES DE PUBLICAR (Deploy) ⚠️
- [ ] Adicionar blueprint "App Storage" (Replit Object Storage)
- [ ] Migrar código de upload para Object Storage
- [ ] Atualizar schema do banco (adicionar `storageUrl`)
- [ ] Testar upload/download com arquivos reais
- [ ] Documentar API de storage

### DEPOIS DE PUBLICAR ✅
- Arquivos persistem entre restarts
- Usuários não perdem PDFs
- App escalável e profissional

---

## 🔧 Implementação (Quando Migrar)

### 1. Adicionar Integração
```bash
# Usar ferramenta de integrações do Replit
# Blueprint: "App Storage" (javascript_object_storage)
```

### 2. Atualizar Schema
```typescript
// shared/schema.ts
export const materials = pgTable('materials', {
  id: serial('id').primaryKey(),
  name: varchar('name').notNull(),
  storageUrl: varchar('storage_url').notNull(), // URL do Object Storage
  size: integer('size').notNull(),
  type: varchar('type').notNull(),
  userId: integer('user_id').references(() => users.id),
  uploadedAt: timestamp('uploaded_at').defaultNow()
});
```

### 3. Código de Upload
```typescript
// server/routes.ts
import { storage } from '@replit/object-storage';

app.post('/api/upload', async (req, res) => {
  const file = req.file; // multer
  
  // Upload para Object Storage
  const key = `materials/${Date.now()}-${file.originalname}`;
  await storage.upload(key, file.buffer);
  
  // Salvar metadados no banco
  const material = await db.insert(materials).values({
    name: file.originalname,
    storageUrl: key,
    size: file.size,
    type: file.mimetype,
    userId: req.user.id
  });
  
  res.json({ success: true, id: material.id });
});
```

---

## 📊 Comparação de Custos (Exemplo)

### Cenário: 1000 usuários, 10 PDFs cada (5MB cada)
- **Total de storage**: 50GB

| Solução | Custo Mensal | Performance | Backup |
|---------|--------------|-------------|--------|
| **PostgreSQL** | ~$500/mês | 🐌 Lenta | ⚠️ Difícil |
| **Object Storage** | ~$1-2/mês | ⚡ Rápida | ✅ Fácil |

**Economia: ~$498/mês** 💰

---

## 🎯 Decisão Final

### Para Desenvolvimento
✅ **Usar `uploads/` local** - Simples e funciona bem

### Para Produção
✅ **Usar Replit Object Storage** - Escalável, barato, confiável

### NUNCA
❌ **Salvar binários no PostgreSQL** - Anti-pattern, caro, lento

---

## 📚 Referências

- [Replit Object Storage Docs](https://docs.replit.com/hosting/storing-data-with-object-storage)
- [Best Practices: File Storage](https://docs.replit.com/hosting/deployments/about-deployments#ephemeral-filesystem)
- [Why Not Store Files in Database](https://stackoverflow.com/questions/3748/storing-images-in-db-yea-or-nay)

---

*Documento criado em: Outubro 2025*  
*Status: Aguardando migração antes do deploy em produção*
