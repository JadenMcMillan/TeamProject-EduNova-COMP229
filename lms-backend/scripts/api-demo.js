/**
 * scripts/api-demo.js
 * ---------------------------------------------------------------------------
 * Runs a full, human-readable API journey against the RUNNING server and
 * records every request/response pair to docs/assets/api-demo.json.
 *
 * The JSON is later rendered into the "API testing" screenshots that are
 * embedded in the External Design Document, so it needs no manual Postman
 * clicking - one command reproduces the whole demonstration.
 *
 *   npm start          (terminal 1)
 *   npm run demo       (terminal 2)
 * ---------------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const OUT_DIR = path.join(__dirname, '..', '..', 'docs', 'assets');
const steps = [];

const line = (char = '-') => char.repeat(78);

/** Low level call recorder. */
async function call({ title, method, urlPath, token, body, expectStatus }) {
  const startedAt = process.hrtime.bigint();
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const raw = await res.text();
  const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    json = { raw };
  }

  const record = {
    title,
    method,
    path: urlPath,
    status: res.status,
    statusText: res.statusText,
    passed: expectStatus ? [].concat(expectStatus).includes(res.status) : res.ok,
    expected: expectStatus,
    durationMs: Math.round(ms),
    requestBody: body || null,
    responseBody: json,
  };
  steps.push(record);

  const mark = record.passed ? 'PASS' : 'FAIL';
  console.log(`${String(steps.length).padStart(2, '0')}. [${mark}] ${method} ${urlPath} -> ${res.status} ${res.statusText} (${record.durationMs} ms)`);
  return json;
}

const PASSWORD = 'Password123';

async function ensureUser(name, email, role) {
  const register = await call({
    title: `Register ${role} (${email})`,
    method: 'POST',
    urlPath: '/api/auth/register',
    body: { name, email, password: PASSWORD, role },
    expectStatus: [201, 409], // 409 = account already exists, we log in instead
  });
  if (register.token) return register.token;

  const login = await call({
    title: `Login as ${role} (${email})`,
    method: 'POST',
    urlPath: '/api/auth/login',
    body: { email, password: PASSWORD },
    expectStatus: 200,
  });
  return login.token;
}

