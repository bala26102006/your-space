export const CANVAS_PRESETS = [
  { id: 'free', label: 'Free Canvas', desc: 'Auto-adapts to your screen', width: null, height: null, icon: 'Maximize2' },
  { id: 'square', label: 'Square (1:1)', desc: '1080 × 1080 px • Instagram, avatar', width: 1080, height: 1080, ratio: 1 },
  { id: 'portrait', label: 'Portrait (4:5)', desc: '1080 × 1350 px • Social feed', width: 1080, height: 1350, ratio: 4 / 5 },
  { id: 'story', label: 'Story (9:16)', desc: '1080 × 1920 px • Mobile, status, reels', width: 1080, height: 1920, ratio: 9 / 16 },
  { id: 'landscape', label: 'Landscape (16:9)', desc: '1920 × 1080 px • Slides, desktop', width: 1920, height: 1080, ratio: 16 / 9 },
  { id: 'a4', label: 'A4 Document', desc: '1240 × 1754 px (150 DPI) • Print, notes', width: 1240, height: 1754, ratio: 1240 / 1754 }
];

export const BACKGROUND_PATTERNS = [
  { id: 'white', label: 'White', color: '#FFFFFF', pattern: 'none' },
  { id: 'dark', label: 'Dark Surface', color: '#1A1D23', pattern: 'none' },
  { id: 'transparent', label: 'Transparent', color: 'transparent', pattern: 'checker' },
  { id: 'dot_grid', label: 'Dot Grid', color: 'adaptive', pattern: 'dots' },
  { id: 'grid', label: 'Graph Grid', color: 'adaptive', pattern: 'grid' },
  { id: 'lined', label: 'Lined Paper', color: 'adaptive', pattern: 'lined' }
];

export const DOODLE_BRUSHES = [
  { id: 'pen', label: 'Pen', desc: 'Smooth ink', icon: 'PenTool', defaultSize: 4, defaultOpacity: 1 },
  { id: 'marker', label: 'Marker', desc: 'Chiseled bold', icon: 'Highlighter', defaultSize: 8, defaultOpacity: 0.9 },
  { id: 'highlighter', label: 'Highlighter', desc: 'Semi-transparent multiply', icon: 'Highlighter', defaultSize: 18, defaultOpacity: 0.45 },
  { id: 'pencil', label: 'Pencil', desc: 'Grainy texture', icon: 'Pencil', defaultSize: 3, defaultOpacity: 0.75 },
  { id: 'crayon', label: 'Crayon', desc: 'Rough waxy edge', icon: 'Palette', defaultSize: 7, defaultOpacity: 0.85 },
  { id: 'neon', label: 'Neon', desc: 'Electric glow', icon: 'Zap', defaultSize: 5, defaultOpacity: 1 },
  { id: 'watercolor', label: 'Watercolor', desc: 'Soft wash bleed', icon: 'Droplets', defaultSize: 14, defaultOpacity: 0.45 },
  { id: 'rainbow', label: 'Rainbow', desc: 'Cycles dynamic colors', icon: 'Sparkles', defaultSize: 5, defaultOpacity: 1 }
];

export const PALETTE_COLORS = [
  { id: 'white', label: 'Off White', color: '#ECEEF2' },
  { id: 'charcoal', label: 'Charcoal', color: '#2C2A28' },
  { id: 'black', label: 'Pitch Black', color: '#000000' },
  { id: 'orange', label: 'Studio Orange', color: '#FB923C' },
  { id: 'amber', label: 'Warm Amber', color: '#F59E0B' },
  { id: 'terracotta', label: 'Terracotta', color: '#E06C75' },
  { id: 'rose', label: 'Rose Pink', color: '#FB7185' },
  { id: 'lavender', label: 'Lavender', color: '#A78BFA' },
  { id: 'indigo', label: 'Deep Indigo', color: '#6366F1' },
  { id: 'sky', label: 'Sky Blue', color: '#38BDF8' },
  { id: 'sage', label: 'Sage Green', color: '#7E9F80' },
  { id: 'emerald', label: 'Emerald', color: '#10B981' }
];

