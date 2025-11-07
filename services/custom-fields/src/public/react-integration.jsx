/**
 * React Integration for Custom Fields SDK
 * 
 * Ready-to-use hooks and components for React applications
 * 
 * @example
 * import { useCustomFields, DynamicFieldsRenderer } from './react-integration';
 * 
 * function MyForm() {
 *   return <DynamicFieldsRenderer 
 *     sectionName="user_profile" 
 *     entityId="user-123"
 *     onSave={(values) => console.log('Saved:', values)}
 *   />;
 * }
 */

import { useState, useEffect, useCallback } from 'react';
import CustomFieldsSDK from './custom-fields-sdk.js';

// Singleton SDK instance
let sdkInstance = null;

/**
 * Get or create SDK instance
 * @param {string} baseUrl - Microservice base URL
 * @returns {CustomFieldsSDK}
 */
export function getSDK(baseUrl = 'http://localhost:3002') {
  if (!sdkInstance) {
    sdkInstance = new CustomFieldsSDK(baseUrl);
  }
  return sdkInstance;
}

/**
 * Hook for managing custom fields
 * @param {string} sectionName - Section name
 * @param {string} entityId - Entity ID (optional, for loading values)
 * @returns {Object} Fields state and actions
 * 
 * @example
 * const { fields, values, loading, saveValue, saveAllValues } = useCustomFields('user_profile', 'user-123');
 */
export function useCustomFields(sectionName, entityId = null) {
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const sdk = getSDK();

  // Load fields
  useEffect(() => {
    if (!sectionName) return;

    setLoading(true);
    setError(null);

    sdk.getFields(sectionName)
      .then(setFields)
      .catch(err => {
        console.error('[useCustomFields] Failed to load fields:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [sectionName]);

  // Load values if entityId provided
  useEffect(() => {
    if (!sectionName || !entityId) return;

    sdk.getValues(entityId, sectionName)
      .then(setValues)
      .catch(err => {
        console.error('[useCustomFields] Failed to load values:', err);
      });
  }, [sectionName, entityId]);

  // Save single value
  const saveValue = useCallback(async (fieldId, value) => {
    if (!entityId) {
      console.warn('[useCustomFields] Cannot save value without entityId');
      return;
    }

    try {
      await sdk.saveValue(entityId, fieldId, sectionName, value);
      setValues(prev => ({ ...prev, [fieldId]: value }));
      return true;
    } catch (err) {
      console.error('[useCustomFields] Failed to save value:', err);
      throw err;
    }
  }, [entityId, sectionName]);

  // Save all values
  const saveAllValues = useCallback(async (valuesToSave = values) => {
    if (!entityId) {
      console.warn('[useCustomFields] Cannot save values without entityId');
      return;
    }

    setSaving(true);
    try {
      await sdk.saveValues(entityId, sectionName, valuesToSave);
      setValues(valuesToSave);
      return true;
    } catch (err) {
      console.error('[useCustomFields] Failed to save values:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [entityId, sectionName, values]);

  // Update local value (without saving)
  const updateValue = useCallback((fieldId, value) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  return {
    fields,
    values,
    loading,
    error,
    saving,
    saveValue,
    saveAllValues,
    updateValue,
    sdk
  };
}

/**
 * Hook for section registration
 * Automatically registers sections on mount
 * 
 * @param {Array} sections - Sections to register
 * @returns {Object} Registration state
 * 
 * @example
 * const { registered, error } = useSectionRegistry([
 *   { id: 'profile', name: 'user_profile', label: 'User Profile' }
 * ]);
 */
export function useSectionRegistry(sections) {
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState(null);

  const sdk = getSDK();

  useEffect(() => {
    if (!sections || sections.length === 0) return;

    sdk.registerSections(sections)
      .then(() => setRegistered(true))
      .catch(err => {
        console.error('[useSectionRegistry] Failed to register sections:', err);
        setError(err.message);
      });
  }, [sections]);

  return { registered, error };
}

/**
 * Component to render custom fields dynamically
 * @param {Object} props
 * @param {string} props.sectionName - Section name
 * @param {string} props.entityId - Entity ID
 * @param {Function} props.onSave - Callback when saved
 * @param {Function} props.onChange - Callback when value changes
 * @param {Object} props.className - CSS classes
 * 
 * @example
 * <DynamicFieldsRenderer 
 *   sectionName="user_profile" 
 *   entityId="user-123"
 *   onSave={(values) => console.log('Saved:', values)}
 *   className="space-y-4"
 * />
 */
export function DynamicFieldsRenderer({ 
  sectionName, 
  entityId, 
  onSave, 
  onChange,
  className = '',
  showSaveButton = true
}) {
  const { fields, values, loading, error, saving, updateValue, saveAllValues } = useCustomFields(sectionName, entityId);

  const handleChange = (fieldId, value) => {
    updateValue(fieldId, value);
    onChange?.(fieldId, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveAllValues();
      onSave?.(values);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading fields...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading fields: {error}</div>;
  }

  if (fields.length === 0) {
    return <div className="text-gray-400">No custom fields configured for this section.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {fields.map(field => (
        <div key={field.id} className="mb-4">
          <label className="block font-medium mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {field.type === 'textarea' ? (
            <textarea
              name={field.name}
              value={values[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full border rounded px-3 py-2"
              rows={4}
            />
          ) : field.type === 'select' ? (
            <select
              name={field.name}
              value={values[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              required={field.required}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select...</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.type === 'checkbox' ? (
            <input
              type="checkbox"
              name={field.name}
              checked={values[field.id] || false}
              onChange={(e) => handleChange(field.id, e.target.checked)}
              className="w-4 h-4"
            />
          ) : (
            <input
              type={field.type}
              name={field.name}
              value={values[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full border rounded px-3 py-2"
            />
          )}
          
          {field.help_text && (
            <p className="text-sm text-gray-500 mt-1">{field.help_text}</p>
          )}
        </div>
      ))}
      
      {showSaveButton && (
        <button 
          type="submit" 
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      )}
    </form>
  );
}

/**
 * Component to render a link to admin panel
 */
export function AdminPanelLink({ className = '' }) {
  const sdk = getSDK();
  
  return (
    <a 
      href={sdk.getAdminUrl()} 
      target="_blank" 
      rel="noopener noreferrer"
      className={className}
    >
      ⚙️ Manage Custom Fields
    </a>
  );
}

export default {
  getSDK,
  useCustomFields,
  useSectionRegistry,
  DynamicFieldsRenderer,
  AdminPanelLink
};
