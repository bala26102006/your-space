import React, { useRef, useState, useEffect } from 'react';
import { X, Save, Eraser, PenTool, Trash2, Link as LinkIcon } from 'lucide-react';
import { db } from '../../lib/db';
import { useLiveQuery } from '../../hooks/useLiveQuery';

export default function SketchEditor({ note, onClose }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#2C2A28'); // Default dark
  const [lineWidth, setLineWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [savedStatus, setSavedStatus] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  
  // Fetch existing attachment
  const attachment = useLiveQuery(() => 
    db.attachments.where('note_id').equals(note.id).filter(a => a.type === 'sketch').first()
  , [note.id]);

  // Fetch all other notes for attaching
  const allNotes = useLiveQuery(() => 
    db.notes.toArray()
  , []) || [];
  
  const eligibleNotes = allNotes.filter(n => 
    !n.is_deleted && 
    (n.workspace_id === 'quicknotes' || n.workspace_id === 'projects' || n.workspace_id === 'journal')
  );

  useEffect(() => {
    if (attachment && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = attachment.image_data;
    }
  }, [attachment]);

  // Init canvas white background if no attachment
  useEffect(() => {
    if (canvasRef.current && !attachment) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [attachment]);

  const startDrawing = (e) => {
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(offsetX, offsetY);
    ctx.strokeStyle = isEraser ? '#FFFFFF' : color;
    ctx.lineWidth = isEraser ? 20 : lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.closePath();
      setIsDrawing(false);
    }
  };

  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (event.touches && event.touches.length > 0) {
      return {
        offsetX: event.touches[0].clientX - rect.left,
        offsetY: event.touches[0].clientY - rect.top
      };
    }
    return {
      offsetX: event.nativeEvent.offsetX,
      offsetY: event.nativeEvent.offsetY
    };
  };

  const handleClear = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleSave = async () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    if (attachment) {
      await db.attachments.update(attachment.id, {
        image_data: dataUrl
      });
    } else {
      await db.attachments.add({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        note_id: note.id,
        type: 'sketch',
        image_data: dataUrl,
        created_at: new Date().toISOString()
      });
    }
    setSavedStatus('Saved!');
    setTimeout(() => setSavedStatus(''), 2000);
  };

  const handleSaveToNote = async (targetNoteId) => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    await db.attachments.add({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      note_id: targetNoteId,
      type: 'sketch',
      image_data: dataUrl,
      created_at: new Date().toISOString()
    });
    setSavedStatus('Attached!');
    setShowAttachMenu(false);
    setTimeout(() => setSavedStatus(''), 2000);
  };

  const handleTitleChange = async (e) => {
    await db.notes.update(note.id, { title: e.target.value });
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5 shrink-0">
        <input 
          type="text" 
          defaultValue={note.title} 
          onBlur={handleTitleChange}
          className="font-semibold text-text-primary text-lg bg-transparent border-none outline-none focus:ring-1 focus:ring-black/10 rounded px-1 w-64"
        />
        <div className="flex items-center gap-2 relative">
          <span className="text-xs text-green-500 font-medium mr-2">{savedStatus}</span>
          
          <button onClick={() => setShowAttachMenu(!showAttachMenu)} className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/10 rounded-button text-xs font-medium hover:bg-black/10 dark:hover:bg-white/20 transition-colors">
            <LinkIcon className="w-3.5 h-3.5" /> Attach
          </button>
          
          {showAttachMenu && (
            <div className="absolute right-20 top-full mt-2 w-64 max-h-64 overflow-y-auto bg-bg-primary border border-black/10 dark:border-white/10 rounded-lg shadow-lg z-50 py-2">
              <div className="px-3 pb-2 text-xs font-semibold text-text-muted border-b border-black/5 dark:border-white/5 mb-1">
                Attach to Note
              </div>
              {eligibleNotes.length === 0 ? (
                <div className="px-3 py-2 text-xs text-text-muted">No notes available.</div>
              ) : (
                eligibleNotes.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleSaveToNote(n.id)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-hover-bg text-text-primary truncate block"
                  >
                    {n.title || 'Untitled Note'}
                  </button>
                ))
              )}
            </div>
          )}

          <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-button text-xs font-medium hover:bg-blue-600 transition-colors">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col h-full overflow-hidden items-center bg-black/5 dark:bg-white/5 relative">
        <div className="bg-white rounded-xl shadow-sm border border-black/10 overflow-hidden mb-4 relative" style={{ touchAction: 'none' }}>
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className={`cursor-crosshair w-full max-w-full aspect-[4/3] ${isEraser ? 'cursor-cell' : 'cursor-crosshair'}`}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 bg-bg-primary p-3 rounded-full shadow-lg border border-black/5 dark:border-white/10">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => { setIsEraser(false); setColor('#2C2A28'); }} 
              className={`w-8 h-8 rounded-full bg-[#2C2A28] border-2 ${!isEraser && color === '#2C2A28' ? 'border-blue-500 scale-110' : 'border-transparent scale-100'} transition-transform`} 
            />
            <button 
              onClick={() => { setIsEraser(false); setColor('#E8C9C1'); }} 
              className={`w-8 h-8 rounded-full bg-[#E8C9C1] border-2 ${!isEraser && color === '#E8C9C1' ? 'border-blue-500 scale-110' : 'border-transparent scale-100'} transition-transform`} 
            />
            <button 
              onClick={() => { setIsEraser(false); setColor('#B9C8D6'); }} 
              className={`w-8 h-8 rounded-full bg-[#B9C8D6] border-2 ${!isEraser && color === '#B9C8D6' ? 'border-blue-500 scale-110' : 'border-transparent scale-100'} transition-transform`} 
            />
            <button 
              onClick={() => { setIsEraser(false); setColor('#C5D1C0'); }} 
              className={`w-8 h-8 rounded-full bg-[#C5D1C0] border-2 ${!isEraser && color === '#C5D1C0' ? 'border-blue-500 scale-110' : 'border-transparent scale-100'} transition-transform`} 
            />
          </div>
          
          <div className="w-px h-8 bg-black/10 dark:bg-white/10"></div>
          
          <button 
            onClick={() => setIsEraser(!isEraser)}
            className={`p-2 rounded-full transition-colors ${isEraser ? 'bg-blue-100 text-blue-600' : 'hover:bg-black/5 text-text-muted hover:text-text-primary'}`}
            title="Eraser"
          >
            <Eraser className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handleClear}
            className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
            title="Clear Canvas"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}