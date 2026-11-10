import { useEffect } from 'react';

/* ------------------------------------------------------------------ Button */
const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary:
    'bg-white text-ink-700 border border-ink-200 hover:border-ink-300 hover:bg-ink-50 disabled:text-ink-400',
  ghost: 'bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-900 disabled:text-ink-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:text-brand-300',
};

const SIZES = {
  sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  ...props
}) => (
  <button
    {...props}
    disabled={props.disabled || loading}
    className={`inline-flex select-none items-center justify-center font-semibold transition
      disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
  >
    {loading && <Spinner size={size === 'sm' ? 13 : 15} />}
    {children}
  </button>
);

/* ----------------------------------------------------------------- Spinner */
export const Spinner = ({ size = 16, className = '' }) => (
  <span
    className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent opacity-70 ${className}`}
    style={{ width: size, height: size }}
    aria-hidden="true"
  />
);

/* ------------------------------------------------------------------- Badge */
export const Badge = ({ children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold
      uppercase tracking-wide ring-1 ring-inset ${className}`}
  >
    {children}
  </span>
);

/* ------------------------------------------------------------------ Avatar */
export const Avatar = ({ name = '', size = 36, className = '' }) => {
  const text = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span
      className={`grid flex-none place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500
        font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {text || 'EN'}
    </span>
  );
};

/* ------------------------------------------------------------- ProgressBar */
export const ProgressBar = ({ value = 0, className = '', tone = 'brand' }) => (
  <div className={`h-2 w-full overflow-hidden rounded-full bg-ink-200 ${className}`}>
    <div
      className={`h-full rounded-full transition-all duration-500 ${
        tone === 'emerald' ? 'bg-emerald-500' : 'bg-gradient-to-r from-brand-500 to-violet-500'
      }`}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

/* --------------------------------------------------------------- EmptyState */
export const EmptyState = ({ icon = '📚', title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-ink-300 bg-white/70 px-6 py-14 text-center">
    <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-2xl">{icon}</div>
    <h3 className="text-base font-semibold text-ink-900">{title}</h3>
    {description && <p className="mt-1.5 max-w-md text-sm text-ink-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* --------------------------------------------------------------- PageHeader */
export const PageHeader = ({ eyebrow, title, description, actions }) => (
  <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
    <div>
      {eyebrow && (
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600">{eyebrow}</p>
      )}
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-[28px]">{title}</h1>
      {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-500">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

/* ------------------------------------------------------------------- Modal */
export const Modal = ({ open, onClose, title, description, children, footer, size = 'md' }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink-900/45 p-4 pt-[8vh] backdrop-blur-sm">
      <div
        className={`w-full ${width} animate-fade-in rounded-xl2 border border-ink-200 bg-white shadow-lift`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-ink-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-ink-100 bg-ink-50/60 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ ConfirmDialog */
export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Delete',
  loading = false,
  tone = 'danger',
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={tone} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-sm leading-relaxed text-ink-600">{description}</p>
  </Modal>
);

/* ----------------------------------------------------------------- Skeleton */
export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-xl bg-ink-200/70 ${className}`} />
);

/* ------------------------------------------------------------------- Field */
export const Field = ({ label, hint, error, required, children, className = '' }) => (
  <label className={`block ${className}`}>
    {label && (
      <span className="label">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
    )}
    {children}
    {error ? (
      <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>
    ) : (
      hint && <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>
    )}
  </label>
);
