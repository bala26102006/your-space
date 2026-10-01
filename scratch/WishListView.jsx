import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Gift, CheckCircle, DollarSign, Folder, ArrowLeft, Link as LinkIcon, Image as ImageIcon, Tag as TagIcon, Trash2, Edit2, ExternalLink } from 'lucide-react';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import { db } from '../../lib/db';

const DEFAULT_FOLDERS = [
  'Tech & Gadgets', 'Gift Cards', 'Clothing & Accessories',
  'Beauty & Personal Care', 'Home & Kitchen', 'Experiences & Entertainment',
  'Hobbies & Fitness', 'Jewelry', 'Books & Media', 'Travel & Luggage'
];

export default function WishListView() {
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Modals / forms state
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Item Form State
  const [itemName, setItemName] = useState('');
  const [itemUrl, setItemUrl] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemPriority, setItemPriority] = useState('Medium');
  const [itemNote, setItemNote] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemTags, setItemTags] = useState('');

  // Data fetching
  const folders = useLiveQuery(() => db.wishlist_folders.orderBy('sort_order').toArray(), []) || [];
  const allItems = useLiveQuery(() => {
    if (selectedFolderId) {
      return db.wishlist_items.where('folder_id').equals(selectedFolderId).toArray();
    }
    return db.wishlist_items.toArray();
  }, [selectedFolderId]) || [];

  const activeFolder = folders.find(f => f.id === selectedFolderId);

  // Initialize folders
  useEffect(() => {
    const init = async () => {
      const count = await db.wishlist_folders.count();
      if (count === 0) {
        const toAdd = DEFAULT_FOLDERS.map((name, index) => ({
          id: crypto.randomUUID(),
          name,
          sort_order: index
        }));
        await db.wishlist_folders.bulkAdd(toAdd);
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  // Compute derived state
  const activeItems = useMemo(() => allItems.filter(i => !i.is_completed).sort((a,b) => b.sort_order - a.sort_order), [allItems]);
  const completedItems = useMemo(() => allItems.filter(i => i.is_completed).sort((a,b) => b.sort_order - a.sort_order), [allItems]);
  const totalCost = useMemo(() => activeItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0), [activeItems]);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await db.wishlist_folders.add({
      id: crypto.randomUUID(),
      name: newFolderName.trim(),
      sort_order: Date.now()
    });
    setNewFolderName('');
    setShowFolderForm(false);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemName.trim() && !itemUrl.trim()) return; // Require at least a name or URL

    const tagsArray = itemTags.split(',').map(t => t.trim()).filter(t => t.length > 0);

    const itemData = {
      folder_id: selectedFolderId,
      name: itemName.trim() || 'Unknown Item',
      url: itemUrl.trim(),
      price: parseFloat(itemPrice) || 0,
      priority: itemPriority,
      note: itemNote.trim(),
      image_url: itemImageUrl.trim(),
      is_completed: editingItem ? editingItem.is_completed : false,
      tags: tagsArray,
      sort_order: editingItem ? editingItem.sort_order : Date.now(),
    };

    if (editingItem) {
      await db.wishlist_items.update(editingItem.id, itemData);
    } else {
      await db.wishlist_items.add({ ...itemData, id: crypto.randomUUID() });
    }

    resetItemForm();
  };

  const handleDeleteItem = async (e, id) => {
    e.stopPropagation();
    await db.wishlist_items.delete(id);
  };

  const handleToggleComplete = async (e, id, currentStatus) => {
    e.stopPropagation();
    await db.wishlist_items.update(id, { is_completed: !currentStatus });
  };

  const openItemForm = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemUrl(item.url || '');
      setItemPrice(item.price ? item.price.toString() : '');
      setItemPriority(item.priority || 'Medium');
      setItemNote(item.note || '');
      setItemImageUrl(item.image_url || '');
      setItemTags((item.tags || []).join(', '));
    } else {
      resetItemForm();
    }
    setShowItemForm(true);
  };

  const resetItemForm = () => {
    setEditingItem(null);
    setItemName('');
    setItemUrl('');
    setItemPrice('');
    setItemPriority('Medium');
    setItemNote('');
    setItemImageUrl('');
    setItemTags('');
    setShowItemForm(false);
  };

  // Simple auto-parse logic (mock, relying on user input URL as source and inferring name if empty)
  const handleUrlBlur = (e) => {
    const val = e.target.value;
    if (val && !itemName) {
      try {
        const url = new URL(val);
        let domain = url.hostname.replace('www.', '');
        setItemName(`Item from ${domain}`);
      } catch (e) {
        // invalid URL
      }
    }
  };

  if (isInitializing) return <div className="p-6 text-text-muted">Loading...</div>;

  const renderItemCard = (item) => (
    <div 
      key={item.id}
      onClick={() => openItemForm(item)}
      className={`relative group rounded-card border bg-card-default overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-card-hover dark:hover:shadow-card-hover-dark border-black/5 dark:border-white/10 flex flex-col ${item.is_completed ? 'opacity-70 grayscale' : ''}`}
    >
      {/* Cover Image */}
      {item.image_url ? (
        <div className="w-full h-40 bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5 shrink-0">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-40 bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5 flex flex-col items-center justify-center shrink-0 text-text-muted">
          <ImageIcon className="w-10 h-10 opacity-20 mb-2" />
          <span className="text-xs opacity-50 font-medium">No Image</span>
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-semibold text-sm text-text-primary line-clamp-2" title={item.name}>{item.name}</h3>
        </div>
        
        <div className="flex items-center justify-between mb-3 mt-auto">
          <div className="flex items-center gap-1 font-mono font-medium text-text-primary text-lg">
            <DollarSign className="w-4 h-4 text-text-muted" />
            {(parseFloat(item.price) || 0).toFixed(2)}
          </div>
          {item.priority && !item.is_completed && (
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              item.priority === 'High' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
              item.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
              'bg-blue-500/10 text-blue-600 dark:text-blue-400'
            }`}>
              {item.priority}
            </span>
          )}
        </div>

        {item.note && (
          <p className="text-xs text-text-muted line-clamp-2 mb-3 bg-black/5 dark:bg-white/5 p-2 rounded italic">
            "{item.note}"
          </p>
        )}

        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-black/5 dark:border-white/5">
           {item.url && (
             <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-blue-500 transition-colors" title="Visit Link">
               <ExternalLink className="w-4 h-4" />
             </a>
           )}
           <div className="flex-1"></div>
           <button 
             onClick={(e) => handleToggleComplete(e, item.id, item.is_completed)} 
             className={`p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${item.is_completed ? 'text-green-500' : 'text-text-muted'}`}
             title={item.is_completed ? 'Mark as active' : 'Mark as got it!'}
           >
             <CheckCircle className="w-4 h-4" />
           </button>
           <button 
             onClick={(e) => handleDeleteItem(e, item.id)} 
             className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors"
             title="Delete item"
           >
             <Trash2 className="w-4 h-4" />
           </button>
        </div>
      </div>
      
      {item.is_completed && (
        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-sm backdrop-blur-md">
          <CheckCircle className="w-4 h-4" />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            {selectedFolderId && (
              <button onClick={() => setSelectedFolderId(null)} className="p-1 rounded-button hover:bg-black/5 dark:hover:bg-white/10 text-text-muted mr-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-xl font-semibold capitalize text-text-primary flex items-center gap-2">
              <Gift className="w-5 h-5" /> 
              {selectedFolderId ? activeFolder?.name : 'Wish List'}
            </h1>
          </div>
          {selectedFolderId && (
            <p className="text-xs text-text-muted mt-1 flex items-center gap-2 ml-9">
              <span>{activeItems.length} items to get</span>
              <span className="w-1 h-1 rounded-full bg-black/20 dark:bg-white/20" />
              <span className="font-bold text-text-primary flex items-center">
                Total Cost: <DollarSign className="w-3 h-3 ml-0.5" />{totalCost.toFixed(2)}
              </span>
            </p>
          )}
        </div>
        
        {selectedFolderId ? (
          <button
            onClick={() => openItemForm()}
            className="flex items-center gap-1.5 px-3 py-2 bg-text-primary text-bg-primary rounded-button text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        ) : (
          <button
            onClick={() => setShowFolderForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-text-primary text-bg-primary rounded-button text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Folder className="w-4 h-4" />
            <span>New Folder</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-6">
        {!selectedFolderId ? (
          /* Folders View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {folders.map(folder => (
              <div 
                key={folder.id} 
                onClick={() => setSelectedFolderId(folder.id)}
                className="p-5 bg-card-default border border-black/5 dark:border-white/10 rounded-card flex items-center gap-4 cursor-pointer hover:shadow-card-hover dark:hover:shadow-card-hover-dark transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
                  <Folder className="w-6 h-6 opacity-70" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">{folder.name}</h3>
                  <p className="text-xs text-text-muted mt-0.5">Open Folder</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Items View */
          <div className="space-y-8">
            {activeItems.length === 0 && completedItems.length === 0 ? (
               <div className="h-64 flex flex-col items-center justify-center text-text-muted border border-dashed border-black/10 dark:border-white/10 rounded-card p-8 text-center bg-card-default">
                 <Gift className="w-10 h-10 mb-3 opacity-30" />
                 <p className="text-sm font-medium">This folder is empty</p>
                 <p className="text-xs opacity-70 mt-1 max-w-xs">Click "Add Item" to start tracking things you want to buy.</p>
               </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {activeItems.map(renderItemCard)}
                </div>
              </div>
            )}

            {/* Completed Items */}
            {completedItems.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 border-b border-black/5 dark:border-white/5 pb-2">
                  <CheckCircle className="w-4 h-4" /> Completed (Got It!)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {completedItems.map(renderItemCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {showFolderForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateFolder} className="bg-bg-primary w-full max-w-sm rounded-xl shadow-2xl border border-black/10 dark:border-white/10 p-6">
            <h2 className="text-lg font-bold text-text-primary mb-4">Create Folder</h2>
            <div className="mb-4">
              <label className="block text-xs font-medium text-text-muted mb-1">Folder Name</label>
              <input 
                autoFocus
                type="text" 
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500"
                placeholder="e.g. My Birthday"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowFolderForm(false)} className="px-4 py-2 text-sm font-medium text-text-muted hover:bg-black/5 dark:hover:bg-white/5 rounded-button">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium bg-text-primary text-bg-primary rounded-button shadow-sm">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* Item Form Modal */}
      {showItemForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-bg-primary w-full max-w-md rounded-xl shadow-2xl border border-black/10 dark:border-white/10 p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-black/5 dark:border-white/5 bg-bg-sidebar flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-text-primary">{editingItem ? 'Edit Item' : 'Add Item'}</h2>
              <button onClick={resetItemForm} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-text-muted"><Trash2 className="w-5 h-5 opacity-0" /> <span className="sr-only">Close</span></button>
            </div>
            
            <form onSubmit={handleSaveItem} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1 flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Product URL</label>
                <input 
                  type="url" 
                  value={itemUrl}
                  onChange={e => setItemUrl(e.target.value)}
                  onBlur={handleUrlBlur}
                  className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500 placeholder:opacity-50"
                  placeholder="https://amazon.com/..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Item Name *</label>
                <input 
                  type="text" 
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Sony WH-1000XM5"
                  required
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-text-muted mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Price</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={itemPrice}
                    onChange={e => setItemPrice(e.target.value)}
                    className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-text-muted mb-1">Priority</label>
                  <select 
                    value={itemPriority}
                    onChange={e => setItemPriority(e.target.value)}
                    className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500 h-[38px]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Someday">Someday</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Image URL</label>
                <input 
                  type="url" 
                  value={itemImageUrl}
                  onChange={e => setItemImageUrl(e.target.value)}
                  className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500 placeholder:opacity-50"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Why I want this</label>
                <textarea 
                  value={itemNote}
                  onChange={e => setItemNote(e.target.value)}
                  className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500 resize-y min-h-[80px]"
                  placeholder="e.g. For the new apartment..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1 flex items-center gap-1"><TagIcon className="w-3 h-3" /> Tags (comma separated)</label>
                <input 
                  type="text" 
                  value={itemTags}
                  onChange={e => setItemTags(e.target.value)}
                  className="w-full bg-bg-sidebar border border-black/10 dark:border-white/10 rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500"
                  placeholder="e.g. gadget, electronics, birthday"
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-2 border-t border-black/5 dark:border-white/5 shrink-0 mt-4">
                <button type="button" onClick={resetItemForm} className="px-4 py-2 text-sm font-medium text-text-muted hover:bg-black/5 dark:hover:bg-white/5 rounded-button">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-text-primary text-bg-primary rounded-button shadow-sm">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