export const PALETTE_PRESETS = {
  pastel: [
    { id: 'p1', label: 'Peach', color: '#FFD1BA' },
    { id: 'p2', label: 'Butter', color: '#FFF3B0' },
    { id: 'p3', label: 'Mint', color: '#C1FBA4' },
    { id: 'p4', label: 'Sky Pastel', color: '#BDE0FE' },
    { id: 'p5', label: 'Lilac', color: '#E8D7F1' },
    { id: 'p6', label: 'Blush', color: '#FFC6FF' }
  ],
  neon: [
    { id: 'n1', label: 'Neon Pink', color: '#FF1493' },
    { id: 'n2', label: 'Neon Green', color: '#39FF14' },
    { id: 'n3', label: 'Neon Cyan', color: '#00F0FF' },
    { id: 'n4', label: 'Electric Yellow', color: '#FFE600' },
    { id: 'n5', label: 'Neon Purple', color: '#B026FF' },
    { id: 'n6', label: 'Neon Orange', color: '#FF5E00' }
  ],
  earth: [
    { id: 'e1', label: 'Warm Ochre', color: '#C68B59' },
    { id: 'e2', label: 'Terracotta', color: '#B35446' },
    { id: 'e3', label: 'Olive Sage', color: '#708238' },
    { id: 'e4', label: 'Deep Moss', color: '#4A5D4E' },
    { id: 'e5', label: 'Clay Brown', color: '#7E523A' },
    { id: 'e6', label: 'Sand', color: '#D8C3A5' }
  ],
  mono: [
    { id: 'm1', label: 'Pitch Black', color: '#000000' },
    { id: 'm2', label: 'Charcoal', color: '#2A2E35' },
    { id: 'm3', label: 'Slate', color: '#5A6270' },
    { id: 'm4', label: 'Cool Grey', color: '#9AA0AC' },
    { id: 'm5', label: 'Silver', color: '#D1D5DB' },
    { id: 'm6', label: 'Pure White', color: '#FFFFFF' }
  ]
};

export const FONTS = [
  { id: 'sans', label: 'Inter (Clean Sans)', family: 'Inter, system-ui, sans-serif' },
  { id: 'caveat', label: 'Caveat (Playful Script)', family: '"Caveat", cursive' },
  { id: 'patrick', label: 'Patrick Hand (Marker Hand)', family: '"Patrick Hand", cursive' },
  { id: 'kalam', label: 'Kalam (Casual Handwriting)', family: '"Kalam", cursive' },
  { id: 'indie', label: 'Indie Flower (Doodle Style)', family: '"Indie Flower", cursive' },
  { id: 'serif', label: 'Serif (Classic)', family: 'Georgia, Cambria, serif' },
  { id: 'mono', label: 'Mono (Code)', family: 'ui-monospace, monospace' },
  { id: 'display', label: 'Impact (Bold Display)', family: 'Impact, "Arial Black", sans-serif' }
];

export const STAMPS = [
  '⭐', '✨', '❤️', '🔥', '⚡', '💡', '🚀', '🎯', '🌸', '🌈',
  '☁️', '☀️', '🌙', '💬', '💭', '✏️', '🎨', '🎉', '💯', '👍',
  '👏', '👀', '🌿', '☕', '🍩', '🍕', '🐱', '🐶', '🎵', '🏆',
  '📌', '🏷️', '🔑', '💎', '🛡️', '📦', '⚠️', '✅', '❌', '🤍'
];

export const STICKERS = STAMPS;

export const SYMMETRY_MODES = [
  { id: 'off', label: 'Off', axes: 0 },
  { id: 'vertical', label: 'Vertical Mirror (Left ⇄ Right)', axes: 2 },
  { id: 'horizontal', label: 'Horizontal Mirror (Top ⇄ Bottom)', axes: 2 },
  { id: 'radial4', label: 'Radial 4 (Quadrants)', axes: 4 },
  { id: 'radial6', label: 'Radial 6 Axes', axes: 6 },
  { id: 'radial8', label: 'Radial 8 Axes', axes: 8 }
];

export const DEFAULT_PRESET_KEY = 'yourspace_sketch_preset';

