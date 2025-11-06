import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import { logger } from '../utils/logger.js';

// Initialize Vision client based on environment variables
let visionClient;

try {
  // Check if credentials are provided as JSON string
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    visionClient = new ImageAnnotatorClient({ credentials });
    logger.info('Vision client initialized with JSON credentials');
  } 
  // Check if credentials file path is provided
  else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    visionClient = new ImageAnnotatorClient();
    logger.info('Vision client initialized with credentials file');
  } 
  // No credentials provided
  else {
    logger.warn('No Google Cloud Vision credentials provided');
  }
} catch (error) {
  logger.error('Error initializing Vision client:', error);
}

/**
 * Perform OCR on an image using Google Cloud Vision
 * @param {string} base64Image - Base64 encoded image
 * @returns {Object} OCR result with text and error (if any)
 */
export const performOCR = async (base64Image) => {
  try {
    // Check if Vision client is initialized
    if (!visionClient) {
      return {
        success: false,
        error: 'Google Cloud Vision client not initialized'
      };
    }
    
    // Perform text detection
    const [textDetectionResult] = await visionClient.textDetection({
      image: {
        content: base64Image
      }
    });
    
    // Check if OCR was successful
    if (!textDetectionResult || !textDetectionResult.fullTextAnnotation) {
      return {
        success: false,
        error: 'No text detected in the image'
      };
    }
    
    // Extract full text
    const extractedText = textDetectionResult.fullTextAnnotation.text;
    
    // Also get document text detection for more structured analysis
    const [documentResult] = await visionClient.documentTextDetection({
      image: {
        content: base64Image
      }
    });
    
    // Extract text blocks with positions
    const textBlocks = [];
    
    if (documentResult && documentResult.fullTextAnnotation) {
      const pages = documentResult.fullTextAnnotation.pages || [];
      
      pages.forEach(page => {
        const blocks = page.blocks || [];
        
        blocks.forEach(block => {
          const paragraphs = block.paragraphs || [];
          
          paragraphs.forEach(paragraph => {
            const words = paragraph.words || [];
            const text = words.map(word => {
              return (word.symbols || []).map(symbol => symbol.text).join('');
            }).join(' ');
            
            // Get bounding box
            const boundingBox = paragraph.boundingBox || {};
            const vertices = boundingBox.vertices || [];
            
            if (vertices.length === 4) {
              textBlocks.push({
                text,
                boundingBox: {
                  x: vertices[0].x || 0,
                  y: vertices[0].y || 0,
                  width: ((vertices[1].x || 0) - (vertices[0].x || 0)) || 0,
                  height: ((vertices[2].y || 0) - (vertices[0].y || 0)) || 0
                }
              });
            }
          });
        });
      });
    }
    
    return {
      success: true,
      text: extractedText,
      textBlocks
    };
  } catch (error) {
    logger.error('Error performing OCR:', error);
    return {
      success: false,
      error: `OCR failed: ${error.message}`
    };
  }
};