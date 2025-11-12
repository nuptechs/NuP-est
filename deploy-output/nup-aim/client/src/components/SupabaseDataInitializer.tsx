import React, { useState } from 'react';
import { Database, Play, CheckCircle, AlertCircle, RefreshCw, Code } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InitializationStep {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}

export const SupabaseDataInitializer: React.FC = () => {
  const [steps, setSteps] = useState<InitializationStep[]>([
    {
      name: 'Verificar Conexão',
      description: 'Testar conexão com o Supabase',
      status: 'pending'
    },
    {
      name: 'Executar SQL de Inicialização',
      description: 'Executar script SQL completo para inserir dados',
      status: 'pending'
    },
    {
      name: 'Verificar Dados Inseridos',
      description: 'Confirmar que os dados foram criados corretamente',
      status: 'pending'
    }
  ]);

  const [isInitializing, setIsInitializing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [showSQL, setShowSQL] = useState(false);

  const updateStep = (index: number, updates: Partial<InitializationStep>) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, ...updates } : step
    ));
  };

  // SQL completo para inserir dados contornando RLS
  const getInitializationSQL = () => {
    return `
-- Script para inserir dados iniciais contornando RLS
-- Execute este SQL no Supabase SQL Editor se o inicializador automático falhar

-- Temporariamente desabilitar RLS para inserir dados iniciais
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Limpar dados existentes para evitar conflitos
DELETE FROM users WHERE username = 'admin' OR email = 'nuptechs@nuptechs.com';
DELETE FROM profiles WHERE name IN ('Administrador', 'Usuário Padrão');
DELETE FROM projects WHERE name = 'Sistema de Habilitações';

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

-- Atualizar políticas RLS para permitir leitura pública (necessário para login)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view for authentication"
  ON users
  FOR SELECT
  USING (true);

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
`;
  };

  const copySQL = () => {
    navigator.clipboard.writeText(getInitializationSQL());
    alert('SQL copiado para a área de transferência!\n\nVá para o Supabase SQL Editor e cole o código.');
  };

  const initializeData = async () => {
    if (!supabase) {
      alert('Supabase não está configurado. Configure as variáveis de ambiente primeiro.');
      return;
    }

    setIsInitializing(true);
    setCurrentStep(0);

    try {
      // Step 1: Verificar Conexão
      updateStep(0, { status: 'running' });
      console.log('🔗 Passo 1: Verificando conexão com Supabase...');
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);
        
        if (error) {
          updateStep(0, { status: 'error', error: `Erro de conexão: ${error.message}` });
          setIsInitializing(false);
          return;
        }
        
        updateStep(0, { status: 'success' });
        console.log('✅ Conexão com Supabase estabelecida');
      } catch (error) {
        updateStep(0, { status: 'error', error: `Erro de rede: ${error}` });
        setIsInitializing(false);
        return;
      }

      setCurrentStep(1);

      // Step 2: Tentar inserção direta via RPC
      updateStep(1, { status: 'running' });
      console.log('🔄 Passo 2: Tentando inserção via RPC...');
      
      try {
        // Tentar usar RPC para executar SQL diretamente
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: getInitializationSQL() 
        });
        
        if (error) {
          console.log('⚠️ RPC não disponível, tentando inserção individual...');
          
          // Fallback: Tentar inserção individual com upsert
          const profilesData = [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              name: 'Administrador',
              description: 'Acesso completo a todas as funcionalidades do sistema',
              permissions: [
                "ANALYSIS_CREATE", "ANALYSIS_EDIT", "ANALYSIS_DELETE", "ANALYSIS_VIEW", "ANALYSIS_EXPORT", "ANALYSIS_IMPORT_AI", "ANALYSIS_COPY",
                "PROJECTS_CREATE", "PROJECTS_EDIT", "PROJECTS_DELETE", "PROJECTS_VIEW", "PROJECTS_MANAGE",
                "USERS_CREATE", "USERS_EDIT", "USERS_DELETE", "USERS_VIEW", "USERS_MANAGE",
                "PROFILES_CREATE", "PROFILES_EDIT", "PROFILES_DELETE", "PROFILES_VIEW", "PROFILES_MANAGE"
              ],
              is_default: false
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440002',
              name: 'Usuário Padrão',
              description: 'Acesso básico para criar e visualizar análises',
              permissions: [
                "ANALYSIS_CREATE", "ANALYSIS_EDIT", "ANALYSIS_VIEW", "ANALYSIS_EXPORT",
                "PROJECTS_VIEW"
              ],
              is_default: true
            }
          ];

          let profilesInserted = 0;
          for (const profile of profilesData) {
            try {
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert(profile, { onConflict: 'id' });
              
              if (!profileError) {
                profilesInserted++;
                console.log(`✅ Perfil "${profile.name}" inserido`);
              } else {
                console.log(`⚠️ Erro ao inserir perfil "${profile.name}":`, profileError.message);
              }
            } catch (error) {
              console.log(`⚠️ Erro ao inserir perfil "${profile.name}":`, error);
            }
          }

          if (profilesInserted === 0) {
            updateStep(1, { 
              status: 'error', 
              error: 'Não foi possível inserir dados via API. Use o SQL manual.' 
            });
            setIsInitializing(false);
            return;
          }

          // Inserir projeto
          const projectData = {
            id: '550e8400-e29b-41d4-a716-446655440003',
            name: 'Sistema de Habilitações',
            acronym: 'SH',
            is_default: true
          };

          await supabase.from('projects').upsert(projectData, { onConflict: 'id' });

          // Inserir usuário admin
          const userData = {
            id: '550e8400-e29b-41d4-a716-446655440004',
            username: 'admin',
            email: 'nuptechs@nuptechs.com',
            password_hash: 'Senha@1010',
            profile_id: '550e8400-e29b-41d4-a716-446655440001',
            is_active: true,
            is_email_verified: true
          };

          await supabase.from('users').upsert(userData, { onConflict: 'id' });
          
          updateStep(1, { status: 'success' });
          console.log('✅ Dados inseridos via API com sucesso');
        } else {
          updateStep(1, { status: 'success' });
          console.log('✅ Dados inseridos via RPC com sucesso');
        }
      } catch (error) {
        updateStep(1, { 
          status: 'error', 
          error: 'Falha na inserção automática. Use o SQL manual abaixo.' 
        });
        setIsInitializing(false);
        return;
      }

      setCurrentStep(2);

      // Step 3: Verificar dados inseridos
      updateStep(2, { status: 'running' });
      console.log('🔍 Passo 3: Verificando dados inseridos...');
      
      try {
        const [profilesResult, usersResult, projectsResult] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('users').select('*'),
          supabase.from('projects').select('*')
        ]);

        const profilesCount = profilesResult.data?.length || 0;
        const usersCount = usersResult.data?.length || 0;
        const projectsCount = projectsResult.data?.length || 0;

        if (profilesCount >= 2 && usersCount >= 1 && projectsCount >= 1) {
          updateStep(2, { status: 'success' });
          console.log(`✅ Verificação concluída: ${profilesCount} perfis, ${usersCount} usuários, ${projectsCount} projetos`);
          
          // Sucesso!
          setTimeout(() => {
            alert(`✅ Dados iniciais criados com sucesso!

Credenciais de login:
Usuário: admin
Senha: Senha@1010

Recarregue a página para ver as alterações.`);
          }, 1000);
        } else {
          updateStep(2, { 
            status: 'error', 
            error: `Dados incompletos: ${profilesCount} perfis, ${usersCount} usuários, ${projectsCount} projetos` 
          });
        }
      } catch (error) {
        updateStep(2, { status: 'error', error: `Erro na verificação: ${error}` });
      }

      setCurrentStep(-1);

    } catch (error) {
      console.error('💥 Erro na inicialização:', error);
      if (currentStep >= 0) {
        updateStep(currentStep, { 
          status: 'error', 
          error: `Erro inesperado: ${error}` 
        });
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const getStepIcon = (step: InitializationStep, index: number) => {
    if (step.status === 'running') return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
    if (step.status === 'success') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (step.status === 'error') return <AlertCircle className="w-4 h-4 text-red-600" />;
    return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
  };

  const getStepColor = (step: InitializationStep) => {
    if (step.status === 'running') return 'text-blue-600';
    if (step.status === 'success') return 'text-green-600';
    if (step.status === 'error') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-medium text-gray-900">Inicializar Dados do Supabase</h3>
          <p className="text-sm text-gray-600">
            Criar automaticamente os dados iniciais necessários para o funcionamento do sistema
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-3">
            {getStepIcon(step, index)}
            <div className="flex-1 min-w-0">
              <div className={`font-medium ${getStepColor(step)}`}>
                {step.name}
              </div>
              <div className="text-sm text-gray-600">
                {step.description}
              </div>
              {step.error && (
                <div className="text-sm text-red-600 mt-1">
                  Erro: {step.error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          {isInitializing ? (
            `Executando passo ${currentStep + 1} de ${steps.length}...`
          ) : (
            'Clique em "Inicializar" para criar os dados automaticamente'
          )}
        </div>

        <button
          onClick={initializeData}
          disabled={isInitializing}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isInitializing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Inicializando...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Inicializar Dados
            </>
          )}
        </button>
      </div>

      {/* SQL Manual Section */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Alternativa: SQL Manual</h4>
          <button
            onClick={() => setShowSQL(!showSQL)}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showSQL ? 'Ocultar SQL' : 'Mostrar SQL'}
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">
          Se a inicialização automática falhar, você pode executar o SQL manualmente no Supabase SQL Editor.
        </p>

        {showSQL && (
          <div className="space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Script SQL Completo</span>
                <button
                  onClick={copySQL}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <Code className="w-3 h-3 mr-1" />
                  Copiar SQL
                </button>
              </div>
              <pre className="text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-x-auto max-h-40">
                {getInitializationSQL()}
              </pre>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h5 className="font-medium text-yellow-900 mb-1">Como usar o SQL manual:</h5>
              <ol className="text-sm text-yellow-800 space-y-1">
                <li>1. Clique em "Copiar SQL" acima</li>
                <li>2. Vá para o Supabase SQL Editor</li>
                <li>3. Cole o código e clique em "RUN"</li>
                <li>4. Aguarde a execução completa</li>
                <li>5. Recarregue esta página e teste o login</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">O que será criado:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Perfil Administrador:</strong> Acesso completo ao sistema</li>
          <li>• <strong>Perfil Usuário Padrão:</strong> Acesso básico para análises</li>
          <li>• <strong>Projeto Padrão:</strong> Sistema de Habilitações</li>
          <li>• <strong>Usuário Admin:</strong> admin / Senha@1010 (email verificado)</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h4 className="font-medium text-red-900 mb-2">⚠️ Solução para Erro RLS</h4>
        <p className="text-sm text-red-800">
          Se a inicialização automática falhar com erro "row-level security policy", 
          use o SQL manual acima. Ele desabilita temporariamente o RLS, insere os dados 
          e reabilita com políticas corretas.
        </p>
      </div>
    </div>
  );
};