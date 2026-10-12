import React, { useState } from 'react';
import { X, Smile, Sparkles, Brush } from 'lucide-react';
import { STAMPS } from '../../lib/sketch/types';

export default function StickerPickerModal({
  isOpen,
  onClose,
  onSelectSticker,
  onEnableStampBrush,
  activeStampBrush,
  currentStamp = '⭐'
}) {
  const [recentStamps, setRecentStamps] = useState(() => {
    try {
      const saved = localStorage.getItem('yourspace_recent_stamps');
      return saved ? JSON.parse(saved) : ['⭐', '❤️', '🔥', '✨', '⚡', '🌸'];
    } catch {
      return ['⭐', '❤️', '🔥', '✨', '⚡', '🌸'];
    }
  });

  if (!isOpen) return null;

  const handlePick = (emoji, isBrush = false) => {
    // Update recents
    const updated = [emoji, ...recentStamps.filter(s => s !== emoji)].slice(0, 12);
    setRecentStamps(updated);
    try {
      localStorage.setItem('yourspace_recent_stamps', JSON.stringify(updated));
    } catch {}

    if (isBrush) {
      onEnableStampBrush(emoji);
    } else {
      onSelectSticker(emoji);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stamp-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <h3 id="stamp-modal-title" className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Stamps &amp; Stickers
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mode Toggle Banner */}
        <div className="flex items-center gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => handlePick(currentStamp, false)}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5 ${
              !activeStampBrush
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Single Stamp</span>
          </button>
          <button
            type="button"
            onClick={() => handlePick(currentStamp, true)}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1.5 ${
              activeStampBrush
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Brush className="w-3.5 h-3.5" />
            <span>Stamp Brush</span>
          </button>
        </div>

        {/* Recently Used */}
        {recentStamps.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              Recently Used
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {recentStamps.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePick(emoji, activeStampBrush)}
                  className="w-9 h-9 shrink-0 flex items-center justify-center text-xl rounded-xl bg-black/5 dark:bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 border border-transparent transition-transform hover:scale-110 active:scale-95"
                  title={`Select ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Full Stamps Grid */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
            All Doodle Stamps
          </span>
          <div className="grid grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1 no-scrollbar">
            {STAMPS.map((emoji, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePick(emoji, activeStampBrush)}
                className="w-10 h-10 flex items-center justify-center text-2xl rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-transform"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
