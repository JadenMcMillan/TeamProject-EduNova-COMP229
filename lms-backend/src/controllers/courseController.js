/**
 * controllers/courseController.js
 * ---------------------------------------------------------------------------
 * CRUD for the main LMS object: Course.
 * Ownership rule: an instructor may only modify the courses they own,
 * an admin may modify any course.
 * ---------------------------------------------------------------------------
 */
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/pagination');

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  'title-asc': { title: 1 },
  'title-desc': { title: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
};

/** Loads a course or throws 404. */
const findCourseOr404 = async (id) => {
  const course = await Course.findById(id);
  if (!course) throw new ApiError(404, `No course found with id ${id}`);
  return course;
};

/** Throws 403 unless the caller owns the course or is an admin. */
const assertCourseOwner = (course, user) => {
  const isOwner = course.instructor.toString() === user._id.toString();
  if (!isOwner && user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: you can only manage courses you own');
  }
};

/**
 * @route   GET /api/courses
 * @desc    Browse the catalogue (published courses by default)
 * @access  Public (optional token -> adds `enrolled` flag)
 */
const getCourses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.mine === 'true' && req.user) {
    filter.instructor = req.user._id; // instructor dashboard
  } else if (!(req.user && req.user.role === 'admin' && req.query.includeUnpublished === 'true')) {
    filter.published = true; // public catalogue only shows live courses
  }

  if (req.query.category) filter.category = req.query.category;
  if (req.query.level) filter.level = req.query.level;
  if (req.query.instructor) filter.instructor = req.query.instructor;

  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).trim(), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { code: rx }];
  }

  const sort = SORT_MAP[req.query.sort] || SORT_MAP.newest;

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .populate('instructor', 'name email role')
      .populate('enrollmentCount')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Course.countDocuments(filter),
  ]);

  // Mark which courses the caller is already enrolled in (single aggregate)
  let enrolledIds = new Set();
  if (req.user && req.user.role === 'student' && courses.length) {
    const rows = await Enrollment.find({
      student: req.user._id,
      course: { $in: courses.map((c) => c._id) },
    }).select('course');
    enrolledIds = new Set(rows.map((r) => r.course.toString()));
  }

  const data = courses.map((course) => ({
    ...course.toJSON(),
    enrolled: enrolledIds.has(course._id.toString()),
  }));

  res.status(200).json({
    success: true,
    count: data.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data,
  });
});

/**
 * @route   GET /api/courses/mine
 * @desc    Courses owned by the logged-in instructor
 * @access  Private/Instructor
 */
const getMyCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ instructor: req.user._id })
    .populate('enrollmentCount')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: courses.length, data: courses });
});

/**
 * @route   GET /api/courses/:id
 * @desc    Course detail with lessons + instructor + enrolment count
 * @access  Public (unpublished -> owner/admin only)
 */
const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('instructor', 'name email role bio')
    .populate('enrollmentCount');

  if (!course) throw new ApiError(404, `No course found with id ${req.params.id}`);

  const isOwner = req.user && course.instructor && String(course.instructor._id) === String(req.user._id);
  const isAdmin = req.user && req.user.role === 'admin';
  if (!course.published && !isOwner && !isAdmin) {
    throw new ApiError(404, `No course found with id ${req.params.id}`); // hide drafts
  }

  const lessons = await Lesson.find({ course: course._id }).sort({ order: 1 });

  let enrollment = null;
  if (req.user && req.user.role === 'student') {
    enrollment = await Enrollment.findOne({ student: req.user._id, course: course._id });
  }

  res.status(200).json({
    success: true,
    data: { ...course.toJSON(), lessons, enrollment },
  });
});

/**
 * @route   POST /api/courses
 * @desc    Create a course
 * @access  Private/Instructor, Admin
 */
const createCourse = asyncHandler(async (req, res) => {
  const { title, code, description, category, level, price, capacity, coverImageUrl, published } =
    req.body;

  if (!title || !code || !description) {
    throw new ApiError(400, 'title, code and description are required');
  }

  const normalisedCode = String(code).toUpperCase().trim();
  const duplicate = await Course.findOne({ code: normalisedCode });
  if (duplicate) throw new ApiError(409, `Course code ${normalisedCode} is already in use`);

  // An admin may create a course on behalf of another instructor
  let instructorId = req.user._id;
  if (req.user.role === 'admin' && req.body.instructorId) {
    const instructor = await User.findById(req.body.instructorId);
    if (!instructor) throw new ApiError(404, 'instructorId does not match any user');
    if (instructor.role !== 'instructor') {
      throw new ApiError(400, 'The assigned user must have the instructor role');
    }
    instructorId = instructor._id;
  }

  const course = await Course.create({
    title,
    code: normalisedCode,
    description,
    category,
    level,
    price,
    capacity,
    coverImageUrl,
    published: Boolean(published),
    instructor: instructorId,
  });

  res.status(201).json({ success: true, message: 'Course created', data: course });
});

/**
 * @route   PUT /api/courses/:id
 * @desc    Update a course
 * @access  Private/Owner, Admin
 */
const updateCourse = asyncHandler(async (req, res) => {
  const course = await findCourseOr404(req.params.id);
  assertCourseOwner(course, req.user);

  const fields = ['title', 'description', 'category', 'level', 'price', 'capacity', 'coverImageUrl', 'published'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) course[field] = req.body[field];
  });

  if (req.body.code !== undefined) {
    const newCode = String(req.body.code).toUpperCase().trim();
    if (newCode !== course.code) {
      const duplicate = await Course.findOne({ code: newCode });
      if (duplicate) throw new ApiError(409, `Course code ${newCode} is already in use`);
      course.code = newCode;
    }
  }

  await course.save();
  res.status(200).json({ success: true, message: 'Course updated', data: course });
});

/**
 * @route   DELETE /api/courses/:id
 * @desc    Delete a course + its lessons + its enrolments (cascade)
 * @access  Private/Owner, Admin
 */
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await findCourseOr404(req.params.id);
  assertCourseOwner(course, req.user);

  const [lessons, enrollments] = await Promise.all([
    Lesson.deleteMany({ course: course._id }),
    Enrollment.deleteMany({ course: course._id }),
  ]);
  await course.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Course deleted',
    data: {
      _id: course._id,
      deletedLessons: lessons.deletedCount,
      deletedEnrollments: enrollments.deletedCount,
    },
  });
});

module.exports = {
  getCourses,
  getMyCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  findCourseOr404,
  assertCourseOwner,
};
