import React from 'react';
import { Check } from 'lucide-react';

export const COLOR_OPTIONS = [
  { id: 'default', label: 'Default', bgLight: '#FFFFFF', bgDark: '#1E1E1E', border: '#E5E7EB' },
  { id: 'yellow', label: 'Yellow', bgLight: '#FFF9C4', bgDark: '#3A371D', border: '#FDE047' },
  { id: 'red', label: 'Red', bgLight: '#FFCDD2', bgDark: '#3A2323', border: '#FCA5A5' },
  { id: 'blue', label: 'Blue', bgLight: '#B3E5FC', bgDark: '#1D3038', border: '#7DD3FC' },
  { id: 'green', label: 'Green', bgLight: '#C8E6C9', bgDark: '#233A26', border: '#86EFAC' },
];

export function getCardColorStyle(colorId) {
  switch (colorId) {
    case 'yellow':
      return 'bg-card-yellow';
    case 'red':
      return 'bg-card-red';
    case 'blue':
      return 'bg-card-blue';
    case 'green':
      return 'bg-card-green';
    default:
      return 'bg-card-default';
  }
}

export default function ColorPicker({ currentColor = 'default', onChange }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {COLOR_OPTIONS.map((opt) => {
        const isSelected = (currentColor || 'default') === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            title={opt.label}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative border ${
              isSelected ? 'ring-2 ring-offset-1 ring-text-primary scale-105' : ''
            }`}
            style={{
              backgroundColor: opt.bgLight,
              borderColor: opt.border,
            }}
          >
            {isSelected && <Check className="w-3.5 h-3.5 text-gray-800" />}
          </button>
        );
      })}
    </div>
  );
}
