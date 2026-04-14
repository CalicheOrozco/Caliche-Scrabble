import { useCallback, useEffect, useRef, useState } from 'react';

// ── Config ────────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'advanced';

const DIFFICULTY_CONFIG: Record<Difficulty, { cols: number; count: number; label: string }> = {
  easy:     { cols: 4, count: 16, label: 'Easy' },
  medium:   { cols: 5, count: 25, label: 'Medium' },
  advanced: { cols: 7, count: 49, label: 'Advanced' },
};

const STORAGE_KEY = 'numberseq_best_times';

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }
  return `${seconds}.${String(centiseconds).padStart(2, '0')}s`;
}

function loadBestTimes(): Record<Difficulty, number | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { easy: null, medium: null, advanced: null };
  } catch {
    return { easy: null, medium: null, advanced: null };
  }
}

function saveBestTime(difficulty: Difficulty, ms: number) {
  const best = loadBestTimes();
  if (best[difficulty] === null || ms < best[difficulty]!) {
    best[difficulty] = ms;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
    return true; // new record
  }
  return false;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'start' | 'playing' | 'finished';

type CellState = 'idle' | 'correct' | 'wrong';

// ── Component ─────────────────────────────────────────────────────────────────

export function NumberSequence({ initialDifficulty = 'easy', autoStart = false }: { initialDifficulty?: Difficulty; autoStart?: boolean }) {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [phase, setPhase] = useState<Phase>('start');
  const [numbers, setNumbers] = useState<number[]>([]);
  const [nextTarget, setNextTarget] = useState(1);
  const [cellStates, setCellStates] = useState<Record<number, CellState>>({});
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finalMs, setFinalMs] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [bestTimes, setBestTimes] = useState<Record<Difficulty, number | null>>(loadBestTimes);

  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const { cols, count } = DIFFICULTY_CONFIG[difficulty];

  // Timer via requestAnimationFrame
  const tick = useCallback(() => {
    if (startTimeRef.current !== null) {
      setElapsedMs(Date.now() - startTimeRef.current);
      // eslint-disable-next-line react-hooks/immutability
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const startGame = () => {
    stopTimer();
    const shuffled = shuffle(Array.from({ length: count }, (_, i) => i + 1));
    setNumbers(shuffled);
    setNextTarget(1);
    setCellStates({});
    setElapsedMs(0);
    setFinalMs(0);
    setIsNewRecord(false);
    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
    setPhase('playing');
  };

  useEffect(() => { if (autoStart) setTimeout(startGame, 0); }, [autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCellClick = (num: number) => {
    if (phase !== 'playing') return;

    if (num === nextTarget) {
      // Correct
      setCellStates((prev) => ({ ...prev, [num]: 'correct' }));

      if (num === count) {
        // Finished
        stopTimer();
        const elapsed = Date.now() - startTimeRef.current!; // eslint-disable-line react-hooks/purity
        setFinalMs(elapsed);
        const newRecord = saveBestTime(difficulty, elapsed);
        setIsNewRecord(newRecord);
        setBestTimes(loadBestTimes());
        setPhase('finished');
      } else {
        setNextTarget(num + 1);
      }
    } else {
      // Wrong — flash red then back to idle
      setCellStates((prev) => ({ ...prev, [num]: 'wrong' }));
      setTimeout(() => {
        setCellStates((prev) => ({ ...prev, [num]: 'idle' }));
      }, 400);
    }
  };

  // ── Start screen ────────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Number Sequence</h2>
          <p className="text-slate-400 text-sm mt-2">
            Tap the numbers in order from 1 to {DIFFICULTY_CONFIG[difficulty].count} as fast as you can.
          </p>
        </div>

        {/* Difficulty selector */}
        <div className="flex gap-2">
          {(['easy', 'medium', 'advanced'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
                difficulty === d
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {DIFFICULTY_CONFIG[d].label}
              <span className="block text-xs font-normal opacity-70">
                {DIFFICULTY_CONFIG[d].cols}×{DIFFICULTY_CONFIG[d].cols}
              </span>
            </button>
          ))}
        </div>

        {/* Best times */}
        <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3">Best times</p>
          {(['easy', 'medium', 'advanced'] as Difficulty[]).map((d) => (
            <div key={d} className="flex justify-between text-sm">
              <span className="text-slate-400">{DIFFICULTY_CONFIG[d].label}</span>
              <span className="text-slate-200 font-semibold">
                {bestTimes[d] !== null ? formatTime(bestTimes[d]!) : '—'}
              </span>
            </div>
          ))}
        </div>

        <button
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-12 rounded-xl transition-colors"
          onClick={startGame}
        >
          Start
        </button>
      </div>
    );
  }

  // ── Finished screen ─────────────────────────────────────────────────────────
  if (phase === 'finished') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Done!</h2>
          {isNewRecord && (
            <p className="text-yellow-400 font-semibold mt-1">New personal best!</p>
          )}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center w-full">
          <p className="text-slate-400 text-sm uppercase tracking-wider">Your time</p>
          <p className="text-5xl font-extrabold text-white mt-2">{formatTime(finalMs)}</p>
          <p className="text-slate-500 text-sm mt-3">
            {DIFFICULTY_CONFIG[difficulty].label} · {count} numbers
          </p>
          {bestTimes[difficulty] !== null && (
            <p className="text-slate-400 text-sm mt-1">
              Best: <span className="text-slate-200 font-semibold">{formatTime(bestTimes[difficulty]!)}</span>
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
            onClick={startGame}
          >
            Play again
          </button>
          <button
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
            onClick={() => setPhase('start')}
          >
            Change difficulty
          </button>
        </div>
      </div>
    );
  }

  // ── Playing screen ───────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col items-center gap-4 px-4 py-6 w-full">
      {/* Header bar */}
      <div className="w-full max-w-xl flex items-center justify-between">
        <div className="text-slate-400 text-sm">
          Next:{' '}
          <span className="text-white font-extrabold text-lg">{nextTarget}</span>
          <span className="text-slate-600 text-xs ml-1">/ {count}</span>
        </div>
        <div className="text-white font-mono font-bold text-xl tabular-nums">
          {formatTime(elapsedMs)}
        </div>
        <button
          className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
          onClick={() => { stopTimer(); setPhase('start'); }}
        >
          Quit
        </button>
      </div>

      {/* Grid */}
      <div
        className="grid gap-2 w-full max-w-xl"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {numbers.map((num) => {
          const state = cellStates[num] ?? 'idle';
          const isDone = state === 'correct';
          const isWrong = state === 'wrong';

          return (
            <button
              key={num}
              onClick={() => handleCellClick(num)}
              disabled={isDone}
              className={`
                aspect-square flex items-center justify-center rounded-xl font-bold transition-all select-none
                ${cols === 7 ? 'text-sm' : cols === 5 ? 'text-base' : 'text-lg'}
                ${isDone
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-500/50 cursor-default'
                  : isWrong
                  ? 'bg-red-500/30 border border-red-500/50 text-red-300 scale-95'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-500 active:scale-95 cursor-pointer'
                }
              `}
            >
              {isDone ? '✓' : num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
