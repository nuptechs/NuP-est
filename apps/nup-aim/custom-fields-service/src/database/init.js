import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_DIR = join(__dirname, '../../data');
const DB_PATH = join(DB_DIR, 'custom-fields.db');

let db = null;

export const initDatabase = async () => {
  try {
    // Ensure data directory exists
    if (!existsSync(DB_DIR)) {
      mkdirSync(DB_DIR, { recursive: true });
    }

    // Initialize database
    db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create tables
    await createTables();
    
    logger.info('✅ Database initialized successfully');
    return db;
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  }
};

const createTables = async () => {
  const tables = [
    // Custom field definitions
    `CREATE TABLE IF NOT EXISTS custom_fields (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('text', 'textarea', 'number', 'date', 'select', 'checkbox', 'radio', 'file', 'email', 'url')),
      required BOOLEAN DEFAULT FALSE,
      placeholder TEXT,
      default_value TEXT,
      validation_rules TEXT, -- JSON string with validation rules
      options TEXT, -- JSON string for select/radio options
      form_section TEXT NOT NULL, -- Which section of the form this belongs to
      order_index INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Form sections configuration
    `CREATE TABLE IF NOT EXISTS form_sections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      component_name TEXT NOT NULL, -- React component name
      is_active BOOLEAN DEFAULT TRUE,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Custom field values for specific analysis instances
    `CREATE TABLE IF NOT EXISTS custom_field_values (
      id TEXT PRIMARY KEY,
      field_id TEXT NOT NULL,
      analysis_id TEXT NOT NULL, -- Reference to analysis in main system
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (field_id) REFERENCES custom_fields (id) ON DELETE CASCADE
    )`,

    // Field validation rules
    `CREATE TABLE IF NOT EXISTS field_validations (
      id TEXT PRIMARY KEY,
      field_id TEXT NOT NULL,
      validation_type TEXT NOT NULL CHECK (validation_type IN ('min_length', 'max_length', 'pattern', 'min_value', 'max_value', 'required_if')),
      validation_value TEXT NOT NULL,
      error_message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (field_id) REFERENCES custom_fields (id) ON DELETE CASCADE
    )`
  ];

  tables.forEach(sql => {
    db.exec(sql);
  });

  // Insert default form sections
  await insertDefaultFormSections();
};

const insertDefaultFormSections = async () => {
  const defaultSections = [
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

  const insertSection = db.prepare(`
    INSERT OR IGNORE INTO form_sections (id, name, label, description, component_name, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  defaultSections.forEach((section, index) => {
    insertSection.run(
      section.id,
      section.name,
      section.label,
      section.description,
      section.component_name,
      index
    );
  });
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

export const closeDatabase = () => {
  if (db) {
    db.close();
    db = null;
  }
};