(async () => {
  console.log(line('='));
  console.log('EduNova LMS - First Release API demonstration');
  console.log(`Target : ${BASE_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(line('='));

  /* ---------------------------- 1. Health ------------------------------- */
  await call({ title: 'Service health check', method: 'GET', urlPath: '/api/health', expectStatus: 200 });

  /* ------------------------ 2. Authentication --------------------------- */
  const studentToken = await ensureUser('Amara Diallo', 'amara@demo.dev', 'student');
  const instructorToken = await (async () => {
    const res = await call({
      title: 'Login as instructor',
      method: 'POST',
      urlPath: '/api/auth/login',
      body: { email: 'lena@edunova.dev', password: PASSWORD },
      expectStatus: 200,
    });
    return res.token;
  })();

  await call({
    title: 'Read my profile with the JWT',
    method: 'GET',
    urlPath: '/api/auth/me',
    token: studentToken,
    expectStatus: 200,
  });

  await call({
    title: 'Protected route without a token (must fail)',
    method: 'GET',
    urlPath: '/api/auth/me',
    expectStatus: 401,
  });

  /* ------------------------- 3. Course CRUD ----------------------------- */
  // Remove leftovers from a previous demo run so the script is repeatable
  const mine = await call({
    title: 'List my courses (instructor dashboard)',
    method: 'GET',
    urlPath: '/api/courses/mine',
    token: instructorToken,
    expectStatus: 200,
  });
  for (const course of mine.data.filter((c) => c.code === 'API-300')) {
    await call({
      title: 'Clean up previous demo course',
      method: 'DELETE',
      urlPath: `/api/courses/${course._id}`,
      token: instructorToken,
      expectStatus: 200,
    });
  }

  const created = await call({
    title: 'Create a course (CREATE)',
    method: 'POST',
    urlPath: '/api/courses',
    token: instructorToken,
    body: {
      title: 'REST API Testing with Postman and Jest',
      code: 'API-300',
      description:
        'Design a test plan for a REST API, automate it with Postman collections and verify authentication, authorisation and validation rules before every release.',
      category: 'Web Development',
      level: 'advanced',
      price: 119,
      capacity: 25,
      published: true,
    },
    expectStatus: 201,
  });
  const courseId = created.data._id;

  await call({
    title: 'Add lesson 1 (nested CREATE)',
    method: 'POST',
    urlPath: `/api/courses/${courseId}/lessons`,
    token: instructorToken,
    body: {
      title: 'Anatomy of an HTTP request',
      content: 'Methods, status codes, headers, bodies and how Postman models each of them.',
      durationMinutes: 20,
    },
    expectStatus: 201,
  });

  const lesson2 = await call({
    title: 'Add lesson 2 (nested CREATE)',
    method: 'POST',
    urlPath: `/api/courses/${courseId}/lessons`,
    token: instructorToken,
    body: {
      title: 'Writing assertions for auth flows',
      content: 'Chaining requests in a collection, extracting tokens and asserting 401/403 paths.',
      durationMinutes: 35,
    },
    expectStatus: 201,
  });

  await call({
    title: 'Browse the catalogue (READ, public)',
    method: 'GET',
    urlPath: '/api/courses?category=Web%20Development&sort=newest',
    expectStatus: 200,
  });

  await call({
    title: 'Read one course with lessons (READ)',
    method: 'GET',
    urlPath: `/api/courses/${courseId}`,
    expectStatus: 200,
  });

  await call({
    title: 'Update price and level (UPDATE)',
    method: 'PUT',
    urlPath: `/api/courses/${courseId}`,
    token: instructorToken,
    body: { price: 109, level: 'advanced' },
    expectStatus: 200,
  });

  await call({
    title: 'Validation: invalid category (must fail)',
    method: 'POST',
    urlPath: '/api/courses',
    token: instructorToken,
    body: {
      title: 'Course with a broken category',
      code: 'BAD-404',
      description: 'This payload is intentionally invalid to demonstrate schema validation.',
      category: 'Underwater',
    },
    expectStatus: 400,
  });

  await call({
    title: 'Authorisation: student creates a course (must fail)',
    method: 'POST',
    urlPath: '/api/courses',
    token: studentToken,
    body: {
      title: 'Student is not allowed to publish',
      code: 'STU-100',
      description: 'Attempting to create a course with a student token should return 403.',
    },
    expectStatus: 403,
  });

  /* ------------------------- 4. Enrolment flow -------------------------- */
  const enrollment = await call({
    title: 'Enrol in the course (CREATE)',
    method: 'POST',
    urlPath: '/api/enrollments',
    token: studentToken,
    body: { courseId },
    expectStatus: 201,
  });
  const enrollmentId = enrollment.data._id;

  await call({
    title: 'Duplicate enrolment (must fail)',
    method: 'POST',
    urlPath: '/api/enrollments',
    token: studentToken,
    body: { courseId },
    expectStatus: 409,
  });

  await call({
    title: 'Update progress (UPDATE)',
    method: 'PUT',
    urlPath: `/api/enrollments/${enrollmentId}`,
    token: studentToken,
    body: { progress: 50, completedLessons: [lesson2.data._id] },
    expectStatus: 200,
  });

  await call({
    title: 'Student tries to grade himself (must fail)',
    method: 'PUT',
    urlPath: `/api/enrollments/${enrollmentId}`,
    token: studentToken,
    body: { grade: 100 },
    expectStatus: 403,
  });

  await call({
    title: 'Instructor grades the enrolment (UPDATE)',
    method: 'PUT',
    urlPath: `/api/enrollments/${enrollmentId}`,
    token: instructorToken,
    body: { grade: 91 },
    expectStatus: 200,
  });

  await call({
    title: 'My learning list (READ)',
    method: 'GET',
    urlPath: '/api/enrollments/me',
    token: studentToken,
    expectStatus: 200,
  });

  await call({
    title: 'Instructor course roster (READ)',
    method: 'GET',
    urlPath: `/api/courses/${courseId}/enrollments`,
    token: instructorToken,
    expectStatus: 200,
  });

  /* --------------------------- 5. Clean up ------------------------------ */
  await call({
    title: 'Delete lesson 2 (DELETE, nested)',
    method: 'DELETE',
    urlPath: `/api/courses/${courseId}/lessons/${lesson2.data._id}`,
    token: instructorToken,
    expectStatus: 200,
  });

  await call({
    title: 'Drop the enrolment (DELETE)',
    method: 'DELETE',
    urlPath: `/api/enrollments/${enrollmentId}`,
    token: studentToken,
    expectStatus: 200,
  });

  await call({
    title: 'Missing resource (must fail)',
    method: 'GET',
    urlPath: '/api/courses/64b7f9f2f1f1f1f1f1f1f1f1',
    expectStatus: 404,
  });

  /* ---------------------------- 6. Summary ------------------------------ */
  const passed = steps.filter((s) => s.passed).length;
  console.log(line('='));
  console.log(`Requests: ${steps.length}   Passed: ${passed}   Failed: ${steps.length - passed}`);
  console.log(`Average latency: ${Math.round(steps.reduce((n, s) => n + s.durationMs, 0) / steps.length)} ms`);
  console.log(line('='));

  const groupOf = (step) => {
    if (step.path.startsWith('/api/health')) return 'health';
    if (step.path.startsWith('/api/auth')) return 'auth';
    if (step.path.startsWith('/api/courses') && step.path.includes('/lessons')) return 'lessons';
    if (step.path.startsWith('/api/courses') && step.path.includes('/enrollments')) return 'enrollments';
    if (step.path.startsWith('/api/courses')) return 'courses';
    return 'enrollments';
  };
  steps.forEach((step) => {
    step.group = groupOf(step);
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, 'api-demo.json');
  fs.writeFileSync(
    outFile,
    JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE_URL, steps }, null, 2)
  );
  console.log(`Recorded ${steps.length} calls -> ${outFile}`);

  if (passed !== steps.length) process.exitCode = 1;
})().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
