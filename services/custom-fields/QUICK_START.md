# ⚡ Quick Start - Custom Fields Integration

Add dynamic, configurable fields to your app in **3 steps** (< 5 minutes).

---

## Step 1: Include SDK (1 line)

### Option A: HTML Script Tag
```html
<script src="http://localhost:3002/custom-fields-sdk.js"></script>
```

### Option B: ES Module
```javascript
import CustomFieldsSDK from 'http://localhost:3002/custom-fields-sdk.js';
```

---

## Step 2: Register Your Sections (Once on app startup)

```javascript
const sdk = new CustomFieldsSDK('http://localhost:3002');

// Register your app's form sections
await sdk.registerSections([
  {
    id: 'user-profile',
    name: 'user_profile', 
    label: 'User Profile',
    description: 'User information fields'
  },
  {
    id: 'settings',
    name: 'app_settings',
    label: 'Application Settings'
  }
]);
```

---

## Step 3: Fetch & Render Fields

```javascript
// Get custom fields for a section
const fields = await sdk.getFields('user_profile');

// Render dynamically
fields.forEach(field => {
  const input = document.createElement('input');
  input.type = field.type;
  input.name = field.name;
  input.placeholder = field.placeholder;
  input.required = field.required;
  document.getElementById('form').appendChild(input);
});
```

---

## Save Values

```javascript
// Save field values
await sdk.saveValues('entity-123', 'user_profile', {
  'field-uuid-1': 'John Doe',
  'field-uuid-2': 'john@example.com'
});
```

---

## React Integration

```jsx
import { useCustomFields, DynamicFieldsRenderer } from 'http://localhost:3002/react-integration.jsx';

function MyForm({ entityId }) {
  return (
    <DynamicFieldsRenderer 
      sectionName="user_profile"
      entityId={entityId}
      onSave={(values) => console.log('Saved!', values)}
    />
  );
}
```

---

## Manage Fields (Admin Panel)

Visit: **http://localhost:3002/widgets/admin**

- ✅ Add/edit/delete fields
- ✅ Drag & drop to reorder
- ✅ 10+ field types
- ✅ Real-time preview

---

## That's it!

- 🚀 **No npm packages** needed in your app
- 🔌 **Framework agnostic** - works with React, Vue, Angular, vanilla JS
- 🎨 **Admin UI included** - no code needed to manage fields
- 💾 **Auto-saved** - fields stored in SQLite
- 📖 **Full docs**: See `INTEGRATION_GUIDE.md`

---

**Need help?** Check http://localhost:3002/widgets/demo
