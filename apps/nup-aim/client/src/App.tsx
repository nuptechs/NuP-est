import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/ApiAuthContext';
import { LoginForm } from './components/LoginForm';
import { EmailVerification } from './components/EmailVerification';
import { SessionTimeoutWarning } from './components/SessionTimeoutWarning';
import { Header } from './components/Header';
import { FormSection } from './components/FormSection';
import { BasicInfoForm } from './components/BasicInfoForm';
import { ScopeForm } from './components/ScopeForm';
import { ImpactsForm } from './components/ImpactsForm';
import { RisksForm } from './components/RisksForm';
import { MitigationsForm } from './components/MitigationsForm';
import { ConclusionsForm } from './components/ConclusionsForm';
import { DocumentPreview } from './components/DocumentPreview';
import { AnalysisManager } from './components/AnalysisManager';
import { exportToWord } from './utils/documentExporter';
import { saveAnalysis, generateNewId } from './utils/storage';
import { getDefaultProject } from './utils/projectStorage';
import { registerNuPAIMSections } from './hooks/useCustomFields';
import { ImpactAnalysis } from './types';
import { Save, FolderOpen } from 'lucide-react';

const createInitialData = (): ImpactAnalysis => {
  const defaultProject = getDefaultProject();
  const currentYear = new Date().getFullYear();
  
  return {
    id: generateNewId(),
    title: `PA`,
    description: '',
    author: '',
    date: new Date().toISOString().split('T')[0],
    version: '1.0',
    project: defaultProject?.name || '',
    scope: {
      processes: []
    },
    impacts: {
      business: [],
      technical: [],
      operational: [],
      financial: []
    },
    risks: [],
    mitigations: [],
    conclusions: {
      summary: '',
      recommendations: [],
      nextSteps: []
    },
    customFieldsValues: {}
  };
};

