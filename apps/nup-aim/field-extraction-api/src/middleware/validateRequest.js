/**
 * Validate image extraction request
 */
export const validateExtractFieldsRequest = (req, res, next) => {
  const { image } = req.body;
  
  // Check if image is provided
  if (!image) {
    return res.status(400).json({
      status: 'error',
      message: 'Image data is required'
    });
  }
  
  // Check if image is a valid base64 string
  if (typeof image !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'Image must be a base64 encoded string'
    });
  }
  
  // Check if image is too large (roughly 10MB in base64)
  if (image.length > 13 * 1024 * 1024) {
    return res.status(400).json({
      status: 'error',
      message: 'Image is too large. Maximum size is 10MB'
    });
  }
  
  // If all validations pass, continue
  next();
};