// Admin Panel JavaScript
const API_BASE = 'http://localhost:3002/api';

let currentSection = null;
let fields = [];
let draggedItem = null;
let fieldsModified = false;

// Notify parent window when fields are updated
function notifyFieldsUpdated() {
  fieldsModified = true;
  // Notify all windows (including opener) that fields were updated
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({ type: 'CUSTOM_FIELDS_UPDATED' }, '*');
  }
  // Also notify via BroadcastChannel for same-origin tabs
  try {
    const channel = new BroadcastChannel('custom-fields-updates');
    channel.postMessage({ type: 'CUSTOM_FIELDS_UPDATED' });
    channel.close();
  } catch (e) {
    // BroadcastChannel not supported, fallback already handled
  }
}

// Notify when window closes if fields were modified
window.addEventListener('beforeunload', () => {
  if (fieldsModified) {
    notifyFieldsUpdated();
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSections();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('addFieldBtn').addEventListener('click', () => openFieldModal());
  document.getElementById('cancelFieldBtn').addEventListener('click', closeFieldModal);
  document.getElementById('saveFieldBtn').addEventListener('click', saveField);
  document.getElementById('closeModalBtn').addEventListener('click', closeFieldModal);
  
  // Close modal on overlay click
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') {
      closeFieldModal();
    }
  });
  
  // Field type change - update preview
  document.getElementById('fieldType').addEventListener('change', updatePreview);
  document.getElementById('fieldLabel').addEventListener('input', updatePreview);
  document.getElementById('fieldPlaceholder').addEventListener('input', updatePreview);
  document.getElementById('fieldRequired').addEventListener('change', updatePreview);
}

async function loadSections() {
  try {
    const response = await fetch(`${API_BASE}/sections`);
    const data = await response.json();
    
    if (data.success) {
      renderSections(data.data);
      
      // Select first section by default
      if (data.data.length > 0) {
        selectSection(data.data[0]);
      }
    }
  } catch (error) {
    console.error('Error loading sections:', error);
    alert('Erro ao carregar seções. Verifique se o microserviço está rodando.');
  }
}

function renderSections(sections) {
  const container = document.getElementById('sectionsList');
  
  if (sections.length === 0) {
    container.innerHTML = '<p style="color: #a0aec0; padding: 20px; text-align: center;">Nenhuma seção registrada</p>';
    return;
  }
  
  container.innerHTML = sections.map(section => `
    <div class="section-item" data-section-id="${section.id}" onclick="selectSection(${JSON.stringify(section).replace(/"/g, '&quot;')})">
      <div class="section-info">
        <div class="section-name">
          <span class="section-icon">${getSectionIcon(section.name)}</span>
          ${section.label}
        </div>
      </div>
      <span class="fields-count">${section.fields_count} campo${section.fields_count !== 1 ? 's' : ''}</span>
    </div>
  `).join('');
}

function getSectionIcon(name) {
  const icons = {
    'basic_info': '📄',
    'scope': '🎯',
    'processes': '📊',
    'impacts': '⚠️',
    'risks': '🛡️',
    'mitigations': '✅',
    'conclusions': '📝'
  };
  return icons[name] || '📋';
}

function selectSection(section) {
  currentSection = section;
  
  // Update UI
  document.querySelectorAll('.section-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-section-id="${section.id}"]`)?.classList.add('active');
  
  // Update header
  document.getElementById('selectedSectionName').textContent = section.label;
  
  // Load fields
  loadFields(section.name);
}

async function loadFields(sectionName) {
  try {
    const response = await fetch(`${API_BASE}/custom-fields?section=${sectionName}`);
    const data = await response.json();
    
    if (data.success) {
      fields = data.data;
      renderFields(fields);
    }
  } catch (error) {
    console.error('Error loading fields:', error);
  }
}

function renderFields(fieldsList) {
  const container = document.getElementById('fieldsList');
  
  if (fieldsList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">Nenhum campo customizado nesta seção</div>
        <button class="btn btn-primary" onclick="openFieldModal()">
          <span>+</span> Adicionar Primeiro Campo
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = fieldsList.map((field, index) => `
    <div class="field-item" draggable="true" data-field-id="${field.id}" data-index="${index}">
      <div class="field-header">
        <div class="field-name">
          <span class="drag-handle">≡</span>
          ${field.label}
        </div>
        <div class="field-actions">
          <button class="btn btn-secondary btn-small" onclick="editField('${field.id}')">
            ✏️ Editar
          </button>
          <button class="btn btn-danger btn-small" onclick="deleteField('${field.id}', '${field.label}')">
            🗑️
          </button>
        </div>
      </div>
      <div class="field-details">
        <span class="field-badge badge-${field.type}">${getTypeLabel(field.type)}</span>
        ${field.required ? '<span class="field-badge badge-required">Obrigatório</span>' : ''}
        ${field.placeholder ? `<span style="font-style: italic;">Placeholder: "${field.placeholder}"</span>` : ''}
      </div>
    </div>
  `).join('');
  
  // Setup drag and drop
  setupDragAndDrop();
}

function setupDragAndDrop() {
  const items = document.querySelectorAll('.field-item');
  
  items.forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  });
}

function handleDragStart(e) {
  draggedItem = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  const afterElement = getDragAfterElement(e.clientY);
  const dragging = document.querySelector('.dragging');
  
  if (afterElement == null) {
    this.parentNode.appendChild(dragging);
  } else {
    this.parentNode.insertBefore(dragging, afterElement);
  }
}

