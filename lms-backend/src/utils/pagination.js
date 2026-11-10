/**
 * utils/pagination.js
 * Normalises ?page= & ?limit= so every list endpoint paginates the same way.
 */
const getPagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit };
};

module.exports = { getPagination };
