/**
 * src/seed/seed.js
 * ---------------------------------------------------------------------------
 * Populates a freshly reset database with demo data so the API (and the
 * screenshots in the design document) have something meaningful to show.
 *
 *   npm run seed
 * ---------------------------------------------------------------------------
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');

const run = async () => {
  await connectDB();

  console.log('[seed] clearing collections...');
  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    Lesson.deleteMany({}),
    Enrollment.deleteMany({}),
  ]);

  const users = await User.create([
    { name: 'Ava Mensah', email: 'admin@edunova.dev', password: 'Password123', role: 'admin', bio: 'Platform administrator' },
    { name: 'Dr. Lena Osei', email: 'lena@edunova.dev', password: 'Password123', role: 'instructor', bio: 'Full-stack engineer, 9 years teaching web development.' },
    { name: 'Prof. Kwame Boateng', email: 'kwame@edunova.dev', password: 'Password123', role: 'instructor', bio: 'Data scientist and former analytics lead.' },
    { name: 'Mia Chen', email: 'mia@student.dev', password: 'Password123', role: 'student', bio: 'Second year CS student.' },
    { name: 'Noah Patel', email: 'noah@student.dev', password: 'Password123', role: 'student', bio: 'Career switcher, learning web dev.' },
  ]);

  const [admin, lena, kwame, mia, noah] = users;

  const courses = await Course.create([
    {
      title: 'Modern Web Development with Node.js',
      code: 'WEB-101',
      description:
        'Build production-ready REST APIs with Node.js, Express and MongoDB. Covers routing, middleware, MVC structure, authentication with JWT, testing and deployment.',
      category: 'Web Development',
      level: 'intermediate',
      price: 149,
      capacity: 40,
      published: true,
      instructor: lena._id,
    },
    {
      title: 'Data Analysis Foundations with Python',
      code: 'DAT-201',
      description:
        'Learn to clean, explore and visualise real datasets with pandas and matplotlib. Ends with a guided capstone project on public education data.',
      category: 'Data Science',
      level: 'beginner',
      price: 99,
      capacity: 60,
      published: true,
      instructor: kwame._id,
    },
    {
      title: 'UI Design Systems in Figma',
      code: 'DES-110',
      description:
        'Design a reusable component library from scratch: colour tokens, typography scales, auto-layout components and a documented handoff for developers.',
      category: 'Design',
      level: 'beginner',
      price: 79,
      capacity: 30,
      published: true,
      instructor: lena._id,
    },
  ]);

  await Lesson.create([
    { course: courses[0]._id, order: 1, title: 'Course roadmap and tooling', content: 'Install Node.js, VS Code and Postman. Repository structure and the MVC mental model.', durationMinutes: 25 },
    { course: courses[0]._id, order: 2, title: 'Express routing and middleware', content: 'Request lifecycle, routers, custom middleware, error handling and 404 fallbacks.', durationMinutes: 40 },
    { course: courses[0]._id, order: 3, title: 'Mongoose models and validation', content: 'Schemas, references, virtuals, indexes and schema-level validation messages.', durationMinutes: 45 },
    { course: courses[0]._id, order: 4, title: 'JWT authentication', content: 'Hashing with bcrypt, signing tokens, protect/authorize middleware and role based access.', durationMinutes: 50 },
    { course: courses[1]._id, order: 1, title: 'Notebooks and pandas basics', content: 'Series, DataFrames, indexing and the split-apply-combine pattern.', durationMinutes: 35 },
    { course: courses[1]._id, order: 2, title: 'Cleaning messy data', content: 'Missing values, type coercion, duplicates and outlier detection.', durationMinutes: 45 },
    { course: courses[2]._id, order: 1, title: 'Tokens and typography', content: 'Building a colour and type scale that survives dark mode.', durationMinutes: 30 },
  ]);

  const lessons = await Lesson.find({ course: courses[0]._id }).sort({ order: 1 });

  await Enrollment.create([
    {
      student: mia._id,
      course: courses[0]._id,
      progress: 50,
      completedLessons: lessons.slice(0, 2).map((l) => l._id),
      status: 'active',
      grade: null,
    },
    { student: noah._id, course: courses[0]._id, progress: 100, status: 'completed', grade: 88 },
    { student: mia._id, course: courses[1]._id, progress: 25, status: 'active' },
  ]);

  console.log('[seed] done:');
  console.log(`  users:       ${await User.countDocuments()}`);
  console.log(`  courses:     ${await Course.countDocuments()}`);
  console.log(`  lessons:     ${await Lesson.countDocuments()}`);
  console.log(`  enrollments: ${await Enrollment.countDocuments()}`);
  console.log('\nDemo accounts (password: Password123)');
  console.log(`  admin      ${admin.email}`);
  console.log(`  instructor ${lena.email}`);
  console.log(`  instructor ${kwame.email}`);
  console.log(`  student    ${mia.email}`);
  console.log(`  student    ${noah.email}`);

  await disconnectDB();
  await mongoose.connection.close().catch(() => {});
};

run().catch(async (err) => {
  console.error('[seed] failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
