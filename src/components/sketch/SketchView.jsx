import React, { useState } from 'react';
import { Plus, Palette, Trash2 } from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useUIStore } from '../../store/uiStore';
import { db } from '../../lib/db';

export default function SketchView() {
  const { selectedNoteId, setSelectedNoteId } = useUIStore();

  // Fetch sketch notes
  const sketches = useLiveQuery(() => 
    db.notes.where('workspace_id').equals('sketch')
      .filter(n => !n.is_archived && !n.is_deleted)
      .reverse().sortBy('created_at')
  , []) || [];

  // Fetch corresponding attachments
  const attachments = useLiveQuery(() => db.attachments.toArray(), []) || [];

  const handleCreateSketch = async () => {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    await db.notes.add({
      id: newId,
      user_id: 'local_user',
      workspace_id: 'sketch',
      subproject_id: null,
      note_type: 'sketch',
      title: 'New Sketch',
      content: {},
      is_pinned: false,
      is_archived: false,
      is_deleted: false,
      sort_order: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setSelectedNoteId(newId);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await db.notes.update(id, {
      is_deleted: true,
      deleted_at: new Date().toISOString()
    });
    if (selectedNoteId === id) setSelectedNoteId(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold capitalize text-text-primary">Sketch & Draw</h1>
          <p className="text-xs text-text-muted mt-0.5">Jot down visual ideas on an endless canvas.</p>
        </div>
        
        <button
          onClick={handleCreateSketch}
          className="flex items-center gap-1.5 px-3 py-2 bg-text-primary text-bg-primary rounded-button text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Sketch</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-6">
        {sketches.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-card p-8 text-center bg-card-default">
            <Palette className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No sketches yet</p>
            <p className="text-xs opacity-70 mt-1 max-w-xs">Click "New Sketch" to draw something.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sketches.map(sketch => {
              const attachment = attachments.find(a => a.note_id === sketch.id && a.type === 'sketch');
              return (
                <div 
                  key={sketch.id} 
                  onClick={() => setSelectedNoteId(sketch.id)}
                  className={`relative group bg-card-default border ${selectedNoteId === sketch.id ? 'border-blue-500/50 shadow-sm' : 'border-black/5 dark:border-white/10'} rounded-card cursor-pointer hover:shadow-card-hover dark:hover:shadow-card-hover-dark transition-all flex flex-col overflow-hidden h-48`}
                >
                  {attachment?.image_data ? (
                    <div className="w-full h-full bg-white dark:bg-black/20 flex items-center justify-center p-2">
                      <img src={attachment.image_data} alt="Sketch" className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-text-muted">
                      <Palette className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                  
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm font-medium truncate">{sketch.title}</span>
                    <button onClick={(e) => handleDelete(e, sketch.id)} className="text-white hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}