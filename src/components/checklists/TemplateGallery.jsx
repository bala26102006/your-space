import React, { useState } from 'react';
import { 
  Sparkles, 
  Plane, 
  ShoppingBag, 
  Home, 
  Briefcase, 
  Target, 
  PartyPopper, 
  HeartPulse,
  Plus,
  Check,
  FolderInput,
  X
} from 'lucide-react';
import { ENHANCED_TEMPLATES, createChecklistFromTemplate } from '../../lib/checklists/checklistUtils';

const ICON_MAP = {
  Plane,
  ShoppingBag,
  Home,
  Briefcase,
  Target,
  PartyPopper,
  HeartPulse
};

export default function TemplateGallery({
  allFolders = [],
  onTemplateCreated
}) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedTemplateForRun, setSelectedTemplateForRun] = useState(null);
  const [targetFolder, setTargetFolder] = useState('Uncategorized');
  const [isCreating, setIsCreating] = useState(false);

  const categories = ['All', 'Travel', 'Shopping', 'Home', 'Work', 'Goals', 'Events', 'Health'];

  const filteredTemplates = activeCategory === 'All' 
    ? ENHANCED_TEMPLATES 
    : ENHANCED_TEMPLATES.filter(t => t.category === activeCategory);

  const handleConfirmUseTemplate = async () => {
    if (!selectedTemplateForRun || isCreating) return;
    setIsCreating(true);
    try {
      const newId = await createChecklistFromTemplate(selectedTemplateForRun, targetFolder);
      onTemplateCreated?.(newId, targetFolder);
      setSelectedTemplateForRun(null);
      setTargetFolder('Uncategorized');
    } catch (err) {
      console.error('Failed to create checklist from template:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="pt-8 border-t border-black/8 dark:border-white/10 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Start From a Template
            </h2>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Battle-tested starter checklists. Tapping one launches a fresh copy with one click.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                activeCategory === cat
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 text-text-muted hover:text-text-primary hover:bg-black/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTemplates.map(template => {
          const IconComponent = ICON_MAP[template.icon] || Sparkles;
          return (
            <div
              key={template.id}
              className="group rounded-3xl p-5 border border-black/8 dark:border-white/10 bg-white/70 dark:bg-bg-primary hover:bg-white dark:hover:bg-bg-primary hover:shadow-lg hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <span className="text-[11px] font-semibold text-text-muted px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5">
                    {template.items.length} items
                  </span>
                </div>

                {/* Title (never truncated) */}
                <h3 className="text-sm font-bold text-text-primary tracking-tight leading-snug">
                  {template.title}
                </h3>

                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  {template.description}
                </p>

                {/* Preview of first 4 items */}
                <div className="mt-3.5 pt-3 border-t border-black/5 dark:border-white/5 space-y-1.5">
                  {template.items.slice(0, 4).map((itemText, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-text-muted">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shrink-0" />
                      <span className="truncate">{itemText}</span>
                    </div>
                  ))}
                  {template.items.length > 4 && (
                    <span className="text-[10px] text-text-muted/70 block pl-3.5">
                      +{template.items.length - 4} more items
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button: opens folder selection modal */}
              <button
                type="button"
                onClick={() => setSelectedTemplateForRun(template)}
                className="mt-5 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Use Template</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Target Folder Picker Modal */}
      {selectedTemplateForRun && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedTemplateForRun(null)}
        >
          <div
            className="w-full max-w-sm bg-bg-primary rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-text-primary">
                  Select Folder for Checklist
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTemplateForRun(null)}
                className="p-1 rounded-full text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-text-muted mb-2 font-medium">
                Creating fresh copy of <strong className="text-text-primary font-bold">{selectedTemplateForRun.title}</strong>:
              </p>

              <select
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="Uncategorized">(No Folder / Uncategorized)</option>
                {allFolders.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setSelectedTemplateForRun(null)}
                className="px-3 py-2 text-xs font-semibold text-text-muted hover:bg-black/5 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCreating}
                onClick={handleConfirmUseTemplate}
                className="px-5 py-2 text-xs font-bold bg-emerald-500 text-white rounded-xl shadow-xs hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Checklist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
