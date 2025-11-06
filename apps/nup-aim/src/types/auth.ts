export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // In a real app, this would be hashed
  profileId: string;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isDefault: boolean;
  createdAt: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  allowed: boolean;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (module: string, action: string) => boolean;
  isAuthenticated: boolean;
  verifyEmail: (token: string) => Promise<{ success: boolean; message: string }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; message: string }>;
}

// Available system modules and actions
export const SYSTEM_MODULES = {
  ANALYSIS: {
    name: 'Análises de Impacto',
    actions: {
      CREATE: 'Criar',
      EDIT: 'Editar',
      DELETE: 'Excluir',
      VIEW: 'Visualizar',
      EXPORT: 'Exportar',
      COPY: 'Copiar'
    }
  },
  PROJECTS: {
    name: 'Projetos',
    actions: {
      CREATE: 'Criar',
      EDIT: 'Editar',
      DELETE: 'Excluir',
      VIEW: 'Visualizar',
      MANAGE: 'Gerenciar'
    }
  },
  USERS: {
    name: 'Usuários',
    actions: {
      CREATE: 'Criar',
      EDIT: 'Editar',
      DELETE: 'Excluir',
      VIEW: 'Visualizar',
      MANAGE: 'Gerenciar'
    }
  },
  PROFILES: {
    name: 'Perfis',
    actions: {
      CREATE: 'Criar',
      EDIT: 'Editar',
      DELETE: 'Excluir',
      VIEW: 'Visualizar',
      MANAGE: 'Gerenciar'
    }
  },
  DATA: {
    name: 'Dados do Sistema',
    actions: {
      MANAGE: 'Gerenciar',
      BACKUP: 'Backup e Restauração',
      STATUS: 'Verificar Status'
    }
  }
} as const;

// Definição de sessão
export interface Session {
  userId: string;
  username: string;
  loginTime: number;
  sessionId: string;
  lastActivity: number;
}