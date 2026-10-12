import React, { useRef } from 'react';
import {
  MousePointer,
  PenTool,
  Highlighter,
  Pencil,
  Eraser,
  Square,
  Circle,
  Triangle,
  Minus,
  MoveUpRight,
  Type,
  ShieldAlert,
  Smile,
  Image as ImageIcon,
  Camera,
  Hand,
  PaintBucket,
  Trash2
} from 'lucide-react';

export default function SketchToolbar({
  activeTool,
  onSelectTool,
  color,
  brushSize,
  onOpenOptions,
  onOpenStickers,
  onImportFile,
  onClearCanvas,
  showOptions
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file);
      e.target.value = '';
    }
  };

  return (
    <>
      {/* Hidden file inputs for File Picker and Mobile Camera */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Toolbar Container: Left vertical rail on >=sm, bottom bar on mobile */}
      <aside 
        className="z-30 shrink-0 flex sm:flex-col items-center justify-start gap-1 p-1 sm:p-1.5 bg-card-default/95 backdrop-blur-md border-t sm:border-t-0 sm:border-r border-black/10 dark:border-white/10 sm:w-13 sm:h-full overflow-x-auto sm:overflow-y-auto shadow-sm [scrollbar-width:thin] [scrollbar-color:rgba(150,150,150,0.25)_transparent] pb-6 select-none"
        aria-label="Drawing Tools"
      >
        {/* Tool Options Trigger (Color dot + size indicator) - Placed near top for instant access */}
        <button
          type="button"
          onClick={onOpenOptions}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex flex-col items-center justify-center gap-0.5 border transition-all shrink-0 ${
            showOptions
              ? 'border-orange-500 bg-orange-500/15 ring-1 ring-orange-500/30'
              : 'border-black/10 dark:border-white/10 hover:border-orange-500/50'
          }`}
          title="Color & Size settings"
          aria-label="Brush settings"
        >
          <span
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-black/20 dark:border-white/20 shadow-xs transition-transform hover:scale-110"
            style={{ backgroundColor: color }}
          />
          <span className="text-[8px] sm:text-[9px] font-mono text-text-muted leading-none font-medium">
            {brushSize}px
          </span>
        </button>

        <div className="hidden sm:block w-5 h-[1px] bg-black/10 dark:bg-white/10 my-0.5" />

        {/* Select / Move */}
        <button
          type="button"
          onClick={() => onSelectTool('select')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'select'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Select / Move tool (V)"
          aria-label="Select tool"
        >
          <MousePointer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Hand / Pan */}
        <button
          type="button"
          onClick={() => onSelectTool('pan')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'pan'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Hand tool / Pan (H or Space+drag)"
          aria-label="Pan tool"
        >
          <Hand className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <div className="hidden sm:block w-5 h-[1px] bg-black/10 dark:bg-white/10 my-0.5" />

        {/* Pen */}
        <button
          type="button"
          onClick={() => onSelectTool('pen')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'pen'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Pen (P) - Smooth pressure ink"
          aria-label="Pen"
        >
          <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Marker */}
        <button
          type="button"
          onClick={() => onSelectTool('marker')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'marker'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Marker - Chiseled bold ink"
          aria-label="Marker"
        >
          <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-current rounded-xs rotate-45" />
        </button>

        {/* Highlighter */}
        <button
          type="button"
          onClick={() => onSelectTool('highlighter')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'highlighter'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Highlighter - Semi-transparent multiply"
          aria-label="Highlighter"
        >
          <Highlighter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Pencil */}
        <button
          type="button"
          onClick={() => onSelectTool('pencil')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'pencil'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Pencil - Textured sketching"
          aria-label="Pencil"
        >
          <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Eraser */}
        <button
          type="button"
          onClick={() => {
            if (activeTool === 'eraser_stroke') onSelectTool('eraser_pixel');
            else onSelectTool('eraser_stroke');
          }}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool?.startsWith('eraser')
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title={`Eraser (E) - Current: ${activeTool === 'eraser_pixel' ? 'Pixel' : 'Stroke'} eraser`}
          aria-label="Eraser"
        >
          <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Fill Bucket (Flood Fill) */}
        <button
          type="button"
          onClick={() => onSelectTool('fill')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'fill'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Fill Bucket (F) - Tap area to flood fill"
          aria-label="Fill Bucket"
        >
          <PaintBucket className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <div className="hidden sm:block w-5 h-[1px] bg-black/10 dark:bg-white/10 my-0.5" />

        {/* Rectangle Shape */}
        <button
          type="button"
          onClick={() => onSelectTool('shape_rect')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'shape_rect'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Rectangle (Hold Shift for square)"
          aria-label="Rectangle"
        >
          <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Ellipse Shape */}
        <button
          type="button"
          onClick={() => onSelectTool('shape_ellipse')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'shape_ellipse'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Ellipse / Circle (Hold Shift for circle)"
          aria-label="Ellipse"
        >
          <Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Triangle Shape */}
        <button
          type="button"
          onClick={() => onSelectTool('shape_triangle')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'shape_triangle'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Triangle"
          aria-label="Triangle"
        >
          <Triangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Line Shape */}
        <button
          type="button"
          onClick={() => onSelectTool('shape_line')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'shape_line'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Straight line (Hold Shift for 45°)"
          aria-label="Line"
        >
          <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Arrow Shape */}
        <button
          type="button"
          onClick={() => onSelectTool('shape_arrow')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'shape_arrow'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Arrow"
          aria-label="Arrow"
        >
          <MoveUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Text */}
        <button
          type="button"
          onClick={() => onSelectTool('text')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'text'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Text (T) - Tap to add label"
          aria-label="Text"
        >
          <Type className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Privacy Mosaic / Blur */}
        <button
          type="button"
          onClick={() => onSelectTool('mosaic')}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            activeTool === 'mosaic'
              ? 'bg-orange-500 text-white shadow-sm scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Blur / Mosaic brush - Obscure sensitive info"
          aria-label="Mosaic blur"
        >
          <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Stickers & Icons */}
        <button
          type="button"
          onClick={onOpenStickers}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0"
          title="Emoji &amp; Stickers"
          aria-label="Stickers"
        >
          <Smile className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Import Photo File */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0"
          title="Import image from file"
          aria-label="Import image"
        >
          <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Camera Capture on Mobile */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="sm:hidden w-8 h-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all shrink-0"
          title="Take photo with camera"
          aria-label="Camera"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>

        {/* Clear Canvas with Undo */}
        {onClearCanvas && (
          <button
            type="button"
            onClick={onClearCanvas}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-rose-500/80 hover:text-rose-600 hover:bg-rose-500/10 transition-all shrink-0"
            title="Clear canvas (with undo)"
            aria-label="Clear Canvas"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}
      </aside>
    </>
  );
}
