import React, { useState } from 'react';
import { 
  Pipette, 
  Bold, 
  Check, 
  Sliders, 
  Palette, 
  Sparkles, 
  PenTool,
  Droplets,
  Zap,
  Highlighter,
  Pencil
} from 'lucide-react';
import { 
  DOODLE_BRUSHES, 
  PALETTE_COLORS, 
  PALETTE_PRESETS, 
  FONTS, 
  SYMMETRY_MODES 
} from '../../lib/sketch/types';

export default function ToolOptionsPopover({
  activeTool,
  onSelectTool,
  brushSize,
  onChangeBrushSize,
  color,
  onChangeColor,
  colorB,
  onChangeColorB,
  isGradient = false,
  onToggleGradient,
  opacity = 1,
  onChangeOpacity,
  stabilizer = 0.5,
  onChangeStabilizer,
  stickerBorder = false,
  onToggleStickerBorder,
  symmetryMode = 'off',
  onChangeSymmetryMode,
  fillTolerance = 32,
  onChangeFillTolerance,
  shapeFill = false,
  onToggleShapeFill,
  textFont,
  onChangeTextFont,
  textBold,
  onToggleTextBold,
  textOutline = false,
  onToggleTextOutline,
  textShadow = false,
  onToggleTextShadow,
  recentColors = [],
  onPickEyedropper,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('brush'); // 'brush' | 'color' | 'more'
  const [paletteGroup, setPaletteGroup] = useState('standard'); // 'standard' | 'pastel' | 'neon' | 'earth' | 'mono'

  const isShape = activeTool?.startsWith('shape_');
  const isText = activeTool === 'text';
  const isEraser = activeTool?.startsWith('eraser');
  const isMosaic = activeTool === 'mosaic';
  const isFill = activeTool === 'fill';

  const currentBrush = DOODLE_BRUSHES.find(b => b.id === activeTool) || DOODLE_BRUSHES[0];

  return (
    <div
      className="absolute top-14 left-14 z-40 bg-card-default/95 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-3 w-72 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Tab Bar: Brush | Color | More */}
      <div className="flex items-center gap-1 p-0.5 bg-black/5 dark:bg-white/5 rounded-xl text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('brush')}
          className={`flex-1 py-1 rounded-lg font-medium transition-all ${
            activeTab === 'brush'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Brush
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('color')}
          className={`flex-1 py-1 rounded-lg font-medium transition-all ${
            activeTab === 'color'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Color
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('more')}
          className={`flex-1 py-1 rounded-lg font-medium transition-all ${
            activeTab === 'more'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          More
        </button>
      </div>

      {/* ----------------- TAB 1: BRUSH & SIZE ----------------- */}
      {activeTab === 'brush' && (
        <div className="flex flex-col gap-3">
          {/* 8 Doodle Brushes Grid (if freehand drawing) */}
          {!isShape && !isText && !isEraser && !isMosaic && !isFill && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Doodle Brushes
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {DOODLE_BRUSHES.map(b => {
                  const isSelected = activeTool === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onSelectTool(b.id)}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[11px] font-medium transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 font-semibold ring-1 ring-orange-500/30 scale-105'
                          : 'border-black/10 dark:border-white/10 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      title={`${b.label} — ${b.desc}`}
                    >
                      <span className="text-[10px] truncate">{b.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Slider with Live Preview */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
              <span>{isText ? 'Font Size' : 'Brush Size'}</span>
              <span>{brushSize}px</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={isText ? 12 : 1}
                max={isText ? 72 : 48}
                value={brushSize}
                onChange={(e) => onChangeBrushSize(parseInt(e.target.value, 10))}
                className="flex-1 accent-orange-500 h-1.5 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
              />
              <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                <span
                  className="rounded-full transition-all duration-75"
                  style={{
                    width: `${Math.min(26, Math.max(3, brushSize))}px`,
                    height: `${Math.min(26, Math.max(3, brushSize))}px`,
                    backgroundColor: isEraser ? '#999' : (isGradient && colorB ? colorB : color)
                  }}
                />
              </div>
            </div>
          </div>

          {/* Opacity Slider */}
          {!isEraser && !isFill && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
                <span>Opacity</span>
                <span>{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round(opacity * 100)}
                onChange={(e) => onChangeOpacity(parseInt(e.target.value, 10) / 100)}
                className="w-full accent-orange-500 h-1.5 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Fill Tolerance (when activeTool is fill) */}
          {isFill && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
                <span>Fill Tolerance</span>
                <span>{fillTolerance}</span>
              </div>
              <input
                type="range"
                min={5}
                max={90}
                value={fillTolerance}
                onChange={(e) => onChangeFillTolerance(parseInt(e.target.value, 10))}
                className="w-full accent-orange-500 h-1.5 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Shape Settings */}
          {isShape && (
            <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5 text-xs">
              <span className="text-text-secondary font-medium">Fill Shape</span>
              <button
                type="button"
                onClick={onToggleShapeFill}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                  shapeFill
                    ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                    : 'border-black/10 dark:border-white/10 text-text-muted hover:text-text-primary'
                }`}
              >
                {shapeFill ? 'Filled ✓' : 'Outline'}
              </button>
            </div>
          )}

          {/* Text Settings */}
          {isText && (
            <div className="flex flex-col gap-2 pt-1 border-t border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-secondary font-medium">Font Family</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onToggleTextBold}
                    className={`p-1 rounded-lg border text-xs transition-colors ${
                      textBold
                        ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                        : 'border-black/10 dark:border-white/10 text-text-muted'
                    }`}
                    title="Bold text"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onToggleTextOutline}
                    className={`px-1.5 py-0.5 rounded-lg border text-[10px] font-medium transition-colors ${
                      textOutline
                        ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                        : 'border-black/10 dark:border-white/10 text-text-muted'
                    }`}
                    title="Add white outline (great for photos)"
                  >
                    Outline
                  </button>
                  <button
                    type="button"
                    onClick={onToggleTextShadow}
                    className={`px-1.5 py-0.5 rounded-lg border text-[10px] font-medium transition-colors ${
                      textShadow
                        ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                        : 'border-black/10 dark:border-white/10 text-text-muted'
                    }`}
                    title="Add text drop shadow"
                  >
                    Shadow
                  </button>
                </div>
              </div>
              <select
                value={textFont}
                onChange={(e) => onChangeTextFont(e.target.value)}
                className="w-full text-xs p-1.5 rounded-xl bg-bg-primary border border-black/10 dark:border-white/10 text-text-primary focus:outline-none"
              >
                {FONTS.map(f => (
                  <option key={f.id} value={f.family}>{f.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 2: COLOR PALETTES ----------------- */}
      {activeTab === 'color' && !isEraser && !isMosaic && (
        <div className="flex flex-col gap-2.5">
          {/* Eyedropper & Palette Categories */}
          <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
            <div className="flex items-center gap-1">
              {['standard', 'pastel', 'neon', 'earth', 'mono'].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setPaletteGroup(g)}
                  className={`text-[10px] capitalize px-1.5 py-0.5 rounded-md transition-colors ${
                    paletteGroup === g
                      ? 'bg-orange-500 text-white font-medium'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            {onPickEyedropper && (
              <button
                type="button"
                onClick={onPickEyedropper}
                className="flex items-center gap-0.5 text-[10px] text-orange-500 hover:text-orange-600 transition-colors shrink-0"
                title="Eyedropper: pick from canvas or photo"
              >
                <Pipette className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Color Swatches Grid */}
          <div className="grid grid-cols-6 gap-1.5">
            {(paletteGroup === 'standard' ? PALETTE_COLORS : (PALETTE_PRESETS[paletteGroup] || PALETTE_COLORS)).map((c) => {
              const isSelected = color?.toLowerCase() === c.color?.toLowerCase();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChangeColor(c.color)}
                  className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-transform hover:scale-110 ${
                    isSelected ? 'ring-2 ring-orange-500 ring-offset-1 scale-105' : 'border-black/10 dark:border-white/10'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                >
                  {isSelected && (
                    <Check className={`w-3.5 h-3.5 ${c.color === '#ECEEF2' || c.color === '#FFFFFF' || c.color === '#FFF3B0' ? 'text-black' : 'text-white'}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div className="flex items-center gap-1.5 pt-2 border-t border-black/5 dark:border-white/5">
              <span className="text-[10px] text-text-muted">Recents:</span>
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {recentColors.slice(0, 8).map((rc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChangeColor(rc)}
                    className="w-5 h-5 rounded-lg border border-black/10 dark:border-white/10 shrink-0"
                    style={{ backgroundColor: rc }}
                    title={rc}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Gradient Brush Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-xs">
            <span className="text-text-secondary font-medium">Two-Color Gradient</span>
            <button
              type="button"
              onClick={onToggleGradient}
              className={`px-2 py-0.5 rounded-lg border text-xs font-medium transition-colors ${
                isGradient
                  ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                  : 'border-black/10 dark:border-white/10 text-text-muted'
              }`}
            >
              {isGradient ? 'Enabled ✓' : 'Off'}
            </button>
          </div>

          {isGradient && (
            <div className="flex items-center gap-2 p-1.5 bg-black/5 dark:bg-white/5 rounded-xl text-xs">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-text-muted">Color A:</span>
                <span className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: color }} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-text-muted">Color B:</span>
                <input
                  type="color"
                  value={colorB || '#38BDF8'}
                  onChange={(e) => onChangeColorB(e.target.value)}
                  className="w-5 h-5 rounded-full cursor-pointer bg-transparent border-0"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 3: MORE (ADVANCED) ----------------- */}
      {activeTab === 'more' && (
        <div className="flex flex-col gap-3">
          {/* Stroke Stabilizer / Smoothing */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
              <span>Stroke Stabilizer</span>
              <span>{Math.round(stabilizer * 100)}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={95}
              value={Math.round(stabilizer * 100)}
              onChange={(e) => onChangeStabilizer(parseInt(e.target.value, 10) / 100)}
              className="w-full accent-orange-500 h-1.5 bg-black/10 dark:bg-white/10 rounded-lg cursor-pointer"
            />
            <span className="text-[9px] text-text-muted">Smooths out hand jitter and shaky lines</span>
          </div>

          {/* Symmetry Mode */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
              <span>Symmetry Mode</span>
              <span className="text-[10px] text-orange-500 font-semibold">{symmetryMode}</span>
            </div>
            <select
              value={symmetryMode}
              onChange={(e) => onChangeSymmetryMode(e.target.value)}
              className="w-full text-xs p-1.5 rounded-xl bg-bg-primary border border-black/10 dark:border-white/10 text-text-primary focus:outline-none"
            >
              {SYMMETRY_MODES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Sticker Border Outline */}
          <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-xs">
            <div>
              <span className="text-text-secondary font-medium block">Sticker Outline</span>
              <span className="text-[9px] text-text-muted">Thick white pop border</span>
            </div>
            <button
              type="button"
              onClick={onToggleStickerBorder}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                stickerBorder
                  ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                  : 'border-black/10 dark:border-white/10 text-text-muted hover:text-text-primary'
              }`}
            >
              {stickerBorder ? 'Active ✓' : 'Off'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
