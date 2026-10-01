import React, { useState, useEffect } from 'react';
import { Link2, Image as ImageIcon, DollarSign, Flag, CheckCircle } from 'lucide-react';

export default function WishlistEditor({ content, onChange, readOnly }) {
  const [data, setData] = useState({
    url: '',
    price: 0,
    priority: 'Low', // Low, Medium, High
    gotIt: false,
    image: '',
  });

  useEffect(() => {
    if (content && typeof content === 'object' && !content.type) {
      setData({
        url: content.url || '',
        price: content.price || 0,
        priority: content.priority || 'Low',
        gotIt: content.gotIt || false,
        image: content.image || '',
      });
    }
  }, [content]);

  const handleChange = (field, value) => {
    if (readOnly) return;
    const newData = { ...data, [field]: value };
    setData(newData);
    onChange(newData); // We pass the object directly, EditorPane saves JSON
  };

  const handleUrlPaste = (e) => {
    if (readOnly) return;
    const pastedUrl = e.clipboardData.getData('text');
    if (pastedUrl.startsWith('http')) {
      // Simulate fetching placeholder image
      if (!data.image) {
        // Just a random placeholder image from unsplash for demo purposes
        handleChange('image', 'https://source.unsplash.com/random/400x300/?product');
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg">
      
      {/* Image Preview */}
      {data.image ? (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 relative group">
          <img src={data.image} alt="Product" className="w-full h-full object-cover" />
          {!readOnly && (
            <button 
              onClick={() => handleChange('image', '')}
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Remove
            </button>
          )}
        </div>
      ) : (
        <div className="w-full aspect-video rounded-lg bg-black/5 dark:bg-white/5 border border-dashed border-black/20 dark:border-white/20 flex flex-col items-center justify-center text-text-muted">
          <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-xs">No image provided</p>
          {!readOnly && (
            <button 
              onClick={() => {
                const url = window.prompt("Enter image URL:");
                if (url) handleChange('image', url);
              }}
              className="text-xs text-blue-500 hover:underline mt-2"
            >
              Add Image URL
            </button>
          )}
        </div>
      )}

      {/* URL Paste */}
      <div>
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" /> Product Link
        </label>
        <input 
          type="url"
          value={data.url}
          onChange={(e) => handleChange('url', e.target.value)}
          onPaste={handleUrlPaste}
          disabled={readOnly}
          placeholder="Paste URL here..."
          className="w-full px-3 py-2 text-sm bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-text-primary focus:outline-none focus:border-black/30 dark:focus:border-white/30"
        />
      </div>

      <div className="flex gap-4">
        {/* Price */}
        <div className="flex-1">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
            <input 
              type="number"
              min="0"
              step="0.01"
              value={data.price}
              onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
              disabled={readOnly}
              className="w-full pl-7 pr-3 py-2 text-sm bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-text-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Priority */}
        <div className="flex-1">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5" /> Priority
          </label>
          <select
            value={data.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 text-sm bg-bg-sidebar border border-black/10 dark:border-white/10 rounded-button text-text-primary focus:outline-none"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      {/* Got It */}
      <div className="pt-4 mt-2 border-t border-black/5 dark:border-white/10">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={data.gotIt}
            onChange={(e) => handleChange('gotIt', e.target.checked)}
            disabled={readOnly}
            className="w-5 h-5 rounded border-black/20 dark:border-white/20 text-text-primary focus:ring-0 cursor-pointer"
          />
          <div>
            <div className="font-semibold text-text-primary flex items-center gap-2">
              <CheckCircle className={`w-4 h-4 ${data.gotIt ? 'text-green-500' : 'text-text-muted'}`} />
              Got It!
            </div>
            <div className="text-xs text-text-muted mt-0.5">Check this off to move it to Completed.</div>
          </div>
        </label>
      </div>

    </div>
  );
}
