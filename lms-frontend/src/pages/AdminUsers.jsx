import { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
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
import { fullDate } from '../lib/format';

const ROLE_STYLES = {
  admin: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  instructor: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  student: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
};

const ROLE_FILTERS = [
  { value: '', label: 'All roles' },
  { value: 'student', label: 'Students' },
  { value: 'instructor', label: 'Instructors' },
  { value: 'admin', label: 'Admins' },
];

const PAGE_SIZE = 8;
const BLANK = { name: '', email: '', password: '', role: 'student', bio: '', isActive: true };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(null); // { mode:'create'|'edit', user }
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.listUsers({ page, limit: PAGE_SIZE, role, search });
      setUsers(res.data || []);
      setMeta({ total: res.pagination?.total ?? 0, pages: res.pagination?.pages ?? 1 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, role, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(BLANK);
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (user) => {
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      bio: user.bio || '',
      isActive: user.isActive !== false,
    });
    setFormError('');
    setModal({ mode: 'edit', user });
  };

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    if (modal.mode === 'create' && form.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await api.createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          bio: form.bio.trim(),
        });
        toast.success('User created.');
      } else {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          bio: form.bio.trim(),
          isActive: form.isActive,
        };
        if (form.password) payload.password = form.password;
        await api.updateUser(modal.user._id, payload);
        toast.success('User updated.');
      }
      setModal(null);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteUser(deleteTarget._id);
      toast.success('User deleted.');
      setDeleteTarget(null);
      if (users.length === 1 && page > 1) setPage((value) => value - 1);
      else load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container-page py-9">
      <PageHeader
        eyebrow="Administration"
        title="User management"
        description="Create, edit and remove accounts. Role changes take effect on the next request — the API re-checks on every call."
        actions={<Button onClick={openCreate}>+ New user</Button>}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {ROLE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setRole(filter.value);
                  setPage(1);
                }}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  role === filter.value
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name or email…"
            className="h-9 w-full max-w-[280px] rounded-lg border border-ink-200 px-3 text-[13px] placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
            aria-label="Search users"
          />
        </div>

        {error ? (
          <div className="p-6 text-sm text-rose-700">{error}</div>
        ) : loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-6">
            <EmptyState icon="👤" title="No users match" description="Try a different search term or role filter." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                  <th className="px-5 py-3">User</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {users.map((user) => (
                  <tr key={user._id} className="transition hover:bg-ink-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size={34} />
                        <div>
                          <p className="font-semibold text-ink-900">
                            {user.name}
                            {user._id === me?._id && (
                              <span className="ml-2 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[11.5px] text-ink-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge className={ROLE_STYLES[user.role]}>{user.role}</Badge>
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium ${
                          user.isActive ? 'text-emerald-600' : 'text-ink-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-ink-300'}`}
                        />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-[12.5px] text-ink-500">{fullDate(user.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(user)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={user._id === me?._id}
                          onClick={() => setDeleteTarget(user)}
                          title={user._id === me?._id ? 'You cannot delete your own account' : 'Delete user'}
                        >
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-5 py-3.5">
          <p className="text-[12.5px] text-ink-500">
            {meta.total} user{meta.total === 1 ? '' : 's'} · page {page} of {meta.pages}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              ← Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= meta.pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next →
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Create a user' : `Edit ${modal?.user?.name || 'user'}`}
        description={
          modal?.mode === 'create'
            ? 'Admins can create any role, including another administrator.'
            : 'Leave the password blank to keep the current one.'
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saving}>
              {modal?.mode === 'create' ? 'Create user' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <input value={form.name} onChange={update('name')} className="field" placeholder="Mia Chen" />
            </Field>
            <Field label="Email" required>
              <input type="email" value={form.email} onChange={update('email')} className="field" placeholder="mia@student.dev" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role">
              <select value={form.role} onChange={update('role')} className="field">
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field
              label={modal?.mode === 'create' ? 'Password' : 'New password'}
              required={modal?.mode === 'create'}
              hint="Minimum 8 characters"
            >
              <input
                type="password"
                value={form.password}
                onChange={update('password')}
                className="field"
                placeholder="••••••••"
              />
            </Field>
          </div>

          <Field label="Bio">
            <textarea rows={2} value={form.bio} onChange={update('bio')} className="field resize-none" />
          </Field>

          {modal?.mode === 'edit' && (
            <label className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-3">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={update('isActive')}
                className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-[13px] font-medium text-ink-700">Account is active</span>
            </label>
          )}

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
        onConfirm={removeUser}
        loading={deleting}
        title="Delete this user?"
        confirmLabel="Delete user"
        description={`${deleteTarget?.name} (${deleteTarget?.email}) will be permanently removed. Their enrolments are cleaned up by the API.`}
      />
    </div>
  );
}
