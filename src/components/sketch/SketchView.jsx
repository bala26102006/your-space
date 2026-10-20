import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, 
  Palette, 
  Trash2, 
  Calendar, 
  Archive, 
  Copy, 
  Sparkles, 
  Share2, 
  Zap, 
  Image as ImageIcon,
  LayoutTemplate,
  Star,
  Pin,
  MoreVertical,
  Edit2,
  Folder,
  FolderPlus,
  Search,
  X,
  Download,
  RotateCw
} from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useUIStore } from '../../store/uiStore';
import { db } from '../../lib/db';
import { 
  createSketchNote, 
  duplicateSketchNote,
  toggleSketchFavorite,
  toggleSketchPin,
  moveSketchToSketchbook,
  renameSketch,
  formatRelativeTime,
  formatFullDateTime,
  migrateLegacySketchDoc
} from '../../lib/services/sketchService';
import { 
  sketchCacheDb, 
  reconcileSketchCache, 
  rebuildSketchCache 
} from '../../lib/sketch/sketchCache';
import { 
  getSketchbooksMeta, 
  saveSketchbookMeta, 
  DEFAULT_SKETCHBOOKS,
  SKETCHBOOK_PALETTE 
} from '../../lib/sketch/sketchbookService';
import { processImageFile } from '../../lib/sketch/imageUtils';
import { GridSkeleton } from '../shared/SkeletonLoader';
import { softDeleteItem, archiveItem } from '../../lib/services/trashService';
import { useConfirmStore } from '../../store/confirmStore';
import CanvasPresetsModal from './CanvasPresetsModal';
import ShareModal from './ShareModal';
import CleanEmptySketchesModal from './CleanEmptySketchesModal';
import SketchThumbnail from './SketchThumbnail';

