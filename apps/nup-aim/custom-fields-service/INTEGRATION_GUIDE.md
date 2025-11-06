# 🔌 Custom Fields Microservice - Integration Guide

## Quick Start (3 Steps)

### 1️⃣ Include the SDK

```html
<!-- Option A: Script tag (vanilla JS, any framework) -->
<script src="http://localhost:3002/custom-fields-sdk.js"></script>

<!-- Option B: ES Module import (React, Vue, etc) -->
<script type="module">
  import CustomFieldsSDK from 'http://localhost:3002/custom-fields-sdk.js';
</script>
```

### 2️⃣ Initialize & Register Sections

```javascript
// Initialize SDK
const customFields = new CustomFieldsSDK('http://localhost:3002');

// Register your app's sections (do this once on app startup)
await customFields.registerSections([
  {
    id: 'user-profile',
    name: 'user_profile',
    label: 'User Profile',
    description: 'User information fields'
  },
  {
    id: 'settings',
    name: 'settings',
    label: 'Settings',
    description: 'Application settings'
  }
]);
```

### 3️⃣ Fetch & Render Fields

```javascript
// Get custom fields for a section
const fields = await customFields.getFields('user_profile');

// Render fields dynamically
fields.forEach(field => {
  const input = document.createElement('input');
  input.type = field.type;
  input.name = field.name;
  input.placeholder = field.placeholder;
  input.required = field.required;
  // ... add to your form
});
```

---

## 🎯 Complete Integration Example

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>Custom Fields Demo</title>
</head>
<body>
  <div id="form-container"></div>

  <script src="http://localhost:3002/custom-fields-sdk.js"></script>
  <script>
    (async () => {
      const sdk = new CustomFieldsSDK('http://localhost:3002');
      
      // Register sections
      await sdk.registerSections([
        { id: 'contact', name: 'contact_info', label: 'Contact Info' }
      ]);

      // Fetch fields
      const fields = await sdk.getFields('contact_info');

      // Render form
      const form = document.createElement('form');
      fields.forEach(field => {
        const label = document.createElement('label');
        label.textContent = field.label;
        
        const input = document.createElement('input');
        input.type = field.type;
        input.name = field.name;
        input.required = field.required;
        
        form.appendChild(label);
        form.appendChild(input);
      });

      document.getElementById('form-container').appendChild(form);
    })();
  </script>
</body>
</html>
```

### React

```jsx
import { useEffect, useState } from 'react';

function DynamicForm({ sectionName, entityId }) {
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [sdk] = useState(() => new CustomFieldsSDK('http://localhost:3002'));

  useEffect(() => {
    // Load fields
    sdk.getFields(sectionName).then(setFields);
    
    // Load existing values
    sdk.getValues(entityId, sectionName).then(setValues);
  }, [sectionName, entityId]);

  const handleChange = (fieldId, value) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await sdk.saveValues(entityId, sectionName, values);
    alert('Saved!');
  };

  return (
    <form onSubmit={handleSubmit}>
      {fields.map(field => (
        <div key={field.id}>
          <label>{field.label}</label>
          <input
            type={field.type}
            value={values[field.id] || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
          />
        </div>
      ))}
      <button type="submit">Save</button>
    </form>
  );
}

export default DynamicForm;
```

### Vue.js

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div v-for="field in fields" :key="field.id">
      <label>{{ field.label }}</label>
      <input
        :type="field.type"
        v-model="values[field.id]"
        :required="field.required"
        :placeholder="field.placeholder"
      />
    </div>
    <button type="submit">Save</button>
  </form>
</template>

<script>
import CustomFieldsSDK from 'http://localhost:3002/custom-fields-sdk.js';

export default {
  props: ['sectionName', 'entityId'],
  data() {
    return {
      fields: [],
      values: {},
      sdk: new CustomFieldsSDK('http://localhost:3002')
    };
  },
  async mounted() {
    this.fields = await this.sdk.getFields(this.sectionName);
    this.values = await this.sdk.getValues(this.entityId, this.sectionName);
  },
  methods: {
    async handleSubmit() {
      await this.sdk.saveValues(this.entityId, this.sectionName, this.values);
      alert('Saved!');
    }
  }
};
</script>
```

---

## 📚 API Reference

### Section Registration

