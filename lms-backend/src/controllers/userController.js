/**
 * controllers/userController.js
 * ---------------------------------------------------------------------------
 * Admin-only management of the User collection (the "user object" CRUD that
 * the assignment asks for on top of the self-service auth endpoints).
 * ---------------------------------------------------------------------------
 */
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/pagination');

/**
 * @route   GET /api/users
 * @desc    List users with pagination + filters
 * @access  Private/Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).trim(), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: users.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: users,
  });
});

/**
 * @route   GET /api/users/:id
 * @desc    Get one user
 * @access  Private/Admin
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, `No user found with id ${req.params.id}`);
  res.status(200).json({ success: true, data: user });
});

/**
 * @route   POST /api/users
 * @desc    Admin creates a user with any role (incl. admin)
 * @access  Private/Admin
 */
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, bio } = req.body;
  if (!name || !email || !password) {
    throw new ApiError(400, 'name, email and password are required');
  }
  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) throw new ApiError(409, 'An account with that email already exists');

  const user = await User.create({ name, email, password, role: role || 'student', bio });
  res.status(201).json({ success: true, message: 'User created', data: user });
});

/**
 * @route   PUT /api/users/:id
 * @desc    Admin updates any user field
 * @access  Private/Admin
 */
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, `No user found with id ${req.params.id}`);

  ['name', 'email', 'role', 'bio', 'avatarUrl', 'isActive'].forEach((field) => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });

  // Password changes must go through the hashing hook in User
  if (req.body.password) user.password = req.body.password;

  await user.save();
  res.status(200).json({ success: true, message: 'User updated', data: user });
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user. Instructors that still own courses are protected.
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, `No user found with id ${req.params.id}`);
  if (user._id.equals(req.user._id)) throw new ApiError(400, 'You cannot delete your own account');

  const ownedCourses = await Course.countDocuments({ instructor: user._id });
  if (ownedCourses > 0) {
    throw new ApiError(
      409,
      `Cannot delete: this instructor still owns ${ownedCourses} course(s). Reassign or delete them first.`
    );
  }

  // Cascade: remove the student's enrolments so no orphan records remain
  await Enrollment.deleteMany({ student: user._id });
  await user.deleteOne();

  res.status(200).json({ success: true, message: 'User deleted', data: { _id: user._id } });
});

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };
