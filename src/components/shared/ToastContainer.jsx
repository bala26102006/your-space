import React from 'react';
import { X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

export default function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between gap-3 p-3.5 bg-[#1A1D23] text-[#ECEEF2] border border-white/10 rounded-xl shadow-2xl transition-all duration-200 transform translate-y-0"
        >
          <span className="text-xs sm:text-sm font-medium flex-1 line-clamp-2">
            {toast.message}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  try {
                    toast.action.onClick();
                  } catch (err) {
                    console.error('Toast action failed:', err);
                  }
                  dismissToast(toast.id);
                }}
                className="px-2.5 py-1 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-md transition-colors"
              >
                {toast.action.label || 'Undo'}
              </button>
            )}

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-md text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
