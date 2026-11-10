/**
 * tests/api.test.js
 * ---------------------------------------------------------------------------
 * End-to-end API tests (Mocha + Chai + Supertest) against a dedicated MongoDB
 * database: edunova_lms_test.
 *
 * Every request goes through the real Express stack - routing, middleware,
 * JWT verification, Mongoose validation - so a passing run is genuine proof
 * that the first release works.
 *
 *   npm test
 * ---------------------------------------------------------------------------
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';
process.env.JWT_EXPIRES_IN = '1h';

const request = require('supertest');
const mongoose = require('mongoose');
const { expect } = require('chai');
const app = require('../src/app');

const TEST_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/edunova_lms_test';

/** Shared state between blocks (created in journey order). */
const ctx = {};

before(async () => {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.db.dropDatabase();
});

after(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

/* =========================================================================
   0. Service availability
   ========================================================================= */
describe('0. Service health', () => {
  it('GET /api/health -> 200 with status UP', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.success).to.equal(true);
    expect(res.body.status).to.equal('UP');
  });

  it('GET /api -> 200 and documents the endpoint map', async () => {
    const res = await request(app).get('/api').expect(200);
    expect(res.body.endpoints.courses.length).to.be.greaterThan(0);
  });

  it('GET /api/unknown-route -> 404 JSON envelope', async () => {
    const res = await request(app).get('/api/unknown-route').expect(404);
    expect(res.body.success).to.equal(false);
    expect(res.body.message).to.match(/Route not found/);
  });
});

/* =========================================================================
   1. Authentication
   ========================================================================= */
describe('1. Authentication - POST /api/auth/register', () => {
  it('creates a student account and returns a JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Mia Chen', email: 'mia@test.dev', password: 'Password123', bio: 'CS student' })
      .expect(201);

    expect(res.body.token).to.be.a('string');
    expect(res.body.data.role).to.equal('student');
    expect(res.body.data.password).to.be.undefined;
    ctx.student = { token: res.body.token, id: res.body.data._id };
  });

  it('creates an instructor account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Lena Osei', email: 'lena@test.dev', password: 'Password123', role: 'instructor' })
      .expect(201);
    expect(res.body.data.role).to.equal('instructor');
    ctx.instructor = { token: res.body.token, id: res.body.data._id };
  });

  it('creates a second instructor (to prove ownership rules)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Kwame Boateng', email: 'kwame@test.dev', password: 'Password123', role: 'instructor' })
      .expect(201);
    ctx.otherInstructor = { token: res.body.token, id: res.body.data._id };
  });

  it('downgrades a self-declared admin role to student (privilege escalation guard)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sneaky User', email: 'sneaky@test.dev', password: 'Password123', role: 'admin' })
      .expect(201);
    expect(res.body.data.role).to.equal('student');
  });

  it('rejects a duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Mia Again', email: 'mia@test.dev', password: 'Password123' })
      .expect(409);
    expect(res.body.message).to.match(/already exists/i);
  });

  it('rejects a short password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Short Pass', email: 'short@test.dev', password: '123' })
      .expect(400);
    expect(res.body.success).to.equal(false);
  });

  it('rejects an invalid email format with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad Email', email: 'not-an-email', password: 'Password123' })
      .expect(400);
    expect(res.body.errors.some((e) => e.field === 'email')).to.equal(true);
  });
});

