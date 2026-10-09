import React, { useState, useEffect } from 'react';
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

export default function WishlistEditor({ content, onChange, readOnly }) {
  const [data, setData] = useState({
    category: 'Buy',
    priority: 'Medium',
    status: 'Wishing',
    price: '',
    link: '',
    image: '',
    targetDate: '',
    notes: '',
  });

  useEffect(() => {
    if (content && typeof content === 'object') {
      setData({
        category: content.category || 'Buy',
        priority: content.priority || 'Medium',
        status: content.status || (content.gotIt ? 'Got it' : 'Wishing'),
        price: content.price !== undefined && content.price !== null ? content.price.toString() : '',
        link: content.link || content.url || '',
        image: content.image || '',
        targetDate: content.targetDate || content.target_date || '',
        notes: content.notes || content.note || '',
      });
    }
  }, [content]);

  const handleChange = (field, value) => {
    if (readOnly) return;
    const nextData = { ...data, [field]: value };
    setData(nextData);

    const numericPrice = parseFloat(nextData.price) || 0;
    const isCompleted = nextData.status === 'Got it';

    onChange({
      ...nextData,
      price: numericPrice,
      gotIt: isCompleted,
      is_completed: isCompleted,
    });
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-lg pb-10">
      {/* 1. Category Picker */}
      <div>
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">
          Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = data.category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleChange('category', cat.id)}
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
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">
          Status
        </label>
        <div className="grid grid-cols-3 gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-button border border-black/5 dark:border-white/10 text-xs">
          {STATUSES.map((st) => {
            const Icon = st.icon;
            const isSelected = data.status === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => handleChange('status', st.id)}
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
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" /> Cover Image
          </span>
          {data.image && (
            <button
              type="button"
              onClick={() => handleChange('image', '')}
              className="text-[11px] text-red-500 hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          )}
        </label>

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
                  onClick={() => handleChange('image', grad)}
                  style={{ background: grad }}
                  className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform shadow-xs"
                  title="Use preset gradient"
                />
              ))}
            </div>
          </div>
        )}

        <input
          type="url"
          value={data.image.startsWith('linear-gradient') ? '' : data.image}
          onChange={(e) => handleChange('image', e.target.value)}
          placeholder="Paste image URL..."
          className="w-full mt-2 px-3 py-1.5 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-text-primary focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* 4. Priority & Price Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Priority */}
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5" /> Priority
          </label>
          <div className="flex gap-1">
            {PRIORITIES.map((p) => {
              const isSelected = data.priority === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleChange('priority', p.id)}
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
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Estimated Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-medium text-xs">
              $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={data.price}
              onChange={(e) => handleChange('price', e.target.value)}
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
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Target Date
          </label>
          <input
            type="date"
            value={data.targetDate}
            onChange={(e) => handleChange('targetDate', e.target.value)}
            className="w-full px-3 py-2 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-text-primary focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Product Link */}
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Link
            </span>
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
          </label>
          <input
            type="url"
            value={data.link}
            onChange={(e) => handleChange('link', e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-text-primary focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* 6. Notes & Personal Reflections */}
      <div>
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Notes & Thoughts
        </label>
        <textarea
          rows={4}
          value={data.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Why do you want this? Specs, colors, location, ideas..."
          className="w-full px-3 py-2 text-xs bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-text-primary focus:outline-none focus:border-violet-500 resize-y leading-relaxed"
        />
      </div>
    </div>
  );
}
