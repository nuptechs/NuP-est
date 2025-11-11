import { User, Profile, Permission, SYSTEM_MODULES } from '../types/auth';
import { sendVerificationEmail } from './emailService';

const USERS_STORAGE_KEY = 'nup_aim_users';
const PROFILES_STORAGE_KEY = 'nup_aim_profiles';
const CURRENT_USER_KEY = 'nup_aim_current_user';

export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateVerificationToken = (): string => {
  return Math.random().toString(36).substr(2, 32) + Date.now().toString(36);
};

export const generateDefaultPermissions = (isAdmin: boolean = false): Permission[] => {
  const permissions: Permission[] = [];
  
  Object.entries(SYSTEM_MODULES).forEach(([moduleKey, module]) => {
    Object.entries(module.actions).forEach(([actionKey, actionName]) => {
      permissions.push({
        id: `${moduleKey}_${actionKey}`,
        module: moduleKey,
        action: actionKey,
        allowed: isAdmin
      });
    });
  });
  
  return permissions;
};

// Initialize default data
export const initializeAuthData = () => {
  try {
    const existingProfiles = localStorage.getItem(PROFILES_STORAGE_KEY);
    const existingUsers = localStorage.getItem(USERS_STORAGE_KEY);

    // Initialize profiles if none exist
    if (!existingProfiles) {
      const adminPermissions = generateDefaultPermissions(true);
      
      const adminProfile: Profile = {
        id: generateId(),
        name: 'Administrador',
        description: 'Acesso completo a todas as funcionalidades do sistema',
        permissions: adminPermissions,
        isDefault: false,
        createdAt: new Date().toISOString()
      };

      // Create user profile with specific permissions
      const userPermissions = generateDefaultPermissions(false).map(p => {
        // Allow basic analysis permissions for regular users
        if (p.module === 'ANALYSIS' && ['CREATE', 'EDIT', 'VIEW', 'EXPORT'].includes(p.action)) {
          return { ...p, allowed: true };
        }
        // Allow project viewing
        if (p.module === 'PROJECTS' && p.action === 'VIEW') {
          return { ...p, allowed: true };
        }
        return p;
      });

      const userProfile: Profile = {
        id: generateId(),
        name: 'Usuário Padrão',
        description: 'Acesso básico para criar e visualizar análises',
        permissions: userPermissions,
        isDefault: true,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify([adminProfile, userProfile]));
    }

    // Initialize admin user if none exist
    if (!existingUsers) {
      const profiles = JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) || '[]');
      const adminProfile = profiles.find((p: Profile) => p.name === 'Administrador');
      
      if (adminProfile) {
        const adminUser: User = {
          id: generateId(),
          username: 'admin',
          email: 'nuptechs@nuptechs.com',
          password: 'Senha@1010',
          profileId: adminProfile.id,
          isActive: true,
          isEmailVerified: true,
          createdAt: new Date().toISOString()
        };

        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([adminUser]));
      }
    } else {
      // Verificar e atualizar credenciais do admin se necessário
      const users = JSON.parse(existingUsers);
      let adminUser = users.find((u: User) => u.username === 'admin');
      
      if (adminUser) {
        // Atualizar credenciais do admin se necessário
        let needsUpdate = false;
        
        if (adminUser.email !== 'nuptechs@nuptechs.com') {
          adminUser.email = 'nuptechs@nuptechs.com';
          needsUpdate = true;
        }
        
        if (adminUser.password !== 'Senha@1010') {
          adminUser.password = 'Senha@1010';
          needsUpdate = true;
        }
        
        if (!adminUser.isEmailVerified) {
          adminUser.isEmailVerified = true;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        }
      } else {
        // Criar usuário admin se não existir
        const profiles = JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) || '[]');
        const adminProfile = profiles.find((p: Profile) => p.name === 'Administrador');
        
        if (adminProfile) {
          const newAdminUser: User = {
            id: generateId(),
            username: 'admin',
            email: 'nuptechs@nuptechs.com',
            password: 'Senha@1010',
            profileId: adminProfile.id,
            isActive: true,
            isEmailVerified: true,
            createdAt: new Date().toISOString()
          };

          users.push(newAdminUser);
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        }
      }
    }
  } catch (error) {
    console.error('Erro ao inicializar dados de autenticação:', error);
  }
};

