-- Script para corrigir o problema do usuário admin duplicado
-- Execute este SQL no Supabase SQL Editor

-- 1. Remover usuário admin existente (se houver)
DELETE FROM users WHERE username = 'admin';

-- 2. Verificar se os perfis existem
SELECT id, name FROM profiles ORDER BY name;

-- 3. Inserir o novo usuário admin com as credenciais corretas
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
  gen_random_uuid(),
  'admin',
  'nuptechs@nuptechs.com',
  'Senha@1010',
  (SELECT id FROM profiles WHERE name = 'Administrador' LIMIT 1),
  true,
  true,
  now(),
  now()
);

-- 4. Verificar se o usuário foi criado corretamente
SELECT 
  u.id,
  u.username,
  u.email,
  u.is_email_verified,
  u.is_active,
  p.name as profile_name
FROM users u
JOIN profiles p ON u.profile_id = p.id
WHERE u.username = 'admin';

-- 5. Mostrar todos os usuários para verificação
SELECT 
  u.username,
  u.email,
  u.is_email_verified,
  p.name as profile_name
FROM users u
JOIN profiles p ON u.profile_id = p.id
ORDER BY u.created_at;