/**
 * models/User.js
 * ---------------------------------------------------------------------------
 * Users are the root aggregate of the LMS. Every other document points back
 * to a user (Course.instructor, Enrollment.student).
 *
 * Roles:
 *   student    - can browse courses, enrol, track progress
 *   instructor - can own courses/lessons and grade their own students
 *   admin      - can manage every resource
 * ---------------------------------------------------------------------------
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['student', 'instructor', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name must be at most 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned by a normal query
    },
    role: {
      type: String,
      enum: { values: ROLES, message: 'Role must be student, instructor or admin' },
      default: 'student',
    },
    bio: {
      type: String,
      maxlength: [300, 'Bio must be at most 300 characters'],
      default: '',
    },
    avatarUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password; // defence in depth
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

/* ----------------------------- hooks ------------------------------------ */
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/* ----------------------------- methods ---------------------------------- */
userSchema.methods.matchPassword = function matchPassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

/* ----------------------------- statics ---------------------------------- */
userSchema.statics.ROLES = ROLES;

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
