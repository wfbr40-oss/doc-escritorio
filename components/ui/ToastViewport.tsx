'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

const TOAST_EVENT = 'app:toast';
const TOAST_DURATION_MS = 5000;

function dispatchToast(type: ToastType, message: string) {
  if (typeof window === 'undefined' || !message) return;
  window.dispatchEvent(
    new CustomEvent<{ type: ToastType; message: string }>(TOAST_EVENT, {
      detail: { type, message },
    })
  );
}

export const showToast = {
  success(message: string) {
    dispatchToast('success', message);
  },
  error(message: string) {
    dispatchToast('error', message);
  },
};

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const timers = new Map<string, number>();

    const removerToast = (id: string) => {
      const timer = timers.get(id);
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timers.delete(id);
      }
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const handleToastEvent = (event: Event) => {
      const custom = event as CustomEvent<{ type: ToastType; message: string }>;
      const detail = custom.detail;
      if (!detail?.message) return;

      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type: detail.type, message: detail.message }]);

      const timerId = window.setTimeout(() => {
        removerToast(id);
      }, TOAST_DURATION_MS);
      timers.set(id, timerId);
    };

    window.addEventListener(TOAST_EVENT, handleToastEvent);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToastEvent);
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const fecharToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2.5rem)] pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const ehErro = toast.type === 'error';
          return (
            <motion.div
              key={toast.id}
              role={ehErro ? 'alert' : 'status'}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-auto rounded-xl border p-4 shadow-xl backdrop-blur-sm flex items-start gap-3 ${
                ehErro
                  ? 'bg-slate-900/95 border-red-700/70 text-red-100'
                  : 'bg-slate-900/95 border-emerald-700/70 text-emerald-100'
              }`}
            >
              {ehErro ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}

              <p className="text-xs leading-relaxed flex-1">{toast.message}</p>

              <button
                type="button"
                onClick={() => fecharToast(toast.id)}
                aria-label="Fechar aviso"
                className="p-0.5 rounded text-slate-400 hover:text-white transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
