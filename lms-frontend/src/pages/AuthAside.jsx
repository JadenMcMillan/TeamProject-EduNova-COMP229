const POINTS = [
  {
    title: 'Structured courses',
    body: 'Every course is a sequence of lessons with duration, content and order — no guesswork.',
  },
  {
    title: 'Progress that sticks',
    body: 'Complete lessons and your enrolment recalculates instantly, from 0% to certified.',
  },
  {
    title: 'Teaching tools included',
    body: 'Instructors publish courses, manage lessons and grade the roster from one console.',
  },
];

/** Decorative split-screen panel shared by the login and register pages. */
export const AuthAside = () => (
  <aside className="relative hidden overflow-hidden bg-ink-900 lg:block">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,#4f46e5_0%,transparent_45%),radial-gradient(circle_at_85%_80%,#7c3aed_0%,transparent_50%)]" />
    <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />

    <div className="relative flex h-full flex-col justify-between p-12 xl:p-14">
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[14px] font-extrabold text-white ring-1 ring-white/20 backdrop-blur">
          EN
        </span>
        <div className="leading-none text-white">
          <p className="text-[15px] font-extrabold tracking-tight">EduNova</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Learning</p>
        </div>
      </div>

      <div className="max-w-[440px]">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">Learning management system</p>
        <h2 className="mt-4 text-[38px] font-extrabold leading-[1.1] tracking-tight text-white">
          Learn something
          <br />
          that compounds.
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/60">
          Short, sequenced lessons taught by practitioners. Enrol once, track every step, finish with a grade.
        </p>

        <ul className="mt-9 space-y-5">
          {POINTS.map((point) => (
            <li key={point.title} className="flex gap-3.5">
              <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-white/10 text-[11px] text-brand-200 ring-1 ring-white/15">
                ✓
              </span>
              <div>
                <p className="text-[14px] font-semibold text-white">{point.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-white/55">{point.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-8 text-white/60">
        <div>
          <p className="text-[22px] font-extrabold text-white">3</p>
          <p className="text-[11px] uppercase tracking-wider">Live courses</p>
        </div>
        <div className="h-9 w-px bg-white/15" />
        <div>
          <p className="text-[22px] font-extrabold text-white">100%</p>
          <p className="text-[11px] uppercase tracking-wider">REST API driven</p>
        </div>
        <div className="h-9 w-px bg-white/15" />
        <div>
          <p className="text-[22px] font-extrabold text-white">v0.1</p>
          <p className="text-[11px] uppercase tracking-wider">First release</p>
        </div>
      </div>
    </div>
  </aside>
);
