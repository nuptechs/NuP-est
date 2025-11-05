import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export interface PersonalizedAssistant {
  id: string;
  userId: string;
  profileId: string;
  name: string;
  personality: string;
  communicationStyle: string;
  shortTermMemory: any;
  longTermMemory: any;
  currentAdaptations: any;
  isActive: boolean | null;
  lastInteraction: Date | null;
  totalInteractions: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile {
  id: string;
  userId: string;
  version: number;
  isActive: boolean | null;
  customDifficulties: string | null;
  strengths: any;
  weaknesses: any;
  optimalStudyDuration: number | null;
  bestStudyTimes: string[];
  preferredContentTypes: string[];
  primaryGoal: string;
  secondaryGoals: string[];
  targetDate: Date | null;
  availableHoursPerDay: string | null;
  motivationLevel: string | null;
  needsEncouragement: boolean | null;
  respondsToGamification: boolean | null;
  prefersStructuredPlan: boolean | null;
  discoverySource: string;
  confidenceScore: string | null;
  totalInteractions: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssistantWithProfile {
  assistant: PersonalizedAssistant;
  profile: StudentProfile | null;
}

/**
 * Hook para gerenciar assistente personalizado do usuário
 */
export function usePersonalizedAssistant() {
  // Buscar assistente do usuário
  const { data, isLoading, error } = useQuery<AssistantWithProfile>({
    queryKey: ['/api/assistant/my-assistant'],
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Criar assistente
  const createAssistant = useMutation({
    mutationFn: async (config?: { name?: string; configuration?: any }) => {
      const response = await apiRequest("POST", "/api/assistant/create", config);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/my-assistant'] });
    },
  });

  // Atualizar configuração do assistente
  const updateConfiguration = useMutation({
    mutationFn: async (config: { assistantId: string; configuration: any }) => {
      const response = await apiRequest("PATCH", "/api/assistant/configure", config);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/my-assistant'] });
    },
  });

  return {
    assistant: data?.assistant || null,
    profile: data?.profile || null,
    isLoading,
    error,
    createAssistant,
    updateConfiguration,
    hasAssistant: !!data?.assistant,
  };
}
