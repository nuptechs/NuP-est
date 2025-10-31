import { useEffect, useState, useCallback } from 'react';
import type { MindMapData, MindMapConfig, AIGenerationOptions } from '../core/types';
import { useMindMapEngine } from '../engine/MindMapEngine';
import { mindMapStorage } from '../storage/MindMapStorage';
import { mindMapAI } from '../ai/MindMapAI';

export interface UseMindMapOptions {
  title: string;
  config?: MindMapConfig;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

export function useMindMap(options: UseMindMapOptions) {
  const {
    title,
    config,
    autoSave = true,
    autoSaveInterval = 5000,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    mindMap,
    nodes,
    edges,
    selectedNodes,
    initializeMindMap,
    loadMindMap,
    addNode,
    updateNode,
    deleteNode,
    selectNode,
    clearSelection,
    collapseNode,
    expandNode,
    applyLayout,
    undo,
    redo,
    exportData,
  } = useMindMapEngine();

  useEffect(() => {
    initializeMindMap(title, config);
  }, [title, config, initializeMindMap]);

  useEffect(() => {
    if (autoSave && mindMap) {
      const interval = setInterval(async () => {
        try {
          const data = exportData();
          await mindMapStorage.save(data);
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }, autoSaveInterval);

      return () => clearInterval(interval);
    }
  }, [autoSave, autoSaveInterval, mindMap, exportData]);

  const save = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = exportData();
      await mindMapStorage.save(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [exportData]);

  const load = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const data = await mindMapStorage.load(id);
      if (data) {
        loadMindMap(data);
      }
      setError(null);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadMindMap]);

  const generateFromAI = useCallback(async (aiOptions: AIGenerationOptions) => {
    try {
      setIsLoading(true);
      const data = await mindMapAI.generateFromPrompt(aiOptions);
      loadMindMap(data);
      applyLayout();
      setError(null);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadMindMap, applyLayout]);

  const generateFromMaterial = useCallback(async (materialId: string) => {
    try {
      setIsLoading(true);
      const data = await mindMapAI.generateFromMaterial(materialId);
      loadMindMap(data);
      applyLayout();
      setError(null);
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadMindMap, applyLayout]);

  return {
    mindMap,
    nodes,
    edges,
    selectedNodes,
    isLoading,
    error,
    
    addNode,
    updateNode,
    deleteNode,
    selectNode,
    clearSelection,
    collapseNode,
    expandNode,
    applyLayout,
    undo,
    redo,
    
    save,
    load,
    generateFromAI,
    generateFromMaterial,
    export: exportData,
  };
}
