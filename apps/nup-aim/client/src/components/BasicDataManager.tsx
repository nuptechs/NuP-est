import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, Check, X, Star, StarOff } from 'lucide-react';
import { Project } from '../types';
import { getStoredProjects, saveProject, deleteProject, generateProjectId } from '../utils/projectStorage';

interface BasicDataManagerProps {
  onClose: () => void;
}

export const BasicDataManager: React.FC<BasicDataManagerProps> = ({ onClose }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    acronym: '',
    isDefault: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    const stored = getStoredProjects();
    setProjects(stored);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome do projeto é obrigatório';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!formData.acronym.trim()) {
      newErrors.acronym = 'Sigla é obrigatória';
    } else if (formData.acronym.length < 1 || formData.acronym.length > 10) {
      newErrors.acronym = 'Sigla deve ter entre 1 e 10 caracteres';
    }
    
    // Check for duplicate names (excluding current editing project)
    const duplicateName = projects.find(p => 
      p.name.toLowerCase() === formData.name.toLowerCase() && 
      p.id !== editingProject
    );
    if (duplicateName) {
      newErrors.name = 'Já existe um projeto com este nome';
    }
    
    // Check for duplicate acronyms (excluding current editing project)
    const duplicateAcronym = projects.find(p => 
      p.acronym.toLowerCase() === formData.acronym.toLowerCase() && 
      p.id !== editingProject
    );
    if (duplicateAcronym) {
      newErrors.acronym = 'Já existe um projeto com esta sigla';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    
    const project: Project = {
      id: editingProject || generateProjectId(),
      name: formData.name.trim(),
      acronym: formData.acronym.trim(),
      isDefault: formData.isDefault,
      createdAt: editingProject ? 
        projects.find(p => p.id === editingProject)?.createdAt || new Date().toISOString() :
        new Date().toISOString()
    };
    
    saveProject(project);
    loadProjects();
    handleCancel();
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project.id);
    setFormData({
      name: project.name,
      acronym: project.acronym,
      isDefault: project.isDefault
    });
    setShowForm(true);
    setErrors({});
  };

  const handleDelete = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    if (projects.length <= 1) {
      alert('Não é possível excluir o último projeto. Deve haver pelo menos um projeto cadastrado.');
      return;
    }
    
    if (window.confirm(`Tem certeza que deseja excluir o projeto "${project.name}"?`)) {
      const success = deleteProject(id);
      if (success) {
        loadProjects();
      } else {
        alert('Não foi possível excluir o projeto.');
      }
    }
  };

  const handleSetDefault = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      const updatedProject = { ...project, isDefault: true };
      saveProject(updatedProject);
      loadProjects();
    }
  };

  const handleCancel = () => {
    setEditingProject(null);
    setShowForm(false);
    setFormData({ name: '', acronym: '', isDefault: false });
    setErrors({});
  };

  const handleNewProject = () => {
    setEditingProject(null);
    setFormData({ name: '', acronym: '', isDefault: false });
    setShowForm(true);
    setErrors({});
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Dados Básicos - Projetos</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewProject}
              disabled={showForm}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Projeto
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Form */}
          {showForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Projeto *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="Ex: Sistema de Gestão de Contratos"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sigla *
                  </label>
                  <input
                    type="text"
                    value={formData.acronym}
                    onChange={(e) => setFormData({ ...formData, acronym: e.target.value.toUpperCase() })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.acronym ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="Ex: SGC"
                    maxLength={10}
                  />
                  {errors.acronym && (
                    <p className="text-sm text-red-600 mt-1">{errors.acronym}</p>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Definir como projeto padrão</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  O projeto padrão será selecionado automaticamente ao criar novas análises
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Salvar
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Projects List */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Projetos Cadastrados ({projects.length})
            </h3>
            
            {projects.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Settings className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Nenhum projeto cadastrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      project.isDefault 
                        ? 'border-blue-200 bg-blue-50' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium text-gray-900 truncate">
                            {project.name}
                          </h4>
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                            {project.acronym}
                          </span>
                          {project.isDefault && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              <Star className="w-3 h-3 mr-1" />
                              Padrão
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Criado em {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {!project.isDefault && (
                          <button
                            onClick={() => handleSetDefault(project.id)}
                            className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
                            title="Definir como padrão"
                          >
                            <StarOff className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(project)}
                          disabled={showForm}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                          title="Editar projeto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          disabled={showForm || projects.length <= 1}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                          title={projects.length <= 1 ? "Não é possível excluir o último projeto" : "Excluir projeto"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Info Box */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Informações Importantes</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Deve haver pelo menos um projeto cadastrado no sistema</li>
              <li>• O projeto padrão será selecionado automaticamente em novas análises</li>
              <li>• Apenas um projeto pode ser definido como padrão por vez</li>
              <li>• Nomes e siglas devem ser únicos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};