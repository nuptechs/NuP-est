# 🚨 Lembretes CRÍTICOS Antes do Lançamento

**LEIA ISTO antes de abrir o app para usuários reais!**

---

## ⚠️ #1 MIGRAR UPLOADS PARA OBJECT STORAGE

### Status Atual
- ✅ Desenvolvimento: `uploads/` local funciona
- ❌ Produção: `uploads/` é **EFÊMERA** (arquivos somem!)

### O Que Acontece Se NÃO Migrar?
1. Usuário envia PDF de edital
2. Você faz `republish` para atualizar código
3. **PDF é DELETADO** 🗑️
4. Usuário vê erro 404 ao tentar acessar

### ✅ Checklist de Migração
**Completar ANTES de ter usuários reais:**

- [ ] **1. Adicionar Replit Object Storage**
  - Blueprint: "App Storage" (javascript_object_storage)
  - Documentação: [FILE_STORAGE_STRATEGY.md](./FILE_STORAGE_STRATEGY.md)

- [ ] **2. Atualizar Schema do Banco**
  ```typescript
  // shared/schema.ts
  export const materials = pgTable('materials', {
    // ... outros campos
    storageUrl: varchar('storage_url').notNull(), // NOVO!
  });
  ```

- [ ] **3. Migrar Código de Upload**
  - Trocar `fs.writeFile` por `storage.upload()`
  - Salvar URL no banco em vez de path local
  - Ver exemplos em [FILE_STORAGE_STRATEGY.md](./FILE_STORAGE_STRATEGY.md)

- [ ] **4. Testar Persistência**
  - Upload PDF
  - Fazer `republish`
  - Verificar que PDF ainda está acessível ✅

- [ ] **5. Avisar o Time**
  - Storage migrado e testado
  - Pronto para usuários reais

### Tempo Estimado
- **1-2 horas** de trabalho
- **Bloqueador crítico** para lançamento

---

## 📋 Outros Lembretes Pré-Lançamento

### Segurança
- [ ] Validar uploads (tamanho máximo, tipos permitidos)
- [ ] Verificar autenticação em todas as rotas
- [ ] Testar permissões (usuário só vê próprios arquivos)

### Performance
- [ ] Testar com arquivos grandes (>10MB)
- [ ] Verificar tempo de upload/download
- [ ] Confirmar que CDN está ativo (Object Storage)

### Monitoramento
- [ ] Configurar logs de erro
- [ ] Adicionar analytics básico
- [ ] Testar fluxo completo end-to-end

### Documentação
- [ ] README para usuários finais
- [ ] FAQ sobre upload de arquivos
- [ ] Suporte/contato visível

---

## 🎯 Quando Começar?

**Gatilho:** Você está planejando lançar para primeiros usuários reais

**Recomendação:** Reserve 1 dia para migração + testes antes do lançamento

---

## 📞 Precisa de Ajuda?

1. Leia: [FILE_STORAGE_STRATEGY.md](./FILE_STORAGE_STRATEGY.md)
2. Exemplo completo de código incluído
3. Documentação Replit Object Storage

---

**🚨 NÃO IGNORE ESTE LEMBRETE!**

Sem essa migração, você vai ter usuários **muito frustrados** perdendo arquivos. 😤

---

*Criado em: 23/10/2025*  
*Prioridade: CRÍTICA antes de usuários reais*
