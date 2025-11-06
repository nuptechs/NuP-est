import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDatabase } from '../database/init.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Validation schemas
const fieldValueSchema = Joi.object({
  field_id: Joi.string().required(),
  analysis_id: Joi.string().required(),
  value: Joi.string().allow('').allow(null)
});

// GET /api/forms/sections - Get all form sections
router.get('/sections', async (req, res) => {
  try {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      SELECT fs.*, 
             COUNT(cf.id) as custom_fields_count
      FROM form_sections fs
      LEFT JOIN custom_fields cf ON fs.name = cf.form_section AND cf.is_active = 1
      WHERE fs.is_active = 1
      GROUP BY fs.id
      ORDER BY fs.order_index, fs.created_at
    `);
    
    const sections = stmt.all().map(section => ({
      ...section,
      is_active: Boolean(section.is_active),
      custom_fields_count: Number(section.custom_fields_count)
    }));
    
    res.json({
      success: true,
      data: sections
    });
  } catch (error) {
    logger.error('Error fetching form sections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch form sections'
    });
  }
});

// GET /api/forms/sections/:section/fields - Get custom fields for a specific section
router.get('/sections/:section/fields', async (req, res) => {
  try {
    const { section } = req.params;
    const db = getDatabase();
    
    const stmt = db.prepare(`
      SELECT * FROM custom_fields 
      WHERE form_section = ? AND is_active = 1
      ORDER BY order_index, created_at
    `);
    
    const fields = stmt.all(section).map(field => ({
      ...field,
      required: Boolean(field.required),
      is_active: Boolean(field.is_active),
      validation_rules: field.validation_rules ? JSON.parse(field.validation_rules) : null,
      options: field.options ? JSON.parse(field.options) : null
    }));
    
    res.json({
      success: true,
      data: fields
    });
  } catch (error) {
    logger.error('Error fetching section fields:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch section fields'
    });
  }
});

// GET /api/forms/analysis/:analysisId/values - Get custom field values for an analysis
router.get('/analysis/:analysisId/values', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const db = getDatabase();
    
    const stmt = db.prepare(`
      SELECT cfv.*, cf.name as field_name, cf.type as field_type, cf.form_section
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.field_id = cf.id
      WHERE cfv.analysis_id = ? AND cf.is_active = 1
      ORDER BY cf.form_section, cf.order_index
    `);
    
    const values = stmt.all(analysisId);
    
    // Group by form section
    const groupedValues = values.reduce((acc, value) => {
      if (!acc[value.form_section]) {
        acc[value.form_section] = [];
      }
      acc[value.form_section].push(value);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: groupedValues
    });
  } catch (error) {
    logger.error('Error fetching analysis values:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analysis values'
    });
  }
});

// POST /api/forms/values - Save custom field values
router.post('/values', async (req, res) => {
  try {
    const { values } = req.body;
    
    if (!Array.isArray(values)) {
      return res.status(400).json({
        success: false,
        error: 'Values must be an array'
      });
    }
    
    // Validate each value
    const validationErrors = [];
    values.forEach((value, index) => {
      const { error } = fieldValueSchema.validate(value);
      if (error) {
        validationErrors.push(`Value ${index}: ${error.details[0].message}`);
      }
    });
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation errors',
        details: validationErrors
      });
    }
    
    const db = getDatabase();
    
    // Upsert values (insert or update)
    const upsertStmt = db.prepare(`
      INSERT INTO custom_field_values (id, field_id, analysis_id, value)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(field_id, analysis_id) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    const transaction = db.transaction(() => {
      values.forEach(value => {
        const id = uuidv4();
        upsertStmt.run(id, value.field_id, value.analysis_id, value.value);
      });
    });
    
    transaction();
    
    logger.info(`Saved ${values.length} custom field values`);
    
    res.json({
      success: true,
      message: 'Custom field values saved successfully',
      saved_count: values.length
    });
  } catch (error) {
    logger.error('Error saving field values:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save field values'
    });
  }
});

// PUT /api/forms/values/:id - Update specific field value
router.put('/values/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;
    
    const db = getDatabase();
    
    // Check if value exists
    const existsCheck = db.prepare('SELECT id FROM custom_field_values WHERE id = ?');
    const exists = existsCheck.get(id);
    
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Field value not found'
      });
    }
    
    const stmt = db.prepare(`
      UPDATE custom_field_values 
      SET value = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(value, id);
    
    logger.info(`Updated field value: ${id}`);
    
    res.json({
      success: true,
      message: 'Field value updated successfully'
    });
  } catch (error) {
    logger.error('Error updating field value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update field value'
    });
  }
});

// DELETE /api/forms/analysis/:analysisId/values - Delete all custom field values for an analysis
router.delete('/analysis/:analysisId/values', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const db = getDatabase();
    
    const stmt = db.prepare('DELETE FROM custom_field_values WHERE analysis_id = ?');
    const result = stmt.run(analysisId);
    
    logger.info(`Deleted ${result.changes} field values for analysis: ${analysisId}`);
    
    res.json({
      success: true,
      message: 'Analysis field values deleted successfully',
      deleted_count: result.changes
    });
  } catch (error) {
    logger.error('Error deleting analysis values:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete analysis values'
    });
  }
});

// GET /api/forms/export/:analysisId - Export custom field data for an analysis
router.get('/export/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const db = getDatabase();
    
    const stmt = db.prepare(`
      SELECT 
        cf.name as field_name,
        cf.label as field_label,
        cf.type as field_type,
        cf.form_section,
        cfv.value,
        fs.label as section_label
      FROM custom_fields cf
      LEFT JOIN custom_field_values cfv ON cf.id = cfv.field_id AND cfv.analysis_id = ?
      LEFT JOIN form_sections fs ON cf.form_section = fs.name
      WHERE cf.is_active = 1
      ORDER BY cf.form_section, cf.order_index
    `);
    
    const data = stmt.all(analysisId);
    
    // Group by section
    const exportData = data.reduce((acc, item) => {
      if (!acc[item.form_section]) {
        acc[item.form_section] = {
          section_label: item.section_label,
          fields: []
        };
      }
      
      acc[item.form_section].fields.push({
        name: item.field_name,
        label: item.field_label,
        type: item.field_type,
        value: item.value
      });
      
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: exportData,
      analysis_id: analysisId,
      exported_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error exporting analysis data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analysis data'
    });
  }
});

export { router as formsRouter };