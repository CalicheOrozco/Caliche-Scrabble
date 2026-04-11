import type { FoundWord, GameStats } from '../../types';
import { Spinner } from '../ui/Badge';
import { Button } from '../ui/Button';

const REVEAL_THRESHOLD = 5;

interface StatsPanelProps {
  stats: GameStats | null;
  foundWords: FoundWord[];
  revealedWords: FoundWord[];
  failedAttempts: number;
  phase: string;
  onReview: () => void;
  onReveal: () => void;
}

export function StatsPanel({ stats, foundWords, revealedWords, failedAttempts, phase, onReview, onReveal }: StatsPanelProps) {
  if (phase === 'computing') {
    return (
      <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-4">
        <Spinner /> Finding possible words...
      </div>
    );
  }

  if (!stats) return null;

  const foundCount = foundWords.length;
  const revealedCount = revealedWords.length;
  const total = stats.total;
  const pct = total > 0 ? Math.round((foundCount / total) * 100) : 0;
  const lengths = Object.keys(stats.byLength).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-slate-300 text-sm font-medium">
            Found: <span className="text-emerald-400 font-bold">{foundCount}</span>
            <span className="text-slate-500"> / {total}</span>
          </span>
          <span className="text-slate-500 text-sm">{pct}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Language breakdown */}
      <div className="flex gap-4 text-sm">
        {stats.totalEn > 0 && (
          <span className="text-blue-400">
            EN: <span className="font-bold">{stats.totalEn}</span>
          </span>
        )}
        {stats.totalEs > 0 && (
          <span className="text-orange-400">
            ES: <span className="font-bold">{stats.totalEs}</span>
          </span>
        )}
        {stats.totalBoth > 0 && (
          <span className="text-emerald-400">
            Both: <span className="font-bold">{stats.totalBoth}</span>
          </span>
        )}
      </div>

      {/* By length */}
      <div className="flex flex-wrap gap-2">
        {lengths.map((len) => {
          const bucket = stats.byLength[len];
          const foundInLen = foundWords.filter((w) => w.length === len).length;
          const foundEnInLen = foundWords.filter((w) => w.length === len && w.lang === 'en').length;
          const foundEsInLen = foundWords.filter((w) => w.length === len && w.lang === 'es').length;
          const foundBothInLen = foundWords.filter((w) => w.length === len && w.lang === 'both').length;
          const remEn = bucket.en - foundEnInLen;
          const remEs = bucket.es - foundEsInLen;
          const remBoth = bucket.both - foundBothInLen;
          const allFound = foundInLen >= bucket.total;
          return (
            <div
              key={len}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                allFound
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <div>{len} letters: <span className="font-bold">{foundInLen}/{bucket.total}</span></div>
              <div className="flex gap-1.5 mt-0.5 font-normal opacity-70">
                {bucket.en > 0 && <span className="text-blue-400">EN:{remEn}</span>}
                {bucket.es > 0 && <span className="text-orange-400">ES:{remEs}</span>}
                {bucket.both > 0 && <span className="text-emerald-400">⊕{remBoth}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reveal button — appears after REVEAL_THRESHOLD failed attempts */}
      {failedAttempts >= REVEAL_THRESHOLD && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
          <span className="text-rose-400 text-sm flex-1">
            {failedAttempts} failed attempts...
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-400 hover:text-rose-300 border border-rose-500/40 hover:border-rose-400"
            onPointerDown={(e) => { e.preventDefault(); onReveal(); }}
          >
            Reveal 1 word
          </Button>
        </div>
      )}

      {revealedCount > 0 && failedAttempts < REVEAL_THRESHOLD && (
        <p className="text-slate-600 text-xs">
          {revealedCount} {revealedCount === 1 ? 'word revealed' : 'words revealed'}
        </p>
      )}

      {/* Review button */}
      <Button variant="ghost" size="sm" onPointerDown={(e) => { e.preventDefault(); onReview(); }}>
        See all words →
      </Button>
    </div>
  );
}
