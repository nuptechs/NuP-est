/**
 * Example: How apps should register their sections
 * Each app should call this on startup or when first connecting to the service
 */

const CUSTOM_FIELDS_SERVICE_URL = process.env.CUSTOM_FIELDS_SERVICE_URL || 'http://localhost:3002';

async function registerAppSections(appSections) {
  try {
    const response = await fetch(`${CUSTOM_FIELDS_SERVICE_URL}/api/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: appSections })
    });

    if (!response.ok) {
      throw new Error(`Failed to register sections: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Sections registered successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Error registering sections:', error);
    throw error;
  }
}

// Example for NuP-AIM
const nupAimSections = [
  {
    id: 'basic-info',
    name: 'basic_info',
    label: 'Informações Básicas',
    description: 'Campos personalizados para a seção de informações básicas',
    component_name: 'BasicInfoForm'
  },
  {
    id: 'scope',
    name: 'scope',
    label: 'Escopo',
    description: 'Campos personalizados para a seção de escopo',
    component_name: 'ScopeForm'
  },
  {
    id: 'impacts',
    name: 'impacts',
    label: 'Análise de Impactos',
    description: 'Campos personalizados para a seção de impactos',
    component_name: 'ImpactsForm'
  },
  {
    id: 'risks',
    name: 'risks',
    label: 'Matriz de Riscos',
    description: 'Campos personalizados para a seção de riscos',
    component_name: 'RisksForm'
  },
  {
    id: 'mitigations',
    name: 'mitigations',
    label: 'Plano de Mitigação',
    description: 'Campos personalizados para a seção de mitigações',
    component_name: 'MitigationsForm'
  },
  {
    id: 'conclusions',
    name: 'conclusions',
    label: 'Conclusões e Recomendações',
    description: 'Campos personalizados para a seção de conclusões',
    component_name: 'ConclusionsForm'
  }
];

// Example for NuP-Study
const nupStudySections = [
  {
    id: 'flashcard-metadata',
    name: 'flashcard_metadata',
    label: 'Flashcard Metadata',
    description: 'Campos customizáveis para flashcards',
    component_name: 'FlashcardMetadataForm'
  },
  {
    id: 'student-profile',
    name: 'student_profile',
    label: 'Student Profile',
    description: 'Campos de perfil de estudante',
    component_name: 'StudentProfileForm'
  }
];

// Usage in your app's server.js or bootstrap file:
// await registerAppSections(nupAimSections);
// await registerAppSections(nupStudySections);

export { registerAppSections, nupAimSections, nupStudySections };
