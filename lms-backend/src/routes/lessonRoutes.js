/**
 * routes/lessonRoutes.js  ->  mounted at /api/courses/:courseId/lessons
 * mergeParams lets the controller read :courseId from the parent router.
 */
const express = require('express');
const {
  getLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
} = require('../controllers/lessonController');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(optionalAuth, getLessons)
  .post(protect, authorize('instructor', 'admin'), createLesson);

router
  .route('/:id')
  .get(optionalAuth, getLessonById)
  .put(protect, authorize('instructor', 'admin'), updateLesson)
  .delete(protect, authorize('instructor', 'admin'), deleteLesson);

module.exports = router;