describe('2. Authentication - login and session', () => {
  it('POST /api/auth/login -> 200 for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mia@test.dev', password: 'Password123' })
      .expect(200);
    expect(res.body.token).to.be.a('string');
    ctx.student.token = res.body.token;
  });

  it('POST /api/auth/login -> 401 for a wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mia@test.dev', password: 'WrongPassword1' })
      .expect(401);
    expect(res.body.message).to.match(/Invalid email or password/);
  });

  it('GET /api/auth/me -> 200 with the token owner', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${ctx.student.token}`)
      .expect(200);
    expect(res.body.data.email).to.equal('mia@test.dev');
  });

  it('GET /api/auth/me -> 401 without a token', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  it('GET /api/auth/me -> 401 with a tampered token', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.not.a.real.token')
      .expect(401);
  });

  it('PUT /api/auth/me -> 200 updates name and bio', async () => {
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${ctx.student.token}`)
      .send({ name: 'Mia C.', bio: 'Learning full-stack development' })
      .expect(200);
    expect(res.body.data.name).to.equal('Mia C.');
    expect(res.body.data.bio).to.equal('Learning full-stack development');
  });

  it('PUT /api/auth/password -> 401 when the current password is wrong', async () => {
    await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${ctx.student.token}`)
      .send({ currentPassword: 'nope1234', newPassword: 'NewPassword123' })
      .expect(401);
  });

  it('PUT /api/auth/password -> 200 and the new password works', async () => {
    await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${ctx.student.token}`)
      .send({ currentPassword: 'Password123', newPassword: 'NewPassword123' })
      .expect(200);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mia@test.dev', password: 'NewPassword123' })
      .expect(200);
    expect(res.body.success).to.equal(true);
  });
});

/* =========================================================================
   3. Course CRUD + authorization
   ========================================================================= */
