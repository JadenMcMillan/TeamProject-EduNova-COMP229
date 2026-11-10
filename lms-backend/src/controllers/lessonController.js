/**
 * controllers/lessonController.js
 * ---------------------------------------------------------------------------
 * Lessons are nested resources:  /api/courses/:courseId/lessons
 * The router uses { mergeParams: true } so :courseId is available here.
 * ---------------------------------------------------------------------------
 */
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertCourseOwner } = require('./courseController');

/** Loads course + enforces ownership for write operations. */
const loadCourseForWrite = async (courseId, user) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, `No course found with id ${courseId}`);
  assertCourseOwner(course, user);
  return course;
};

/**
 * @route   GET /api/courses/:courseId/lessons
 * @desc    List lessons of a course (ordered)
 * @access  Public if the course is published, otherwise owner/admin
 */
const getLessons = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) throw new ApiError(404, `No course found with id ${req.params.courseId}`);

  const isOwner = req.user && String(course.instructor) === String(req.user._id);
  const isAdmin = req.user && req.user.role === 'admin';
  if (!course.published && !isOwner && !isAdmin) {
    throw new ApiError(403, 'This course is not published yet');
  }

  const lessons = await Lesson.find({ course: course._id }).sort({ order: 1 });
  res.status(200).json({ success: true, count: lessons.length, data: lessons });
});

/**
 * @route   GET /api/courses/:courseId/lessons/:id
 * @access  Public if the course is published
 */
const getLessonById = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findOne({ _id: req.params.id, course: req.params.courseId });
  if (!lesson) throw new ApiError(404, `No lesson found with id ${req.params.id} in this course`);
  res.status(200).json({ success: true, data: lesson });
});

/**
 * @route   POST /api/courses/:courseId/lessons
 * @desc    Add a lesson; `order` is auto-assigned to the end when omitted
 * @access  Private/Owner, Admin
 */
const createLesson = asyncHandler(async (req, res) => {
  const course = await loadCourseForWrite(req.params.courseId, req.user);
  const { title, content, order, durationMinutes, videoUrl } = req.body;

  if (!title || !content) throw new ApiError(400, 'title and content are required');

  let nextOrder = order;
  if (nextOrder === undefined) {
    const last = await Lesson.findOne({ course: course._id }).sort({ order: -1 });
    nextOrder = last ? last.order + 1 : 1;
  }

  const clash = await Lesson.findOne({ course: course._id, order: nextOrder });
  if (clash) {
    throw new ApiError(409, `Lesson order ${nextOrder} already exists in this course`);
  }

  const lesson = await Lesson.create({
    title,
    content,
    order: nextOrder,
    durationMinutes,
    videoUrl,
    course: course._id,
  });

  res.status(201).json({ success: true, message: 'Lesson created', data: lesson });
});

/**
 * @route   PUT /api/courses/:courseId/lessons/:id
 * @access  Private/Owner, Admin
 */
const updateLesson = asyncHandler(async (req, res) => {
  await loadCourseForWrite(req.params.courseId, req.user);

  const lesson = await Lesson.findOne({ _id: req.params.id, course: req.params.courseId });
  if (!lesson) throw new ApiError(404, `No lesson found with id ${req.params.id} in this course`);

  if (req.body.order !== undefined && req.body.order !== lesson.order) {
    const clash = await Lesson.findOne({
      course: lesson.course,
      order: req.body.order,
      _id: { $ne: lesson._id },
    });
    if (clash) throw new ApiError(409, `Lesson order ${req.body.order} already exists in this course`);
    lesson.order = req.body.order;
  }

  ['title', 'content', 'durationMinutes', 'videoUrl'].forEach((field) => {
    if (req.body[field] !== undefined) lesson[field] = req.body[field];
  });

  await lesson.save();
  res.status(200).json({ success: true, message: 'Lesson updated', data: lesson });
});

/**
 * @route   DELETE /api/courses/:courseId/lessons/:id
 * @access  Private/Owner, Admin
 */
const deleteLesson = asyncHandler(async (req, res) => {
  await loadCourseForWrite(req.params.courseId, req.user);

  const lesson = await Lesson.findOneAndDelete({
    _id: req.params.id,
    course: req.params.courseId,
  });
  if (!lesson) throw new ApiError(404, `No lesson found with id ${req.params.id} in this course`);

  res.status(200).json({ success: true, message: 'Lesson deleted', data: { _id: lesson._id } });
});

module.exports = { getLessons, getLessonById, createLesson, updateLesson, deleteLesson };
