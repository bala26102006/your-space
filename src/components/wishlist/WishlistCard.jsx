import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Palette,
  Pin,
  Archive,
  Trash2,
  Calendar,
  Sparkles,
  ShoppingBag,
  BookOpen,
  Film,
  MapPin,
  Tag,
} from 'lucide-react';
import { COLOR_OPTIONS } from '../shared/ColorPicker';

export const CATEGORIES = [
  { id: 'All', label: 'All', icon: Sparkles },
  { id: 'Buy', label: 'Buy', icon: ShoppingBag, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { id: 'Learn', label: 'Learn', icon: BookOpen, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { id: 'Watch', label: 'Watch', icon: Film, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  { id: 'Place', label: 'Place', icon: MapPin, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'Other', label: 'Other', icon: Tag, color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
];

export function getColorClasses(color) {
  switch (color) {
    case 'yellow':
      return 'bg-card-yellow border-yellow-200/50 dark:border-yellow-900/30';
    case 'red':
      return 'bg-card-red border-red-200/50 dark:border-red-900/30';
    case 'blue':
      return 'bg-card-blue border-blue-200/50 dark:border-blue-900/30';
    case 'green':
      return 'bg-card-green border-green-200/50 dark:border-green-900/30';
    case 'purple':
      return 'bg-card-purple border-purple-200/50 dark:border-purple-900/30';
    default:
      return 'bg-card-default border-black/5 dark:border-white/10';
  }
}

export function formatPrice(p) {
  if (!p || p === 0) return 'Free / $0';
  return `$${Number(p).toFixed(2)}`;
}

export function getPriorityDot(p) {
  if (p === 'High') return 'bg-red-500 ring-red-500/30';
  if (p === 'Medium') return 'bg-amber-500 ring-amber-500/30';
  return 'bg-emerald-500 ring-emerald-500/30';
}

export function getCategoryMeta(catId) {
  return CATEGORIES.find((c) => c.id === catId) || CATEGORIES[1];
}

/**
 * Compact Wishlist Card component
 * - Max height 120px in grid view
 * - No massive aspect-video placeholder: only renders small 64x64 thumbnail if image exists
 * - Single-line ellipsis title
 * - Inline price and category chip
 * - 32px height pill "Check" button
 * - Actions visible on hover (desktop) and touch
 */
export default function WishlistCard({
  wish,
  isSelected = false,
  isCompleted = false,
  onSelect,
  onToggleGotIt,
  onColorChange,
  onPinToggle,
  onArchive,
  onDelete,
  activeColorWishId,
  setActiveColorWishId,
  isAnimating = false,
}) {
  const [showColorPopover, setShowColorPopover] = useState(false);
  const colorMenuRef = useRef(null);

  // Close color popover on outside click
  useEffect(() => {
    if (!showColorPopover) return;
    const handleClickOutside = (e) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target)) {
        setShowColorPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPopover]);

  const catMeta = getCategoryMeta(wish.category);
  const CatIcon = catMeta.icon;
  const hasImage = Boolean(wish.image && wish.image.trim && wish.image.trim().length > 0);

  return (
    <div
      onClick={() => onSelect?.(wish.id)}
      className={`group relative flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-md dark:hover:shadow-black/40 h-full max-h-[120px] select-none ${getColorClasses(
        wish.color
      )} ${
        isSelected
          ? 'ring-2 ring-[var(--accent)] shadow-card-hover border-[var(--accent)]/50'
          : 'border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/20'
      } ${isCompleted ? 'bg-black/[0.01] dark:bg-white/[0.01]' : ''}`}
    >
      <div className="wishlist-card-tag" aria-hidden="true" />
      {/* 1. Optional Left Thumbnail (64x64 rounded, only when image exists) */}
      {hasImage && (
        <div className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-xl overflow-hidden shrink-0 bg-black/5 dark:bg-white/5 relative border border-black/5 dark:border-white/10">
          {wish.image.startsWith('linear-gradient') ? (
            <div className="w-full h-full" style={{ background: wish.image }} />
          ) : (
            <img
              src={wish.image}
              alt={wish.title || 'Wish item'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
        </div>
      )}

      {/* 2. Main Content Container */}
      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
        {/* Top Row: Title + Quick Actions */}
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <h3
              className={`text-sm font-semibold truncate leading-tight ${
                isCompleted ? 'line-through text-text-muted opacity-75' : 'text-text-primary'
              }`}
              title={wish.title}
            >
              {wish.title || 'Untitled Wish'}
            </h3>
            {wish.is_pinned && (
              <Pin className="w-3 h-3 text-[var(--accent)] fill-[var(--accent)] shrink-0 opacity-100 sm:group-hover:opacity-0 transition-opacity" />
            )}
          </div>

          {/* Quick Actions (min 32px hit area, stopPropagation, visible on touch / hover) */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
            {/* Palette */}
            <div className="relative" ref={colorMenuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColorPopover(!showColorPopover);
                }}
                title="Change color"
                aria-label="Change wish color"
                className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
              {showColorPopover && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1 z-30 p-1.5 bg-bg-primary rounded-xl shadow-xl border border-black/10 dark:border-white/10 flex items-center gap-1.5"
                >
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={(e) => {
                        setShowColorPopover(false);
                        onColorChange?.(e, wish, c.id);
                      }}
                      title={c.label}
                      aria-label={`Select ${c.label} color`}
                      className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${
                        (wish.color || 'default') === c.id
                          ? 'ring-2 ring-[var(--workspace-accent)] ring-offset-1 scale-105'
                          : ''
                      }`}
                      style={{ backgroundColor: c.border }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pin */}
            <button
              type="button"
              onClick={(e) => onPinToggle?.(e, wish)}
              title={wish.is_pinned ? 'Unpin wish' : 'Pin wish'}
              aria-label={wish.is_pinned ? 'Unpin wish' : 'Pin wish'}
              className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Pin className={`w-3.5 h-3.5 ${wish.is_pinned ? 'fill-current text-[var(--accent)]' : ''}`} />
            </button>

            {/* Archive */}
            <button
              type="button"
              onClick={(e) => onArchive?.(e, wish)}
              title="Archive wish"
              aria-label="Archive wish"
              className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={(e) => onDelete?.(e, wish)}
              title="Delete wish"
              aria-label="Delete wish"
              className="w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Row: Category Chip, Priority Dot, Price, Check Button */}
        <div className="flex items-center justify-between gap-2 min-w-0 mt-2">
          {/* Metadata: Category, Priority, Price inline */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {/* Category Pill */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${catMeta.color}`}
            >
              <CatIcon className="w-2.5 h-2.5" />
              <span>{catMeta.label}</span>
            </span>

            {/* Priority Dot */}
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${getPriorityDot(wish.priority)}`}
              title={`${wish.priority} priority`}
            />

            {/* Inline Price */}
            <span className="text-xs font-bold text-[var(--accent-text)] shrink-0">
              {formatPrice(wish.price)}
            </span>
          </div>

          {/* "Check" / "Got it" Button: small pill, right-aligned, 32px height */}
          <button
            type="button"
            onClick={(e) => onToggleGotIt?.(e, wish)}
            className={`h-8 min-h-[32px] px-2.5 rounded-full flex items-center gap-1.5 text-xs font-medium shrink-0 transition-all active:scale-95 ${
              isCompleted
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-black/5 dark:bg-white/5 text-text-muted hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
            } ${isAnimating ? 'scale-105' : ''}`}
            title={isCompleted ? 'Mark as wishing' : 'Mark as got it!'}
            aria-label={isCompleted ? 'Mark as wishing' : 'Mark as got it'}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Circle className="w-3.5 h-3.5" />
            )}
            <span>{isCompleted ? 'Got it!' : 'Check'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
