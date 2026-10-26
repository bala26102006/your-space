import React, { useState, useEffect } from 'react';
import { History, BookOpen, Palette, ChevronRight } from 'lucide-react';
import { getHistoricalOnThisDay } from '../../lib/calendar/calendarService';
import { useUIStore } from '../../store/uiStore';

/**
 * OnThisDaySection
 * Displays nostalgic traces from past years or months for the selected date.
 */
export default function OnThisDaySection({ selectedDate }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!selectedDate) {
      setHistoryItems([]);
      return;
    }

    setIsLoading(true);
    getHistoricalOnThisDay(selectedDate)
      .then(items => {
        if (!cancelled) {
          setHistoryItems(items);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  if (historyItems.length === 0) return null;

  const handleOpenHistorical = (item) => {
    const payload = item.payload || {};
    useUIStore.setState({
      activeWorkspace: payload.workspace || item.source,
      selectedProjectId: null,
      selectedSubprojectId: null,
      selectedNoteId: payload.noteId || item.id,
      searchQuery: '',
      activeTagId: null,
    });
  };

  return (
    <div className="pt-3 border-t border-[var(--border)] space-y-2 select-none">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
        <History className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span className="text-[11px]">On this day in the past</span>
      </div>

      <div className="space-y-1.5">
        {historyItems.map((item) => {
          const isJournal = item.source === 'journal';
          const Icon = isJournal ? BookOpen : Palette;

          return (
            <div
              key={item.id}
              onClick={() => handleOpenHistorical(item)}
              role="button"
              tabIndex={0}
              className="p-2.5 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:border-[var(--accent)]/30 transition-all cursor-pointer flex items-center justify-between gap-2 group min-h-[42px]"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="p-1 rounded-lg bg-[var(--paper)] text-[var(--accent)] shrink-0 shadow-2xs">
                  <Icon className="w-3 h-3" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-[var(--accent-text)]">
                      {item.year}
                      {item.yearsAgo ? ` (${item.yearsAgo}y ago)` : ''}
                    </span>
                    <p className="text-xs font-medium text-text-primary truncate">
                      {item.title}
                    </p>
                  </div>
                  {item.excerpt && (
                    <p className="text-[10px] text-text-muted truncate mt-0.5">
                      {item.excerpt}
                    </p>
                  )}
                </div>
              </div>

              <ChevronRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
