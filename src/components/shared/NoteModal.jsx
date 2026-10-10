import React, { useRef, useEffect } from 'react';
import { X, Pin, Archive, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import SavedIndicator from '../cards/SavedIndicator';
import ColorPicker, { getCardColorStyle } from './ColorPicker';

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function NoteModal({
  isOpen = true,
  onClose,
  saveStatus,
  color = 'default',
  onColorChange,
  isPinned,
  onPinToggle,
  isArchived = false,
  onArchive,
  onDelete,
  isExpanded = false,
  onToggleExpand,
  customHeader,
  headerLeft,
  headerRight,
  children,
  footer,
  className = '',
  contentClassName = '',
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Focus trap & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    // Save previously focused element to restore on close
    previousActiveElement.current = document.activeElement;

    // Body scroll lock
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Auto-focus first meaningful input or button
    const timer = setTimeout(() => {
      if (!modalRef.current) return;
      const targetInput = modalRef.current.querySelector('input:not([type="hidden"]), textarea, [data-autofocus="true"]');
      if (targetInput) {
        targetInput.focus();
      } else {
        const firstFocusable = modalRef.current.querySelector(FOCUSABLE_SELECTOR);
        if (firstFocusable) firstFocusable.focus();
      }
    }, 40);

    // Keyboard handlers: Escape to close, Tab to cycle focus
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusable = Array.from(modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
          (el) => el.offsetParent !== null // ensure visible
        );

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevBodyOverflow;
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const colorClass = getCardColorStyle(color);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 overflow-hidden"
      role="presentation"
    >
      {/* Dim + Blur Backdrop: rgba(0,0,0,0.55) + backdrop-blur */}
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-sm z-0 transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Modal Window */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full h-full max-h-screen rounded-none sm:h-auto sm:max-h-[85vh] sm:rounded-2xl sm:shadow-2xl sm:shadow-black/30 dark:sm:shadow-black/70 border-0 sm:border border-black/10 dark:border-white/10 flex flex-col overflow-hidden transition-all duration-200 ${
          isExpanded ? 'sm:w-[min(1150px,96vw)] sm:max-h-[94vh]' : 'sm:w-[min(720px,92vw)]'
        } ${colorClass} ${className}`}
      >
        {/* Modal Header: One clean row, no overlap */}
        {customHeader ? (
          customHeader
        ) : (
          <div className="h-14 px-4 sm:px-5 flex items-center justify-between border-b border-black/5 dark:border-white/10 shrink-0 min-w-0 bg-bg-primary/95 dark:bg-bg-primary/95 backdrop-blur-sm z-10 select-none">
            {/* Left: X button + Saved status */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors flex items-center justify-center"
                title="Close (Esc)"
                aria-label="Close note editor"
              >
                <X className="w-4 h-4" />
              </button>
              {saveStatus && <SavedIndicator status={saveStatus} />}
              {headerLeft}
            </div>

            {/* Right: Extra actions, colour dots, pin, archive, delete, expand */}
            <div className="flex items-center gap-1 sm:gap-1.5 text-text-muted shrink-0 min-w-0">
              {headerRight}

              {/* Colour Dots (popover on small screens, inline on desktop) */}
              {onColorChange && (
                <ColorPicker
                  currentColor={color}
                  onChange={onColorChange}
                  responsivePopover={true}
                />
              )}

              {/* Pin */}
              {onPinToggle && (
                <button
                  type="button"
                  onClick={onPinToggle}
                  className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                    isPinned ? 'text-amber-500 fill-amber-500' : 'text-text-muted hover:text-text-primary'
                  }`}
                  title={isPinned ? 'Unpin note' : 'Pin note to top'}
                  aria-label={isPinned ? 'Unpin note' : 'Pin note'}
                >
                  <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                </button>
              )}

              {/* Archive */}
              {onArchive && (
                <button
                  type="button"
                  onClick={onArchive}
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
                  title={isArchived ? 'Unarchive' : 'Archive'}
                  aria-label={isArchived ? 'Unarchive' : 'Archive'}
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}

              {/* Delete */}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors"
                  title="Move to trash"
                  aria-label="Move to trash"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Expand / Minimize */}
              {onToggleExpand && (
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
                  title={isExpanded ? 'Collapse view' : 'Expand view'}
                  aria-label={isExpanded ? 'Collapse view' : 'Expand view'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Modal Content */}
        <div className={`pane-scroller flex-1 overflow-y-auto overflow-x-hidden min-h-0 flex flex-col p-4 sm:p-6 [scrollbar-gutter:stable] [overscroll-behavior:contain] ${contentClassName}`}>
          {children}
        </div>

        {/* Fixed Toolbar / Footer (if present) */}
        {footer && (
          <div className="shrink-0 border-t border-black/5 dark:border-white/10 bg-bg-sidebar/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
