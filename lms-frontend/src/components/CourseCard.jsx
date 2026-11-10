import { Link } from 'react-router-dom';
import { CATEGORY_STYLES, LEVEL_STYLES } from '../lib/constants';
import { currency } from '../lib/format';
import { Badge } from './ui';

export const CourseCard = ({ course, footer }) => {
  const gradient = CATEGORY_STYLES[course.category] || 'from-brand-500 to-violet-500';
  const lessons = Array.isArray(course.lessons) ? course.lessons.length : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl2 border border-ink-200/80 bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
      <Link to={`/courses/${course._id}`} className="block">
        <div className={`relative h-32 overflow-hidden bg-gradient-to-br ${gradient}`}>
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:14px_14px]" />
          <span className="absolute right-3 top-3 rounded-lg bg-white/20 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            {course.code}
          </span>
          <span className="absolute bottom-3 left-4 text-[26px] font-extrabold leading-none tracking-tight text-white/95">
            {course.category?.split(' ').map((w) => w[0]).join('')}
          </span>
          {course.enrolled && (
            <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Enrolled
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <Badge className={LEVEL_STYLES[course.level] || LEVEL_STYLES.beginner}>{course.level}</Badge>
          <Badge className="bg-ink-50 text-ink-500 ring-ink-500/10">{course.category}</Badge>
        </div>

        <Link to={`/courses/${course._id}`}>
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-ink-900 transition group-hover:text-brand-700">
            {course.title}
          </h3>
        </Link>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-500">{course.description}</p>

        <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-500">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-ink-100 text-[9px] font-bold text-ink-600">
            {(course.instructor?.name || 'EN').split(' ').map((p) => p[0]).slice(0, 2).join('')}
          </span>
          <span className="truncate">{course.instructor?.name || 'EduNova faculty'}</span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3.5">
          <div className="flex items-center gap-3 text-[12px] font-medium text-ink-500">
            {lessons !== null && <span>{lessons} lessons</span>}
            <span>{course.enrollmentCount ?? 0} enrolled</span>
          </div>
          <span className={`text-[13px] font-bold ${Number(course.price) === 0 ? 'text-emerald-600' : 'text-ink-900'}`}>
            {currency(course.price)}
          </span>
        </div>

        {footer}
      </div>
    </article>
  );
};
