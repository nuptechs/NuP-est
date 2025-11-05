import { createContext, useState, useEffect, ReactNode } from 'react';
import type { AuthState, AuthConfig } from './types';

export const AuthContext = createContext<AuthState | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  config: AuthConfig;
}

export function AuthProvider({ children, config }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    permissions: [],
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // TODO: Integrar com NuP-Identify
    // Buscar sessão do usuário e permissões
    const identifyUrl = config.identifyUrl || 'https://identify.nup.com';
    
    fetch(`${identifyUrl}/api/auth/session`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        setAuthState({
          user: data.user,
          permissions: data.permissions[config.appId] || [],
          isLoading: false,
          isAuthenticated: !!data.user,
        });
      })
      .catch(error => {
        console.error('Auth error:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      });
  }, [config.appId, config.identifyUrl]);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}
