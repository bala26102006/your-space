import React, { useState, useEffect, useRef } from 'react';
import {
  Link2,
  Image as ImageIcon,
  DollarSign,
  Flag,
  CheckCircle,
  Calendar,
  ExternalLink,
  Sparkles,
  ShoppingBag,
  BookOpen,
  Film,
  MapPin,
  MoreHorizontal,
  X,
  FileText,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'Buy', label: 'Buy', icon: ShoppingBag, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { id: 'Learn', label: 'Learn', icon: BookOpen, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { id: 'Watch', label: 'Watch', icon: Film, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  { id: 'Place', label: 'Place', icon: MapPin, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'Other', label: 'Other', icon: Sparkles, color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
];

const PRIORITIES = [
  { id: 'Low', label: 'Low', dot: 'bg-emerald-500' },
  { id: 'Medium', label: 'Medium', dot: 'bg-amber-500' },
  { id: 'High', label: 'High', dot: 'bg-red-500' },
];

const STATUSES = [
  { id: 'Wishing', label: 'Wishing', icon: Sparkles },
  { id: 'Planned', label: 'Planned', icon: Calendar },
  { id: 'Got it', label: 'Got it', icon: CheckCircle },
];

const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
  'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  'linear-gradient(135deg, #3B82F6 0%, #2DD4BF 100%)',
  'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
];

export default function WishlistEditor({ itemId, content, onChange, readOnly }) {
  const [data, setData] = useState(() => {
    const c = content && typeof content === 'object' ? content : {};
    return {
      category: c.category || 'Buy',
      priority: c.priority || 'Medium',
      status: c.status || (c.gotIt ? 'Got it' : 'Wishing'),
      price: c.price !== undefined && c.price !== null && c.price !== '' ? c.price.toString() : '',
      link: c.link || c.url || '',
      image: c.image || '',
      targetDate: c.targetDate || c.target_date || '',
      notes: c.notes || c.note || '',
    };
  });

  // Track the current itemId to ONLY sync when switching between different items
  const lastItemIdRef = useRef(itemId);
  const debounceTimerRef = useRef(null);
  const latestDataRef = useRef(data);
  latestDataRef.current = data;

  useEffect(() => {
    // Only re-initialize if itemId changed (switching between different items)
    if (itemId && itemId !== lastItemIdRef.current) {
      lastItemIdRef.current = itemId;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      const c = content && typeof content === 'object' ? content : {};
      setData({
        category: c.category || 'Buy',
        priority: c.priority || 'Medium',
        status: c.status || (c.gotIt ? 'Got it' : 'Wishing'),
        price: c.price !== undefined && c.price !== null && c.price !== '' ? c.price.toString() : '',
        link: c.link || c.url || '',
        image: c.image || '',
        targetDate: c.targetDate || c.target_date || '',
        notes: c.notes || c.note || '',
      });
    }
  }, [itemId, content]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const emitChange = (nextData) => {
    const rawPrice = nextData.price?.trim ? nextData.price.trim() : String(nextData.price || '');
    const cleanPrice = parseFloat(rawPrice);
    const numericPrice = isNaN(cleanPrice) ? 0 : cleanPrice;
    const isCompleted = nextData.status === 'Got it';

    onChange({
      ...nextData,
      price: numericPrice,
      gotIt: isCompleted,
      is_completed: isCompleted,
    });
  };

  const handleChange = (field, value, immediate = false) => {
    if (readOnly) return;
    const nextData = { ...data, [field]: value };
    setData(nextData);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (immediate) {
      emitChange(nextData);
    } else {
      debounceTimerRef.current = setTimeout(() => {
        emitChange(latestDataRef.current);
      }, 600);
    }
  };

  const handleBlur = (field) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (field === 'price') {
      const raw = data.price?.trim ? data.price.trim() : '';
      if (raw === '') {
        const nextData = { ...data, price: '' };
        setData(nextData);
        emitChange(nextData);
        return;
      }
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        const formatted = String(num);
        const nextData = { ...data, price: formatted };
        setData(nextData);
        emitChange(nextData);
        return;
      }
    }
    emitChange(latestDataRef.current);
  };

  const handlePriceChange = (e) => {
    const val = e.target.value;
    // Allow empty string, numbers, and at most one decimal point
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      handleChange('price', val, false);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-lg pb-10">
      {/* 1. Category Picker */}
      <div>
        <span id="wishlist-category-label" className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">
          Category
        </span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="wishlist-category-label">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = data.category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleChange('category', cat.id, true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-violet-500 text-white border-violet-600 shadow-xs'
                    : 'bg-card-default text-text-muted border-black/10 dark:border-white/10 hover:text-text-primary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Status Selector */}
      <div>
        <span id="wishlist-status-label" className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">
          Status
        </span>
        <div className="grid grid-cols-3 gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-button border border-black/5 dark:border-white/10 text-xs" role="group" aria-labelledby="wishlist-status-label">
          {STATUSES.map((st) => {
            const Icon = st.icon;
            const isSelected = data.status === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => handleChange('status', st.id, true)}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-button font-medium transition-all ${
                  isSelected
                    ? st.id === 'Got it'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-violet-600 text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Image Preview or Gradient */}
      <div>
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
          <label htmlFor="wishlist-image" className="flex items-center gap-1.5 cursor-pointer">
            <ImageIcon className="w-3.5 h-3.5" /> Cover Image
          </label>
          {data.image && (
            <button
              type="button"
              onClick={() => handleChange('image', '', true)}
              className="text-[11px] text-red-500 hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          )}
        </div>

        {data.image ? (
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 relative group">
            {data.image.startsWith('linear-gradient') ? (
              <div className="w-full h-full" style={{ background: data.image }} />
            ) : (
              <img
                src={data.image}
                alt="Wish preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
          </div>
        ) : (
          <div className="w-full aspect-video rounded-xl bg-violet-500/5 dark:bg-violet-950/20 border border-dashed border-violet-500/30 flex flex-col items-center justify-center p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs text-text-muted">No image provided</p>
            <div className="flex items-center gap-2 mt-3">
              {PRESET_GRADIENTS.map((grad, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleChange('image', grad, true)}
                  style={{ background: grad }}
                  className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform shadow-xs"
                  title="Use preset gradient"
                  aria-label={`Use preset gradient ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        <input
          id="wishlist-image"
          type="url"
          value={data.image.startsWith('linear-gradient') ? '' : data.image}
          onChange={(e) => handleChange('image', e.target.value, false)}
          onBlur={() => handleBlur('image')}
          placeholder="Paste image URL..."
          className="w-full mt-2 px-3 py-1.5 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-text-primary focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* 4. Priority & Price Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Priority */}
        <div>
          <span id="wishlist-priority-label" className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5" /> Priority
          </span>
          <div className="flex gap-1" role="group" aria-labelledby="wishlist-priority-label">
            {PRIORITIES.map((p) => {
              const isSelected = data.priority === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleChange('priority', p.id, true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-button text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-card-default text-text-primary border-violet-500 ring-1 ring-violet-500/50 shadow-xs'
                      : 'bg-card-default text-text-muted border-black/10 dark:border-white/10 hover:text-text-primary'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Estimated Price */}
        <div>
          <label htmlFor="wishlist-price" className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5 cursor-pointer">
            <DollarSign className="w-3.5 h-3.5" /> Estimated Price
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none select-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-medium text-xs"
            >
              ₹
            </span>
            <input
              id="wishlist-price"
              type="text"
              inputMode="decimal"
              value={data.price}
              onChange={handlePriceChange}
              onBlur={() => handleBlur('price')}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-text-primary focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
      </div>

      {/* 5. Target Date & Product Link */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Target Date */}
        <div>
          <label htmlFor="wishlist-target-date" className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5 cursor-pointer">
            <Calendar className="w-3.5 h-3.5" /> Target Date
          </label>
          <input
            id="wishlist-target-date"
            type="date"
            value={data.targetDate}
            onChange={(e) => handleChange('targetDate', e.target.value, false)}
            onBlur={() => handleBlur('targetDate')}
            className="w-full px-3 py-2 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-text-primary focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Product Link */}
        <div>
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
            <label htmlFor="wishlist-link" className="flex items-center gap-1.5 cursor-pointer">
              <Link2 className="w-3.5 h-3.5" /> Link
            </label>
            {data.link && (
              <a
                href={data.link.startsWith('http') ? data.link : `https://${data.link}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-violet-500 hover:underline flex items-center gap-1"
              >
                <span>Visit</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <input
            id="wishlist-link"
            type="url"
            value={data.link}
            onChange={(e) => handleChange('link', e.target.value, false)}
            onBlur={() => handleBlur('link')}
            placeholder="https://..."
            className="w-full px-3 py-2 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-text-primary focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* 6. Notes & Personal Reflections */}
      <div>
        <label htmlFor="wishlist-notes" className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5 cursor-pointer">
          <FileText className="w-3.5 h-3.5" /> Notes & Thoughts
        </label>
        <textarea
          id="wishlist-notes"
          rows={4}
          value={data.notes}
          onChange={(e) => handleChange('notes', e.target.value, false)}
          onBlur={() => handleBlur('notes')}
          placeholder="Why do you want this? Specs, colors, location, ideas..."
          className="w-full px-3 py-2 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-text-primary focus:outline-none focus:border-violet-500 resize-y leading-relaxed"
        />
      </div>
    </div>
  );
}
