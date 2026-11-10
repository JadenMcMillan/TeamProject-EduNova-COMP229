/**
 * models/Enrollment.js
 * ---------------------------------------------------------------------------
 * Join document between a student and a course. It also stores the learning
 * state (progress, grade, status) that the student or the instructor updates.
 * ---------------------------------------------------------------------------
 */
const mongoose = require('mongoose');

const STATUS = ['active', 'completed', 'dropped'];

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: { values: STATUS, message: `Status must be one of: ${STATUS.join(', ')}` },
      default: 'active',
    },
    progress: {
      type: Number,
      min: [0, 'Progress cannot be below 0'],
      max: [100, 'Progress cannot exceed 100'],
      default: 0,
    },
    grade: {
      type: Number,
      min: [0, 'Grade cannot be below 0'],
      max: [100, 'Grade cannot exceed 100'],
      default: null,
    },
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  },
  { timestamps: true }
);

/* A student can only enrol once in the same course */
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

enrollmentSchema.statics.STATUS = STATUS;

module.exports = mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);
