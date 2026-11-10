import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  ProgressBar,
  Skeleton,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { CATEGORY_STYLES, STATUS_STYLES } from '../lib/constants';
import { fullDate, pluralise } from '../lib/format';

const StatCard = ({ label, value, hint }) => (
  <div className="card p-5">
    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{label}</p>
    <p className="mt-2 text-[26px] font-extrabold leading-none tracking-tight text-ink-900">{value}</p>
    {hint && <p className="mt-1.5 text-[12px] text-ink-500">{hint}</p>}
  </div>
);

export default function MyLearning() {
  const { user } = useAuth();
  const toast = useToast();
  const [enrolments, setEnrolments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dropTarget, setDropTarget] = useState(null);
  const [dropping, setDropping] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.myEnrolments({ limit: 50 });
      setEnrolments(res.data || []);
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
    const active = enrolments.filter((item) => item.status === 'active');
    const completed = enrolments.filter((item) => item.status === 'completed');
    const average = enrolments.length
      ? Math.round(enrolments.reduce((sum, item) => sum + (item.progress || 0), 0) / enrolments.length)
      : 0;
    return { active: active.length, completed: completed.length, average };
  }, [enrolments]);

  const drop = async () => {
    if (!dropTarget) return;
    setDropping(true);
    try {
      await api.dropEnrolment(dropTarget._id);
      setEnrolments((list) => list.filter((item) => item._id !== dropTarget._id));
      toast.success(`Removed ${dropTarget.course?.title || 'the course'} from your learning.`);
      setDropTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDropping(false);
    }
  };

  return (
    <div className="container-page py-9">
      <PageHeader
        eyebrow="Student workspace"
        title={`My learning${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="Every course you are enrolled in, with live progress straight from the API."
        actions={
          <Link to="/">
            <Button variant="secondary">Browse catalogue</Button>
          </Link>
        }
      />

      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active courses" value={stats.active} hint="In progress right now" />
        <StatCard label="Completed" value={stats.completed} hint="Finished with 100% progress" />
        <StatCard label="Average progress" value={`${stats.average}%`} hint="Across all enrolments" />
      </div>

      {error ? (
        <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : enrolments.length === 0 ? (
        <EmptyState
          icon="🎓"
          title="You are not enrolled in anything yet"
          description="Pick a course from the catalogue and it will show up here with your progress."
          action={
            <Link to="/">
              <Button>Browse courses</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3.5">
          {enrolments.map((item) => {
            const course = item.course || {};
            const gradient = CATEGORY_STYLES[course.category] || 'from-brand-500 to-violet-500';
            const status = STATUS_STYLES[item.status] || STATUS_STYLES.active;
            return (
              <article
                key={item._id}
                className="card flex flex-col gap-4 p-4 transition hover:border-brand-200 hover:shadow-lift sm:flex-row sm:items-center sm:p-5"
              >
                <div
                  className={`relative grid h-20 w-full flex-none place-items-center overflow-hidden rounded-xl bg-gradient-to-br ${gradient} sm:w-28`}
                >
                  <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:12px_12px]" />
                  <span className="relative text-[11px] font-bold uppercase tracking-wider text-white">
                    {course.code || 'LMS'}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ring-1 ring-inset ${status.className}`}>
                      {status.label}
                    </span>
                    <span className="text-[11.5px] font-medium text-ink-400">
                      Enrolled {fullDate(item.createdAt)}
                    </span>
                  </div>
                  <Link
                    to={`/courses/${course._id}`}
                    className="mt-1.5 block truncate text-[15px] font-bold text-ink-900 hover:text-brand-700"
                  >
                    {course.title || 'Course removed'}
                  </Link>
                  <p className="mt-0.5 text-[12.5px] text-ink-500">
                    {course.category} · {course.level}
                    {item.grade !== null && item.grade !== undefined && (
                      <span className="ml-2 font-semibold text-emerald-600">Grade {item.grade}/100</span>
                    )}
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar
                      value={item.progress}
                      className="max-w-[300px]"
                      tone={item.status === 'completed' ? 'emerald' : 'brand'}
                    />
                    <span className="text-[12px] font-bold text-ink-700">{item.progress}%</span>
                    <span className="hidden text-[11.5px] text-ink-400 sm:inline">
                      {pluralise(item.completedLessons?.length || 0, 'lesson')} done
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
                  <Link to={`/courses/${course._id}`}>
                    <Button size="sm" className="w-full">
                      {item.status === 'completed' ? 'Review' : 'Continue'}
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => setDropTarget(item)}>
                    Drop
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(dropTarget)}
        onClose={() => setDropTarget(null)}
        onConfirm={drop}
        loading={dropping}
        title="Drop this course?"
        confirmLabel="Drop course"
        description={`This deletes your enrolment in "${
          dropTarget?.course?.title || 'this course'
        }" including your recorded progress. You can re-enrol later if seats are available.`}
      />
    </div>
  );
}
