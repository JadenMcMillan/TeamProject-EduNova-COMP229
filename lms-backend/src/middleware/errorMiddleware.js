/**
 * middleware/errorMiddleware.js
 * ---------------------------------------------------------------------------
 * Central error funnel. Converts Mongoose / JWT / programmer errors into one
 * predictable JSON envelope:
 *   { success: false, message, errors?: [...] }
 * ---------------------------------------------------------------------------
 */
const notFound = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.isOperational = true;
  next(error);
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors;

  // Mongoose validation -> 400 with per-field messages
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  // Bad ObjectId in the URL -> 400 instead of a 500
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for '${err.path}': ${err.value}`;
  }

  // Duplicate key (unique index) -> 409
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {}).join(', ');
    message = `Duplicate value for: ${field}`;
  }

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    // Stack traces only help developers - and only for genuine server faults
    ...(statusCode >= 500 && process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};

module.exports = { notFound, errorHandler };
