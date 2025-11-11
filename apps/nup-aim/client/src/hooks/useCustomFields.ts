import { useState, useEffect, useCallback, useRef } from 'react';

// Use proxy endpoint instead of direct connection to microservice
const CUSTOM_FIELDS_API = '/api/custom-fields-proxy';

interface CustomField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  default_value?: string;
  help_text?: string;
  options?: Array<{ value: string; label: string }>;
  form_section: string;
  order_index: number;
}

interface CustomFieldsSDK {
  registerSections: (sections: Array<{
    id: string;
    name: string;
    label: string;
    description?: string;
    component_name?: string;
  }>) => Promise<any>;
  getFields: (sectionName: string) => Promise<CustomField[]>;
  getValues: (entityId: string, sectionName?: string) => Promise<Record<string, any>>;
  saveValues: (entityId: string, sectionName: string, values: Record<string, any>) => Promise<any>;
}

class CustomFieldsClient implements CustomFieldsSDK {
  private baseUrl: string;
  private apiUrl: string;

  constructor(baseUrl: string = CUSTOM_FIELDS_API) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    // API path is already in the proxy URL
    this.apiUrl = this.baseUrl;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.apiUrl}${endpoint}`;
    const config: RequestInit = {
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
      console.error(`[CustomFields] Error on ${endpoint}:`, error);
      throw error;
    }
  }

  async registerSections(sections: Array<{
    id: string;
    name: string;
    label: string;
    description?: string;
    component_name?: string;
  }>) {
    return this.request('/sections/register', {
      method: 'POST',
      body: JSON.stringify({ sections })
    });
  }

  async getFields(sectionName: string): Promise<CustomField[]> {
    const response = await this.request(`/custom-fields?section=${sectionName}`);
    return response.data || [];
  }

  async getValues(entityId: string, sectionName?: string): Promise<Record<string, any>> {
    const response = await this.request(`/forms/analysis/${entityId}/values`);
    const data = response.data || {};
    
    const flatValues: Record<string, any> = {};
    if (sectionName) {
      const sectionData = data[sectionName] || [];
      sectionData.forEach((item: any) => {
        flatValues[item.field_id] = item.value;
      });
    } else {
      Object.values(data).forEach((sectionArray: any) => {
        sectionArray.forEach((item: any) => {
          flatValues[item.field_id] = item.value;
        });
      });
    }
    return flatValues;
  }

  async saveValues(entityId: string, _sectionName: string, values: Record<string, any>) {
    const valuesArray = Object.entries(values).map(([fieldId, value]) => ({
      field_id: fieldId,
      analysis_id: entityId,
      value: String(value)
    }));
    
    return this.request('/forms/values', {
      method: 'POST',
      body: JSON.stringify({ values: valuesArray })
    });
  }

  getAdminUrl(): string {
    // Use the widgets proxy endpoint
    return '/custom-fields-admin/admin';
  }
}

// Singleton instance
let sdkInstance: CustomFieldsClient | null = null;

export function getCustomFieldsSDK(): CustomFieldsClient {
  if (!sdkInstance) {
    sdkInstance = new CustomFieldsClient();
  }
  return sdkInstance;
}

export function useCustomFields(sectionName: string, analysisId?: string) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sdk = getCustomFieldsSDK();
  
  // Track current request to prevent race conditions
  const currentRequestRef = useRef<{analysisId?: string; sectionName: string} | null>(null);

  // Load fields
  useEffect(() => {
    if (!sectionName) return;

    const loadFields = () => {
      setLoading(true);
      setError(null);

      sdk.getFields(sectionName)
        .then(setFields)
        .catch(err => {
          console.error('[useCustomFields] Failed to load fields:', err);
          setError(err.message);
        })
        .finally(() => setLoading(false));
    };

    // Initial load
    loadFields();

    // Listen for field updates from admin panel (auto-refresh when admin panel closes)
    const handleFieldsUpdate = (event: MessageEvent | { data: any }) => {
      if (event.data?.type === 'CUSTOM_FIELDS_UPDATED') {
        console.log('[useCustomFields] Fields updated, reloading...');
        loadFields();
      }
    };

    // Listen via window.postMessage (for window.open)
    window.addEventListener('message', handleFieldsUpdate);

    // Listen via BroadcastChannel (for same-origin tabs)
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('custom-fields-updates');
      channel.addEventListener('message', handleFieldsUpdate);
    } catch (e) {
      // BroadcastChannel not supported, fallback to postMessage only
    }

    return () => {
      window.removeEventListener('message', handleFieldsUpdate);
      if (channel) {
        channel.close();
      }
    };
  }, [sectionName]);

  // Load values if analysisId provided - CLEAR values when analysisId changes
  useEffect(() => {
    if (!sectionName || !analysisId) {
      setValues({});
      currentRequestRef.current = null;
      return;
    }

    // Clear values immediately when analysisId changes to prevent stale data
    setValues({});
    
    // Track this request
    const requestId = { analysisId, sectionName };
    currentRequestRef.current = requestId;

    sdk.getValues(analysisId, sectionName)
      .then(loadedValues => {
        // Only update if this is still the current request
        if (currentRequestRef.current === requestId) {
          setValues(loadedValues);
        }
      })
      .catch(err => {
        console.error('[useCustomFields] Failed to load values:', err);
        // Only clear if this is still the current request
        if (currentRequestRef.current === requestId) {
          setValues({});
        }
      });
  }, [sectionName, analysisId]);

  const updateValue = useCallback((fieldId: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  const saveAllValues = useCallback(async (valuesToSave = values) => {
    if (!analysisId) {
      console.warn('[useCustomFields] Cannot save values without analysisId');
      return false;
    }

    setSaving(true);
    try {
      await sdk.saveValues(analysisId, sectionName, valuesToSave);
      setValues(valuesToSave);
      return true;
    } catch (err) {
      console.error('[useCustomFields] Failed to save values:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [analysisId, sectionName, values]);

  return {
    fields,
    values,
    loading,
    error,
    saving,
    updateValue,
    saveAllValues,
    sdk
  };
}

export async function registerNuPAIMSections() {
  const sdk = getCustomFieldsSDK();
  
  const sections = [
    {
      id: 'basic-info',
      name: 'basic_info',
      label: 'Informações Básicas',
      description: 'Campos personalizados para informações básicas da análise',
      component_name: 'BasicInfoForm'
    },
    {
      id: 'scope',
      name: 'scope',
      label: 'Escopo',
      description: 'Campos personalizados para escopo da análise',
      component_name: 'ScopeForm'
    },
    {
      id: 'impacts',
      name: 'impacts',
      label: 'Análise de Impactos',
      description: 'Campos personalizados para análise de impactos',
      component_name: 'ImpactsForm'
    },
    {
      id: 'risks',
      name: 'risks',
      label: 'Matriz de Riscos',
      description: 'Campos personalizados para matriz de riscos',
      component_name: 'RisksForm'
    },
    {
      id: 'mitigations',
      name: 'mitigations',
      label: 'Plano de Mitigação',
      description: 'Campos personalizados para plano de mitigação',
      component_name: 'MitigationsForm'
    },
    {
      id: 'conclusions',
      name: 'conclusions',
      label: 'Conclusões e Recomendações',
      description: 'Campos personalizados para conclusões',
      component_name: 'ConclusionsForm'
    }
  ];

  try {
    await sdk.registerSections(sections);
    console.log('[CustomFields] Seções registradas com sucesso');
  } catch (error) {
    console.error('[CustomFields] Erro ao registrar seções:', error);
  }
}
