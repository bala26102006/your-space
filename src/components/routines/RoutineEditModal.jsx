import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { db } from '../../lib/db';
import { COLOR_OPTIONS } from '../shared/ColorPicker';

export default function RoutineEditModal({ routine, isOpen, onClose }) {
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [color, setColor] = useState('default');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (routine) {
      setTitle(routine.title || '');
      setFrequency(routine.content?.frequency || 'daily');
      setColor(routine.color || routine.content?.color || 'default');
    }
  }, [routine, isOpen]);

  if (!isOpen || !routine) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await db.notes.update(routine.id, {
        title: title.trim(),
        color: color,
        content: {
          ...(typeof routine.content === 'object' && routine.content !== null ? routine.content : {}),
          frequency,
          color,
        },
        updated_at: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      console.error('Failed to update routine:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-bg-primary w-full max-w-md rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 p-6 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <h2 className="text-lg font-semibold text-text-primary tracking-tight">Edit Routine</h2>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Routine Title
            </label>
            <input 
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read 15 Minutes"
              required
              className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-text-primary/20 transition-all"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
              ].map((opt) => {
                const isSelected = frequency === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFrequency(opt.id)}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-bg-sidebar border-black/20 dark:border-white/20 text-text-primary shadow-sm font-semibold'
                        : 'border-transparent text-text-muted hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pastel Color Palette */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Card Color
            </label>
            <div className="flex items-center gap-3 py-1">
              {COLOR_OPTIONS.map((opt) => {
                const isSelected = color === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setColor(opt.id)}
                    title={opt.label}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 relative border ${
                      isSelected ? 'ring-2 ring-offset-2 ring-text-primary scale-105' : 'border-black/10 dark:border-white/10'
                    }`}
                    style={{
                      backgroundColor: opt.bgLight,
                      borderColor: opt.border,
                    }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-gray-800" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/5 dark:border-white/5 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-text-muted hover:bg-black/5 dark:hover:bg-white/5 rounded-button transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2 text-xs font-semibold bg-text-primary text-bg-primary rounded-button shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
