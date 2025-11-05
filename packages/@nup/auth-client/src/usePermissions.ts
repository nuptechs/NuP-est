import { useAuth } from './useAuth';

export function usePermissions() {
  const { permissions } = useAuth();
  
  return {
    can: (feature: string, action: 'read' | 'write' | 'delete'): boolean => {
      return permissions.some(p => 
        p.feature === feature && p.actions.includes(action)
      );
    },
    
    hasFeature: (feature: string): boolean => {
      return permissions.some(p => p.feature === feature);
    },
    
    getAllFeatures: (): string[] => {
      return [...new Set(permissions.map(p => p.feature))];
    },
  };
}
