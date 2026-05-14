"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map((t) => (
          <div key={t.id} className="toast" style={{
            borderColor: t.type === "success" ? "rgba(90,170,122,0.3)" : t.type === "error" ? "rgba(224,82,82,0.3)" : "var(--border-strong)"
          }}>
            {t.type === "success" && <CheckCircle size={15} color="var(--success)" />}
            {t.type === "error" && <XCircle size={15} color="var(--danger)" />}
            {t.type === "info" && <AlertTriangle size={15} color="var(--accent)" />}
            <span style={{ color: "var(--text-primary)", flex: 1 }}>{t.message}</span>
            <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex" }}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
