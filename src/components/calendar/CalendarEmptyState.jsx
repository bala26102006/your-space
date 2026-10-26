import React from 'react';

/**
 * CalendarEmptyState
 * Original SVG illustration for empty days / months in "Wall Calendar".
 * Uses theme tokens so it dynamically harmonizes in both Light and Dark modes.
 */
export default function CalendarEmptyState({
  title = "A Peaceful Day",
  subtitle = "Nothing scheduled for this date. Enjoy the space to think, create, or rest.",
  action = null
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center select-none">
      <div className="relative w-36 h-36 mb-4 flex items-center justify-center">
        <svg
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          {/* Wall shadow */}
          <rect x="28" y="28" width="104" height="112" rx="10" fill="currentColor" className="text-black/5 dark:text-white/5" />

          {/* Tear-off back sheets */}
          <rect x="25" y="25" width="104" height="110" rx="8" fill="var(--raised)" stroke="var(--border)" strokeWidth="1.5" />
          <rect x="28" y="28" width="104" height="106" rx="8" fill="var(--paper)" stroke="var(--border)" strokeWidth="1.5" />

          {/* Top binder band */}
          <path d="M28 36 C28 31.58 31.58 28 36 28 L124 28 C128.42 28 132 31.58 132 36 L132 54 L28 54 Z" fill="var(--accent)" />

          {/* Binder perforation line */}
          <line x1="28" y1="54" x2="132" y2="54" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Binder holes */}
          <circle cx="50" cy="38" r="4.5" fill="var(--bg)" stroke="var(--border)" strokeWidth="1.2" />
          <circle cx="80" cy="38" r="4.5" fill="var(--bg)" stroke="var(--border)" strokeWidth="1.2" />
          <circle cx="110" cy="38" r="4.5" fill="var(--bg)" stroke="var(--border)" strokeWidth="1.2" />

          {/* Calendar grid representation */}
          {/* Row 1 */}
          <circle cx="48" cy="70" r="3.5" fill="var(--border)" />
          <circle cx="64" cy="70" r="3.5" fill="var(--border)" />
          <circle cx="80" cy="70" r="3.5" fill="var(--accent)" fillOpacity="0.8" />
          <circle cx="96" cy="70" r="3.5" fill="var(--border)" />
          <circle cx="112" cy="70" r="3.5" fill="var(--border)" />

          {/* Row 2 */}
          <circle cx="48" cy="88" r="3.5" fill="var(--border)" />
          <circle cx="64" cy="88" r="3.5" fill="var(--border)" />
          <circle cx="80" cy="88" r="3.5" fill="var(--border)" />
          <circle cx="96" cy="88" r="3.5" fill="var(--border)" />
          <circle cx="112" cy="88" r="3.5" fill="var(--accent)" fillOpacity="0.4" />

          {/* Row 3 */}
          <circle cx="48" cy="106" r="3.5" fill="var(--border)" />
          <circle cx="64" cy="106" r="3.5" fill="var(--border)" />
          <circle cx="80" cy="106" r="3.5" fill="var(--border)" />
          <circle cx="96" cy="106" r="3.5" fill="var(--border)" />
          <circle cx="112" cy="106" r="3.5" fill="var(--border)" />

          {/* Leaf / feather quill accent */}
          <path
            d="M116 114 C124 106 136 102 138 92 C135 96 128 100 120 102 L116 114 Z"
            fill="var(--accent)"
            fillOpacity="0.75"
          />
          <path
            d="M120 102 L110 124"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h3 className="font-heading text-base font-bold text-text-primary mb-1">
        {title}
      </h3>
      <p className="text-xs text-text-muted max-w-xs leading-relaxed mb-4">
        {subtitle}
      </p>

      {action}
    </div>
  );
}
