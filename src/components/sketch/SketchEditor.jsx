import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  PenTool, 
  Eraser, 
  Trash2, 
  Save, 
  Paperclip, 
  X, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Check, 
  Move
} from 'lucide-react';
import { db } from '../../lib/db';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { saveSketch, attachSketchToNote } from '../../lib/services/sketchService';
import AttachToNoteModal from './AttachToNoteModal';

// Locked "Soft Organic" pastel palette
const PASTEL_PALETTE = [
  { id: 'ink', label: 'Ink Charcoal', color: '#2C2A28' },
  { id: 'terracotta', label: 'Pastel Terracotta', color: '#E8C9C1' },
  { id: 'sage', label: 'Pastel Sage', color: '#C5D1C0' },
  { id: 'blue', label: 'Pastel Dusty Blue', color: '#B9C8D6' },
  { id: 'mustard', label: 'Pastel Mustard', color: '#E6DAB9' },
  { id: 'lavender', label: 'Pastel Lavender', color: '#D6CCE0' },
];

const STROKE_WIDTHS = [
  { id: 'fine', label: 'Fine (2px)', size: 2 },
  { id: 'medium', label: 'Medium (4px)', size: 4 },
  { id: 'broad', label: 'Broad (8px)', size: 8 },
];

export default function SketchEditor({ note, onClose }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Drawing state
  const [activeTool, setActiveTool] = useState('pen'); // 'pen' | 'eraser' | 'pan'
  const [selectedColor, setSelectedColor] = useState('#2C2A28');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);

  // Metadata state
  const [title, setTitle] = useState(note?.title || 'Untitled Sketch');
  const [description, setDescription] = useState(note?.content?.description || '');
  const [savedStatus, setSavedStatus] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);

  // Infinite canvas viewport transform
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Touch pinch zoom state
  const touchPinchDistRef = useRef(null);
  const touchStartOffsetRef = useRef({ x: 0, y: 0 });

  // Load existing attachment from Dexie
  const attachment = useLiveQuery(() => 
    db.attachments.where('note_id').equals(note.id).filter(a => a.type === 'sketch').first()
  , [note.id]);

  // Sync state with note and attachment when loaded
  useEffect(() => {
    if (note) {
      if (note.title) setTitle(note.title);
      if (note.content?.description) setDescription(note.content.description);
      if (Array.isArray(note.content?.strokes) && note.content.strokes.length > 0) {
        setStrokes(note.content.strokes);
      }
    }
    if (attachment) {
      if (attachment.title && !note?.title) setTitle(attachment.title);
      if (attachment.description && !note?.content?.description) setDescription(attachment.description);
      if (Array.isArray(attachment.strokes) && attachment.strokes.length > 0) {
        setStrokes(attachment.strokes);
      }
    }
  }, [note?.id, attachment?.id]);

  // Spacebar panning listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Sync canvas size with parent container
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set internal bitmap size scaled by DPR for crisp lines
    canvas.width = Math.max(100, Math.floor(rect.width * dpr));
    canvas.height = Math.max(100, Math.floor(rect.height * dpr));

    // Style size remains 100%
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    redrawCanvas();
  }, [scale, offset, strokes, currentStroke]);

  // Redraw canvas content
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    // Reset transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply DPR scale + Infinite canvas transform (offset and zoom scale)
    ctx.scale(dpr, dpr);
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Render all saved strokes
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

    for (const stroke of allStrokes) {
      if (!stroke.points || stroke.points.length === 0) continue;

      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
      ctx.lineWidth = stroke.tool === 'eraser' ? stroke.width * 5 : stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        // Single dot
        const p = stroke.points[0];
        ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      } else {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [scale, offset, strokes, currentStroke]);

  // Effect to trigger redraw whenever render dependencies update
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // ResizeObserver for dynamic responsiveness
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateCanvasSize]);

  // Convert screen coordinates to infinite canvas world coordinates
  const screenToWorld = useCallback((screenX, screenY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const xInCanvas = screenX - rect.left;
    const yInCanvas = screenY - rect.top;

    return {
      x: (xInCanvas - offset.x) / scale,
      y: (yInCanvas - offset.y) / scale,
    };
  }, [offset, scale]);

  // Wheel listener: Ctrl + Wheel = Zoom; Wheel = Pan
  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      // Zoom centered at mouse position
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(Math.max(scale * zoomFactor, 0.2), 4.0);

      const worldX = (mouseX - offset.x) / scale;
      const worldY = (mouseY - offset.y) / scale;

      setOffset({
        x: mouseX - worldX * newScale,
        y: mouseY - worldY * newScale,
      });
      setScale(newScale);
    } else {
      // Pan
      setOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Attach non-passive wheel event to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e) => handleWheel(e);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [scale, offset]);

  // Mouse & Touch Interaction Handlers
  const handlePointerDown = (e) => {
    // If middle mouse button, or Spacebar held, or pan tool active: start panning
    if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      return;
    }

    if (e.button !== 0) return; // Only primary button for drawing

    const worldPos = screenToWorld(e.clientX, e.clientY);
    const newStroke = {
      id: Date.now().toString(),
      tool: activeTool,
      color: selectedColor,
      width: strokeWidth,
      points: [worldPos],
    };
    setCurrentStroke(newStroke);
  };

  const handlePointerMove = (e) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (!currentStroke) return;

    const worldPos = screenToWorld(e.clientX, e.clientY);
    setCurrentStroke(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, worldPos],
      };
    });
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (currentStroke) {
      setStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke(null);
    }
  };

  // Touch handlers for mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch to zoom start
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchPinchDistRef.current = dist;
      touchStartOffsetRef.current = { ...offset };
      if (currentStroke) setCurrentStroke(null);
      return;
    }

    if (e.touches.length === 1 && !isSpacePressed && activeTool !== 'pan') {
      const touch = e.touches[0];
      const worldPos = screenToWorld(touch.clientX, touch.clientY);
      const newStroke = {
        id: Date.now().toString(),
        tool: activeTool,
        color: selectedColor,
        width: strokeWidth,
        points: [worldPos],
      };
      setCurrentStroke(newStroke);
    } else if (e.touches.length === 1 && (activeTool === 'pan' || isSpacePressed)) {
      const touch = e.touches[0];
      setIsPanning(true);
      panStartRef.current = { x: touch.clientX - offset.x, y: touch.clientY - offset.y };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchPinchDistRef.current) {
      // Pinch zoom in progress
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const zoomRatio = currentDist / touchPinchDistRef.current;
      const newScale = Math.min(Math.max(scale * zoomRatio, 0.2), 4.0);
      setScale(newScale);
      touchPinchDistRef.current = currentDist;
      return;
    }

    if (isPanning && e.touches.length === 1) {
      const touch = e.touches[0];
      setOffset({
        x: touch.clientX - panStartRef.current.x,
        y: touch.clientY - panStartRef.current.y,
      });
      return;
    }

    if (currentStroke && e.touches.length === 1) {
      const touch = e.touches[0];
      const worldPos = screenToWorld(touch.clientX, touch.clientY);
      setCurrentStroke(prev => {
        if (!prev) return null;
        return {
          ...prev,
          points: [...prev.points, worldPos],
        };
      });
    }
  };

  const handleTouchEnd = () => {
    touchPinchDistRef.current = null;
    if (isPanning) {
      setIsPanning(false);
    }
    if (currentStroke) {
      setStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke(null);
    }
  };

  // Generate Base64 image framed neatly around drawn strokes
  const generateBase64Image = useCallback(() => {
    const exportCanvas = document.createElement('canvas');
    const width = 1000;
    const height = 750;
    exportCanvas.width = width;
    exportCanvas.height = height;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return '';

    // Clean white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    if (strokes.length === 0) {
      return exportCanvas.toDataURL('image/png');
    }

    // Calculate bounding box of all strokes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const stroke of strokes) {
      for (const p of stroke.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }

    const bboxWidth = Math.max(maxX - minX, 100);
    const bboxHeight = Math.max(maxY - minY, 100);
    const padding = 60;

    const scaleX = (width - padding * 2) / bboxWidth;
    const scaleY = (height - padding * 2) / bboxHeight;
    const fitScale = Math.min(scaleX, scaleY, 2.0);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(fitScale, fitScale);
    ctx.translate(-centerX, -centerY);

    for (const stroke of strokes) {
      if (!stroke.points || stroke.points.length === 0) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
      ctx.lineWidth = stroke.tool === 'eraser' ? stroke.width * 5 : stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      } else {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();

    return exportCanvas.toDataURL('image/png');
  }, [strokes]);

  // Save sketch action
  const handleSave = async () => {
    try {
      const imageData = generateBase64Image();
      await saveSketch({
        noteId: note.id,
        title,
        description,
        imageData,
        strokes,
      });

      setSavedStatus('Saved!');
      setTimeout(() => setSavedStatus(''), 2500);
    } catch (err) {
      console.error('Failed to save sketch:', err);
    }
  };

  // Attach sketch to note action
  const handleAttachToNote = async (targetNote) => {
    const imageData = generateBase64Image();
    await attachSketchToNote({
      targetNoteId: targetNote.id,
      title: title || 'Sketch Attachment',
      description,
      imageData,
      strokes,
    });
    setSavedStatus(`Attached to ${targetNote.title || 'Note'}!`);
    setTimeout(() => setSavedStatus(''), 2500);
  };

  // Clear canvas action
  const handleConfirmClear = () => {
    setStrokes([]);
    setCurrentStroke(null);
    setShowClearConfirm(false);
  };

  // Reset zoom & pan to default
  const handleResetZoom = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary select-none overflow-hidden relative">
      {/* Top Header / Title & Minimal Toolbar */}
      <div className="px-4 py-2.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-3 shrink-0 bg-bg-primary/95">
        {/* Title Field above Canvas */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim()) {
                db.notes.update(note.id, { title: title.trim() });
              }
            }}
            placeholder="Untitled Sketch..."
            className="w-full text-sm font-medium text-text-primary bg-transparent outline-none border-b border-transparent focus:border-black/20 dark:focus:border-white/20 px-1 py-0.5 truncate transition-colors"
          />
        </div>

        {/* Status Indicator */}
        {savedStatus && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1 shrink-0 animate-in fade-in duration-150">
            <Check className="w-3.5 h-3.5" />
            {savedStatus}
          </span>
        )}

        {/* Minimal Toolbar (Icons only with tooltips) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Pen Tool with Pastel Palette Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (activeTool !== 'pen') {
                  setActiveTool('pen');
                } else {
                  setShowColorPalette(!showColorPalette);
                }
              }}
              title="Pen (Click to change color)"
              className={`p-2 rounded-xl transition-all relative flex items-center justify-center ${
                activeTool === 'pen'
                  ? 'bg-text-primary text-bg-primary shadow-xs'
                  : 'hover:bg-hover-bg text-text-muted hover:text-text-primary'
              }`}
            >
              <PenTool className="w-4 h-4" />
              {/* Color dot indicator */}
              <span 
                className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white dark:border-black"
                style={{ backgroundColor: selectedColor }}
              />
            </button>

            {/* Locked Pastel Palette Popover */}
            {showColorPalette && (
              <div 
                className="absolute right-0 top-full mt-2 p-2.5 bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-xl z-50 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] font-medium text-text-muted px-1">
                  Soft Organic Palette
                </div>
                <div className="flex items-center gap-1.5">
                  {PASTEL_PALETTE.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedColor(item.color);
                        setActiveTool('pen');
                        setShowColorPalette(false);
                      }}
                      title={item.label}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center relative border border-black/10 dark:border-white/20 ${
                        selectedColor === item.color ? 'ring-2 ring-offset-1 ring-text-primary scale-110' : ''
                      }`}
                      style={{ backgroundColor: item.color }}
                    >
                      {selectedColor === item.color && (
                        <Check className="w-3 h-3 text-white mix-blend-difference" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-black/5 dark:bg-white/5 my-0.5" />

                {/* Stroke Width Picker */}
                <div className="flex items-center justify-between gap-1">
                  {STROKE_WIDTHS.map((sw) => (
                    <button
                      key={sw.id}
                      type="button"
                      onClick={() => setStrokeWidth(sw.size)}
                      title={sw.label}
                      className={`flex-1 py-1 px-1.5 text-[10px] rounded-lg transition-colors text-center ${
                        strokeWidth === sw.size
                          ? 'bg-text-primary text-bg-primary font-semibold'
                          : 'bg-black/5 dark:bg-white/5 text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {sw.id}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Eraser Tool */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('eraser');
              setShowColorPalette(false);
            }}
            title="Eraser"
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'eraser'
                ? 'bg-text-primary text-bg-primary shadow-xs'
                : 'hover:bg-hover-bg text-text-muted hover:text-text-primary'
            }`}
          >
            <Eraser className="w-4 h-4" />
          </button>

          {/* Pan / Hand Tool */}
          <button
            type="button"
            onClick={() => {
              setActiveTool(activeTool === 'pan' ? 'pen' : 'pan');
              setShowColorPalette(false);
            }}
            title="Hand / Pan canvas (or hold Space / Ctrl+Scroll)"
            className={`p-2 rounded-xl transition-all ${
              activeTool === 'pan' || isSpacePressed
                ? 'bg-text-primary text-bg-primary shadow-xs'
                : 'hover:bg-hover-bg text-text-muted hover:text-text-primary'
            }`}
          >
            <Move className="w-4 h-4" />
          </button>

          {/* Clear Canvas */}
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            title="Clear Canvas"
            className="p-2 rounded-xl text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-1" />

          {/* Reset Zoom / Zoom Info */}
          <button
            type="button"
            onClick={handleResetZoom}
            title={`Zoom: ${Math.round(scale * 100)}% (Click to reset 100%)`}
            className="px-2 py-1.5 rounded-xl hover:bg-hover-bg text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
          >
            {Math.round(scale * 100)}%
          </button>

          {/* Save to Note Button (Task 4) */}
          <button
            type="button"
            onClick={() => setShowAttachModal(true)}
            title="Save to Note"
            className="p-2 rounded-xl hover:bg-hover-bg text-text-muted hover:text-text-primary transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            title="Save Sketch"
            className="p-2 rounded-xl bg-text-primary text-bg-primary hover:opacity-90 transition-opacity shadow-xs"
          >
            <Save className="w-4 h-4" />
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            title="Close Editor"
            className="p-2 rounded-xl hover:bg-hover-bg text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area (Fills available space, no harsh borders, soft shadow on hover) */}
      <div className="flex-1 relative overflow-hidden p-2 md:p-3 flex flex-col">
        <div 
          ref={containerRef}
          className="relative w-full h-full rounded-2xl overflow-hidden bg-white dark:bg-[#1E1E1E] transition-shadow duration-300 hover:shadow-md cursor-crosshair"
          style={{
            touchAction: 'none',
            cursor: isPanning || isSpacePressed || activeTool === 'pan' ? 'grab' : activeTool === 'eraser' ? 'cell' : 'crosshair'
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-full h-full block"
          />

          {/* Subtle zoom hint overlay in corner */}
          <div className="absolute bottom-2 right-2 pointer-events-none opacity-40 hover:opacity-100 transition-opacity text-[10px] text-text-muted bg-card-default/80 backdrop-blur-xs px-2 py-0.5 rounded-full border border-black/5 dark:border-white/5">
            Ctrl + Scroll to zoom • Space to pan
          </div>
        </div>
      </div>

      {/* Description Field below Canvas */}
      <div className="px-4 py-2.5 border-t border-black/5 dark:border-white/5 bg-bg-primary/95 shrink-0">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            db.notes.update(note.id, { 
              content: { ...(note.content || {}), description: description.trim() } 
            });
          }}
          placeholder="Add a description or thought for this sketch..."
          className="w-full text-xs text-text-muted placeholder:text-text-muted/60 bg-transparent outline-none focus:text-text-primary transition-colors"
        />
      </div>

      {/* Clear Confirmation Prompt Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div 
            className="w-full max-w-sm bg-card-default border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Clear Canvas?</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                This will erase all strokes from this sketch. You can start fresh.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="px-3.5 py-1.5 text-xs font-medium bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-xs"
              >
                Clear Canvas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attach to Note Modal */}
      <AttachToNoteModal
        isOpen={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        onAttach={handleAttachToNote}
        sketchTitle={title}
      />
    </div>
  );
}