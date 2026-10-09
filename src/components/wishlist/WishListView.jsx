import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  LayoutGrid,
  List,
  CheckCircle2,
  Circle,
  DollarSign,
  Calendar,
  ExternalLink,
  Flag,
  Trash2,
  Archive,
  ShoppingBag,
  BookOpen,
  Film,
  MapPin,
  TrendingUp,
  Tag,
  ArrowUpDown,
  Search,
} from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { useUIStore } from '../../store/uiStore';
import { db } from '../../lib/db';
import { generateUUID } from '../../lib/uuid';
import { useConfirmStore } from '../../store/confirmStore';
import { softDeleteItem, archiveItem } from '../../lib/services/trashService';
import { GridSkeleton } from '../shared/SkeletonLoader';

const CATEGORIES = [
  { id: 'All', label: 'All', icon: Sparkles },
  { id: 'Buy', label: 'Buy', icon: ShoppingBag, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { id: 'Learn', label: 'Learn', icon: BookOpen, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { id: 'Watch', label: 'Watch', icon: Film, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  { id: 'Place', label: 'Place', icon: MapPin, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'Other', label: 'Other', icon: Tag, color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
];

const PRIORITIES = [
  { id: 'All', label: 'All Priorities' },
  { id: 'High', label: 'High Priority', dot: 'bg-red-500' },
  { id: 'Medium', label: 'Medium Priority', dot: 'bg-amber-500' },
  { id: 'Low', label: 'Low Priority', dot: 'bg-emerald-500' },
];

const STATUS_FILTERS = [
  { id: 'All', label: 'All Statuses' },
  { id: 'Wishing', label: 'Wishing' },
  { id: 'Planned', label: 'Planned' },
  { id: 'Got it', label: 'Got It' },
];

const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
  'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  'linear-gradient(135deg, #3B82F6 0%, #2DD4BF 100%)',
  'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
];

export default function WishListView() {
  const { selectedNoteId, setSelectedNoteId } = useUIStore();
  const { openSoftDelete } = useConfirmStore();

  // Local View States
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [quickAddInput, setQuickAddInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'priority' | 'price_high' | 'price_low'
  const [animatingId, setAnimatingId] = useState(null);

  // 1. Fetch Wishlist Notes
  const rawWishes = useLiveQuery(() =>
    db.notes
      .where('workspace_id')
      .equals('wishlist')
      .filter((n) => !n.is_archived && !n.is_deleted)
      .toArray()
  , []) || [];

  // Normalize Wish list item fields
  const wishes = useMemo(() => {
    return rawWishes.map((w) => {
      const c = w.content && typeof w.content === 'object' ? w.content : {};
      const status = w.status || c.status || (w.is_completed || c.gotIt ? 'Got it' : 'Wishing');
      const priority = w.priority || c.priority || 'Medium';
      const category = w.category || c.category || 'Buy';
      const price = parseFloat(w.price !== undefined ? w.price : c.price) || 0;
      const link = w.link || c.link || c.url || '';
      const image = w.image || c.image || '';
      const targetDate = w.target_date || c.targetDate || c.target_date || '';
      const notes = c.notes || c.note || (typeof w.content === 'string' ? w.content : '');

      return {
        ...w,
        title: w.title || 'Untitled Wish',
        category,
        priority,
        status,
        price,
        link,
        image,
        targetDate,
        notes,
        isGotIt: status === 'Got it' || w.is_completed,
      };
    });
  }, [rawWishes]);

  // 2. Summary Statistics
  const summary = useMemo(() => {
    const totalWishes = wishes.length;
    // Calculate total cost of active/pending wishes
    const totalEstimatedCost = wishes
      .filter((w) => !w.isGotIt)
      .reduce((sum, w) => sum + (w.price || 0), 0);

    // Calculate how many got this month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const gotThisMonth = wishes.filter((w) => {
      if (!w.isGotIt) return false;
      const dateStr = w.got_it_at || w.updated_at || w.created_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;

    return {
      totalWishes,
      totalEstimatedCost,
      gotThisMonth,
    };
  }, [wishes]);

  // 3. Filtering and Sorting
  const filteredWishes = useMemo(() => {
    return wishes.filter((w) => {
      if (selectedCategory !== 'All' && w.category !== selectedCategory) return false;
      if (selectedPriority !== 'All' && w.priority !== selectedPriority) return false;
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Got it' && !w.isGotIt) return false;
        if (selectedStatus !== 'Got it' && w.status !== selectedStatus) return false;
      }
      return true;
    });
  }, [wishes, selectedCategory, selectedPriority, selectedStatus]);

  const sortedWishes = useMemo(() => {
    const list = [...filteredWishes];
    const priorityWeight = { High: 3, Medium: 2, Low: 1 };

    list.sort((a, b) => {
      if (sortBy === 'priority') {
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      }
      if (sortBy === 'price_high') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortBy === 'price_low') {
        return (a.price || 0) - (b.price || 0);
      }
      // Default: newest
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return list;
  }, [filteredWishes, sortBy]);

  // Split into active and completed for clean sections
  const activeWishes = useMemo(() => sortedWishes.filter((w) => !w.isGotIt), [sortedWishes]);
  const completedWishes = useMemo(() => sortedWishes.filter((w) => w.isGotIt), [sortedWishes]);

  // 4. Quick Add Handler
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    const title = quickAddInput.trim();
    if (!title) return;

    const newId = generateUUID();
    const now = new Date().toISOString();

    const newWish = {
      id: newId,
      workspace_id: 'wishlist',
      note_type: 'wishlist',
      title,
      category: selectedCategory !== 'All' ? selectedCategory : 'Buy',
      priority: 'Medium',
      status: 'Wishing',
      price: 0,
      link: '',
      image: '',
      target_date: '',
      is_pinned: false,
      is_archived: false,
      is_deleted: false,
      is_completed: false,
      content: {
        category: selectedCategory !== 'All' ? selectedCategory : 'Buy',
        priority: 'Medium',
        status: 'Wishing',
        price: 0,
        link: '',
        image: '',
        targetDate: '',
        notes: '',
      },
      created_at: now,
      updated_at: now,
    };

    await db.notes.add(newWish);
    setQuickAddInput('');
    setSelectedNoteId(newId);
  };

  // 5. "New Wish" Button Action
  const handleCreateNewWish = async () => {
    const newId = generateUUID();
    const now = new Date().toISOString();

    const newWish = {
      id: newId,
      workspace_id: 'wishlist',
      note_type: 'wishlist',
      title: '',
      category: 'Buy',
      priority: 'Medium',
      status: 'Wishing',
      price: 0,
      link: '',
      image: '',
      target_date: '',
      is_pinned: false,
      is_archived: false,
      is_deleted: false,
      is_completed: false,
      content: {
        category: 'Buy',
        priority: 'Medium',
        status: 'Wishing',
        price: 0,
        link: '',
        image: '',
        targetDate: '',
        notes: '',
      },
      created_at: now,
      updated_at: now,
    };

    await db.notes.add(newWish);
    setSelectedNoteId(newId);
  };

  // 6. "Got it" Check Toggle with Animation
  const handleToggleGotIt = async (e, wish) => {
    e.stopPropagation();
    const nextStatus = wish.isGotIt ? 'Wishing' : 'Got it';
    const nextCompleted = nextStatus === 'Got it';

    setAnimatingId(wish.id);
    setTimeout(() => setAnimatingId(null), 400);

    const now = new Date().toISOString();
    const existingContent = wish.content && typeof wish.content === 'object' ? wish.content : {};

    await db.notes.update(wish.id, {
      status: nextStatus,
      is_completed: nextCompleted,
      got_it_at: nextCompleted ? now : null,
      content: {
        ...existingContent,
        status: nextStatus,
        gotIt: nextCompleted,
      },
      updated_at: now,
    });
  };

  // 7. Delete with Phase 2 Confirmation Dialog
  const handleDeleteWish = (e, wish) => {
    e.stopPropagation();
    openSoftDelete({
      title: wish.title || 'Untitled Wish',
      onConfirm: async () => {
        await softDeleteItem({
          id: wish.id,
          type: 'note',
          title: wish.title || 'Untitled Wish',
          workspace: 'wishlist',
        });
        if (selectedNoteId === wish.id) {
          setSelectedNoteId(null);
        }
      },
    });
  };

  // 8. Archive with Phase 2 Service
  const handleArchiveWish = async (e, wish) => {
    e.stopPropagation();
    await archiveItem({
      id: wish.id,
      type: 'note',
      title: wish.title || 'Untitled Wish',
      workspace: 'wishlist',
    });
    if (selectedNoteId === wish.id) {
      setSelectedNoteId(null);
    }
  };

  const formatPrice = (val) => {
    const num = parseFloat(val) || 0;
    return num > 0 ? `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Free / Not set';
  };

  const getPriorityDot = (p) => {
    if (p === 'High') return 'bg-red-500 ring-red-500/30';
    if (p === 'Medium') return 'bg-amber-500 ring-amber-500/30';
    return 'bg-emerald-500 ring-emerald-500/30';
  };

  const getCategoryMeta = (catId) => {
    return CATEGORIES.find((c) => c.id === catId) || CATEGORIES[1];
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative min-w-0">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 min-w-0 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-text-primary capitalize leading-tight">
              Wish List
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 uppercase tracking-wider">
              {wishes.length} {wishes.length === 1 ? 'wish' : 'wishes'}
            </span>
          </div>
          {/* Violet underline */}
          <div className="h-0.5 w-10 rounded-full bg-[#8B5CF6] mt-1.5" />
          <p className="text-xs text-text-muted mt-1">
            Dreams, goals, and items to acquire or experience
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center p-0.5 bg-black/5 dark:bg-white/5 rounded-button border border-black/5 dark:border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              aria-label="Grid view"
              className={`p-1.5 rounded-button transition-colors ${
                viewMode === 'grid'
                  ? 'bg-bg-primary text-text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              aria-label="List view"
              className={`p-1.5 rounded-button transition-colors ${
                viewMode === 'list'
                  ? 'bg-bg-primary text-text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* "New Wish" button */}
          <button
            onClick={handleCreateNewWish}
            aria-label="Create New Wish"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#8B5CF6] text-white rounded-button text-xs font-medium hover:bg-[#7C3AED] active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Wish</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Add Bar */}
      <form onSubmit={handleQuickAdd} className="mb-4 shrink-0">
        <div className="relative flex items-center">
          <Sparkles className="w-4 h-4 absolute left-3.5 text-violet-500 pointer-events-none" />
          <input
            type="text"
            value={quickAddInput}
            onChange={(e) => setQuickAddInput(e.target.value)}
            placeholder="Add a wish and press Enter..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-card-default border border-black/10 dark:border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-xs transition-all"
          />
        </div>
      </form>

      {/* 3. Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 shrink-0">
        {/* Total Wishes */}
        <div className="p-3 bg-card-default border border-black/5 dark:border-white/10 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">
              Total Wishes
            </div>
            <div className="text-sm sm:text-base font-bold text-text-primary mt-0.5">
              {summary.totalWishes}
            </div>
          </div>
        </div>

        {/* Total Estimated Cost */}
        <div className="p-3 bg-card-default border border-black/5 dark:border-white/10 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">
              Estimated Cost
            </div>
            <div className="text-sm sm:text-base font-bold text-text-primary mt-0.5">
              ${summary.totalEstimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Achieved This Month */}
        <div className="p-3 bg-card-default border border-black/5 dark:border-white/10 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">
              Achieved This Month
            </div>
            <div className="text-sm sm:text-base font-bold text-text-primary mt-0.5">
              {summary.gotThisMonth} {summary.gotThisMonth === 1 ? 'wish' : 'wishes'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filters & Sorting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 shrink-0 pb-3 border-b border-black/5 dark:border-white/10 text-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-black/5 dark:bg-white/5 text-text-muted hover:text-text-primary'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Filter Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1 bg-card-default border border-black/10 dark:border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1 bg-card-default border border-black/10 dark:border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          {/* Sort By */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1 bg-card-default border border-black/10 dark:border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="newest">Newest First</option>
              <option value="priority">Priority (High to Low)</option>
              <option value="price_high">Price (High to Low)</option>
              <option value="price_low">Price (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Content View: Wishes Grid or List */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-16">
        {wishes.length === 0 ? (
          /* Feature 10: Empty State */
          <div className="flex flex-col items-center justify-center h-72 text-center p-6 bg-card-default rounded-2xl border border-black/5 dark:border-white/10">
            <div className="w-16 h-16 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center mb-3.5 shadow-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-text-primary">
              Nothing here yet. What do you wish for?
            </h3>
            <p className="text-xs text-text-muted max-w-sm mt-1.5 leading-relaxed">
              Add your first wish using the quick add bar above or click "New Wish" to track items, places, skills, and goals.
            </p>
            <button
              onClick={handleCreateNewWish}
              className="mt-4 px-4 py-2 bg-[#8B5CF6] text-white rounded-button text-xs font-semibold hover:bg-[#7C3AED] transition-all shadow-xs"
            >
              Create a Wish
            </button>
          </div>
        ) : filteredWishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-text-muted">
            <Search className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No wishes match the selected filters.</p>
          </div>
        ) : (
          <>
            {/* Active Wishes Section */}
            {activeWishes.length > 0 && (
              <div className="space-y-3">
                {selectedStatus === 'All' && completedWishes.length > 0 && (
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <span>Active Wishes ({activeWishes.length})</span>
                  </div>
                )}

                {/* Render Grid or List */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
                    {activeWishes.map((wish) => renderWishCard(wish))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {activeWishes.map((wish) => renderWishRow(wish))}
                  </div>
                )}
              </div>
            )}

            {/* "Got It" Section (Feature 8) */}
            {completedWishes.length > 0 && (
              <div className="space-y-3 pt-2">
                {selectedStatus === 'All' && (
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 pt-4 border-t border-black/5 dark:border-white/10">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Achieved & Got It ({completedWishes.length})</span>
                  </div>
                )}

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch opacity-75 hover:opacity-100 transition-opacity">
                    {completedWishes.map((wish) => renderWishCard(wish, true))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 opacity-75 hover:opacity-100 transition-opacity">
                    {completedWishes.map((wish) => renderWishRow(wish, true))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Helper: Card Renderer for Grid View
  function renderWishCard(wish, isCompleted = false) {
    const isSelected = selectedNoteId === wish.id;
    const isAnimating = animatingId === wish.id;
    const catMeta = getCategoryMeta(wish.category);
    const CatIcon = catMeta.icon;

    return (
      <div
        key={wish.id}
        onClick={() => setSelectedNoteId(wish.id)}
        className={`group relative flex flex-col justify-between h-full bg-card-default border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-black/40 ${
          isSelected
            ? 'ring-2 ring-[#8B5CF6] shadow-card-hover border-violet-500/50'
            : 'border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/20'
        } ${isCompleted ? 'bg-black/[0.01] dark:bg-white/[0.01]' : ''}`}
      >
        {/* Top: Image or Violet Gradient Placeholder */}
        <div className="relative w-full aspect-video bg-black/5 dark:bg-white/5 overflow-hidden shrink-0">
          {wish.image ? (
            wish.image.startsWith('linear-gradient') ? (
              <div className="w-full h-full" style={{ background: wish.image }} />
            ) : (
              <img
                src={wish.image}
                alt={wish.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )
          ) : (
            /* Violet Gradient Placeholder */
            <div className="w-full h-full bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-indigo-500/20 flex flex-col items-center justify-center p-3 text-violet-500">
              <Sparkles className="w-7 h-7 mb-1 opacity-70 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] uppercase font-mono font-semibold tracking-wider opacity-60">
                {wish.category}
              </span>
            </div>
          )}

          {/* Category Chip Badge Overlay */}
          <span
            className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-md shadow-xs ${catMeta.color}`}
          >
            <CatIcon className="w-2.5 h-2.5" />
            <span>{catMeta.label}</span>
          </span>

          {/* Quick Hover Actions: Archive & Delete */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => handleArchiveWish(e, wish)}
              title="Archive wish"
              aria-label="Archive wish"
              className="p-1.5 rounded-lg bg-bg-primary/90 text-text-muted hover:text-text-primary backdrop-blur-md shadow-xs"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => handleDeleteWish(e, wish)}
              title="Delete wish"
              aria-label="Delete wish"
              className="p-1.5 rounded-lg bg-bg-primary/90 text-text-muted hover:text-red-500 backdrop-blur-md shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Middle Content: Title, Priority, Price */}
        <div className="p-3.5 flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3
                className={`text-sm font-semibold text-text-primary line-clamp-2 leading-snug ${
                  isCompleted ? 'line-through text-text-muted' : ''
                }`}
                title={wish.title}
              >
                {wish.title || 'Untitled Wish'}
              </h3>
            </div>

            {/* Price & Target Date */}
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="font-bold text-violet-600 dark:text-violet-400">
                {formatPrice(wish.price)}
              </span>

              {wish.targetDate && (
                <span className="flex items-center gap-1 text-[11px] text-text-muted">
                  <Calendar className="w-3 h-3 opacity-60" />
                  <span>{wish.targetDate}</span>
                </span>
              )}
            </div>
          </div>

          {/* Bottom Card Footer: Priority Dot & "Got it" Check Button */}
          <div className="mt-3.5 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <span className={`w-2 h-2 rounded-full ring-2 ${getPriorityDot(wish.priority)}`} />
              <span>{wish.priority}</span>
            </div>

            {/* "Got it" Button */}
            <button
              onClick={(e) => handleToggleGotIt(e, wish)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                isCompleted
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 text-text-muted hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
              } ${isAnimating ? 'scale-110' : ''}`}
              title={isCompleted ? 'Mark as wishing' : 'Mark as got it!'}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
              <span>{isCompleted ? 'Got it!' : 'Check'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Helper: Row Renderer for List View
  function renderWishRow(wish, isCompleted = false) {
    const isSelected = selectedNoteId === wish.id;
    const catMeta = getCategoryMeta(wish.category);
    const CatIcon = catMeta.icon;

    return (
      <div
        key={wish.id}
        onClick={() => setSelectedNoteId(wish.id)}
        className={`group flex items-center justify-between p-3 bg-card-default border rounded-xl cursor-pointer transition-all ${
          isSelected
            ? 'ring-2 ring-[#8B5CF6] border-violet-500/50 shadow-xs'
            : 'border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/20'
        } ${isCompleted ? 'bg-black/[0.01] dark:bg-white/[0.01]' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Got it toggle */}
          <button
            onClick={(e) => handleToggleGotIt(e, wish)}
            className={`shrink-0 transition-transform ${
              isCompleted ? 'text-emerald-500' : 'text-text-muted hover:text-emerald-500'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
          </button>

          {/* Thumbnail / Category Icon */}
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
            {wish.image ? (
              wish.image.startsWith('linear-gradient') ? (
                <div className="w-full h-full" style={{ background: wish.image }} />
              ) : (
                <img src={wish.image} alt="" className="w-full h-full object-cover" />
              )
            ) : (
              <CatIcon className="w-4 h-4 text-violet-500" />
            )}
          </div>

          {/* Title & Category */}
          <div className="min-w-0 flex-1">
            <h4
              className={`text-xs sm:text-sm font-semibold truncate ${
                isCompleted ? 'line-through text-text-muted' : 'text-text-primary'
              }`}
            >
              {wish.title || 'Untitled Wish'}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">
              <span>{catMeta.label}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(wish.priority)}`} />
                <span>{wish.priority}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Info: Price & Actions */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
            {formatPrice(wish.price)}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => handleArchiveWish(e, wish)}
              title="Archive wish"
              className="p-1 rounded text-text-muted hover:text-text-primary"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => handleDeleteWish(e, wish)}
              title="Delete wish"
              className="p-1 rounded text-text-muted hover:text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
}
