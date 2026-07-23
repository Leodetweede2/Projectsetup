"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { IconCheck, IconClose } from "@/components/icons";

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastCtx = createContext<(message: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

const toneClasses: Record<Tone, string> = {
  success:
    "border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-200",
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-200",
  info: "border-line bg-surface text-ink",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const remove = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (message: string, tone: Tone = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, tone }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove],
  );

  return (
    <ToastCtx.Provider value={push}>
      {children}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className={cn(
                  "pointer-events-auto flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lifted",
                  toneClasses[t.tone],
                )}
              >
                {t.tone === "success" && (
                  <span className="mt-0.5 shrink-0">
                    <IconCheck width={16} height={16} />
                  </span>
                )}
                <span className="flex-1">{t.message}</span>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => remove(t.id)}
                  className="shrink-0 opacity-60 hover:opacity-100"
                >
                  <IconClose width={14} height={14} />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastCtx.Provider>
  );
}

/** Fire a success/error toast whenever a server-action result changes. */
export function useActionToast(state: { success?: string; error?: string }) {
  const toast = useToast();
  const last = useRef<string | undefined>(undefined);
  useEffect(() => {
    const msg = state.success ?? state.error;
    if (!msg || msg === last.current) return;
    last.current = msg;
    toast(msg, state.success ? "success" : "error");
  }, [state.success, state.error, toast]);
}
