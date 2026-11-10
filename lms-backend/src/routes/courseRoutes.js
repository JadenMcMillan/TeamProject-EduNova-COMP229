/**
 * routes/courseRoutes.js  ->  mounted at /api/courses
 */
const express = require('express');
const {
  getCourses,
  getMyCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');
const { getCourseRoster } = require('../controllers/enrollmentController');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');
const lessonRoutes = require('./lessonRoutes');

const router = express.Router();

/* Nested resource: /api/courses/:courseId/lessons */
router.use('/:courseId/lessons', lessonRoutes);

router
  .route('/')
  .get(optionalAuth, getCourses) // public catalogue, richer when authenticated
  .post(protect, authorize('instructor', 'admin'), createCourse);

router.get('/mine', protect, authorize('instructor', 'admin'), getMyCourses);
router.get('/:courseId/enrollments', protect, authorize('instructor', 'admin'), getCourseRoster);

router
  .route('/:id')
  .get(optionalAuth, getCourseById) // public, but unpublished courses are hidden
  .put(protect, authorize('instructor', 'admin'), updateCourse)
  .delete(protect, authorize('instructor', 'admin'), deleteCourse);

module.exports = router;
