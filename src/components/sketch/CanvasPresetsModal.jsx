import React, { useState } from 'react';
import { X, Sparkles, Check, Monitor, Square, Smartphone, Film, FileText, CheckCircle2 } from 'lucide-react';
import { CANVAS_PRESETS, BACKGROUND_PATTERNS, DEFAULT_PRESET_KEY } from '../../lib/sketch/types';

export default function CanvasPresetsModal({ isOpen, onClose, onSelectPreset }) {
  const [selectedPresetId, setSelectedPresetId] = useState(() => {
    return localStorage.getItem(DEFAULT_PRESET_KEY) || 'free';
  });
  const [selectedBgId, setSelectedBgId] = useState('dark');
  const [showGuides, setShowGuides] = useState(true);

  if (!isOpen) return null;

  const handleConfirm = () => {
    localStorage.setItem(DEFAULT_PRESET_KEY, selectedPresetId);
    const preset = CANVAS_PRESETS.find(p => p.id === selectedPresetId) || CANVAS_PRESETS[0];
    const bg = BACKGROUND_PATTERNS.find(b => b.id === selectedBgId) || BACKGROUND_PATTERNS[1];
    onSelectPreset({
      preset,
      background: { ...bg, showGuides }
    });
  };

  const getPresetIcon = (id) => {
    switch (id) {
      case 'square': return <Square className="w-5 h-5" />;
      case 'portrait': return <Smartphone className="w-5 h-5" />;
      case 'story': return <Smartphone className="w-5 h-5 rotate-90" />;
      case 'landscape': return <Film className="w-5 h-5" />;
      case 'a4': return <FileText className="w-5 h-5" />;
      default: return <Monitor className="w-5 h-5" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preset-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="preset-modal-title" className="text-base font-bold text-text-primary">
                New Sketch Canvas
              </h2>
              <p className="text-xs text-text-muted">Choose your canvas aspect ratio and background</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas Size Presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Canvas Size
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CANVAS_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500/10 shadow-sm ring-1 ring-orange-500/30'
                      : 'border-black/5 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className={isSelected ? 'text-orange-500' : 'text-text-muted'}>
                      {getPresetIcon(preset.id)}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-500" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary leading-tight">
                      {preset.label}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
                      {preset.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Background & Patterns */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Background Style
            </label>
            <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={showGuides}
                onChange={(e) => setShowGuides(e.target.checked)}
                className="rounded accent-orange-500"
              />
              <span>Show guides</span>
            </label>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {BACKGROUND_PATTERNS.map((bg) => {
              const isSelected = selectedBgId === bg.id;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setSelectedBgId(bg.id)}
                  className={`py-2 px-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500/10 font-semibold text-orange-500'
                      : 'border-black/5 dark:border-white/10 text-text-secondary hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px] truncate w-full">{bg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5 dark:border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition-all shadow-md flex items-center gap-1.5"
          >
            <span>Create Canvas</span>
          </button>
        </div>
      </div>
    </div>
  );
}
