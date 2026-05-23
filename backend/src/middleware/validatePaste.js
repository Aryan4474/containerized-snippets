/**
 * Input validation middleware for Paste creation.
 * Validates request body fields and returns structured 400 Bad Request if validation fails.
 */
const validatePaste = (req, res, next) => {
  const { content, title, expiresIn, language, burnOnRead } = req.body;
  const errors = [];

  // 1. Validate content (Mandatory)
  if (content === undefined || content === null) {
    errors.push({ field: 'content', message: 'Content field is required' });
  } else if (typeof content !== 'string') {
    errors.push({ field: 'content', message: 'Content must be a string' });
  } else if (content.trim() === '') {
    errors.push({ field: 'content', message: 'Content cannot be empty' });
  } else if (Buffer.byteLength(content, 'utf8') > 2 * 1024 * 1024) {
    // 2MB Size Limit to protect server RAM and DB storage
    errors.push({ field: 'content', message: 'Content size exceeds maximum limit of 2MB' });
  }

  // 2. Validate title (Optional)
  if (title !== undefined && title !== null) {
    if (typeof title !== 'string') {
      errors.push({ field: 'title', message: 'Title must be a string' });
    } else if (title.length > 100) {
      errors.push({ field: 'title', message: 'Title cannot exceed 100 characters' });
    }
  }

  // 3. Validate expiresIn (Optional)
  if (expiresIn !== undefined && expiresIn !== null) {
    if (typeof expiresIn === 'number') {
      if (expiresIn <= 0) {
        errors.push({ field: 'expiresIn', message: 'ExpiresIn number must be positive' });
      }
    } else if (typeof expiresIn === 'string') {
      if (expiresIn !== 'never') {
        const durationRegex = /^(\d+)([mhdw])$/;
        if (!durationRegex.test(expiresIn)) {
          errors.push({
            field: 'expiresIn',
            message: "ExpiresIn string must be 'never' or match the format '10m', '2h', '5d', '4w'"
          });
        }
      }
    } else {
      errors.push({ field: 'expiresIn', message: 'ExpiresIn must be a string or number' });
    }
  }

  // 4. Validate language (Optional)
  if (language !== undefined && language !== null) {
    if (typeof language !== 'string') {
      errors.push({ field: 'language', message: 'Language must be a string' });
    } else {
      const allowedLanguages = ['javascript', 'python', 'html', 'css', 'c', 'bash', 'plaintext'];
      if (!allowedLanguages.includes(language.toLowerCase())) {
        errors.push({
          field: 'language',
          message: `Unsupported language. Must be one of: ${allowedLanguages.join(', ')}`
        });
      }
    }
  }

  // 5. Validate burnOnRead (Optional)
  if (burnOnRead !== undefined && burnOnRead !== null) {
    if (typeof burnOnRead !== 'boolean') {
      errors.push({ field: 'burnOnRead', message: 'burnOnRead must be a boolean' });
    }
  }

  // If there are validation errors, return them immediately
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Input sanitization: clean up title
  if (req.body.title) {
    req.body.title = req.body.title.trim();
  }
  
  next();
};

module.exports = {
  validatePaste
};
