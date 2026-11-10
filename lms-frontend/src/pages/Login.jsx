import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthAside } from './AuthAside';

const DEMO_ACCOUNTS = [
  { role: 'Student', email: 'mia@student.dev', password: 'Password123' },
  { role: 'Instructor', email: 'lena@edunova.dev', password: 'Password123' },
  { role: 'Admin', email: 'admin@edunova.dev', password: 'Password123' },
];

export default function Login() {
  const { login, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const account = await login({ email: form.email.trim(), password: form.password });
      toast.success(`Welcome back, ${account.name.split(' ')[0]}`);
      const fallback = account.role === 'student' ? '/my-learning' : account.role === 'admin' ? '/admin/users' : '/teach';
      navigate(location.state?.from?.pathname || fallback, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <AuthAside />

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[400px] animate-fade-in">
          <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-brand-700 lg:hidden">
            ← Back to catalogue
          </Link>

          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Welcome back</p>
          <h1 className="mt-2 text-[30px] font-extrabold tracking-tight text-ink-900">Sign in to EduNova</h1>
          <p className="mt-2 text-sm text-ink-500">
            Pick up where you left off — your courses, progress and grades are waiting.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Email address" required>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@university.edu"
                className="field"
              />
            </Field>

            <Field label="Password" required>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={update('password')}
                  placeholder="••••••••"
                  className="field pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-500 hover:bg-ink-100"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] font-medium text-rose-700">
                <span className="mt-px">⚠</span>
                {error}
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-5 text-sm text-ink-500">
            New to EduNova?{' '}
            <Link to="/register" className="font-semibold text-brand-700 hover:underline">
              Create an account
            </Link>
          </p>

          <div className="mt-9 rounded-xl2 border border-ink-200 bg-ink-50/70 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Demo accounts</p>
            <p className="mt-1 text-[12px] text-ink-400">
              Seeded for the First Release demo — password <code className="rounded bg-white px-1 py-0.5">Password123</code>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => setForm({ email: account.email, password: account.password })}
                  className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
                >
                  {account.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
