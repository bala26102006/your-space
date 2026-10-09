import React, { useState, useEffect, useRef } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { useConfirmStore } from '../../store/confirmStore';

export default function DeleteConfirmModal() {
  const { isOpen, type, title, count, onConfirm, onCancel, close } = useConfirmStore();
  const [typedInput, setTypedInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTypedInput('');
      if (type === 'permanent') {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, type]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) onCancel();
    close();
  };

  const handleConfirm = () => {
    if (type === 'permanent' && typedInput !== 'DELETE') return;
    if (onConfirm) onConfirm();
    close();
  };

  const isPermanent = type === 'permanent';
  const isMultiple = count > 1;

  const softDeleteMessage = isMultiple
    ? `Move ${count} items to Trash? You can restore them for 7 days.`
    : `Move '${title}' to Trash? You can restore it for 7 days.`;

  const permanentDeleteMessage = isMultiple
    ? `Permanently delete ${count} items? This cannot be undone.`
    : `Permanently delete '${title}'? This cannot be undone.`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-md bg-bg-primary rounded-xl border border-black/10 dark:border-white/10 shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X */}
        <button
          onClick={handleCancel}
          aria-label="Close dialog"
          className="absolute right-4 top-4 p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isPermanent
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}
          >
            {isPermanent ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>

          <div className="flex-1 pr-6">
            <h3 className="text-base font-semibold text-text-primary">
              {isPermanent ? 'Permanently Delete' : 'Move to Trash?'}
            </h3>
            <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
              {isPermanent ? permanentDeleteMessage : softDeleteMessage}
            </p>
          </div>
        </div>

        {/* For Permanent Delete: Require typing "DELETE" */}
        {isPermanent && (
          <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10">
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              To confirm, type <span className="font-mono font-bold text-red-600 dark:text-red-400">DELETE</span> below:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="w-full px-3 py-2 text-xs bg-bg-secondary border border-black/10 dark:border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3.5 py-2 text-xs font-medium rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPermanent && typedInput !== 'DELETE'}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all shadow-xs ${
              isPermanent
                ? typedInput === 'DELETE'
                  ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                  : 'bg-red-400/40 text-white/50 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
            }`}
          >
            {isPermanent ? 'Permanently Delete' : 'Move to Trash'}
          </button>
        </div>
      </div>
    </div>
  );
}
