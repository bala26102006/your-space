const SKETCHBOOKS_STORAGE_KEY = 'yourspace_sketchbooks_meta';

export const DEFAULT_SKETCHBOOKS = {
  'Doodles': { color: '#F97316', icon: 'Zap' },
  'General': { color: '#64748B', icon: 'Folder' }
};

export const SKETCHBOOK_PALETTE = [
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#64748B'  // Slate
];

export function getSketchbooksMeta() {
  if (typeof window === 'undefined') return DEFAULT_SKETCHBOOKS;
  try {
    const raw = localStorage.getItem(SKETCHBOOKS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SKETCHBOOKS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SKETCHBOOKS, ...parsed };
  } catch (e) {
    return { ...DEFAULT_SKETCHBOOKS };
  }
}

export function saveSketchbookMeta(name, meta) {
  if (typeof window === 'undefined' || !name) return;
  try {
    const current = getSketchbooksMeta();
    current[name] = {
      color: meta.color || '#FB923C',
      icon: meta.icon || 'Folder'
    };
    localStorage.setItem(SKETCHBOOKS_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save sketchbook meta:', e);
  }
}

export function deleteSketchbookMeta(name) {
  if (typeof window === 'undefined' || !name) return;
  try {
    const current = getSketchbooksMeta();
    delete current[name];
    localStorage.setItem(SKETCHBOOKS_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to delete sketchbook meta:', e);
  }
}

export function renameSketchbookMeta(oldName, newName) {
  if (typeof window === 'undefined' || !oldName || !newName || oldName === newName) return;
  try {
    const current = getSketchbooksMeta();
    const meta = current[oldName] || { color: '#FB923C', icon: 'Folder' };
    delete current[oldName];
    current[newName] = meta;
    localStorage.setItem(SKETCHBOOKS_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to rename sketchbook meta:', e);
  }
}
