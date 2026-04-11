import type { FoundWord } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

function googleUrl(word: string, lang: FoundWord['lang']) {
  const query = lang === 'en' ? `${word} is a word?` : `${word} es una palabra?`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

interface ReviewModalProps {
  allWords: FoundWord[];
  foundWordSet: Set<string>;
  onClose: () => void;
  onNewDraw: () => void;
}

export function ReviewModal({ allWords, foundWordSet, onClose, onNewDraw }: ReviewModalProps) {
  const lengths = [...new Set(allWords.map((w) => w.length))].sort((a, b) => a - b);

  const byLength = (len: number) =>
    allWords.filter((w) => w.length === len).sort((a, b) => a.word.localeCompare(b.word));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="text-slate-100 font-bold text-xl">All words</h2>
            <p className="text-slate-400 text-sm">
              You found <span className="text-emerald-400 font-bold">{foundWordSet.size}</span> of{' '}
              <span className="font-bold text-slate-300">{allWords.length}</span>
            </p>
          </div>
          <button
            className="text-slate-400 hover:text-slate-100 text-3xl leading-none"
            onPointerDown={(e) => { e.preventDefault(); onClose(); }}
          >
            ×
          </button>
        </div>

        {/* Word list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {lengths.map((len) => {
            const words = byLength(len);
            const foundInGroup = words.filter((w) => foundWordSet.has(w.word)).length;
            return (
              <div key={len}>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  {len} letters — {foundInGroup}/{words.length}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {words.map((w) => {
                    const found = foundWordSet.has(w.word);
                    return (
                      <a
                        key={w.word}
                        href={googleUrl(w.word, w.lang)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 border transition-colors ${
                          found
                            ? 'bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-slate-800 border-slate-700 hover:bg-slate-700/80'
                        }`}
                      >
                        <span className={`font-bold text-sm uppercase ${found ? 'text-emerald-300' : 'text-slate-500'}`}>
                          {w.word}
                        </span>
                        <Badge lang={w.lang} />
                        {found && <span className="text-emerald-400 text-xs">✓</span>}
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex gap-3 justify-end shrink-0">
          <Button variant="ghost" onPointerDown={(e) => { e.preventDefault(); onClose(); }}>
            Keep playing
          </Button>
          <Button variant="primary" onPointerDown={(e) => { e.preventDefault(); onNewDraw(); onClose(); }}>
            New hand
          </Button>
        </div>
      </div>
    </div>
  );
}
