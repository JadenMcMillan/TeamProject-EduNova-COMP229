# EduNova LMS — Part B · First Release

A Learning Management System built with a **React 18 + Tailwind CSS** frontend on top of a **Node.js + Express + MongoDB (Mongoose)** backend that follows the **MVC** pattern, with JWT authentication, role-based authorisation.

## Quick start (frontend + backend)

# 1) backend
cd lms-backend
npm install
npm run seed               # creates edunova_lms + demo data
npm start                  # API on http://localhost:5000/api

# 2) frontend (new terminal)
cd lms-frontend
npm install
npm run dev                # app on http://localhost:5173 (proxies /api -> :5000)
```

Useful commands (run inside `lms-backend` unless noted):

| Command | What it does |
| --- | --- |
| `npm start` / `npm run dev` | Run the API (dev = nodemon reload) |
| `npm run seed` | Resets and reseeds the development database |
| `npm run dev` (in `lms-frontend`) | Vite dev server with API proxy |
| `npm run build` (in `lms-frontend`) | Production build to `dist/` |


Demo accounts (after seeding, password `Password123`): `admin@edunova.dev`, `lena@edunova.dev` / `kwame@edunova.dev` (instructors), `mia@student.dev` / `noah@student.dev` (students).

## What is implemented

### Frontend (`lms-frontend`, React 18 + Tailwind CSS + React Router)

- **Auth screens** — split-screen login (with one-click demo accounts) and registration with role picker + client-side validation; JWT stored in `localStorage`, session restored via `GET /api/auth/me`.
- **Route guards** — `RequireRole` protects `/my-learning` (student), `/teach` + `/teach/courses/:id` (instructor/admin), `/admin/users` (admin); 403 page for role violations.
- **Course catalogue** — search (debounced), category chips, level/sort selects, pagination, skeleton loaders — all state synced to the URL.
- **Course detail** — curriculum with expandable lessons, one-click enrol, lesson completion checkboxes that recalculate progress through `PUT /api/enrollments/:id`, sticky enrolment card.
- **My learning** — stats cards, progress bars, grade display, drop-course dialog.
- **Instructor console** — course table with publish toggle, create-course modal, stats.
- **Course editor** — tabbed settings / lessons / roster & grading (inline grade entry per student).
- **Admin users** — search + role filter + pagination, create/edit (any role, reset password), delete with self-deletion guard.
- Toast notifications, consistent design system (`components/ui.jsx`), fully responsive.

### Backend (`lms-backend`)

- **Auth** — register / login / me / update profile / change password (bcrypt + JWT, rate-limited).
- **Users (admin CRUD)** — paginated list, create with any role, update, deactivate, delete with cascade protection.
- **Courses** — the core LMS object: full CRUD, search/filter/sort/pagination, draft visibility rules, cascade delete.
- **Lessons** — nested resource under `/api/courses/:courseId/lessons`, auto numbering, unique order per course.
- **Enrolments** — enrol (capacity + duplicate guards), progress tracking with auto-completion, instructor grading with field-level permissions, roster summaries.
- **Authorisation** — `protect` (JWT) + `authorize('role')` middleware + object-ownership checks in controllers.
- **Consistent errors** — central error middleware: `{ success, message, errors? }` with 400/401/403/404/409 mapping.


## API surface (summary)

```
POST   /api/auth/register | /api/auth/login      GET/PUT /api/auth/me   PUT /api/auth/password
GET    /api/users        POST /api/users         GET/PUT/DELETE /api/users/:id        (admin)
GET    /api/courses      GET  /api/courses/mine  POST /api/courses     GET/PUT/DELETE /api/courses/:id
GET    /api/courses/:cid/lessons                POST /api/courses/:cid/lessons
GET/PUT/DELETE /api/courses/:cid/lessons/:lid
POST   /api/enrollments  GET /api/enrollments/me GET/PUT/DELETE /api/enrollments/:id
GET    /api/courses/:cid/enrollments            GET /api/health · GET /api (endpoint map)
```
