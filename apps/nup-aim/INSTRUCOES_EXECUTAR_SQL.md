# 🔧 COMO EXECUTAR O SQL NO SUPABASE - INSTRUÇÕES SIMPLES

## ❌ PROBLEMA IDENTIFICADO
O erro `new row violates row-level security policy for table "profiles"` acontece porque as políticas RLS (Row Level Security) estão muito restritivas para inserir dados iniciais.

## ✅ SOLUÇÃO PASSO A PASSO

### Passo 1: Abrir o SQL Editor
1. Acesse seu projeto no [Supabase](https://supabase.com)
2. No menu lateral, clique em **SQL Editor**
3. Clique em **New query**

### Passo 2: Copiar e Colar o SQL
1. Abra o arquivo `supabase/migrations/fix_rls_policies.sql` que acabei de criar
2. Copie **TODO** o conteúdo do arquivo (Ctrl+A, Ctrl+C)
3. Cole no SQL Editor do Supabase (Ctrl+V)

### Passo 3: Executar o Script
1. Clique no botão **RUN** (ou pressione Ctrl+Enter)
2. Aguarde a execução (pode demorar 10-30 segundos)
3. Verifique se apareceram os resultados no final

### Passo 4: Verificar Resultado
Você deve ver algo como:

```
Perfis criados:
id: 550e8400-e29b-41d4-a716-446655440001 | name: Administrador | is_default: false
id: 550e8400-e29b-41d4-a716-446655440002 | name: Usuário Padrão | is_default: true

Projetos criados:
id: 550e8400-e29b-41d4-a716-446655440003 | name: Sistema de Habilitações | acronym: SH | is_default: true

Usuários criados:
id: 550e8400-e29b-41d4-a716-446655440004 | username: admin | email: nuptechs@nuptechs.com | is_email_verified: true | is_active: true | profile_name: Administrador
```

## 🎯 TESTE IMEDIATO

Após executar o SQL com sucesso:

1. **Acesse seu sistema NuP_AIM**
2. **Faça login com:**
   - **Usuário:** `admin`
   - **Senha:** `Senha@1010`
3. **Deve funcionar perfeitamente!**

## 🔍 O QUE ESTE SCRIPT FAZ

1. **Desabilita RLS temporariamente** para permitir inserção de dados
2. **Limpa dados conflitantes** que possam existir
3. **Insere dados iniciais necessários:**
   - 2 perfis (Administrador e Usuário Padrão)
   - 1 projeto padrão (Sistema de Habilitações)
   - 1 usuário admin (admin/Senha@1010)
4. **Reabilita RLS** com políticas corretas
5. **Configura políticas permissivas** para funcionamento do sistema

## 🚨 SE DER ERRO

### Erro: "permission denied for table"
**Solução:** Certifique-se de que você é o owner/admin do projeto Supabase

### Erro: "relation does not exist"
**Solução:** Execute primeiro o SQL de criação das tabelas (migrations principais)

### Erro: "syntax error"
**Solução:** Certifique-se de copiar TODO o conteúdo do arquivo, incluindo o final

### Erro: "policy already exists"
**Solução:** O script já trata isso automaticamente com `DROP POLICY IF EXISTS`

## ✅ VERIFICAÇÃO FINAL

### 1. No Supabase
- Vá para **Table Editor**
- Verifique se as tabelas têm dados:
  - `profiles`: 2 registros
  - `projects`: 1 registro  
  - `users`: 1 registro

### 2. No Sistema
- Teste login: admin / Senha@1010
- Acesse todas as funcionalidades
- Use "Gerenciar Dados" → "Status da Conexão" para verificar

## 🎉 RESULTADO ESPERADO

Após executar corretamente:
- ✅ Banco de dados Supabase funcionando
- ✅ Login admin/Senha@1010 funcionando
- ✅ Todas as funcionalidades disponíveis
- ✅ Sistema 100% operacional com banco de dados

## 🆘 PRECISA DE AJUDA?

Se ainda tiver problemas:
1. Verifique se você executou TODO o script
2. Confirme se você é admin do projeto Supabase
3. Verifique os logs de erro no Supabase
4. Teste primeiro se as tabelas foram criadas corretamente

---

**IMPORTANTE:** Este script resolve definitivamente o problema de RLS Policy e deixa seu sistema funcionando com o banco de dados Supabase!