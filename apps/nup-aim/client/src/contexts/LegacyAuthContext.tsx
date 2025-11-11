import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, User, Profile } from '../types/auth';
import { 
  authenticateUser, 
  getCurrentUser, 
  logout as authLogout, 
  getUserProfile, 
  initializeAuthData,
  verifyEmailToken,
  resendVerificationEmail as resendEmail
} from '../utils/authStorage';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// Configurações de sessão
const SESSION_TIMEOUT = 7 * 60 * 1000; // 7 minutos em millisegundos
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Verificar atividade a cada 1 minuto
const SESSION_STORAGE_KEY = 'nup_aim_session';
const LAST_ACTIVITY_KEY = 'nup_aim_last_activity';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Função para atualizar última atividade
  const updateLastActivity = () => {
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  };

  // Função para verificar se a sessão expirou
  const isSessionExpired = (): boolean => {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return true;
    
    const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
    return timeSinceLastActivity > SESSION_TIMEOUT;
  };

  // Função para limpar sessão completamente
  const clearSession = () => {
    localStorage.removeItem('nup_aim_current_user');
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
    setProfile(null);
  };

  // Função para verificar e limpar sessão expirada
  const checkSessionExpiry = () => {
    if (user && isSessionExpired()) {
      console.log('🕐 Sessão expirada por inatividade');
      clearSession();
      alert('Sua sessão expirou por inatividade. Faça login novamente.');
    }
  };

  // Configurar listeners de atividade
  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (user) {
        updateLastActivity();
      }
    };

    // Adicionar listeners de atividade
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Verificar expiração de sessão periodicamente
    const sessionCheckInterval = setInterval(checkSessionExpiry, ACTIVITY_CHECK_INTERVAL);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearInterval(sessionCheckInterval);
    };
  }, [user]);

  // Verificar sessão existente ao carregar
  useEffect(() => {
    // Initialize auth data first
    initializeAuthData();
    
    // Verificar se há uma sessão válida
    const currentUser = getCurrentUser();
    if (currentUser) {
      // Verificar se a sessão não expirou
      if (!isSessionExpired()) {
        setUser(currentUser);
        const userProfile = getUserProfile(currentUser);
        setProfile(userProfile);
        updateLastActivity(); // Atualizar atividade ao restaurar sessão
        console.log('🔄 Sessão restaurada para:', currentUser.username);
      } else {
        console.log('🕐 Sessão expirada, limpando dados');
        clearSession();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    console.log('🔐 Iniciando processo de login...');
    console.log('👤 Usuário:', username);
    
    try {
      // Check if Supabase is configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project.supabase.co') {
        try {
          console.log('🔄 Tentando autenticação Supabase...');
          const { authenticateUser: supabaseAuth } = await import('../utils/supabaseAuth');
          const { user: supabaseUser, profile: supabaseProfile } = await supabaseAuth(username, password);
          
          if (supabaseUser && supabaseProfile) {
            console.log('✅ Autenticação Supabase bem-sucedida');
            setUser(supabaseUser);
            setProfile(supabaseProfile);
            
            // Criar sessão segura
            const sessionData = {
              userId: supabaseUser.id,
              username: supabaseUser.username,
              loginTime: Date.now(),
              sessionId: Math.random().toString(36).substr(2, 9)
            };
            
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
            localStorage.setItem('nup_aim_current_user', JSON.stringify(supabaseUser));
            updateLastActivity();
            
            return { success: true };
          }
          
          // Check if user exists but email is not verified
          const { getUsers } = await import('../utils/supabaseAuth');
          const users = await getUsers();
          const existingUser = users.find(u => 
            (u.username.toLowerCase() === username.toLowerCase() || 
             u.email.toLowerCase() === username.toLowerCase()) &&
            u.is_active
          );
          
          if (existingUser && !existingUser.is_email_verified) {
            console.log('❌ Email não verificado (Supabase)');
            return { 
              success: false, 
              message: 'Email não verificado. Verifique sua caixa de entrada e clique no link de confirmação.' 
            };
          }
          
          console.log('❌ Credenciais inválidas (Supabase)');
          return { success: false, message: 'Usuário ou senha inválidos' };
          
        } catch (supabaseError) {
          console.log('⚠️ Erro no Supabase, tentando localStorage:', supabaseError);
          // Fall back to local authentication
        }
      }
      
      // Use local authentication as fallback
      console.log('🔄 Tentando autenticação local...');
      const authenticatedUser = authenticateUser(username, password);
      
      if (authenticatedUser) {
        console.log('✅ Autenticação local bem-sucedida');
        setUser(authenticatedUser);
        const userProfile = getUserProfile(authenticatedUser);
        setProfile(userProfile);
        
        // Criar sessão segura
        const sessionData = {
          userId: authenticatedUser.id,
          username: authenticatedUser.username,
          loginTime: Date.now(),
          sessionId: Math.random().toString(36).substr(2, 9)
        };
        
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        updateLastActivity();
        
        return { success: true };
      }
      
      // Check if user exists but email is not verified
      const { getStoredUsers } = await import('../utils/authStorage');
      const users = getStoredUsers();
      const existingUser = users.find(u => 
        (u.username.toLowerCase() === username.toLowerCase() || 
         u.email.toLowerCase() === username.toLowerCase()) &&
        u.password === password &&
        u.isActive
      );
      
      if (existingUser && !existingUser.isEmailVerified) {
        console.log('❌ Email não verificado (local)');
        return { 
          success: false, 
          message: 'Email não verificado. Verifique sua caixa de entrada e clique no link de confirmação.' 
        };
      }
      
      console.log('❌ Credenciais inválidas');
      return { success: false, message: 'Usuário ou senha inválidos' };
      
    } catch (error) {
      console.error('💥 Erro crítico no login:', error);
      return { success: false, message: 'Erro ao fazer login. Tente novamente.' };
    }
  };

  const logout = () => {
    console.log('🚪 Fazendo logout e limpando sessão');
    authLogout();
    clearSession();
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!profile) return false;
    
    // Convert module and action to uppercase for consistency
    const upperModule = module.toUpperCase();
    const upperAction = action.toUpperCase();
    
    const permission = profile.permissions.find(
      p => p.module.toUpperCase() === upperModule && p.action.toUpperCase() === upperAction
    );
    
    return permission?.allowed || false;
  };

  const verifyEmail = async (token: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Try Supabase first
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project.supabase.co') {
        try {
          const { verifyEmailToken: supabaseVerify } = await import('../utils/supabaseAuth');
          return await supabaseVerify(token);
        } catch (error) {
          console.log('⚠️ Erro no Supabase, tentando localStorage:', error);
        }
      }
      
      // Fall back to local verification
      return verifyEmailToken(token);
    } catch (error) {
      console.error('💥 Erro na verificação de email:', error);
      return { success: false, message: 'Erro ao verificar email' };
    }
  };

  const resendVerificationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Try Supabase first
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project.supabase.co') {
        try {
          const { resendVerificationEmail: supabaseResend } = await import('../utils/supabaseAuth');
          return await supabaseResend(email);
        } catch (error) {
          console.log('⚠️ Erro no Supabase, tentando localStorage:', error);
        }
      }
      
      // Fall back to local resend
      return resendEmail(email);
    } catch (error) {
      console.error('💥 Erro no reenvio de email:', error);
      return { success: false, message: 'Erro ao reenviar email' };
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    login,
    logout,
    hasPermission,
    isAuthenticated: !!user,
    verifyEmail,
    resendVerificationEmail
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};