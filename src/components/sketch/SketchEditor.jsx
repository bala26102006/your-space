import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  PenTool, 
  Eraser, 
  Move, 
  Trash2, 
  RotateCcw, 
  RotateCw, 
  Grid3X3, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2,
  Paperclip, 
  Save, 
  X, 
  Check, 
  Sliders, 
  Crosshair,
  ArrowLeft
} from 'lucide-react';
import { db } from '../../lib/db';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { 
  saveSketch, 
  attachSketchToNote, 
  deleteEmptySketchIfBlank 
} from '../../lib/services/sketchService';
import AttachToNoteModal from './AttachToNoteModal';

// Curated Soft Organic & Pastel Color Swatches
const PALETTE_COLORS = [
  { id: 'white', label: 'Off White', color: '#ECEEF2' },
  { id: 'charcoal', label: 'Ink Charcoal', color: '#2C2A28' },
  { id: 'terracotta', label: 'Terracotta', color: '#D97764' },
  { id: 'sage', label: 'Sage Green', color: '#7E9F80' },
  { id: 'blue', label: 'Dusty Blue', color: '#6A8CA8' },
  { id: 'mustard', label: 'Mustard', color: '#D4A843' },
  { id: 'lavender', label: 'Lavender', color: '#9D8BAE' },
  { id: 'coral', label: 'Soft Coral', color: '#E06C75' },
  { id: 'emerald', label: 'Emerald', color: '#34D399' },
  { id: 'sky', label: 'Sky Blue', color: '#38BDF8' },
  { id: 'black', label: 'Pitch Black', color: '#000000' },
];

const PRESET_SIZES = [2, 4, 8, 16];

