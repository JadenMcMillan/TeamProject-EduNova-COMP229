import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);
let nextId = 1;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, tone = 'success') => {
      const id = nextId++;
      setToasts((list) => [...list, { id, message, tone }]);
      window.setTimeout(() => remove(id), 3800);
      return id;
    },
    [remove]
  );

  const value = useMemo(
    () => ({
      push,
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lift animate-slide-in ${
              toast.tone === 'error'
                ? 'border-rose-200 bg-white text-rose-700'
                : toast.tone === 'info'
                  ? 'border-brand-200 bg-white text-brand-800'
                  : 'border-emerald-200 bg-white text-emerald-800'
            }`}
          >
            <span
              className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full text-[11px] font-bold text-white ${
                toast.tone === 'error' ? 'bg-rose-500' : toast.tone === 'info' ? 'bg-brand-500' : 'bg-emerald-500'
              }`}
            >
              {toast.tone === 'error' ? '!' : toast.tone === 'info' ? 'i' : '✓'}
            </span>
            <p className="leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              className="ml-auto text-ink-400 transition hover:text-ink-700"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
