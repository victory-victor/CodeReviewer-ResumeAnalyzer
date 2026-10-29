const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for a given user ID.
 * @param {string} id - The user's MongoDB _id.
 * @returns {string} Signed JWT token.
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

/**
 * Format a standard API response.
 * @param {boolean} success - Whether the operation succeeded.
 * @param {*} data - The response payload.
 * @param {string} message - A human-readable message.
 * @returns {object} Formatted response object.
 */
const formatResponse = (success, data = null, message = '') => {
  return {
    success,
    data,
    message,
  };
};

/**
 * Wrap an async route handler so that rejected promises are forwarded to
 * Express's next() error handler automatically.
 * @param {Function} fn - Async route handler (req, res, next) => Promise.
 * @returns {Function} Express middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  generateToken,
  formatResponse,
  asyncHandler,
};
