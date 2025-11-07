import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDatabase } from '../database/init.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Validation schemas
const customFieldSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  label: Joi.string().required().min(1).max(200),
  type: Joi.string().valid('text', 'textarea', 'number', 'date', 'select', 'checkbox', 'radio', 'file', 'email', 'url').required(),
  required: Joi.boolean().default(false),
  placeholder: Joi.string().allow('').max(200),
  default_value: Joi.string().allow('').max(500),
  validation_rules: Joi.string().allow(''),
  options: Joi.string().allow(''), // JSON string for select/radio options
  form_section: Joi.string().required(),
  order_index: Joi.number().integer().min(0).default(0)
});

const updateFieldSchema = customFieldSchema.fork(['name', 'label', 'type', 'form_section'], (schema) => schema.optional());

// GET /api/custom-fields - List all custom fields
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { section, active_only = 'true' } = req.query;
    
    let query = `
      SELECT cf.*, fs.label as section_label, fs.component_name
      FROM custom_fields cf
      LEFT JOIN form_sections fs ON cf.form_section = fs.name
    `;
    
    const conditions = [];
    const params = [];
    
    if (section) {
      conditions.push('cf.form_section = ?');
      params.push(section);
    }
    
    if (active_only === 'true') {
      conditions.push('cf.is_active = 1');
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY cf.form_section, cf.order_index, cf.created_at';
    
    const stmt = db.prepare(query);
    const fields = stmt.all(...params);
    
    // Parse JSON fields
    const processedFields = fields.map(field => ({
      ...field,
      required: Boolean(field.required),
      is_active: Boolean(field.is_active),
      validation_rules: field.validation_rules ? JSON.parse(field.validation_rules) : null,
      options: field.options ? JSON.parse(field.options) : null
    }));
    
    res.json({
      success: true,
      data: processedFields,
      total: processedFields.length
    });
  } catch (error) {
    logger.error('Error fetching custom fields:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch custom fields'
    });
  }
});

// GET /api/custom-fields/:id - Get specific custom field
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    
    const stmt = db.prepare(`
      SELECT cf.*, fs.label as section_label, fs.component_name
      FROM custom_fields cf
      LEFT JOIN form_sections fs ON cf.form_section = fs.name
      WHERE cf.id = ?
    `);
    
    const field = stmt.get(id);
    
    if (!field) {
      return res.status(404).json({
        success: false,
        error: 'Custom field not found'
      });
    }
    
    // Parse JSON fields
    const processedField = {
      ...field,
      required: Boolean(field.required),
      is_active: Boolean(field.is_active),
      validation_rules: field.validation_rules ? JSON.parse(field.validation_rules) : null,
      options: field.options ? JSON.parse(field.options) : null
    };
    
    res.json({
      success: true,
      data: processedField
    });
  } catch (error) {
    logger.error('Error fetching custom field:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch custom field'
    });
  }
});

// POST /api/custom-fields - Create new custom field
router.post('/', async (req, res) => {
  try {
    const { error, value } = customFieldSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }
    
    const db = getDatabase();
    const id = uuidv4();
    
    // Validate form section exists
    const sectionCheck = db.prepare('SELECT id FROM form_sections WHERE name = ?');
    const sectionExists = sectionCheck.get(value.form_section);
    
    if (!sectionExists) {
      return res.status(400).json({
        success: false,
        error: 'Invalid form section'
      });
    }
    
    // Check for duplicate field name in the same section
    const duplicateCheck = db.prepare('SELECT id FROM custom_fields WHERE name = ? AND form_section = ?');
    const duplicate = duplicateCheck.get(value.name, value.form_section);
    
    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: 'Field name already exists in this section'
      });
    }
    
    const stmt = db.prepare(`
      INSERT INTO custom_fields (
        id, name, label, type, required, placeholder, default_value,
        validation_rules, options, form_section, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      value.name,
      value.label,
      value.type,
      value.required ? 1 : 0,
      value.placeholder || null,
      value.default_value || null,
      value.validation_rules || null,
      value.options || null,
      value.form_section,
      value.order_index
    );
    
    logger.info(`Custom field created: ${value.name} in ${value.form_section}`);
    
    res.status(201).json({
      success: true,
      data: { id, ...value },
      message: 'Custom field created successfully'
    });
  } catch (error) {
    logger.error('Error creating custom field:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create custom field'
    });
  }
});

// PUT /api/custom-fields/:id - Update custom field
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateFieldSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }
    
    const db = getDatabase();
    
    // Check if field exists
    const existsCheck = db.prepare('SELECT id FROM custom_fields WHERE id = ?');
    const exists = existsCheck.get(id);
    
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Custom field not found'
      });
    }
    
    // Build update query dynamically
    const updateFields = [];
    const params = [];
    
    Object.entries(value).forEach(([key, val]) => {
      if (val !== undefined) {
        if (key === 'required') {
          updateFields.push(`${key} = ?`);
          params.push(val ? 1 : 0);
        } else {
          updateFields.push(`${key} = ?`);
          params.push(val);
        }
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    const stmt = db.prepare(`
      UPDATE custom_fields 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...params);
    
    logger.info(`Custom field updated: ${id}`);
    
    res.json({
      success: true,
      message: 'Custom field updated successfully'
    });
  } catch (error) {
    logger.error('Error updating custom field:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update custom field'
    });
  }
});

// DELETE /api/custom-fields/:id - Delete custom field
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    // Check if field exists
    const existsCheck = db.prepare('SELECT id FROM custom_fields WHERE id = ?');
    const exists = existsCheck.get(id);
    
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Custom field not found'
      });
    }
    
    // Soft delete by setting is_active to false
    const stmt = db.prepare('UPDATE custom_fields SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(id);
    
    logger.info(`Custom field deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'Custom field deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting custom field:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete custom field'
    });
  }
});

// POST /api/custom-fields/:id/reorder - Reorder custom fields
router.post('/reorder', async (req, res) => {
  try {
    const { fields } = req.body;
    
    if (!Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        error: 'Fields must be an array'
      });
    }
    
    const db = getDatabase();
    const stmt = db.prepare('UPDATE custom_fields SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    
    const transaction = db.transaction(() => {
      fields.forEach((field, index) => {
        stmt.run(index, field.id);
      });
    });
    
    transaction();
    
    logger.info('Custom fields reordered');
    
    res.json({
      success: true,
      message: 'Fields reordered successfully'
    });
  } catch (error) {
    logger.error('Error reordering fields:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder fields'
    });
  }
});

export { router as customFieldsRouter };