```javascript
// Register sections (call once on app init)
await sdk.registerSections([
  {
    id: 'unique-id',              // Unique identifier
    name: 'section_name',         // snake_case name
    label: 'Display Label',       // Human-readable
    description: 'Optional desc', // Optional
    component_name: 'MyComponent' // Optional
  }
]);

// Get all sections
const sections = await sdk.getSections();

// Get specific section
const section = await sdk.getSection('section_name');
```

### Field Management

```javascript
// Get fields for a section
const fields = await sdk.getFields('section_name');

// Create field (admin only)
await sdk.createField({
  name: 'email_address',
  label: 'Email Address',
  type: 'email',
  form_section: 'contact_info',
  required: true,
  placeholder: 'your@email.com'
});

// Update field (admin only)
await sdk.updateField('field-uuid', { label: 'New Label' });

// Delete field (admin only)
await sdk.deleteField('field-uuid');

// Reorder fields (admin only)
await sdk.reorderFields([
  { id: 'field-uuid-3' },
  { id: 'field-uuid-1' },
  { id: 'field-uuid-2' }
]);
```

### Value Management

```javascript
// Get values for an entity
const values = await sdk.getValues('entity-id', 'section_name');
// Returns: { 'field-uuid-1': 'value1', 'field-uuid-2': 'value2' }

// Save single value
await sdk.saveValue('entity-id', 'field-uuid', 'section_name', 'John Doe');

// Save multiple values at once
await sdk.saveValues('entity-id', 'section_name', {
  'field-uuid-1': 'John Doe',
  'field-uuid-2': 'john@example.com',
  'field-uuid-3': '2025-11-06'
});
```

### Admin Panel

```javascript
// Get admin panel URL
const adminUrl = sdk.getAdminUrl();
// Returns: 'http://localhost:3002/widgets/admin'

// Open admin panel in new tab
sdk.openAdminPanel();
```

---

## 🎨 Field Types Supported

- `text` - Single line text
- `textarea` - Multi-line text
- `number` - Numeric input
- `email` - Email validation
- `tel` - Phone number
- `url` - URL validation
- `date` - Date picker
- `datetime-local` - Date and time
- `checkbox` - Boolean checkbox
- `select` - Dropdown (configure options in field config)
- `radio` - Radio buttons (configure options)
- `file` - File upload

---

## 🚀 Deployment

### Development
```bash
cd custom-fields-service
npm install
npm start
```

### Production

1. **Environment Variables**
```bash
PORT=3002
ALLOWED_ORIGINS=https://yourapp.com,https://otherapp.com
NODE_ENV=production
```

2. **Deploy Options**
- Docker container
- Kubernetes pod
- Serverless (AWS Lambda, Google Cloud Functions)
- Traditional server (PM2, systemd)

3. **Update SDK URL**
```javascript
const sdk = new CustomFieldsSDK('https://custom-fields-api.yourcompany.com');
```

---

## 🔐 Security Considerations

1. **CORS**: Configure `ALLOWED_ORIGINS` environment variable
2. **Rate Limiting**: Built-in (100 requests per 15 minutes per IP)
3. **Authentication**: Add your own auth middleware if needed
4. **Validation**: All inputs are validated server-side

---

## 🌟 Benefits

✅ **Framework Agnostic** - Works with React, Vue, Angular, vanilla JS
✅ **Zero Dependencies** - No npm packages required in your app
✅ **Type Safe** - Full TypeScript support available
✅ **Lightweight** - < 5KB minified
✅ **Admin UI Included** - Manage fields via web interface
✅ **Self-Contained** - Microservice handles all logic

---

## 💡 Use Cases

- **Multi-tenant SaaS** - Let each customer customize their forms
- **CMS Systems** - Dynamic content models
- **Admin Panels** - Configurable user interfaces
- **Form Builders** - User-defined forms
- **Survey Tools** - Custom questionnaires
- **Data Collection** - Flexible field definitions

---

## 🆘 Troubleshooting

**SDK not loading?**
```javascript
// Check if service is running
const health = await sdk.healthCheck();
console.log(health); // Should return { status: 'healthy' }
```

**CORS errors?**
- Add your domain to `ALLOWED_ORIGINS` in microservice config

**Fields not appearing?**
- Ensure sections are registered first
- Check browser console for errors
- Verify section name matches exactly

---

## 📞 Support

- Admin Panel: http://localhost:3002/widgets/admin
- Demo Page: http://localhost:3002/widgets/demo
- Health Check: http://localhost:3002/health
- API Docs: http://localhost:3002/api/docs (if available)

---

**That's it! You're ready to add custom fields to any application in minutes! 🎉**
