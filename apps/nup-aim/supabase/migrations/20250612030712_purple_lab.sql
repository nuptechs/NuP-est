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