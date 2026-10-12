import React from 'react';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { key: 'P', desc: 'Pen tool' },
  { key: 'E', desc: 'Eraser (tap again to switch pixel/stroke)' },
  { key: 'V', desc: 'Select / Move tool' },
  { key: 'T', desc: 'Text tool' },
  { key: 'H', desc: 'Hand (Pan canvas)' },
  { key: '[  /  ]', desc: 'Decrease / Increase brush size' },
  { key: 'F', desc: 'Toggle Fullscreen' },
  { key: 'Ctrl + Z', desc: 'Undo' },
  { key: 'Ctrl + Y', desc: 'Redo' },
  { key: 'Ctrl + V', desc: 'Paste image from clipboard' },
  { key: 'Space + Drag', desc: 'Pan canvas' },
  { key: 'Ctrl + Scroll', desc: 'Zoom in / out' },
  { key: 'Shift + Drag', desc: 'Straight line / Square / Circle constraint' },
  { key: '?', desc: 'Show this cheat sheet' }
];

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-orange-500" />
            <h3 id="shortcuts-title" className="text-sm font-bold text-text-primary">
              Sketch Studio Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {SHORTCUTS.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-1 text-xs">
              <span className="text-text-secondary">{item.desc}</span>
              <kbd className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 font-mono text-[11px] text-text-primary font-medium">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
