import { logger } from '../utils/logger.js';
import { performOCR } from '../services/visionService.js';
import { extractFieldsWithRegex } from '../services/regexService.js';
import { extractFieldsWithAI } from '../services/openaiService.js';

/**
 * Extract fields from an image using OCR and AI
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const extractFields = async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({
        status: 'error',
        message: 'Image data is required'
      });
    }
    
    // Step 1: Extract base64 image data
    const base64Image = image.startsWith('data:image/')
      ? image.split(',')[1]
      : image;
    
    // Step 2: Perform OCR using Google Cloud Vision
    logger.info('Performing OCR with Google Cloud Vision');
    const ocrResult = await performOCR(base64Image);
    
    if (!ocrResult.success) {
      return res.status(500).json({
        status: 'error',
        message: ocrResult.error || 'Failed to perform OCR'
      });
    }
    
    const extractedText = ocrResult.text;
    const textBlocks = ocrResult.textBlocks || [];
    logger.info(`OCR completed, extracted ${extractedText.length} characters and ${textBlocks.length} text blocks`);
    
    // Step 3: Try to extract fields using regex
    logger.info('Attempting to extract fields using regex');
    const regexResult = extractFieldsWithRegex(extractedText, textBlocks);
    
    // If regex extraction found fields, return them
    if (regexResult.success && Object.keys(regexResult.fields).length > 0) {
      logger.info(`Regex extraction successful, found ${Object.keys(regexResult.fields).length} fields`);
      return res.status(200).json({
        status: 'success',
        fonte: 'regex',
        campos: regexResult.fields,
        texto_completo: extractedText
      });
    }
    
    // Step 4: If regex failed, use OpenAI
    logger.info('Regex extraction failed or found no fields, attempting AI extraction');
    const aiResult = await extractFieldsWithAI(extractedText, textBlocks);
    
    if (!aiResult.success) {
      return res.status(500).json({
        status: 'error',
        message: aiResult.error || 'Failed to extract fields with AI',
        texto_completo: extractedText
      });
    }
    
    logger.info(`AI extraction successful, found ${Object.keys(aiResult.fields).length} fields`);
    return res.status(200).json({
      status: 'success',
      fonte: 'ia',
      campos: aiResult.fields,
      texto_completo: extractedText
    });
    
  } catch (error) {
    logger.error('Error in field extraction:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred during field extraction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};