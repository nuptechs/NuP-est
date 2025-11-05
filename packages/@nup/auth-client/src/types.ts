import type { User } from '@nup/shared-types';

export interface AuthState {
  user: User | null;
  permissions: Permission[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface Permission {
  app: string; // 'nup-study', 'nup-chunks', etc
  feature: string; // 'mindmaps', 'flashcards', etc
  actions: ('read' | 'write' | 'delete')[];
}

export interface AuthConfig {
  appId: string;
  identifyUrl?: string; // URL do NuP-Identify (default: https://identify.nup.com)
}
