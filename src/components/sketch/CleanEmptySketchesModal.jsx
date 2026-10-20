import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, X, CheckSquare, Square, Calendar, Sparkles } from 'lucide-react';
import { findOldEmptySketches, cleanupOldEmptySketches, formatRelativeTime } from '../../lib/services/sketchService';
import { reconcileSketchCache } from '../../lib/sketch/sketchCache';

export default function CleanEmptySketchesModal({ isOpen, onClose, onCleanComplete }) {
  const [loading, setLoading] = useState(true);
  const [emptySketches, setEmptySketches] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    findOldEmptySketches()
      .then((sketches) => {
        setEmptySketches(sketches);
        setSelectedIds(new Set(sketches.map((s) => s.id)));
      })
      .catch((err) => {
        console.error('Failed to find empty sketches:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === emptySketches.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emptySketches.map((s) => s.id)));
    }
  };

  const handleConfirmCleanup = async () => {
    if (selectedIds.size === 0) return;
    setIsCleaning(true);
    try {
      const cleanedCount = await cleanupOldEmptySketches(Array.from(selectedIds));
      await reconcileSketchCache();
      if (onCleanComplete) {
        onCleanComplete(cleanedCount);
      }
      onClose();
    } catch (err) {
      console.error('Error cleaning empty sketches:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cleanup-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="cleanup-modal-title" className="text-sm font-semibold text-text-primary">
                Clean Up Empty Sketches
              </h2>
              <p className="text-[11px] text-text-muted">
                Review and move untouched blank sketches to Trash
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-10 text-center text-xs text-text-muted">
              Scanning for untouched blank sketches...
            </div>
          ) : emptySketches.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                ✓
              </div>
              <p className="font-medium text-text-primary">No empty sketches found!</p>
              <p className="text-[11px]">All your sketches have drawings, notes, or photos.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5 text-xs text-text-muted">
                <span>Found {emptySketches.length} empty {emptySketches.length === 1 ? 'sketch' : 'sketches'}</span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-orange-600 dark:text-orange-400 font-medium hover:underline flex items-center gap-1"
                >
                  {selectedIds.size === emptySketches.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {emptySketches.map((sketch) => {
                  const isChecked = selectedIds.has(sketch.id);
                  return (
                    <label
                      key={sketch.id}
                      onClick={() => toggleSelect(sketch.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-orange-500/50 bg-orange-500/10'
                          : 'border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-orange-500 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-text-muted shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate">
                            {sketch.title || 'Untitled Sketch'}
                          </p>
                          <p className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 opacity-60" />
                            <span>{formatRelativeTime(sketch.created_at)}</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-text-muted px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 shrink-0">
                        Blank
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  Sketches moved to Trash can be restored anytime within 7 days from the Trash panel.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isCleaning}
            className="px-3.5 py-2 text-xs font-medium text-text-muted hover:text-text-primary rounded-button transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmCleanup}
            disabled={selectedIds.size === 0 || isCleaning || emptySketches.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-button text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              {isCleaning ? 'Cleaning...' : `Move ${selectedIds.size} to Trash`}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
