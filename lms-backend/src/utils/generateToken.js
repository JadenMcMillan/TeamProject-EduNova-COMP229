const jwt = require('jsonwebtoken');

/**
 * utils/generateToken.js
 * Signs a short-lived JWT that carries only the user id and role.
 * Everything else is re-read from the database by `protect`, so a role or
 * name change takes effect immediately.
 */
const generateToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

module.exports = generateToken;
