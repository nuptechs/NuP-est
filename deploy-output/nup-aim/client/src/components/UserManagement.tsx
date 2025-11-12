import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Check, X, Eye, EyeOff, Mail, AlertCircle } from 'lucide-react';
import { User, Profile } from '../types/auth';
import { 
  getStoredUsers, 
  saveUser, 
  deleteUser as deleteStoredUser, 
  getStoredProfiles, 
  generateId, 
  sendVerificationEmailToUser as sendVerificationEmailLocal 
} from '../utils/authStorage';

interface UserManagementProps {
  onClose: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onClose }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    profileId: '',
    isActive: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useSupabase, setUseSupabase] = useState(false);

  useEffect(() => {
    checkSupabaseAndLoadData();
  }, []);

  const checkSupabaseAndLoadData = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project.supabase.co') {
      try {
        console.log('🔗 Tentando usar Supabase para gerenciamento de usuários...');
        const { getUsers, getProfiles } = await import('../utils/supabaseAuth');
        const [usersData, profilesData] = await Promise.all([
          getUsers(),
          getProfiles()
        ]);
        setUsers(usersData);
        setProfiles(profilesData);
        setUseSupabase(true);
        console.log('✅ Usando Supabase para gerenciamento');
      } catch (error) {
        console.error('❌ Erro ao conectar com Supabase, usando localStorage:', error);
        loadLocalData();
      }
    } else {
      console.log('🔄 Usando localStorage para gerenciamento de usuários');
      loadLocalData();
    }
  };

  const loadLocalData = () => {
    setUsers(getStoredUsers());
    setProfiles(getStoredProfiles());
    setUseSupabase(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Nome de usuário é obrigatório';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Nome de usuário deve ter pelo menos 3 caracteres';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }
    
    if (!formData.profileId) {
      newErrors.profileId = 'Perfil é obrigatório';
    }
    
    // Check for duplicate usernames (excluding current editing user)
    const duplicateUsername = users.find(u => 
      u.username.toLowerCase() === formData.username.toLowerCase() && 
      u.id !== editingUser
    );
    if (duplicateUsername) {
      newErrors.username = 'Já existe um usuário com este nome';
    }
    
    // Check for duplicate emails (excluding current editing user)
    const duplicateEmail = users.find(u => 
      u.email.toLowerCase() === formData.email.toLowerCase() && 
      u.id !== editingUser
    );
    if (duplicateEmail) {
      newErrors.email = 'Já existe um usuário com este email';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsProcessing(true);
    
    try {
      if (useSupabase) {
        const { createUser, updateUser } = await import('../utils/supabaseAuth');
        
        if (editingUser) {
          // Update existing user
          const result = await updateUser(editingUser, {
            username: formData.username.trim(),
            email: formData.email.trim(),
            password: formData.password,
            profileId: formData.profileId,
            isActive: formData.isActive
          });

          if (!result.success) {
            alert(`Erro ao atualizar usuário: ${result.error}`);
            return;
          }
        } else {
          // Create new user
          const result = await createUser({
            username: formData.username.trim(),
            email: formData.email.trim(),
            password: formData.password,
            profileId: formData.profileId,
            isActive: formData.isActive
          });

          if (!result.success) {
            alert(`Erro ao criar usuário: ${result.error}`);
            return;
          }

          // Send verification email for new users
          if (result.user) {
            console.log('📧 Enviando email de verificação para novo usuário...');
            const { sendVerificationEmailToUser } = await import('../utils/supabaseAuth');
            const emailResult = await sendVerificationEmailToUser(result.user);
            
            if (emailResult.success) {
              console.log('✅ Email de verificação enviado com sucesso');
            } else {
              console.error('❌ Falha no envio do email:', emailResult.message);
              alert(`Usuário criado, mas houve um problema no envio do email: ${emailResult.message}`);
            }
          }
        }
        
        await checkSupabaseAndLoadData();
      } else {
        // Use localStorage
        const user: User = {
          id: editingUser || generateId(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          profileId: formData.profileId,
          isActive: formData.isActive,
          isEmailVerified: editingUser ? 
            users.find(u => u.id === editingUser)?.isEmailVerified || false : 
            false,
          createdAt: editingUser ? 
            users.find(u => u.id === editingUser)?.createdAt || new Date().toISOString() :
            new Date().toISOString()
        };
        
        saveUser(user);
        
        // Send verification email for new users
        if (!editingUser) {
          console.log('📧 Enviando email de verificação para novo usuário...');
          const emailResult = await sendVerificationEmailLocal(user);
          
          if (emailResult.success) {
            console.log('✅ Email de verificação enviado com sucesso');
          } else {
            console.error('❌ Falha no envio do email:', emailResult.message);
            alert(`Usuário criado, mas houve um problema no envio do email: ${emailResult.message}`);
          }
        }
        
        loadLocalData();
      }
      
      handleCancel();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      alert('Erro ao salvar usuário. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user.id);
    setFormData({
      username: user.username,
      email: user.email,
      password: useSupabase ? '' : user.password,
      confirmPassword: useSupabase ? '' : user.password,
      profileId: useSupabase ? user.profile_id : user.profileId,
      isActive: useSupabase ? user.is_active : user.isActive
    });
    setShowForm(true);
    setErrors({});
  };

  const handleDelete = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    if (users.length <= 1) {
      alert('Não é possível excluir o último usuário. Deve haver pelo menos um usuário cadastrado.');
      return;
    }
    
    if (window.confirm(`Tem certeza que deseja excluir o usuário "${user.username}"?`)) {
      try {
        if (useSupabase) {
          const { deleteUser } = await import('../utils/supabaseAuth');
          const result = await deleteUser(id);
          if (result.success) {
            await checkSupabaseAndLoadData();
          } else {
            alert(`Erro ao excluir usuário: ${result.error}`);
          }
        } else {
          const success = deleteStoredUser(id);
          if (success) {
            loadLocalData();
          } else {
            alert('Não foi possível excluir o usuário.');
          }
        }
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário. Tente novamente.');
      }
    }
  };

  const handleResendVerification = async (user: any) => {
    const isEmailVerified = useSupabase ? user.is_email_verified : user.isEmailVerified;
    
    if (isEmailVerified) {
      alert('Este usuário já possui email verificado.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log(`🔄 Reenviando verificação para: ${user.email}`);
      
      if (useSupabase) {
        const { sendVerificationEmailToUser } = await import('../utils/supabaseAuth');
        const result = await sendVerificationEmailToUser(user);
        
        if (result.success) {
          alert('O e-mail foi reenviado. Favor validar o link');
        } else {
          alert(`Erro: ${result.message}`);
        }
      } else {
        const result = await sendVerificationEmailLocal(user);
        
        if (result.success) {
          alert('O e-mail foi reenviado. Favor validar o link');
        } else {
          alert(`Erro: ${result.message}`);
        }
      }
    } catch (error) {
      console.error('Erro ao reenviar email:', error);
      alert('Erro ao reenviar email de verificação. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setShowForm(false);
    setFormData({ username: '', email: '', password: '', confirmPassword: '', profileId: '', isActive: true });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleNewUser = () => {
    setEditingUser(null);
    const defaultProfile = profiles.find(p => useSupabase ? p.is_default : p.isDefault);
    setFormData({ 
      username: '', 
      email: '', 
      password: '', 
      confirmPassword: '',
      profileId: defaultProfile?.id || '', 
      isActive: true 
    });
    setShowForm(true);
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const getProfileName = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    return profile?.name || 'Perfil não encontrado';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Gerenciar Usuários</h2>
            <span className={`text-xs px-2 py-1 rounded ${useSupabase ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {useSupabase ? 'Supabase' : 'Local'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewUser}
              disabled={showForm || isProcessing}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </button>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
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
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              
              {!editingUser && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-800 font-medium">Verificação de Email Obrigatória</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Um email de verificação será enviado automaticamente para o novo usuário. 
                        O login só será permitido após a confirmação do email.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome de Usuário *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={isProcessing}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 ${
                      errors.username ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="Ex: joao.silva"
                  />
                  {errors.username && (
                    <p className="text-sm text-red-600 mt-1">{errors.username}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isProcessing}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 ${
                      errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="Ex: joao.silva@empresa.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={isProcessing}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 ${
                        errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isProcessing}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      disabled={isProcessing}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 ${
                        errors.confirmPassword ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="Digite a senha novamente"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isProcessing}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Perfil *
                  </label>
                  <select
                    value={formData.profileId}
                    onChange={(e) => setFormData({ ...formData, profileId: e.target.value })}
                    disabled={isProcessing}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 ${
                      errors.profileId ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                  >
                    <option value="">Selecione um perfil</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                  {errors.profileId && (
                    <p className="text-sm text-red-600 mt-1">{errors.profileId}</p>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    disabled={isProcessing}
                    className="mr-2 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700">Usuário ativo</span>
                </label>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={isProcessing}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingUser ? 'Salvando...' : 'Criando...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Salvar
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Users List */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Usuários Cadastrados ({users.length})
            </h3>
            
            {users.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Nenhum usuário cadastrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Perfil
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email Verificado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Último Login
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{getProfileName(useSupabase ? user.profile_id : user.profileId)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            (useSupabase ? user.is_active : user.isActive)
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {(useSupabase ? user.is_active : user.isActive) ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              (useSupabase ? user.is_email_verified : user.isEmailVerified)
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {(useSupabase ? user.is_email_verified : user.isEmailVerified) ? 'Verificado' : 'Pendente'}
                            </span>
                            {!(useSupabase ? user.is_email_verified : user.isEmailVerified) && (
                              <button
                                onClick={() => handleResendVerification(user)}
                                disabled={isProcessing}
                                className="text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                                title="Reenviar email de verificação"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(useSupabase ? user.last_login : user.lastLogin)
                            ? new Date(useSupabase ? user.last_login : user.lastLogin).toLocaleDateString('pt-BR')
                            : 'Nunca'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              disabled={showForm || isProcessing}
                              className="text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                              title="Editar usuário"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              disabled={showForm || users.length <= 1 || isProcessing}
                              className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                              title={users.length <= 1 ? "Não é possível excluir o último usuário" : "Excluir usuário"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};