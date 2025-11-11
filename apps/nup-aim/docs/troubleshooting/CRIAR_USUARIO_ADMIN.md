# 🔧 Como Criar o Usuário Admin no Supabase

## 📋 RESUMO

Este script criará o usuário admin com:
- **Usuário:** `admin`
- **Email:** `nuptechs@nuptechs.com`
- **Senha:** `Senha@1010`
- **Email verificado:** ✅ SIM
- **Perfil:** Administrador (acesso completo)

## 🚀 PASSO A PASSO

### Passo 1: Acessar o Supabase
1. Vá para [supabase.com](https://supabase.com)
2. Entre no seu projeto
3. Clique em **SQL Editor** no menu lateral

### Passo 2: Executar o Script
1. Clique em **New query**
2. Cole o SQL abaixo:

```sql
-- Script para criar usuário admin com email nuptechs@nuptechs.com
-- Execute este SQL no Supabase SQL Editor

-- Primeiro, vamos verificar se o usuário admin já existe e removê-lo se necessário
DELETE FROM users WHERE username = 'admin' OR email = 'nuptechs@nuptechs.com';

-- Inserir o usuário admin com as credenciais especificadas
INSERT INTO users (
  id,
  username,
  email,
  password_hash,
  profile_id,
  is_active,
  is_email_verified,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440010',
  'admin',
  'nuptechs@nuptechs.com',
  'Senha@1010',
  '550e8400-e29b-41d4-a716-446655440001', -- ID do perfil Administrador
  true,
  true, -- Email já verificado
  now(),
  now()
);

-- Verificar se o usuário foi criado corretamente
SELECT 
  u.username,
  u.email,
  u.is_email_verified,
  u.is_active,
  p.name as profile_name
FROM users u
JOIN profiles p ON u.profile_id = p.id
WHERE u.username = 'admin';
```

### Passo 3: Executar
1. Clique em **RUN** (ou pressione Ctrl+Enter)
2. Aguarde a execução
3. Verifique se apareceu o resultado da consulta final

### Passo 4: Verificar Resultado
Você deve ver uma linha com:
- **username:** admin
- **email:** nuptechs@nuptechs.com
- **is_email_verified:** true
- **is_active:** true
- **profile_name:** Administrador

## ✅ TESTE DE LOGIN

Após executar o script:

1. **Acesse seu sistema NuP_AIM**
2. **Faça login com:**
   - **Usuário:** `admin`
   - **Senha:** `Senha@1010`
3. **Deve funcionar perfeitamente!**

## 🔍 VERIFICAÇÃO ADICIONAL

Se quiser verificar se tudo está correto, execute esta consulta no SQL Editor:

```sql
-- Verificar todos os dados do usuário admin
SELECT 
  u.*,
  p.name as profile_name,
  p.permissions
FROM users u
JOIN profiles p ON u.profile_id = p.id
WHERE u.username = 'admin';
```

## 🚨 PROBLEMAS COMUNS

### Erro: "duplicate key value violates unique constraint"
**Causa:** Já existe um usuário com esse username ou email
**Solução:** O script já remove usuários duplicados automaticamente

### Erro: "foreign key constraint"
**Causa:** Perfil Administrador não existe
**Solução:** Execute primeiro as migrations principais que criam os perfis

### Erro: "relation does not exist"
**Causa:** Tabelas não foram criadas
**Solução:** Execute primeiro o SQL de criação das tabelas

## 📝 NOTAS IMPORTANTES

1. **Senha em texto simples:** Em produção real, as senhas devem ser criptografadas (hash). Este é um exemplo para demonstração.

2. **Email verificado:** O usuário admin já tem o email marcado como verificado, então não precisa de verificação.

3. **Perfil Administrador:** Tem acesso completo a todas as funcionalidades do sistema.

4. **UUID fixo:** Usei um UUID fixo para facilitar referências futuras.

## 🎯 PRÓXIMOS PASSOS

1. **Execute o script**
2. **Teste o login**
3. **Configure as variáveis de ambiente** (se ainda não fez)
4. **Teste todas as funcionalidades**
5. **Crie outros usuários conforme necessário**

## 🆘 PRECISA DE AJUDA?

Se tiver problemas:
1. Verifique se as tabelas foram criadas (migrations executadas)
2. Verifique se os perfis existem
3. Consulte os logs de erro no Supabase
4. Teste primeiro com o usuário admin padrão (admin/admin123)