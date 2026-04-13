import type { ReactNode } from 'react';

type TargetPage = 'wordsearch' | 'memory' | 'memoryinverse' | 'math' | 'fastcategory' | 'numbers' | 'stroop';

interface PracticeMenuProps {
  onNavigate: (page: TargetPage) => void;
}

function IconTile({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
      {children}
    </div>
  );
}

function WordSearchIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 4h10v10H4z" />
        <path d="M7 7h.01M11 7h.01M7 11h.01M11 11h.01" />
        <path d="M14.5 14.5l5 5" />
        <path d="M18 18.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
      </svg>
    </IconTile>
  );
}

function MemorySequenceIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 7h6" />
        <path d="M6 12h9" />
        <path d="M6 17h12" />
        <path d="M16 7l2-2 2 2" />
        <path d="M18 5v12" />
      </svg>
    </IconTile>
  );
}

function MemoryInverseIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 7h12" />
        <path d="M6 12h9" />
        <path d="M6 17h6" />
        <path d="M8 7l-2-2-2 2" />
        <path d="M6 5v12" />
      </svg>
    </IconTile>
  );
}

function MathProblemsIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 4a8 8 0 1 0 8 8" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
        <path d="M20 4v4h-4" />
      </svg>
    </IconTile>
  );
}

function NumberSequenceIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 7h14" />
        <path d="M5 12h14" />
        <path d="M5 17h14" />
        <path d="M7 7v0" />
        <path d="M9 7v0" />
        <path d="M7 12v0" />
        <path d="M9 12v0" />
        <path d="M7 17v0" />
        <path d="M9 17v0" />
      </svg>
    </IconTile>
  );
}

function FastCategoryIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 14a3 3 0 0 0 3-3V8a3 3 0 0 0-6 0v3a3 3 0 0 0 3 3z" />
        <path d="M19 11a7 7 0 0 1-14 0" />
        <path d="M12 18v2" />
        <path d="M8 20h8" />
        <path d="M4 10h2" />
        <path d="M18 10h2" />
      </svg>
    </IconTile>
  );
}

function StroopEffectIcon() {
  return (
    <IconTile>
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
        <path d="M9 9l6 6M15 9l-6 6" />
      </svg>
    </IconTile>
  );
}

function Card({ title, icon, onClick }: { title: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-800/40 active:bg-slate-800/60 border border-slate-700 rounded-2xl px-5 py-6 flex items-center gap-4 transition-colors"
    >
      {icon}
      <div className="min-w-0">
        <p className="text-slate-100 font-semibold text-lg truncate">{title}</p>
        <p className="text-slate-500 text-sm">Tap to open</p>
      </div>
    </button>
  );
}

export function PracticeMenu({ onNavigate }: PracticeMenuProps) {
  return (
    <main className="flex-1 flex flex-col gap-6 px-4 py-8 max-w-3xl mx-auto w-full">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Minigames</h2>
          <p className="text-slate-400 text-sm mt-1">Pick a game to play</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Word Search" icon={<WordSearchIcon />} onClick={() => onNavigate('wordsearch')} />
        <Card title="Number Sequence" icon={<NumberSequenceIcon />} onClick={() => onNavigate('numbers')} />
        <Card title="Memory Sequence" icon={<MemorySequenceIcon />} onClick={() => onNavigate('memory')} />
        <Card title="Memory Inverse" icon={<MemoryInverseIcon />} onClick={() => onNavigate('memoryinverse')} />
        <Card title="Math Problems" icon={<MathProblemsIcon />} onClick={() => onNavigate('math')} />
        <Card title="Fast Category" icon={<FastCategoryIcon />} onClick={() => onNavigate('fastcategory')} />
        <Card title="Stroop Effect" icon={<StroopEffectIcon />} onClick={() => onNavigate('stroop')} />
      </div>
    </main>
  );
}
