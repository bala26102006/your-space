import React, { useState, useRef, useEffect } from 'react';
import { Check, Palette } from 'lucide-react';

export const COLOR_OPTIONS = [
  { id: 'default', label: 'Default', bgLight: '#FFFFFF', bgDark: '#1A1D23', border: '#E5E7EB', borderDark: 'rgba(255,255,255,0.2)' },
  { id: 'yellow', label: 'Warm Mustard', bgLight: '#E6DAB9', bgDark: '#2E2718', border: '#E6DAB9', borderDark: '#FBBF24' },
  { id: 'red', label: 'Terracotta', bgLight: '#E8C9C1', bgDark: '#2E1B1B', border: '#E8C9C1', borderDark: '#F87171' },
  { id: 'blue', label: 'Dusty Blue', bgLight: '#B9C8D6', bgDark: '#162636', border: '#B9C8D6', borderDark: '#60A5FA' },
  { id: 'green', label: 'Sage', bgLight: '#C5D1C0', bgDark: '#182A1E', border: '#C5D1C0', borderDark: '#34D399' },
  { id: 'purple', label: 'Lavender', bgLight: '#D6CCE0', bgDark: '#271B33', border: '#D6CCE0', borderDark: '#A78BFA' },
];

export function getCardColorStyle(colorId) {
  switch (colorId) {
    case 'yellow':
      return 'bg-card-yellow';
    case 'red':
      return 'bg-card-red';
    case 'blue':
      return 'bg-card-blue';
    case 'green':
      return 'bg-card-green';
    case 'purple':
      return 'bg-card-purple';
    default:
      return 'bg-card-default';
  }
}

export default function ColorPicker({ 
  currentColor = 'default', 
  onChange, 
  usePopover = false,
  responsivePopover = true 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close popover on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const renderColorDots = (compact = false) => (
    <div className={`flex items-center ${compact ? 'gap-2 p-2' : 'gap-1.5 py-1'}`}>
      {COLOR_OPTIONS.map((opt) => {
        const isSelected = (currentColor || 'default') === opt.id;
        const dotBg = isDark ? opt.bgDark : opt.bgLight;
        const dotBorder = isDark ? (opt.borderDark || opt.border) : opt.border;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              onChange(opt.id);
              if (isOpen) setIsOpen(false);
            }}
            title={opt.label}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative border ${
              isSelected ? 'ring-2 ring-offset-1 ring-[var(--workspace-accent)] scale-105' : ''
            }`}
            style={{
              backgroundColor: dotBg,
              borderColor: dotBorder,
            }}
          >
            {isSelected && (
              <Check className="w-3.5 h-3.5 text-gray-800 dark:text-gray-100" />
            )}
          </button>
        );
      })}
    </div>
  );

  // If forced popover mode
  if (usePopover) {
    return (
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors flex items-center justify-center"
          title="Color options"
          aria-label="Color options"
        >
          <Palette className="w-4 h-4" />
        </button>
        {isOpen && (
          <div className="absolute right-0 top-full mt-1.5 z-30 bg-surface-card border border-[var(--border-color)] rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5">
            {renderColorDots(true)}
          </div>
        )}
      </div>
    );
  }

  // Responsive mode: popover on small screens (<640px), inline on desktop
  if (responsivePopover) {
    return (
      <div className="relative" ref={containerRef}>
        {/* Mobile / tight space popover trigger (<640px) */}
        <div className="sm:hidden">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors flex items-center justify-center"
            title="Color options"
            aria-label="Color options"
          >
            <Palette className="w-4 h-4" />
          </button>
          {isOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-30 bg-surface-card border border-[var(--border-color)] rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5">
              {renderColorDots(true)}
            </div>
          )}
        </div>

        {/* Desktop inline dots (>=640px) */}
        <div className="hidden sm:flex">
          {renderColorDots(false)}
        </div>
      </div>
    );
  }

  return renderColorDots(false);
}
