/**
 * routes/enrollmentRoutes.js  ->  mounted at /api/enrollments
 */
const express = require('express');
const {
  createEnrollment,
  getMyEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
} = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // every enrolment route needs an identity

router
  .route('/')
  .post(authorize('student', 'admin'), createEnrollment);

router.get('/me', authorize('student', 'admin'), getMyEnrollments);

router
  .route('/:id')
  .get(getEnrollmentById) // controller decides student / instructor / admin
  .put(updateEnrollment) // field level permissions in controller
  .delete(deleteEnrollment); // student owner or admin

module.exports = router;
