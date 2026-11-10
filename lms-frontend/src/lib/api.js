/**
 * lib/api.js — the single gateway to the Express backend.
 *
 * Every request funnels through `request()` so that:
 *  - the JWT is attached automatically,
 *  - non-2xx responses become thrown ApiError instances carrying the
 *    backend's { success:false, message } payload,
 *  - a 401 clears the stored session and notifies the app.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'edunova.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

async function request(path, { method = 'GET', body, params, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = auth ? tokenStore.get() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}${buildQuery(params)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'Cannot reach the API. Is the backend running on port 5000?',
      0,
      null
    );
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      tokenStore.clear();
      onUnauthorized();
    }
    throw new ApiError(
      payload?.message || `Request failed with status ${response.status}`,
      response.status,
      payload
    );
  }

  return payload;
}

export const api = {
  /* ---------------- auth ---------------- */
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials, auth: false }),
  register: (values) => request('/auth/register', { method: 'POST', body: values, auth: false }),
  me: () => request('/auth/me'),
  updateMe: (values) => request('/auth/me', { method: 'PUT', body: values }),
  changePassword: (values) => request('/auth/password', { method: 'PUT', body: values }),

  /* ---------------- courses ---------------- */
  listCourses: (params) => request('/courses', { params }),
  getCourse: (id) => request(`/courses/${id}`),
  myCourses: () => request('/courses/mine'),
  createCourse: (values) => request('/courses', { method: 'POST', body: values }),
  updateCourse: (id, values) => request(`/courses/${id}`, { method: 'PUT', body: values }),
  deleteCourse: (id) => request(`/courses/${id}`, { method: 'DELETE' }),
  courseRoster: (id, params) => request(`/courses/${id}/enrollments`, { params }),

  /* ---------------- lessons ---------------- */
  listLessons: (courseId) => request(`/courses/${courseId}/lessons`),
  createLesson: (courseId, values) => request(`/courses/${courseId}/lessons`, { method: 'POST', body: values }),
  updateLesson: (courseId, id, values) =>
    request(`/courses/${courseId}/lessons/${id}`, { method: 'PUT', body: values }),
  deleteLesson: (courseId, id) => request(`/courses/${courseId}/lessons/${id}`, { method: 'DELETE' }),

  /* ---------------- enrolments ---------------- */
  enrol: (courseId) => request('/enrollments', { method: 'POST', body: { courseId } }),
  myEnrolments: (params) => request('/enrollments/me', { params }),
  updateEnrolment: (id, values) => request(`/enrollments/${id}`, { method: 'PUT', body: values }),
  dropEnrolment: (id) => request(`/enrollments/${id}`, { method: 'DELETE' }),

  /* ---------------- users (admin) ---------------- */
  listUsers: (params) => request('/users', { params }),
  createUser: (values) => request('/users', { method: 'POST', body: values }),
  updateUser: (id, values) => request(`/users/${id}`, { method: 'PUT', body: values }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};
