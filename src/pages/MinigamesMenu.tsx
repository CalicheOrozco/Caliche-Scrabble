type TargetPage = 'wordsearch' | 'memory' | 'memoryinverse' | 'math' | 'fastcategory' | 'numbers' | 'stroop' | 'shuffle' | 'emojimemory' | 'wordflash';

interface PracticeMenuProps {
  onNavigate: (page: TargetPage) => void;
}

function GameIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <img src={src} alt={alt} className="w-14 h-14 rounded-xl object-cover shrink-0" />
  );
}

function ShuffleIcon() {
  return (
    <div className="w-14 h-14 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-2xl">
      🎲
    </div>
  );
}

function Card({ title, icon, onClick }: { title: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full cursor-pointer text-left bg-slate-800/40 active:bg-slate-800/60 border border-slate-700 rounded-2xl px-5 py-6 flex items-center gap-4 transition-colors"
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
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Mini Games</h2>
          <p className="text-slate-400 text-sm mt-1">Pick a game to play</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card title="Word Search"      icon={<GameIcon src="/word-search-icon.jpg"      alt="Word Search" />}      onClick={() => onNavigate('wordsearch')} />
        <Card title="Number Sequence"  icon={<GameIcon src="/number-sequence-icon.jpg"  alt="Number Sequence" />}  onClick={() => onNavigate('numbers')} />
        <Card title="Memory Sequence"  icon={<GameIcon src="/memory-sequence-icon.jpg"  alt="Memory Sequence" />}  onClick={() => onNavigate('memory')} />
        <Card title="Memory Inverse"   icon={<GameIcon src="/memory-inverse-icon.jpg"   alt="Memory Inverse" />}   onClick={() => onNavigate('memoryinverse')} />
        <Card title="Math Problems"    icon={<GameIcon src="/math-problems-icon.jpg"    alt="Math Problems" />}    onClick={() => onNavigate('math')} />
        <Card title="Fast Category"    icon={<GameIcon src="/fast-category-icon.jpg"    alt="Fast Category" />}    onClick={() => onNavigate('fastcategory')} />
        <Card title="Stroop Effect"    icon={<GameIcon src="/stroop-effect-icon.jpg"    alt="Stroop Effect" />}    onClick={() => onNavigate('stroop')} />
        <Card title="Emoji Memory"     icon={<GameIcon src="/emoji-memory-icon.jpg"    alt="Emoji Memory" />}        onClick={() => onNavigate('emojimemory')} />
        <Card title="Word Flash"       icon={<GameIcon src="/word-flash-icon.jpg"  alt="Word Flash" />}        onClick={() => onNavigate('wordflash')} />
        <Card title="Shuffle"          icon={<ShuffleIcon/>}                                                       onClick={() => onNavigate('shuffle')} />
      </div>
    </main>
  );
}
