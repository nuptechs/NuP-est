import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Check, X, Star, StarOff, Info } from 'lucide-react';
import { Profile, Permission, SYSTEM_MODULES } from '../types/auth';
import { 
  getStoredProfiles, 
  saveProfile as saveStoredProfile, 
  deleteProfile as deleteStoredProfile, 
  generateId 
} from '../utils/authStorage';

interface ProfileManagementProps {
  onClose: () => void;
}

export const ProfileManagement: React.FC<ProfileManagementProps> = ({ onClose }) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
    permissions: [] as string[]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'permissions' | 'additional'>('basic');
  const [useSupabase, setUseSupabase] = useState(false);

  useEffect(() => {
    checkSupabaseAndLoadData();
  }, []);

  const checkSupabaseAndLoadData = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project.supabase.co') {
      try {
        console.log('🔗 Tentando usar Supabase para gerenciamento de perfis...');
        const { getProfiles } = await import('../utils/supabaseAuth');
        const data = await getProfiles();
        setProfiles(data);
        setUseSupabase(true);
        console.log('✅ Usando Supabase para gerenciamento');
      } catch (error) {
        console.error('❌ Erro ao conectar com Supabase, usando localStorage:', error);
        loadLocalData();
      }
    } else {
      console.log('🔄 Usando localStorage para gerenciamento de perfis');
      loadLocalData();
    }
  };

  const loadLocalData = () => {
    const loadedProfiles = getStoredProfiles();
    console.log('📋 Perfis carregados do localStorage:', loadedProfiles);
    setProfiles(loadedProfiles);
    setUseSupabase(false);
  };

  const generateDefaultPermissions = (): string[] => {
    const permissions: string[] = [];
    
    Object.entries(SYSTEM_MODULES).forEach(([moduleKey, module]) => {
      Object.entries(module.actions).forEach(([actionKey, actionName]) => {
        permissions.push(`${moduleKey}_${actionKey}`);
      });
    });
    
    return permissions;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome do perfil é obrigatório';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }
    
    // Check for duplicate names (excluding current editing profile)
    const duplicateName = profiles.find(p => 
      p.name.toLowerCase() === formData.name.toLowerCase() && 
      p.id !== editingProfile
    );
    if (duplicateName) {
      newErrors.name = 'Já existe um perfil com este nome';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      if (useSupabase) {
        const { createProfile, updateProfile } = await import('../utils/supabaseAuth');
        
        if (editingProfile) {
          const result = await updateProfile(editingProfile, {
            name: formData.name.trim(),
            description: formData.description.trim(),
            permissions: formData.permissions,
            isDefault: formData.isDefault
          });

          if (!result.success) {
            alert(`Erro ao atualizar perfil: ${result.error}`);
            return;
          }
        } else {
          const result = await createProfile({
            name: formData.name.trim(),
            description: formData.description.trim(),
            permissions: formData.permissions,
            isDefault: formData.isDefault
          });

          if (!result.success) {
            alert(`Erro ao criar perfil: ${result.error}`);
            return;
          }
        }
        
        await checkSupabaseAndLoadData();
      } else {
        // Use localStorage
        const permissions: Permission[] = formData.permissions.map(perm => {
          const [module, action] = perm.split('_');
          return {
            id: perm,
            module,
            action,
            allowed: true
          };
        });
        
        const profile: Profile = {
          id: editingProfile || generateId(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          permissions,
          isDefault: formData.isDefault,
          createdAt: editingProfile ? 
            profiles.find(p => p.id === editingProfile)?.createdAt || new Date().toISOString() :
            new Date().toISOString()
        };
        
        saveStoredProfile(profile);
        loadLocalData();
      }
      
      handleCancel();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Erro ao salvar perfil. Tente novamente.');
    }
  };

  const handleEdit = (profile: any) => {
    setEditingProfile(profile.id);
    
    // Fix: Properly extract permissions based on data source
    let permissionsList: string[] = [];
    
    if (useSupabase) {
      // For Supabase, permissions are already string array
      permissionsList = Array.isArray(profile.permissions) ? profile.permissions : [];
    } else {
      // For localStorage, permissions are objects with id, module, action, allowed
      permissionsList = profile.permissions
        .filter((p: Permission) => p.allowed)
        .map((p: Permission) => p.id);
    }
    
    setFormData({
      name: profile.name,
      description: profile.description,
      isDefault: useSupabase ? profile.is_default : profile.isDefault,
      permissions: permissionsList
    });
    
    setShowForm(true);
    setActiveTab('basic');
    setErrors({});
  };

  const handleDelete = async (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (!profile) return;
    
    if (profiles.length <= 1) {
      alert('Não é possível excluir o último perfil. Deve haver pelo menos um perfil cadastrado.');
      return;
    }
    
    if (window.confirm(`Tem certeza que deseja excluir o perfil "${profile.name}"?`)) {
      try {
        if (useSupabase) {
          const { deleteProfile } = await import('../utils/supabaseAuth');
          const result = await deleteProfile(id);
          if (result.success) {
            await checkSupabaseAndLoadData();
          } else {
            alert(`Erro ao excluir perfil: ${result.error}`);
          }
        } else {
          const success = deleteStoredProfile(id);
          if (success) {
            loadLocalData();
          } else {
            alert('Não foi possível excluir o perfil. Verifique se não há usuários utilizando este perfil.');
          }
        }
      } catch (error) {
        console.error('Erro ao excluir perfil:', error);
        alert('Erro ao excluir perfil. Tente novamente.');
      }
    }
  };

  const handleSetDefault = async (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      try {
        if (useSupabase) {
          const { updateProfile } = await import('../utils/supabaseAuth');
          const result = await updateProfile(id, { isDefault: true });
          if (result.success) {
            await checkSupabaseAndLoadData();
          } else {
            alert(`Erro ao definir perfil padrão: ${result.error}`);
          }
        } else {
          const updatedProfile = { ...profile, isDefault: true };
          saveStoredProfile(updatedProfile);
          loadLocalData();
        }
      } catch (error) {
        console.error('Erro ao definir perfil padrão:', error);
        alert('Erro ao definir perfil padrão. Tente novamente.');
      }
    }
  };

  const handleCancel = () => {
    setEditingProfile(null);
    setShowForm(false);
    setFormData({ name: '', description: '', isDefault: false, permissions: [] });
    setActiveTab('basic');
    setErrors({});
  };

  const handleNewProfile = () => {
    setEditingProfile(null);
    setFormData({ 
      name: '', 
      description: '', 
      isDefault: false, 
      permissions: []
    });
    setShowForm(true);
    setActiveTab('basic');
    setErrors({});
  };

  const handlePermissionChange = (permission: string, allowed: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: allowed 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  const handleModuleToggle = (moduleKey: string, allowed: boolean) => {
    const modulePermissions = Object.keys(SYSTEM_MODULES[moduleKey as keyof typeof SYSTEM_MODULES].actions)
      .map(action => `${moduleKey}_${action}`);
    
    setFormData(prev => ({
      ...prev,
      permissions: allowed 
        ? [...prev.permissions.filter(p => !modulePermissions.includes(p)), ...modulePermissions]
        : prev.permissions.filter(p => !modulePermissions.includes(p))
    }));
  };

  const getModulePermissions = (moduleKey: string) => {
    return Object.keys(SYSTEM_MODULES[moduleKey as keyof typeof SYSTEM_MODULES].actions)
      .map(action => `${moduleKey}_${action}`);
  };

  const isModuleFullyAllowed = (moduleKey: string) => {
    const modulePermissions = getModulePermissions(moduleKey);
    return modulePermissions.length > 0 && modulePermissions.every(p => formData.permissions.includes(p));
  };

  const isModulePartiallyAllowed = (moduleKey: string) => {
    const modulePermissions = getModulePermissions(moduleKey);
    return modulePermissions.some(p => formData.permissions.includes(p)) && !modulePermissions.every(p => formData.permissions.includes(p));
  };

  const getPermissionsSummary = (profile: any) => {
    const allPermissions = generateDefaultPermissions();
    
    // Fix: Properly extract permissions based on data source
    let allowedPermissions: string[] = [];
    
    if (useSupabase) {
      // For Supabase, permissions are already string array
      allowedPermissions = Array.isArray(profile.permissions) ? profile.permissions : [];
    } else {
      // For localStorage, permissions are objects with id, module, action, allowed
      allowedPermissions = profile.permissions
        .filter((p: Permission) => p.allowed)
        .map((p: Permission) => p.id);
    }
    
    const modulesSummary = Object.keys(SYSTEM_MODULES).map(moduleKey => {
      const modulePermissions = getModulePermissions(moduleKey);
      const allowedInModule = modulePermissions.filter(p => allowedPermissions.includes(p)).length;
      return {
        module: SYSTEM_MODULES[moduleKey as keyof typeof SYSTEM_MODULES].name,
        allowed: allowedInModule,
        total: modulePermissions.length,
        percentage: modulePermissions.length > 0 ? Math.round((allowedInModule / modulePermissions.length) * 100) : 0
      };
    });

    return {
      total: allPermissions.length,
      allowed: allowedPermissions.length,
      percentage: allPermissions.length > 0 ? Math.round((allowedPermissions.length / allPermissions.length) * 100) : 0,
      modules: modulesSummary
    };
  };

  const applyPresetPermissions = (preset: 'admin' | 'user' | 'viewer' | 'analyst') => {
    const allPermissions = generateDefaultPermissions();
    let newPermissions: string[] = [];

    switch (preset) {
      case 'admin':
        newPermissions = [...allPermissions];
        break;
      case 'user':
        newPermissions = allPermissions.filter(p => 
          p.startsWith('ANALYSIS_') && ['ANALYSIS_CREATE', 'ANALYSIS_EDIT', 'ANALYSIS_VIEW', 'ANALYSIS_EXPORT'].includes(p)
        );
        break;
      case 'viewer':
        newPermissions = allPermissions.filter(p => p.endsWith('_VIEW'));
        break;
      case 'analyst':
        newPermissions = allPermissions.filter(p => 
          (p.startsWith('ANALYSIS_') && ['ANALYSIS_CREATE', 'ANALYSIS_EDIT', 'ANALYSIS_VIEW', 'ANALYSIS_EXPORT', 'ANALYSIS_COPY'].includes(p)) ||
          (p.startsWith('PROJECTS_') && ['PROJECTS_VIEW'].includes(p))
        );
        break;
    }
    
    setFormData(prev => ({ ...prev, permissions: newPermissions }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Gerenciar Perfis de Acesso</h2>
            <span className={`text-xs px-2 py-1 rounded ${useSupabase ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {useSupabase ? 'Supabase' : 'Local'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewProfile}
              disabled={showForm}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Perfil
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Form */}
          {showForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProfile ? 'Editar Perfil' : 'Novo Perfil'}
              </h3>

              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 max-w-md">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'basic'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dados Básicos
                </button>
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'permissions'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Permissões
                </button>
                <button
                  onClick={() => setActiveTab('additional')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'additional'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Informações
                </button>
              </div>

              {/* Basic Information Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome do Perfil *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                          errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="Ex: Analista de Sistemas"
                      />
                      {errors.name && (
                        <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descrição *
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                          errors.description ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="Descreva as responsabilidades deste perfil"
                      />
                      {errors.description && (
                        <p className="text-sm text-red-600 mt-1">{errors.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Definir como perfil padrão</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      O perfil padrão será atribuído automaticamente a novos usuários
                    </p>
                  </div>
                </div>
              )}

              {/* Permissions Tab */}
              {activeTab === 'permissions' && (
                <div className="space-y-6">
                  {/* Permission Presets */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">Modelos de Permissão</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => applyPresetPermissions('admin')}
                        className="px-3 py-2 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                      >
                        Administrador
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetPermissions('analyst')}
                        className="px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                      >
                        Analista
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetPermissions('user')}
                        className="px-3 py-2 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                      >
                        Usuário
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetPermissions('viewer')}
                        className="px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors"
                      >
                        Visualizador
                      </button>
                    </div>
                  </div>

                  {/* Detailed Permissions */}
                  <div className="space-y-4">
                    {Object.entries(SYSTEM_MODULES).map(([moduleKey, module]) => {
                      const isFullyAllowed = isModuleFullyAllowed(moduleKey);
                      const isPartiallyAllowed = isModulePartiallyAllowed(moduleKey);
                      
                      return (
                        <div key={moduleKey} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-gray-900">{module.name}</h5>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={isFullyAllowed}
                                ref={(input) => {
                                  if (input) input.indeterminate = isPartiallyAllowed;
                                }}
                                onChange={(e) => handleModuleToggle(moduleKey, e.target.checked)}
                                className="mr-2 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">
                                {isFullyAllowed ? 'Todas' : isPartiallyAllowed ? 'Algumas' : 'Nenhuma'}
                              </span>
                            </label>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(module.actions).map(([actionKey, actionName]) => {
                              const permissionKey = `${moduleKey}_${actionKey}`;
                              return (
                                <label key={permissionKey} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.permissions.includes(permissionKey)}
                                    onChange={(e) => handlePermissionChange(permissionKey, e.target.checked)}
                                    className="mr-2 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {actionName}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Additional Information Tab */}
              {activeTab === 'additional' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-medium text-blue-900 mb-2">Resumo das Permissões</h5>
                        {(() => {
                          const summary = getPermissionsSummary({ permissions: formData.permissions });
                          return (
                            <div className="space-y-3">
                              <div className="text-sm text-blue-800">
                                <p><strong>Total de Permissões:</strong> {summary.allowed} de {summary.total} ({summary.percentage}%)</p>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {summary.modules.map((module, index) => (
                                  <div key={index} className="bg-white rounded p-3 border border-blue-200">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium text-gray-900">{module.module}</span>
                                      <span className="text-xs text-gray-600">{module.percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                        style={{ width: `${module.percentage}%` }}
                                      ></div>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">
                                      {module.allowed} de {module.total} permissões
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h5 className="font-medium text-yellow-900 mb-2">Informações Importantes</h5>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Perfis controlam o acesso às funcionalidades do sistema</li>
                      <li>• Apenas um perfil pode ser definido como padrão por vez</li>
                      <li>• Alterações em perfis afetam todos os usuários que os utilizam</li>
                      <li>• Deve haver pelo menos um perfil cadastrado no sistema</li>
                      <li>• Perfis em uso por usuários não podem ser excluídos</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h5 className="font-medium text-green-900 mb-2">Modelos de Perfil Sugeridos</h5>
                    <div className="space-y-2 text-sm text-green-800">
                      <div><strong>Administrador:</strong> Acesso completo a todas as funcionalidades</div>
                      <div><strong>Analista:</strong> Criar, editar, visualizar, exportar análises, copiar + visualizar projetos</div>
                      <div><strong>Usuário:</strong> Criar, editar, visualizar e exportar análises básicas</div>
                      <div><strong>Visualizador:</strong> Apenas visualizar informações do sistema</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Salvar Perfil
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Profiles List */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Perfis Cadastrados ({profiles.length})
            </h3>
            
            {profiles.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Nenhum perfil cadastrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {profiles.map((profile) => {
                  const summary = getPermissionsSummary(profile);
                  return (
                    <div
                      key={profile.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        (useSupabase ? profile.is_default : profile.isDefault)
                          ? 'border-blue-200 bg-blue-50' 
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900 truncate">
                              {profile.name}
                            </h4>
                            {(useSupabase ? profile.is_default : profile.isDefault) && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                <Star className="w-3 h-3 mr-1" />
                                Padrão
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {profile.description}
                          </p>
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>Criado em {new Date(useSupabase ? profile.created_at : profile.createdAt).toLocaleDateString('pt-BR')}</p>
                            <p>{summary.allowed} de {summary.total} permissões ativas ({summary.percentage}%)</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {!(useSupabase ? profile.is_default : profile.isDefault) && (
                            <button
                              onClick={() => handleSetDefault(profile.id)}
                              className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
                              title="Definir como padrão"
                            >
                              <StarOff className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(profile)}
                            disabled={showForm}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                            title="Editar perfil"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(profile.id)}
                            disabled={showForm || profiles.length <= 1}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                            title={profiles.length <= 1 ? "Não é possível excluir o último perfil" : "Excluir perfil"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Permissions Summary */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>Permissões por Módulo</span>
                          <span>{summary.percentage}% do total</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {summary.modules.map((module, index) => (
                            <div key={index} className="text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-gray-700 truncate">{module.module}</span>
                                <span className="text-gray-500">{module.percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1">
                                <div 
                                  className={`h-1 rounded-full transition-all duration-300 ${
                                    module.percentage === 100 ? 'bg-green-500' :
                                    module.percentage > 50 ? 'bg-blue-500' :
                                    module.percentage > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                                  }`}
                                  style={{ width: `${module.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};