// User functions
export const getStoredUsers = (): User[] => {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
    return [];
  }
};

export const saveUser = (user: User): void => {
  const users = getStoredUsers();
  const existingIndex = users.findIndex(u => u.id === user.id);
  
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const deleteUser = (id: string): boolean => {
  const users = getStoredUsers();
  
  if (users.length <= 1) {
    return false;
  }
  
  const filtered = users.filter(u => u.id !== id);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
};

// Profile functions
export const getStoredProfiles = (): Profile[] => {
  try {
    const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
    const profiles = stored ? JSON.parse(stored) : [];
    
    // Ensure at least one profile exists
    if (profiles.length === 0) {
      const adminProfile: Profile = {
        id: generateId(),
        name: 'Administrador',
        description: 'Acesso completo a todas as funcionalidades do sistema',
        permissions: generateDefaultPermissions(true),
        isDefault: false,
        createdAt: new Date().toISOString()
      };
      
      const userProfile: Profile = {
        id: generateId(),
        name: 'Usuário Padrão',
        description: 'Acesso básico para criar e visualizar análises',
        permissions: generateDefaultPermissions(false).map(p => ({
          ...p,
          allowed: p.module === 'ANALYSIS' && ['CREATE', 'EDIT', 'VIEW', 'EXPORT'].includes(p.action)
        })),
        isDefault: true,
        createdAt: new Date().toISOString()
      };
      
      profiles.push(adminProfile, userProfile);
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    }
    
    return profiles;
  } catch (error) {
    console.error('Erro ao carregar perfis:', error);
    return [];
  }
};

export const saveProfile = (profile: Profile): void => {
  const profiles = getStoredProfiles();
  const existingIndex = profiles.findIndex(p => p.id === profile.id);
  
  // If setting as default, remove default from others
  if (profile.isDefault) {
    profiles.forEach(p => p.isDefault = false);
  }
  
  if (existingIndex >= 0) {
    profiles[existingIndex] = profile;
  } else {
    profiles.push(profile);
  }
  
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
};

export const deleteProfile = (id: string): boolean => {
  const profiles = getStoredProfiles();
  const users = getStoredUsers();
  
  if (profiles.length <= 1) {
    return false;
  }
  
  // Check if any user is using this profile
  const usersWithProfile = users.filter(u => u.profileId === id);
  if (usersWithProfile.length > 0) {
    return false;
  }
  
  const profileToDelete = profiles.find(p => p.id === id);
  if (profileToDelete?.isDefault) {
    // Set another profile as default
    const otherProfile = profiles.find(p => p.id !== id);
    if (otherProfile) {
      otherProfile.isDefault = true;
      saveProfile(otherProfile);
    }
  }
  
  const filtered = profiles.filter(p => p.id !== id);
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(filtered));
  return true;
};

// Authentication functions
export const authenticateUser = (username: string, password: string): User | null => {
  const users = getStoredUsers();
  
  const user = users.find(u => {
    const usernameMatch = u.username.toLowerCase() === username.toLowerCase();
    const emailMatch = u.email.toLowerCase() === username.toLowerCase();
    const passwordMatch = u.password === password;
    const isActive = u.isActive;
    
    return (usernameMatch || emailMatch) && passwordMatch && isActive;
  });
  
  if (user) {
    // Check if email is verified
    if (!user.isEmailVerified) {
      return null;
    }
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    saveUser(user);
    
    // Store current user session with security measures
    const sessionData = {
      ...user,
      sessionId: Math.random().toString(36).substr(2, 9),
      loginTime: Date.now()
    };
    
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionData));
    localStorage.setItem('nup_aim_last_activity', Date.now().toString());
    
    return user;
  }
  
  return null;
};

export const getCurrentUser = (): User | null => {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (stored) {
      const sessionData = JSON.parse(stored);
      
      // Verify user still exists and is active
      const users = getStoredUsers();
      const currentUser = users.find(u => u.id === sessionData.id);
      
      if (currentUser?.isActive) {
        // Check session validity (7 minutes)
        const SESSION_TIMEOUT = 7 * 60 * 1000;
        const lastActivity = localStorage.getItem('nup_aim_last_activity');
        
        if (lastActivity) {
          const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
          if (timeSinceLastActivity > SESSION_TIMEOUT) {
            console.log('🕐 Sessão expirada, removendo usuário');
            logout();
            return null;
          }
        }
        
        return currentUser;
      }
    }
    return null;
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
};

