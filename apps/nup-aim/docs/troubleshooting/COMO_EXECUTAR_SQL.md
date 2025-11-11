# 🔧 COMO EXECUTAR O SQL NO SUPABASE - PASSO A PASSO

## ❌ PROBLEMA
O erro "new row violates row-level security policy for table 'profiles'" acontece porque as políticas RLS estão muito restritivas.

## ✅ SOLUÇÃO

### Passo 1: Abrir o SQL Editor
1. No seu projeto Supabase, vá para **SQL Editor** (no menu lateral)
2. Clique em **New query**

### Passo 2: Copiar o SQL
1. Abra o arquivo `supabase/migrations/fix_rls_policies.sql`
2. Copie **TODO** o conteúdo do arquivo
3. Cole no SQL Editor do Supabase

### Passo 3: Executar
1. Clique em **RUN** (ou pressione Ctrl+Enter)
2. Aguarde a execução (pode demorar alguns segundos)
3. Verifique se apareceram os resultados no final

### Passo 4: Verificar Resultado
Você deve ver:

```
Perfis criados:
- Administrador (não padrão)
- Usuário Padrão (padrão)

Projetos criados:
- Sistema de Habilitações (padrão)

Usuários criados:
- admin | nuptechs@nuptechs.com | verificado | ativo | Administrador
```

## 🎯 TESTE DE LOGIN

Após executar o SQL:

1. **Acesse seu sistema NuP_AIM**
2. **Faça login com:**
   - **Usuário:** `admin`
   - **Senha:** `Senha@1010`
3. **Deve funcionar perfeitamente!**

## 🔍 O QUE O SCRIPT FAZ

1. **Desabilita RLS temporariamente** para inserir dados
2. **Limpa dados conflitantes** existentes
3. **Insere todos os dados necessários** (perfis, projeto, usuário admin)
4. **Reabilita RLS** com políticas corretas
5. **Permite leitura pública** dos dados básicos (necessário para login)

## 🚨 SE DER ERRO

### Erro: "permission denied"
- Verifique se você é o owner do projeto Supabase

### Erro: "relation does not exist"
- Execute primeiro o SQL de criação das tabelas

### Erro: "syntax error"
- Certifique-se de copiar TODO o conteúdo do arquivo

## ✅ VERIFICAÇÃO FINAL

1. **No Supabase:** Vá para Table Editor e verifique se as tabelas têm dados
2. **No Sistema:** Teste o login admin/Senha@1010
3. **Status:** Use "Gerenciar Dados" → "Status da Conexão" para verificar

## 🎉 RESULTADO

Após executar corretamente:
- ✅ Banco de dados funcionando
- ✅ Login admin/Senha@1010 funcionando
- ✅ Todas as funcionalidades disponíveis
- ✅ Sistema 100% operacional