describe('3. Courses - CRUD and ownership', () => {
  it('POST /api/courses -> 201 for an instructor', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .send({
        title: 'Modern Web Development with Node.js',
        code: ' web-101 ',
        description:
          'Build production-ready REST APIs with Node.js, Express and MongoDB, including JWT authentication and automated tests.',
        category: 'Web Development',
        level: 'intermediate',
        price: 149,
        capacity: 2,
        published: true,
      })
      .expect(201);

    expect(res.body.data.code).to.equal('WEB-101');
    ctx.course = { id: res.body.data._id };
  });

  it('POST /api/courses -> 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .send({ title: 'Incomplete course' })
      .expect(400);

    expect(res.body.message).to.match(/title, code and description are required/);
  });

  it('POST /api/courses -> 403 for a student (authorization test)', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${ctx.student.token}`)
      .send({ title: 'Not allowed at all', code: 'BAD-001', description: 'x'.repeat(30) })
      .expect(403);
    expect(res.body.message).to.match(/Forbidden/);
  });

  it('POST /api/courses -> 400 when the category is not in the enum', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .send({
        title: 'Underwater Basket Weaving',
        code: 'UWB-100',
        description: 'A course with an invalid category value used to prove schema validation.',
        category: 'Nonsense',
      })
      .expect(400);
    expect(res.body.errors.some((e) => e.field === 'category')).to.equal(true);
  });

  it('POST /api/courses -> 409 for a duplicated course code', async () => {
    await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .send({
        title: 'Duplicate Code Course',
        code: 'WEB-101',
        description: 'This one reuses the code WEB-101 and must be rejected by the API.',
      })
      .expect(409);
  });

  it('GET /api/courses -> 200 with the published course in the catalogue', async () => {
    const res = await request(app).get('/api/courses').expect(200);
    expect(res.body.pagination.total).to.equal(1);
    expect(res.body.data[0].instructor.name).to.equal('Lena Osei');
    expect(res.body.data[0].enrollmentCount).to.equal(0);
  });

  it('GET /api/courses?search=node -> 200 (text filtering works)', async () => {
    const res = await request(app).get('/api/courses?search=node').expect(200);
    expect(res.body.count).to.equal(1);
  });

  it('GET /api/courses?category=Design -> 200 empty result', async () => {
    const res = await request(app).get('/api/courses?category=Design').expect(200);
    expect(res.body.count).to.equal(0);
  });

  it('GET /api/courses/:id -> 200 with populated instructor', async () => {
    const res = await request(app).get(`/api/courses/${ctx.course.id}`).expect(200);
    expect(res.body.data.title).to.match(/Modern Web Development/);
    expect(res.body.data.lessons).to.deep.equal([]);
  });

  it('GET /api/courses/:id -> 400 for a malformed id', async () => {
    await request(app).get('/api/courses/12345').expect(400);
  });

  it('PUT /api/courses/:id -> 403 when another instructor edits the course', async () => {
    await request(app)
      .put(`/api/courses/${ctx.course.id}`)
      .set('Authorization', `Bearer ${ctx.otherInstructor.token}`)
      .send({ price: 10 })
      .expect(403);
  });

  it('PUT /api/courses/:id -> 200 when the owner edits it', async () => {
    const res = await request(app)
      .put(`/api/courses/${ctx.course.id}`)
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .send({ price: 129, level: 'advanced' })
      .expect(200);
    expect(res.body.data.price).to.equal(129);
    expect(res.body.data.level).to.equal('advanced');
  });

  it('GET /api/courses/mine -> 200 lists only the caller courses', async () => {
    const res = await request(app)
      .get('/api/courses/mine')
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .expect(200);
    expect(res.body.count).to.equal(1);
    expect(res.body.data[0]._id).to.equal(ctx.course.id);
  });

  it('unpublished courses are hidden from the public but visible to the owner', async () => {
    const draft = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .send({
        title: 'Draft Course About Testing',
        code: 'TST-999',
        description: 'A course that is still unpublished, used to test visibility rules.',
        published: false,
      })
      .expect(201);

    await request(app).get(`/api/courses/${draft.body.data._id}`).expect(404);
    await request(app)
      .get(`/api/courses/${draft.body.data._id}`)
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .expect(200);

    await request(app)
      .delete(`/api/courses/${draft.body.data._id}`)
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .expect(200);
  });
});

/* =========================================================================
   4. Lessons CRUD
   ========================================================================= */
describe('4. Lessons - nested CRUD', () => {
  it('POST lesson -> 201 with an auto-assigned order', async () => {
    const titles = ['Course roadmap and tooling', 'Express routing and middleware'];
    for (let index = 0; index < titles.length; index += 1) {
      const res = await request(app)
        .post(`/api/courses/${ctx.course.id}/lessons`)
        .set('Authorization', `Bearer ${ctx.instructor.token}`)
        .send({
          title: titles[index],
          content: 'Lesson body: request lifecycle, routers, middleware and Mongoose models.',
          durationMinutes: 30,
        })
        .expect(201);
      expect(res.body.data.order).to.equal(index + 1);
      if (index === 0) ctx.lesson = { id: res.body.data._id };
    }
  });

  it('POST lesson -> 403 when another instructor tries to add one', async () => {
    await request(app)
      .post(`/api/courses/${ctx.course.id}/lessons`)
      .set('Authorization', `Bearer ${ctx.otherInstructor.token}`)
      .send({ title: 'Intruder lesson', content: 'Should never be created.' })
      .expect(403);
  });

  it('GET lessons -> 200 ordered list', async () => {
    const res = await request(app).get(`/api/courses/${ctx.course.id}/lessons`).expect(200);
    expect(res.body.count).to.equal(2);
    expect(res.body.data[0].order).to.equal(1);
  });

  it('PUT lesson -> 200 updates title and duration', async () => {
    const res = await request(app)
      .put(`/api/courses/${ctx.course.id}/lessons/${ctx.lesson.id}`)
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .send({ title: 'Course roadmap, tooling and setup', durationMinutes: 35 })
      .expect(200);
    expect(res.body.data.durationMinutes).to.equal(35);
  });

  it('GET lesson by id -> 200, and 404 under the wrong course', async () => {
    await request(app).get(`/api/courses/${ctx.course.id}/lessons/${ctx.lesson.id}`).expect(200);
    await request(app)
      .get(`/api/courses/${new mongoose.Types.ObjectId()}/lessons/${ctx.lesson.id}`)
      .expect(404);
  });

  it('course detail now embeds its lessons', async () => {
    const res = await request(app).get(`/api/courses/${ctx.course.id}`).expect(200);
    expect(res.body.data.lessons.length).to.equal(2);
  });
});

/* =========================================================================
   5. Enrolment workflow
   ========================================================================= */
describe('5. Enrolments - student journey and grading', () => {
  it('POST /api/enrollments -> 201 for a student', async () => {
    const res = await request(app)
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${ctx.student.token}`)
      .send({ courseId: ctx.course.id })
      .expect(201);
    expect(res.body.data.progress).to.equal(0);
    expect(res.body.data.course.code).to.equal('WEB-101');
    ctx.enrollment = { id: res.body.data._id };
  });

  it('POST /api/enrollments -> 409 on a second enrolment in the same course', async () => {
    await request(app)
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${ctx.student.token}`)
      .send({ courseId: ctx.course.id })
      .expect(409);
  });

  it('POST /api/enrollments -> 403 for an instructor (students only)', async () => {
    await request(app)
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .send({ courseId: ctx.course.id })
      .expect(403);
  });

  it('GET /api/enrollments/me -> 200 lists the enrolment', async () => {
    const res = await request(app)
      .get('/api/enrollments/me')
      .set('Authorization', `Bearer ${ctx.student.token}`)
      .expect(200);
    expect(res.body.count).to.equal(1);
    expect(res.body.data[0].status).to.equal('active');
  });

  it('PUT /api/enrollments/:id -> 200 progress 100 auto-completes the enrolment', async () => {
    const res = await request(app)
      .put(`/api/enrollments/${ctx.enrollment.id}`)
      .set('Authorization', `Bearer ${ctx.student.token}`)
      .send({ progress: 100, completedLessons: [ctx.lesson.id] })
      .expect(200);
    expect(res.body.data.progress).to.equal(100);
    expect(res.body.data.status).to.equal('completed');
    expect(res.body.data.completedLessons.length).to.equal(1);
  });

  it('PUT /api/enrollments/:id -> 403 student tries to grade themselves', async () => {
    const res = await request(app)
      .put(`/api/enrollments/${ctx.enrollment.id}`)
      .set('Authorization', `Bearer ${ctx.student.token}`)
      .send({ grade: 100 })
      .expect(403);
    expect(res.body.message).to.match(/instructor can grade/i);
  });

  it('PUT /api/enrollments/:id -> 400 for a lesson outside the course', async () => {
    await request(app)
      .put(`/api/enrollments/${ctx.enrollment.id}`)
      .set('Authorization', `Bearer ${ctx.student.token}`)
      .send({ completedLessons: [new mongoose.Types.ObjectId()] })
      .expect(400);
  });

  it('GET /api/courses/:courseId/enrollments -> 200 roster with summary', async () => {
    const res = await request(app)
      .get(`/api/courses/${ctx.course.id}/enrollments`)
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .expect(200);
    expect(res.body.summary.total).to.equal(1);
    expect(res.body.summary.completed).to.equal(1);
    expect(res.body.data[0].student.email).to.equal('mia@test.dev');
  });

  it('GET roster -> 403 for another instructor', async () => {
    await request(app)
      .get(`/api/courses/${ctx.course.id}/enrollments`)
      .set('Authorization', `Bearer ${ctx.otherInstructor.token}`)
      .expect(403);
  });

  it('PUT /api/enrollments/:id -> 200 instructor sets the grade', async () => {
    const res = await request(app)
      .put(`/api/enrollments/${ctx.enrollment.id}`)
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .send({ grade: 92 })
      .expect(200);
    expect(res.body.data.grade).to.equal(92);
  });

  it('GET /api/enrollments/:id -> 403 for an unrelated user', async () => {
    await request(app)
      .get(`/api/enrollments/${ctx.enrollment.id}`)
      .set('Authorization', `Bearer ${ctx.otherInstructor.token}`)
      .expect(403);
  });

  it('course capacity is enforced (409 when full)', async () => {
    const second = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Noah Patel', email: 'noah@test.dev', password: 'Password123' })
      .expect(201);

    await request(app)
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${second.body.token}`)
      .send({ courseId: ctx.course.id })
      .expect(201);

    const third = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Late Comer', email: 'late@test.dev', password: 'Password123' })
      .expect(201);

    await request(app)
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${third.body.token}`)
      .send({ courseId: ctx.course.id })
      .expect(409);
  });

  it('DELETE /api/enrollments/:id -> 200 student drops the course', async () => {
    await request(app)
      .delete(`/api/enrollments/${ctx.enrollment.id}`)
      .set('Authorization', `Bearer ${ctx.student.token}`)
      .expect(200);

    await request(app)
      .get(`/api/enrollments/${ctx.enrollment.id}`)
      .set('Authorization', `Bearer ${ctx.student.token}`)
      .expect(404);
  });
});

/* =========================================================================
   6. Admin user CRUD
   ========================================================================= */
describe('6. Users - admin CRUD', () => {
  before(async () => {
    // Promote one account directly through the model (no public API can create admins)
    const User = require('../src/models/User');
    await User.updateOne({ email: 'kwame@test.dev' }, { role: 'admin' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'kwame@test.dev', password: 'Password123' });
    ctx.admin = { token: login.body.token, id: login.body.data._id };
  });

  it('GET /api/users -> 403 for a non-admin', async () => {
    await request(app).get('/api/users').set('Authorization', `Bearer ${ctx.student.token}`).expect(403);
  });

  it('GET /api/users -> 200 paginated list for an admin', async () => {
    const res = await request(app)
      .get('/api/users?limit=5&page=1')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .expect(200);
    expect(res.body.pagination.limit).to.equal(5);
    expect(res.body.data.length).to.be.greaterThan(0);
    expect(res.body.data[0].password).to.be.undefined;
  });

  it('POST /api/users -> 201 admin creates an instructor', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ name: 'Temp Instructor', email: 'temp@test.dev', password: 'Password123', role: 'instructor' })
      .expect(201);
    expect(res.body.data.role).to.equal('instructor');
    ctx.tempUser = { id: res.body.data._id };
  });

  it('POST /api/courses -> 201 admin creates a course for an instructor', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({
        title: 'Admin Assigned Instructor Course',
        code: 'ADM-101',
        description: 'An administrator assigns this course to a specific instructor account.',
        instructorId: ctx.tempUser.id,
      })
      .expect(201);

    expect(res.body.data.instructor).to.equal(ctx.tempUser.id);
    await request(app)
      .delete(`/api/courses/${res.body.data._id}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .expect(200);
  });

  it('POST /api/courses -> 404 admin supplies an unknown instructor id', async () => {
    await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({
        title: 'Course With Unknown Instructor',
        code: 'ADM-102',
        description: 'This course references an instructor that does not exist.',
        instructorId: '000000000000000000000000',
      })
      .expect(404);
  });

  it('POST /api/courses -> 400 admin assigns a user who is not an instructor', async () => {
    await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({
        title: 'Course With Student Instructor',
        code: 'ADM-103',
        description: 'This course must not be assigned to an account with the student role.',
        instructorId: ctx.student.id,
      })
      .expect(400);
  });

  it('GET /api/users/:id -> 200', async () => {
    const res = await request(app)
      .get(`/api/users/${ctx.tempUser.id}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .expect(200);
    expect(res.body.data.email).to.equal('temp@test.dev');
  });

  it('PUT /api/users/:id -> 200 admin renames and deactivates the user', async () => {
    const res = await request(app)
      .put(`/api/users/${ctx.tempUser.id}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ name: 'Temp Instructor Renamed', isActive: false })
      .expect(200);
    expect(res.body.data.isActive).to.equal(false);
  });

  it('PUT /api/users/:id -> 409 when the email collides', async () => {
    await request(app)
      .put(`/api/users/${ctx.tempUser.id}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ email: 'mia@test.dev' })
      .expect(409);
  });

  it('DELETE /api/users/:id -> 409 when the instructor still owns a course', async () => {
    await request(app)
      .delete(`/api/users/${ctx.instructor.id}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .expect(409);
  });

  it('DELETE /api/users/:id -> 200 for a user without courses', async () => {
    await request(app)
      .delete(`/api/users/${ctx.tempUser.id}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .expect(200);

    await request(app)
      .get(`/api/users/${ctx.tempUser.id}`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .expect(404);
  });
});

/* =========================================================================
   7. Cascade delete of the main object
   ========================================================================= */
describe('7. Course deletion cascades to lessons and enrolments', () => {
  it('DELETE /api/courses/:id -> 200 and cleans child documents', async () => {
    const res = await request(app)
      .delete(`/api/courses/${ctx.course.id}`)
      .set('Authorization', `Bearer ${ctx.instructor.token}`)
      .expect(200);
    expect(res.body.data.deletedLessons).to.equal(2);
    expect(res.body.data.deletedEnrollments).to.be.at.least(1);

    await request(app).get(`/api/courses/${ctx.course.id}`).expect(404);
    const lessons = await request(app).get(`/api/courses/${ctx.course.id}/lessons`).expect(404);
    expect(lessons.body.success).to.equal(false);
  });
});
