/**
 * models/Lesson.js
 * ---------------------------------------------------------------------------
 * Child document of Course. Kept in its own collection (referenced, not
 * embedded) so lessons can be queried, re-ordered and paginated on their own.
 * ---------------------------------------------------------------------------
 */
const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
      maxlength: [120, 'Lesson title must be at most 120 characters'],
    },
    content: {
      type: String,
      required: [true, 'Lesson content is required'],
      maxlength: [5000, 'Lesson content must be at most 5000 characters'],
    },
    order: {
      type: Number,
      required: [true, 'Lesson order is required'],
      min: [1, 'Order starts at 1'],
    },
    durationMinutes: { type: Number, min: [1, 'Duration must be at least 1 minute'], default: 15 },
    videoUrl: { type: String, default: '' },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'A lesson must belong to a course'],
      index: true,
    },
  },
  { timestamps: true }
);

/* One lesson number per course */
lessonSchema.index({ course: 1, order: 1 }, { unique: true });

module.exports = mongoose.models.Lesson || mongoose.model('Lesson', lessonSchema);