function handleDrop(e) {
  e.stopPropagation();
  return false;
}

function handleDragEnd() {
  this.classList.remove('dragging');
  draggedItem = null;
  
  // Update order
  updateFieldsOrder();
}

function getDragAfterElement(y) {
  const draggableElements = [...document.querySelectorAll('.field-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function updateFieldsOrder() {
  const items = document.querySelectorAll('.field-item');
  const fieldIds = Array.from(items).map(item => ({ id: item.dataset.fieldId }));
  
  try {
    await fetch(`${API_BASE}/custom-fields/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fieldIds })
    });
    
    // Reload fields to get updated order
    loadFields(currentSection.name);
  } catch (error) {
    console.error('Error updating order:', error);
    alert('Erro ao reordenar campos');
  }
}

function getTypeLabel(type) {
  const labels = {
    'text': 'Texto',
    'textarea': 'Texto Longo',
    'number': 'Número',
    'date': 'Data',
    'select': 'Seleção',
    'checkbox': 'Checkbox',
    'radio': 'Radio',
    'email': 'E-mail',
    'url': 'URL',
    'file': 'Arquivo'
  };
  return labels[type] || type;
}

function openFieldModal(fieldId = null) {
  const modal = document.getElementById('modalOverlay');
  const title = document.getElementById('modalTitle');
  const form = document.getElementById('fieldForm');
  
  form.reset();
  
  if (fieldId) {
    // Edit mode
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      title.textContent = 'Editar Campo';
      document.getElementById('fieldId').value = field.id;
      document.getElementById('fieldName').value = field.name;
      document.getElementById('fieldLabel').value = field.label;
      document.getElementById('fieldType').value = field.type;
      document.getElementById('fieldRequired').checked = field.required;
      document.getElementById('fieldPlaceholder').value = field.placeholder || '';
      document.getElementById('fieldDefaultValue').value = field.default_value || '';
    }
  } else {
    // Create mode
    title.textContent = 'Adicionar Novo Campo';
    document.getElementById('fieldId').value = '';
  }
  
  modal.classList.remove('hidden');
  updatePreview();
}

function closeFieldModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

function updatePreview() {
  const type = document.getElementById('fieldType').value;
  const label = document.getElementById('fieldLabel').value || 'Nome do Campo';
  const placeholder = document.getElementById('fieldPlaceholder').value;
  const required = document.getElementById('fieldRequired').checked;
  
  const preview = document.getElementById('fieldPreview');
  
  let inputHtml = '';
  
  switch (type) {
    case 'text':
    case 'email':
    case 'url':
      inputHtml = `<input type="${type}" class="form-input" placeholder="${placeholder}" ${required ? 'required' : ''}>`;
      break;
    case 'textarea':
      inputHtml = `<textarea class="form-textarea" placeholder="${placeholder}" ${required ? 'required' : ''}></textarea>`;
      break;
    case 'number':
      inputHtml = `<input type="number" class="form-input" placeholder="${placeholder}" ${required ? 'required' : ''}>`;
      break;
    case 'date':
      inputHtml = `<input type="date" class="form-input" ${required ? 'required' : ''}>`;
      break;
    case 'select':
      inputHtml = `<select class="form-select" ${required ? 'required' : ''}>
        <option value="">Selecione...</option>
        <option value="opcao1">Opção 1</option>
        <option value="opcao2">Opção 2</option>
      </select>`;
      break;
    case 'checkbox':
      inputHtml = `<input type="checkbox" class="form-checkbox"> ${label}`;
      break;
  }
  
  preview.innerHTML = `
    <div class="form-group">
      <label class="form-label">
        ${label}
        ${required ? '<span style="color: #fc8181;">*</span>' : ''}
      </label>
      ${inputHtml}
    </div>
  `;
}

async function saveField() {
  const fieldId = document.getElementById('fieldId').value;
  const formData = {
    name: document.getElementById('fieldName').value,
    label: document.getElementById('fieldLabel').value,
    type: document.getElementById('fieldType').value,
    required: document.getElementById('fieldRequired').checked,
    placeholder: document.getElementById('fieldPlaceholder').value,
    default_value: document.getElementById('fieldDefaultValue').value,
    form_section: currentSection.name
  };
  
  // Validation
  if (!formData.name || !formData.label) {
    alert('Nome e Label são obrigatórios');
    return;
  }
  
  try {
    const url = fieldId 
      ? `${API_BASE}/custom-fields/${fieldId}`
      : `${API_BASE}/custom-fields`;
    
    const method = fieldId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      closeFieldModal();
      loadFields(currentSection.name);
      loadSections(); // Refresh field counts
      notifyFieldsUpdated(); // Notify parent window
    } else {
      alert('Erro: ' + (data.error || 'Erro ao salvar campo'));
    }
  } catch (error) {
    console.error('Error saving field:', error);
    alert('Erro ao salvar campo');
  }
}

async function editField(fieldId) {
  openFieldModal(fieldId);
}

async function deleteField(fieldId, label) {
  if (!confirm(`Tem certeza que deseja excluir o campo "${label}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/custom-fields/${fieldId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      loadFields(currentSection.name);
      loadSections(); // Refresh field counts
      notifyFieldsUpdated(); // Notify parent window
    } else {
      alert('Erro ao excluir campo');
    }
  } catch (error) {
    console.error('Error deleting field:', error);
    alert('Erro ao excluir campo');
  }
}
