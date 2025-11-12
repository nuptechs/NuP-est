import { ImpactAnalysis } from '../types';

const STORAGE_KEY = 'impact_analyses';

export const saveAnalysis = (analysis: ImpactAnalysis): void => {
  const analyses = getStoredAnalyses();
  const existingIndex = analyses.findIndex(a => a.id === analysis.id);
  
  if (existingIndex >= 0) {
    analyses[existingIndex] = analysis;
  } else {
    analyses.push(analysis);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
};

export const getStoredAnalyses = (): ImpactAnalysis[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Erro ao carregar análises:', error);
    return [];
  }
};

export const deleteAnalysis = (id: string): void => {
  const analyses = getStoredAnalyses();
  const filtered = analyses.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const generateNewId = (): string => {
  return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};