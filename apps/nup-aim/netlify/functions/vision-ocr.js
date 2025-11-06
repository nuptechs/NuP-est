const { ImageAnnotatorClient } = require('@google-cloud/vision');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const { imageBase64 } = JSON.parse(event.body);
    
    if (!imageBase64) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Image data is required' }),
      };
    }

    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // Get credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}');
    
    if (!credentials.private_key) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: false,
          error: 'Google Cloud credentials not configured' 
        }),
      };
    }

    // Create a client authenticated with the service account credentials
    const client = new ImageAnnotatorClient({
      credentials: credentials
    });

    console.log('🔍 Sending image to Google Cloud Vision API for DOCUMENT_TEXT_DETECTION...');

    // Perform document text detection on the image
    const [documentResult] = await client.documentTextDetection({
      image: {
        content: base64Image
      }
    });

    const fullTextAnnotation = documentResult.fullTextAnnotation;
    
    // Extract text elements from document text detection
    const textElements = [];
    if (fullTextAnnotation && fullTextAnnotation.pages) {
      fullTextAnnotation.pages.forEach((page) => {
        if (page.blocks) {
          page.blocks.forEach((block) => {
            if (block.paragraphs) {
              block.paragraphs.forEach((paragraph) => {
                if (paragraph.words) {
                  const text = paragraph.words.map((word) => 
                    word.symbols ? word.symbols.map((s) => s.text).join('') : ''
                  ).join(' ');
                  
                  const vertices = paragraph.boundingBox?.vertices || [];
                  const boundingBox = vertices.length === 4 ? {
                    x: vertices[0].x || 0,
                    y: vertices[0].y || 0,
                    width: ((vertices[1].x || 0) - (vertices[0].x || 0)) || 0,
                    height: ((vertices[2].y || 0) - (vertices[0].y || 0)) || 0
                  } : null;

                  textElements.push({
                    text: text,
                    boundingBox: boundingBox,
                    confidence: paragraph.confidence || 0.8 // Paragraph confidence
                  });
                }
              });
            }
          });
        }
      });
    }

    console.log(`✅ OCR completed with DOCUMENT_TEXT_DETECTION: ${textElements.length} text elements detected`);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        fullText: fullTextAnnotation ? fullTextAnnotation.text : '',
        textElements: textElements
      }),
    };
  } catch (error) {
    console.error('Error processing image with Google Cloud Vision:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Error processing image'
      }),
    };
  }
};