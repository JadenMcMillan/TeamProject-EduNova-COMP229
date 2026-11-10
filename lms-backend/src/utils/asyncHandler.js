/**
 * utils/asyncHandler.js
 * Wraps async controllers so rejected promises reach the error middleware
 * (Express 4 does not forward async errors on its own).
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
