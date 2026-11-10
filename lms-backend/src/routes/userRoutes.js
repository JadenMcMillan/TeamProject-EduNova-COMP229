/**
 * routes/userRoutes.js  ->  mounted at /api/users
 * Every route below is admin-only: this is the administrative CRUD on the
 * user object (self-service lives in /api/auth).
 */
const express = require('express');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, authorize('admin'));

router.route('/').get(getUsers).post(createUser);
router.route('/:id').get(getUserById).put(updateUser).delete(deleteUser);

module.exports = router;
