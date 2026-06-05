"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 3000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => add("success", m),
      error: (m) => add("error", m),
      info: (m) => add("info", m),
    }),
    [add],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

const TOAST_STYLES: Record<ToastKind, { container: string; icon: string }> = {
  success: {
    container: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
    icon: "✓",
  },
  error: {
    container: "border-rose-300/40 bg-rose-300/10 text-rose-100",
    icon: "✕",
  },
  info: {
    container: "border-cyan-300/40 bg-cyan-300/10 text-cyan-100",
    icon: "ℹ",
  },
};

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-atomic="false"
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastBubble key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastBubble({ toast }: { toast: ToastItem }) {
  const { container, icon } = TOAST_STYLES[toast.kind];
  return (
    <div
      className={`pointer-events-auto flex min-w-[220px] max-w-sm items-start gap-2 rounded border px-4 py-3 text-sm shadow-xl shadow-black/40 backdrop-blur-sm ${container}`}
    >
      <span aria-hidden="true" className="mt-px shrink-0 font-black">
        {icon}
      </span>
      <span className="leading-5">{toast.message}</span>
    </div>
  );
}
