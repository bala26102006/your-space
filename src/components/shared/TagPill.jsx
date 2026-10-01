import React from 'react';
import { Tag as TagIcon, X } from 'lucide-react';

export default function TagPill({ label, active = false, onClick, onRemove }) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors duration-150 ${
        active
          ? 'bg-active-nav-bg text-text-primary border border-yellow-300/40'
          : 'bg-black/5 dark:bg-white/10 text-text-muted hover:text-text-primary'
      }`}
    >
      <TagIcon className="w-3 h-3 opacity-60" />
      <span>#{label}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-100 opacity-60 ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}
