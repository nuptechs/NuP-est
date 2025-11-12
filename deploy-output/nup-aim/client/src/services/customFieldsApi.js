// Custom Fields API Client for NuP_AIM integration

const CUSTOM_FIELDS_API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://custom-fields-api.seu-dominio.com'
  : 'http://localhost:3001';

class CustomFieldsAPI {
  constructor(baseURL = CUSTOM_FIELDS_API_URL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Custom Fields API Error:', error);
      throw error;
    }
  }

  // Custom Fields Management
  async getCustomFields(section = null, activeOnly = true) {
    const params = new URLSearchParams();
    if (section) params.append('section', section);
    if (!activeOnly) params.append('active_only', 'false');
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/custom-fields${query}`);
  }

  async getCustomField(id) {
    return this.request(`/api/custom-fields/${id}`);
  }

  async createCustomField(fieldData) {
    return this.request('/api/custom-fields', {
      method: 'POST',
      body: JSON.stringify(fieldData)
    });
  }

  async updateCustomField(id, updates) {
    return this.request(`/api/custom-fields/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteCustomField(id) {
    return this.request(`/api/custom-fields/${id}`, {
      method: 'DELETE'
    });
  }

  async reorderFields(fields) {
    return this.request('/api/custom-fields/reorder', {
      method: 'POST',
      body: JSON.stringify({ fields })
    });
  }

  // Form Sections
  async getFormSections() {
    return this.request('/api/forms/sections');
  }

  async getFieldsBySection(section) {
    return this.request(`/api/forms/sections/${section}/fields`);
  }

  // Field Values
  async getAnalysisValues(analysisId) {
    return this.request(`/api/forms/analysis/${analysisId}/values`);
  }

  async saveFieldValues(values) {
    return this.request('/api/forms/values', {
      method: 'POST',
      body: JSON.stringify({ values })
    });
  }

  async updateFieldValue(id, value) {
    return this.request(`/api/forms/values/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ value })
    });
  }

  async deleteAnalysisValues(analysisId) {
    return this.request(`/api/forms/analysis/${analysisId}/values`, {
      method: 'DELETE'
    });
  }

  async exportAnalysisData(analysisId) {
    return this.request(`/api/forms/export/${analysisId}`);
  }

  // Health Check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create singleton instance
export const customFieldsAPI = new CustomFieldsAPI();

// Export class for custom instances
export { CustomFieldsAPI };

// Helper functions for common operations
export const customFieldsHelpers = {
  // Check if custom fields service is available
  async isServiceAvailable() {
    try {
      await customFieldsAPI.healthCheck();
      return true;
    } catch (error) {
      console.warn('Custom Fields Service not available:', error.message);
      return false;
    }
  },

  // Get all custom fields grouped by section
  async getFieldsByAllSections() {
    try {
      const sectionsResponse = await customFieldsAPI.getFormSections();
      const sections = sectionsResponse.data || [];
      
      const fieldsPromises = sections.map(async (section) => {
        const fieldsResponse = await customFieldsAPI.getFieldsBySection(section.name);
        return {
          section: section.name,
          label: section.label,
          fields: fieldsResponse.data || []
        };
      });

      return await Promise.all(fieldsPromises);
    } catch (error) {
      console.error('Error fetching fields by sections:', error);
      return [];
    }
  },

  // Validate field value based on field configuration
  validateFieldValue(field, value) {
    const errors = [];

    // Required validation
    if (field.required && (!value || value.toString().trim() === '')) {
      errors.push(`${field.label} é obrigatório`);
    }

    // Type-specific validation
    if (value && value.toString().trim() !== '') {
      switch (field.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push(`${field.label} deve ser um email válido`);
          }
          break;

        case 'url':
          try {
            new URL(value);
          } catch {
            errors.push(`${field.label} deve ser uma URL válida`);
          }
          break;

        case 'number':
          if (isNaN(Number(value))) {
            errors.push(`${field.label} deve ser um número válido`);
          }
          break;

        case 'date':
          if (isNaN(Date.parse(value))) {
            errors.push(`${field.label} deve ser uma data válida`);
          }
          break;
      }
    }

    // Custom validation rules
    if (field.validation_rules && value) {
      try {
        const rules = typeof field.validation_rules === 'string' 
          ? JSON.parse(field.validation_rules) 
          : field.validation_rules;

        if (rules.min_length && value.length < rules.min_length) {
          errors.push(`${field.label} deve ter pelo menos ${rules.min_length} caracteres`);
        }

        if (rules.max_length && value.length > rules.max_length) {
          errors.push(`${field.label} deve ter no máximo ${rules.max_length} caracteres`);
        }

        if (rules.pattern) {
          const regex = new RegExp(rules.pattern);
          if (!regex.test(value)) {
            errors.push(rules.error_message || `${field.label} não atende ao formato exigido`);
          }
        }

        if (field.type === 'number') {
          const numValue = Number(value);
          if (rules.min_value !== undefined && numValue < rules.min_value) {
            errors.push(`${field.label} deve ser maior ou igual a ${rules.min_value}`);
          }
          if (rules.max_value !== undefined && numValue > rules.max_value) {
            errors.push(`${field.label} deve ser menor ou igual a ${rules.max_value}`);
          }
        }
      } catch (error) {
        console.warn('Error parsing validation rules:', error);
      }
    }

    return errors;
  },

  // Format field value for display
  formatFieldValue(field, value) {
    if (!value) return '';

    switch (field.type) {
      case 'date':
        try {
          return new Date(value).toLocaleDateString('pt-BR');
        } catch {
          return value;
        }

      case 'checkbox':
        return value === 'true' || value === true ? 'Sim' : 'Não';

      case 'select':
      case 'radio':
        if (field.options) {
          const options = typeof field.options === 'string' 
            ? JSON.parse(field.options) 
            : field.options;
          const option = options.find(opt => opt.value === value);
          return option ? option.label : value;
        }
        return value;

      default:
        return value;
    }
  }
};