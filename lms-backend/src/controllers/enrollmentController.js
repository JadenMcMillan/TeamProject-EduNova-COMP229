/**
 * controllers/enrollmentController.js
 * ---------------------------------------------------------------------------
 * Enrolment is the write-heavy interaction of the LMS:
 *   student  -> create / read own / update progress / drop
 *   instructor -> read roster of own course / set grade
 *   admin    -> everything
 * ---------------------------------------------------------------------------
 */
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/pagination');

const POPULATE = [
  { path: 'course', select: 'title code category level instructor published' },
  { path: 'student', select: 'name email role' },
];

/**
 * @route   POST /api/enrollments
 * @desc    Enrol the logged-in student in a course
 * @access  Private/Student
 */
const createEnrollment = asyncHandler(async (req, res) => {
  const courseId = req.body.courseId || req.body.course;
  if (!courseId) throw new ApiError(400, 'courseId is required');

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, `No course found with id ${courseId}`);
  if (!course.published) throw new ApiError(400, 'This course is not open for enrolment');

  const existing = await Enrollment.findOne({ student: req.user._id, course: course._id });
  if (existing) throw new ApiError(409, 'You are already enrolled in this course');

  const seats = await Enrollment.countDocuments({
    course: course._id,
    status: { $ne: 'dropped' },
  });
  if (seats >= course.capacity) throw new ApiError(409, 'This course is full');

  const enrollment = await Enrollment.create({ student: req.user._id, course: course._id });
  const populated = await enrollment.populate(POPULATE);

  res.status(201).json({ success: true, message: 'Enrolled successfully', data: populated });
});

/**
 * @route   GET /api/enrollments/me
 * @desc    All enrolments of the logged-in student
 * @access  Private/Student
 */
const getMyEnrollments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { student: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [enrollments, total] = await Promise.all([
    Enrollment.find(filter)
      .populate(POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Enrollment.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: enrollments.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: enrollments,
  });
});

/**
 * @route   GET /api/enrollments/:id
 * @access  Private/Owner student, course instructor, Admin
 */
const getEnrollmentById = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id).populate(POPULATE);
  if (!enrollment) throw new ApiError(404, `No enrolment found with id ${req.params.id}`);

  const isStudent = String(enrollment.student._id) === String(req.user._id);
  const course = await Course.findById(enrollment.course._id);
  const isInstructor = course && String(course.instructor) === String(req.user._id);
  if (!isStudent && !isInstructor && req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: this enrolment does not belong to you');
  }

  res.status(200).json({ success: true, data: enrollment });
});

/**
 * @route   PUT /api/enrollments/:id
 * @desc    Field-level permissions:
 *          student    -> progress, completedLessons, status ('active'|'dropped')
 *          instructor -> grade, status (own course only)
 *          admin      -> any field
 * @access  Private
 */
const updateEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) throw new ApiError(404, `No enrolment found with id ${req.params.id}`);

  const course = await Course.findById(enrollment.course);
  const isStudent = String(enrollment.student) === String(req.user._id);
  const isInstructor = course && String(course.instructor) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';

  if (!isStudent && !isInstructor && !isAdmin) {
    throw new ApiError(403, 'Forbidden: you cannot modify this enrolment');
  }

  const studentFields = ['progress', 'completedLessons', 'status'];
  const instructorFields = ['grade', 'status'];

  if (req.body.progress !== undefined) {
    if (!(isStudent || isAdmin)) {
      throw new ApiError(403, 'Only the student can change their progress');
    }
    enrollment.progress = req.body.progress;
  }

  if (req.body.completedLessons !== undefined) {
    if (!(isStudent || isAdmin)) {
      throw new ApiError(403, 'Only the student can change completed lessons');
    }
    const ids = [].concat(req.body.completedLessons);
    const valid = await Lesson.countDocuments({ _id: { $in: ids }, course: enrollment.course });
    if (valid !== ids.length) {
      throw new ApiError(400, 'completedLessons contains lessons that do not belong to this course');
    }
    enrollment.completedLessons = ids;
  }

  if (req.body.grade !== undefined) {
    if (!(isInstructor || isAdmin)) {
      throw new ApiError(403, 'Only the course instructor can grade an enrolment');
    }
    enrollment.grade = req.body.grade;
    if (req.body.grade !== null && enrollment.status === 'active') enrollment.status = 'completed';
  }

  if (req.body.status !== undefined) {
    const allowedForRole = isAdmin ? ['active', 'completed', 'dropped']
      : isInstructor ? ['active', 'completed', 'dropped']
        : ['active', 'dropped'];
    if (!allowedForRole.includes(req.body.status)) {
      throw new ApiError(403, `A ${req.user.role} cannot set status '${req.body.status}'`);
    }
    enrollment.status = req.body.status;
  }

  // Finishing every lesson means the enrolment is complete
  if (enrollment.progress === 100 && enrollment.status === 'active') {
    enrollment.status = 'completed';
  }

  const touched = studentFields.concat(instructorFields).some((f) => req.body[f] !== undefined);
  if (!touched) throw new ApiError(400, 'No updatable fields provided');

  await enrollment.save();
  await enrollment.populate(POPULATE);

  res.status(200).json({ success: true, message: 'Enrolment updated', data: enrollment });
});

/**
 * @route   DELETE /api/enrollments/:id
 * @desc    Student drops a course (record removed) / admin removes any
 * @access  Private/Owner student, Admin
 */
const deleteEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) throw new ApiError(404, `No enrolment found with id ${req.params.id}`);

  const isStudent = String(enrollment.student) === String(req.user._id);
  if (!isStudent && req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: only the enrolled student or an admin can remove this enrolment');
  }

  await enrollment.deleteOne();
  res.status(200).json({ success: true, message: 'Enrolment removed', data: { _id: enrollment._id } });
});

/**
 * @route   GET /api/courses/:courseId/enrollments
 * @desc    Roster + summary for the instructor dashboard
 * @access  Private/Owner instructor, Admin
 */
const getCourseRoster = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) throw new ApiError(404, `No course found with id ${req.params.courseId}`);

  const isOwner = String(course.instructor) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: you can only view the roster of your own course');
  }

  const enrollments = await Enrollment.find({ course: course._id })
    .populate('student', 'name email')
    .sort({ createdAt: -1 });

  const active = enrollments.filter((e) => e.status !== 'dropped');
  const avgProgress = active.length
    ? Math.round(active.reduce((sum, e) => sum + e.progress, 0) / active.length)
    : 0;
  const avgGrade = active.filter((e) => e.grade !== null).length
    ? Math.round(
        active.filter((e) => e.grade !== null).reduce((s, e) => s + e.grade, 0) /
          active.filter((e) => e.grade !== null).length
      )
    : null;

  res.status(200).json({
    success: true,
    summary: {
      total: enrollments.length,
      active: active.length,
      completed: enrollments.filter((e) => e.status === 'completed').length,
      avgProgress,
      avgGrade,
    },
    data: enrollments,
  });
});

module.exports = {
  createEnrollment,
  getMyEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
  getCourseRoster,
};
