# 🔧 Como Executar o SQL no Supabase - PASSO A PASSO

## ❌ ERRO COMUM
**NÃO execute:** `supabase/migrations/create_initial_schema.sql`
Isso é um nome de arquivo, não um comando SQL!

## ✅ FORMA CORRETA

### Passo 1: Abrir o SQL Editor
1. No seu projeto Supabase, vá para **SQL Editor** (no menu lateral)
2. Clique em **New query**

### Passo 2: Copiar o SQL Correto
Copie e cole este SQL completo no editor:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (perfis de acesso)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users table (usuários do sistema)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  is_active boolean DEFAULT true,
  is_email_verified boolean DEFAULT false,
  email_verification_token text,
  email_verification_expires timestamptz,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Projects table (projetos)
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  acronym text NOT NULL,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Analyses table (análises de impacto)
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  author text NOT NULL,
  version text DEFAULT '1.0',
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Processes table (funcionalidades impactadas)
CREATE TABLE IF NOT EXISTS processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('nova', 'alterada', 'excluida')),
  work_details text,
  screenshots text,
  websis_created boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Impacts table (impactos)
CREATE TABLE IF NOT EXISTS impacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('baixo', 'medio', 'alto', 'critico')),
  probability text NOT NULL CHECK (probability IN ('baixo', 'medio', 'alto')),
  category text NOT NULL CHECK (category IN ('business', 'technical', 'operational', 'financial')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Risks table (riscos)
CREATE TABLE IF NOT EXISTS risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE,
  description text NOT NULL,
  impact text NOT NULL CHECK (impact IN ('baixo', 'medio', 'alto', 'critico')),
  probability text NOT NULL CHECK (probability IN ('baixo', 'medio', 'alto')),
  mitigation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mitigations table (ações de mitigação)
CREATE TABLE IF NOT EXISTS mitigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE,
  action text NOT NULL,
  responsible text NOT NULL,
  deadline date,
  priority text NOT NULL CHECK (priority IN ('baixo', 'medio', 'alto')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Conclusions table (conclusões e recomendações)
CREATE TABLE IF NOT EXISTS conclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE,
  summary text,
  recommendations text[] DEFAULT '{}',
  next_steps text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mitigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conclusions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Profiles can be managed by admins"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN profiles p ON u.profile_id = p.id
      WHERE u.id = auth.uid()
      AND p.permissions::jsonb ? 'PROFILES_MANAGE'
    )
  );

-- RLS Policies for users
CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can be managed by admins"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN profiles p ON u.profile_id = p.id
      WHERE u.id = auth.uid()
      AND p.permissions::jsonb ? 'USERS_MANAGE'
    )
  );

-- RLS Policies for projects
CREATE POLICY "Projects are viewable by authenticated users"
  ON projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Projects can be managed by authorized users"
  ON projects
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN profiles p ON u.profile_id = p.id
      WHERE u.id = auth.uid()
      AND p.permissions::jsonb ? 'PROJECTS_MANAGE'
    )
  );

-- RLS Policies for analyses
CREATE POLICY "Analyses are viewable by authenticated users"
  ON analyses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Analyses can be created by authorized users"
  ON analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN profiles p ON u.profile_id = p.id
      WHERE u.id = auth.uid()
      AND p.permissions::jsonb ? 'ANALYSIS_CREATE'
    )
  );

CREATE POLICY "Analyses can be updated by authorized users"
  ON analyses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN profiles p ON u.profile_id = p.id
      WHERE u.id = auth.uid()
      AND (p.permissions::jsonb ? 'ANALYSIS_EDIT' OR created_by = auth.uid())
    )
  );

CREATE POLICY "Analyses can be deleted by authorized users"
  ON analyses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN profiles p ON u.profile_id = p.id
      WHERE u.id = auth.uid()
      AND p.permissions::jsonb ? 'ANALYSIS_DELETE'
    )
  );

-- RLS Policies for related tables (processes, impacts, risks, mitigations, conclusions)
CREATE POLICY "Processes inherit analysis permissions"
  ON processes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = analysis_id
    )
  );

CREATE POLICY "Impacts inherit analysis permissions"
  ON impacts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = analysis_id
    )
  );

CREATE POLICY "Risks inherit analysis permissions"
  ON risks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = analysis_id
    )
  );

CREATE POLICY "Mitigations inherit analysis permissions"
  ON mitigations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = analysis_id
    )
  );

CREATE POLICY "Conclusions inherit analysis permissions"
  ON conclusions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = analysis_id
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_profile_id ON users(profile_id);
CREATE INDEX IF NOT EXISTS idx_analyses_project_id ON analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_by ON analyses(created_by);
CREATE INDEX IF NOT EXISTS idx_processes_analysis_id ON processes(analysis_id);
CREATE INDEX IF NOT EXISTS idx_impacts_analysis_id ON impacts(analysis_id);
CREATE INDEX IF NOT EXISTS idx_risks_analysis_id ON risks(analysis_id);
CREATE INDEX IF NOT EXISTS idx_mitigations_analysis_id ON mitigations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_conclusions_analysis_id ON conclusions(analysis_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_processes_updated_at BEFORE UPDATE ON processes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_impacts_updated_at BEFORE UPDATE ON impacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mitigations_updated_at BEFORE UPDATE ON mitigations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conclusions_updated_at BEFORE UPDATE ON conclusions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Passo 3: Executar o SQL
1. Cole todo o SQL acima no editor
2. Clique em **RUN** (ou pressione Ctrl+Enter)
3. Aguarde a execução (pode demorar alguns segundos)

### Passo 4: Inserir Dados Iniciais
Após executar o SQL acima, execute este segundo SQL para inserir os dados iniciais:

```sql
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
  'admin123',
  'a0000000-0000-0000-0000-000000000001',
  true,
  true
);
```

## ✅ Verificação
Após executar ambos os SQLs, você deve ver:
- 9 tabelas criadas
- 1 usuário admin
- 2 perfis (Administrador e Usuário Padrão)
- 1 projeto padrão

## 🔧 Próximos Passos
1. Configure as variáveis de ambiente no seu projeto
2. Teste a conexão com o banco
3. Faça login com: **usuário:** `admin` **senha:** `admin123`