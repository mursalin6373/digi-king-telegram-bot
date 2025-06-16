const validator = require('validator');
const axios = require('axios');

class EmailValidator {
  constructor() {
    this.apiKey = process.env.EMAIL_VALIDATION_API_KEY;
  }

  /**
   * Basic email validation using validator library
   * @param {string} email - Email address to validate
   * @returns {object} Validation result
   */
  basicValidation(email) {
    const result = {
      isValid: false,
      email: email?.toLowerCase().trim(),
      errors: []
    };

    if (!email) {
      result.errors.push('Email is required');
      return result;
    }

    // Trim and convert to lowercase
    const cleanEmail = email.toLowerCase().trim();
    result.email = cleanEmail;

    // Basic format validation
    if (!validator.isEmail(cleanEmail)) {
      result.errors.push('Invalid email format');
      return result;
    }

    // Additional checks
    const [localPart, domain] = cleanEmail.split('@');
    
    // Check local part length
    if (localPart.length > 64) {
      result.errors.push('Email local part too long (max 64 characters)');
    }

    // Check domain length
    if (domain.length > 253) {
      result.errors.push('Email domain too long (max 253 characters)');
    }

    // Check for common disposable email domains
    const disposableDomains = [
      '10minutemail.com', 'temp-mail.org', 'guerrillamail.com',
      'mailinator.com', 'tempmail.net', 'throwaway.email'
    ];
    
    if (disposableDomains.includes(domain)) {
      result.errors.push('Disposable email addresses are not allowed');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Advanced email validation using external API (if configured)
   * @param {string} email - Email address to validate
   * @returns {object} Advanced validation result
   */
  async advancedValidation(email) {
    const basicResult = this.basicValidation(email);
    
    if (!basicResult.isValid || !this.apiKey) {
      return basicResult;
    }

    try {
      // Example using a hypothetical email validation service
      // Replace with your preferred email validation API
      const response = await axios.get(`https://api.emailvalidation.com/v1/validate`, {
        params: {
          email: basicResult.email,
          api_key: this.apiKey
        },
        timeout: 5000
      });

      const apiResult = response.data;
      
      return {
        ...basicResult,
        advanced: {
          deliverable: apiResult.deliverable,
          validSyntax: apiResult.valid_syntax,
          webmail: apiResult.webmail,
          disposable: apiResult.disposable,
          roleAccount: apiResult.role,
          score: apiResult.score
        }
      };
    } catch (error) {
      console.warn('Advanced email validation failed:', error.message);
      // Return basic validation if advanced fails
      return basicResult;
    }
  }

  /**
   * Validate multiple emails at once
   * @param {string[]} emails - Array of email addresses
   * @returns {object[]} Array of validation results
   */
  async validateBatch(emails) {
    const results = [];
    
    for (const email of emails) {
      const result = await this.advancedValidation(email);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Check if email domain has MX record
   * @param {string} domain - Domain to check
   * @returns {boolean} True if MX record exists
   */
  async checkMXRecord(domain) {
    try {
      const dns = require('dns').promises;
      const mxRecords = await dns.resolveMx(domain);
      return mxRecords && mxRecords.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Suggest corrections for common email typos
   * @param {string} email - Email with potential typo
   * @returns {string|null} Suggested correction or null
   */
  suggestCorrection(email) {
    if (!email) return null;

    const commonTypos = {
      'gmail.co': 'gmail.com',
      'gmail.cm': 'gmail.com',
      'gmial.com': 'gmail.com',
      'yahoo.co': 'yahoo.com',
      'yahoo.cm': 'yahoo.com',
      'hotmail.co': 'hotmail.com',
      'hotmail.cm': 'hotmail.com',
      'outlook.co': 'outlook.com',
      'outlook.cm': 'outlook.com'
    };

    const [localPart, domain] = email.toLowerCase().trim().split('@');
    
    if (commonTypos[domain]) {
      return `${localPart}@${commonTypos[domain]}`;
    }

    return null;
  }
}

module.exports = new EmailValidator();

