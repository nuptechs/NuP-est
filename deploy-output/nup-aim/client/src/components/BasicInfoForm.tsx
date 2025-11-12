import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { ImpactAnalysis, Project } from '../types';
import { getStoredProjects, getDefaultProject } from '../utils/projectStorage';
import { BasicDataManager } from './BasicDataManager';
import { CustomFieldsSection } from './CustomFieldsSection';
import { useAuth } from '../contexts/ApiAuthContext';

interface BasicInfoFormProps {
  data: ImpactAnalysis;
  onChange: (data: Partial<ImpactAnalysis>) => void;
  customFieldsValues?: Record<string, any>;
  onCustomFieldsChange?: (values: Record<string, any>) => void;
}

export const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ 
  data, 
  onChange, 
  customFieldsValues = {},
  onCustomFieldsChange 
}) => {
  const { hasPermission } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showDataManager, setShowDataManager] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    // Set default project if no project is selected
    if (!data.project && projects.length > 0) {
      const defaultProject = getDefaultProject();
      if (defaultProject) {
        onChange({ project: defaultProject.name });
      }
    }
  }, [projects, data.project, onChange]);

  const loadProjects = () => {
    const stored = getStoredProjects();
    setProjects(stored);
  };

  const handlePANumberChange = (value: string) => {
    // Remove any non-numeric characters except hyphens
    let cleaned = value.replace(/[^\d-]/g, '');
    
    // Ensure it starts with PA
    if (!cleaned.startsWith('PA')) {
      if (cleaned.startsWith('P')) {
        cleaned = 'PA' + cleaned.substring(1);
      } else {
        cleaned = 'PA' + cleaned;
      }
    }
    
    // Remove PA prefix for processing
    let numbers = cleaned.substring(2);
    
    // Remove any existing hyphens
    numbers = numbers.replace(/-/g, '');
    
    // Apply mask: 4 digits - 4 digits (year)
    if (numbers.length > 4) {
      numbers = numbers.substring(0, 4) + '-' + numbers.substring(4, 8);
    }
    
    // Reconstruct with PA prefix (no hyphen after PA)
    const formatted = 'PA' + numbers;
    
    onChange({ title: formatted });
  };

  const handleDataManagerOpen = () => {
    if (!hasPermission('PROJECTS', 'MANAGE')) {
      alert('Você não tem permissão para gerenciar projetos.');
      return;
    }
    setShowDataManager(true);
  };

  const handleDataManagerClose = () => {
    setShowDataManager(false);
    loadProjects();
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número da PA *
          </label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => handlePANumberChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="PA"
            maxLength={11}
            title="Formato: PANNNN-AAAA (4 números seguidos do ano com 4 dígitos)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Formato: PANNNN-AAAA (Ex: PA0001-2024)
          </p>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Projeto *
            </label>
            {hasPermission('PROJECTS', 'MANAGE') && (
              <button
                type="button"
                onClick={handleDataManagerOpen}
                className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                title="Gerenciar projetos"
              >
                <Settings className="w-3 h-3 mr-1" />
                Gerenciar
              </button>
            )}
          </div>
          <select
            value={data.project}
            onChange={(e) => onChange({ project: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="">Selecione um projeto</option>
            {projects.map((project) => (
              <option key={project.id} value={project.name}>
                {project.name}
              </option>
            ))}
          </select>
          {projects.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              Nenhum projeto cadastrado. {hasPermission('PROJECTS', 'MANAGE') ? 'Clique em "Gerenciar" para adicionar.' : 'Entre em contato com o administrador.'}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Autor *
          </label>
          <input
            type="text"
            value={data.author}
            onChange={(e) => onChange({ author: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Seu nome"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Versão
          </label>
          <input
            type="text"
            value={data.version}
            onChange={(e) => onChange({ version: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="1.0"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição *
          </label>
          <textarea
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Descreva o contexto e objetivo desta análise de impacto..."
          />
        </div>
      </div>

      {/* Custom Fields Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Campos Personalizados</h3>
        <CustomFieldsSection 
          sectionName="basic_info" 
          analysisId={data.id}
          initialValues={customFieldsValues}
          onValuesChange={onCustomFieldsChange}
        />
      </div>

      {/* Basic Data Manager Modal */}
      {showDataManager && (
        <BasicDataManager onClose={handleDataManagerClose} />
      )}
    </>
  );
};