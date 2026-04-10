import { clsx } from 'clsx';

type Page = 'game' | 'checker';

interface HeaderProps {
  page: Page;
  onNavigate: (page: Page) => void;
}

export function Header({ page, onNavigate }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
          Caliche <span className="text-indigo-400">Scrabble</span>
        </h1>
        <p className="text-slate-500 text-xs">Anagram trainer</p>
      </div>

      <nav className="flex gap-1 bg-slate-800 rounded-xl p-1">
        {(['game', 'checker'] as Page[]).map((p) => (
          <button
            key={p}
            onPointerDown={(e) => { e.preventDefault(); onNavigate(p); }}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-150 select-none',
              page === p ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {p === 'game' ? 'Game' : 'Word Checker'}
          </button>
        ))}
      </nav>
    </header>
  );
}
