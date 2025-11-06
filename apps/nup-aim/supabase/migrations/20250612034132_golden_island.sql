-- Script para corrigir políticas RLS e permitir inserção de dados iniciais
-- Execute este SQL no Supabase SQL Editor

-- Temporariamente desabilitar RLS para inserir dados iniciais
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Limpar dados existentes para evitar conflitos
DELETE FROM users;
DELETE FROM profiles;
DELETE FROM projects;

-- Inserir perfis padrão
INSERT INTO profiles (id, name, description, permissions, is_default, created_at, updated_at) VALUES
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
  false,
  now(),
  now()
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Usuário Padrão',
  'Acesso básico para criar e visualizar análises',
  '[
    "ANALYSIS_CREATE", "ANALYSIS_EDIT", "ANALYSIS_VIEW", "ANALYSIS_EXPORT",
    "PROJECTS_VIEW"
  ]'::jsonb,
  true,
  now(),
  now()
);

-- Inserir projeto padrão
INSERT INTO projects (id, name, acronym, is_default, created_at, updated_at) VALUES
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Sistema de Habilitações',
  'SH',
  true,
  now(),
  now()
);

-- Inserir usuário admin
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
  '550e8400-e29b-41d4-a716-446655440004',
  'admin',
  'nuptechs@nuptechs.com',
  'Senha@1010',
  '550e8400-e29b-41d4-a716-446655440001',
  true,
  true,
  now(),
  now()
);

-- Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Atualizar as políticas RLS para permitir acesso público aos dados básicos
-- (necessário para o funcionamento do sistema)

-- Política mais permissiva para profiles (leitura pública)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

-- Política mais permissiva para users (necessária para login)
DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view for authentication"
  ON users
  FOR SELECT
  USING (true);

-- Política mais permissiva para projects (leitura pública)
DROP POLICY IF EXISTS "Projects are viewable by authenticated users" ON projects;
CREATE POLICY "Projects are viewable by everyone"
  ON projects
  FOR SELECT
  USING (true);

-- Verificar se os dados foram inseridos corretamente
SELECT 'Perfis criados:' as info;
SELECT id, name, is_default FROM profiles ORDER BY name;

SELECT 'Projetos criados:' as info;
SELECT id, name, acronym, is_default FROM projects ORDER BY name;

SELECT 'Usuários criados:' as info;
SELECT 
  u.id,
  u.username,
  u.email,
  u.is_email_verified,
  u.is_active,
  p.name as profile_name
FROM users u
JOIN profiles p ON u.profile_id = p.id
ORDER BY u.username;