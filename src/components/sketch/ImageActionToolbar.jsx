import React from 'react';
import { RotateCw, FlipHorizontal, FlipVertical, Trash2, Sliders, Image as ImageIcon, X } from 'lucide-react';

export default function ImageActionToolbar({
  activeImage,
  onRotate90,
  onFlipH,
  onFlipV,
  onChangeOpacity,
  onReplaceImage,
  onDeleteImage,
  onDeselect
}) {
  if (!activeImage) return null;

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card-default/95 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl px-3 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 text-xs font-semibold text-text-primary pr-2 border-r border-black/10 dark:border-white/10">
        <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
        <span className="hidden sm:inline">Image</span>
      </div>

      {/* Rotate 90 CW */}
      <button
        onClick={onRotate90}
        className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        title="Rotate 90° Clockwise"
        aria-label="Rotate 90 degrees"
      >
        <RotateCw className="w-4 h-4" />
      </button>

      {/* Flip Horizontal */}
      <button
        onClick={onFlipH}
        className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        title="Flip Horizontally"
        aria-label="Flip horizontal"
      >
        <FlipHorizontal className="w-4 h-4" />
      </button>

      {/* Flip Vertical */}
      <button
        onClick={onFlipV}
        className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        title="Flip Vertically"
        aria-label="Flip vertical"
      >
        <FlipVertical className="w-4 h-4" />
      </button>

      {/* Opacity slider */}
      <div className="flex items-center gap-1.5 px-2 border-l border-r border-black/10 dark:border-white/10">
        <Sliders className="w-3.5 h-3.5 text-text-muted" />
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={activeImage.opacity ?? 1}
          onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
          className="w-16 sm:w-20 accent-orange-500 h-1.5 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
          title={`Opacity: ${Math.round((activeImage.opacity ?? 1) * 100)}%`}
        />
        <span className="text-[10px] text-text-muted w-7 text-right">
          {Math.round((activeImage.opacity ?? 1) * 100)}%
        </span>
      </div>

      {/* Delete / Remove image */}
      <button
        onClick={onDeleteImage}
        className="p-1.5 rounded-xl text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        title="Delete image"
        aria-label="Delete image"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Done / Deselect */}
      <button
        onClick={onDeselect}
        className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 ml-1"
        title="Done transforming"
        aria-label="Done"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
