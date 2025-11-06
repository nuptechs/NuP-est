/*
  # Dados iniciais do sistema NuP_AIM

  1. Perfis padrão
    - Administrador (acesso completo)
    - Usuário Padrão (acesso básico)

  2. Projeto padrão
    - Projeto exemplo para começar

  3. Usuário administrador
    - admin/admin123 com email verificado
*/

-- Insert default profiles
INSERT INTO profiles (id, name, description, permissions, is_default) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
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
  'a0000000-0000-0000-0000-000000000002',
  'Usuário Padrão',
  'Acesso básico para criar e visualizar análises',
  '[
    "ANALYSIS_CREATE", "ANALYSIS_EDIT", "ANALYSIS_VIEW", "ANALYSIS_EXPORT",
    "PROJECTS_VIEW"
  ]'::jsonb,
  true
);

-- Insert default project
INSERT INTO projects (id, name, acronym, is_default) VALUES
(
  'p0000000-0000-0000-0000-000000000001',
  'Sistema de Habilitações',
  'SH',
  true
);

-- Insert admin user
INSERT INTO users (
  id,
  username,
  email,
  password_hash,
  profile_id,
  is_active,
  is_email_verified
) VALUES (
  'u0000000-0000-0000-0000-000000000001',
  'admin',
  'admin@nup-aim.com',
  'admin123', -- In production, this should be properly hashed
  'a0000000-0000-0000-0000-000000000001',
  true,
  true
);