# Custom Fields - Guia Completo de Personalização

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Uso Básico](#uso-básico)
4. [CSS Variables (Nível 1)](#css-variables-nível-1)
5. [ThemeProvider (Nível 2)](#themeprovider-nível-2)
6. [Props Override (Nível 3)](#props-override-nível-3)
7. [Render Props (Nível 4)](#render-props-nível-4)
8. [Exemplos Práticos](#exemplos-práticos)
9. [Migração](#migração)

---

## Visão Geral

O sistema de campos personalizados foi projetado com **4 níveis de customização**, do mais simples ao mais flexível:

| Nível | Método | Quando Usar | Flexibilidade |
|-------|--------|-------------|---------------|
| **1** | CSS Variables | Tema global ou por página | ⭐⭐⭐⭐ |
| **2** | ThemeProvider | Tema por seção/componente | ⭐⭐⭐⭐⭐ |
| **3** | Props Override | Ajustes pontuais | ⭐⭐⭐ |
| **4** | Render Props | Controle total de renderização | ⭐⭐⭐⭐⭐ |

---

## Arquitetura

```
┌──────────────────────────────────────┐
│  CSS Variables (Tema Base)           │
│  --custom-field-border-color, etc    │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│  ThemeProvider (Opcional)            │
│  Sobrescreve CSS vars por contexto   │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│  CustomFieldsSection                 │
│  Renderização padrão com CSS classes │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│  Props Override (Escape Hatch)       │
│  className, inputClassName, etc      │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│  Render Props (Máxima Flexibilidade) │
│  Controle total da renderização      │
└──────────────────────────────────────┘
```

---

## Uso Básico

**Sem configuração, funciona automaticamente!**

```tsx
import { CustomFieldsSection } from '@/components/CustomFieldsSection';

function MyForm() {
  return (
    <CustomFieldsSection 
      sectionName="basic_info"
      analysisId={currentId}
    />
  );
}
```

✅ Usa CSS variables com valores padrão  
✅ Combina automaticamente com a maioria dos designs  
✅ Zero configuração necessária

---

## CSS Variables (Nível 1)

### Personalização Global

Defina CSS variables no seu `index.css` ou em qualquer stylesheet:

```css
/* src/index.css */
:root {
  /* Cores */
  --custom-field-border-color: #e5e7eb; /* Sua cor de borda */
  --custom-field-border-focus: #3b82f6; /* Cor ao focar */
  --custom-field-bg: #ffffff; /* Fundo dos inputs */
  --custom-field-text-color: #1f2937; /* Cor do texto */
  --custom-field-label-color: #374151; /* Cor dos labels */
  
  /* Espaçamento */
  --custom-field-padding-x: 0.75rem;
  --custom-field-padding-y: 0.5rem;
  --custom-field-gap: 0.5rem;
  
  /* Tipografia */
  --custom-field-font-size: 0.875rem;
  --custom-field-label-font-weight: 500;
  
  /* Bordas */
  --custom-field-border-radius: 0.5rem;
  
  /* Efeitos */
  --custom-field-transition: all 0.15s ease-in-out;
}

/* Tema Escuro (Opcional) */
.dark {
  --custom-field-border-color: #4b5563;
  --custom-field-bg: #1f2937;
  --custom-field-text-color: #f9fafb;
  --custom-field-label-color: #d1d5db;
}
```

### Personalização por Página

```css
/* Apenas na página de impactos */
.impacts-page {
  --custom-field-border-color: #3b82f6; /* Azul */
  --custom-field-border-focus: #2563eb; /* Azul escuro */
}

/* Apenas na página de riscos */
.risks-page {
  --custom-field-border-color: #ef4444; /* Vermelho */
  --custom-field-border-focus: #dc2626; /* Vermelho escuro */
}
```

```tsx
<div className="impacts-page">
  <CustomFieldsSection sectionName="impacts" />
</div>
```

---

## ThemeProvider (Nível 2)

### Uso Básico do ThemeProvider

```tsx
import { CustomFieldsThemeProvider } from '@/contexts/CustomFieldsThemeContext';
import { CustomFieldsSection } from '@/components/CustomFieldsSection';

function ImpactsForm() {
  const impactsTheme = {
    borderColor: '#3b82f6',
    borderFocus: '#2563eb',
    backgroundColor: '#eff6ff',
    labelColor: '#1e40af'
  };
  
  return (
    <CustomFieldsThemeProvider theme={impactsTheme}>
      <CustomFieldsSection sectionName="impacts" />
    </CustomFieldsThemeProvider>
  );
}
```

### Tema Dinâmico com Hook

```tsx
import { useCustomFieldsTheme } from '@/contexts/CustomFieldsThemeContext';

function DynamicThemedSection() {
  const { theme, setTheme } = useCustomFieldsTheme();
  
  const changeToBlueTheme = () => {
    setTheme({
      borderColor: '#3b82f6',
      backgroundColor: '#eff6ff'
    });
  };
  
  return (
    <>
      <button onClick={changeToBlueTheme}>Tema Azul</button>
      <CustomFieldsSection sectionName="basic_info" />
    </>
  );
}
```

### Detecção Automática de Estilos

```tsx
import { useDetectedTheme } from '@/contexts/CustomFieldsThemeContext';

function AutoStyledSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const detectedTheme = useDetectedTheme(inputRef);
  
  return (
    <>
      {/* Campo de referência (da sua aplicação) */}
      <input ref={inputRef} className="..." />
      
      {/* Campos personalizados herdam o estilo */}
      <CustomFieldsThemeProvider theme={detectedTheme}>
        <CustomFieldsSection sectionName="basic_info" />
      </CustomFieldsThemeProvider>
    </>
  );
}
```

---

## Props Override (Nível 3)

### Classes CSS Personalizadas

```tsx
<CustomFieldsSection 
  sectionName="basic_info"
  
  // Container principal
  className="my-custom-container space-y-6"
  
  // Cada campo
  fieldWrapperClassName="bg-gray-50 p-4 rounded"
  
  // Labels
  labelClassName="text-lg font-bold text-blue-700"
  
  // Inputs
  inputClassName="border-2 border-blue-500 rounded-xl"
  
  // Textareas
  textareaClassName="border-2 border-blue-500 rounded-xl min-h-32"
  
  // Selects
  selectClassName="border-2 border-blue-500 rounded-xl"
  
  // Checkboxes
  checkboxClassName="w-6 h-6"
  
  // Texto de ajuda
  helpTextClassName="text-blue-600 italic"
/>
```

### Modo Tailwind Only

Se você preferir usar apenas Tailwind (sem CSS variables):

```tsx
<CustomFieldsSection 
  sectionName="basic_info"
  useTailwindOnly={true}
  inputClassName="px-4 py-3 border-2 border-purple-500 rounded-lg"
  labelClassName="text-purple-700 font-semibold"
/>
```

---

## Render Props (Nível 4)

### Controle Total da Renderização

**💡 Comportamento de Fallback:**
- Se `renderField` retorna um elemento React, ele é usado
- Se `renderField` retorna `null` ou `undefined`, **usa a renderização padrão** automaticamente
- Isso permite customizar apenas campos específicos!

```tsx
<CustomFieldsSection 
  sectionName="basic_info"
  renderField={(field, value, onChange) => {
    // Customizar apenas campos específicos
    if (field.name === 'email') {
      return (
        <div className="relative">
          <input
            type="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-10 my-custom-input-class"
          />
          <MailIcon className="absolute left-2 top-2" />
        </div>
      );
    }
    
    if (field.type === 'select') {
      return (
        <MyCustomSelect
          options={field.options}
          value={value}
          onChange={onChange}
        />
      );
    }
    
    // Retornar null = usa renderização padrão para outros campos
    return null;
  }}
/>
```

### Exemplo: Contadores de Caracteres

```tsx
<CustomFieldsSection 
  sectionName="basic_info"
  renderField={(field, value, onChange) => {
    // Apenas text e textarea ganham contador
    if (field.type === 'text' || field.type === 'textarea') {
      const maxLength = field.max_length || 100;
      
      return (
        <div className="relative">
          {field.type === 'textarea' ? (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="custom-field-input pr-16"
              maxLength={maxLength}
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="custom-field-input pr-16"
              maxLength={maxLength}
            />
          )}
          <span className="absolute right-2 top-2 text-xs text-gray-400">
            {value?.length || 0}/{maxLength}
          </span>
        </div>
      );
    }
    
    // Outros campos usam renderização padrão
    return null;
  }}
/>
```

### Usando Biblioteca de Componentes Externa

```tsx
import { TextField, Select, Checkbox } from '@mui/material';

<CustomFieldsSection 
  sectionName="basic_info"
  renderField={(field, value, onChange) => {
    switch (field.type) {
      case 'text':
        return (
          <TextField
            label={field.label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            fullWidth
          />
        );
        
      case 'select':
        return (
          <Select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            fullWidth
          >
            {field.options.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        );
        
      case 'checkbox':
        return (
          <Checkbox
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
          />
        );
        
      default:
        return <TextField value={value} onChange={(e) => onChange(e.target.value)} />;
    }
  }}
/>
```

---

## Exemplos Práticos

### Exemplo 1: Aplicação com Múltiplas Páginas

```tsx
// App.tsx
import { CustomFieldsThemeProvider } from '@/contexts/CustomFieldsThemeContext';

function App() {
  const globalTheme = {
    borderColor: '#d1d5db',
    borderRadius: '0.5rem',
    fontSize: '0.875rem'
  };
  
  return (
    <CustomFieldsThemeProvider theme={globalTheme}>
      <Router>
        <Routes>
          <Route path="/basic" element={<BasicInfoPage />} />
          <Route path="/impacts" element={<ImpactsPage />} />
          <Route path="/risks" element={<RisksPage />} />
        </Routes>
      </Router>
    </CustomFieldsThemeProvider>
  );
}

// ImpactsPage.tsx - Tema azul para impactos
function ImpactsPage() {
  const impactsTheme = {
    borderColor: '#3b82f6',
    labelColor: '#1e40af'
  };
  
  return (
    <CustomFieldsThemeProvider theme={impactsTheme}>
      <h1>Análise de Impactos</h1>
      <CustomFieldsSection sectionName="impacts" />
    </CustomFieldsThemeProvider>
  );
}

// RisksPage.tsx - Tema vermelho para riscos
function RisksPage() {
  const risksTheme = {
    borderColor: '#ef4444',
    labelColor: '#991b1b'
  };
  
  return (
    <CustomFieldsThemeProvider theme={risksTheme}>
      <h1>Matriz de Riscos</h1>
      <CustomFieldsSection sectionName="risks" />
    </CustomFieldsThemeProvider>
  );
}
```

### Exemplo 2: Tema Claro/Escuro

```tsx
function ThemedApp() {
  const [darkMode, setDarkMode] = useState(false);
  
  const theme = darkMode ? {
    borderColor: '#4b5563',
    backgroundColor: '#1f2937',
    textColor: '#f9fafb',
    labelColor: '#d1d5db'
  } : {
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    labelColor: '#374151'
  };
  
  return (
    <CustomFieldsThemeProvider theme={theme}>
      <button onClick={() => setDarkMode(!darkMode)}>
        Toggle {darkMode ? 'Light' : 'Dark'} Mode
      </button>
      <CustomFieldsSection sectionName="basic_info" />
    </CustomFieldsThemeProvider>
  );
}
```

### Exemplo 3: Combinando Múltiplas Estratégias

```tsx
function HybridExample() {
  // 1. Tema base via ThemeProvider
  const baseTheme = {
    borderRadius: '0.5rem',
    fontSize: '0.875rem'
  };
  
  return (
    <CustomFieldsThemeProvider theme={baseTheme}>
      <CustomFieldsSection 
        sectionName="basic_info"
        
        // 2. Override específico via props
        inputClassName="border-blue-500 hover:border-blue-700"
        
        // 3. Render customizado para campos específicos
        renderField={(field, value, onChange) => {
          if (field.name === 'special_field') {
            return <MySpecialComponent value={value} onChange={onChange} />;
          }
          // Usa renderização padrão para outros campos
          return null;
        }}
      />
    </CustomFieldsThemeProvider>
  );
}
```

---

## Migração

### De Código Estático para Arquitetura Híbrida

**Antes:**
```tsx
<CustomFieldsSection sectionName="basic_info" />
// Tinha estilos hardcoded (border-gray-300, etc)
```

**Depois (Sem mudanças necessárias!):**
```tsx
<CustomFieldsSection sectionName="basic_info" />
// Agora usa CSS variables automaticamente
// Mantém compatibilidade total com código existente
```

### Adicionando Customização Gradual

**Passo 1 - Comece com CSS variables:**
```css
:root {
  --custom-field-border-color: #your-color;
}
```

**Passo 2 - Se precisar de temas por seção:**
```tsx
<CustomFieldsThemeProvider theme={{ borderColor: '#...' }}>
  <CustomFieldsSection ... />
</CustomFieldsThemeProvider>
```

**Passo 3 - Para ajustes pontuais:**
```tsx
<CustomFieldsSection 
  inputClassName="my-override"
/>
```

**Passo 4 - Controle total quando necessário:**
```tsx
<CustomFieldsSection 
  renderField={(field, value, onChange) => { ... }}
/>
```

---

## Referência Completa de CSS Variables

```css
/* Cores */
--custom-field-border-color
--custom-field-border-focus
--custom-field-border-error
--custom-field-bg
--custom-field-bg-disabled
--custom-field-bg-hover
--custom-field-text-color
--custom-field-text-placeholder
--custom-field-label-color
--custom-field-help-text-color
--custom-field-error-text

/* Espaçamento */
--custom-field-padding-x
--custom-field-padding-y
--custom-field-gap
--custom-field-section-gap

/* Tipografia */
--custom-field-font-size
--custom-field-label-font-size
--custom-field-label-font-weight
--custom-field-help-font-size

/* Bordas e Cantos */
--custom-field-border-width
--custom-field-border-radius

/* Efeitos */
--custom-field-focus-ring-width
--custom-field-focus-ring-color
--custom-field-transition

/* Estados */
--custom-field-disabled-opacity
```

---

## 🎯 Resumo

| Objetivo | Solução | Exemplo |
|----------|---------|---------|
| **Tema global simples** | CSS Variables em `:root` | `:root { --custom-field-border-color: #...}` |
| **Tema por página** | CSS Variables em classe | `.page { --custom-field-...}` |
| **Tema por seção** | ThemeProvider | `<ThemeProvider theme={{...}}>` |
| **Ajuste pontual** | Props | `inputClassName="..."` |
| **Controle total** | Render Props | `renderField={(field) => ...}` |
| **Herdar estilos** | useDetectedTheme | `const theme = useDetectedTheme(ref)` |

---

**✅ Compatibilidade:** Funciona com Tailwind CSS, Vanilla CSS, Material-UI, Ant Design, etc.  
**✅ Performance:** CSS nativo, zero overhead de JavaScript para estilos  
**✅ Framework-agnostic:** Hook headless pode ser usado em qualquer framework  
**✅ Zero Breaking Changes:** Código existente continua funcionando sem modificações
