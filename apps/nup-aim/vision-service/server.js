const express = require('express');
const cors = require('cors');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
// Also try to load from parent directory
try {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
} catch (error) {
  console.log('No parent .env file found, using local .env');
}

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Vision Service',
    timestamp: new Date().toISOString()
  });
});

// Vision API endpoint
app.post('/api/vision-ocr', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ 
        success: false, 
        error: 'Image data is required' 
      });
    }

    // Remove data URL prefix if present
    const base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // Get credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}');
    
    if (!credentials.private_key) {
      return res.status(500).json({ 
        success: false, 
        error: 'Google Cloud credentials not configured' 
      });
    }

    // Create a client authenticated with the service account credentials
    const client = new ImageAnnotatorClient({
      credentials: credentials
    });

    console.log('🔍 Sending image to Google Cloud Vision API...');

    // Perform text detection on the image
    const [textDetectionResult] = await client.textDetection({
      image: {
        content: base64Image
      }
    });

    // Get full text annotation
    const fullTextAnnotation = textDetectionResult.fullTextAnnotation;
    
    // Get text detection annotations
    const textAnnotations = textDetectionResult.textAnnotations || [];
    
    // Extract detected text and bounding boxes
    const detectedElements = textAnnotations.map(annotation => {
      // Skip the first annotation which is the entire text
      if (!annotation.boundingPoly) return null;
      
      const vertices = annotation.boundingPoly.vertices || [];
      
      // Calculate bounding box
      const boundingBox = vertices.length === 4 ? {
        x: vertices[0].x || 0,
        y: vertices[0].y || 0,
        width: ((vertices[1].x || 0) - (vertices[0].x || 0)) || 0,
        height: ((vertices[2].y || 0) - (vertices[0].y || 0)) || 0
      } : null;
      
      return {
        text: annotation.description,
        boundingBox,
        confidence: annotation.confidence || 0.8 // Default confidence if not provided
      };
    }).filter(Boolean);

    // Perform document text detection for more structured analysis
    const [documentResult] = await client.documentTextDetection({
      image: {
        content: base64Image
      }
    });

    // Extract form fields and labels
    const formElements = extractFormElements(documentResult);

    console.log(`✅ OCR completed: ${detectedElements.length} text elements detected`);
    console.log(`✅ Form analysis: ${formElements.length} potential form elements identified`);

    return res.json({
      success: true,
      fullText: fullTextAnnotation ? fullTextAnnotation.text : '',
      textElements: detectedElements,
      formElements: formElements,
      rawDetections: textAnnotations.slice(0, 1) // Just include the first one (full text) to reduce payload size
    });
  } catch (error) {
    console.error('Error processing image with Google Cloud Vision:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Error processing image'
    });
  }
});

// Helper function to extract potential form elements from document text detection
function extractFormElements(documentResult) {
  const formElements = [];
  
  try {
    if (!documentResult.fullTextAnnotation) {
      return formElements;
    }
    
    // Process pages
    const pages = documentResult.fullTextAnnotation.pages || [];
    
    pages.forEach(page => {
      // Process blocks (paragraphs and form fields)
      const blocks = page.blocks || [];
      
      blocks.forEach(block => {
        // Process paragraphs
        const paragraphs = block.paragraphs || [];
        
        paragraphs.forEach(paragraph => {
          const words = paragraph.words || [];
          const text = words.map(word => {
            return (word.symbols || []).map(symbol => symbol.text).join('');
          }).join(' ');
          
          // Skip very long texts (likely not form labels)
          if (text.length > 50) return;
          
          // Check if this looks like a form label
          const isFormLabel = isLikelyFormLabel(text);
          
          if (isFormLabel) {
            // Get bounding box
            const boundingBox = paragraph.boundingBox || {};
            const vertices = boundingBox.vertices || [];
            
            const box = vertices.length === 4 ? {
              x: vertices[0].x || 0,
              y: vertices[0].y || 0,
              width: ((vertices[1].x || 0) - (vertices[0].x || 0)) || 0,
              height: ((vertices[2].y || 0) - (vertices[0].y || 0)) || 0
            } : null;
            
            formElements.push({
              text,
              boundingBox: box,
              confidence: paragraph.confidence || 0.8,
              isLabel: true,
              fieldType: guessFieldType(text)
            });
          }
        });
      });
    });
    
    return formElements;
  } catch (error) {
    console.error('Error extracting form elements:', error);
    return formElements;
  }
}

// Helper function to determine if text is likely a form label
function isLikelyFormLabel(text) {
  // Common form field indicators
  const labelPatterns = [
    /nome/i, /email/i, /telefone/i, /endereço/i, /cidade/i, /estado/i, /cep/i, 
    /cpf/i, /rg/i, /data/i, /nascimento/i, /sexo/i, /gênero/i, /profissão/i, 
    /empresa/i, /cargo/i, /salário/i, /observações/i, /senha/i, /confirmar/i, 
    /código/i, /descrição/i, /título/i, /categoria/i, /status/i, /prioridade/i,
    /name/i, /phone/i, /address/i, /city/i, /state/i, /zip/i, /gender/i, 
    /birth/i, /company/i, /position/i, /salary/i, /notes/i, /password/i, 
    /code/i, /description/i, /title/i, /category/i, /status/i, /priority/i
  ];
  
  // Check if text ends with common label suffixes
  if (text.endsWith(':') || text.endsWith('*')) {
    return true;
  }
  
  // Check if text matches common form field patterns
  return labelPatterns.some(pattern => pattern.test(text));
}

// Helper function to guess field type based on label text
function guessFieldType(label) {
  label = label.toLowerCase();
  
  if (label.includes('email')) return 'email';
  if (label.includes('senha') || label.includes('password')) return 'password';
  if (label.includes('data') || label.includes('date') || label.includes('nascimento')) return 'date';
  if (label.includes('número') || label.includes('number') || 
      label.includes('quantidade') || label.includes('quantity') || 
      label.includes('valor') || label.includes('amount') || 
      label.includes('preço') || label.includes('price')) return 'number';
  if (label.includes('descrição') || label.includes('description') || 
      label.includes('observação') || label.includes('observation') || 
      label.includes('comentário') || label.includes('comment') || 
      label.includes('mensagem') || label.includes('message')) return 'textarea';
  if (label.includes('aceito') || label.includes('accept') || 
      label.includes('concordo') || label.includes('agree') || 
      label.includes('lembrar') || label.includes('remember')) return 'checkbox';
  if (label.includes('sexo') || label.includes('gender') || 
      label.includes('opção') || label.includes('option')) return 'radio';
  if (label.includes('estado') || label.includes('state') || 
      label.includes('país') || label.includes('country') || 
      label.includes('categoria') || label.includes('category') || 
      label.includes('tipo') || label.includes('type') || 
      label.includes('status')) return 'select';
  if (label.includes('arquivo') || label.includes('file') || 
      label.includes('anexo') || label.includes('attachment') || 
      label.includes('upload')) return 'file';
  if (label.includes('url') || label.includes('site') || 
      label.includes('website') || label.includes('link')) return 'url';
  
  // Default to text
  return 'text';
}

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Vision Service running on http://localhost:${PORT}`);
  console.log(`🔍 API endpoint: http://localhost:${PORT}/api/vision-ocr`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
});