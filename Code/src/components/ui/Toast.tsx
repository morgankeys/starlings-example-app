import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from './Toast.module.css';

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: 'default' | 'success' | 'danger';
  action?: { label: string; onClick: () => void };
  /** Milliseconds before it dismisses itself. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

const ToastContext = createContext<((t: ToastOptions) => void) | null>(null);

/** Show a toast: `const toast = useToast(); toast({ title: 'Saved' })`. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback(
    (id: number) => setItems((all) => all.filter((t) => t.id !== id)),
    [],
  );

  const show = useCallback(
    (t: ToastOptions) => {
      const id = nextId.current++;
      setItems((all) => [...all.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.duration ?? (t.action ? 6000 : 4000));
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} role="region" aria-label="Notifications" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            data-component="Toast"
            data-tone={t.tone ?? 'default'}
            className={styles.toast}
          >
            {t.tone === 'success' && <CheckCircle2 className={styles.icon} aria-hidden />}
            {t.tone === 'danger' && <CircleAlert className={styles.icon} aria-hidden />}
            <div className={styles.text}>
              <p className={styles.title}>{t.title}</p>
              {t.description && <p className={styles.description}>{t.description}</p>}
            </div>
            {t.action && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              className={styles.close}
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
            >
              <X aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
