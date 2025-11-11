import React, { useState } from 'react';
import { Download, Upload, Database, AlertTriangle, CheckCircle, X, Settings } from 'lucide-react';
import { getStoredUsers, getStoredProfiles } from '../utils/authStorage';
import { getStoredProjects } from '../utils/projectStorage';
import { getStoredAnalyses } from '../utils/storage';
import { SupabaseConnectionChecker } from './SupabaseConnectionChecker';
import { ConnectionTestPanel } from './ConnectionTestPanel';

interface DataManagerProps {
  onClose: () => void;
}

interface SystemData {
  users: any[];
  profiles: any[];
  projects: any[];
  analyses: any[];
  exportDate: string;
  version: string;
}

export const DataManager: React.FC<DataManagerProps> = ({ onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'test' | 'backup'>('status');

  const exportData = async () => {
    setIsExporting(true);
    setMessage(null);

    try {
      const systemData: SystemData = {
        users: getStoredUsers(),
        profiles: getStoredProfiles(),
        projects: getStoredProjects(),
        analyses: getStoredAnalyses(),
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = JSON.stringify(systemData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `nup-aim-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMessage({
        type: 'success',
        text: 'Dados exportados com sucesso! O arquivo foi baixado.'
      });
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      setMessage({
        type: 'error',
        text: 'Erro ao exportar dados. Tente novamente.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const importData = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setMessage(null);

    try {
      const fileContent = await importFile.text();
      const systemData: SystemData = JSON.parse(fileContent);

      // Validate data structure
      if (!systemData.users || !systemData.profiles || !systemData.projects || !systemData.analyses) {
        throw new Error('Arquivo de backup inválido');
      }

      // Confirm import
      const confirmImport = window.confirm(
        `Tem certeza que deseja importar os dados?\n\n` +
        `Este backup contém:\n` +
        `• ${systemData.users.length} usuários\n` +
        `• ${systemData.profiles.length} perfis\n` +
        `• ${systemData.projects.length} projetos\n` +
        `• ${systemData.analyses.length} análises\n\n` +
        `Data do backup: ${new Date(systemData.exportDate).toLocaleString('pt-BR')}\n\n` +
        `ATENÇÃO: Todos os dados atuais serão substituídos!`
      );

      if (!confirmImport) {
        setIsImporting(false);
        return;
      }

      // Import data
      localStorage.setItem('nup_aim_users', JSON.stringify(systemData.users));
      localStorage.setItem('nup_aim_profiles', JSON.stringify(systemData.profiles));
      localStorage.setItem('nup_aim_projects', JSON.stringify(systemData.projects));
      localStorage.setItem('impact_analyses', JSON.stringify(systemData.analyses));

      setMessage({
        type: 'success',
        text: 'Dados importados com sucesso! Recarregue a página para ver as alterações.'
      });

      // Auto reload after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('Erro ao importar dados:', error);
      setMessage({
        type: 'error',
        text: 'Erro ao importar dados. Verifique se o arquivo é válido.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const getDataSummary = () => {
    const users = getStoredUsers();
    const profiles = getStoredProfiles();
    const projects = getStoredProjects();
    const analyses = getStoredAnalyses();

    return {
      users: users.length,
      profiles: profiles.length,
      projects: projects.length,
      analyses: analyses.length
    };
  };

  const summary = getDataSummary();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Gerenciar Dados do Sistema</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'status'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Status da Conexão
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'test'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Teste de Conexão
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'backup'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Backup e Restauração
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'status' && (
            <div className="space-y-6">
              <SupabaseConnectionChecker />
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-3">Dados Atuais no Sistema (localStorage)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-blue-800">{summary.users}</div>
                    <div className="text-blue-600">Usuários</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-800">{summary.profiles}</div>
                    <div className="text-blue-600">Perfis</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-800">{summary.projects}</div>
                    <div className="text-blue-600">Projetos</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-800">{summary.analyses}</div>
                    <div className="text-blue-600">Análises</div>
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  * Estes dados estão salvos localmente no navegador (localStorage)
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1">Importante sobre o localStorage</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Os dados ficam salvos apenas no navegador atual</li>
                      <li>• Cada navegador/dispositivo tem seus próprios dados</li>
                      <li>• Para usar o banco de dados Supabase, configure as variáveis de ambiente</li>
                      <li>• Use a aba "Backup e Restauração" para transferir dados entre navegadores</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="space-y-6">
              <ConnectionTestPanel />
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Export Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Exportar Dados</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Faça backup de todos os dados do sistema (usuários, perfis, projetos e análises) 
                  para um arquivo JSON que pode ser importado em outro navegador ou dispositivo.
                </p>
                <button
                  onClick={exportData}
                  disabled={isExporting}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Dados
                    </>
                  )}
                </button>
              </div>

              {/* Import Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Importar Dados</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Restaure dados de um arquivo de backup. 
                  <strong className="text-red-600"> ATENÇÃO: Todos os dados atuais serão substituídos!</strong>
                </p>
                
                <div className="space-y-3">
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  {importFile && (
                    <div className="text-sm text-gray-600">
                      Arquivo selecionado: <strong>{importFile.name}</strong>
                    </div>
                  )}
                  
                  <button
                    onClick={importData}
                    disabled={!importFile || isImporting}
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Importar Dados
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Message */}
              {message && (
                <div className={`p-4 rounded-lg border ${
                  message.type === 'success' ? 'bg-green-50 border-green-200' :
                  message.type === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {message.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                    {message.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                    {message.type === 'info' && <Database className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                    <p className={`text-sm ${
                      message.type === 'success' ? 'text-green-800' :
                      message.type === 'error' ? 'text-red-800' :
                      'text-blue-800'
                    }`}>
                      {message.text}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};