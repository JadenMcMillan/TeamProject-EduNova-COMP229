/**
 * middleware/authMiddleware.js
 * ---------------------------------------------------------------------------
 * Authentication  -> who are you?      (valid JWT  -> req.user)
 * Authorization   -> are you allowed?  (role check + ownership checks)
 * ---------------------------------------------------------------------------
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/** Reads "Authorization: Bearer <token>" and returns the raw token or null. */
const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.split(' ')[1];
  return null;
};

/**
 * protect - requires a valid JWT. Attaches the hydrated user document to
 * req.user so downstream code can trust it.
 */
const protect = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw new ApiError(401, 'Not authorised: no token provided');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Not authorised: token is invalid or expired');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, 'Not authorised: user no longer exists');
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated');

  req.user = user;
  return next();
});

/**
 * authorize - role based access control, e.g. authorize('admin', 'instructor').
 * Must be used after protect.
 */
const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new ApiError(401, 'Not authorised'));
  if (!roles.includes(req.user.role)) {
    return next(
      new ApiError(403, `Forbidden: role '${req.user.role}' cannot access this resource`)
    );
  }
  return next();
};

/**
 * optionalAuth - fills req.user when a token is present but never blocks.
 * Used by public endpoints that render differently for logged-in users
 * (e.g. GET /api/courses shows "enrolled: true").
 */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch (err) {
    req.user = undefined; // ignore bad token on public routes
  }
  return next();
});

module.exports = { protect, authorize, optionalAuth };
