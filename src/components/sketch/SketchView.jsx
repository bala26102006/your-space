import React, { useMemo } from 'react';
import { Plus, Palette, Trash2, Calendar, Sparkles, Archive } from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useUIStore } from '../../store/uiStore';
import { db } from '../../lib/db';
import { createSketchNote, deleteSketchNote, findExistingBlankSketch } from '../../lib/services/sketchService';
import { GridSkeleton } from '../shared/SkeletonLoader';
import { softDeleteItem, archiveItem } from '../../lib/services/trashService';
import { useConfirmStore } from '../../store/confirmStore';

export default function SketchView() {
  const { selectedNoteId, setSelectedNoteId } = useUIStore();
  const { openSoftDelete } = useConfirmStore();

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

  const handleCreateSketch = async () => {
    try {
      // Re-use existing blank untitled sketch to prevent duplicate clutter
      const existingBlankId = await findExistingBlankSketch();
      if (existingBlankId) {
        setSelectedNoteId(existingBlankId);
        return;
      }
      const newId = await createSketchNote('Untitled Sketch');
      setSelectedNoteId(newId);
    } catch (err) {
      console.error('Failed to create sketch:', err);
    }
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
    <div className="flex flex-col h-full overflow-hidden relative min-w-[320px]">
      {/* Workspace Header: Title & Description on left, New Sketch on right */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6 flex-shrink-0 min-w-0">
        <div className="min-w-0 pr-4 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--workspace-accent)] inline-block"></span>
            <span className="text-xs font-semibold tracking-wider uppercase text-[var(--workspace-accent)]">Sketch Workspace</span>
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-bold capitalize text-text-primary truncate tracking-tight leading-tight">
            Sketch
          </h1>
          <p className="text-xs text-text-muted mt-0.5 max-w-prose">
            Instant idea capture, diagrams, mind maps &amp; rough concepts.
          </p>
        </div>
        
        {/* + New Sketch button at top right */}
        <button
          onClick={handleCreateSketch}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--workspace-accent)] text-white rounded-button text-xs font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm shrink-0 whitespace-nowrap"
          aria-label="Create new sketch"
        >
          <Plus className="w-4 h-4" />
          <span>New Sketch</span>
        </button>
      </div>

      {/* Grid Pane: Smooth scrolling with padding and gap */}
      <div className="flex-1 overflow-y-auto pr-1 pb-8 min-w-0">
        {isLoading ? (
          <GridSkeleton count={4} />
        ) : sketches.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-2xl p-8 text-center bg-card-default/50">
            <div className="w-12 h-12 rounded-2xl bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] flex items-center justify-center mb-3">
              <Palette className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-text-primary">No sketches yet</p>
            <p className="text-xs text-text-muted mt-1 max-w-xs">
              Click + New Sketch to start drawing.
            </p>
            <button
              onClick={handleCreateSketch}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[var(--workspace-accent)] text-white hover:opacity-90 active:scale-95 rounded-button text-xs font-medium transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Sketch</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
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
                      ? 'border-[var(--workspace-accent)] shadow-sm ring-1 ring-[var(--workspace-accent)]/20'
                      : 'border-black/5 dark:border-white/10'
                  } rounded-2xl cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-black/40 transition-all duration-200 ease-out flex flex-col overflow-hidden`}
                >
                  {/* Thumbnail area */}
                  <div className="w-full aspect-[4/3] bg-white dark:bg-[#1A1A1A] flex items-center justify-center p-2 relative overflow-hidden border-b border-black/5 dark:border-white/5">
                    {attachment?.image_data ? (
                      <img
                        src={attachment.image_data}
                        alt={sketch.title || 'Sketch'}
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-text-muted opacity-40">
                        <Palette className="w-8 h-8 mb-1" />
                        <span className="text-[10px]">Blank Canvas</span>
                      </div>
                    )}

                    {/* Hover actions: Archive & Delete */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => handleArchive(e, sketch)}
                        className="p-1.5 rounded-lg bg-card-default/90 text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 shadow-xs"
                        title="Archive sketch"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, sketch)}
                        className="p-1.5 rounded-lg bg-card-default/90 text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 shadow-xs"
                        title="Delete sketch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Info: Title on one line with ellipsis, and date on one line */}
                  <div className="p-3.5 flex flex-col justify-between flex-1 bg-card-default min-w-0">
                    <h3 
                      className="text-xs font-semibold text-text-primary truncate" 
                      title={sketch.title || 'Untitled Sketch'}
                    >
                      {sketch.title || 'Untitled Sketch'}
                    </h3>

                    <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-2 pt-2 border-t border-black/5 dark:border-white/5 min-w-0">
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
    </div>
  );
}