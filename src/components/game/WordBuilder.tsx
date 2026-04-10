import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import type { DrawnTile } from '../../types';
import { Button } from '../ui/Button';

type WordStatus = 'empty' | 'incomplete' | 'found' | 'valid' | 'invalid';

interface WordBuilderProps {
  selectedTiles: DrawnTile[];
  wildcardAssignments: Record<string, string>;
  wordStatus: WordStatus;
  onClear: (countAsFailed?: boolean) => void;
  onSubmit: () => void;
  onWildcardClick: (tileId: string) => void;
}

export function WordBuilder({ selectedTiles, wildcardAssignments, wordStatus, onClear, onSubmit, onWildcardClick }: WordBuilderProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  // Trigger animation class on status change
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    if (wordStatus === 'valid') {
      el.classList.add('word-flash');
      const t = setTimeout(() => {
        el.classList.remove('word-flash');
        onSubmit();
      }, 500);
      return () => clearTimeout(t);
    }
    if (wordStatus === 'invalid' && selectedTiles.length >= 2) {
      el.classList.add('word-shake');
      const t = setTimeout(() => el.classList.remove('word-shake'), 400);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordStatus]);

  const isEmpty = selectedTiles.length === 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={boxRef}
        className={clsx(
          'min-w-64 min-h-16 px-4 py-3 rounded-2xl border-2 transition-colors duration-200',
          'flex items-center justify-center gap-1 flex-wrap',
          isEmpty && 'border-slate-700 dark:border-slate-700 bg-slate-800/30',
          wordStatus === 'incomplete' && 'border-slate-600 bg-slate-800/30',
          wordStatus === 'valid' && 'border-emerald-500 bg-emerald-500/10',
          wordStatus === 'found' && 'border-yellow-500 bg-yellow-500/10',
          wordStatus === 'invalid' && selectedTiles.length >= 2 && 'border-red-500/60 bg-red-500/5',
          wordStatus === 'invalid' && selectedTiles.length < 2 && 'border-slate-600 bg-slate-800/30',
        )}
      >
        {isEmpty ? (
          <span className="text-slate-500 text-sm">Click the letters to spell a word...</span>
        ) : (
          selectedTiles.map((tile) => {
            const display = tile.isWildcard
              ? (wildcardAssignments[tile.id] ?? '?')
              : tile.letter;
            const isUnassignedWild = tile.isWildcard && !wildcardAssignments[tile.id];
            return (
              <span
                key={tile.id}
                role={tile.isWildcard ? 'button' : undefined}
                onPointerDown={tile.isWildcard ? (e) => { e.preventDefault(); onWildcardClick(tile.id); } : undefined}
                className={clsx(
                  'text-2xl font-bold uppercase leading-none transition-colors',
                  tile.isWildcard && 'text-violet-400',
                  !tile.isWildcard && wordStatus === 'valid' && 'text-emerald-400',
                  !tile.isWildcard && wordStatus === 'found' && 'text-yellow-400',
                  !tile.isWildcard && wordStatus === 'invalid' && 'text-slate-200',
                  !tile.isWildcard && wordStatus === 'incomplete' && 'text-slate-200',
                  isUnassignedWild && 'animate-pulse cursor-pointer',
                  tile.isWildcard && wildcardAssignments[tile.id] && 'cursor-pointer',
                )}
              >
                {display}
              </span>
            );
          })
        )}
      </div>

      <div className="flex gap-2 items-center">
        {wordStatus === 'found' && (
          <span className="text-yellow-400 text-sm font-medium">Already found</span>
        )}
        {!isEmpty && (
          <Button
            variant="ghost"
            size="sm"
            onPointerDown={(e) => {
              e.preventDefault();
              const isFailed = wordStatus === 'invalid' && selectedTiles.length >= 2;
              onClear(isFailed);
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
