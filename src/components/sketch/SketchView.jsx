import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Palette, Trash2, Calendar, Archive, Copy, Sparkles, Share2, Zap } from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useUIStore } from '../../store/uiStore';
import { db } from '../../lib/db';
import { 
  createSketchNote, 
  deleteSketchNote, 
  findExistingBlankSketch,
  duplicateSketchNote,
  migrateLegacySketchDoc
} from '../../lib/services/sketchService';
import { GridSkeleton } from '../shared/SkeletonLoader';
import { softDeleteItem, archiveItem } from '../../lib/services/trashService';
import { useConfirmStore } from '../../store/confirmStore';
import CanvasPresetsModal from './CanvasPresetsModal';
import ShareModal from './ShareModal';
import { DEFAULT_PRESET_KEY, CANVAS_PRESETS, BACKGROUND_PATTERNS } from '../../lib/sketch/types';


export default function SketchView() {
  const { selectedNoteId, setSelectedNoteId, viewMode } = useUIStore();
  const { openSoftDelete } = useConfirmStore();
  const [shareTarget, setShareTarget] = useState(null);

  // Fetch all non-deleted sketch notes
  const rawSketches = useLiveQuery(() => 
    db.notes
      .where('workspace_id').equals('sketch')
      .filter(n => !n.is_archived && !n.is_deleted)
      .reverse()
      .sortBy('created_at')
  , []);
  const sketches = rawSketches || [];
  const isLoading = rawSketches === undefined;

  // Fetch sketch attachments for thumbnail rendering
  const attachments = useLiveQuery(() => 
    db.attachments.where('type').equals('sketch').toArray()
  , []) || [];

  const attachmentMap = useMemo(() => {
    const map = new Map();
    attachments.forEach(att => {
      if (att.note_id) {
        map.set(att.note_id, att);
      }
    });
    return map;
  }, [attachments]);

  // Instant Doodle Start (opens full size canvas immediately without prompt)
  const handleInstantNewSketch = useCallback(async () => {
    try {
      const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const initialDoc = {
        version: 2,
        preset: 'free',
        width: 1200,
        height: 900,
        background: {
          id: isDarkMode ? 'dark' : 'white',
          pattern: 'grid',
          showGuides: true
        },
        layers: [
          {
            id: 'layer_bg_art',
            name: 'Artwork',
            type: 'drawing',
            visible: true,
            opacity: 1,
            items: []
          }
        ]
      };

      const newId = await createSketchNote('Untitled Sketch', '', initialDoc);
      setSelectedNoteId(newId);
    } catch (err) {
      console.error('Failed to create instant doodle:', err);
    }
  }, [setSelectedNoteId]);

  // Global Shortcut 'D' for Quick Doodle when in Sketch view
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedNoteId) return; // In editor already
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );
      if (!isTyping && (e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleInstantNewSketch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteId, handleInstantNewSketch]);

  const handleDuplicate = async (e, sketch) => {
    e.stopPropagation();
    try {
      const newId = await duplicateSketchNote(sketch.id);
      if (newId) {
        setSelectedNoteId(newId);
      }
    } catch (err) {
      console.error('Failed to duplicate sketch:', err);
    }
  };

  const handleShareSketch = (e, sketch) => {
    e.stopPropagation();
    const att = attachmentMap.get(sketch.id);
    const doc = sketch.content?.sketchDoc || att?.sketch_doc || migrateLegacySketchDoc(sketch, att);
    setShareTarget({
      doc,
      title: sketch.title || 'Untitled Sketch',
      description: sketch.content?.description || ''
    });
  };

  const handleDelete = (e, sketch) => {

    e.stopPropagation();
    openSoftDelete({
      title: sketch.title || 'Untitled Sketch',
      onConfirm: async () => {
        await softDeleteItem({
          id: sketch.id,
          type: 'note',
          title: sketch.title || 'Untitled Sketch',
          workspace: 'sketch',
        });
        if (selectedNoteId === sketch.id) {
          setSelectedNoteId(null);
        }
      },
    });
  };

  const handleArchive = async (e, sketch) => {
    e.stopPropagation();
    await archiveItem({
      id: sketch.id,
      type: 'note',
      title: sketch.title || 'Untitled Sketch',
      workspace: 'sketch',
    });
    if (selectedNoteId === sketch.id) {
      setSelectedNoteId(null);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="space-y-6 pb-16 min-w-0">
      {/* Workspace Header: Title & Description on left, New Sketch on right */}
      <div className="flex flex-wrap items-start justify-between gap-3 flex-shrink-0 min-w-0">
        <div className="min-w-0 pr-4 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
            <span className="text-xs font-semibold tracking-wider uppercase text-orange-500">
              Sketch Workspace
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-bold capitalize text-text-primary truncate tracking-tight leading-tight">
            Sketch Studio
          </h1>
          <p className="text-xs text-text-muted mt-0.5 max-w-prose">
            Freehand drawing, photo annotations, diagramming &amp; doodles with pressure-sensitive strokes.
          </p>
        </div>
        
        {/* Action buttons at top right */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstantNewSketch}
            className="flex items-center gap-1.5 px-3 py-2 bg-card-default border border-orange-500/30 text-orange-600 dark:text-orange-400 rounded-button text-xs font-semibold hover:bg-orange-500/10 active:scale-95 transition-all shadow-xs shrink-0 whitespace-nowrap"
            title="Instant blank canvas (Shortcut: D)"
            aria-label="Quick Doodle"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Quick Doodle</span>
            <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 bg-black/5 dark:bg-white/10 rounded text-[10px] font-mono">D</kbd>
          </button>

          <button
            onClick={handleInstantNewSketch}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 text-white rounded-button text-xs font-medium hover:bg-orange-600 active:scale-95 transition-all shadow-sm shrink-0 whitespace-nowrap"
            aria-label="Create new sketch"
          >
            <Plus className="w-4 h-4" />
            <span>New Sketch</span>
          </button>
        </div>
      </div>

      {/* Grid Pane: Smooth scrolling as one page */}
      <div className="space-y-4 min-w-0">
        {isLoading ? (
          <GridSkeleton count={4} />
        ) : sketches.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-2xl p-8 text-center bg-card-default/50">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/15 text-orange-500 flex items-center justify-center mb-3">
              <Palette className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-text-primary">No sketches yet</p>
            <p className="text-xs text-text-muted mt-1 max-w-xs">
              Start doodling instantly with full drawing tools, smooth inking, and photo annotations.
            </p>
            <button
              onClick={handleInstantNewSketch}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white hover:bg-orange-600 active:scale-95 rounded-button text-xs font-medium transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Sketch</span>
            </button>
          </div>
        ) : (
          <div className={viewMode === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4'}>
            {sketches.map((sketch) => {
              const attachment = attachmentMap.get(sketch.id);
              const isSelected = selectedNoteId === sketch.id;
              const dateStr = formatDate(attachment?.created_at || sketch.created_at);

              return (
                <div
                  key={sketch.id}
                  onClick={() => setSelectedNoteId(sketch.id)}
                  className={`relative group bg-card-default border ${
                    isSelected
                      ? 'border-orange-500 shadow-sm ring-1 ring-orange-500/20'
                      : 'border-black/5 dark:border-white/10'
                  } rounded-2xl cursor-pointer hover:scale-[1.01] hover:shadow-lg dark:hover:shadow-black/40 transition-all duration-200 ease-out flex ${viewMode === 'list' ? 'flex-row items-center h-20' : 'flex-col'} overflow-hidden`}
                >
                  {/* Thumbnail area */}
                  <div className={`${viewMode === 'list' ? 'w-28 h-full shrink-0 border-r border-b-0' : 'w-full aspect-[4/3] border-b'} bg-neutral-100 dark:bg-[#15171C] flex items-center justify-center p-2 relative overflow-hidden border-black/5 dark:border-white/5`}>
                    {attachment?.image_data ? (
                      <img
                        src={attachment.image_data}
                        alt={sketch.title || 'Sketch'}
                        className="w-full h-full object-contain pointer-events-none rounded-lg"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-text-muted opacity-40">
                        <Palette className="w-8 h-8 mb-1 text-orange-500" />
                        <span className="text-[10px]">Blank Canvas</span>
                      </div>
                    )}

                    {/* Hover actions: Share, Duplicate, Archive & Delete */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => handleShareSketch(e, sketch)}
                        className="w-8 h-8 rounded-lg bg-card-default/95 text-text-muted hover:text-orange-500 hover:bg-black/5 dark:hover:bg-white/10 shadow-sm flex items-center justify-center transition-colors"
                        title="Share & Export sketch"
                        aria-label="Share sketch"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDuplicate(e, sketch)}
                        className="w-8 h-8 rounded-lg bg-card-default/95 text-text-muted hover:text-orange-500 hover:bg-black/5 dark:hover:bg-white/10 shadow-sm flex items-center justify-center transition-colors"
                        title="Duplicate sketch"
                        aria-label="Duplicate sketch"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleArchive(e, sketch)}
                        className="w-8 h-8 rounded-lg bg-card-default/95 text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 shadow-sm flex items-center justify-center transition-colors"
                        title="Archive sketch"
                        aria-label="Archive sketch"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, sketch)}
                        className="w-8 h-8 rounded-lg bg-card-default/95 text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 shadow-sm flex items-center justify-center transition-colors"
                        title="Delete sketch"
                        aria-label="Delete sketch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-3.5 flex flex-col justify-between flex-1 bg-card-default min-w-0">
                    <h3 
                      className="text-xs font-semibold text-text-primary truncate" 
                      title={sketch.title || 'Untitled Sketch'}
                    >
                      {sketch.title || 'Untitled Sketch'}
                    </h3>

                    <div className={`flex items-center gap-1.5 text-[10px] text-text-muted ${viewMode === 'list' ? 'mt-1' : 'mt-2 pt-2 border-t border-black/5 dark:border-white/5'} min-w-0`}>
                      <Calendar className="w-3 h-3 opacity-60 shrink-0" />
                      <span className="truncate whitespace-nowrap">Created on {dateStr || 'Recent'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share & Export Modal for Card Quick Action */}
      <ShareModal
        isOpen={Boolean(shareTarget)}
        onClose={() => setShareTarget(null)}
        canvasDoc={shareTarget?.doc}
        title={shareTarget?.title}
        description={shareTarget?.description}
      />
    </div>
  );

}