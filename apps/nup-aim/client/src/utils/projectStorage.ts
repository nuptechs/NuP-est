import { Project } from '../types';

const PROJECTS_STORAGE_KEY = 'nup_aim_projects';

export const getStoredProjects = (): Project[] => {
  try {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    const projects = stored ? JSON.parse(stored) : [];
    
    // Ensure at least one project exists
    if (projects.length === 0) {
      const defaultProject: Project = {
        id: generateProjectId(),
        name: 'Exemplo',
        acronym: 'Ex',
        isDefault: true,
        createdAt: new Date().toISOString()
      };
      projects.push(defaultProject);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    }
    
    return projects;
  } catch (error) {
    console.error('Erro ao carregar projetos:', error);
    // Return default project if error
    const defaultProject: Project = {
      id: generateProjectId(),
      name: 'Exemplo',
      acronym: 'Ex',
      isDefault: true,
      createdAt: new Date().toISOString()
    };
    return [defaultProject];
  }
};

export const saveProject = (project: Project): void => {
  const projects = getStoredProjects();
  const existingIndex = projects.findIndex(p => p.id === project.id);
  
  // If setting as default, remove default from others
  if (project.isDefault) {
    projects.forEach(p => p.isDefault = false);
  }
  
  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }
  
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
};

export const deleteProject = (id: string): boolean => {
  const projects = getStoredProjects();
  const projectToDelete = projects.find(p => p.id === id);
  
  // Don't allow deletion if it's the only project
  if (projects.length <= 1) {
    return false;
  }
  
  // Don't allow deletion of default project if it's the only default
  const defaultProjects = projects.filter(p => p.isDefault);
  if (projectToDelete?.isDefault && defaultProjects.length === 1) {
    // Set another project as default before deleting
    const otherProject = projects.find(p => p.id !== id);
    if (otherProject) {
      otherProject.isDefault = true;
    }
  }
  
  const filtered = projects.filter(p => p.id !== id);
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
};

export const getDefaultProject = (): Project | null => {
  const projects = getStoredProjects();
  return projects.find(p => p.isDefault) || projects[0] || null;
};

export const generateProjectId = (): string => {
  return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};