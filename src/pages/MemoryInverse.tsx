import { useEffect, useRef, useState } from 'react';

// ── Config ────────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'advanced';
type Phase = 'start' | 'showing' | 'waiting' | 'gameover';

const DIFF_CONFIG: Record<Difficulty, {
  cols: number; total: number; startLen: number;
  showMs: number; pauseMs: number; label: string;
}> = {
  easy:     { cols: 3, total: 9,  startLen: 2, showMs: 900, pauseMs: 400, label: 'Easy' },
  medium:   { cols: 4, total: 16, startLen: 3, showMs: 650, pauseMs: 250, label: 'Medium' },
  advanced: { cols: 4, total: 16, startLen: 4, showMs: 400, pauseMs: 150, label: 'Advanced' },
};

const STORAGE_KEY = 'memory_inverse_best';

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadBest(): Record<Difficulty, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { easy: 0, medium: 0, advanced: 0 };
  } catch { return { easy: 0, medium: 0, advanced: 0 }; }
}

function saveBest(diff: Difficulty, round: number): boolean {
  const best = loadBest();
  if (round > best[diff]) {
    best[diff] = round;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
    return true;
  }
  return false;
}

function randomNum(total: number) {
  return Math.floor(Math.random() * total) + 1;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MemoryInverse({ initialDifficulty = 'easy', autoStart = false }: { initialDifficulty?: Difficulty; autoStart?: boolean }) {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [phase, setPhase] = useState<Phase>('start');
  const [sequence, setSequence] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [lastTapped, setLastTapped] = useState<number | null>(null);
  const [flashWrong, setFlashWrong] = useState<number | null>(null);
  const [flashCorrect, setFlashCorrect] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [bestTimes, setBestTimes] = useState<Record<Difficulty, number>>(loadBest);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
  };

  useEffect(() => () => clearTimeouts(), []);

  const playSequence = (seq: number[], cfg: typeof DIFF_CONFIG[Difficulty]) => {
    setPhase('showing');
    setUserInput([]);
    setActiveCell(null);

    // Chained timeouts instead of pre-scheduled absolute delays.
    // On mobile browsers, batched absolute-delay timeouts can fire together;
    // chaining ensures each step waits for the previous one to complete.
    const playStep = (index: number) => {
      if (index >= seq.length) {
        schedule(() => {
          setActiveCell(null);
          setPhase('waiting');
        }, cfg.pauseMs);
        return;
      }
      const num = seq[index];
      schedule(() => {
        setActiveCell(num);
        schedule(() => {
          setActiveCell(null);
          playStep(index + 1);
        }, cfg.showMs);
      }, index === 0 ? 400 : cfg.pauseMs);
    };

    playStep(0);
  };

  const startGame = () => {
    clearTimeouts();
    const cfg = DIFF_CONFIG[difficulty];
    const seq = Array.from({ length: cfg.startLen }, () => randomNum(cfg.total));
    setSequence(seq);
    setRound(seq.length);
    setUserInput([]);
    setFlashWrong(null);
    setFlashCorrect(false);
    setIsNewRecord(false);
    playSequence(seq, cfg);
  };

  useEffect(() => { if (autoStart) setTimeout(startGame, 0); }, [autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCellClick = (num: number) => {
    if (phase !== 'waiting') return;
    const cfg = DIFF_CONFIG[difficulty];

    // Immediate tap feedback
    setLastTapped(num);
    schedule(() => setLastTapped(null), 200);

    // Expected: sequence reversed
    const reversed = [...sequence.slice(0, round)].reverse();
    const pos = userInput.length;

    if (num !== reversed[pos]) {
      setFlashWrong(num);
      setPhase('gameover');
      const completedRound = round - 1;
      const newRecord = saveBest(difficulty, completedRound);
      setIsNewRecord(newRecord);
      setBestTimes(loadBest());
      return;
    }

    const nextInput = [...userInput, num];
    setUserInput(nextInput);

    if (nextInput.length === round) {
      setFlashCorrect(true);
      schedule(() => setFlashCorrect(false), 400);

      const nextNum = randomNum(cfg.total);
      const newSeq = [...sequence, nextNum];
      setSequence(newSeq);
      const nextRound = round + 1;
      setRound(nextRound);
      schedule(() => playSequence(newSeq, cfg), 600);
    }
  };

  const cfg = DIFF_CONFIG[difficulty];

  // ── Start screen ──────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Memory Inverse</h2>
          <p className="text-slate-400 text-sm mt-2">
            Watch the sequence, then repeat it <span className="text-indigo-300 font-semibold">backwards</span>.
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-slate-500 text-sm font-mono">
            <span className="text-slate-300">1 – 2 – 3</span>
            <span>→</span>
            <span className="text-indigo-300">3 – 2 – 1</span>
          </div>
        </div>

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
              {DIFF_CONFIG[d].label}
              <span className="block text-xs font-normal opacity-70">
                {DIFF_CONFIG[d].cols}×{DIFF_CONFIG[d].cols}
              </span>
            </button>
          ))}
        </div>

        <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm space-y-2">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3">
            Best score (rounds)
          </p>
          {(['easy', 'medium', 'advanced'] as Difficulty[]).map((d) => (
            <div key={d} className="flex justify-between">
              <span className="text-slate-400">{DIFF_CONFIG[d].label}</span>
              <span className="text-slate-200 font-semibold">
                {bestTimes[d] > 0 ? `Round ${bestTimes[d]}` : '—'}
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

  // ── Game Over screen ──────────────────────────────────────────────────────
  if (phase === 'gameover') {
    const completedRound = round - 1;
    const reversed = [...sequence.slice(0, round)].reverse();
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Game Over</h2>
          {isNewRecord && <p className="text-yellow-400 font-semibold mt-1">New personal best!</p>}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center w-full space-y-4">
          <p className="text-slate-400 text-sm">You reached</p>
          <p className="text-5xl font-extrabold text-white">Round {completedRound}</p>

          <div className="space-y-1 pt-2">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Shown</p>
            <p className="text-slate-300 font-mono tracking-widest text-base">
              {sequence.slice(0, round).join(' – ')}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Expected (reversed)</p>
            <p className="text-indigo-300 font-mono tracking-widest text-base">
              {reversed.join(' – ')}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Your answer</p>
            <p className="text-slate-300 font-mono tracking-widest text-base">
              {userInput.length > 0 ? userInput.join(' – ') : '—'}
            </p>
          </div>

          {bestTimes[difficulty] > 0 && (
            <p className="text-slate-400 text-sm pt-1">
              Best: <span className="text-slate-200 font-semibold">Round {bestTimes[difficulty]}</span>
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

  // ── Playing screen ────────────────────────────────────────────────────────
  const progress = userInput.length;

  return (
    <div className="flex-1 flex flex-col items-center gap-6 px-4 py-8 max-w-sm mx-auto w-full">
      {/* Status bar */}
      <div className="w-full flex items-center justify-between">
        <span className="text-slate-400 text-sm">
          Round <span className="text-white font-bold">{round}</span>
        </span>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
          phase === 'showing'
            ? 'bg-indigo-500/20 text-indigo-300'
            : 'bg-amber-500/20 text-amber-300'
        }`}>
          {phase === 'showing' ? 'Watch…' : 'Type backwards'}
        </span>
        <button
          className="text-slate-500 hover:text-slate-300 text-xs"
          onClick={() => { clearTimeouts(); setPhase('start'); }}
        >
          Quit
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 flex-wrap justify-center">
        {Array.from({ length: round }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i < progress
                ? 'bg-amber-400'
                : i === progress && phase === 'waiting'
                ? 'bg-indigo-400 animate-pulse'
                : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Grid */}
      <div
        className="grid gap-3 w-full"
        style={{ gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cfg.total }, (_, i) => i + 1).map((num) => {
          const isActive = activeCell === num;
          const isWrong = flashWrong === num;
          const isCorrectFlash = flashCorrect && userInput.includes(num);

          const isTapped = lastTapped === num;

          let style = 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-500';
          if (isTapped)        style = 'bg-slate-500 border-slate-400 text-white scale-95';
          if (isActive)        style = 'bg-indigo-500 border-indigo-400 text-white scale-105 shadow-lg shadow-indigo-500/40';
          if (isCorrectFlash)  style = 'bg-emerald-500 border-emerald-400 text-white';
          if (isWrong)         style = 'bg-red-500 border-red-400 text-white';

          return (
            <button
              key={num}
              onPointerDown={(e) => { e.preventDefault(); handleCellClick(num); }}
              disabled={phase !== 'waiting'}
              className={`
                aspect-square flex items-center justify-center rounded-xl border-2
                text-xl font-extrabold transition-all duration-150 select-none
                disabled:cursor-default ${style}
              `}
            >
              {num}
            </button>
          );
        })}
      </div>

      {/* Answer preview */}
      {phase === 'waiting' && progress > 0 && (
        <p className="text-amber-400/70 text-sm font-mono tracking-widest">
          {userInput.join(' – ')}
          <span className="text-slate-700"> – ?</span>
        </p>
      )}
    </div>
  );
}
