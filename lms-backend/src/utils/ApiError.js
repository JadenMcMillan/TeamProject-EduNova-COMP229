/**
 * utils/ApiError.js
 * Every controller throws ApiError; the central error middleware turns it
 * into a JSON response, so the controllers stay small and readable.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
