import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ProgressBar,
  Spinner,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { CATEGORY_STYLES, LEVEL_STYLES, STATUS_STYLES } from '../lib/constants';
import { currency, minutesToHours, pluralise } from '../lib/format';

export default function CourseDetail() {
  const { courseId } = useParams();
  const { user, isStudent, isInstructor } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openLesson, setOpenLesson] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getCourse(courseId);
      setCourse(res.data);
    } catch (err) {
      setError(err.status === 404 ? 'This course is not available.' : err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const lessons = course?.lessons || [];
  const enrollment = course?.enrollment || null;
  const completedIds = useMemo(
    () => new Set((enrollment?.completedLessons || []).map(String)),
    [enrollment]
  );
  const totalMinutes = lessons.reduce((sum, lesson) => sum + (lesson.durationMinutes || 0), 0);
  const isOwner = isInstructor && course && (course.instructor?._id === user?._id || user?.role === 'admin');

  const enrol = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/courses/${courseId}` } } });
      return;
    }
    setBusy(true);
    try {
      await api.enrol(course._id);
      toast.success('Enrolled — your first lesson is ready.');
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleLesson = async (lesson) => {
    if (!enrollment || !isStudent) return;
    const ids = new Set(completedIds);
    if (ids.has(String(lesson._id))) ids.delete(String(lesson._id));
    else ids.add(String(lesson._id));

    const nextIds = [...ids];
    const progress = lessons.length ? Math.round((nextIds.length / lessons.length) * 100) : 0;

    setBusy(true);
    try {
      const res = await api.updateEnrolment(enrollment._id, {
        completedLessons: nextIds,
        progress,
      });
      setCourse((prev) => ({ ...prev, enrollment: res.data }));
      if (progress === 100) toast.success('Course complete — congratulations! 🎉');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="container-page flex items-center gap-3 py-24 text-sm text-ink-500">
        <Spinner className="text-brand-600" /> Loading course…
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon="🚫"
          title="Course not found"
          description={error || 'The course you are looking for may have been unpublished.'}
          action={<Button onClick={() => navigate('/')}>Back to catalogue</Button>}
        />
      </div>
    );
  }

  const gradient = CATEGORY_STYLES[course.category] || 'from-brand-500 to-violet-500';
  const status = enrollment ? STATUS_STYLES[enrollment.status] : null;

  return (
    <div className="pb-4">
      {/* ------------------------------------------------------- banner */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:18px_18px]" />
        <div className="container-page relative py-10 text-white">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white/80 hover:text-white">
            ← Course catalogue
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
              {course.code}
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
              {course.category}
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
              {course.level}
            </span>
            {!course.published && (
              <span className="rounded-full bg-ink-900/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                Draft — visible to you only
              </span>
            )}
          </div>
          <h1 className="mt-3 max-w-3xl text-[30px] font-extrabold leading-tight tracking-tight sm:text-[38px]">
            {course.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-white/80">{course.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-medium text-white/85">
            <span>👤 {course.instructor?.name || 'EduNova faculty'}</span>
            <span>📚 {pluralise(lessons.length, 'lesson')}</span>
            <span>⏱ {minutesToHours(totalMinutes)} of content</span>
            <span>🎟 {course.enrollmentCount ?? 0} enrolled</span>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-8 py-9 lg:grid-cols-[minmax(0,1fr)_356px]">
        {/* ------------------------------------------------------- left */}
        <div className="min-w-0">
          <section className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[17px] font-bold text-ink-900">Curriculum</h2>
              <span className="text-[12.5px] text-ink-500">
                {completedIds.size}/{lessons.length} complete
              </span>
            </div>

            {lessons.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-ink-300 p-6 text-center text-sm text-ink-500">
                No lessons have been published for this course yet.
              </p>
            ) : (
              <ol className="mt-4 divide-y divide-ink-100">
                {lessons.map((lesson, index) => {
                  const done = completedIds.has(String(lesson._id));
                  const expanded = openLesson === lesson._id;
                  return (
                    <li key={lesson._id} className="py-1">
                      <div className="flex items-start gap-3 py-3">
                        <button
                          type="button"
                          onClick={() => isStudent && enrollment && toggleLesson(lesson)}
                          disabled={!enrollment || !isStudent || busy}
                          aria-label={done ? 'Mark lesson as incomplete' : 'Mark lesson as complete'}
                          className={`mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full border text-[11px] font-bold transition ${
                            done
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : enrollment && isStudent
                                ? 'border-ink-300 bg-white text-transparent hover:border-brand-400 hover:text-brand-300'
                                : 'border-ink-200 bg-ink-50 text-ink-300'
                          } ${!enrollment || !isStudent ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          ✓
                        </button>

                        <button
                          type="button"
                          onClick={() => setOpenLesson(expanded ? null : lesson._id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink-900">
                            <span className="text-ink-400">{String(index + 1).padStart(2, '0')}.</span>
                            <span className={done ? 'text-ink-500 line-through decoration-ink-300' : ''}>
                              {lesson.title}
                            </span>
                          </p>
                          <p className="mt-1 flex items-center gap-3 text-[12px] text-ink-400">
                            <span>⏱ {minutesToHours(lesson.durationMinutes)}</span>
                            {lesson.videoUrl && <span>▶ video</span>}
                            <span className="text-brand-600">{expanded ? 'Hide details' : 'View details'}</span>
                          </p>
                        </button>
                      </div>
                      {expanded && (
                        <div className="mb-3 ml-9 rounded-xl bg-ink-50 p-4 text-[13px] leading-relaxed text-ink-600">
                          {lesson.content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="card mt-5 p-6">
            <h2 className="text-[17px] font-bold text-ink-900">About the instructor</h2>
            <div className="mt-4 flex items-start gap-4">
              <Avatar name={course.instructor?.name} size={52} />
              <div>
                <p className="text-[15px] font-bold text-ink-900">{course.instructor?.name}</p>
                <p className="text-[12.5px] text-ink-500">{course.instructor?.email}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">
                  {course.instructor?.bio ||
                    'Instructor on EduNova, building practical, project-first courses for the catalogue.'}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------------------------------------ right */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="border-b border-ink-100 p-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Tuition</p>
                  <p className="mt-1 text-[30px] font-extrabold leading-none tracking-tight text-ink-900">
                    {currency(course.price)}
                  </p>
                </div>
                <Badge className={LEVEL_STYLES[course.level] || LEVEL_STYLES.beginner}>{course.level}</Badge>
              </div>

              {enrollment ? (
                <>
                  <div className="mt-5 flex items-center justify-between text-[12.5px]">
                    <span className={`rounded-full px-2.5 py-1 font-semibold ring-1 ring-inset ${status.className}`}>
                      {status.label}
                    </span>
                    <span className="font-bold text-ink-900">{enrollment.progress}%</span>
                  </div>
                  <ProgressBar
                    value={enrollment.progress}
                    className="mt-2"
                    tone={enrollment.status === 'completed' ? 'emerald' : 'brand'}
                  />
                  <Button className="mt-5 w-full" size="lg" onClick={() => setOpenLesson(lessons[0]?._id)}>
                    Continue learning
                  </Button>
                  <Link
                    to="/my-learning"
                    className="mt-2 block text-center text-[12.5px] font-semibold text-brand-700 hover:underline"
                  >
                    Go to My learning
                  </Link>
                </>
              ) : isStudent ? (
                <>
                  <Button className="mt-5 w-full" size="lg" loading={busy} onClick={enrol}>
                    Enrol for free
                  </Button>
                  <p className="mt-2.5 text-center text-[11.5px] text-ink-400">
                    {Math.max(0, course.capacity - (course.enrollmentCount ?? 0))} of {course.capacity} seats left
                  </p>
                </>
              ) : isOwner ? (
                <Button
                  className="mt-5 w-full"
                  size="lg"
                  onClick={() => navigate(`/teach/courses/${course._id}`)}
                >
                  Edit this course
                </Button>
              ) : (
                <>
                  <Button className="mt-5 w-full" size="lg" onClick={() => navigate('/login')}>
                    Sign in to enrol
                  </Button>
                  <p className="mt-2.5 text-center text-[11.5px] text-ink-400">
                    Student accounts can enrol; instructors manage courses.
                  </p>
                </>
              )}
            </div>

            <dl className="space-y-3 p-6 text-[13px]">
              {[
                ['Lessons', pluralise(lessons.length, 'lesson')],
                ['Total duration', minutesToHours(totalMinutes)],
                ['Category', course.category],
                ['Capacity', `${course.enrollmentCount ?? 0} / ${course.capacity}`],
                ['Status', course.published ? 'Published' : 'Draft'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500">{label}</dt>
                  <dd className="font-semibold text-ink-800">{value}</dd>
                </div>
              ))}
              {enrollment?.grade !== null && enrollment?.grade !== undefined && (
                <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-3">
                  <dt className="text-ink-500">Grade</dt>
                  <dd className="font-bold text-emerald-600">{enrollment.grade}/100</dd>
                </div>
              )}
            </dl>
          </div>

          <p className="mt-4 px-2 text-center text-[11.5px] leading-relaxed text-ink-400">
            Progress and enrolment state are persisted through the EduNova REST API.
          </p>
        </aside>
      </div>
    </div>
  );
}
