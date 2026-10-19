import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../lib/db';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { 
  saveSketch, 
  attachSketchToNote, 
  deleteEmptySketchIfBlank,
  migrateLegacySketchDoc
} from '../../lib/services/sketchService';
import { 
  renderStroke, 
  renderShape, 
  renderText, 
  renderSticker, 
  renderMosaic, 
  renderBackground 
} from '../../lib/sketch/strokeRenderer';
import { 
  processImageFile, 
  getImageFromClipboard, 
  rotateImageData, 
  flipImageData, 
  generateThumbnail,
  loadImageFromSrc
} from '../../lib/sketch/imageUtils';
import { CANVAS_PRESETS, BACKGROUND_PATTERNS, DEFAULT_PRESET_KEY, DOODLE_BRUSHES } from '../../lib/sketch/types';
import { executeFloodFill } from '../../lib/sketch/floodFill';
import { computeSymmetryBranches } from '../../lib/sketch/symmetryUtils';

import SketchTopBar from './SketchTopBar';
import SketchToolbar from './SketchToolbar';
import ToolOptionsPopover from './ToolOptionsPopover';
import LayersPanel from './LayersPanel';
import ImageActionToolbar from './ImageActionToolbar';
import StickerPickerModal from './StickerPickerModal';
import ShortcutsModal from './ShortcutsModal';
import CanvasPresetsModal from './CanvasPresetsModal';
import AttachToNoteModal from './AttachToNoteModal';
import ShareModal from './ShareModal';
import ReplayModal from './ReplayModal';

/**
 * Ramer-Douglas-Peucker stroke simplification to reduce point data without visible loss
 */
