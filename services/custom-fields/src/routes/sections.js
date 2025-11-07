import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDatabase } from '../database/init.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// POST /api/sections/register - Register sections from an application
router.post('/register', async (req, res) => {
  try {
    const { sections, app_id = 'default' } = req.body;
    
    if (!Array.isArray(sections)) {
      return res.status(400).json({
        success: false,
        error: 'Sections must be an array'
      });
    }

    const db = getDatabase();
    
    // Use transaction for atomicity
    const transaction = db.transaction(() => {
      sections.forEach((section, index) => {
        const stmt = db.prepare(`
          INSERT INTO form_sections (id, name, label, description, component_name, order_index, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(id) DO UPDATE SET
            label = excluded.label,
            description = excluded.description,
            component_name = excluded.component_name,
            updated_at = CURRENT_TIMESTAMP
        `);
        
        stmt.run(
          section.id || uuidv4(),
          section.name,
          section.label,
          section.description || '',
          section.component_name || section.name,
          section.order_index !== undefined ? section.order_index : index
        );
      });
    });
    
    transaction();
    
    logger.info(`Registered ${sections.length} sections for app: ${app_id}`);
    
    res.json({
      success: true,
      message: `Registered ${sections.length} sections`,
      registered: sections.length
    });
  } catch (error) {
    logger.error('Error registering sections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register sections'
    });
  }
});

// GET /api/sections - Get all sections with field counts
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      SELECT 
        fs.*,
        COUNT(cf.id) as fields_count
      FROM form_sections fs
      LEFT JOIN custom_fields cf ON fs.name = cf.form_section AND cf.is_active = 1
      WHERE fs.is_active = 1
      GROUP BY fs.id
      ORDER BY fs.order_index, fs.created_at
    `);
    
    const sections = stmt.all().map(section => ({
      ...section,
      is_active: Boolean(section.is_active),
      fields_count: Number(section.fields_count)
    }));
    
    res.json({
      success: true,
      data: sections
    });
  } catch (error) {
    logger.error('Error fetching sections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sections'
    });
  }
});

export { router as sectionsRouter };
