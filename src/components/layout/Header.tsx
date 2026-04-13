import { clsx } from 'clsx';

type Page = 'game' | 'checker' | 'scores' | 'recall' | 'numbers' | 'wordsearch';

interface HeaderProps {
  page: Page;
  onNavigate: (page: Page) => void;
}

const PAGE_LABELS: Record<Page, string> = {
  game: 'Game',
  checker: 'Word Checker',
  scores: 'Scores',
  recall: 'Recall',
  numbers: 'Numbers',
  wordsearch: 'Word Search',
};

export function Header({ page, onNavigate }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 gap-3">
      <div className="shrink-0">
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
          Caliche <span className="text-indigo-400">Scrabble</span>
        </h1>
        <p className="text-slate-500 text-xs">Anagram trainer</p>
      </div>

      <nav className="flex gap-1 bg-slate-800 rounded-xl p-1 overflow-x-auto">
        {(['game', 'checker', 'recall'] as Page[]).map((p) => (
          <button
            key={p}
            onPointerDown={(e) => { e.preventDefault(); onNavigate(p); }}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-150 select-none whitespace-nowrap',
              page === p ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {PAGE_LABELS[p]}
          </button>
        ))}
      </nav>
    </header>
  );
}
