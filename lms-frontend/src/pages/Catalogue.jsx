import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CourseCard } from '../components/CourseCard';
import { Button, EmptyState, Skeleton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { CATEGORIES, LEVELS, SORTS } from '../lib/constants';

const PAGE_SIZE = 6;

const Stat = ({ value, label }) => (
  <div>
    <p className="text-[22px] font-extrabold leading-none tracking-tight text-ink-900">{value}</p>
    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
  </div>
);

export default function Catalogue() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const level = params.get('level') || '';
  const sort = params.get('sort') || 'newest';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [searchInput, setSearchInput] = useState(search);
  const [courses, setCourses] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  /* Debounce the search box so typing does not fire a request per keystroke. */
  useEffect(() => {
    if (searchInput === search) return undefined;
    const timer = setTimeout(() => setParam('search', searchInput.trim()), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api
      .listCourses({ page, limit: PAGE_SIZE, search, category, level, sort })
      .then((res) => {
        if (!alive) return;
        setCourses(res.data || []);
        setMeta({ total: res.pagination?.total ?? res.count ?? 0, pages: res.pagination?.pages ?? 1 });
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [page, search, category, level, sort]);

  const activeFilters = useMemo(
    () => [search, category, level].filter(Boolean).length,
    [search, category, level]
  );

  const heroTitle = user
    ? `Welcome back${user.name ? `, ${user.name.split(' ')[0]}` : ''}.`
    : 'Learn the skills that ship.';

  return (
    <div>
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden border-b border-ink-200/70 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#eef2ff_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,#f5f3ff_0%,transparent_50%)]" />
        <div className="container-page relative py-12 sm:py-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              First release · 2026 catalogue
            </span>
            <h1 className="mt-5 text-[34px] font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-[44px]">
              {heroTitle}
              <span className="block bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-transparent">
                Short lessons. Real progress.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-500">
              Browse every published course on EduNova. Enrol in one click, work through sequenced lessons, and
              watch your progress update against the API in real time.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-[440px]">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">⌕</span>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by title, code or description…"
                className="h-12 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm shadow-sm transition placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                aria-label="Search courses"
              />
            </div>
            <div className="flex items-center gap-6 sm:ml-4">
              <Stat value={meta.total ?? 0} label="Courses" />
              <div className="h-8 w-px bg-ink-200" />
              <Stat value="6" label="Categories" />
              <div className="h-8 w-px bg-ink-200" />
              <Stat value="100%" label="API live" />
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- filters */}
      <section className="container-page py-9">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.delete('category');
              next.delete('page');
              setParams(next, { replace: true });
            }}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
              !category
                ? 'border-ink-900 bg-ink-900 text-white'
                : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
            }`}
          >
            All courses
          </button>
          {CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setParam('category', category === item ? '' : item)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                category === item
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 pb-4">
          <p className="text-[13px] text-ink-500">
            {loading ? 'Loading courses…' : `${meta.total} course${meta.total === 1 ? '' : 's'} available`}
            {activeFilters > 0 && !loading && <span className="text-ink-400"> · {activeFilters} filter(s) applied</span>}
          </p>
          <div className="flex items-center gap-2">
            <select
              value={level}
              onChange={(event) => setParam('level', event.target.value)}
              className="h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-[13px] font-medium text-ink-700 focus:border-brand-400 focus:outline-none"
              aria-label="Filter by level"
            >
              <option value="">All levels</option>
              {LEVELS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => setParam('sort', event.target.value)}
              className="h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-[13px] font-medium text-ink-700 focus:border-brand-400 focus:outline-none"
              aria-label="Sort courses"
            >
              {SORTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {activeFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput('');
                  setParams({}, { replace: true });
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- grid */}
        {error ? (
          <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <p className="font-semibold">Could not load the catalogue</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card overflow-hidden p-0">
                <Skeleton className="h-32 rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No courses match those filters"
            description="Try a different keyword, or clear the filters to see the full catalogue."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchInput('');
                  setParams({}, { replace: true });
                }}
              >
                Reset filters
              </Button>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>
        )}

        {/* -------------------------------------------------- pagination */}
        {!loading && !error && meta.pages > 1 && (
          <div className="mt-9 flex items-center justify-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setParam('page', String(page - 1))}
            >
              ← Previous
            </Button>
            {Array.from({ length: meta.pages }).map((_, index) => {
              const target = index + 1;
              return (
                <button
                  key={target}
                  type="button"
                  onClick={() => setParam('page', String(target))}
                  className={`h-9 w-9 rounded-lg text-[13px] font-semibold transition ${
                    target === page
                      ? 'bg-brand-600 text-white'
                      : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                  }`}
                >
                  {target}
                </button>
              );
            })}
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= meta.pages}
              onClick={() => setParam('page', String(page + 1))}
            >
              Next →
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
