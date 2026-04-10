import { clsx } from 'clsx';

interface TileProps {
  id: string;
  letter: string;
  isWildcard: boolean;
  wildcardLetter?: string;
  selected: boolean;
  used: boolean;
  enterDelay?: number;
  onClick: (id: string) => void;
}

export function Tile({ id, letter, isWildcard, wildcardLetter, selected, used, enterDelay = 0, onClick }: TileProps) {
  const displayLetter = isWildcard ? (wildcardLetter ?? '?') : letter;
  const isDisabled = used;

  return (
    <div
      role="button"
      aria-label={`Letter ${displayLetter}`}
      aria-pressed={selected}
      aria-disabled={isDisabled}
      onPointerDown={(e) => {
        if (isDisabled) return;
        e.preventDefault();
        onClick(id);
      }}
      className={clsx(
        'tile-enter relative select-none touch-none',
        'flex flex-col items-center justify-center',
        'w-12 h-12 sm:w-14 sm:h-14 rounded-xl',
        'font-bold text-xl sm:text-2xl uppercase',
        'transition-all duration-150 cursor-pointer',
        'shadow-md',
        // Wildcard
        isWildcard && !selected && 'bg-violet-600 dark:bg-violet-700 text-white ring-2 ring-violet-400/50',
        isWildcard && selected && 'bg-violet-500 text-white ring-2 ring-violet-300 -translate-y-1.5 shadow-violet-500/50 shadow-lg',
        // Regular idle
        !isWildcard && !selected && !used && 'bg-amber-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100',
        // Regular selected
        !isWildcard && selected && 'bg-amber-100 dark:bg-slate-600 text-slate-900 dark:text-white ring-2 ring-emerald-400 -translate-y-1.5 shadow-emerald-500/40 shadow-lg',
        // Used (in found word)
        used && 'opacity-30 cursor-not-allowed',
      )}
      style={{ animationDelay: `${enterDelay}ms` }}
    >
      <span className="leading-none">{displayLetter}</span>
      {isWildcard && wildcardLetter && (
        <span className="text-[9px] opacity-60 leading-none mt-0.5">(?)</span>
      )}
    </div>
  );
}
