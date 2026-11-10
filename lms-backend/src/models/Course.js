/**
 * models/Course.js
 * ---------------------------------------------------------------------------
 * A Course is the main object a user creates on EduNova (the "LMS object").
 * It is owned by exactly one instructor and contains ordered Lessons.
 * ---------------------------------------------------------------------------
 */
const mongoose = require('mongoose');

const CATEGORIES = ['Web Development', 'Data Science', 'Design', 'Business', 'Mathematics', 'Languages'];

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [120, 'Title must be at most 120 characters'],
    },
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{2,4}-\d{3}$/, 'Course code must look like "CSE-101"'],
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [2000, 'Description must be at most 2000 characters'],
    },
    category: {
      type: String,
      enum: { values: CATEGORIES, message: `Category must be one of: ${CATEGORIES.join(', ')}` },
      default: 'Web Development',
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    price: { type: Number, min: [0, 'Price cannot be negative'], default: 0 },
    capacity: { type: Number, min: [1, 'Capacity must be at least 1'], default: 50 },
    coverImageUrl: { type: String, default: '' },
    published: { type: Boolean, default: false },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A course must have an instructor'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* Free-text search support: GET /api/courses?search=react */
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ category: 1, level: 1 });

/* Virtual populate: course.lessons without storing an array of ids twice */
courseSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'course',
  options: { sort: { order: 1 } },
});

courseSchema.virtual('enrollmentCount', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'course',
  count: true,
});

courseSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);