export default function SketchView() {
  const { 
    selectedNoteId, 
    setSelectedNoteId, 
    viewMode: rawViewMode, 
    sortBy = 'updated', 
    sortOrder = 'desc' 
  } = useUIStore();
  const { openSoftDelete } = useConfirmStore();

  // Normalize viewMode: only 'wall' in sketch, otherwise 'grid' or 'list'
  const viewMode = rawViewMode === 'wall' || rawViewMode === 'list' ? rawViewMode : 'grid';

  // Modal and action states
  const [shareTarget, setShareTarget] = useState(null);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [showNewSketchbookModal, setShowNewSketchbookModal] = useState(false);
  const [moveTargetSketch, setMoveTargetSketch] = useState(null);
  const [activeCardMenuId, setActiveCardMenuId] = useState(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'doodle' | 'sketch' | 'photo' | 'favorites'
  const [activeSketchbook, setActiveSketchbook] = useState('all');

  // Inline rename state
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef(null);

  // Hidden photo file input
  const photoInputRef = useRef(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Reconcile cache on initial mount
  useEffect(() => {
    reconcileSketchCache();
  }, []);

  // Fetch sketches directly from the ultra-fast lightweight cache DB
  const rawCachedSketches = useLiveQuery(() => {
    return sketchCacheDb.sketches
      .filter(s => !s.is_deleted && !s.is_archived)
      .toArray();
  }, []);

  const cachedSketches = rawCachedSketches || [];
  const isLoading = rawCachedSketches === undefined;

  // Sketchbooks metadata
  const [sketchbooksMeta, setSketchbooksMeta] = useState(getSketchbooksMeta);
  const refreshSketchbooks = () => setSketchbooksMeta(getSketchbooksMeta());

  // Aggregate sketchbooks from metadata and actual sketch records
  const availableSketchbooks = useMemo(() => {
    const set = new Set(Object.keys(sketchbooksMeta));
    cachedSketches.forEach(s => {
      if (s.sketchbook) set.add(s.sketchbook);
    });
    return Array.from(set);
  }, [sketchbooksMeta, cachedSketches]);

  // Filtered & Sorted sketches
  const filteredSketches = useMemo(() => {
    let list = cachedSketches;

    // Filter by sketchbook
    if (activeSketchbook !== 'all') {
      list = list.filter(s => (s.sketchbook || 'General') === activeSketchbook);
    }

    // Filter by type / favorite
    if (activeFilter === 'favorites') {
      list = list.filter(s => s.is_favorite);
    } else if (activeFilter === 'doodle') {
      list = list.filter(s => s.entry_type === 'doodle');
    } else if (activeFilter === 'sketch') {
      list = list.filter(s => s.entry_type === 'sketch');
    } else if (activeFilter === 'photo') {
      list = list.filter(s => s.entry_type === 'photo');
    }

    // Search query filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(s => 
        (s.title || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.sketchbook || '').toLowerCase().includes(q)
      );
    }

    // Sort: Pinned items always stay at the top
    const isDesc = sortOrder === 'desc';
    return [...list].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1;
      }

      if (sortBy === 'title') {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return isDesc ? titleB.localeCompare(titleA) : titleA.localeCompare(titleB);
      }

      if (sortBy === 'created') {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return isDesc ? timeB - timeA : timeA - timeB;
      }

      // Default: Last edited (real_edited_at or updated_at)
      const editA = new Date(a.real_edited_at || a.updated_at || a.created_at || 0).getTime();
      const editB = new Date(b.real_edited_at || b.updated_at || b.created_at || 0).getTime();
      return isDesc ? editB - editA : editA - editB;
    });
  }, [cachedSketches, activeSketchbook, activeFilter, searchQuery, sortBy, sortOrder]);

  // --- Handlers: Start Strip ---

  // Quick Doodle (Shortcut 'D')
  const handleQuickDoodle = useCallback(async () => {
    try {
      const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const initialDoc = {
        version: 2,
        preset: 'free',
        width: 1200,
        height: 900,
        background: {
          id: isDarkMode ? 'dark' : 'white',
          pattern: 'dots',
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

      const newId = await createSketchNote({
        mode: 'doodle',
        entryType: 'doodle',
        sketchbook: 'Doodles',
        initialDoc
      });
      setSelectedNoteId(newId);
    } catch (err) {
      console.error('Failed to create quick doodle:', err);
    }
  }, [setSelectedNoteId]);

  // New Sketch
  const handleNewSketch = useCallback(async () => {
    try {
      const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const initialDoc = {
        version: 2,
        preset: 'free',
        width: 1200,
        height: 900,
        background: {
          id: isDarkMode ? 'dark' : 'white',
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

      const newId = await createSketchNote({
        mode: 'sketch',
        entryType: 'sketch',
        sketchbook: 'General',
        initialDoc
      });
      setSelectedNoteId(newId);
    } catch (err) {
      console.error('Failed to create new sketch:', err);
    }
  }, [setSelectedNoteId]);

  // From Photo
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('Processing photo...');
      const { src, width, height } = await processImageFile(file);
      const canvasW = 1200;
      const canvasH = 900;
      const fitScale = Math.min((canvasW - 80) / width, (canvasH - 80) / height, 1);
      const w = Math.round(width * fitScale);
      const h = Math.round(height * fitScale);

      const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const initialDoc = {
        version: 2,
        preset: 'free',
        width: canvasW,
        height: canvasH,
        background: { id: isDarkMode ? 'dark' : 'white', pattern: 'none', showGuides: false },
        layers: [
          {
            id: 'layer_photo',
            name: 'Photo',
            type: 'image',
            visible: true,
            opacity: 1,
            items: [
              {
                id: `photo_item_${Date.now()}`,
                type: 'image',
                src,
                x: Math.round((canvasW - w) / 2),
                y: Math.round((canvasH - h) / 2),
                width: w,
                height: h,
                rotation: 0,
                opacity: 1
              }
            ]
          },
          {
            id: 'layer_drawing',
            name: 'Annotation',
            type: 'drawing',
            visible: true,
            opacity: 1,
            items: []
          }
        ]
      };

      const cleanFileName = file.name.replace(/\.[^/.]+$/, '').slice(0, 30);
      const title = cleanFileName ? `Photo · ${cleanFileName}` : '';

      const newId = await createSketchNote({
        title,
        mode: 'sketch',
        entryType: 'photo',
        sketchbook: 'General',
        initialDoc
      });
      setSelectedNoteId(newId);
    } catch (err) {
      console.error('Failed to import photo:', err);
      showToast('Failed to load image');
    } finally {
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  // Template chosen
  const handleSelectPreset = async (preset) => {
    setShowPresetsModal(false);
    try {
      const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const w = preset.width || 1200;
      const h = preset.height || 900;

      const initialDoc = {
        version: 2,
        preset: preset.id,
        width: w,
        height: h,
        background: {
          id: isDarkMode ? 'dark' : 'white',
          pattern: preset.id === 'free' ? 'grid' : 'none',
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

      const newId = await createSketchNote({
        title: `Sketch · ${preset.label}`,
        mode: 'sketch',
        entryType: 'sketch',
        sketchbook: 'General',
        initialDoc
      });
      setSelectedNoteId(newId);
    } catch (err) {
      console.error('Failed to create template sketch:', err);
    }
  };

  // Keyboard shortcut 'D' for Quick Doodle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedNoteId) return; // In studio
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable ||
        activeEl.getAttribute('role') === 'textbox'
      );
      if (isTyping) return;

      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleQuickDoodle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteId, handleQuickDoodle]);

  // Close menus on outside click
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest('.sketch-card-menu-container')) {
        setActiveCardMenuId(null);
      }
      if (!e.target.closest('.sketch-header-more-container')) {
        setMoreMenuOpen(false);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // --- Inline Rename Handling ---
  const handleStartRename = (e, sketch) => {
    e.stopPropagation();
    setActiveCardMenuId(null);
    setRenamingId(sketch.id);
    setRenameValue(sketch.title || 'Untitled Sketch');
    setTimeout(() => {
      if (renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    }, 50);
  };

  const handleFinishRename = async (id) => {
    if (!renamingId) return;
    const cleanTitle = renameValue.trim();
    setRenamingId(null);
    if (cleanTitle) {
      await renameSketch(id, cleanTitle);
    }
  };

  // --- Card Action Handlers ---
  const handleFavoriteToggle = async (e, id) => {
    e.stopPropagation();
    await toggleSketchFavorite(id);
  };

  const handlePinToggle = async (e, id) => {
    e.stopPropagation();
    await toggleSketchPin(id);
  };

  const handleDuplicate = async (e, id) => {
    e.stopPropagation();
    setActiveCardMenuId(null);
    try {
      showToast('Duplicating sketch...');
      const newId = await duplicateSketchNote(id);
      if (newId) {
        showToast('Sketch duplicated');
      }
    } catch (err) {
      console.error('Failed to duplicate:', err);
    }
  };

  const handleShare = async (e, sketch) => {
    e.stopPropagation();
    setActiveCardMenuId(null);
    const note = await db.notes.get(sketch.id);
    const att = await db.attachments.where('note_id').equals(sketch.id).first();
    const doc = note?.content?.sketchDoc || att?.sketch_doc || migrateLegacySketchDoc(note, att);

    setShareTarget({
      doc,
      title: sketch.title || 'Untitled Sketch',
      description: sketch.description || ''
    });
  };

  const handleQuickExportPNG = async (e, sketch) => {
    e.stopPropagation();
    setActiveCardMenuId(null);
    showToast('Preparing PNG export...');
    try {
      const note = await db.notes.get(sketch.id);
      const att = await db.attachments.where('note_id').equals(sketch.id).first();
      const doc = note?.content?.sketchDoc || att?.sketch_doc || migrateLegacySketchDoc(note, att);

      const canvas = document.createElement('canvas');
      canvas.width = doc.width || 1200;
      canvas.height = doc.height || 900;
      const ctx = canvas.getContext('2d');

      // Draw background
      ctx.fillStyle = doc.background?.color || (doc.background?.id === 'white' ? '#FFFFFF' : '#1A1D23');
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // If thumbnail image exists, render it
      const imgData = att?.image_data || note?.content?.thumbnail;
      if (imgData) {
        const img = new Image();
        img.src = imgData;
        await new Promise((res) => { img.onload = res; img.onerror = res; });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      const link = document.createElement('a');
      link.download = `${(sketch.title || 'sketch').replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('PNG downloaded');
    } catch (err) {
      console.error('Failed to export PNG:', err);
      showToast('Export failed');
    }
  };

  const handleDelete = (e, sketch) => {
    e.stopPropagation();
    setActiveCardMenuId(null);
    openSoftDelete({
      title: sketch.title || 'Untitled Sketch',
      onConfirm: async () => {
        await softDeleteItem({
          id: sketch.id,
          type: 'note',
          title: sketch.title || 'Untitled Sketch',
          workspace: 'sketch',
        });
        if (selectedNoteId === sketch.id) {
          setSelectedNoteId(null);
        }
      },
    });
  };

  const handleArchive = async (e, sketch) => {
    e.stopPropagation();
    setActiveCardMenuId(null);
    await archiveItem({
      id: sketch.id,
      type: 'note',
      title: sketch.title || 'Untitled Sketch',
      workspace: 'sketch',
    });
    if (selectedNoteId === sketch.id) {
      setSelectedNoteId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 min-w-0">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/85 dark:bg-white/90 text-white dark:text-black px-4 py-2 rounded-xl text-xs font-medium shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMessage}
        </div>
      )}

      {/* Hidden Photo File Input */}
      <input 
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
        aria-hidden="true"
      />

      {/* --- Page Header (Lives in scroll area, generous padding under TopBar) --- */}
      <div className="flex flex-wrap items-start justify-between gap-4 pt-2 flex-shrink-0 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FB923C] inline-block shadow-xs"></span>
            <span className="text-[11px] font-bold tracking-wider uppercase text-orange-600 dark:text-orange-400">
              Creative Studio
            </span>
          </div>

          <div className="inline-block">
            <h1 className="text-[28px] sm:text-[34px] font-bold text-text-primary tracking-tight leading-none">
              Sketch Studio
            </h1>
            {/* Hand-drawn style SVG underline */}
            <svg 
              className="w-40 sm:w-48 h-2.5 text-orange-500 fill-none stroke-current mt-1" 
              viewBox="0 0 160 10" 
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path 
                d="M2 6.5 C 45 2, 115 1.5, 158 7" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
            </svg>
          </div>

          <p className="text-xs text-text-muted mt-1.5 max-w-prose">
            A creative canvas for playful doodles, visual notes, and detailed artwork.
          </p>
        </div>

        {/* Right header actions: Search & More menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* In-page search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sketches..."
              className="pl-8 pr-7 py-1.5 text-xs bg-card-default border border-black/10 dark:border-white/10 rounded-xl text-text-primary placeholder:text-text-muted outline-none focus:ring-1 focus:ring-orange-500 w-36 sm:w-48 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text-primary"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* More menu container */}
          <div className="relative sketch-header-more-container">
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className="p-2 rounded-xl bg-card-default border border-black/10 dark:border-white/10 text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors shadow-xs"
              title="Studio options"
              aria-label="Studio options"
              aria-expanded={moreMenuOpen}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-card-default border border-black/10 dark:border-white/10 rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={async () => {
                    setMoreMenuOpen(false);
                    showToast('Rebuilding gallery cache...');
                    const count = await rebuildSketchCache();
                    showToast(`Cache rebuilt (${count} sketches)`);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <RotateCw className="w-3.5 h-3.5 text-orange-500" />
                  <span>Rebuild gallery cache</span>
                </button>

                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setShowCleanupModal(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Clean up empty sketches</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- START STRIP (4 Big Tiles, responsive 2x2 on narrow viewports) --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Tile 1: Quick Doodle */}
        <button
          onClick={handleQuickDoodle}
          className="group p-4 bg-card-default border border-orange-500/20 hover:border-orange-500/50 rounded-2xl text-left flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer select-none bg-gradient-to-br from-card-default to-orange-500/5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-text-muted font-semibold">
              D
            </kbd>
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              Quick Doodle
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Instant playful canvas
            </p>
          </div>
        </button>

        {/* Tile 2: New Sketch */}
        <button
          onClick={handleNewSketch}
          className="group p-4 bg-card-default border border-black/10 dark:border-white/10 hover:border-orange-500/50 rounded-2xl text-left flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Palette className="w-5 h-5" />
            </div>
            <Plus className="w-4 h-4 text-text-muted group-hover:text-orange-500 transition-colors" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              New Sketch
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Detailed artwork &amp; layers
            </p>
          </div>
        </button>

        {/* Tile 3: From Photo */}
        <button
          onClick={() => photoInputRef.current?.click()}
          className="group p-4 bg-card-default border border-black/10 dark:border-white/10 hover:border-orange-500/50 rounded-2xl text-left flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold text-text-muted uppercase">Upload</span>
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              From Photo
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Annotate &amp; sketch over image
            </p>
          </div>
        </button>

        {/* Tile 4: Templates */}
        <button
          onClick={() => setShowPresetsModal(true)}
          className="group p-4 bg-card-default border border-black/10 dark:border-white/10 hover:border-orange-500/50 rounded-2xl text-left flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer select-none"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold text-text-muted uppercase">Presets</span>
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              Templates
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Square, Story, A4 &amp; more
            </p>
          </div>
        </button>
      </div>

      {/* --- FILTER & SKETCHBOOK BAR --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-black/5 dark:border-white/5">
        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {[
            { id: 'all', label: 'All' },
            { id: 'doodle', label: 'Doodles', icon: Zap },
            { id: 'sketch', label: 'Sketches', icon: Palette },
            { id: 'photo', label: 'Photos', icon: ImageIcon },
            { id: 'favorites', label: 'Favorites', icon: Star }
          ].map((chip) => {
            const Icon = chip.icon;
            const isActive = activeFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#C2410C] text-white shadow-xs font-semibold'
                    : 'bg-card-default border border-black/5 dark:border-white/10 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sketchbook collection chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <span className="text-[10px] font-semibold uppercase text-text-muted tracking-wider shrink-0 mr-1">
            Book:
          </span>
          <button
            onClick={() => setActiveSketchbook('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors shrink-0 ${
              activeSketchbook === 'all'
                ? 'bg-black/10 dark:bg-white/15 text-text-primary font-semibold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            All Books
          </button>

          {availableSketchbooks.map((book) => {
            const isActive = activeSketchbook === book;
            const meta = sketchbooksMeta[book] || { color: '#64748B' };
            return (
              <button
                key={book}
                onClick={() => setActiveSketchbook(book)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors shrink-0 ${
                  isActive
                    ? 'bg-black/10 dark:bg-white/15 text-text-primary font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full inline-block shrink-0" 
                  style={{ backgroundColor: meta.color }}
                />
                <span>{book}</span>
              </button>
            );
          })}

          <button
            onClick={() => setShowNewSketchbookModal(true)}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
            title="Create new sketchbook"
            aria-label="Create new sketchbook"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* --- SKETCHES CONTAINER (Grid, Wall, or List) --- */}
      <div className="min-w-0">
        {isLoading ? (
          <GridSkeleton count={6} />
        ) : filteredSketches.length === 0 ? (
          // Empty State
          <div className="py-16 px-6 flex flex-col items-center justify-center text-center bg-card-default/40 border border-dashed border-black/10 dark:border-white/10 rounded-3xl">
            {searchQuery || activeFilter !== 'all' || activeSketchbook !== 'all' ? (
              // Search empty state
              <div className="max-w-sm space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 text-text-muted flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">No sketches found</h3>
                <p className="text-xs text-text-muted">
                  No artwork matched your current search and filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
                    setActiveSketchbook('all');
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              // Studio first-time empty state
              <div className="max-w-md space-y-4">
                {/* Original SVG Illustration of sketchbook & pencil */}
                <div className="w-20 h-20 mx-auto text-orange-500 opacity-90">
                  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <rect x="12" y="16" width="52" height="54" rx="6" stroke="currentColor" strokeWidth="2.5" fill="rgba(251,146,60,0.06)" />
                    <line x1="24" y1="16" x2="24" y2="70" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" />
                    <circle cx="20" cy="28" r="2" fill="currentColor" />
                    <circle cx="20" cy="42" r="2" fill="currentColor" />
                    <circle cx="20" cy="56" r="2" fill="currentColor" />
                    <path d="M34 34 Q 44 26, 54 34 T 50 48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <polygon points="56,20 62,26 42,46 36,46 36,40" fill="currentColor" opacity="0.85" />
                  </svg>
                </div>

                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Your first page is waiting
                  </h3>
                  <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                    Start doodling freely with natural ink, annotate photos, or plan with templates.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={handleQuickDoodle}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-button text-xs font-semibold shadow-sm transition-all active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Quick Doodle</span>
                  </button>
                  <button
                    onClick={handleNewSketch}
                    className="flex items-center gap-1.5 px-4 py-2 bg-card-default border border-black/10 dark:border-white/10 hover:bg-black/5 text-text-primary rounded-button text-xs font-medium transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Sketch</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : viewMode === 'wall' ? (
          // --- WALL VIEW (Unique Pin-board with CSS columns & tape corners) ---
          <div className="sketch-wall-masonry">
            {filteredSketches.map((sketch) => (
              <div key={sketch.id} className="sketch-wall-card">
                <SketchCard
                  sketch={sketch}
                  isSelected={selectedNoteId === sketch.id}
                  viewMode="wall"
                  onSelect={() => setSelectedNoteId(sketch.id)}
                  onFavoriteToggle={(e) => handleFavoriteToggle(e, sketch.id)}
                  onPinToggle={(e) => handlePinToggle(e, sketch.id)}
                  onStartRename={(e) => handleStartRename(e, sketch)}
                  onDuplicate={(e) => handleDuplicate(e, sketch.id)}
                  onShare={(e) => handleShare(e, sketch)}
                  onQuickExportPNG={(e) => handleQuickExportPNG(e, sketch)}
                  onMoveToSketchbook={(e) => { e.stopPropagation(); setMoveTargetSketch(sketch); }}
                  onDelete={(e) => handleDelete(e, sketch)}
                  onArchive={(e) => handleArchive(e, sketch)}
                  isRenaming={renamingId === sketch.id}
                  renameValue={renameValue}
                  onChangeRename={setRenameValue}
                  onFinishRename={() => handleFinishRename(sketch.id)}
                  renameInputRef={renameInputRef}
                  activeMenuId={activeCardMenuId}
                  setActiveMenuId={setActiveCardMenuId}
                />
              </div>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          // --- LIST VIEW (Compact table-of-contents rows) ---
          <div className="flex flex-col gap-2">
            {filteredSketches.map((sketch) => (
              <SketchCard
                key={sketch.id}
                sketch={sketch}
                isSelected={selectedNoteId === sketch.id}
                viewMode="list"
                onSelect={() => setSelectedNoteId(sketch.id)}
                onFavoriteToggle={(e) => handleFavoriteToggle(e, sketch.id)}
                onPinToggle={(e) => handlePinToggle(e, sketch.id)}
                onStartRename={(e) => handleStartRename(e, sketch)}
                onDuplicate={(e) => handleDuplicate(e, sketch.id)}
                onShare={(e) => handleShare(e, sketch)}
                onQuickExportPNG={(e) => handleQuickExportPNG(e, sketch)}
                onMoveToSketchbook={(e) => { e.stopPropagation(); setMoveTargetSketch(sketch); }}
                onDelete={(e) => handleDelete(e, sketch)}
                onArchive={(e) => handleArchive(e, sketch)}
                isRenaming={renamingId === sketch.id}
                renameValue={renameValue}
                onChangeRename={setRenameValue}
                onFinishRename={() => handleFinishRename(sketch.id)}
                renameInputRef={renameInputRef}
                activeMenuId={activeCardMenuId}
                setActiveMenuId={setActiveCardMenuId}
              />
            ))}
          </div>
        ) : (
          // --- GRID VIEW (Uniform responsive cards) ---
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {filteredSketches.map((sketch) => (
              <SketchCard
                key={sketch.id}
                sketch={sketch}
                isSelected={selectedNoteId === sketch.id}
                viewMode="grid"
                onSelect={() => setSelectedNoteId(sketch.id)}
                onFavoriteToggle={(e) => handleFavoriteToggle(e, sketch.id)}
                onPinToggle={(e) => handlePinToggle(e, sketch.id)}
                onStartRename={(e) => handleStartRename(e, sketch)}
                onDuplicate={(e) => handleDuplicate(e, sketch.id)}
                onShare={(e) => handleShare(e, sketch)}
                onQuickExportPNG={(e) => handleQuickExportPNG(e, sketch)}
                onMoveToSketchbook={(e) => { e.stopPropagation(); setMoveTargetSketch(sketch); }}
                onDelete={(e) => handleDelete(e, sketch)}
                onArchive={(e) => handleArchive(e, sketch)}
                isRenaming={renamingId === sketch.id}
                renameValue={renameValue}
                onChangeRename={setRenameValue}
                onFinishRename={() => handleFinishRename(sketch.id)}
                renameInputRef={renameInputRef}
                activeMenuId={activeCardMenuId}
                setActiveMenuId={setActiveCardMenuId}
              />
            ))}
          </div>
        )}
      </div>

      {/* --- Canvas Presets Modal --- */}
      <CanvasPresetsModal
        isOpen={showPresetsModal}
        onClose={() => setShowPresetsModal(false)}
        onSelectPreset={handleSelectPreset}
      />

      {/* --- Share Modal for Card Quick Action --- */}
      <ShareModal
        isOpen={Boolean(shareTarget)}
        onClose={() => setShareTarget(null)}
        canvasDoc={shareTarget?.doc}
        title={shareTarget?.title}
        description={shareTarget?.description}
      />

      {/* --- Empty Sketches Cleanup Modal --- */}
      <CleanEmptySketchesModal
        isOpen={showCleanupModal}
        onClose={() => setShowCleanupModal(false)}
        onCleanComplete={(cleaned) => {
          showToast(`Moved ${cleaned} empty ${cleaned === 1 ? 'sketch' : 'sketches'} to Trash`);
        }}
      />

      {/* --- Move to Sketchbook Modal --- */}
      {moveTargetSketch && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
          onClick={() => setMoveTargetSketch(null)}
        >
          <div 
            className="w-full max-w-xs bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-orange-500" />
              <span>Move to Sketchbook</span>
            </h3>

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {availableSketchbooks.map((book) => {
                const isCurrent = (moveTargetSketch.sketchbook || 'General') === book;
                const meta = sketchbooksMeta[book] || { color: '#64748B' };
                return (
                  <button
                    key={book}
                    onClick={async () => {
                      await moveSketchToSketchbook(moveTargetSketch.id, book);
                      setMoveTargetSketch(null);
                      showToast(`Moved to ${book}`);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold'
                        : 'text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span>{book}</span>
                    </div>
                    {isCurrent && <span className="text-[10px] opacity-60">Current</span>}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-black/5 dark:border-white/5 flex justify-end">
              <button
                onClick={() => setMoveTargetSketch(null)}
                className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- New Sketchbook Creation Modal --- */}
      {showNewSketchbookModal && (
        <NewSketchbookModal
          onClose={() => setShowNewSketchbookModal(false)}
          onCreated={(name) => {
            refreshSketchbooks();
            setActiveSketchbook(name);
            showToast(`Created sketchbook "${name}"`);
          }}
        />
      )}
    </div>
  );
}

// =========================================================================
// SKETCH CARD SUB-COMPONENT (Supports Grid, Wall, and List Views)
// =========================================================================
function SketchCard({
  sketch,
  isSelected,
  viewMode,
  onSelect,
  onFavoriteToggle,
  onPinToggle,
  onStartRename,
  onDuplicate,
  onShare,
  onQuickExportPNG,
  onMoveToSketchbook,
  onDelete,
  onArchive,
  isRenaming,
  renameValue,
  onChangeRename,
  onFinishRename,
  renameInputRef,
  activeMenuId,
  setActiveMenuId
}) {
  const isMenuOpen = activeMenuId === sketch.id;
  const relativeTime = formatRelativeTime(sketch.real_edited_at || sketch.updated_at || sketch.created_at);
  const fullDateTime = formatFullDateTime(sketch.real_edited_at || sketch.updated_at || sketch.created_at);

  // Clamped ratio for Wall view so story-size drawings don't stretch into gigantic cards
  const naturalRatio = sketch.aspect_ratio || 1.333;
  const clampedWallRatio = Math.max(0.65, Math.min(naturalRatio, 1.65));

  // Badge styling
  const badgeInfo = useMemo(() => {
    if (sketch.entry_type === 'photo') {
      return { label: 'Photo', bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400', icon: ImageIcon };
    }
    if (sketch.entry_type === 'doodle') {
      return { label: 'Doodle', bg: 'bg-orange-500/15 text-orange-700 dark:text-orange-400', icon: Zap };
    }
    return { label: 'Sketch', bg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400', icon: Palette };
  }, [sketch.entry_type]);

  const BadgeIcon = badgeInfo.icon;

  // --- LIST VIEW ROW ---
  if (viewMode === 'list') {
    return (
      <div
        onClick={onSelect}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSelect();
          if (e.key === 'F2') onStartRename(e);
        }}
        className={`group relative flex items-center justify-between p-2.5 bg-card-default border ${
          isSelected
            ? 'border-orange-500 shadow-sm ring-1 ring-orange-500/20'
            : 'border-black/5 dark:border-white/10 hover:border-black/20 dark:hover:border-white/25'
        } rounded-xl cursor-pointer hover:shadow-sm transition-all duration-150 select-none`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Small thumbnail */}
          <div className="w-12 h-10 rounded-lg overflow-hidden shrink-0 border border-black/5 dark:border-white/10">
            <SketchThumbnail
              thumbnail={sketch.thumbnail}
              title={sketch.title}
              entryType={sketch.entry_type}
              description={sketch.description}
              bgColor={sketch.bg_color}
              className="w-full h-full"
            />
          </div>

          {/* Title and metadata */}
          <div className="min-w-0 flex-1">
            {isRenaming ? (
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={(e) => onChangeRename(e.target.value)}
                onBlur={onFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onFinishRename();
                  if (e.key === 'Escape') onFinishRename();
                }}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-semibold px-1 py-0.5 bg-bg-primary border border-orange-500 rounded outline-none w-full"
              />
            ) : (
              <h3 
                onDoubleClick={(e) => onStartRename(e)}
                className="text-xs font-semibold text-text-primary truncate flex items-center gap-1.5"
                title={sketch.title || 'Untitled Sketch'}
              >
                {sketch.is_pinned && <Pin className="w-3 h-3 text-orange-500 fill-current shrink-0" />}
                <span>{sketch.title || 'Untitled Sketch'}</span>
              </h3>
            )}

            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted">
              <span title={fullDateTime}>Edited {relativeTime}</span>
              <span>•</span>
              <span className="truncate">{sketch.sketchbook || 'General'}</span>
            </div>
          </div>
        </div>

        {/* Right badges & actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${badgeInfo.bg}`}>
            <BadgeIcon className="w-2.5 h-2.5" />
            <span>{badgeInfo.label}</span>
          </span>

          <button
            onClick={(e) => onFavoriteToggle(e)}
            className={`p-1.5 rounded-lg transition-colors ${
              sketch.is_favorite
                ? 'text-amber-500'
                : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-amber-500'
            }`}
            title={sketch.is_favorite ? 'Favorited' : 'Add to favorites'}
            aria-label="Favorite sketch"
          >
            <Star className={`w-3.5 h-3.5 ${sketch.is_favorite ? 'fill-current' : ''}`} />
          </button>

          {/* Actions dropdown button */}
          <div className="relative sketch-card-menu-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(isMenuOpen ? null : sketch.id);
              }}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="More actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <CardDropdownMenu
                sketch={sketch}
                onStartRename={onStartRename}
                onDuplicate={onDuplicate}
                onShare={onShare}
                onQuickExportPNG={onQuickExportPNG}
                onMoveToSketchbook={onMoveToSketchbook}
                onPinToggle={onPinToggle}
                onArchive={onArchive}
                onDelete={onDelete}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- GRID & WALL CARDS ---
  return (
    <div
      onClick={onSelect}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect();
        if (e.key === 'F2') onStartRename(e);
      }}
      className={`group relative bg-card-default border ${
        isSelected
          ? 'border-orange-500 shadow-md ring-1 ring-orange-500/20'
          : 'border-black/5 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
      } rounded-2xl cursor-pointer hover:shadow-lg transition-all duration-200 ease-out flex flex-col overflow-hidden select-none outline-none focus-visible:ring-2 focus-visible:ring-orange-500`}
    >
      {/* Wall View: Authentic semi-translucent tape corner */}
      {viewMode === 'wall' && <div className="sketch-tape-strip" aria-hidden="true" />}

      {/* Thumbnail Frame */}
      <div 
        className="relative w-full border-b border-black/5 dark:border-white/5 overflow-hidden"
        style={{
          aspectRatio: viewMode === 'wall' ? clampedWallRatio : (4 / 3)
        }}
      >
        <SketchThumbnail
          thumbnail={sketch.thumbnail}
          title={sketch.title}
          entryType={sketch.entry_type}
          description={sketch.description}
          aspectRatio={sketch.aspect_ratio}
          bgColor={sketch.bg_color}
          className="w-full h-full"
        />

        {/* Favorite & Pin Badges (Top Left) */}
        <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
          {sketch.is_pinned && (
            <div 
              className="w-6 h-6 rounded-lg bg-card-default/90 text-orange-500 shadow-xs flex items-center justify-center backdrop-blur-xs"
              title="Pinned"
            >
              <Pin className="w-3 h-3 fill-current" />
            </div>
          )}
          <button
            onClick={(e) => onFavoriteToggle(e)}
            className={`w-6 h-6 rounded-lg bg-card-default/90 shadow-xs flex items-center justify-center backdrop-blur-xs transition-colors ${
              sketch.is_favorite
                ? 'text-amber-500'
                : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-amber-500'
            }`}
            title={sketch.is_favorite ? 'Favorited' : 'Favorite'}
            aria-label="Toggle favorite"
          >
            <Star className={`w-3 h-3 ${sketch.is_favorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Card Quick Actions (Top Right) */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 sketch-card-menu-container">
          <button
            onClick={(e) => onShare(e)}
            className="w-7 h-7 rounded-lg bg-card-default/90 text-text-muted hover:text-orange-500 hover:bg-black/5 dark:hover:bg-white/10 shadow-xs flex items-center justify-center backdrop-blur-xs transition-colors"
            title="Share &amp; Export"
            aria-label="Share sketch"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuId(isMenuOpen ? null : sketch.id);
            }}
            className="w-7 h-7 rounded-lg bg-card-default/90 text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 shadow-xs flex items-center justify-center backdrop-blur-xs transition-colors"
            title="More options"
            aria-label="More options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {isMenuOpen && (
            <CardDropdownMenu
              sketch={sketch}
              onStartRename={onStartRename}
              onDuplicate={onDuplicate}
              onShare={onShare}
              onQuickExportPNG={onQuickExportPNG}
              onMoveToSketchbook={onMoveToSketchbook}
              onPinToggle={onPinToggle}
              onArchive={onArchive}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-3 flex flex-col justify-between flex-1 min-w-0 bg-card-default">
        <div>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => onChangeRename(e.target.value)}
              onBlur={onFinishRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onFinishRename();
                if (e.key === 'Escape') onFinishRename();
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-semibold px-1 py-0.5 bg-bg-primary border border-orange-500 rounded outline-none w-full"
            />
          ) : (
            <h3 
              onDoubleClick={(e) => onStartRename(e)}
              className="text-xs font-semibold text-text-primary truncate" 
              title={sketch.title || 'Untitled Sketch'}
            >
              {sketch.title || 'Untitled Sketch'}
            </h3>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 pt-2 mt-2 border-t border-black/5 dark:border-white/5 text-[10px] text-text-muted min-w-0">
          <span className="truncate whitespace-nowrap" title={fullDateTime}>
            Edited {relativeTime}
          </span>

          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-semibold uppercase tracking-wider shrink-0 ${badgeInfo.bg}`}>
            {badgeInfo.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// CARD DROPDOWN ACTION MENU
// =========================================================================
function CardDropdownMenu({
  sketch,
  onStartRename,
  onDuplicate,
  onShare,
  onQuickExportPNG,
  onMoveToSketchbook,
  onPinToggle,
  onArchive,
  onDelete
}) {
  return (
    <div 
      className="absolute right-0 top-full mt-1 w-44 bg-card-default border border-black/10 dark:border-white/10 rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => onStartRename(e)}
        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
      >
        <Edit2 className="w-3.5 h-3.5 text-text-muted" />
        <span>Rename</span>
      </button>

      <button
        onClick={(e) => onDuplicate(e)}
        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
      >
        <Copy className="w-3.5 h-3.5 text-text-muted" />
        <span>Duplicate</span>
      </button>

      <button
        onClick={(e) => onShare(e)}
        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
      >
        <Share2 className="w-3.5 h-3.5 text-text-muted" />
        <span>Share &amp; Export</span>
      </button>

      <button
        onClick={(e) => onQuickExportPNG(e)}
        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
      >
        <Download className="w-3.5 h-3.5 text-text-muted" />
        <span>Quick Export PNG</span>
      </button>

      <button
        onClick={(e) => onMoveToSketchbook(e)}
        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
      >
        <Folder className="w-3.5 h-3.5 text-text-muted" />
        <span>Move to sketchbook...</span>
      </button>

      <button
        onClick={(e) => onPinToggle(e)}
        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
      >
        <Pin className="w-3.5 h-3.5 text-text-muted" />
        <span>{sketch.is_pinned ? 'Unpin' : 'Pin to top'}</span>
      </button>

      <div className="h-px bg-black/5 dark:bg-white/5 my-1" />

      <button
        onClick={(e) => onArchive(e)}
        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5"
      >
        <Archive className="w-3.5 h-3.5 text-text-muted" />
        <span>Archive</span>
      </button>

      <button
        onClick={(e) => onDelete(e)}
        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Move to Trash</span>
      </button>
    </div>
  );
}

// =========================================================================
// NEW SKETCHBOOK CREATION MODAL
// =========================================================================
function NewSketchbookModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(SKETCHBOOK_PALETTE[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    saveSketchbookMeta(clean, { color: selectedColor, icon: 'Folder' });
    onCreated(clean);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xs bg-card-default border border-black/10 dark:border-white/10 rounded-2xl shadow-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-orange-500" />
            <span>New Sketchbook</span>
          </h3>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase">Book Name</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Character Concepts"
              className="w-full mt-1 px-3 py-1.5 text-xs bg-bg-primary border border-black/10 dark:border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase">Cover Color</label>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {SKETCHBOOK_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    selectedColor === color ? 'scale-125 ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-black' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-1.5 bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold rounded-button shadow-xs disabled:opacity-40"
            >
              Create Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}