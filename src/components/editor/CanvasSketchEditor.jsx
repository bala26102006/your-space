import React, { useRef, useState, useEffect } from 'react';
import { Undo, Eraser, Paintbrush, Trash2, Download, Save, Check } from 'lucide-react';
import { db } from '../../lib/db';

const STROKE_COLORS = ['#202124', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
const BRUSH_SIZES = [2, 4, 8, 14];

export default function CanvasSketchEditor({ noteId, initialImageData, onSaveComplete }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [color, setColor] = useState('#202124');
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 600;
    canvas.height = rect.height || 400;

    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // If initial image data exists, load it
    if (initialImageData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = initialImageData;
    }
  }, [noteId, initialImageData]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.strokeStyle = isEraser ? '#FFFFFF' : color;
    ctx.lineWidth = isEraser ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !noteId) return;

    const dataUrl = canvas.toDataURL('image/png');

    // Delete old attachment if any and insert new one
    await db.attachments.where('note_id').equals(noteId).delete();
    await db.attachments.add({
      id: crypto.randomUUID(),
      note_id: noteId,
      type: 'sketch',
      storage_path: 'local',
      thumbnail_data: dataUrl,
      created_at: new Date().toISOString(),
    });

    // Update note content
    await db.notes.update(noteId, {
      content: { type: 'sketch', data: dataUrl },
      updated_at: new Date().toISOString(),
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);

    if (onSaveComplete) onSaveComplete(dataUrl);
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Canvas Toolbar */}
      <div className="flex items-center justify-between p-2 bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-xs flex-wrap gap-2">
        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {STROKE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setIsEraser(false);
              }}
              className={`w-5 h-5 rounded-full border border-black/20 transition-transform ${
                !isEraser && color === c ? 'scale-125 ring-2 ring-text-primary' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Brush Sizes */}
        <div className="flex items-center gap-1.5">
          {BRUSH_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setBrushSize(size)}
              className={`w-6 h-6 rounded flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 ${
                brushSize === size ? 'bg-black/10 dark:bg-white/20 font-bold' : ''
              }`}
            >
              <div
                className="rounded-full bg-text-primary"
                style={{ width: size, height: size }}
              />
            </button>
          ))}
        </div>

        {/* Eraser & Clear */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEraser(!isEraser)}
            className={`p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 ${
              isEraser ? 'bg-amber-100 text-amber-800 font-semibold' : 'text-text-muted'
            }`}
            title="Eraser"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded hover:bg-red-50 text-red-600 dark:hover:bg-red-950/30"
            title="Clear canvas"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1 px-3 py-1 bg-text-primary text-bg-primary rounded-button font-medium hover:opacity-90"
        >
          {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
          <span>{savedSuccess ? 'Saved Sketch' : 'Save Sketch'}</span>
        </button>
      </div>

      {/* HTML5 Canvas Drawing Area */}
      <div className="flex-1 bg-white border border-black/10 dark:border-white/10 rounded-card overflow-hidden shadow-inner flex items-center justify-center min-h-[300px] cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full touch-none"
        />
      </div>
    </div>
  );
}
