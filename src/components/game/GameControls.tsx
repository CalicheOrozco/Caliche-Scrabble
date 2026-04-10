import { clsx } from 'clsx';
import { DRAW_SIZES, type DrawSize } from '../../constants/game';
import type { Language, WorkerStatus } from '../../types';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Badge';

interface GameControlsProps {
  drawSize: DrawSize;
  activeLangs: Language[];
  workerStatus: WorkerStatus;
  phase: string;
  onDrawSizeChange: (size: DrawSize) => void;
  onToggleLang: (lang: Language) => void;
  onDraw: () => void;
  onReset: () => void;
}

export function GameControls({
  drawSize, activeLangs, workerStatus, phase,
  onDrawSizeChange, onToggleLang, onDraw, onReset,
}: GameControlsProps) {
  const isLoading = workerStatus === 'loading';
  const isComputing = phase === 'computing';
  const isPlaying = phase === 'playing' || phase === 'reviewing';

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {/* Lang toggles */}
      <div className="flex gap-1.5">
        {(['en', 'es'] as Language[]).map((lang) => (
          <button
            key={lang}
            onPointerDown={(e) => { e.preventDefault(); onToggleLang(lang); }}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors duration-150 select-none',
              activeLangs.includes(lang)
                ? lang === 'en'
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                  : 'bg-orange-600/30 border-orange-500 text-orange-300'
                : 'bg-transparent border-slate-600 text-slate-500',
            )}
          >
            {lang === 'en' ? 'English' : 'Spanish'}
          </button>
        ))}
      </div>

      {/* Draw size */}
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
        {DRAW_SIZES.map((size) => (
          <button
            key={size}
            onPointerDown={(e) => { e.preventDefault(); onDrawSizeChange(size as DrawSize); }}
            className={clsx(
              'px-3 py-1 rounded-lg text-sm font-semibold transition-colors duration-150 select-none',
              drawSize === size
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {size}
          </button>
        ))}
      </div>

      {/* Draw / New button */}
      {!isPlaying ? (
        <Button
          variant="primary"
          size="md"
          disabled={isLoading || isComputing}
          onPointerDown={(e) => { e.preventDefault(); onDraw(); }}
        >
          {isLoading ? (
            <span className="flex items-center gap-2"><Spinner /> Loading...</span>
          ) : isComputing ? (
            <span className="flex items-center gap-2"><Spinner /> Computing...</span>
          ) : (
            'Draw tiles'
          )}
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="md"
          onPointerDown={(e) => { e.preventDefault(); onReset(); }}
        >
          New hand
        </Button>
      )}
    </div>
  );
}
