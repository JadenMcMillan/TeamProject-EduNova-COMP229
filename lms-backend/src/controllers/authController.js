/**
 * controllers/authController.js
 * ---------------------------------------------------------------------------
 * Authentication endpoints: register / login / me / change-password.
 * Controllers only orchestrate: validate -> call model -> shape response.
 * ---------------------------------------------------------------------------
 */
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
});

/**
 * @route   POST /api/auth/register
 * @desc    Create an account (student or instructor only)
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, bio } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'name, email and password are required');
  }
  if (String(password).length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }
  // Privilege escalation guard: the public endpoint can never create an admin
  const safeRole = ['student', 'instructor'].includes(role) ? role : 'student';

  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) throw new ApiError(409, 'An account with that email already exists');

  const user = await User.create({ name, email, password, role: safeRole, bio });
  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    token,
    data: publicUser(user),
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Exchange email + password for a JWT
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'email and password are required');

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  // Same message for "unknown email" and "wrong password" (no user enumeration)
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated');

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    data: publicUser(user),
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Return the profile of the token owner
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: publicUser(req.user) });
});

/**
 * @route   PUT /api/auth/me
 * @desc    Update own profile (role can never be changed here)
 * @access  Private
 */
const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'bio', 'avatarUrl'];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });
  if (!Object.keys(updates).length) throw new ApiError(400, 'No updatable fields provided');

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    returnDocument: 'after',
    runValidators: true,
  });

  res.status(200).json({ success: true, message: 'Profile updated', data: publicUser(user) });
});

/**
 * @route   PUT /api/auth/password
 * @desc    Change own password (requires the current one)
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'currentPassword and newPassword are required');
  }
  if (String(newPassword).length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save(); // pre-save hook re-hashes

  res.status(200).json({ success: true, message: 'Password updated successfully' });
});

module.exports = { register, login, getMe, updateMe, changePassword };
