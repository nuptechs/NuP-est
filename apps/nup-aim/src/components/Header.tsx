import React, { useState, useEffect } from 'react';
import { FileText, Download, LogOut, User, Users, Shield, Database, Clock, Image, Sliders } from 'lucide-react';
import { useAuth } from '../contexts/ApiAuthContext';
import { UserManagement } from './UserManagement';
import { ProfileManagement } from './ProfileManagement';
import { DataManager } from './DataManager';
import { ImageFieldExtractor } from './ImageFieldExtractor';
import { getCustomFieldsSDK } from '../hooks/useCustomFields';

interface HeaderProps {
  onExport: () => void;
  isExporting: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onExport, isExporting }) => {
  const { user, profile, logout, hasPermission } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showProfileManagement, setShowProfileManagement] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);
  const [showImageFieldExtractor, setShowImageFieldExtractor] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<string>('');

  // Calcular tempo restante da sessão
  useEffect(() => {
    const updateSessionTime = () => {
      const lastActivity = localStorage.getItem('nup_aim_last_activity');
      if (!lastActivity) return;

      const SESSION_TIMEOUT = 7 * 60 * 1000; // 7 minutos em millisegundos
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      const timeLeft = SESSION_TIMEOUT - timeSinceLastActivity;

      if (timeLeft > 0) {
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        setSessionTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setSessionTimeLeft('Expirada');
      }
    };

    // Atualizar a cada segundo
    const interval = setInterval(updateSessionTime, 1000);
    updateSessionTime(); // Atualizar imediatamente

    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    setShowUserDropdown(false);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  NuP_AIM
                </h1>
                <p className="text-sm text-gray-500">
                  Sistema de Análise de Impacto
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Session Timer */}
              {user && sessionTimeLeft && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Sessão: {sessionTimeLeft}
                  </span>
                </div>
              )}

              {/* Image Field Extractor Button */}
              <button
                onClick={() => setShowImageFieldExtractor(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
              >
                <Image className="w-4 h-4 mr-2" />
                Extrair Campos de Imagem
              </button>

              {hasPermission('ANALYSIS', 'EXPORT') && (
                <button
                  onClick={onExport}
                  disabled={isExporting}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isExporting ? 'Exportando...' : 'Exportar para Word'}
                </button>
              )}

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{user?.username}</div>
                    <div className="text-xs text-gray-500">{profile?.name}</div>
                  </div>
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-200">
                      <div className="font-medium text-gray-900">{user?.username}</div>
                      <div className="text-sm text-gray-500">{user?.email}</div>
                      <div className="text-xs text-blue-600 mt-1">{profile?.name}</div>
                      {sessionTimeLeft && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>Sessão expira em: {sessionTimeLeft}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="py-1">
                      {hasPermission('USERS', 'MANAGE') && (
                        <button
                          onClick={() => {
                            setShowUserManagement(true);
                            setShowUserDropdown(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          Gerenciar Usuários
                        </button>
                      )}
                      
                      {hasPermission('PROFILES', 'MANAGE') && (
                        <button
                          onClick={() => {
                            setShowProfileManagement(true);
                            setShowUserDropdown(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Gerenciar Perfis
                        </button>
                      )}

                      {/* Data Manager - Check permission */}
                      {hasPermission('DATA', 'MANAGE') && (
                        <button
                          onClick={() => {
                            setShowDataManager(true);
                            setShowUserDropdown(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Database className="w-4 h-4" />
                          Gerenciar Dados
                        </button>
                      )}

                      {/* Custom Fields Admin Panel */}
                      <button
                        onClick={() => {
                          const sdk = getCustomFieldsSDK();
                          window.open(sdk.getAdminUrl(), '_blank');
                          setShowUserDropdown(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        data-testid="button-custom-fields-admin"
                      >
                        <Sliders className="w-4 h-4" />
                        Campos Personalizados
                      </button>
                      
                      <div className="border-t border-gray-200 my-1"></div>
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* User Management Modal */}
      {showUserManagement && (
        <UserManagement onClose={() => setShowUserManagement(false)} />
      )}

      {/* Profile Management Modal */}
      {showProfileManagement && (
        <ProfileManagement onClose={() => setShowProfileManagement(false)} />
      )}

      {/* Data Manager Modal */}
      {showDataManager && (
        <DataManager onClose={() => setShowDataManager(false)} />
      )}

      {/* Image Field Extractor Modal */}
      {showImageFieldExtractor && (
        <ImageFieldExtractor onClose={() => setShowImageFieldExtractor(false)} />
      )}
    </>
  );
};