import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Layers,
  MoreVertical,
  Paperclip,
  Download,
  Trash2,
  HelpCircle,
  Settings2,
  Check,
  Eye,
  EyeOff,
  Share2,
  Play,
  Lock,
  Unlock,
  Sparkles
} from 'lucide-react';


export default function SketchTopBar({
  title,
  onChangeTitle,
  saveStatus,
  onBack,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onResetZoom,
  isFullscreen,
  onToggleFullscreen,
  layersCount,
  onToggleLayers,
  showLayers,
  onOpenShareModal,
  onOpenAttachModal,
  onOpenShortcuts,
  onExportPNG,
  onClearCanvas,
  onOpenCanvasPresetModal,
  showGuides,
  onToggleGuides,
  onOpenReplay,
  isPhotoLocked,
  onTogglePhotoLock,
  hasPhoto = false,
  symmetryMode
}) {

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMoreMenu]);

  return (
    <header className="h-12 shrink-0 px-2 sm:px-4 bg-card-default/95 backdrop-blur-md border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-2 z-30 select-none">
      {/* Left: Back button & Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1 max-w-[48%] sm:max-w-md">
        <button
          onClick={onBack}
          className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1 text-xs shrink-0"
          title="Back to Sketches"
          aria-label="Back to sketches"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden md:inline font-medium">Back</span>
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="Untitled Sketch"
            className="w-full min-w-[140px] text-xs sm:text-sm font-semibold bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted truncate focus:ring-1 focus:ring-orange-500 rounded px-1"
            title={title || 'Untitled Sketch'}
          />
          {saveStatus && (
            <span className="hidden sm:inline-flex items-center text-[10px] font-medium text-emerald-500 shrink-0">
              <Check className="w-3 h-3 mr-0.5" />
              {saveStatus}
            </span>
          )}
        </div>
      </div>

      {/* Center: Undo / Redo & Zoom Controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="flex items-center">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-25 transition-colors"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-25 transition-colors"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="hidden xs:flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-xl px-1 py-0.5 border border-black/5 dark:border-white/5">
          <button
            onClick={onZoomOut}
            className="p-1 rounded text-text-muted hover:text-text-primary"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFitToScreen}
            className="px-1.5 py-0.5 text-[10px] font-mono text-text-secondary hover:text-text-primary hover:underline"
            title="Fit canvas to screen"
          >
            {Math.round(zoom * 100)}%
          </button>
          {Math.round(zoom * 100) !== 100 && onResetZoom && (
            <button
              onClick={onResetZoom}
              className="px-1 py-0.5 text-[9px] font-mono text-orange-500 hover:underline"
              title="Reset to 100% actual size"
            >
              1:1
            </button>
          )}
          <button
            onClick={onZoomIn}
            className="p-1 rounded text-text-muted hover:text-text-primary"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Layers, Fullscreen, More */}
      <div className="flex items-center gap-1">
        {/* Layers Button */}
        <button
          onClick={onToggleLayers}
          className={`px-2 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
            showLayers
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10'
          }`}
          title="Layers panel"
          aria-label="Toggle layers"
        >
          <Layers className="w-4 h-4" />
          <span className="hidden md:inline">Layers</span>
          <span className={`text-[10px] px-1 rounded-full ${showLayers ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'}`}>
            {layersCount}
          </span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title={isFullscreen ? 'Exit fullscreen (F / Esc)' : 'Fullscreen studio (F)'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Symmetry Indicator Pill if active */}
        {symmetryMode && symmetryMode !== 'off' && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <Sparkles className="w-3 h-3" />
            <span>Symmetry</span>
          </span>
        )}

        {/* Photo Lock Pill (ONLY shown if document contains an imported photo) */}
        {hasPhoto && (
          <button
            type="button"
            onClick={onTogglePhotoLock}
            className={`px-2 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              isPhotoLocked
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-black/5 dark:bg-white/5 border-transparent text-text-muted hover:text-text-primary'
            }`}
            title={isPhotoLocked ? 'Photo locked for doodling. Tap to unlock' : 'Photo unlocked for moving'}
          >
            {isPhotoLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">{isPhotoLocked ? 'Photo Locked' : 'Unlocked'}</span>
          </button>
        )}

        {/* Replay Button */}
        {onOpenReplay && (
          <button
            type="button"
            onClick={onOpenReplay}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-black/10 dark:border-white/10 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Stroke-by-stroke replay animation"
            aria-label="Replay sketch"
          >
            <Play className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden sm:inline">Replay</span>
          </button>
        )}

        {/* Share & Export Button */}
        <button
          onClick={onOpenShareModal}
          className="px-2.5 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 active:scale-95 transition-all shadow-xs flex items-center gap-1.5"
          title="Share & Export"
          aria-label="Share sketch"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* More Actions Menu */}
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={() => setShowMoreMenu(prev => !prev)}
            className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="More actions"
            aria-label="More actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 top-10 z-50 w-52 bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenShareModal?.();
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-orange-500 hover:bg-orange-500/10 rounded-xl flex items-center gap-2"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="font-semibold">Export &amp; Share...</span>
              </button>

              {onOpenReplay && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onOpenReplay();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/10 rounded-xl flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 text-orange-500" />
                  <span>Drawing Replay...</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenCanvasPresetModal?.();
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/10 rounded-xl flex items-center gap-2"
              >
                <Settings2 className="w-3.5 h-3.5 text-text-muted" />
                <span>Change Canvas Size</span>
              </button>


              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onToggleGuides?.();
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/10 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {showGuides ? <Eye className="w-3.5 h-3.5 text-text-muted" /> : <EyeOff className="w-3.5 h-3.5 text-text-muted" />}
                  <span>Guide Pattern</span>
                </div>
                <span className="text-[10px] text-text-muted">{showGuides ? 'Shown' : 'Hidden'}</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenAttachModal?.();
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/10 rounded-xl flex items-center gap-2"
              >
                <Paperclip className="w-3.5 h-3.5 text-text-muted" />
                <span>Attach to Note</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onExportPNG?.();
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/10 rounded-xl flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-text-muted" />
                <span>Export as PNG</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenShortcuts?.();
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/10 rounded-xl flex items-center gap-2"
              >
                <HelpCircle className="w-3.5 h-3.5 text-text-muted" />
                <span>Keyboard Shortcuts (?)</span>
              </button>

              <div className="h-[1px] bg-black/5 dark:bg-white/5 my-1" />

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onClearCanvas?.();
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Canvas</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
