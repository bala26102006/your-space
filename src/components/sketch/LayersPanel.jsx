import React from 'react';
import { Layers, Eye, EyeOff, Plus, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';

export default function LayersPanel({
  isOpen,
  onClose,
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onToggleLayerVisibility,
  onDeleteLayer,
  onMoveLayer,
  onChangeLayerOpacity
}) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute top-14 right-4 z-40 w-64 bg-card-default/95 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-2xl shadow-xl p-3 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
          <Layers className="w-3.5 h-3.5 text-orange-500" />
          <span>Layers ({layers.length}/8)</span>
        </div>
        <div className="flex items-center gap-1">
          {layers.length < 8 && (
            <button
              onClick={onAddLayer}
              className="p-1 rounded-lg text-orange-500 hover:bg-orange-500/10 transition-colors"
              title="Add new drawing layer"
              aria-label="Add layer"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close layers"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Layer List (Rendered top-to-bottom as visual stack) */}
      <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-0.5">
        {[...layers].reverse().map((layer, revIdx) => {
          const originalIdx = layers.length - 1 - revIdx;
          const isActive = layer.id === activeLayerId;

          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all cursor-pointer ${
                isActive
                  ? 'border-orange-500 bg-orange-500/10 shadow-xs'
                  : 'border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {/* Visibility toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLayerVisibility(layer.id);
                }}
                className="p-1 rounded text-text-muted hover:text-text-primary"
                title={layer.visible ? 'Hide layer' : 'Show layer'}
              >
                {layer.visible ? (
                  <Eye className="w-3.5 h-3.5 text-orange-500" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 opacity-50" />
                )}
              </button>

              {/* Layer Title & Type */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text-primary truncate">
                  {layer.name || `Layer ${originalIdx + 1}`}
                </div>
                <div className="text-[10px] text-text-muted flex items-center gap-1">
                  <span className="capitalize">{layer.type || 'drawing'}</span>
                  <span>•</span>
                  <span>{Math.round((layer.opacity !== undefined ? layer.opacity : 1) * 100)}%</span>
                </div>
              </div>

              {/* Reorder & Delete Actions */}
              <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  disabled={originalIdx === layers.length - 1}
                  onClick={() => onMoveLayer(originalIdx, 1)}
                  className="p-1 text-text-muted hover:text-text-primary disabled:opacity-20 rounded"
                  title="Move layer up"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={originalIdx === 0}
                  onClick={() => onMoveLayer(originalIdx, -1)}
                  className="p-1 text-text-muted hover:text-text-primary disabled:opacity-20 rounded"
                  title="Move layer down"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                {layers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteLayer(layer.id)}
                    className="p-1 text-text-muted hover:text-red-500 rounded ml-1"
                    title="Delete layer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Layer Opacity Slider */}
      {(() => {
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer) return null;
        return (
          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-text-secondary">
              <span>Layer Opacity</span>
              <span>{Math.round((activeLayer.opacity ?? 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={activeLayer.opacity ?? 1}
              onChange={(e) => onChangeLayerOpacity(activeLayer.id, parseFloat(e.target.value))}
              className="w-full accent-orange-500 h-1.5 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
            />
          </div>
        );
      })()}
    </div>
  );
}
