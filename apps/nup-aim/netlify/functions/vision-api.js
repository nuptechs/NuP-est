const { GoogleAuth } = require('google-auth-library');

// Function to process image with Google Cloud Vision API
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const { image } = JSON.parse(event.body);
    
    if (!image) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image data is required' }),
      };
    }

    // Get credentials from environment variable
    const credentials = process.env.GOOGLE_VISION_CREDENTIALS;
    
    if (!credentials) {
      console.error('Google Vision credentials not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Vision API credentials not configured',
          fallback: true
        }),
      };
    }

    // Parse credentials
    let parsedCredentials;
    try {
      parsedCredentials = JSON.parse(credentials);
    } catch (error) {
      console.error('Error parsing Google Vision credentials:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid Vision API credentials format',
          fallback: true
        }),
      };
    }

    // Create auth client
    const auth = new GoogleAuth({
      credentials: parsedCredentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    // Get auth client
    const client = await auth.getClient();

    // Extract base64 data
    const base64Data = image.split(',')[1];
    
    // Prepare request to Vision API
    const visionRequest = {
      requests: [
        {
          image: {
            content: base64Data,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 50,
            },
            {
              type: 'DOCUMENT_TEXT_DETECTION',
              maxResults: 50,
            },
          ],
        },
      ],
    };

    // Call Vision API
    const visionResponse = await client.request({
      url: 'https://vision.googleapis.com/v1/images:annotate',
      method: 'POST',
      data: visionRequest,
    });

    // Process results
    const textAnnotations = visionResponse.data.responses[0].textAnnotations || [];
    const documentText = visionResponse.data.responses[0].fullTextAnnotation || { text: '' };
    
    // Extract text blocks with confidence and bounding boxes
    const results = textAnnotations.map(annotation => {
      // Skip the first annotation which is the entire text
      if (!annotation.boundingPoly) return null;
      
      const vertices = annotation.boundingPoly.vertices;
      const boundingBox = {
        x: vertices[0].x || 0,
        y: vertices[0].y || 0,
        width: ((vertices[1].x || 0) - (vertices[0].x || 0)) || 10,
        height: ((vertices[2].y || 0) - (vertices[0].y || 0)) || 10,
      };
      
      return {
        text: annotation.description,
        confidence: 0.9, // Vision API doesn't provide confidence per text block
        boundingBox,
      };
    }).filter(Boolean);

    // Filter results to likely form field labels
    const fieldResults = results.filter(result => {
      const text = result.text.toLowerCase();
      // Common field indicators
      return text.length > 2 && (
        text.includes('nome') || text.includes('email') || text.includes('data') ||
        text.includes('endereço') || text.includes('telefone') || text.includes('cpf') ||
        text.includes('senha') || text.includes('código') || text.includes('observação') ||
        text.includes('name') || text.includes('address') || text.includes('phone') ||
        text.includes('date') || text.includes('password') || text.includes('code') ||
        text.includes('notes') || text.includes('description') || text.includes('status') ||
        text.endsWith(':') || // Labels often end with colon
        /^[a-zA-Z\s]{2,20}$/.test(text) // Short text that could be a label
      );
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results: fieldResults,
        fullText: documentText.text,
      }),
    };
  } catch (error) {
    console.error('Error processing image with Vision API:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: `Error processing image: ${error.message}`,
        fallback: true
      }),
    };
  }
};