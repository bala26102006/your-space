import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, RotateCcw, Video, Download, Sparkles } from 'lucide-react';
import { 
  renderStroke, 
  renderShape, 
  renderText, 
  renderSticker, 
  renderMosaic, 
  renderBackground 
} from '../../lib/sketch/strokeRenderer';

export default function ReplayModal({ isOpen, onClose, canvasDoc, title = 'Sketch Replay' }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2); // 1x, 2x, 4x
  const [currentStep, setCurrentStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [exportUrl, setExportUrl] = useState(null);

  // Flatten all drawable items from visible layers in order
  const allItems = React.useMemo(() => {
    if (!canvasDoc?.layers) return [];
    const items = [];
    canvasDoc.layers.forEach(layer => {
      if (!layer.visible) return;
      (layer.items || []).forEach(item => {
        items.push({ ...item, layerOpacity: layer.opacity ?? 1 });
      });
    });
    return items;
  }, [canvasDoc]);

  const totalSteps = allItems.length;
  const docW = canvasDoc?.width || 1200;
  const docH = canvasDoc?.height || 900;

  // Render items up to stepIndex
  const drawFrame = useCallback((stepIndex) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    renderBackground(ctx, canvas.width, canvas.height, canvasDoc?.background, isDarkMode);

    // Items up to stepIndex
    for (let i = 0; i < stepIndex; i++) {
      const item = allItems[i];
      if (!item) continue;

      ctx.save();
      ctx.globalAlpha = item.layerOpacity ?? 1;

      if (item.type?.startsWith('shape_')) {
        renderShape(ctx, item);
      } else if (item.type === 'text') {
        renderText(ctx, item);
      } else if (item.type === 'sticker') {
        renderSticker(ctx, item);
      } else if (item.type === 'mosaic') {
        renderMosaic(ctx, item, canvas.width, canvas.height);
      } else if (item.type === 'image' || item.type === 'fill_layer') {
        if (item._img && item._img.complete) {
          ctx.drawImage(item._img, item.x || 0, item.y || 0, item.width || canvas.width, item.height || canvas.height);
        }
      } else {
        renderStroke(ctx, item);
      }

      ctx.restore();
    }
  }, [allItems, canvasDoc]);

  // Initial draw & canvas resize
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = docW;
      canvas.height = docH;
    }
    setCurrentStep(0);
    drawFrame(0);
    setIsPlaying(true);
  }, [isOpen, docW, docH, drawFrame]);

  // Animation Loop
  useEffect(() => {
    if (!isOpen || !isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const intervalMs = Math.max(16, 250 / speed); // step duration

    const loop = (now) => {
      if (now - lastTime >= intervalMs) {
        lastTime = now;
        setCurrentStep(prev => {
          const next = prev + 1;
          if (next > totalSteps) {
            setIsPlaying(false);
            if (isRecording && mediaRecorderRef.current) {
              mediaRecorderRef.current.stop();
            }
            return totalSteps;
          }
          drawFrame(next);
          return next;
        });
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isPlaying, speed, totalSteps, drawFrame, isRecording]);

  const handleTogglePlay = () => {
    if (currentStep >= totalSteps) {
      setCurrentStep(0);
      drawFrame(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    drawFrame(0);
    setIsPlaying(true);
  };

  const handleScrub = (newStep) => {
    setIsPlaying(false);
    setCurrentStep(newStep);
    drawFrame(newStep);
  };

  // Video Export with MediaRecorder
  const handleRecordVideo = () => {
    const canvas = canvasRef.current;
    if (!canvas || !window.MediaRecorder) {
      alert('MediaRecorder is not supported on this browser.');
      return;
    }

    try {
      recordedChunksRef.current = [];
      const stream = canvas.captureStream(30);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setExportUrl(url);
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      // Restart replay from beginning to capture full recording
      setCurrentStep(0);
      drawFrame(0);
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      alert('Could not record video on this device.');
      setIsRecording(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="replay-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <h3 id="replay-title" className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Drawing Replay
            </h3>
            <span className="text-[11px] text-text-muted">
              ({currentStep} / {totalSteps} strokes)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas Display Viewport */}
        <div className="relative bg-black/10 dark:bg-black/40 flex items-center justify-center p-4 min-h-[300px] max-h-[460px] overflow-hidden">
          <canvas
            ref={canvasRef}
            className="max-h-[420px] max-w-full rounded-xl shadow-lg object-contain bg-white dark:bg-[#1A1D23]"
          />

          {isRecording && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse shadow-md">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>RECORDING REPLAY</span>
            </div>
          )}
        </div>

        {/* Timeline Scrubber */}
        <div className="px-4 pt-3 flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={totalSteps}
            value={currentStep}
            onChange={(e) => handleScrub(parseInt(e.target.value, 10))}
            className="w-full accent-orange-500 h-1.5 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
          />
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between p-3 border-t border-black/10 dark:border-white/10 gap-2">
          {/* Play/Pause & Restart */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="p-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 active:scale-95 transition-all shadow-xs"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={handleRestart}
              className="p-2 rounded-xl border border-black/10 dark:border-white/10 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Restart from beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Speed Pills */}
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl text-xs font-mono">
              {[1, 2, 4].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                    speed === s ? 'bg-orange-500 text-white' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Export Video Option */}
          <div className="flex items-center gap-2">
            {exportUrl ? (
              <a
                href={exportUrl}
                download={`${title.toLowerCase().replace(/\s+/g, '-')}-replay.webm`}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save WebM</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={handleRecordVideo}
                disabled={isRecording}
                className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-medium text-text-primary hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors"
                title="Record & Export Replay as WebM Video"
              >
                <Video className="w-3.5 h-3.5 text-orange-500" />
                <span>Export Video</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
