import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar, Button } from './ui';

export const Logo = ({ compact = false }) => (
  <Link to="/" className="group flex items-center gap-2.5">
    <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-violet-600 shadow-sm transition group-hover:shadow-lift">
      <span className="text-[13px] font-extrabold tracking-tight text-white">EN</span>
      <span className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-white/25" />
    </span>
    {!compact && (
      <span className="leading-none">
        <span className="block text-[15px] font-extrabold tracking-tight text-ink-900">EduNova</span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
          Learning
        </span>
      </span>
    )}
  </Link>
);

const navLinkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
  }`;

export const Layout = ({ children }) => {
  const { user, logout, isStudent, isInstructor, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const links = [
    { to: '/', label: 'Browse', end: true },
    ...(isStudent ? [{ to: '/my-learning', label: 'My learning' }] : []),
    ...(isInstructor ? [{ to: '/teach', label: 'Teach' }] : []),
    ...(isAdmin ? [{ to: '/admin/users', label: 'Users' }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-ink-200/70 bg-white/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-0.5 md:flex">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="hidden items-center gap-2.5 rounded-full border border-ink-200 bg-white py-1 pl-1 pr-3 sm:flex">
                  <Avatar name={user.name} size={30} />
                  <span className="leading-tight">
                    <span className="block max-w-[140px] truncate text-[13px] font-semibold text-ink-800">
                      {user.name}
                    </span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                      {user.role}
                    </span>
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:inline-flex">
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
                <Button size="sm" onClick={() => navigate('/register')}>
                  Get started
                </Button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-ink-600 md:hidden"
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
            >
              <span className="text-base">{mobileOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-ink-200 bg-white px-5 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                  {link.label}
                </NavLink>
              ))}
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Sign out
                </button>
              ) : null}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-ink-200 bg-white">
        <div className="container-page flex flex-col gap-6 py-9 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-ink-500">
              A learning management system built for the First Release milestone — courses, lessons, enrolments
              and grading on a REST API.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-3 text-[13px] text-ink-500">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">Product</p>
              <Link className="block py-0.5 hover:text-brand-700" to="/">
                Course catalogue
              </Link>
              <Link className="block py-0.5 hover:text-brand-700" to="/my-learning">
                My learning
              </Link>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">Team</p>
              <span className="block py-0.5">Team EduNova</span>
              <span className="block py-0.5">SOFT 2602 · First Release</span>
            </div>
          </div>
        </div>
        <div className="border-t border-ink-100 py-4 text-center text-[12px] text-ink-400">
          © 2026 EduNova. Built with React, Tailwind CSS and Express.
        </div>
      </footer>
    </div>
  );
};