function simplifyPoints(points, tolerance = 0.3) {
  if (!points || points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lenSq = dx * dx + dy * dy;

  for (let i = 1; i < points.length - 1; i++) {
    const pt = points[i];
    let dist;
    if (lenSq === 0) {
      dist = Math.hypot(pt[0] - start[0], pt[1] - start[1]);
    } else {
      const t = Math.max(0, Math.min(1, ((pt[0] - start[0]) * dx + (pt[1] - start[1]) * dy) / lenSq));
      const projX = start[0] + t * dx;
      const projY = start[1] + t * dy;
      dist = Math.hypot(pt[0] - projX, pt[1] - projY);
    }
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPoints(points.slice(0, index + 1), tolerance);
    const right = simplifyPoints(points.slice(index), tolerance);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [start, end];
  }
}

// Computes bounding box of all existing artwork to prevent content loss on resize
const getMaxArtworkBounds = (doc) => {
  let maxX = 0;
  let maxY = 0;
  (doc?.layers || []).forEach(layer => {
    (layer.items || []).forEach(item => {
      if (item.points) {
        item.points.forEach(([px, py]) => {
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
        });
      }
      if (item.x !== undefined && item.width !== undefined) {
        maxX = Math.max(maxX, item.x + item.width);
      }
      if (item.y !== undefined && item.height !== undefined) {
        maxY = Math.max(maxY, item.y + item.height);
      }
      if (item.startX !== undefined && item.endX !== undefined) {
        maxX = Math.max(maxX, item.startX, item.endX);
        maxY = Math.max(maxY, item.startY, item.endY);
      }
    });
  });
  return { maxX, maxY };
};

export default function SketchEditor({ 
  note, 
  onClose,
  isFullscreen: externalFullscreen,
  onToggleFullscreen: externalToggleFullscreen
}) {
  const containerRef = useRef(null);
  const committedCanvasRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const cursorFollowerRef = useRef(null);
  const cachedRectRef = useRef(null);
  const liveAnimIdRef = useRef(null);
  const offscreenCanvasRef = useRef(document.createElement('canvas'));
  const imageElementCacheRef = useRef(new Map());

  // Fullscreen state
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isFullscreen = externalFullscreen !== undefined ? externalFullscreen : internalFullscreen;
  const toggleFullscreen = () => {
    if (externalToggleFullscreen) externalToggleFullscreen();
    else setInternalFullscreen(prev => !prev);
  };

  // Note Metadata
  const [title, setTitle] = useState(note?.title || 'Untitled Sketch');
  const [savedStatus, setSavedStatus] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Document State
  const [canvasDoc, setCanvasDoc] = useState(() => {
    const savedPresetId = localStorage.getItem(DEFAULT_PRESET_KEY) || 'free';
    const preset = CANVAS_PRESETS.find(p => p.id === savedPresetId) || CANVAS_PRESETS[0];
    return {
      version: 2,
      preset: preset.id,
      width: preset.width || 1200,
      height: preset.height || 900,
      background: {
        id: (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? 'dark' : 'white',
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
  });

  const [activeLayerId, setActiveLayerId] = useState('layer_bg_art');

  // History Stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Active Tooling State
  const [activeTool, setActiveTool] = useState('pen');
  const [color, setColor] = useState(() => {
    return (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) 
      ? '#ECEEF2' 
      : '#2C2A28';
  });
  const [brushSize, setBrushSize] = useState(4);
  const [opacity, setOpacity] = useState(1);
  const [shapeFill, setShapeFill] = useState(false);
  const [textFont, setTextFont] = useState('Inter, system-ui, sans-serif');
  const [textBold, setTextBold] = useState(false);
  const [recentColors, setRecentColors] = useState(['#ECEEF2', '#2C2A28', '#FB923C', '#38BDF8']);

  const [colorB, setColorB] = useState('#38BDF8');
  const [isGradient, setIsGradient] = useState(false);
  const [stabilizer, setStabilizer] = useState(0.15); // Distance-based responsive smoothing (0-100%)
  const [stickerBorder, setStickerBorder] = useState(false);
  const [symmetryMode, setSymmetryMode] = useState('off');
  const [fillTolerance, setFillTolerance] = useState(32);
  const [textOutline, setTextOutline] = useState(false);
  const [textShadow, setTextShadow] = useState(false);
  const [activeStampBrush, setActiveStampBrush] = useState(null);
  const [currentStamp, setCurrentStamp] = useState('⭐');
  const [isPhotoLocked, setIsPhotoLocked] = useState(true);
  const [showReplay, setShowReplay] = useState(false);
  const [shapeAssistToast, setShapeAssistToast] = useState({ visible: false, message: '', rawStroke: null });

  // Photo existence helper for conditional lock button
  const hasPhoto = useMemo(() => {
    return Boolean(canvasDoc.layers?.some(l => l.items?.some(i => i.type === 'image')));
  }, [canvasDoc.layers]);

  // Touch gesture tracking for 2-finger Undo and 3-finger Redo
  const touchStartTimeRef = useRef(0);
  const touchStartCountRef = useRef(0);
  const touchMovedRef = useRef(false);

  // Modals & Panels
  const [showOptions, setShowOptions] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Transform / Selected Object State
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [transformHandle, setTransformHandle] = useState(null); // 'tl', 'tr', 'bl', 'br', 'rot', 'drag'
  const transformStartRef = useRef(null);

  // Viewport transforms (Zoom & Pan)
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Interaction tracking
  const activePointersRef = useRef(new Map());
  const pinchStartDistRef = useRef(null);
  const pinchStartScaleRef = useRef(1);
  const isInteractingRef = useRef(false);
  const currentItemRef = useRef(null);
  const holdSnapTimerRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const lastSavedPayloadRef = useRef('');

  // -------------------------------------------------------------
  // 1. Initial Load & Legacy Migration
  // -------------------------------------------------------------
  const attachment = useLiveQuery(async () => {
    if (!note?.id) return null;
    return db.attachments
      .where('note_id')
      .equals(note.id)
      .filter(a => a.type === 'sketch')
      .first();
  }, [note?.id]);

  useEffect(() => {
    if (hasLoadedRef.current || !note) return;

    if (note.content?.sketchDoc || attachment?.sketch_doc) {
      const doc = note.content?.sketchDoc || attachment?.sketch_doc;
      setCanvasDoc(doc);
      if (doc.layers?.length > 0) {
        setActiveLayerId(doc.layers[doc.layers.length - 1].id);
      }
      hasLoadedRef.current = true;
    } else if (attachment?.image_data || (note.content?.strokes && note.content.strokes.length > 0)) {
      // Legacy sketch migration
      const migrated = migrateLegacySketchDoc(note, attachment);
      setCanvasDoc(migrated);
      if (migrated.layers?.length > 0) {
        setActiveLayerId(migrated.layers[migrated.layers.length - 1].id);
      }
      hasLoadedRef.current = true;
    } else {
      hasLoadedRef.current = true;
    }
  }, [note, attachment]);

  // Push current document state to undo stack
  const pushHistory = useCallback((prevDoc) => {
    setUndoStack(stack => [...stack.slice(-49), JSON.parse(JSON.stringify(prevDoc))]);
    setRedoStack([]);
    setIsDirty(true);
  }, []);

  // -------------------------------------------------------------
  // 2. Viewport Transform Coordinates Helper (Zero-Reflow Cached Rect)
  // -------------------------------------------------------------
  const getCanvasCoords = useCallback((clientX, clientY) => {
    const canvas = liveCanvasRef.current || committedCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = cachedRectRef.current || canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / scale;
    const y = (clientY - rect.top - offset.y) / scale;
    return { x, y };
  }, [offset, scale]);

  // Fit canvas to available viewport (clean responsive centering or 100% full box for free canvas)
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth: w, clientHeight: h } = containerRef.current;
    if (!w || !h) return;

    if (canvasDoc.preset === 'free') {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      setCanvasDoc(prev => {
        if (prev.preset !== 'free') return prev;
        const { maxX, maxY } = getMaxArtworkBounds(prev);
        const targetW = Math.max(w, prev.width || w, maxX + 20);
        const targetH = Math.max(h, prev.height || h, maxY + 20);
        if (prev.width === targetW && prev.height === targetH) return prev;
        return { ...prev, width: targetW, height: targetH };
      });
      return;
    }

    const margin = 24;
    const availableW = Math.max(100, w - margin);
    const availableH = Math.max(100, h - margin);

    const docW = canvasDoc.width || 1200;
    const docH = canvasDoc.height || 900;

    const scaleFactor = Math.min(availableW / docW, availableH / docH);
    const newScale = Math.max(0.15, Math.min(scaleFactor, 2.5));

    const newOffsetX = (w - docW * newScale) / 2;
    const newOffsetY = (h - docH * newScale) / 2;

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [canvasDoc.preset, canvasDoc.width, canvasDoc.height]);

  // 1:1 Actual Size Zoom
  const handleResetZoom = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth: w, clientHeight: h } = containerRef.current;
    const docW = canvasDoc.width || 1200;
    const docH = canvasDoc.height || 900;
    setScale(1);
    setOffset({ x: (w - docW) / 2, y: (h - docH) / 2 });
  }, [canvasDoc.width, canvasDoc.height]);

  // Auto-fit on initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitToScreen();
    }, 40);
    return () => clearTimeout(timer);
  }, [handleFitToScreen]);

  // -------------------------------------------------------------
  // 3. Two-Canvas Pipeline:
  //    Canvas A (Committed): background, patterns, saved layers
  //    Canvas B (Live): active in-progress stroke (60 FPS desynchronized)
  // -------------------------------------------------------------
  const renderCommitted = useCallback(() => {
    const canvas = committedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { desynchronized: true }) || canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvasDoc.width || 1200;
    const height = canvasDoc.height || 900;

    const container = containerRef.current;
    if (container) {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
      }
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // Apply viewport zoom & pan
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // 1. Draw Canvas Shadow & Background
    const isFreeFull = canvasDoc.preset === 'free' && offset.x === 0 && offset.y === 0 && scale === 1;
    ctx.save();
    if (!isFreeFull) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 2. Render Background & Pattern Guides
    const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    renderBackground(ctx, width, height, canvasDoc.background, isDarkMode);

    // CRITICAL: Strictly clip all layers, strokes, and shapes to the canvas paper bounds
    // Prevents drawings from moving or spilling out of the box
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();

    // 2b. Render Faint Symmetry Guides (if active)
    if (symmetryMode && symmetryMode !== 'off') {
      ctx.save();
      ctx.strokeStyle = isDarkMode ? 'rgba(251, 146, 60, 0.4)' : 'rgba(249, 115, 22, 0.35)';
      ctx.lineWidth = 1 / scale;
      ctx.setLineDash([4 / scale, 4 / scale]);

      const cx = width / 2;
      const cy = height / 2;

      if (symmetryMode === 'vertical' || symmetryMode === 'radial4' || symmetryMode === 'radial6' || symmetryMode === 'radial8') {
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, height);
        ctx.stroke();
      }
      if (symmetryMode === 'horizontal' || symmetryMode === 'radial4' || symmetryMode === 'radial6' || symmetryMode === 'radial8') {
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(width, cy);
        ctx.stroke();
      }
      if (symmetryMode === 'radial6' || symmetryMode === 'radial8') {
        const numAxes = symmetryMode === 'radial6' ? 6 : 8;
        const angleStep = (2 * Math.PI) / numAxes;
        const diagLen = Math.hypot(width, height);
        for (let k = 1; k < numAxes; k++) {
          const angle = k * angleStep;
          ctx.beginPath();
          ctx.moveTo(cx - Math.cos(angle) * diagLen, cy - Math.sin(angle) * diagLen);
          ctx.lineTo(cx + Math.cos(angle) * diagLen, cy + Math.sin(angle) * diagLen);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 3. Render Committed Layers in Order
    (canvasDoc.layers || []).forEach(layer => {
      if (!layer.visible) return;

      ctx.save();
      ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;

      (layer.items || []).forEach(item => {
        if (item.type === 'image' || item.type === 'fill_layer') {
          let cachedImg = imageElementCacheRef.current.get(item.id || item.src);
          if (!cachedImg && item.src) {
            cachedImg = new Image();
            cachedImg.src = item.src;
            cachedImg.onload = () => renderCommitted();
            imageElementCacheRef.current.set(item.id || item.src, cachedImg);
          }

          if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
            ctx.save();
            ctx.globalAlpha = (item.opacity ?? 1) * (layer.opacity ?? 1);
            if (item.type === 'fill_layer') {
              ctx.drawImage(cachedImg, 0, 0, width, height);
            } else {
              ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
              if (item.rotation) ctx.rotate((item.rotation * Math.PI) / 180);
              if (item.flipX || item.flipY) ctx.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1);
              ctx.drawImage(cachedImg, -item.width / 2, -item.height / 2, item.width, item.height);
            }
            ctx.restore();
          }
        } else if (item.type?.startsWith('shape_')) {
          renderShape(ctx, item);
        } else if (item.type === 'text') {
          renderText(ctx, item);
        } else if (item.type === 'sticker') {
          renderSticker(ctx, item);
        } else if (item.type === 'mosaic') {
          renderMosaic(ctx, item, width, height);
        } else {
          renderStroke(ctx, item);
        }
      });

      ctx.restore();
    });

    // 4. Render Transform Gizmo / Bounding Box for Selected Object
    if (selectedImage) {
      ctx.save();
      ctx.translate(selectedImage.x + selectedImage.width / 2, selectedImage.y + selectedImage.height / 2);
      if (selectedImage.rotation) {
        ctx.rotate((selectedImage.rotation * Math.PI) / 180);
      }

      const halfW = selectedImage.width / 2;
      const halfH = selectedImage.height / 2;

      ctx.strokeStyle = '#FB923C';
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(-halfW, -halfH, selectedImage.width, selectedImage.height);

      const handleSize = 10 / scale;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#FB923C';
      ctx.lineWidth = 2 / scale;

      const corners = [
        [-halfW, -halfH],
        [halfW, -halfH],
        [halfW, halfH],
        [-halfW, halfH]
      ];

      corners.forEach(([hx, hy]) => {
        ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
      });

      // Rotation Handle Knob (at top)
      const rotDist = 24 / scale;
      ctx.beginPath();
      ctx.moveTo(0, -halfH);
      ctx.lineTo(0, -halfH - rotDist);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -halfH - rotDist, handleSize / 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore(); // End clipping
    ctx.restore(); // End viewport transform
  }, [canvasDoc, offset, scale, selectedImage, symmetryMode]);

  // Live Canvas: renders ONLY the active in-progress stroke at 60 FPS
  const renderLive = useCallback(() => {
    const canvas = liveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { desynchronized: true }) || canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const container = containerRef.current;
    if (container) {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
      }
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    if (currentItemRef.current) {
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      // Clip active in-progress stroke strictly to canvas paper bounds
      const docW = canvasDoc.width || 1200;
      const docH = canvasDoc.height || 900;
      ctx.beginPath();
      ctx.rect(0, 0, docW, docH);
      ctx.clip();

      const active = currentItemRef.current;
      if (active.type?.startsWith('shape_')) {
        renderShape(ctx, active);
      } else if (active.type === 'mosaic') {
        renderMosaic(ctx, active, docW, docH);
      } else {
        renderStroke(ctx, active);
      }

      ctx.restore();
    }

    ctx.restore();
  }, [offset, scale, canvasDoc.width, canvasDoc.height]);

  // Trigger committed canvas render on document or viewport changes
  useEffect(() => {
    renderCommitted();
  }, [renderCommitted]);

  // ResizeObserver for clean responsive auto-fit and canvas sync
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const syncFreeCanvas = (cw, ch) => {
      if (cw <= 0 || ch <= 0) return;
      setCanvasDoc(prev => {
        if (prev.preset !== 'free') return prev;
        const { maxX, maxY } = getMaxArtworkBounds(prev);
        const isInitialDefault = (prev.width === 1200 && prev.height === 900) && maxX === 0 && maxY === 0;
        const targetW = isInitialDefault ? cw : Math.max(cw, prev.width || cw, maxX + 20);
        const targetH = isInitialDefault ? ch : Math.max(ch, prev.height || ch, maxY + 20);
        if (prev.width === targetW && prev.height === targetH) return prev;
        return { ...prev, width: targetW, height: targetH };
      });
    };

    // Initial check
    syncFreeCanvas(container.clientWidth, container.clientHeight);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width: currentW, height: currentH } = entry.contentRect;
        syncFreeCanvas(currentW, currentH);
      }
      renderCommitted();
      renderLive();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [renderCommitted, renderLive]);

  // -------------------------------------------------------------
  // 4. Pointer Events & Gestures (Stylus Pressure, Touch, Palm Rejection)
  // -------------------------------------------------------------
  const handlePointerDown = (e) => {
    if (!containerRef.current) return;
    const canvas = liveCanvasRef.current || committedCanvasRef.current;
    if (!canvas) return;

    // Set pointer capture to prevent dropping strokes during fast movements
    try {
      e.target.setPointerCapture?.(e.pointerId);
    } catch (err) {}

    // Track pointers & touch gestures
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    touchStartCountRef.current = Math.max(touchStartCountRef.current, activePointersRef.current.size);
    if (activePointersRef.current.size === 1) {
      touchStartTimeRef.current = Date.now();
      touchMovedRef.current = false;
    }

    // Multi-touch pinch-to-zoom / pan
    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = scale;
      isInteractingRef.current = true;
      return;
    }

    // Palm rejection: If pen is active, reject touch pointers
    if (e.pointerType === 'touch' && activePointersRef.current.size > 1) {
      return;
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    // Space key pan or Hand tool
    if (isSpacePressed || activeTool === 'pan' || e.button === 1) {
      isInteractingRef.current = true;
      transformStartRef.current = {
        mode: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        initialOffset: { ...offset }
      };
      return;
    }

    // Select / Move tool & Transform Gizmo check
    if (activeTool === 'select') {
      if (selectedImage) {
        // Check handle click
        const handle = hitTestHandles(selectedImage, x, y, scale);
        if (handle) {
          isInteractingRef.current = true;
          setTransformHandle(handle);
          transformStartRef.current = {
            startX: x,
            startY: y,
            initialX: selectedImage.x,
            initialY: selectedImage.y,
            initialW: selectedImage.width,
            initialH: selectedImage.height,
            initialRot: selectedImage.rotation || 0
          };
          return;
        }
      }

      // Hit test existing images / items
      const hit = findItemAt(x, y);
      if (hit) {
        if (hit.type === 'image' && isPhotoLocked) {
          // Photo is locked for doodling
          return;
        }
        setSelectedObjectId(hit.id);
        if (hit.type === 'image') {
          setSelectedImage(hit);
        } else {
          setSelectedImage(null);
        }
        isInteractingRef.current = true;
        setTransformHandle('drag');
        transformStartRef.current = {
          startX: x,
          startY: y,
          initialX: hit.x,
          initialY: hit.y,
          initialW: hit.width,
          initialH: hit.height
        };
        return;
      } else {
        setSelectedObjectId(null);
        setSelectedImage(null);
      }
      return;
    }

    // Text tool tap
    if (activeTool === 'text') {
      const text = prompt('Enter text for sketch:', '');
      if (text) {
        pushHistory(canvasDoc);
        const newItem = {
          id: `text_${Date.now()}`,
          type: 'text',
          text,
          x,
          y,
          fontSize: brushSize * 4,
          fontFamily: textFont,
          bold: textBold,
          outline: textOutline,
          shadow: textShadow,
          color,
          opacity
        };
        addItemToActiveLayer(newItem);
      }
      return;
    }

    // Fill Bucket Tool (Flood fill)
    if (activeTool === 'fill') {
      const docW = canvasDoc.width || 1200;
      const docH = canvasDoc.height || 900;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = docW;
      offCanvas.height = docH;
      const offCtx = offCanvas.getContext('2d');

      const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      renderBackground(offCtx, docW, docH, canvasDoc.background, isDarkMode);

      (canvasDoc.layers || []).forEach(layer => {
        if (!layer.visible) return;
        offCtx.save();
        offCtx.globalAlpha = layer.opacity ?? 1;
        (layer.items || []).forEach(item => {
          if (item.type === 'image' || item.type === 'fill_layer') {
            const cachedImg = imageElementCacheRef.current.get(item.id || item.src);
            if (cachedImg && cachedImg.complete) {
              if (item.type === 'fill_layer') {
                offCtx.drawImage(cachedImg, 0, 0, docW, docH);
              } else {
                offCtx.drawImage(cachedImg, item.x || 0, item.y || 0, item.width, item.height);
              }
            }
          } else if (item.type?.startsWith('shape_')) {
            renderShape(offCtx, item);
          } else if (item.type === 'text') {
            renderText(offCtx, item);
          } else if (item.type === 'sticker') {
            renderSticker(offCtx, item);
          } else {
            renderStroke(offCtx, item);
          }
        });
        offCtx.restore();
      });

      const maskDataUrl = executeFloodFill(offCtx, x, y, color, fillTolerance, docW, docH);
      if (maskDataUrl) {
        pushHistory(canvasDoc);
        const fillItem = {
          id: `fill_${Date.now()}`,
          type: 'fill_layer',
          src: maskDataUrl,
          color,
          x: 0,
          y: 0,
          width: docW,
          height: docH
        };
        const img = new Image();
        img.src = maskDataUrl;
        imageElementCacheRef.current.set(fillItem.id, img);
        addItemToActiveLayer(fillItem);
      }
      return;
    }

    // Drawing / Shapes / Eraser
    isInteractingRef.current = true;

    if (activeTool === 'eraser_stroke') {
      eraseStrokeAt(x, y);
      return;
    }

    if (activeTool.startsWith('shape_')) {
      currentItemRef.current = {
        id: `shape_${Date.now()}`,
        type: activeTool,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        color,
        size: brushSize,
        fill: shapeFill,
        opacity
      };
      return;
    }

    if (activeTool === 'mosaic') {
      currentItemRef.current = {
        id: `mosaic_${Date.now()}`,
        type: 'mosaic',
        x: x - brushSize * 4,
        y: y - brushSize * 4,
        width: brushSize * 8,
        height: brushSize * 8,
        blockSize: 12
      };
      return;
    }

    // Freehand stroke (8 Doodle Brushes, Stamp Brush, Gradient)
    const initialBranches = symmetryMode !== 'off'
      ? computeSymmetryBranches([[x, y, pressure]], symmetryMode, canvasDoc.width || 1200, canvasDoc.height || 900)
      : [];

    currentItemRef.current = {
      id: `stroke_${Date.now()}`,
      tool: activeStampBrush ? 'stamp_brush' : activeTool,
      color,
      colorB: isGradient ? colorB : null,
      gradient: isGradient,
      size: brushSize,
      opacity,
      stabilizer,
      stickerBorder,
      stamp: currentStamp,
      points: [[x, y, pressure]],
      symmetryBranches: initialBranches
    };

    // Hold-to-snap shape timer (deliberate 650ms pause)
    clearTimeout(holdSnapTimerRef.current);
    holdSnapTimerRef.current = setTimeout(() => {
      snapCurrentStrokeToShape();
    }, 650);

    renderLive();
  };

  const handlePointerMove = (e) => {
    // Direct DOM cursor transform without React re-renders
    if (cursorFollowerRef.current) {
      cursorFollowerRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    }

    if (!isInteractingRef.current) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Handle two-finger pinch-to-zoom
    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchStartDistRef.current) {
        const factor = dist / pinchStartDistRef.current;
        const newScale = Math.max(0.15, Math.min(3.5, pinchStartScaleRef.current * factor));
        setScale(newScale);
      }
      return;
    }

    // Handle canvas panning
    if (transformStartRef.current?.mode === 'pan') {
      const dx = e.clientX - transformStartRef.current.startX;
      const dy = e.clientY - transformStartRef.current.startY;
      setOffset({
        x: transformStartRef.current.initialOffset.x + dx,
        y: transformStartRef.current.initialOffset.y + dy
      });
      return;
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    // Handle Image / Object Transforming
    if (transformStartRef.current && selectedImage) {
      const ts = transformStartRef.current;
      const dx = x - ts.startX;
      const dy = y - ts.startY;

      if (transformHandle === 'drag') {
        // Snap to canvas center
        const docW = canvasDoc.width || 1200;
        const docH = canvasDoc.height || 900;
        let newX = ts.initialX + dx;
        let newY = ts.initialY + dy;

        if (Math.abs(newX + selectedImage.width / 2 - docW / 2) < 16) {
          newX = docW / 2 - selectedImage.width / 2;
        }
        if (Math.abs(newY + selectedImage.height / 2 - docH / 2) < 16) {
          newY = docH / 2 - selectedImage.height / 2;
        }

        updateItemInDocument(selectedImage.id, { x: newX, y: newY });
        setSelectedImage(prev => ({ ...prev, x: newX, y: newY }));
      } else if (transformHandle === 'br' || transformHandle === 'tl' || transformHandle === 'tr' || transformHandle === 'bl') {
        const aspect = ts.initialW / ts.initialH;
        let newW = Math.max(40, ts.initialW + (transformHandle.includes('r') ? dx : -dx));
        let newH = newW / aspect;

        updateItemInDocument(selectedImage.id, { width: newW, height: newH });
        setSelectedImage(prev => ({ ...prev, width: newW, height: newH }));
      } else if (transformHandle === 'rot') {
        const cx = selectedImage.x + selectedImage.width / 2;
        const cy = selectedImage.y + selectedImage.height / 2;
        const angle = (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
        updateItemInDocument(selectedImage.id, { rotation: Math.round(angle) });
        setSelectedImage(prev => ({ ...prev, rotation: Math.round(angle) }));
      }
      return;
    }

    // Stroke Eraser during drag
    if (activeTool === 'eraser_stroke') {
      eraseStrokeAt(x, y);
      return;
    }

    // Drawing Shapes
    if (currentItemRef.current?.type?.startsWith('shape_')) {
      let endX = x;
      let endY = y;

      // Hold Shift for straight lines, 45° angles, squares, circles
      if (e.shiftKey) {
        const dx = x - currentItemRef.current.startX;
        const dy = y - currentItemRef.current.startY;
        if (currentItemRef.current.type === 'shape_rect' || currentItemRef.current.type === 'shape_ellipse') {
          const side = Math.max(Math.abs(dx), Math.abs(dy));
          endX = currentItemRef.current.startX + Math.sign(dx) * side;
          endY = currentItemRef.current.startY + Math.sign(dy) * side;
        } else {
          // Snap angle to 15° steps
          const angle = Math.atan2(dy, dx);
          const step = (15 * Math.PI) / 180;
          const snappedAngle = Math.round(angle / step) * step;
          const len = Math.hypot(dx, dy);
          endX = currentItemRef.current.startX + len * Math.cos(snappedAngle);
          endY = currentItemRef.current.startY + len * Math.sin(snappedAngle);
        }
      }

      currentItemRef.current.endX = endX;
      currentItemRef.current.endY = endY;

      if (!liveAnimIdRef.current) {
        liveAnimIdRef.current = requestAnimationFrame(() => {
          liveAnimIdRef.current = null;
          renderLive();
        });
      }
      return;
    }

    // Drawing Mosaic / Privacy region
    if (currentItemRef.current?.type === 'mosaic') {
      currentItemRef.current.x = x - brushSize * 4;
      currentItemRef.current.y = y - brushSize * 4;
      if (!liveAnimIdRef.current) {
        liveAnimIdRef.current = requestAnimationFrame(() => {
          liveAnimIdRef.current = null;
          renderLive();
        });
      }
      return;
    }

    // Adding points to freehand stroke using coalesced events
    if (currentItemRef.current?.points) {
      const coalescedEvents = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of coalescedEvents) {
        const { x: px, y: py } = getCanvasCoords(ev.clientX, ev.clientY);
        const press = ev.pressure && ev.pressure > 0 ? ev.pressure : 0.5;

        // Shift key gives straight line from start to current position snapped to 15°
        if (ev.shiftKey && currentItemRef.current.points.length > 0) {
          const startPt = currentItemRef.current.points[0];
          const dx = px - startPt[0];
          const dy = py - startPt[1];
          const angle = Math.atan2(dy, dx);
          const step = (15 * Math.PI) / 180;
          const snappedAngle = Math.round(angle / step) * step;
          const len = Math.hypot(dx, dy);
          const snapX = startPt[0] + len * Math.cos(snappedAngle);
          const snapY = startPt[1] + len * Math.sin(snappedAngle);
          currentItemRef.current.points = [startPt, [snapX, snapY, press]];
          break;
        }

        // Subpixel distance jitter filter (reject moves < 0.5px)
        const pts = currentItemRef.current.points;
        const last = pts[pts.length - 1];
        if (last && Math.hypot(px - last[0], py - last[1]) < 0.5) continue;

        pts.push([px, py, press]);
      }

      // Update symmetry branches dynamically
      if (symmetryMode && symmetryMode !== 'off') {
        const docW = canvasDoc.width || 1200;
        const docH = canvasDoc.height || 900;
        currentItemRef.current.symmetryBranches = computeSymmetryBranches(
          currentItemRef.current.points,
          symmetryMode,
          docW,
          docH
        );
      }

      // Reset hold-to-snap timer on movement (deliberate 650ms pause)
      clearTimeout(holdSnapTimerRef.current);
      holdSnapTimerRef.current = setTimeout(() => {
        snapCurrentStrokeToShape();
      }, 650);

      // Render live stroke with requestAnimationFrame
      if (!liveAnimIdRef.current) {
        liveAnimIdRef.current = requestAnimationFrame(() => {
          liveAnimIdRef.current = null;
          renderLive();
        });
      }
    }
  };

  const handlePointerUp = (e) => {
    if (liveAnimIdRef.current) {
      cancelAnimationFrame(liveAnimIdRef.current);
      liveAnimIdRef.current = null;
    }
    cachedRectRef.current = null;

    const elapsed = Date.now() - touchStartTimeRef.current;
    if (!touchMovedRef.current && elapsed < 320) {
      if (touchStartCountRef.current === 2) {
        handleUndo();
      } else if (touchStartCountRef.current === 3) {
        handleRedo();
      }
    }

    activePointersRef.current.delete(e.pointerId);
    clearTimeout(holdSnapTimerRef.current);

    if (activePointersRef.current.size === 0) {
      touchStartCountRef.current = 0;
      isInteractingRef.current = false;
      transformStartRef.current = null;
      setTransformHandle(null);
    }

    // Release pointer capture
    try {
      e.target.releasePointerCapture?.(e.pointerId);
    } catch (err) {}

    // Commit current in-progress item with stroke simplification
    if (currentItemRef.current) {
      const finishedItem = currentItemRef.current;
      if (finishedItem.points && finishedItem.points.length > 2) {
        finishedItem.points = simplifyPoints(finishedItem.points, 0.3);
      }
      pushHistory(canvasDoc);
      addItemToActiveLayer(finishedItem);
      currentItemRef.current = null;
      renderLive(); // Clears live canvas
      renderCommitted(); // Renders committed canvas
    }
  };

  // -------------------------------------------------------------
  // 5. Intelligent "Hold-to-Snap" Shape Recognition
  // -------------------------------------------------------------
  const snapCurrentStrokeToShape = () => {
    if (!currentItemRef.current || !currentItemRef.current.points || currentItemRef.current.points.length < 8) return;
    const pts = currentItemRef.current.points;
    const start = pts[0];
    const end = pts[pts.length - 1];

    const distStartEnd = Math.hypot(end[0] - start[0], end[1] - start[1]);
    let totalLen = 0;
    for (let i = 1; i < pts.length; i++) {
      totalLen += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(([px, py]) => {
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    });

    const w = maxX - minX;
    const h = maxY - minY;
    const rawStrokeCopy = JSON.parse(JSON.stringify(currentItemRef.current));

    // 1. Circle / Ellipse: closed loop
    if (distStartEnd < 45 && totalLen > 80) {
      currentItemRef.current = {
        id: `shape_${Date.now()}`,
        type: 'shape_ellipse',
        startX: minX,
        startY: minY,
        endX: maxX,
        endY: maxY,
        color: currentItemRef.current.color,
        size: currentItemRef.current.size,
        fill: shapeFill,
        opacity: currentItemRef.current.opacity,
        _rawStroke: rawStrokeCopy
      };
      setShapeAssistToast({
        visible: true,
        message: 'Snapped to Circle',
        rawStroke: rawStrokeCopy
      });
      renderAll();
      return;
    }

    // 2. Straight line
    if (distStartEnd / totalLen > 0.88) {
      currentItemRef.current = {
        id: `shape_${Date.now()}`,
        type: 'shape_line',
        startX: start[0],
        startY: start[1],
        endX: end[0],
        endY: end[1],
        color: currentItemRef.current.color,
        size: currentItemRef.current.size,
        opacity: currentItemRef.current.opacity,
        _rawStroke: rawStrokeCopy
      };
      setShapeAssistToast({
        visible: true,
        message: 'Snapped to Line',
        rawStroke: rawStrokeCopy
      });
      renderAll();
      return;
    }

    // 3. Rectangle
    if (distStartEnd < 55 && w > 35 && h > 35) {
      currentItemRef.current = {
        id: `shape_${Date.now()}`,
        type: 'shape_rect',
        startX: minX,
        startY: minY,
        endX: maxX,
        endY: maxY,
        color: currentItemRef.current.color,
        size: currentItemRef.current.size,
        fill: shapeFill,
        opacity: currentItemRef.current.opacity,
        _rawStroke: rawStrokeCopy
      };
      setShapeAssistToast({
        visible: true,
        message: 'Snapped to Rectangle',
        rawStroke: rawStrokeCopy
      });
      renderAll();
    }
  };

  const handleUndoShapeSnap = () => {
    if (shapeAssistToast?.rawStroke) {
      currentItemRef.current = shapeAssistToast.rawStroke;
      setShapeAssistToast({ visible: false, message: '', rawStroke: null });
      renderAll();
    }
  };

  // -------------------------------------------------------------
  // 6. Object Hit Testing & Selection Helpers
  // -------------------------------------------------------------
  const hitTestHandles = (item, x, y, curScale) => {
    const handleSize = 14 / curScale;
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const halfW = item.width / 2;
    const halfH = item.height / 2;

    // Check corners
    if (Math.hypot(x - (cx + halfW), y - (cy + halfH)) < handleSize) return 'br';
    if (Math.hypot(x - (cx - halfW), y - (cy - halfH)) < handleSize) return 'tl';
    if (Math.hypot(x - (cx + halfW), y - (cy - halfH)) < handleSize) return 'tr';
    if (Math.hypot(x - (cx - halfW), y - (cy + halfH)) < handleSize) return 'bl';

    // Check rotation knob
    const rotDist = 24 / curScale;
    if (Math.hypot(x - cx, y - (cy - halfH - rotDist)) < handleSize) return 'rot';

    return null;
  };

  const findItemAt = (x, y) => {
    const layers = canvasDoc.layers || [];
    for (let l = layers.length - 1; l >= 0; l--) {
      const items = layers[l].items || [];
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (it.type === 'image') {
          if (x >= it.x && x <= it.x + it.width && y >= it.y && y <= it.y + it.height) {
            return it;
          }
        }
      }
    }
    return null;
  };

  const eraseStrokeAt = (x, y) => {
    let modified = false;
    const newLayers = (canvasDoc.layers || []).map(layer => {
      const remainingItems = (layer.items || []).filter(item => {
        if (item.points) {
          // Check if any point is within eraser radius
          const hit = item.points.some(([px, py]) => Math.hypot(px - x, py - y) < brushSize * 4);
          if (hit) modified = true;
          return !hit;
        }
        return true;
      });
      return { ...layer, items: remainingItems };
    });

    if (modified) {
      pushHistory(canvasDoc);
      setCanvasDoc(prev => ({ ...prev, layers: newLayers }));
    }
  };

  // -------------------------------------------------------------
  // 7. Layer Manipulation & Document State Updates
  // -------------------------------------------------------------
  const addItemToActiveLayer = (newItem) => {
    setCanvasDoc(prev => {
      const layers = [...(prev.layers || [])];
      let targetIdx = layers.findIndex(l => l.id === activeLayerId);
      if (targetIdx === -1) {
        targetIdx = layers.length - 1;
      }
      const targetLayer = layers[targetIdx];
      const updatedLayer = {
        ...targetLayer,
        items: [...(targetLayer.items || []), newItem]
      };
      layers[targetIdx] = updatedLayer;
      return { ...prev, layers };
    });
  };

  const updateItemInDocument = (itemId, updates) => {
    setCanvasDoc(prev => {
      const layers = (prev.layers || []).map(layer => ({
        ...layer,
        items: (layer.items || []).map(item => item.id === itemId ? { ...item, ...updates } : item)
      }));
      return { ...prev, layers };
    });
  };

  // -------------------------------------------------------------
  // 8. Image Import & Camera / Paste / Drag & Drop
  // -------------------------------------------------------------
  const handleImportImage = async (file) => {
    try {
      const { src, width: imgW, height: imgH } = await processImageFile(file);
      const canvasW = canvasDoc.width || 1200;
      const canvasH = canvasDoc.height || 900;

      // Auto-fit photo comfortably inside canvas
      const margin = 80;
      const fitScale = Math.min((canvasW - margin) / imgW, (canvasH - margin) / imgH, 1);
      const w = Math.round(imgW * fitScale);
      const h = Math.round(imgH * fitScale);
      const x = Math.round((canvasW - w) / 2);
      const y = Math.round((canvasH - h) / 2);

      const newImageItem = {
        id: `img_${Date.now()}`,
        type: 'image',
        src,
        x,
        y,
        width: w,
        height: h,
        rotation: 0,
        flipX: false,
        flipY: false,
        opacity: 1
      };

      pushHistory(canvasDoc);

      // Check if there is an image layer, otherwise add one at bottom
      let layers = [...(canvasDoc.layers || [])];
      let imgLayer = layers.find(l => l.type === 'image');
      if (!imgLayer) {
        imgLayer = {
          id: `layer_photo_${Date.now()}`,
          name: 'Photo',
          type: 'image',
          visible: true,
          opacity: 1,
          items: [newImageItem]
        };
        // Insert photo layer below the drawing layers
        layers.splice(0, 0, imgLayer);
      } else {
        imgLayer.items = [...(imgLayer.items || []), newImageItem];
      }

      setCanvasDoc(prev => ({ ...prev, layers }));
      setIsPhotoLocked(true);
      const topDrawingLayer = layers.filter(l => l.type === 'drawing').slice(-1)[0];
      if (topDrawingLayer) {
        setActiveLayerId(topDrawingLayer.id);
      }
      setSelectedObjectId(null);
      setSelectedImage(null);
      setActiveTool('pen');
    } catch (err) {
      console.error('Failed to import image:', err);
      alert('Could not load image. Please try a different file.');
    }
  };

  // Drag and Drop & Clipboard Paste Event Listeners
  useEffect(() => {
    const handlePaste = (e) => {
      const file = getImageFromClipboard(e.clipboardData);
      if (file) {
        e.preventDefault();
        handleImportImage(file);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        handleImportImage(file);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);

    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, [canvasDoc]);

  // -------------------------------------------------------------
  // 9. Selected Image Context Actions (Rotate 90, Flip, Opacity)
  // -------------------------------------------------------------
  const handleRotateImage90 = async () => {
    if (!selectedImage) return;
    pushHistory(canvasDoc);
    const newRot = ((selectedImage.rotation || 0) + 90) % 360;
    updateItemInDocument(selectedImage.id, { rotation: newRot });
    setSelectedImage(prev => ({ ...prev, rotation: newRot }));
  };

  const handleFlipImageH = () => {
    if (!selectedImage) return;
    pushHistory(canvasDoc);
    const flipX = !selectedImage.flipX;
    updateItemInDocument(selectedImage.id, { flipX });
    setSelectedImage(prev => ({ ...prev, flipX }));
  };

  const handleFlipImageV = () => {
    if (!selectedImage) return;
    pushHistory(canvasDoc);
    const flipY = !selectedImage.flipY;
    updateItemInDocument(selectedImage.id, { flipY });
    setSelectedImage(prev => ({ ...prev, flipY }));
  };

  const handleDeleteSelectedImage = () => {
    if (!selectedImage) return;
    pushHistory(canvasDoc);
    setCanvasDoc(prev => ({
      ...prev,
      layers: (prev.layers || []).map(layer => ({
        ...layer,
        items: (layer.items || []).filter(item => item.id !== selectedImage.id)
      }))
    }));
    setSelectedImage(null);
    setSelectedObjectId(null);
  };

  // -------------------------------------------------------------
  // 10. Zoom / Wheel & Keyboard Shortcuts
  // -------------------------------------------------------------
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.15, Math.min(4, scale * zoomFactor));

      const targetEl = liveCanvasRef.current || containerRef.current;
      const rect = targetEl ? targetEl.getBoundingClientRect() : { left: 0, top: 0 };
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
      const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    } else {
      // Normal two-finger trackpad pan
      setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === ' ') {
        setIsSpacePressed(true);
      } else if (e.key.toLowerCase() === 'p') {
        setActiveTool('pen');
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool(prev => prev === 'eraser_stroke' ? 'eraser_pixel' : 'eraser_stroke');
      } else if (e.key.toLowerCase() === 'v') {
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 't') {
        setActiveTool('text');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('pan');
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key === '[') {
        setBrushSize(s => Math.max(1, s - 2));
      } else if (e.key === ']') {
        setBrushSize(s => Math.min(50, s + 2));
      } else if (e.key === '?') {
        setShowShortcuts(true);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedImage) handleDeleteSelectedImage();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          toggleFullscreen();
        } else {
          onClose();
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === ' ') setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undoStack, redoStack, selectedImage, isFullscreen]);

  // -------------------------------------------------------------
  // 11. Undo / Redo Execution
  // -------------------------------------------------------------
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(stack => [...stack, JSON.parse(JSON.stringify(canvasDoc))]);
    setUndoStack(stack => stack.slice(0, -1));
    setCanvasDoc(prev);
    setSelectedImage(null);
    setIsDirty(true);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(stack => [...stack, JSON.parse(JSON.stringify(canvasDoc))]);
    setRedoStack(stack => stack.slice(0, -1));
    setCanvasDoc(next);
    setSelectedImage(null);
    setIsDirty(true);
  };

  // -------------------------------------------------------------
  // 12. Eyedropper Tool (Native + Canvas Pixel Fallback)
  // -------------------------------------------------------------
  const handlePickEyedropper = async () => {
    if (window.EyeDropper) {
      try {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          setColor(result.sRGBHex);
          setRecentColors(prev => [result.sRGBHex, ...prev.filter(c => c !== result.sRGBHex)].slice(0, 6));
        }
      } catch (e) {
        // Cancelled by user
      }
    } else {
      alert('Click anywhere on the canvas to pick that color.');
    }
  };

  // -------------------------------------------------------------
  // 13. Autosave & Exit Persistence (1s Debounce, Save on Unload)
  // -------------------------------------------------------------
  const performSave = useCallback(async () => {
    if (!note?.id && !isDirty) return;

    try {
      // Render flattened thumbnail
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvasDoc.width || 1200;
      exportCanvas.height = canvasDoc.height || 900;
      const ctx = exportCanvas.getContext('2d');

      const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      renderBackground(ctx, exportCanvas.width, exportCanvas.height, canvasDoc.background, isDarkMode);

      // Render layers
      (canvasDoc.layers || []).forEach(layer => {
        if (!layer.visible) return;
        ctx.save();
        ctx.globalAlpha = layer.opacity ?? 1;
        (layer.items || []).forEach(item => {
          if (item.type === 'image' || item.type === 'fill_layer') {
            const cachedImg = imageElementCacheRef.current.get(item.id || item.src);
            if (cachedImg && cachedImg.complete) {
              if (item.type === 'fill_layer') {
                ctx.drawImage(cachedImg, 0, 0, exportCanvas.width, exportCanvas.height);
              } else {
                ctx.save();
                ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
                if (item.rotation) ctx.rotate((item.rotation * Math.PI) / 180);
                if (item.flipX || item.flipY) ctx.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1);
                ctx.drawImage(cachedImg, -item.width / 2, -item.height / 2, item.width, item.height);
                ctx.restore();
              }
            }
          } else if (item.type?.startsWith('shape_')) {
            renderShape(ctx, item);
          } else if (item.type === 'text') {
            renderText(ctx, item);
          } else if (item.type === 'sticker') {
            renderSticker(ctx, item);
          } else if (item.type === 'mosaic') {
            renderMosaic(ctx, item, exportCanvas.width, exportCanvas.height);
          } else {
            renderStroke(ctx, item);
          }
        });
        ctx.restore();
      });

      const thumbnail = generateThumbnail(exportCanvas, 400, 300);

      await saveSketch({
        noteId: note.id,
        title,
        description: '',
        imageData: thumbnail,
        strokes: [],
        sketchDoc: canvasDoc
      });

      setSavedStatus('Saved ✓');
      setTimeout(() => setSavedStatus(''), 2000);
      setIsDirty(false);
    } catch (err) {
      console.error('Autosave failed:', err);
    }
  }, [note?.id, title, canvasDoc, isDirty]);

  // Debounced autosave
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      performSave();
    }, 1000);
    return () => clearTimeout(timer);
  }, [isDirty, performSave]);

  // Save on tab close / unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      performSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      performSave();
    };
  }, [performSave]);

  // Clean up empty sketch on exit
  const handleBack = async () => {
    await performSave();
    await deleteEmptySketchIfBlank(note?.id);
    onClose();
  };

  // Export full resolution PNG
  const handleExportPNG = () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasDoc.width || 1200;
    exportCanvas.height = canvasDoc.height || 900;
    const ctx = exportCanvas.getContext('2d');

    const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    renderBackground(ctx, exportCanvas.width, exportCanvas.height, canvasDoc.background, isDarkMode);

    (canvasDoc.layers || []).forEach(layer => {
      if (!layer.visible) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1;
      (layer.items || []).forEach(item => {
        if (item.type === 'image' || item.type === 'fill_layer') {
          const cachedImg = imageElementCacheRef.current.get(item.id || item.src);
          if (cachedImg && cachedImg.complete) {
            if (item.type === 'fill_layer') {
              ctx.drawImage(cachedImg, 0, 0, exportCanvas.width, exportCanvas.height);
            } else {
              ctx.save();
              ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
              if (item.rotation) ctx.rotate((item.rotation * Math.PI) / 180);
              if (item.flipX || item.flipY) ctx.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1);
              ctx.drawImage(cachedImg, -item.width / 2, -item.height / 2, item.width, item.height);
              ctx.restore();
            }
          }
        } else if (item.type?.startsWith('shape_')) {
          renderShape(ctx, item);
        } else if (item.type === 'text') {
          renderText(ctx, item);
        } else if (item.type === 'sticker') {
          renderSticker(ctx, item);
        } else if (item.type === 'mosaic') {
          renderMosaic(ctx, item, exportCanvas.width, exportCanvas.height);
        } else {
          renderStroke(ctx, item);
        }
      });
      ctx.restore();
    });

    const link = document.createElement('a');
    link.download = `${(title || 'sketch').toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div 
      className={`flex flex-col w-full h-full bg-[#E5E7EB] dark:bg-[#0F1115] overflow-hidden select-none relative ${
        isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : ''
      }`}
    >
      {/* Top Bar */}
      <SketchTopBar
        title={title}
        onChangeTitle={(val) => {
          setTitle(val);
          setIsDirty(true);
        }}
        saveStatus={savedStatus}
        onBack={handleBack}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={scale}
        onZoomIn={() => setScale(s => Math.min(4, s * 1.2))}
        onZoomOut={() => setScale(s => Math.max(0.15, s / 1.2))}
        onFitToScreen={handleFitToScreen}
        onResetZoom={handleResetZoom}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        layersCount={canvasDoc.layers?.length || 1}
        onToggleLayers={() => setShowLayers(prev => !prev)}
        showLayers={showLayers}
        onOpenShareModal={() => setShowShareModal(true)}
        onOpenAttachModal={() => setShowAttachModal(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onExportPNG={handleExportPNG}
        onClearCanvas={() => setShowClearConfirm(true)}
        onOpenCanvasPresetModal={() => setShowPresetModal(true)}
        showGuides={canvasDoc.background?.showGuides !== false}
        onToggleGuides={() => {
          setCanvasDoc(prev => ({
            ...prev,
            background: {
              ...prev.background,
              showGuides: !prev.background?.showGuides
            }
          }));
        }}
        onOpenReplay={() => setShowReplay(true)}
        hasPhoto={hasPhoto}
        isPhotoLocked={isPhotoLocked}
        onTogglePhotoLock={() => setIsPhotoLocked(p => !p)}
        symmetryMode={symmetryMode}
      />

      {/* Main Workspace Area (Toolbar + Canvas viewport) */}
      <div className="flex-1 flex flex-col sm:flex-row min-h-0 relative overflow-hidden">
        {/* Drawing Tools Rail */}
        <SketchToolbar
          activeTool={activeTool}
          onSelectTool={(tool) => {
            setActiveTool(tool);
            if (tool !== 'stamp_brush') {
              setActiveStampBrush(null);
            }
            if (tool !== 'select') {
              setSelectedImage(null);
            }
          }}
          color={color}
          brushSize={brushSize}
          showOptions={showOptions}
          onOpenOptions={() => setShowOptions(prev => !prev)}
          onOpenStickers={() => setShowStickers(true)}
          onImportFile={handleImportImage}
          onClearCanvas={() => setShowClearConfirm(true)}
        />

        {/* Viewport Canvas Container */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onPointerEnter={() => {
            if (cursorFollowerRef.current) cursorFollowerRef.current.style.opacity = '1';
          }}
          onPointerLeave={() => {
            if (cursorFollowerRef.current) cursorFollowerRef.current.style.opacity = '0';
          }}
          className="flex-1 min-w-0 min-h-0 relative overflow-hidden cursor-crosshair touch-none"
          style={{
            cursor: activeTool === 'pan' || isSpacePressed ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair'
          }}
        >
          {/* Floating Photo Doodle Mode Banner */}
          {hasPhoto && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-white/95 dark:bg-[#181A20]/95 backdrop-blur-md border border-stone-200/90 dark:border-stone-800/90 rounded-full shadow-lg text-xs animate-fadeIn">
              <span className="text-stone-500 dark:text-stone-400 font-medium flex items-center gap-1">
                📸 Photo Doodle:
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveTool('marker');
                  setColor('#FFFFFF');
                  setBrushSize(8);
                  setOpacity(0.95);
                }}
                className="px-2 py-0.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium transition-colors"
                title="White Outline Marker"
              >
                🖊️ White Marker
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTool('neon');
                  setColor('#00F0FF');
                  setBrushSize(6);
                  setOpacity(1);
                }}
                className="px-2 py-0.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium transition-colors"
                title="Neon Glow Pen"
              >
                ⚡ Neon Pen
              </button>
              <button
                type="button"
                onClick={() => setStickerBorder(prev => !prev)}
                className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                  stickerBorder 
                    ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-semibold' 
                    : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
                title="Thick sticker border around strokes"
              >
                🏷️ Sticker Border {stickerBorder ? '✓' : ''}
              </button>
              <div className="w-[1px] h-3 bg-stone-200 dark:bg-stone-700 mx-0.5" />
              <button
                type="button"
                onClick={() => setIsPhotoLocked(p => !p)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-[11px] underline font-medium"
              >
                {isPhotoLocked ? 'Unlock Photo' : 'Lock Photo'}
              </button>
            </div>
          )}

          {/* Layer 1: Committed canvas for all completed layers, background, and guides */}
          <canvas
            ref={committedCanvasRef}
            className="absolute inset-0 w-full h-full block pointer-events-none"
          />

          {/* Layer 2: Live interactive canvas for the active in-flight stroke only */}
          <canvas
            ref={liveCanvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute inset-0 w-full h-full block touch-none"
          />

          {/* High-performance Zero-re-render Cursor Preview Circle */}
          <div
            ref={cursorFollowerRef}
            className="pointer-events-none fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-500/80 bg-orange-500/10 z-50 transition-[width,height] duration-75 ease-out shadow-sm"
            style={{
              width: Math.max(8, brushSize * scale),
              height: Math.max(8, brushSize * scale),
              transform: 'translate3d(-9999px, -9999px, 0)',
              opacity: 0,
            }}
          />

          {/* Active Image Context Actions Floating Menu */}
          <ImageActionToolbar
            activeImage={selectedImage}
            onRotate90={handleRotateImage90}
            onFlipH={handleFlipImageH}
            onFlipV={handleFlipImageV}
            onChangeOpacity={(newOp) => {
              updateItemInDocument(selectedImage.id, { opacity: newOp });
              setSelectedImage(prev => ({ ...prev, opacity: newOp }));
            }}
            onDeleteImage={handleDeleteSelectedImage}
            onDeselect={() => setSelectedImage(null)}
          />

          {/* Tool Options Popover (Color, Size, Shapes, Text) */}
          {showOptions && (
            <ToolOptionsPopover
              activeTool={activeTool}
              onSelectTool={(tool) => {
                setActiveTool(tool);
                if (tool !== 'stamp_brush') setActiveStampBrush(null);
                if (tool !== 'select') setSelectedImage(null);
              }}
              brushSize={brushSize}
              onChangeBrushSize={setBrushSize}
              color={color}
              onChangeColor={(newCol) => {
                setColor(newCol);
                setRecentColors(prev => [newCol, ...prev.filter(c => c !== newCol)].slice(0, 6));
              }}
              colorB={colorB}
              onChangeColorB={setColorB}
              isGradient={isGradient}
              onToggleGradient={() => setIsGradient(prev => !prev)}
              opacity={opacity}
              onChangeOpacity={setOpacity}
              stabilizer={stabilizer}
              onChangeStabilizer={setStabilizer}
              stickerBorder={stickerBorder}
              onToggleStickerBorder={() => setStickerBorder(prev => !prev)}
              symmetryMode={symmetryMode}
              onChangeSymmetryMode={setSymmetryMode}
              fillTolerance={fillTolerance}
              onChangeFillTolerance={setFillTolerance}
              shapeFill={shapeFill}
              onToggleShapeFill={() => setShapeFill(prev => !prev)}
              textFont={textFont}
              onChangeTextFont={setTextFont}
              textBold={textBold}
              onToggleTextBold={() => setTextBold(prev => !prev)}
              textOutline={textOutline}
              onToggleTextOutline={() => setTextOutline(prev => !prev)}
              textShadow={textShadow}
              onToggleTextShadow={() => setTextShadow(prev => !prev)}
              recentColors={recentColors}
              onPickEyedropper={handlePickEyedropper}
              onClose={() => setShowOptions(false)}
            />
          )}

          {/* Collapsible Layers Panel */}
          <LayersPanel
            isOpen={showLayers}
            onClose={() => setShowLayers(false)}
            layers={canvasDoc.layers || []}
            activeLayerId={activeLayerId}
            onSelectLayer={setActiveLayerId}
            onAddLayer={() => {
              if ((canvasDoc.layers || []).length >= 8) return;
              pushHistory(canvasDoc);
              const newLayer = {
                id: `layer_${Date.now()}`,
                name: `Layer ${(canvasDoc.layers || []).length + 1}`,
                type: 'drawing',
                visible: true,
                opacity: 1,
                items: []
              };
              setCanvasDoc(prev => ({
                ...prev,
                layers: [...(prev.layers || []), newLayer]
              }));
              setActiveLayerId(newLayer.id);
            }}
            onToggleLayerVisibility={(layerId) => {
              setCanvasDoc(prev => ({
                ...prev,
                layers: (prev.layers || []).map(l => l.id === layerId ? { ...l, visible: !l.visible } : l)
              }));
            }}
            onDeleteLayer={(layerId) => {
              if ((canvasDoc.layers || []).length <= 1) return;
              pushHistory(canvasDoc);
              setCanvasDoc(prev => {
                const remaining = (prev.layers || []).filter(l => l.id !== layerId);
                return { ...prev, layers: remaining };
              });
              setActiveLayerId(canvasDoc.layers[0]?.id || 'layer_bg_art');
            }}
            onMoveLayer={(fromIdx, dir) => {
              const toIdx = fromIdx + dir;
              if (toIdx < 0 || toIdx >= (canvasDoc.layers || []).length) return;
              pushHistory(canvasDoc);
              const layers = [...canvasDoc.layers];
              const [moved] = layers.splice(fromIdx, 1);
              layers.splice(toIdx, 0, moved);
              setCanvasDoc(prev => ({ ...prev, layers }));
            }}
            onChangeLayerOpacity={(layerId, newOp) => {
              setCanvasDoc(prev => ({
                ...prev,
                layers: (prev.layers || []).map(l => l.id === layerId ? { ...l, opacity: newOp } : l)
              }));
            }}
          />
        </div>
      </div>


      {/* Shape Assist Snap Undo Toast */}
      {shapeAssistToast.visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-stone-900/90 dark:bg-stone-800/90 text-white rounded-full shadow-xl backdrop-blur-md text-xs font-medium animate-slideUp">
          <span>✨ Snapped to clean shape!</span>
          <button
            type="button"
            onClick={() => {
              if (shapeAssistToast.rawStroke) {
                setCanvasDoc(prev => {
                  const layers = (prev.layers || []).map(layer => {
                    if (layer.id === activeLayerId) {
                      const items = [...layer.items];
                      items.pop(); // remove shape
                      items.push(shapeAssistToast.rawStroke); // restore raw stroke
                      return { ...layer, items };
                    }
                    return layer;
                  });
                  return { ...prev, layers };
                });
              }
              setShapeAssistToast({ visible: false, message: '', rawStroke: null });
            }}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-full font-semibold transition-colors"
          >
            Undo Snap
          </button>
        </div>
      )}

      {/* Clear Canvas Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#181A20] border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Clear Canvas?
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              This will remove all drawings and shapes on all layers. You can undo this action immediately if needed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  pushHistory(canvasDoc);
                  setCanvasDoc(prev => ({
                    ...prev,
                    layers: (prev.layers || []).map(l => ({ ...l, items: [] }))
                  }));
                  setSelectedImage(null);
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
              >
                Clear Canvas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stickers & Icons Picker Modal */}
      <StickerPickerModal
        isOpen={showStickers}
        onClose={() => setShowStickers(false)}
        currentStamp={currentStamp}
        activeStampBrush={Boolean(activeStampBrush)}
        onEnableStampBrush={(emoji) => {
          setCurrentStamp(emoji);
          setActiveStampBrush(emoji);
          setActiveTool('stamp_brush');
        }}
        onSelectSticker={(emoji) => {
          pushHistory(canvasDoc);
          const docW = canvasDoc.width || 1200;
          const docH = canvasDoc.height || 900;
          addItemToActiveLayer({
            id: `sticker_${Date.now()}`,
            type: 'sticker',
            emoji,
            x: docW / 2,
            y: docH / 2,
            size: brushSize * 8,
            opacity: 1
          });
        }}
      />

      {/* Drawing Replay Modal */}
      <ReplayModal
        isOpen={showReplay}
        onClose={() => setShowReplay(false)}
        canvasDoc={canvasDoc}
        title={title}
      />

      {/* Shortcuts Cheat Sheet Modal */}
      <ShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Canvas Preset / Aspect Ratio Picker Modal */}
      <CanvasPresetsModal
        isOpen={showPresetModal}
        onClose={() => setShowPresetModal(false)}
        onSelectPreset={({ preset, background }) => {
          setShowPresetModal(false);
          pushHistory(canvasDoc);
          setCanvasDoc(prev => ({
            ...prev,
            preset: preset.id,
            width: preset.width || (containerRef.current?.clientWidth || 1200),
            height: preset.height || (containerRef.current?.clientHeight || 900),
            background
          }));
          setTimeout(handleFitToScreen, 50);
        }}
      />

      {/* Attach Sketch to Note Modal */}
      {showAttachModal && (
        <AttachToNoteModal
          isOpen={showAttachModal}
          onClose={() => setShowAttachModal(false)}
          sketchTitle={title}
          onAttach={async (targetNote) => {
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = canvasDoc.width || 1200;
            exportCanvas.height = canvasDoc.height || 900;
            const ctx = exportCanvas.getContext('2d');
            const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            renderBackground(ctx, exportCanvas.width, exportCanvas.height, canvasDoc.background, isDarkMode);

            (canvasDoc.layers || []).forEach(layer => {
              if (!layer.visible) return;
              ctx.save();
              ctx.globalAlpha = layer.opacity ?? 1;
              (layer.items || []).forEach(item => {
                if (item.type === 'image' || item.type === 'fill_layer') {
                  const cachedImg = imageElementCacheRef.current.get(item.id || item.src);
                  if (cachedImg && cachedImg.complete) {
                    if (item.type === 'fill_layer') {
                      ctx.drawImage(cachedImg, 0, 0, exportCanvas.width, exportCanvas.height);
                    } else {
                      ctx.save();
                      ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
                      if (item.rotation) ctx.rotate((item.rotation * Math.PI) / 180);
                      if (item.flipX || item.flipY) ctx.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1);
                      ctx.drawImage(cachedImg, -item.width / 2, -item.height / 2, item.width, item.height);
                      ctx.restore();
                    }
                  }
                } else if (item.type?.startsWith('shape_')) {
                  renderShape(ctx, item);
                } else if (item.type === 'text') {
                  renderText(ctx, item);
                } else if (item.type === 'sticker') {
                  renderSticker(ctx, item);
                } else if (item.type === 'mosaic') {
                  renderMosaic(ctx, item, exportCanvas.width, exportCanvas.height);
                } else {
                  renderStroke(ctx, item);
                }
              });
              ctx.restore();
            });

            const imgData = exportCanvas.toDataURL('image/png');
            await attachSketchToNote({
              targetNoteId: targetNote.id,
              title: title || 'Attached Sketch',
              description: '',
              imageData: imgData,
              strokes: []
            });
          }}
        />
      )}

      {/* Share & Export Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        canvasDoc={canvasDoc}
        title={title}
        description={note?.content?.description || ''}
      />
    </div>
  );
}