import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuthAside } from './AuthAside';

const ROLES = [
  {
    value: 'student',
    title: 'Student',
    body: 'Browse the catalogue, enrol in courses and track progress.',
    icon: '🎓',
  },
  {
    value: 'instructor',
    title: 'Instructor',
    body: 'Create courses and lessons, then teach and grade learners.',
    icon: '🧑‍🏫',
  },
];

export default function Register() {
  const { register, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'student',
    bio: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your full name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const account = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        bio: form.bio.trim(),
      });
      toast.success(`Account created — welcome, ${account.name.split(' ')[0]}!`);
      navigate(account.role === 'instructor' ? '/teach' : '/my-learning', { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <AuthAside />

      <div className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[440px] animate-fade-in">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Get started</p>
          <h1 className="mt-2 text-[30px] font-extrabold tracking-tight text-ink-900">Create your account</h1>
          <p className="mt-2 text-sm text-ink-500">Free for the First Release demo. No credit card, no email confirmation.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <span className="label">I am joining as</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {ROLES.map((role) => {
                  const active = form.role === role.value;
                  return (
                    <button
                      type="button"
                      key={role.value}
                      onClick={() => setForm((prev) => ({ ...prev, role: role.value }))}
                      className={`rounded-xl border p-3 text-left transition ${
                        active
                          ? 'border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/15'
                          : 'border-ink-200 bg-white hover:border-ink-300'
                      }`}
                      aria-pressed={active}
                    >
                      <span className="flex items-center gap-2 text-[13px] font-bold text-ink-900">
                        <span aria-hidden="true">{role.icon}</span>
                        {role.title}
                        {active && <span className="ml-auto text-brand-600">✓</span>}
                      </span>
                      <span className="mt-1 block text-[11.5px] leading-snug text-ink-500">{role.body}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="Full name" required error={errors.name}>
              <input
                value={form.name}
                onChange={update('name')}
                placeholder="Mia Chen"
                autoComplete="name"
                className="field"
              />
            </Field>

            <Field label="Email address" required error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@university.edu"
                autoComplete="email"
                className="field"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" required error={errors.password} hint={!errors.password ? 'Min. 8 characters' : ''}>
                <input
                  type="password"
                  value={form.password}
                  onChange={update('password')}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="field"
                />
              </Field>
              <Field label="Confirm password" required error={errors.confirm}>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={update('confirm')}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="field"
                />
              </Field>
            </div>

            <Field label="Short bio" hint="Optional — shown on your public profile.">
              <textarea
                rows={2}
                value={form.bio}
                onChange={update('bio')}
                placeholder="Second year CS student, interested in web platforms."
                className="field resize-none"
              />
            </Field>

            {serverError && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] font-medium text-rose-700">
                <span className="mt-px">⚠</span>
                {serverError}
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              Create account
            </Button>
          </form>

          <p className="mt-5 text-sm text-ink-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
