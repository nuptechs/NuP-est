import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertCircle, RefreshCw, Settings, Info } from 'lucide-react';
import { supabase, getSupabaseStatus } from '../lib/supabase';
import { SupabaseDataInitializer } from './SupabaseDataInitializer';

interface ConnectionStatus {
  supabaseConfigured: boolean;
  supabaseConnected: boolean;
  tablesExist: boolean;
  dataExists: boolean;
  error?: string;
  details?: {
    profiles: number;
    users: number;
    projects: number;
  };
  environment?: {
    mode: string;
    hostname: string;
    url: string;
    keyLength: number;
  };
}

export const SupabaseConnectionChecker: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    supabaseConfigured: false,
    supabaseConnected: false,
    tablesExist: false,
    dataExists: false
  });
  const [isChecking, setIsChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showInitializer, setShowInitializer] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    const newStatus: ConnectionStatus = {
      supabaseConfigured: false,
      supabaseConnected: false,
      tablesExist: false,
      dataExists: false
    };

    try {
      console.log('🔍 Iniciando verificação do Supabase...');
      
      // Get detailed Supabase status
      const supabaseStatus = getSupabaseStatus();
      console.log('📊 Status do Supabase:', supabaseStatus);
      
      newStatus.environment = {
        mode: supabaseStatus.environment,
        hostname: supabaseStatus.hostname,
        url: supabaseStatus.url,
        keyLength: supabaseStatus.keyLength
      };

      // Check if Supabase is configured
      if (!supabaseStatus.configured) {
        console.log('❌ Supabase não configurado');
        newStatus.error = `Supabase não configurado. URL: ${supabaseStatus.url.substring(0, 30)}..., Key length: ${supabaseStatus.keyLength}`;
        setStatus(newStatus);
        setIsChecking(false);
        return;
      }

      newStatus.supabaseConfigured = true;
      console.log('✅ Supabase configurado');

      if (!supabase) {
        console.log('❌ Cliente Supabase não inicializado');
        newStatus.error = 'Cliente Supabase não inicializado';
        setStatus(newStatus);
        setIsChecking(false);
        return;
      }

      // Test connection with a simple query
      console.log('🔗 Testando conexão básica...');
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('❌ Erro de conexão:', testError);
        newStatus.error = `Erro de conexão: ${testError.message}`;
        setStatus(newStatus);
        setIsChecking(false);
        return;
      }

      newStatus.supabaseConnected = true;
      newStatus.tablesExist = true;
      console.log('✅ Conexão estabelecida e tabelas existem');

      // Check if data exists with more detailed queries
      console.log('📊 Verificando dados nas tabelas...');
      
      // Check profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) {
        console.error('❌ Erro ao buscar perfis:', profilesError);
        newStatus.error = `Erro ao verificar perfis: ${profilesError.message}`;
        setStatus(newStatus);
        setIsChecking(false);
        return;
      }

      // Check users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');
      
      if (usersError) {
        console.error('❌ Erro ao buscar usuários:', usersError);
        newStatus.error = `Erro ao verificar usuários: ${usersError.message}`;
        setStatus(newStatus);
        setIsChecking(false);
        return;
      }

      // Check projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*');
      
      if (projectsError) {
        console.error('❌ Erro ao buscar projetos:', projectsError);
        newStatus.error = `Erro ao verificar projetos: ${projectsError.message}`;
        setStatus(newStatus);
        setIsChecking(false);
        return;
      }

      const profiles = profilesData || [];
      const users = usersData || [];
      const projects = projectsData || [];

      newStatus.details = {
        profiles: profiles.length,
        users: users.length,
        projects: projects.length
      };

      // Data exists if we have at least profiles and users
      newStatus.dataExists = profiles.length > 0 && users.length > 0;
      
      console.log(`✅ Dados encontrados:`);
      console.log(`   Perfis: ${profiles.length}`);
      console.log(`   Usuários: ${users.length}`);
      console.log(`   Projetos: ${projects.length}`);

      // Log actual data for debugging
      if (profiles.length > 0) {
        console.log('📋 Perfis encontrados:', profiles.map(p => ({ id: p.id, name: p.name })));
      }
      if (users.length > 0) {
        console.log('👥 Usuários encontrados:', users.map(u => ({ id: u.id, username: u.username, email: u.email })));
      }
      if (projects.length > 0) {
        console.log('📁 Projetos encontrados:', projects.map(p => ({ id: p.id, name: p.name })));
      }

      if (!newStatus.dataExists) {
        console.log('⚠️ Dados não encontrados - banco vazio');
      }

    } catch (error) {
      console.error('💥 Erro na verificação:', error);
      newStatus.error = `Erro inesperado: ${error}`;
    }

    setStatus(newStatus);
    setIsChecking(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const getStatusIcon = () => {
    if (isChecking) return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
    if (status.dataExists) return <CheckCircle className="w-5 h-5 text-green-600" />;
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  const getStatusText = () => {
    if (isChecking) return 'Verificando conexão...';
    if (status.dataExists) return 'Supabase conectado e funcionando';
    if (status.tablesExist) return 'Conectado, mas sem dados iniciais';
    if (status.supabaseConnected) return 'Conectado, mas tabelas não encontradas';
    if (status.supabaseConfigured) return 'Configurado, mas não conecta';
    return 'Supabase não configurado';
  };

  const getStatusColor = () => {
    if (status.dataExists) return 'text-green-800 bg-green-50 border-green-200';
    if (status.supabaseConnected) return 'text-yellow-800 bg-yellow-50 border-yellow-200';
    return 'text-red-800 bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Status do Banco de Dados</h3>
          </div>
          <button
            onClick={checkConnection}
            disabled={isChecking}
            className="text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className={`p-3 rounded-lg border ${getStatusColor()}`}>
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon()}
            <span className="font-medium">{getStatusText()}</span>
          </div>
          
          {status.error && (
            <p className="text-sm mt-2">{status.error}</p>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Configuração:</span>
            <span className={status.supabaseConfigured ? 'text-green-600' : 'text-red-600'}>
              {status.supabaseConfigured ? '✅ OK' : '❌ Faltando'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Conexão:</span>
            <span className={status.supabaseConnected ? 'text-green-600' : 'text-red-600'}>
              {status.supabaseConnected ? '✅ OK' : '❌ Falhou'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Tabelas:</span>
            <span className={status.tablesExist ? 'text-green-600' : 'text-red-600'}>
              {status.tablesExist ? '✅ OK' : '❌ Não encontradas'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Dados:</span>
            <span className={status.dataExists ? 'text-green-600' : 'text-yellow-600'}>
              {status.dataExists ? '✅ OK' : '⚠️ Vazios'}
            </span>
          </div>
        </div>

        {status.details && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Dados Encontrados no Supabase:</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">{status.details.profiles}</div>
                <div className="text-gray-600">Perfis</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">{status.details.users}</div>
                <div className="text-gray-600">Usuários</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">{status.details.projects}</div>
                <div className="text-gray-600">Projetos</div>
              </div>
            </div>
          </div>
        )}

        {status.environment && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">Informações do Ambiente</h4>
                <div className="text-xs text-blue-800 space-y-1">
                  <div><strong>Modo:</strong> {status.environment.mode}</div>
                  <div><strong>Hostname:</strong> {status.environment.hostname}</div>
                  <div><strong>URL:</strong> {status.environment.url.substring(0, 50)}...</div>
                  <div><strong>Key Length:</strong> {status.environment.keyLength} caracteres</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showDetails ? 'Ocultar detalhes' : 'Ver detalhes técnicos'}
        </button>

        {showDetails && (
          <div className="mt-3 p-3 bg-gray-50 rounded text-xs font-mono">
            <div><strong>URL:</strong> {status.environment?.url || 'Não configurada'}</div>
            <div><strong>Key:</strong> {status.environment?.keyLength ? `${status.environment.keyLength} caracteres` : 'Não configurada'}</div>
            <div><strong>Cliente:</strong> {supabase ? 'Inicializado' : 'Não inicializado'}</div>
            <div><strong>Modo:</strong> {status.environment?.mode || 'unknown'}</div>
            <div><strong>Hostname:</strong> {status.environment?.hostname || 'unknown'}</div>
          </div>
        )}

        {!status.supabaseConfigured && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Como configurar o Supabase:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Crie um projeto em <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">supabase.com</a></li>
              <li>2. Vá para Settings → API</li>
              <li>3. Copie Project URL e anon key</li>
              <li>4. Configure as variáveis de ambiente</li>
              <li>5. Execute o SQL das migrations</li>
            </ol>
          </div>
        )}

        {status.supabaseConnected && !status.dataExists && (
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Banco conectado, mas sem dados:</h4>
              <p className="text-sm text-yellow-800">
                O banco está funcionando, mas não tem os dados iniciais necessários (usuário admin, perfis, etc.)
              </p>
            </div>

            <button
              onClick={() => setShowInitializer(!showInitializer)}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              {showInitializer ? 'Ocultar Inicializador' : 'Inicializar Dados Automaticamente'}
            </button>
          </div>
        )}
      </div>

      {/* Inicializador de Dados */}
      {showInitializer && status.supabaseConnected && !status.dataExists && (
        <SupabaseDataInitializer />
      )}
    </div>
  );
};