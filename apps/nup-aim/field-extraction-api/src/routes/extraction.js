import express from 'express';
import { extractFields } from '../controllers/extractionController.js';

const router = express.Router();

/**
 * @route POST /api/extract-fields
 * @desc Extract fields from an image using OCR and AI
 * @access Public
 */
router.post('/extract-fields', extractFields);

export default router;