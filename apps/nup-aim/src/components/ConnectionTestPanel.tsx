import React, { useState } from 'react';
import { Database, Play, CheckCircle, XCircle, AlertTriangle, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const ConnectionTestPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runConnectionTests = async () => {
    setIsRunning(true);
    const testResults: TestResult[] = [];

    try {
      // Test 1: Environment Variables
      console.log('🧪 Teste 1: Verificando variáveis de ambiente...');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
        testResults.push({
          name: 'Variáveis de Ambiente',
          status: 'error',
          message: 'VITE_SUPABASE_URL não configurada ou inválida',
          details: { url: supabaseUrl }
        });
      } else if (!supabaseKey || supabaseKey === 'your-anon-key' || supabaseKey.length < 20) {
        testResults.push({
          name: 'Variáveis de Ambiente',
          status: 'error',
          message: 'VITE_SUPABASE_ANON_KEY não configurada ou inválida',
          details: { keyLength: supabaseKey?.length || 0 }
        });
      } else {
        testResults.push({
          name: 'Variáveis de Ambiente',
          status: 'success',
          message: 'Variáveis configuradas corretamente',
          details: { 
            url: supabaseUrl.substring(0, 30) + '...', 
            keyLength: supabaseKey.length 
          }
        });
      }

      // Test 2: Supabase Client
      console.log('🧪 Teste 2: Verificando cliente Supabase...');
      if (!supabase) {
        testResults.push({
          name: 'Cliente Supabase',
          status: 'error',
          message: 'Cliente Supabase não foi inicializado',
          details: null
        });
      } else {
        testResults.push({
          name: 'Cliente Supabase',
          status: 'success',
          message: 'Cliente Supabase inicializado com sucesso',
          details: { client: 'OK' }
        });
      }

      if (supabase) {
        // Test 3: Basic Connection
        console.log('🧪 Teste 3: Testando conexão básica...');
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);
          
          if (error) {
            testResults.push({
              name: 'Conexão Básica',
              status: 'error',
              message: `Erro de conexão: ${error.message}`,
              details: error
            });
          } else {
            testResults.push({
              name: 'Conexão Básica',
              status: 'success',
              message: 'Conexão estabelecida com sucesso',
              details: { response: 'OK' }
            });
          }
        } catch (error) {
          testResults.push({
            name: 'Conexão Básica',
            status: 'error',
            message: `Erro de rede: ${error}`,
            details: error
          });
        }

        // Test 4: Tables Existence
        console.log('🧪 Teste 4: Verificando existência das tabelas...');
        const tables = ['profiles', 'users', 'projects'];
        const tableResults: any = {};
        
        for (const table of tables) {
          try {
            const { data, error } = await supabase
              .from(table)
              .select('count')
              .limit(1);
            
            tableResults[table] = error ? 'ERROR' : 'OK';
          } catch (error) {
            tableResults[table] = 'ERROR';
          }
        }

        const tablesOK = Object.values(tableResults).every(status => status === 'OK');
        testResults.push({
          name: 'Tabelas',
          status: tablesOK ? 'success' : 'error',
          message: tablesOK ? 'Todas as tabelas principais existem' : 'Algumas tabelas não foram encontradas',
          details: tableResults
        });

        // Test 5: Data Verification
        console.log('🧪 Teste 5: Verificando dados...');
        try {
          const [profilesResult, usersResult, projectsResult] = await Promise.all([
            supabase.from('profiles').select('*'),
            supabase.from('users').select('*'),
            supabase.from('projects').select('*')
          ]);

          const profilesCount = profilesResult.data?.length || 0;
          const usersCount = usersResult.data?.length || 0;
          const projectsCount = projectsResult.data?.length || 0;

          const hasData = profilesCount > 0 && usersCount > 0;
          
          testResults.push({
            name: 'Dados',
            status: hasData ? 'success' : 'warning',
            message: hasData ? 'Dados encontrados no banco' : 'Banco vazio - execute as migrations',
            details: {
              profiles: profilesCount,
              users: usersCount,
              projects: projectsCount
            }
          });

          // Test 6: Admin User
          if (usersCount > 0) {
            console.log('🧪 Teste 6: Verificando usuário admin...');
            const { data: adminUser } = await supabase
              .from('users')
              .select('*, profiles(*)')
              .eq('username', 'admin')
              .single();

            if (adminUser) {
              testResults.push({
                name: 'Usuário Admin',
                status: 'success',
                message: 'Usuário admin encontrado e configurado',
                details: {
                  username: adminUser.username,
                  email: adminUser.email,
                  verified: adminUser.is_email_verified,
                  profile: adminUser.profiles?.name
                }
              });
            } else {
              testResults.push({
                name: 'Usuário Admin',
                status: 'warning',
                message: 'Usuário admin não encontrado',
                details: null
              });
            }
          }

        } catch (error) {
          testResults.push({
            name: 'Dados',
            status: 'error',
            message: `Erro ao verificar dados: ${error}`,
            details: error
          });
        }
      }

    } catch (error) {
      console.error('💥 Erro nos testes:', error);
      testResults.push({
        name: 'Erro Geral',
        status: 'error',
        message: `Erro inesperado: ${error}`,
        details: error
      });
    }

    setResults(testResults);
    setIsRunning(false);
  };

  const copyResults = () => {
    const resultText = results.map(result => 
      `${result.name}: ${result.status.toUpperCase()} - ${result.message}`
    ).join('\n');
    
    navigator.clipboard.writeText(resultText);
    alert('Resultados copiados para a área de transferência!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Teste de Conexão Supabase</h3>
            <p className="text-sm text-gray-600">
              Executa uma bateria completa de testes para verificar a conexão
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <button
              onClick={copyResults}
              className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Resultados
            </button>
          )}
          
          <button
            onClick={runConnectionTests}
            disabled={isRunning}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Testando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Executar Testes
              </>
            )}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 mb-3">Resultados dos Testes:</h4>
          
          {results.map((result, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-medium text-gray-900">{result.name}</h5>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      result.status === 'success' ? 'bg-green-100 text-green-800' :
                      result.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                  
                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                        Ver detalhes
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-gray-600 overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">Resumo:</h5>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-600">
                  {results.filter(r => r.status === 'success').length}
                </div>
                <div className="text-gray-600">Sucessos</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">
                  {results.filter(r => r.status === 'warning').length}
                </div>
                <div className="text-gray-600">Avisos</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">
                  {results.filter(r => r.status === 'error').length}
                </div>
                <div className="text-gray-600">Erros</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Clique em "Executar Testes" para verificar a conexão com o Supabase</p>
        </div>
      )}
    </div>
  );
};