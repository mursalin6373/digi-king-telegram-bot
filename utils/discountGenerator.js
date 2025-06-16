const crypto = require('crypto');

class DiscountCodeGenerator {
  constructor() {
    this.prefix = 'DIGI';
    this.defaultLength = 8;
  }

  /**
   * Generate a random discount code
   * @param {object} options - Generation options
   * @returns {string} Generated discount code
   */
  generateCode(options = {}) {
    const {
      prefix = this.prefix,
      length = this.defaultLength,
      includeNumbers = true,
      includeLetters = true,
      excludeAmbiguous = true,
      customSuffix = null
    } = options;

    let charset = '';
    
    if (includeNumbers) {
      charset += excludeAmbiguous ? '23456789' : '0123456789';
    }
    
    if (includeLetters) {
      charset += excludeAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }

    if (!charset) {
      throw new Error('Must include at least numbers or letters');
    }

    // Generate random code
    let code = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      code += charset[randomIndex];
    }

    // Construct final code
    let finalCode = prefix ? `${prefix}${code}` : code;
    
    if (customSuffix) {
      finalCode += customSuffix;
    }

    return finalCode;
  }

  /**
   * Generate a code based on user segments
   * @param {string[]} segments - User segments
   * @param {object} options - Additional options
   * @returns {string} Segmented discount code
   */
  generateSegmentedCode(segments, options = {}) {
    const segmentPrefixes = {
      'new_customer': 'NEW',
      'returning_customer': 'RETURN',
      'vip': 'VIP',
      'inactive': 'BACK'
    };

    // Use the first segment for prefix
    const primarySegment = segments[0];
    const segmentPrefix = segmentPrefixes[primarySegment] || 'DIGI';

    return this.generateCode({
      ...options,
      prefix: segmentPrefix
    });
  }

  /**
   * Generate a time-limited code with expiry
   * @param {number} expiryDays - Days until expiry
   * @param {object} options - Additional options
   * @returns {object} Code with expiry information
   */
  generateTimeLimitedCode(expiryDays = 7, options = {}) {
    const code = this.generateCode({
      ...options,
      customSuffix: Math.floor(Date.now() / 1000).toString().slice(-3)
    });

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    return {
      code,
      expiryDate,
      expiryDays,
      isValid: true
    };
  }

  /**
   * Generate a batch of unique codes
   * @param {number} count - Number of codes to generate
   * @param {object} options - Generation options
   * @returns {string[]} Array of unique codes
   */
  generateBatch(count, options = {}) {
    const codes = new Set();
    const maxAttempts = count * 10; // Prevent infinite loop
    let attempts = 0;

    while (codes.size < count && attempts < maxAttempts) {
      const code = this.generateCode(options);
      codes.add(code);
      attempts++;
    }

    if (codes.size < count) {
      console.warn(`Could only generate ${codes.size} unique codes out of ${count} requested`);
    }

    return Array.from(codes);
  }

  /**
   * Generate a personalized code based on user data
   * @param {object} user - User data
   * @param {object} options - Additional options
   * @returns {string} Personalized discount code
   */
  generatePersonalizedCode(user, options = {}) {
    let prefix = 'DIGI';
    
    // Customize prefix based on user data
    if (user.segments && user.segments.length > 0) {
      const segmentPrefixes = {
        'new_customer': 'WELCOME',
        'returning_customer': 'THANKS',
        'vip': 'VIP',
        'inactive': 'COMEBACK'
      };
      prefix = segmentPrefixes[user.segments[0]] || 'DIGI';
    }

    // Add user-specific suffix
    const userSuffix = user.telegramId ? user.telegramId.slice(-3) : null;

    return this.generateCode({
      ...options,
      prefix,
      customSuffix: userSuffix
    });
  }

  /**
   * Validate a discount code format
   * @param {string} code - Code to validate
   * @returns {object} Validation result
   */
  validateCodeFormat(code) {
    const result = {
      isValid: false,
      code: code?.toUpperCase().trim(),
      errors: []
    };

    if (!code) {
      result.errors.push('Code is required');
      return result;
    }

    const cleanCode = code.toUpperCase().trim();
    result.code = cleanCode;

    // Check length
    if (cleanCode.length < 4) {
      result.errors.push('Code too short (minimum 4 characters)');
    }

    if (cleanCode.length > 20) {
      result.errors.push('Code too long (maximum 20 characters)');
    }

    // Check characters
    const validChars = /^[A-Z0-9]+$/;
    if (!validChars.test(cleanCode)) {
      result.errors.push('Code contains invalid characters (only letters and numbers allowed)');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Generate a code with specific discount parameters
   * @param {object} discountParams - Discount parameters
   * @returns {object} Complete discount code object
   */
  generateDiscountCode(discountParams = {}) {
    const {
      percentage = 10,
      fixedAmount = null,
      minOrderValue = 0,
      maxUses = null,
      expiryDays = 7,
      segments = [],
      campaignId = null
    } = discountParams;

    let code;
    if (segments.length > 0) {
      code = this.generateSegmentedCode(segments);
    } else {
      code = this.generateCode();
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    return {
      code,
      percentage: fixedAmount ? null : percentage,
      fixedAmount,
      minOrderValue,
      maxUses,
      usedCount: 0,
      expiryDate,
      isActive: true,
      campaignId,
      createdAt: new Date()
    };
  }
}

module.exports = new DiscountCodeGenerator();

