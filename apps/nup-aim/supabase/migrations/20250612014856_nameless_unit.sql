/*
  # Inserir dados iniciais com UUIDs válidos

  1. Dados Iniciais
    - Perfis: Administrador e Usuário Padrão
    - Projeto padrão: Sistema de Habilitações
    - Usuário admin com email verificado

  2. UUIDs Corrigidos
    - Usando gen_random_uuid() ou UUIDs válidos
    - Formato correto: 8-4-4-4-12 caracteres hexadecimais
*/

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