const AppContent: React.FC = () => {
  const { isAuthenticated, hasPermission, logout } = useAuth();
  const [data, setData] = useState<ImpactAnalysis>(createInitialData());
  const [customFieldsValues, setCustomFieldsValues] = useState<Record<string, Record<string, any>>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [showAnalysisManager, setShowAnalysisManager] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [currentView, setCurrentView] = useState<'login' | 'verify-email' | 'app'>('login');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  useEffect(() => {
    // Check URL for email verification token
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const token = urlParams.get('token');
    
    if (token) {
      setVerificationToken(token);
      setCurrentView('verify-email');
    } else if (isAuthenticated) {
      setCurrentView('app');
    } else {
      setCurrentView('login');
    }
  }, [isAuthenticated]);

  // Register custom fields sections when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      registerNuPAIMSections().catch(err => {
        console.error('Failed to register custom fields sections:', err);
      });
    }
  }, [isAuthenticated]);

  // Função para estender a sessão
  const handleExtendSession = () => {
    localStorage.setItem('nup_aim_last_activity', Date.now().toString());
    setShowSessionWarning(false);
  };

  // Função para fazer logout
  const handleLogout = () => {
    logout();
    setShowSessionWarning(false);
  };

  if (currentView === 'verify-email') {
    return (
      <EmailVerification 
        token={verificationToken || undefined}
        onBackToLogin={() => {
          setCurrentView('login');
          setVerificationToken(null);
          // Clear URL hash
          window.location.hash = '';
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const updateData = (updates: Partial<ImpactAnalysis>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const handleExport = async () => {
    if (!hasPermission('ANALYSIS', 'EXPORT')) {
      alert('Você não tem permissão para exportar análises.');
      return;
    }

    setIsExporting(true);
    try {
      await exportToWord(data);
    } catch (error) {
      console.error('Erro ao exportar documento:', error);
      alert('Erro ao exportar o documento. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = async () => {
    if (!hasPermission('ANALYSIS', 'CREATE') && !hasPermission('ANALYSIS', 'EDIT')) {
      alert('Você não tem permissão para salvar análises.');
      return;
    }

    setIsSaving(true);
    let customFieldsSaved = true;
    let customFieldsErrors: string[] = [];
    
    try {
      // Save the main analysis data with custom fields values
      const analysisWithCustomFields = {
        ...data,
        customFieldsValues
      };
      saveAnalysis(analysisWithCustomFields);
      
      // Save custom fields values to the microservice
      const { getCustomFieldsSDK } = await import('./hooks/useCustomFields');
      const sdk = getCustomFieldsSDK();
      
      for (const [sectionName, values] of Object.entries(customFieldsValues)) {
        if (Object.keys(values).length > 0) {
          try {
            await sdk.saveValues(data.id, sectionName, values);
          } catch (error) {
            customFieldsSaved = false;
            customFieldsErrors.push(sectionName);
            console.warn(`Failed to save custom fields for section ${sectionName}:`, error);
          }
        }
      }
      
      setLastSaved(new Date());
      
      // Show success/warning message based on results
      const msgDiv = document.createElement('div');
      msgDiv.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
        customFieldsSaved ? 'bg-green-500' : 'bg-yellow-500'
      } text-white`;
      
      if (customFieldsSaved) {
        msgDiv.textContent = 'Análise salva com sucesso!';
      } else {
        msgDiv.innerHTML = `
          <div><strong>Análise salva localmente</strong></div>
          <div class="text-sm">Alguns campos personalizados não foram salvos no servidor.</div>
          <div class="text-xs mt-1">Seções afetadas: ${customFieldsErrors.join(', ')}</div>
        `;
      }
      
      document.body.appendChild(msgDiv);
      
      setTimeout(() => {
        if (document.body.contains(msgDiv)) {
          document.body.removeChild(msgDiv);
        }
      }, customFieldsSaved ? 3000 : 5000);
    } catch (error) {
      console.error('Erro ao salvar análise:', error);
      alert('Erro ao salvar a análise. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadAnalysis = (analysis: ImpactAnalysis) => {
    if (!hasPermission('ANALYSIS', 'VIEW')) {
      alert('Você não tem permissão para visualizar análises.');
      return;
    }

    setData(analysis);
    setCustomFieldsValues(analysis.customFieldsValues || {});
    setActiveTab('form');
    setShowAnalysisManager(false);
  };

  const handleNewAnalysis = () => {
    if (!hasPermission('ANALYSIS', 'CREATE')) {
      alert('Você não tem permissão para criar análises.');
      return;
    }

    setData(createInitialData());
    setCustomFieldsValues({});
    setActiveTab('form');
    setCollapsedSections({});
    setLastSaved(null);
    setShowAdditionalInfo(false);
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const isFormValid = () => {
    return data.title.trim() && 
           data.title !== 'PA' && 
           data.project.trim() && 
           data.author.trim() && 
           data.description.trim();
  };

  const canManageAnalyses = hasPermission('ANALYSIS', 'VIEW') || hasPermission('ANALYSIS', 'EDIT') || hasPermission('ANALYSIS', 'DELETE');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onExport={handleExport} isExporting={isExporting} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'form'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Formulário
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'preview'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Visualização
          </button>
        </div>

        {activeTab === 'form' ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <FormSection
              title="Informações Básicas"
              required
              isCollapsed={collapsedSections['basic']}
              onToggle={() => toggleSection('basic')}
            >
              <BasicInfoForm 
                data={data} 
                onChange={updateData}
                customFieldsValues={customFieldsValues['basic_info'] || {}}
                onCustomFieldsChange={(values) => {
                  setCustomFieldsValues(prev => ({
                    ...prev,
                    basic_info: values
                  }));
                }}
              />
            </FormSection>

            <FormSection
              title="Escopo"
              isCollapsed={collapsedSections['scope']}
              onToggle={() => toggleSection('scope')}
            >
              <ScopeForm 
                data={data} 
                onChange={updateData}
                customFieldsValues={customFieldsValues['scope'] || {}}
                onCustomFieldsChange={(values) => {
                  setCustomFieldsValues(prev => ({
                    ...prev,
                    scope: values
                  }));
                }}
              />
            </FormSection>

            {/* Additional Information Toggle */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Informações Adicionais</h3>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showAdditionalInfo}
                    onChange={(e) => setShowAdditionalInfo(e.target.checked)}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Incluir seções adicionais</span>
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Marque esta opção para incluir as seções de Análise de Impactos, Matriz de Riscos, Plano de Mitigação e Conclusões.
              </p>
            </div>

            {showAdditionalInfo && (
              <>
                <FormSection
                  title="Análise de Impactos"
                  isCollapsed={collapsedSections['impacts']}
                  onToggle={() => toggleSection('impacts')}
                >
                  <ImpactsForm 
                    data={data} 
                    onChange={updateData}
                    customFieldsValues={customFieldsValues['impacts'] || {}}
                    onCustomFieldsChange={(values) => {
                      setCustomFieldsValues(prev => ({
                        ...prev,
                        impacts: values
                      }));
                    }}
                  />
                </FormSection>

                <FormSection
                  title="Matriz de Riscos"
                  isCollapsed={collapsedSections['risks']}
                  onToggle={() => toggleSection('risks')}
                >
                  <RisksForm 
                    data={data} 
                    onChange={updateData}
                    customFieldsValues={customFieldsValues['risks'] || {}}
                    onCustomFieldsChange={(values) => {
                      setCustomFieldsValues(prev => ({
                        ...prev,
                        risks: values
                      }));
                    }}
                  />
                </FormSection>

                <FormSection
                  title="Plano de Mitigação"
                  isCollapsed={collapsedSections['mitigations']}
                  onToggle={() => toggleSection('mitigations')}
                >
                  <MitigationsForm 
                    data={data} 
                    onChange={updateData}
                    customFieldsValues={customFieldsValues['mitigations'] || {}}
                    onCustomFieldsChange={(values) => {
                      setCustomFieldsValues(prev => ({
                        ...prev,
                        mitigations: values
                      }));
                    }}
                  />
                </FormSection>

                <FormSection
                  title="Conclusões e Recomendações"
                  isCollapsed={collapsedSections['conclusions']}
                  onToggle={() => toggleSection('conclusions')}
                >
                  <ConclusionsForm 
                    data={data} 
                    onChange={updateData}
                    customFieldsValues={customFieldsValues['conclusions'] || {}}
                    onCustomFieldsChange={(values) => {
                      setCustomFieldsValues(prev => ({
                        ...prev,
                        conclusions: values
                      }));
                    }}
                  />
                </FormSection>
              </>
            )}

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  {(hasPermission('ANALYSIS', 'CREATE') || hasPermission('ANALYSIS', 'EDIT')) && (
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !isFormValid()}
                      className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Salvando...' : 'Salvar Análise'}
                    </button>
                  )}
                  
                  {canManageAnalyses && (
                    <button
                      onClick={() => setShowAnalysisManager(true)}
                      className="inline-flex items-center px-4 py-3 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Gerenciar Análises
                    </button>
                  )}
                </div>

                {lastSaved && (
                  <div className="text-sm text-gray-500">
                    Última alteração salva: {lastSaved.toLocaleTimeString('pt-BR')}
                  </div>
                )}
              </div>

              {!isFormValid() && (hasPermission('ANALYSIS', 'CREATE') || hasPermission('ANALYSIS', 'EDIT')) && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Atenção:</strong> Preencha os campos obrigatórios (Número da PA, Projeto, Autor e Descrição) para salvar a análise.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <DocumentPreview data={data} />
        )}
      </div>

      {/* Analysis Manager Modal */}
      {showAnalysisManager && canManageAnalyses && (
        <AnalysisManager
          onLoadAnalysis={handleLoadAnalysis}
          onNewAnalysis={handleNewAnalysis}
          onClose={() => setShowAnalysisManager(false)}
        />
      )}

      {/* Session Timeout Warning */}
      {showSessionWarning && (
        <SessionTimeoutWarning 
          onExtendSession={handleExtendSession}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;