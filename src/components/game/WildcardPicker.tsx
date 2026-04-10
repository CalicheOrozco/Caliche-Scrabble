import { useEffect } from 'react';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ'.split('');

interface WildcardPickerProps {
  tileId: string;
  onSelect: (tileId: string, letter: string) => void;
  onClose: () => void;
}

export function WildcardPicker({ tileId, onSelect, onClose }: WildcardPickerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      const letter = e.key.toUpperCase();
      if (LETTERS.includes(letter)) {
        onSelect(tileId, letter);
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tileId, onSelect, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-100 font-bold text-lg">Pick a letter for the blank tile</h2>
          <button
            className="text-slate-400 hover:text-slate-100 text-2xl leading-none"
            onPointerDown={(e) => { e.preventDefault(); onClose(); }}
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {LETTERS.map((letter) => (
            <button
              key={letter}
              onPointerDown={(e) => {
                e.preventDefault();
                onSelect(tileId, letter);
                onClose();
              }}
              className="aspect-square flex items-center justify-center rounded-lg text-base font-bold text-slate-100 bg-slate-700 hover:bg-violet-600 active:bg-violet-700 transition-colors duration-100 select-none"
            >
              {letter}
            </button>
          ))}
        </div>
        <p className="text-slate-500 text-xs mt-4 text-center">Or just type the letter on your keyboard</p>
      </div>
    </div>
  );
}