export default function SketchEditor({ 
  note, 
  onClose,
  isFullscreen: externalFullscreen,
  onToggleFullscreen: externalToggleFullscreen
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Fullscreen state
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isFullscreen = externalFullscreen !== undefined ? externalFullscreen : internalFullscreen;
  const toggleFullscreen = () => {
    if (externalToggleFullscreen) externalToggleFullscreen();
    else setInternalFullscreen(prev => !prev);
  };

  // Tools: 'pen' | 'eraser' | 'pan'
  const [activeTool, setActiveTool] = useState('pen');
  const [selectedColor, setSelectedColor] = useState(() => {
    return (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) 
      ? '#ECEEF2' 
      : '#2C2A28';
  });
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [showBrushPopover, setShowBrushPopover] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Drawing strokes & Undo/Redo history
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Note Metadata
  const [title, setTitle] = useState(note?.title || 'Untitled Sketch');
  const [description, setDescription] = useState(note?.content?.description || '');
  const [savedStatus, setSavedStatus] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);

  // Viewport transforms (Zoom & Pan)
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Refs for autosave tracking
  const hasLoadedRef = useRef(false);
  const lastSavedPayloadRef = useRef('');

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.sketch-popover-trigger') && !e.target.closest('.sketch-popover-content')) {
        setShowColorPopover(false);
        setShowBrushPopover(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  // Load existing attachment from Dexie
  const attachment = useLiveQuery(() => 
    db.attachments.where('note_id').equals(note.id).filter(a => a.type === 'sketch').first()
  , [note.id]);

  // Sync state on note/attachment load
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
    hasLoadedRef.current = true;
  }, [note?.id, attachment?.id]);

  // Center view on initial load once strokes exist
  useEffect(() => {
    if (strokes.length > 0 && containerRef.current) {
      // Defer slightly to ensure container is measured
      const timer = setTimeout(() => {
        handleCenterDrawing();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [note?.id]);

  // Spacebar panning & shortcut key listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key.toLowerCase() === 'p') {
        setActiveTool('pen');
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('eraser');
      } else if (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'v') {
        setActiveTool('pan');
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isFullscreen) {
          toggleFullscreen();
        } else {
          handleClose();
        }
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
  }, [strokes, undoStack, redoStack, isFullscreen, toggleFullscreen]);

  // Redraw canvas content & background grid
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Reset bitmap matrix
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply DPR
    ctx.scale(dpr, dpr);

    // Render dot grid if enabled
    if (showGrid) {
      const gridSize = 24 * scale;
      if (gridSize >= 7) {
        const startX = ((offset.x % gridSize) + gridSize) % gridSize;
        const startY = ((offset.y % gridSize) + gridSize) % gridSize;
        const isDark = document.documentElement.classList.contains('dark');
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
        const dotRadius = Math.max(0.8, Math.min(1.2 * scale, 2));

        for (let x = startX; x < rect.width; x += gridSize) {
          for (let y = startY; y < rect.height; y += gridSize) {
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // Apply Infinite Viewport Transformation (Pan & Zoom)
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Render all strokes
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    for (const stroke of allStrokes) {
      if (!stroke.points || stroke.points.length === 0) continue;

      ctx.beginPath();
      const isEraser = stroke.tool === 'eraser';
      const isDark = document.documentElement.classList.contains('dark');
      ctx.strokeStyle = isEraser ? (isDark ? '#1A1D23' : '#FFFFFF') : stroke.color;
      ctx.lineWidth = isEraser ? stroke.width * 4 : stroke.width;
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
  }, [scale, offset, strokes, currentStroke, showGrid]);

  // Sync bitmap resolution with container dimensions
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(100, Math.floor(rect.width * dpr));
    canvas.height = Math.max(100, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    redrawCanvas();
  }, [redrawCanvas]);

  // ResizeObserver for responsive layout updates
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [updateCanvasSize]);

  // Redraw whenever strokes, view or grid toggles change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Screen coordinate to infinite canvas world coordinate converter
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

  // Mouse wheel listener: Ctrl/Cmd + Wheel = Zoom; Wheel = Pan
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
      const newScale = Math.min(Math.max(scale * zoomFactor, 0.2), 5.0);

      const worldX = (mouseX - offset.x) / scale;
      const worldY = (mouseY - offset.y) / scale;

      setOffset({
        x: mouseX - worldX * newScale,
        y: mouseY - worldY * newScale,
      });
      setScale(newScale);
    } else {
      setOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, [scale, offset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e) => handleWheel(e);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [handleWheel]);

  // Pointer event handlers (Pen, Eraser, Pan)
  const handlePointerDown = (e) => {
    // If middle click or spacebar or move tool: start panning
    if (isSpacePressed || activeTool === 'pan' || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      return;
    }

    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const { x, y } = screenToWorld(e.clientX, e.clientY);
    setCurrentStroke({
      tool: activeTool,
      color: selectedColor,
      width: strokeWidth,
      points: [{ x, y }]
    });
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

    const { x, y } = screenToWorld(e.clientX, e.clientY);
    setCurrentStroke(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x, y }]
      };
    });
  };

  const handlePointerUp = (e) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (currentStroke) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}

      // Push previous strokes to undo stack & clear redo
      setUndoStack(prev => [...prev, strokes]);
      setRedoStack([]);
      setStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke(null);
    }
  };

  // Undo / Redo Actions
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [...prev, strokes]);
    setStrokes(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setUndoStack(prev => [...prev, strokes]);
    setStrokes(next);
  };

  // Center drawing area action
  const handleCenterDrawing = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    if (!strokes || strokes.length === 0) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const stroke of strokes) {
      for (const p of stroke.points || []) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }

    if (minX === Infinity) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      return;
    }

    const bboxW = Math.max(maxX - minX, 60);
    const bboxH = Math.max(maxY - minY, 60);
    const padding = 60;

    const availableW = Math.max(rect.width - padding * 2, 80);
    const availableH = Math.max(rect.height - padding * 2, 80);
    const fitScale = Math.min(availableW / bboxW, availableH / bboxH, 1.2);
    const newScale = Math.max(0.35, fitScale);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    setOffset({
      x: rect.width / 2 - midX * newScale,
      y: rect.height / 2 - midY * newScale,
    });
    setScale(newScale);
  }, [strokes]);

  // Generate crisp Base64 thumbnail image of sketch
  const generateBase64Image = useCallback(() => {
    const exportCanvas = document.createElement('canvas');
    const width = 640;
    const height = 480;
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return '';

    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDark ? '#1A1D23' : '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    if (strokes.length === 0) {
      return exportCanvas.toDataURL('image/png');
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const stroke of strokes) {
      for (const p of stroke.points || []) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }

    const bboxWidth = Math.max(maxX - minX, 80);
    const bboxHeight = Math.max(maxY - minY, 80);
    const padding = 50;

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
      ctx.strokeStyle = stroke.tool === 'eraser' ? (isDark ? '#1A1D23' : '#FFFFFF') : stroke.color;
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

  // Debounced Autosave (800ms)
  useEffect(() => {
    if (!hasLoadedRef.current) return;

    const currentPayload = JSON.stringify({ 
      title: title.trim(), 
      description: description.trim(), 
      strokeCount: strokes.length 
    });

    if (currentPayload === lastSavedPayloadRef.current) return;

    const timer = setTimeout(async () => {
      try {
        const imageData = generateBase64Image();
        await saveSketch({
          noteId: note.id,
          title,
          description,
          imageData,
          strokes,
        });
        lastSavedPayloadRef.current = currentPayload;
        setSavedStatus('Autosaved');
        setTimeout(() => setSavedStatus(''), 2000);
      } catch (err) {
        console.error('Autosave error:', err);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [strokes, title, description, note.id, generateBase64Image]);

  // Explicit Save
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
      console.error('Save failed:', err);
    }
  };

  // Close & Clean up empty blank sketches automatically
  const handleClose = async () => {
    const hasStrokes = strokes.length > 0;
    const isCustomTitle = title && title.trim() !== 'Untitled Sketch' && title.trim() !== '';
    const hasDesc = description && description.trim() !== '';

    if (hasStrokes || isCustomTitle || hasDesc) {
      // Autosave before closing
      try {
        const imageData = generateBase64Image();
        await saveSketch({
          noteId: note.id,
          title,
          description,
          imageData,
          strokes,
        });
      } catch (err) {
        console.error('Autosave before close failed:', err);
      }
    } else {
      // Empty sketches are not saved
      try {
        await deleteEmptySketchIfBlank(note.id);
      } catch (err) {
        console.error('Purge empty sketch failed:', err);
      }
    }

    if (isFullscreen) {
      toggleFullscreen();
    }
    onClose();
  };

  // Confirm Clear Canvas
  const handleConfirmClear = () => {
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack([]);
    setStrokes([]);
    setCurrentStroke(null);
    setShowClearConfirm(false);
  };

  return (
    <div 
      className={`${isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : 'relative flex-1 min-h-0 w-full h-full'} flex flex-col bg-bg-primary select-none overflow-hidden`}
    >
      {/* 1. TOP HEADER & COMPREHENSIVE TOOLBAR */}
      <div className="px-3 py-2 border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-2 shrink-0 bg-bg-primary/95 z-20">
        {/* Back to sketches button */}
        <button
          type="button"
          onClick={handleClose}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors shrink-0"
          title="Back to sketches (Esc)"
          aria-label="Back to sketches"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back to sketches</span>
        </button>

        <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-0.5 shrink-0 hidden sm:block" />

        {/* Title Input */}
        <div className="flex-1 min-w-[120px] max-w-xs flex items-center gap-1.5">
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
            className="w-full text-xs font-semibold text-text-primary bg-transparent outline-none border-b border-transparent focus:border-[var(--workspace-accent)] px-1 py-0.5 truncate transition-colors"
          />
          {savedStatus && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5 shrink-0 animate-in fade-in duration-150">
              <Check className="w-3 h-3" />
              <span>{savedStatus}</span>
            </span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Undo Button */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
            className={`p-1.5 rounded-lg transition-colors ${
              undoStack.length > 0 
                ? 'text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10' 
                : 'text-text-muted/30 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Redo Button */}
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Y)"
            className={`p-1.5 rounded-lg transition-colors ${
              redoStack.length > 0 
                ? 'text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10' 
                : 'text-text-muted/30 cursor-not-allowed'
            }`}
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-0.5" />

          {/* Pen Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('pen')}
            title="Pen Tool (P)"
            className={`p-1.5 rounded-lg transition-all relative ${
              activeTool === 'pen'
                ? 'bg-[var(--workspace-accent)] text-white shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary'
            }`}
          >
            <PenTool className="w-4 h-4" />
          </button>

          {/* Eraser Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            title="Eraser (E)"
            className={`p-1.5 rounded-lg transition-all ${
              activeTool === 'eraser'
                ? 'bg-[var(--workspace-accent)] text-white shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary'
            }`}
          >
            <Eraser className="w-4 h-4" />
          </button>

          {/* Move / Pan Tool */}
          <button
            type="button"
            onClick={() => setActiveTool(activeTool === 'pan' ? 'pen' : 'pan')}
            title="Move / Pan Canvas (Space+Drag or M)"
            className={`p-1.5 rounded-lg transition-all ${
              activeTool === 'pan' || isSpacePressed
                ? 'bg-[var(--workspace-accent)] text-white shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary'
            }`}
          >
            <Move className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-0.5" />

          {/* Color Picker Popover Trigger */}
          <div className="relative sketch-popover-trigger">
            <button
              type="button"
              onClick={() => {
                setShowColorPopover(!showColorPopover);
                setShowBrushPopover(false);
              }}
              title="Color Palette"
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center relative transition-colors"
            >
              <div 
                className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shadow-xs transition-transform hover:scale-110" 
                style={{ backgroundColor: selectedColor }}
              />
            </button>

            {/* Color Palette Popover */}
            {showColorPopover && (
              <div 
                className="sketch-popover-content absolute left-1/2 -translate-x-1/2 top-full mt-2 p-3 bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl z-50 w-56 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[11px] font-semibold text-text-primary mb-2 flex items-center justify-between">
                  <span>Color Palette</span>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => {
                      setSelectedColor(e.target.value);
                      if (activeTool !== 'pen') setActiveTool('pen');
                    }}
                    title="Custom Color"
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                  />
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {PALETTE_COLORS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedColor(item.color);
                        if (activeTool !== 'pen') setActiveTool('pen');
                        setShowColorPopover(false);
                      }}
                      title={item.label}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center relative border border-black/10 dark:border-white/20 ${
                        selectedColor === item.color ? 'ring-2 ring-offset-1 ring-[var(--workspace-accent)] scale-110' : ''
                      }`}
                      style={{ backgroundColor: item.color }}
                    >
                      {selectedColor === item.color && (
                        <Check className="w-3 h-3 text-white mix-blend-difference" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Brush Size Slider Popover Trigger */}
          <div className="relative sketch-popover-trigger">
            <button
              type="button"
              onClick={() => {
                setShowBrushPopover(!showBrushPopover);
                setShowColorPopover(false);
              }}
              title={`Brush Size: ${strokeWidth}px`}
              className="px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{strokeWidth}px</span>
            </button>

            {/* Brush Size Popover */}
            {showBrushPopover && (
              <div 
                className="sketch-popover-content absolute left-1/2 -translate-x-1/2 top-full mt-2 p-3 bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl z-50 w-48 space-y-3 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-text-primary">
                  <span>Brush Size</span>
                  <span className="font-mono text-[var(--workspace-accent)]">{strokeWidth}px</span>
                </div>
                
                {/* Range Slider */}
                <input
                  type="range"
                  min="1"
                  max="32"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full accent-[var(--workspace-accent)] cursor-pointer"
                />

                {/* Preset Pills */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-black/5 dark:border-white/5">
                  {PRESET_SIZES.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setStrokeWidth(sz)}
                      className={`flex-1 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        strokeWidth === sz 
                          ? 'bg-[var(--workspace-accent)] text-white' 
                          : 'bg-black/5 dark:bg-white/5 text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {sz}px
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Grid Toggle Button */}
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Background Grid"
            className={`p-1.5 rounded-lg transition-colors ${
              showGrid
                ? 'bg-[var(--workspace-accent-bg)] text-[var(--workspace-accent)] ring-1 ring-[var(--workspace-accent)]/30'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-primary'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>

          {/* Clear Canvas */}
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            title="Clear Canvas"
            className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-0.5" />

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => setScale(prev => Math.max(prev * 0.85, 0.2))}
            title="Zoom Out"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Zoom % & Center Reset */}
          <button
            type="button"
            onClick={handleCenterDrawing}
            title={`Zoom: ${Math.round(scale * 100)}% (Click to Center & Fit)`}
            className="px-1.5 py-1 rounded-lg text-[11px] font-mono text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {Math.round(scale * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => setScale(prev => Math.min(prev * 1.15, 5.0))}
            title="Zoom In"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-0.5" />

          {/* Attach to Note */}
          <button
            type="button"
            onClick={() => setShowAttachModal(true)}
            title="Attach to Note"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Explicit Save */}
          <button
            type="button"
            onClick={handleSave}
            title="Save Sketch (Ctrl+S)"
            className="p-1.5 rounded-lg bg-[var(--workspace-accent)] text-white hover:opacity-90 active:scale-95 transition-all shadow-xs"
          >
            <Save className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            title="Close Editor (Esc)"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MAIN CANVAS AREA: FILLS REMAINING HEIGHT EXACTLY (FLEX: 1) */}
      <div 
        ref={containerRef}
        className="relative flex-1 min-h-0 w-full overflow-hidden bg-white dark:bg-[#1A1D23] flex items-center justify-center select-none"
        style={{
          touchAction: 'none',
          cursor: isPanning || isSpacePressed || activeTool === 'pan' 
            ? 'grab' 
            : activeTool === 'eraser' 
            ? 'cell' 
            : 'crosshair'
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="absolute inset-0 w-full h-full block"
        />

        {/* Floating Shortcuts / Center Helper */}
        <div className="absolute bottom-3 right-3 pointer-events-none opacity-40 hover:opacity-100 transition-opacity text-[10px] text-text-muted bg-card-default/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-black/5 dark:border-white/5 flex items-center gap-2">
          <span>Ctrl + Scroll to zoom</span>
          <span>•</span>
          <span>Space to pan</span>
        </div>
      </div>

      {/* 3. DESCRIPTION BAR AT BOTTOM */}
      <div className="px-3.5 py-2 border-t border-black/5 dark:border-white/5 bg-bg-primary/95 shrink-0 flex items-center gap-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            db.notes.update(note.id, { 
              content: { ...(note.content || {}), description: description.trim() } 
            });
          }}
          placeholder="Add a thought, description, or notes for this sketch..."
          className="w-full text-xs text-text-muted placeholder:text-text-muted/60 bg-transparent outline-none focus:text-text-primary transition-colors"
        />
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div 
            className="w-full max-w-sm bg-card-default border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Clear Canvas?</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                This will clear all strokes from this drawing. You can use Undo to recover if needed.
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
        onAttach={async (targetNote) => {
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
        }}
        sketchTitle={title}
      />
    </div>
  );
}