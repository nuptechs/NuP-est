/**
 * Custom Fields SDK
 * 
 * Simple JavaScript library for integrating with Custom Fields Microservice
 * Framework-agnostic - works with React, Vue, Angular, vanilla JS, etc.
 * 
 * @example
 * // Initialize
 * const sdk = new CustomFieldsSDK('http://localhost:3002');
 * 
 * // Register sections on app initialization
 * await sdk.registerSections([
 *   { id: 'user-profile', name: 'user_profile', label: 'User Profile' }
 * ]);
 * 
 * // Fetch fields for a section
 * const fields = await sdk.getFields('user_profile');
 * 
 * // Save field values
 * await sdk.saveValue('analysis-123', 'field-uuid', 'user_profile', 'John Doe');
 */

export class CustomFieldsSDK {
  constructor(baseUrl = 'http://localhost:3002') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiUrl = `${this.baseUrl}/api`;
  }

  /**
   * Make HTTP request
   * @private
   */
  async _request(endpoint, options = {}) {
    const url = `${this.apiUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error(`[CustomFieldsSDK] Error on ${endpoint}:`, error);
      throw error;
    }
  }

  // ============================================
  // SECTIONS API
  // ============================================

  /**
   * Register application sections with the microservice
   * Call this once when your application initializes
   * 
   * @param {Array} sections - Array of section objects
   * @param {string} sections[].id - Unique section ID
   * @param {string} sections[].name - Section name (snake_case)
   * @param {string} sections[].label - Display label
   * @param {string} [sections[].description] - Optional description
   * @param {string} [sections[].component_name] - Optional component name
   * @returns {Promise<Object>} Response with registered sections
   * 
   * @example
   * await sdk.registerSections([
   *   { 
   *     id: 'basic-info', 
   *     name: 'basic_info', 
   *     label: 'Basic Information',
   *     description: 'Core data fields'
   *   }
   * ]);
   */
  async registerSections(sections) {
    return this._request('/sections/register', {
      method: 'POST',
      body: JSON.stringify({ sections })
    });
  }

  /**
   * Get all registered sections
   * @returns {Promise<Array>} List of sections
   */
  async getSections() {
    const response = await this._request('/sections');
    return response.data || [];
  }

  /**
   * Get a specific section by name
   * @param {string} sectionName - Section name
   * @returns {Promise<Object>} Section object
   */
  async getSection(sectionName) {
    const response = await this._request(`/sections/${sectionName}`);
    return response.data;
  }

  // ============================================
  // CUSTOM FIELDS API
  // ============================================

  /**
   * Get all custom fields for a section
   * @param {string} sectionName - Section name
   * @returns {Promise<Array>} Array of field definitions
   * 
   * @example
   * const fields = await sdk.getFields('user_profile');
   * // Returns: [{ id: 'uuid', name: 'phone', label: 'Phone Number', type: 'text', ... }]
   */
  async getFields(sectionName) {
    const response = await this._request(`/custom-fields?section=${sectionName}`);
    return response.data || [];
  }

  /**
   * Create a new custom field
   * @param {Object} field - Field configuration
   * @param {string} field.name - Field name (unique within section)
   * @param {string} field.label - Display label
   * @param {string} field.type - Field type (text, textarea, number, date, etc)
   * @param {string} field.form_section - Section name
   * @param {boolean} [field.required] - Is required
   * @param {string} [field.placeholder] - Placeholder text
   * @param {string} [field.default_value] - Default value
   * @param {string} [field.help_text] - Help text
   * @returns {Promise<Object>} Created field
   */
  async createField(field) {
    return this._request('/custom-fields', {
      method: 'POST',
      body: JSON.stringify(field)
    });
  }

  /**
   * Update a custom field
   * @param {string} fieldId - Field UUID
   * @param {Object} updates - Field updates
   * @returns {Promise<Object>} Updated field
   */
  async updateField(fieldId, updates) {
    return this._request(`/custom-fields/${fieldId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Delete a custom field
   * @param {string} fieldId - Field UUID
   * @returns {Promise<Object>} Success response
   */
  async deleteField(fieldId) {
    return this._request(`/custom-fields/${fieldId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Reorder fields in a section
   * @param {Array<Object>} fields - Array of {id: 'uuid'} in desired order
   * @returns {Promise<Object>} Success response
   * 
   * @example
   * await sdk.reorderFields([
   *   { id: 'field-uuid-3' },
   *   { id: 'field-uuid-1' },
   *   { id: 'field-uuid-2' }
   * ]);
   */
  async reorderFields(fields) {
    return this._request('/custom-fields/reorder', {
      method: 'POST',
      body: JSON.stringify({ fields })
    });
  }

  // ============================================
  // FIELD VALUES API
  // ============================================

  /**
   * Get field values for a specific entity (e.g., analysis, user, form)
   * @param {string} entityId - Entity ID (e.g., analysis UUID)
   * @param {string} sectionName - Section name (optional)
   * @returns {Promise<Object>} Object mapping field IDs to values
   * 
   * @example
   * const values = await sdk.getValues('analysis-123', 'basic_info');
   * // Returns: { 'field-uuid-1': 'value1', 'field-uuid-2': 'value2' }
   */
  async getValues(entityId, sectionName = null) {
    const response = await this._request(`/forms/analysis/${entityId}/values`);
    const data = response.data || {};
    
    // Convert grouped format to flat format
    const flatValues = {};
    if (sectionName) {
      // Return only values for the requested section
      const sectionData = data[sectionName] || [];
      sectionData.forEach(item => {
        flatValues[item.field_id] = item.value;
      });
    } else {
      // Return all values
      Object.values(data).forEach(sectionArray => {
        sectionArray.forEach(item => {
          flatValues[item.field_id] = item.value;
        });
      });
    }
    return flatValues;
  }

  /**
   * Save a single field value
   * @param {string} entityId - Entity ID (analysis ID)
   * @param {string} fieldId - Field UUID
   * @param {string} sectionName - Section name (not used in current API)
   * @param {any} value - Field value
   * @returns {Promise<Object>} Saved value object
   */
  async saveValue(entityId, fieldId, sectionName, value) {
    return this._request('/forms/values', {
      method: 'POST',
      body: JSON.stringify({
        values: [{
          field_id: fieldId,
          analysis_id: entityId,
          value: String(value)
        }]
      })
    });
  }

  /**
   * Save multiple field values at once
   * @param {string} entityId - Entity ID (analysis ID)
   * @param {string} sectionName - Section name (not used in current API)
   * @param {Object} values - Object mapping field IDs to values
   * @returns {Promise<Object>} Save response
   * 
   * @example
   * await sdk.saveValues('analysis-123', 'basic_info', {
   *   'field-uuid-1': 'John Doe',
   *   'field-uuid-2': '2025-11-06'
   * });
   */
  async saveValues(entityId, sectionName, values) {
    const valuesArray = Object.entries(values).map(([fieldId, value]) => ({
      field_id: fieldId,
      analysis_id: entityId,
      value: String(value)
    }));
    
    return this._request('/forms/values', {
      method: 'POST',
      body: JSON.stringify({ values: valuesArray })
    });
  }

  // ============================================
  // WIDGET HELPERS
  // ============================================

  /**
   * Get admin panel URL
   * @returns {string} Admin panel URL
   */
  getAdminUrl() {
    return `${this.baseUrl}/widgets/admin`;
  }

  /**
   * Get demo page URL
   * @returns {string} Demo page URL
   */
  getDemoUrl() {
    return `${this.baseUrl}/widgets/demo`;
  }

  /**
   * Open admin panel in new window
   */
  openAdminPanel() {
    window.open(this.getAdminUrl(), '_blank');
  }

  /**
   * Health check
   * @returns {Promise<Object>} Service health status
   */
  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// Default export for ES modules
export default CustomFieldsSDK;

// UMD export for browser <script> tags
if (typeof window !== 'undefined') {
  window.CustomFieldsSDK = CustomFieldsSDK;
}
