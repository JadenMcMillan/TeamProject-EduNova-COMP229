import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  ProgressBar,
  Skeleton,
  Spinner,
} from '../components/ui';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { CATEGORIES, LEVELS, LEVEL_STYLES, STATUS_STYLES } from '../lib/constants';
import { currency, fullDate, minutesToHours } from '../lib/format';

const TABS = [
  { id: 'settings', label: 'Course settings' },
  { id: 'lessons', label: 'Lessons' },
  { id: 'roster', label: 'Roster & grading' },
];

const BLANK_LESSON = { title: '', content: '', durationMinutes: 20, videoUrl: '' };

export default function CourseEditor() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('settings');

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const [lessonModal, setLessonModal] = useState(null); // { mode:'create'|'edit', lesson }
  const [lessonForm, setLessonForm] = useState(BLANK_LESSON);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [lessonError, setLessonError] = useState('');
  const [lessonTarget, setLessonTarget] = useState(null);
  const [deletingLesson, setDeletingLesson] = useState(false);

  const [roster, setRoster] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [grades, setGrades] = useState({});
  const [savingGrade, setSavingGrade] = useState(null);

  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getCourse(courseId);
      setCourse(res.data);
      setLessons(res.data.lessons || []);
      setForm({
        title: res.data.title || '',
        description: res.data.description || '',
        category: res.data.category || CATEGORIES[0],
        level: res.data.level || 'beginner',
        price: res.data.price ?? 0,
        capacity: res.data.capacity ?? 30,
        coverImageUrl: res.data.coverImageUrl || '',
        published: Boolean(res.data.published),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadRoster = useCallback(async () => {
    setRosterLoading(true);
    try {
      const res = await api.courseRoster(courseId);
      setRoster(res);
      setGrades(
        Object.fromEntries(
          (res.data || []).map((item) => [item._id, item.grade === null ? '' : String(item.grade)])
        )
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRosterLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => {
    if (tab === 'roster' && !roster) loadRoster();
  }, [tab, roster, loadRoster]);

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateCourse(courseId, {
        ...form,
        price: Number(form.price),
        capacity: Number(form.capacity),
      });
      setCourse((prev) => ({ ...prev, ...res.data }));
      toast.success('Course settings saved.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------------ lessons */
  const openCreateLesson = () => {
    setLessonError('');
    setLessonForm(BLANK_LESSON);
    setLessonModal({ mode: 'create' });
  };

  const openEditLesson = (lesson) => {
    setLessonError('');
    setLessonForm({
      title: lesson.title,
      content: lesson.content,
      durationMinutes: lesson.durationMinutes,
      videoUrl: lesson.videoUrl || '',
    });
    setLessonModal({ mode: 'edit', lesson });
  };

  const saveLesson = async (event) => {
    event.preventDefault();
    setLessonError('');
    if (!lessonForm.title.trim() || !lessonForm.content.trim()) {
      setLessonError('A lesson needs a title and some content.');
      return;
    }
    setLessonSaving(true);
    try {
      if (lessonModal.mode === 'create') {
        const res = await api.createLesson(courseId, {
          ...lessonForm,
          durationMinutes: Number(lessonForm.durationMinutes),
        });
        setLessons((list) => [...list, res.data].sort((a, b) => a.order - b.order));
        toast.success('Lesson added to the end of the course.');
      } else {
        const res = await api.updateLesson(courseId, lessonModal.lesson._id, {
          ...lessonForm,
          durationMinutes: Number(lessonForm.durationMinutes),
        });
        setLessons((list) => list.map((item) => (item._id === res.data._id ? res.data : item)));
        toast.success('Lesson updated.');
      }
      setLessonModal(null);
    } catch (err) {
      setLessonError(err.message);
    } finally {
      setLessonSaving(false);
    }
  };

  const removeLesson = async () => {
    if (!lessonTarget) return;
    setDeletingLesson(true);
    try {
      await api.deleteLesson(courseId, lessonTarget._id);
      setLessons((list) => list.filter((item) => item._id !== lessonTarget._id));
      toast.success('Lesson deleted.');
      setLessonTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingLesson(false);
    }
  };

  /* ------------------------------------------------------------- roster */
  const saveGrade = async (enrolment) => {
    const raw = grades[enrolment._id];
    const value = raw === '' ? null : Number(raw);
    if (value !== null && (Number.isNaN(value) || value < 0 || value > 100)) {
      toast.error('A grade must be between 0 and 100.');
      return;
    }
    setSavingGrade(enrolment._id);
    try {
      const res = await api.updateEnrolment(enrolment._id, { grade: value });
      setRoster((prev) => ({
        ...prev,
        data: prev.data.map((item) => (item._id === enrolment._id ? res.data : item)),
      }));
      toast.success(value === null ? 'Grade cleared.' : `Grade saved: ${value}/100`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingGrade(null);
    }
  };

  const removeCourse = async () => {
    setDeletingCourse(true);
    try {
      await api.deleteCourse(courseId);
      toast.success('Course deleted.');
      navigate('/teach');
    } catch (err) {
      toast.error(err.message);
      setDeletingCourse(false);
    }
  };

  if (loading) {
    return (
      <div className="container-page py-10">
        <Skeleton className="h-10 w-1/3" />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon="🚫"
          title="Cannot open this course"
          description={error || 'It may have been deleted, or you do not own it.'}
          action={<Button onClick={() => navigate('/teach')}>Back to dashboard</Button>}
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/teach" className="text-[13px] font-semibold text-brand-700 hover:underline">
            ← Teaching dashboard
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[26px] font-extrabold tracking-tight text-ink-900">{course.title}</h1>
            <Badge className={LEVEL_STYLES[course.level] || LEVEL_STYLES.beginner}>{course.level}</Badge>
            <Badge
              className={
                course.published
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
                  : 'bg-amber-50 text-amber-700 ring-amber-600/15'
              }
            >
              {course.published ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <p className="mt-1.5 text-[13px] text-ink-500">
            {course.code} · {course.category} · {lessons.length} lessons · {currency(course.price)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/courses/${course._id}`)}>
            Preview
          </Button>
          <Button variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => setDeleteCourseOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-ink-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`relative whitespace-nowrap px-4 py-2.5 text-[13.5px] font-semibold transition ${
              tab === item.id ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            {item.label}
            {tab === item.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------- settings */}
      {tab === 'settings' && (
        <form onSubmit={saveSettings} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="card p-6">
            <h2 className="text-[15px] font-bold text-ink-900">Course details</h2>
            <p className="mt-1 text-[12.5px] text-ink-500">Changes are applied to the public catalogue immediately.</p>

            <div className="mt-5 space-y-4">
              <Field label="Course title" required>
                <input value={form.title} onChange={update('title')} className="field" />
              </Field>

              <Field label="Description" required>
                <textarea rows={4} value={form.description} onChange={update('description')} className="field resize-none" />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <select value={form.category} onChange={update('category')} className="field">
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Level">
                  <select value={form.level} onChange={update('level')} className="field">
                    {LEVELS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Price (USD)">
                  <input type="number" min="0" value={form.price} onChange={update('price')} className="field" />
                </Field>
                <Field label="Capacity">
                  <input type="number" min="1" value={form.capacity} onChange={update('capacity')} className="field" />
                </Field>
              </div>

              <Field label="Cover image URL" hint="Optional — used by the catalogue card.">
                <input value={form.coverImageUrl} onChange={update('coverImageUrl')} className="field" placeholder="https://…" />
              </Field>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-ink-100 pt-5">
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={update('published')}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-[13px] font-medium text-ink-700">Published to catalogue</span>
              </label>
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="card p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Snapshot</p>
              <dl className="mt-3 space-y-2.5 text-[13px]">
                {[
                  ['Course code', course.code],
                  ['Lessons', lessons.length],
                  ['Enrolments', course.enrollmentCount ?? 0],
                  ['Capacity', course.capacity],
                  ['Created', fullDate(course.createdAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-ink-500">{label}</dt>
                    <dd className="font-semibold text-ink-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-xl2 border border-brand-100 bg-brand-50/60 p-5 text-[12.5px] leading-relaxed text-brand-900">
              <p className="font-bold">Curriculum tip</p>
              <p className="mt-1 text-brand-800/80">
                Keep lessons between 10 and 45 minutes. Learners complete courses faster when each lesson has one
                outcome.
              </p>
            </div>
          </aside>
        </form>
      )}

      {/* -------------------------------------------------------- lessons */}
      {tab === 'lessons' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-5 py-4">
            <div>
              <h2 className="text-[15px] font-bold text-ink-900">Curriculum</h2>
              <p className="text-[12px] text-ink-500">Lessons are ordered; new ones are appended to the end.</p>
            </div>
            <Button size="sm" onClick={openCreateLesson}>
              + Add lesson
            </Button>
          </div>

          {lessons.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon="📝"
                title="No lessons yet"
                description="Add the first lesson so students have something to work through."
                action={<Button onClick={openCreateLesson}>Add a lesson</Button>}
              />
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {lessons.map((lesson) => (
                <li key={lesson._id} className="flex flex-wrap items-start gap-4 px-5 py-4 transition hover:bg-ink-50/50">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-brand-50 text-[12px] font-bold text-brand-700">
                    {String(lesson.order).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink-900">{lesson.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-500">{lesson.content}</p>
                    <p className="mt-1.5 flex gap-3 text-[11.5px] text-ink-400">
                      <span>⏱ {minutesToHours(lesson.durationMinutes)}</span>
                      {lesson.videoUrl && <span>▶ video attached</span>}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => openEditLesson(lesson)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setLessonTarget(lesson)}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- roster */}
      {tab === 'roster' && (
        <div className="space-y-4">
          {rosterLoading || !roster ? (
            <div className="flex items-center gap-3 py-16 text-sm text-ink-500">
              <Spinner className="text-brand-600" /> Loading roster…
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ['Enrolments', roster.summary.total, 'All records'],
                  ['Active', roster.summary.active, `${roster.summary.completed} completed`],
                  [
                    'Average progress',
                    `${roster.summary.avgProgress}%`,
                    roster.summary.avgGrade === null ? 'No grades yet' : `Avg grade ${roster.summary.avgGrade}/100`,
                  ],
                ].map(([label, value, hint]) => (
                  <div key={label} className="card p-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{label}</p>
                    <p className="mt-1.5 text-[24px] font-extrabold leading-none tracking-tight text-ink-900">{value}</p>
                    <p className="mt-1 text-[12px] text-ink-500">{hint}</p>
                  </div>
                ))}
              </div>

              <div className="card overflow-hidden">
                <div className="border-b border-ink-100 px-5 py-4">
                  <h2 className="text-[15px] font-bold text-ink-900">Students</h2>
                  <p className="text-[12px] text-ink-500">Enter a grade out of 100 — grading a student completes their enrolment.</p>
                </div>

                {roster.data.length === 0 ? (
                  <div className="p-6">
                    <EmptyState icon="👥" title="No enrolments yet" description="Once students enrol they appear here." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 bg-ink-50/60 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                          <th className="px-5 py-3">Student</th>
                          <th className="px-3 py-3">Progress</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3">Grade</th>
                          <th className="px-5 py-3 text-right">Save</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-100">
                        {roster.data.map((item) => {
                          const status = STATUS_STYLES[item.status] || STATUS_STYLES.active;
                          return (
                            <tr key={item._id} className="transition hover:bg-ink-50/50">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <Avatar name={item.student?.name} size={32} />
                                  <div>
                                    <p className="font-semibold text-ink-900">{item.student?.name || 'Unknown'}</p>
                                    <p className="text-[11.5px] text-ink-500">{item.student?.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3.5">
                                <div className="flex items-center gap-2">
                                  <ProgressBar value={item.progress} className="w-24" />
                                  <span className="text-[12px] font-semibold text-ink-700">{item.progress}%</span>
                                </div>
                              </td>
                              <td className="px-3 py-3.5">
                                <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider ring-1 ring-inset ${status.className}`}>
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-3 py-3.5">
                                <input
                                  value={grades[item._id] ?? ''}
                                  onChange={(event) =>
                                    setGrades((prev) => ({ ...prev, [item._id]: event.target.value }))
                                  }
                                  placeholder="—"
                                  inputMode="numeric"
                                  className="h-9 w-20 rounded-lg border border-ink-200 px-2 text-[13px] focus:border-brand-400 focus:outline-none"
                                />
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  loading={savingGrade === item._id}
                                  onClick={() => saveGrade(item)}
                                >
                                  Save
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* -------------------------------------------------- lesson modal */}
      <Modal
        open={Boolean(lessonModal)}
        onClose={() => setLessonModal(null)}
        title={lessonModal?.mode === 'create' ? 'Add a lesson' : 'Edit lesson'}
        description={
          lessonModal?.mode === 'create'
            ? 'New lessons are appended to the end of the curriculum.'
            : `Lesson ${lessonModal?.lesson?.order} of the curriculum`
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLessonModal(null)} disabled={lessonSaving}>
              Cancel
            </Button>
            <Button onClick={saveLesson} loading={lessonSaving}>
              {lessonModal?.mode === 'create' ? 'Add lesson' : 'Save lesson'}
            </Button>
          </>
        }
      >
        <form onSubmit={saveLesson} className="space-y-4">
          <Field label="Lesson title" required>
            <input
              value={lessonForm.title}
              onChange={(event) => setLessonForm((prev) => ({ ...prev, title: event.target.value }))}
              className="field"
              placeholder="Setting up the project"
            />
          </Field>
          <Field label="Content" required hint="Shown to students when they expand the lesson.">
            <textarea
              rows={5}
              value={lessonForm.content}
              onChange={(event) => setLessonForm((prev) => ({ ...prev, content: event.target.value }))}
              className="field resize-none"
              placeholder="What this lesson covers, key ideas, and the exercise."
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Duration (minutes)">
              <input
                type="number"
                min="1"
                value={lessonForm.durationMinutes}
                onChange={(event) => setLessonForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
                className="field"
              />
            </Field>
            <Field label="Video URL" hint="Optional">
              <input
                value={lessonForm.videoUrl}
                onChange={(event) => setLessonForm((prev) => ({ ...prev, videoUrl: event.target.value }))}
                className="field"
                placeholder="https://…"
              />
            </Field>
          </div>
          {lessonError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700">
              {lessonError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(lessonTarget)}
        onClose={() => setLessonTarget(null)}
        onConfirm={removeLesson}
        loading={deletingLesson}
        title="Delete this lesson?"
        confirmLabel="Delete lesson"
        description={`"${lessonTarget?.title}" will be removed from the curriculum and from any student progress records.`}
      />

      <ConfirmDialog
        open={deleteCourseOpen}
        onClose={() => setDeleteCourseOpen(false)}
        onConfirm={removeCourse}
        loading={deletingCourse}
        title="Delete this course?"
        confirmLabel="Delete course"
        description="The course, its lessons and all enrolments will be permanently deleted."
      />
    </div>
  );
}
