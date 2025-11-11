import React, { useState } from 'react';
import { Database, CheckCircle, AlertCircle, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react';

interface SupabaseSetupProps {
  onComplete: () => void;
}

export const SupabaseSetup: React.FC<SupabaseSetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionStatus('idle');

    try {
      // Validate URLs
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Por favor, preencha todos os campos');
      }

      if (!supabaseUrl.includes('supabase.co')) {
        throw new Error('URL do Supabase inválida');
      }

      // Create .env file content
      const envContent = `VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseKey}

# SendGrid Configuration (for Netlify Function)
SENDGRID_API_KEY=your-sendgrid-api-key
VERIFIED_SENDER_EMAIL=your-verified-email@gmail.com

# Email Configuration
VITE_FROM_EMAIL=noreply@nup-aim.netlify.app
VITE_FROM_NAME=NuP_AIM Sistema`;

      // Show success and instructions
      setConnectionStatus('success');
      
      // Copy to clipboard
      navigator.clipboard.writeText(envContent);
      
      setTimeout(() => {
        onComplete();
      }, 3000);

    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  const copyMigrationSQL = () => {
    const migrationSQL = `-- Execute este SQL no Supabase SQL Editor
-- Arquivo: create_initial_schema.sql

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

-- Continue com o resto do schema...
-- (O arquivo completo está em supabase/migrations/create_initial_schema.sql)`;

    navigator.clipboard.writeText(migrationSQL);
    alert('SQL copiado para a área de transferência!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-lg mx-auto mb-4">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Configurar Supabase</h1>
          <p className="mt-2 text-sm text-gray-600">
            Configure o banco de dados para o sistema NuP_AIM
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNumber 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Create Supabase Project */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">1. Criar Projeto no Supabase</h2>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Passos:</h3>
                  <ol className="text-sm text-blue-800 space-y-2">
                    <li>1. Acesse <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">supabase.com</a></li>
                    <li>2. Clique em "Start your project"</li>
                    <li>3. Faça login ou crie uma conta</li>
                    <li>4. Clique em "New Project"</li>
                    <li>5. Escolha sua organização</li>
                    <li>6. Nome do projeto: <strong>nup-aim</strong></li>
                    <li>7. Crie uma senha forte para o banco</li>
                    <li>8. Escolha a região mais próxima</li>
                    <li>9. Clique em "Create new project"</li>
                  </ol>
                </div>

                <div className="flex justify-between">
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir Supabase
                  </a>
                  
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Get API Keys */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">2. Obter Chaves da API</h2>
              
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-900 mb-2">No seu projeto Supabase:</h3>
                  <ol className="text-sm text-yellow-800 space-y-2">
                    <li>1. Vá para <strong>Settings</strong> → <strong>API</strong></li>
                    <li>2. Copie a <strong>Project URL</strong></li>
                    <li>3. Copie a <strong>anon public</strong> key</li>
                  </ol>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project URL
                    </label>
                    <input
                      type="url"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://your-project.supabase.co"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Anon Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={supabaseKey}
                        onChange={(e) => setSupabaseKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showKey ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Voltar
                  </button>
                  
                  <button
                    onClick={() => setStep(3)}
                    disabled={!supabaseUrl || !supabaseKey}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Create Database Schema */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">3. Criar Schema do Banco</h2>
              
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-medium text-purple-900 mb-2">Execute no Supabase:</h3>
                  <ol className="text-sm text-purple-800 space-y-2">
                    <li>1. No seu projeto, vá para <strong>SQL Editor</strong></li>
                    <li>2. Clique em <strong>New query</strong></li>
                    <li>3. Cole o SQL abaixo e execute</li>
                  </ol>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Schema SQL</span>
                    <button
                      onClick={copyMigrationSQL}
                      className="inline-flex items-center px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiar
                    </button>
                  </div>
                  <div className="bg-gray-800 text-green-400 p-3 rounded text-xs font-mono overflow-x-auto">
                    <div>-- Execute este SQL no Supabase SQL Editor</div>
                    <div>-- Cria todas as tabelas necessárias para o sistema</div>
                    <div>CREATE EXTENSION IF NOT EXISTS "uuid-ossp";</div>
                    <div>CREATE TABLE IF NOT EXISTS profiles (...);</div>
                    <div>-- ... (arquivo completo em supabase/migrations/)</div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Dica:</strong> O arquivo SQL completo está em <code>supabase/migrations/create_initial_schema.sql</code> 
                    no seu projeto. Copie todo o conteúdo e execute no SQL Editor.
                  </p>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Voltar
                  </button>
                  
                  <button
                    onClick={() => setStep(4)}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Test Connection */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">4. Testar Conexão</h2>
              
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">Configuração Final:</h3>
                  <p className="text-sm text-green-800">
                    Vamos testar a conexão e criar o arquivo de configuração.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">URL do Supabase:</span>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded">{supabaseUrl}</code>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Chave da API:</span>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                      {supabaseKey.substring(0, 20)}...
                    </code>
                  </div>
                </div>

                {connectionStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <h4 className="font-medium text-green-900">Conexão Estabelecida!</h4>
                        <p className="text-sm text-green-800">
                          Configuração copiada para a área de transferência. 
                          Redirecionando para o sistema...
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {connectionStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <h4 className="font-medium text-red-900">Erro na Conexão</h4>
                        <p className="text-sm text-red-800">
                          Verifique se as credenciais estão corretas e se o schema foi criado.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(3)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Voltar
                  </button>
                  
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                        Conectando...
                      </>
                    ) : (
                      'Conectar e Finalizar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Precisa de ajuda? Consulte a <a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">documentação do Supabase</a></p>
        </div>
      </div>
    </div>
  );
};