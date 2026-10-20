import React, { useState, useEffect } from 'react';
import { Palette, Sparkles, Image as ImageIcon } from 'lucide-react';

export default function SketchThumbnail({
  thumbnail,
  title = 'Sketch',
  entryType = 'sketch',
  description = '',
  aspectRatio = 1.333,
  bgColor = '#1A1D23',
  className = '',
  imageClassName = ''
}) {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (!thumbnail) {
      setObjectUrl(null);
      return;
    }

    if (thumbnail instanceof Blob) {
      const url = URL.createObjectURL(thumbnail);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (typeof thumbnail === 'string') {
      setObjectUrl(thumbnail);
    }
  }, [thumbnail]);

  const altText = `${title || 'Untitled Sketch'} (${entryType || 'sketch'}) — ${
    description ? description.slice(0, 60) : 'Canvas artwork'
  }`;

  const isDarkBg = bgColor === '#1A1D23' || bgColor === 'dark' || (bgColor && bgColor.startsWith('#1') && bgColor.length === 7);

  return (
    <div
      className={`relative w-full flex items-center justify-center overflow-hidden select-none transition-all ${className}`}
      style={{
        backgroundColor: bgColor === 'transparent' ? '#FDF9EE' : (bgColor || '#1A1D23'),
        contentVisibility: 'auto'
      }}
    >
      {objectUrl ? (
        <img
          src={objectUrl}
          alt={altText}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-contain pointer-events-none ${
            isDarkBg ? 'dark:border-white/5' : 'border-black/5'
          } ${imageClassName}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-4 text-text-muted opacity-40">
          {entryType === 'photo' ? (
            <ImageIcon className="w-8 h-8 mb-1.5 text-orange-500" />
          ) : entryType === 'doodle' ? (
            <Sparkles className="w-8 h-8 mb-1.5 text-orange-500" />
          ) : (
            <Palette className="w-8 h-8 mb-1.5 text-orange-500" />
          )}
          <span className="text-[11px] font-medium tracking-wide">
            {entryType === 'photo' ? 'Photo Canvas' : entryType === 'doodle' ? 'Doodle' : 'Blank Sketch'}
          </span>
        </div>
      )}
    </div>
  );
}
