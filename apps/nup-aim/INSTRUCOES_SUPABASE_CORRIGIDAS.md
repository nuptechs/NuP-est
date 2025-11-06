# 🔧 INSTRUÇÕES CORRIGIDAS - Como Executar o SQL no Supabase

## ❌ PROBLEMA IDENTIFICADO
O erro `sintaxe de entrada inválida para o tipo uuid` acontece porque os UUIDs que usei não estavam no formato correto.

## ✅ SOLUÇÃO

### Passo 1: Execute o Schema Principal
No **SQL Editor** do Supabase, execute o SQL que cria as tabelas (este já deve ter funcionado):

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- [Todo o SQL de criação das tabelas que já funcionou]
```

### Passo 2: Execute os Dados Iniciais CORRIGIDOS
Agora execute este SQL com UUIDs válidos:

```sql
-- Insert default profiles with valid UUIDs
INSERT INTO profiles (id, name, description, permissions, is_default) VALUES
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Administrador',
  'Acesso completo a todas as funcionalidades do sistema',
  '[
    "ANALYSIS_CREATE", "ANALYSIS_EDIT", "ANALYSIS_DELETE", "ANALYSIS_VIEW", "ANALYSIS_EXPORT", "ANALYSIS_IMPORT_AI", "ANALYSIS_COPY",
    "PROJECTS_CREATE", "PROJECTS_EDIT", "PROJECTS_DELETE", "PROJECTS_VIEW", "PROJECTS_MANAGE",
    "USERS_CREATE", "USERS_EDIT", "USERS_DELETE", "USERS_VIEW", "USERS_MANAGE",
    "PROFILES_CREATE", "PROFILES_EDIT", "PROFILES_DELETE", "PROFILES_VIEW", "PROFILES_MANAGE"
  ]'::jsonb,
  false
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Usuário Padrão',
  'Acesso básico para criar e visualizar análises',
  '[
    "ANALYSIS_CREATE", "ANALYSIS_EDIT", "ANALYSIS_VIEW", "ANALYSIS_EXPORT",
    "PROJECTS_VIEW"
  ]'::jsonb,
  true
);

-- Insert default project with valid UUID
INSERT INTO projects (id, name, acronym, is_default) VALUES
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Sistema de Habilitações',
  'SH',
  true
);

-- Insert admin user with valid UUID
INSERT INTO users (
  id,
  username,
  email,
  password_hash,
  profile_id,
  is_active,
  is_email_verified
) VALUES (
  '550e8400-e29b-41d4-a716-446655440004',
  'admin',
  'admin@nup-aim.com',
  'admin123',
  '550e8400-e29b-41d4-a716-446655440001',
  true,
  true
);
```

## 🎯 O que mudou?
- **Antes:** `'p0000000-0000-0000-0000-00000000001'` ❌ (formato inválido)
- **Agora:** `'550e8400-e29b-41d4-a716-446655440001'` ✅ (formato válido)

## ✅ Verificação
Após executar o SQL corrigido, você deve ver:
- ✅ 2 perfis criados (Administrador e Usuário Padrão)
- ✅ 1 projeto padrão (Sistema de Habilitações)
- ✅ 1 usuário admin criado

## 🔑 Login de Teste
- **Usuário:** `admin`
- **Senha:** `admin123`

## 📋 Formato UUID Válido
UUIDs devem seguir o padrão: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- 8 caracteres hexadecimais
- hífen
- 4 caracteres hexadecimais
- hífen
- 4 caracteres hexadecimais
- hífen
- 4 caracteres hexadecimais
- hífen
- 12 caracteres hexadecimais

## 🚀 Próximos Passos
1. Execute o SQL corrigido acima
2. Configure as variáveis de ambiente (.env)
3. Teste o login no sistema
4. Verifique se todas as funcionalidades estão funcionando