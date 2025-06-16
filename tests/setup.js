require('dotenv').config({ path: '.env.test' });

// Global test configuration
process.env.NODE_ENV = 'test';
process.env.TEST_MONGODB_URL = process.env.TEST_MONGODB_URL || 'mongodb://localhost:27017/digiking-test';

// Suppress console.log during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  };
}

// Global test helpers
global.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Increase timeout for async operations
jest.setTimeout(30000);

