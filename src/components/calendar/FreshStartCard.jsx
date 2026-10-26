import React, { useState, useEffect } from 'react';
import { Compass, X, Sparkles } from 'lucide-react';
import { getFreshStartInfo, getTodayStr } from '../../lib/calendar/calendarUtils';

/**
 * FreshStartCard
 * Gentle prompt on Mondays or start of month ("New week, clear horizon").
 * Persists dismissal so it only appears once per cycle.
 */
export default function FreshStartCard() {
  const [info, setInfo] = useState(null);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const todayStr = getTodayStr();
    const fresh = getFreshStartInfo(todayStr);
    if (fresh) {
      const dismissed = localStorage.getItem(fresh.key);
      if (!dismissed) {
        setInfo(fresh);
        setIsDismissed(false);
      }
    }
  }, []);

  if (isDismissed || !info) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(info.key, 'dismissed');
    } catch (e) {}
  };

  return (
    <div className="mb-3 shrink-0 p-3 sm:p-3.5 rounded-2xl bg-teal-500/[0.06] border border-teal-500/20 shadow-xs flex items-center justify-between gap-3 select-none animate-in fade-in duration-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 fill-[var(--accent)]/20" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-text-primary tracking-tight truncate">
            {info.title}
          </h4>
          <p className="text-[11px] text-text-muted truncate">
            {info.message}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