export const logout = (): void => {
  console.log('🚪 Fazendo logout e limpando dados de sessão');
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem('nup_aim_session');
  localStorage.removeItem('nup_aim_last_activity');
};

export const getUserProfile = (user: User): Profile | null => {
  const profiles = getStoredProfiles();
  const profile = profiles.find(p => p.id === user.profileId);
  return profile || null;
};

// Enhanced email service integration
export const sendVerificationEmailToUser = async (user: User): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`🔄 Preparando email de verificação para: ${user.email}`);
    
    const token = generateVerificationToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // Token expires in 24 hours
    
    // Update user with verification token
    const updatedUser = {
      ...user,
      emailVerificationToken: token,
      emailVerificationExpires: expires.toISOString()
    };
    
    saveUser(updatedUser);
    console.log(`🔑 Token de verificação gerado: ${token.substring(0, 8)}...`);
    
    // Send email using the new email service
    const emailResult = await sendVerificationEmail(user, token);
    
    return emailResult;
  } catch (error) {
    console.error('💥 Erro crítico ao enviar email de verificação:', error);
    return {
      success: false,
      message: 'Erro interno do servidor. Tente novamente mais tarde.'
    };
  }
};

export const verifyEmailToken = (token: string): { success: boolean; message: string } => {
  try {
    console.log(`🔍 Verificando token: ${token.substring(0, 8)}...`);
    
    const users = getStoredUsers();
    const user = users.find(u => u.emailVerificationToken === token);
    
    if (!user) {
      console.error('❌ Token não encontrado no banco de dados');
      return {
        success: false,
        message: 'Token de verificação inválido ou expirado'
      };
    }
    
    console.log(`👤 Token encontrado para usuário: ${user.username} (${user.email})`);
    
    // Check if token has expired
    if (user.emailVerificationExpires) {
      const expirationDate = new Date(user.emailVerificationExpires);
      const now = new Date();
      
      console.log(`⏰ Verificando expiração:`);
      console.log(`   Token expira em: ${expirationDate.toLocaleString('pt-BR')}`);
      console.log(`   Hora atual: ${now.toLocaleString('pt-BR')}`);
      
      if (now > expirationDate) {
        console.error('⏰ Token expirado');
        return {
          success: false,
          message: 'Token de verificação expirado. Solicite um novo email de verificação.'
        };
      }
    }
    
    // Verify email
    const updatedUser = {
      ...user,
      isEmailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined
    };
    
    saveUser(updatedUser);
    
    console.log('✅ Email verificado com sucesso!');
    console.log(`📧 ${user.email} agora está verificado`);
    
    return {
      success: true,
      message: 'Email verificado com sucesso! Agora você pode fazer login.'
    };
  } catch (error) {
    console.error('💥 Erro ao verificar email:', error);
    return {
      success: false,
      message: 'Erro ao verificar email. Tente novamente.'
    };
  }
};

export const resendVerificationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`🔄 Solicitação de reenvio para: ${email}`);
    
    const users = getStoredUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error(`❌ Usuário não encontrado: ${email}`);
      return {
        success: false,
        message: 'Usuário não encontrado com este email'
      };
    }
    
    if (user.isEmailVerified) {
      console.log(`ℹ️ Email já verificado: ${email}`);
      return {
        success: false,
        message: 'Este email já foi verificado'
      };
    }
    
    console.log(`📤 Reenviando email de verificação para: ${user.username}`);
    
    const result = await sendVerificationEmailToUser(user);
    
    // Override the message for resend to be more specific
    if (result.success) {
      console.log('✅ Email de verificação reenviado com sucesso');
      return {
        success: true,
        message: 'O e-mail foi reenviado. Favor validar o link'
      };
    }
    
    console.error(`❌ Falha no reenvio: ${result.message}`);
    return result;
  } catch (error) {
    console.error('💥 Erro ao reenviar email de verificação:', error);
    return {
      success: false,
      message: 'Erro ao reenviar email de verificação. Tente novamente.'
    };
  }
};

// Export the new function name for compatibility
export { sendVerificationEmailToUser as sendVerificationEmail };