/**
 * app.js
 * ---------------------------------------------------------------------------
 * Express application (no listen() here, so tests can import it directly).
 * Layer order matters:
 *   security -> parsing -> logging -> routes -> 404 -> error handler
 * ---------------------------------------------------------------------------
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

/* ----------------------------- middleware -------------------------------- */
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

/* --------------------------- documentation ------------------------------- */
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    application: 'EduNova LMS API',
    version: '1.0.0',
    release: 'Part B - First Release',
    docs: '/api',
    health: '/api/health',
  });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    uptimeSeconds: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

/* Service map: a self-documenting index of the API (handy for the design doc) */
app.get('/api', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'EduNova LMS REST API v1',
    endpoints: {
      auth: [
        'POST   /api/auth/register',
        'POST   /api/auth/login',
        'GET    /api/auth/me',
        'PUT    /api/auth/me',
        'PUT    /api/auth/password',
      ],
      users: [
        'GET    /api/users',
        'POST   /api/users',
        'GET    /api/users/:id',
        'PUT    /api/users/:id',
        'DELETE /api/users/:id',
      ],
      courses: [
        'GET    /api/courses',
        'GET    /api/courses/mine',
        'POST   /api/courses',
        'GET    /api/courses/:id',
        'PUT    /api/courses/:id',
        'DELETE /api/courses/:id',
      ],
      lessons: [
        'GET    /api/courses/:courseId/lessons',
        'POST   /api/courses/:courseId/lessons',
        'GET    /api/courses/:courseId/lessons/:id',
        'PUT    /api/courses/:courseId/lessons/:id',
        'DELETE /api/courses/:courseId/lessons/:id',
      ],
      enrollments: [
        'POST   /api/enrollments',
        'GET    /api/enrollments/me',
        'GET    /api/enrollments/:id',
        'PUT    /api/enrollments/:id',
        'DELETE /api/enrollments/:id',
        'GET    /api/courses/:courseId/enrollments',
      ],
    },
  });
});

/* ------------------------------- routes ---------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);

/* Optional: serve a static front-end build later (kept for Part C) */
app.use('/static', express.static(path.join(__dirname, '..', 'public')));

/* ------------------------------ fallbacks -------------------------------- */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
