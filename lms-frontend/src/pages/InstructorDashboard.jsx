import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Skeleton,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { CATEGORIES, LEVELS, LEVEL_STYLES } from '../lib/constants';
import { currency, fullDate } from '../lib/format';

const EMPTY_FORM = {
  title: '',
  code: '',
  description: '',
  category: CATEGORIES[0],
  level: 'beginner',
  price: 0,
  capacity: 30,
  published: false,
};

const StatCard = ({ label, value, hint, accent }) => (
  <div className="card p-5">
    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{label}</p>
    <p className={`mt-2 text-[26px] font-extrabold leading-none tracking-tight ${accent || 'text-ink-900'}`}>
      {value}
    </p>
    {hint && <p className="mt-1.5 text-[12px] text-ink-500">{hint}</p>}
  </div>
);

export default function InstructorDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.myCourses();
      setCourses(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const published = courses.filter((course) => course.published).length;
    const learners = courses.reduce((sum, course) => sum + (course.enrollmentCount || 0), 0);
    return { total: courses.length, published, drafts: courses.length - published, learners };
  }, [courses]);

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const createCourse = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!form.title.trim() || !form.code.trim() || !form.description.trim()) {
      setFormError('Title, course code and description are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.createCourse({
        ...form,
        title: form.title.trim(),
        code: form.code.trim().toUpperCase(),
        price: Number(form.price),
        capacity: Number(form.capacity),
      });
      toast.success('Course created — add your first lesson next.');
      setModalOpen(false);
      setForm(EMPTY_FORM);
      navigate(`/teach/courses/${res.data._id}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (course) => {
    try {
      const res = await api.updateCourse(course._id, { published: !course.published });
      setCourses((list) => list.map((item) => (item._id === course._id ? { ...item, ...res.data } : item)));
      toast.success(res.data.published ? 'Course published to the catalogue.' : 'Course moved back to draft.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeCourse = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteCourse(deleteTarget._id);
      setCourses((list) => list.filter((item) => item._id !== deleteTarget._id));
      toast.success('Course and its lessons were deleted.');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container-page py-9">
      <PageHeader
        eyebrow="Instructor console"
        title="Your teaching dashboard"
        description="Create courses, manage lessons, publish to the catalogue and keep an eye on enrolment."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/')}>
              View catalogue
            </Button>
            <Button onClick={() => setModalOpen(true)}>+ New course</Button>
          </>
        }
      />

      <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Courses" value={stats.total} hint="Owned by you" />
        <StatCard label="Published" value={stats.published} hint="Live in the catalogue" accent="text-emerald-600" />
        <StatCard label="Drafts" value={stats.drafts} hint="Hidden from students" accent="text-amber-600" />
        <StatCard label="Enrolments" value={stats.learners} hint="Across every course" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-ink-900">My courses</h2>
            <p className="text-[12px] text-ink-500">Signed in as {user?.name}</p>
          </div>
          <Link to="/teach" className="hidden text-[12px] font-semibold text-brand-700 hover:underline sm:block">
            Refresh list
          </Link>
        </div>

        {error ? (
          <div className="p-6 text-sm text-rose-700">{error}</div>
        ) : loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="🧑‍🏫"
              title="No courses yet"
              description="Create your first course — it stays in draft until you publish it."
              action={<Button onClick={() => setModalOpen(true)}>Create a course</Button>}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                  <th className="px-5 py-3">Course</th>
                  <th className="px-3 py-3">Level</th>
                  <th className="px-3 py-3">Enrolments</th>
                  <th className="px-3 py-3">Price</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {courses.map((course) => (
                  <tr key={course._id} className="transition hover:bg-ink-50/50">
                    <td className="px-5 py-3.5">
                      <Link to={`/courses/${course._id}`} className="font-semibold text-ink-900 hover:text-brand-700">
                        {course.title}
                      </Link>
                      <p className="mt-0.5 text-[11.5px] font-medium uppercase tracking-wider text-ink-400">
                        {course.code} · {course.category}
                      </p>
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge className={LEVEL_STYLES[course.level] || LEVEL_STYLES.beginner}>{course.level}</Badge>
                    </td>
                    <td className="px-3 py-3.5 font-semibold text-ink-700">{course.enrollmentCount || 0}</td>
                    <td className="px-3 py-3.5 font-semibold text-ink-700">{currency(course.price)}</td>
                    <td className="px-3 py-3.5">
                      <button
                        type="button"
                        onClick={() => togglePublish(course)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          course.published ? 'bg-emerald-500' : 'bg-ink-300'
                        }`}
                        aria-label={course.published ? 'Unpublish course' : 'Publish course'}
                        aria-pressed={course.published}
                      >
                        <span
                          className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition ${
                            course.published ? 'translate-x-6' : 'translate-x-1'
                          }`}
                          style={{ height: 18, width: 18 }}
                        />
                      </button>
                    </td>
                    <td className="px-3 py-3.5 text-[12.5px] text-ink-500">{fullDate(course.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/teach/courses/${course._id}`)}>
                          Manage
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(course)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --------------------------------------------------- create modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create a new course"
        description="It stays a draft until you publish it, so students never see a half-built course."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={createCourse} loading={saving}>
              Create course
            </Button>
          </>
        }
      >
        <form onSubmit={createCourse} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
            <Field label="Course title" required>
              <input value={form.title} onChange={update('title')} className="field" placeholder="Modern React Patterns" />
            </Field>
            <Field label="Course code" required hint="Unique, uppercase">
              <input value={form.code} onChange={update('code')} className="field uppercase" placeholder="WEB-210" />
            </Field>
          </div>

          <Field label="Description" required>
            <textarea
              rows={3}
              value={form.description}
              onChange={update('description')}
              className="field resize-none"
              placeholder="What will students be able to do after this course?"
            />
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
            <Field label="Price (USD)" hint="0 = free course">
              <input type="number" min="0" step="1" value={form.price} onChange={update('price')} className="field" />
            </Field>
            <Field label="Capacity" hint="Maximum enrolments">
              <input type="number" min="1" step="1" value={form.capacity} onChange={update('capacity')} className="field" />
            </Field>
          </div>

          <label className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-3">
            <input
              type="checkbox"
              checked={form.published}
              onChange={update('published')}
              className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-[13px] font-medium text-ink-700">
              Publish immediately
              <span className="ml-1.5 text-[12px] text-ink-400">(otherwise saved as draft)</span>
            </span>
          </label>

          {formError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={removeCourse}
        loading={deleting}
        title="Delete this course?"
        confirmLabel="Delete course"
        description={`"${deleteTarget?.title}" and all of its lessons and enrolments will be permanently removed. This cannot be undone.`}
      />
    </div>
  );
}
