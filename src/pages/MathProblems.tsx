import { useEffect, useRef, useState } from 'react';

// ── Config ────────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'advanced';
type Phase = 'start' | 'playing' | 'finished';
type Operator = '+' | '−' | '×' | '÷';

const DIFF_CONFIG: Record<Difficulty, {
  ops: Operator[]; maxA: number; maxB: number;
  timeLimit: number; label: string;
}> = {
  easy:     { ops: ['+', '−'],           maxA: 20,  maxB: 20,  timeLimit: 60, label: 'Easy' },
  medium:   { ops: ['+', '−', '×'],      maxA: 50,  maxB: 12,  timeLimit: 60, label: 'Medium' },
  advanced: { ops: ['+', '−', '×', '÷'], maxA: 100, maxB: 12,  timeLimit: 60, label: 'Advanced' },
};

const STORAGE_KEY = 'math_problems_best';

// ── Helpers ───────────────────────────────────────────────────────────────────

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface Problem {
  a: number;
  b: number;
  op: Operator;
  answer: number;
  display: string;
}

function generateProblem(diff: Difficulty): Problem {
  const cfg = DIFF_CONFIG[diff];
  const op = cfg.ops[Math.floor(Math.random() * cfg.ops.length)];

  let a: number, b: number, answer: number;

  switch (op) {
    case '+': {
      a = randInt(1, cfg.maxA);
      b = randInt(1, cfg.maxA);
      answer = a + b;
      break;
    }
    case '−': {
      a = randInt(1, cfg.maxA);
      b = randInt(1, a); // ensure positive result
      answer = a - b;
      break;
    }
    case '×': {
      a = randInt(2, cfg.maxB);
      b = randInt(2, cfg.maxB);
      answer = a * b;
      break;
    }
    case '÷': {
      // result and divisor first, then compute dividend
      answer = randInt(2, 12);
      b      = randInt(2, cfg.maxB);
      a      = answer * b;
      break;
    }
  }

  return { a, b, op, answer, display: `${a} ${op} ${b}` };
}

function loadBest(): Record<Difficulty, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { easy: 0, medium: 0, advanced: 0 };
  } catch { return { easy: 0, medium: 0, advanced: 0 }; }
}

function saveBest(diff: Difficulty, score: number): boolean {
  const best = loadBest();
  if (score > best[diff]) {
    best[diff] = score;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
    return true;
  }
  return false;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MathProblems({ initialDifficulty = 'easy', autoStart = false }: { initialDifficulty?: Difficulty; autoStart?: boolean }) {
  const [difficulty, setDifficulty]     = useState<Difficulty>(initialDifficulty);
  const [phase, setPhase]               = useState<Phase>('start');
  const [problem, setProblem]           = useState<Problem | null>(null);
  const [input, setInput]               = useState('');
  const [correct, setCorrect]           = useState(0);
  const [total, setTotal]               = useState(0);
  const [timeLeft, setTimeLeft]         = useState(60);
  const [feedback, setFeedback]         = useState<'correct' | 'wrong' | null>(null);
  const [isNewRecord, setIsNewRecord]   = useState(false);
  const [bestScores, setBestScores]     = useState<Record<Difficulty, number>>(loadBest);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  useEffect(() => () => { stopTimer(); if (feedbackRef.current) clearTimeout(feedbackRef.current); }, []);

  const nextProblem = () => {
    setProblem(generateProblem(difficulty));
    setInput('');
    inputRef.current?.focus();
  };

  const startGame = () => {
    stopTimer();
    const cfg = DIFF_CONFIG[difficulty];
    setCorrect(0);
    setTotal(0);
    setTimeLeft(cfg.timeLimit);
    setFeedback(null);
    setIsNewRecord(false);
    setProblem(generateProblem(difficulty));
    setInput('');
    setPhase('playing');

    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          setPhase('finished');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => { if (autoStart) startGame(); }, [autoStart]);

  // Called when user submits an answer (Enter key or button)
  const submitAnswer = () => {
    if (!problem || phase !== 'playing' || feedback) return;
    const parsed = parseInt(input.trim(), 10);
    if (isNaN(parsed)) return;

    const isCorrect = parsed === problem.answer;
    setTotal((t) => t + 1);
    if (isCorrect) setCorrect((c) => c + 1);

    setFeedback(isCorrect ? 'correct' : 'wrong');
    feedbackRef.current = setTimeout(() => {
      setFeedback(null);
      nextProblem();
    }, isCorrect ? 300 : 900);
  };

  // When game finishes save best
  useEffect(() => {
    if (phase === 'finished') {
      const newRecord = saveBest(difficulty, correct);
      setIsNewRecord(newRecord);
      setBestScores(loadBest());
    }
  }, [phase]);

  const cfg = DIFF_CONFIG[difficulty];
  const timerPct = (timeLeft / cfg.timeLimit) * 100;

  // ── Start screen ──────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Math Problems</h2>
          <p className="text-slate-400 text-sm mt-2">
            Solve as many problems as you can in 60 seconds.
          </p>
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
              <span className="block text-xs font-normal opacity-60 mt-0.5">
                {DIFF_CONFIG[d].ops.join(' ')}
              </span>
            </button>
          ))}
        </div>

        <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm space-y-2">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3">Best score</p>
          {(['easy', 'medium', 'advanced'] as Difficulty[]).map((d) => (
            <div key={d} className="flex justify-between">
              <span className="text-slate-400">{DIFF_CONFIG[d].label}</span>
              <span className="text-slate-200 font-semibold">
                {bestScores[d] > 0 ? `${bestScores[d]} correct` : '—'}
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

  // ── Finished screen ───────────────────────────────────────────────────────
  if (phase === 'finished') {
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Time's up!</h2>
          {isNewRecord && <p className="text-yellow-400 font-semibold mt-1">New personal best!</p>}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center w-full space-y-4">
          <div>
            <p className="text-slate-400 text-sm">Correct answers</p>
            <p className="text-6xl font-extrabold text-white mt-1">{correct}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
            <div className="bg-slate-700/50 rounded-xl p-3">
              <p className="text-slate-400">Total attempted</p>
              <p className="text-slate-100 font-bold text-xl">{total}</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-3">
              <p className="text-slate-400">Accuracy</p>
              <p className="text-slate-100 font-bold text-xl">{accuracy}%</p>
            </div>
          </div>
          {bestScores[difficulty] > 0 && (
            <p className="text-slate-400 text-sm">
              Best: <span className="text-slate-200 font-semibold">{bestScores[difficulty]} correct</span>
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
  const feedbackBg =
    feedback === 'correct' ? 'bg-emerald-500/10 border-emerald-500/40' :
    feedback === 'wrong'   ? 'bg-red-500/10 border-red-500/40' :
                             'bg-slate-800/50 border-slate-700';

  return (
    <div className="flex-1 flex flex-col items-center gap-6 px-4 py-8 max-w-sm mx-auto w-full">
      {/* Top bar */}
      <div className="w-full flex items-center justify-between">
        <span className="text-slate-400 text-sm">
          <span className="text-emerald-400 font-bold">{correct}</span> correct
          {total > 0 && <span className="text-slate-600"> / {total}</span>}
        </span>
        <span className={`font-mono font-bold text-xl tabular-nums ${
          timeLeft <= 10 ? 'text-red-400' : 'text-white'
        }`}>
          {timeLeft}s
        </span>
        <button
          className="text-slate-500 hover:text-slate-300 text-xs"
          onClick={() => { stopTimer(); setPhase('start'); }}
        >
          Quit
        </button>
      </div>

      {/* Timer bar */}
      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            timeLeft <= 10 ? 'bg-red-500' : timeLeft <= 20 ? 'bg-amber-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Problem card */}
      <div className={`w-full border rounded-2xl p-8 text-center transition-colors duration-150 ${feedbackBg}`}>
        {feedback === 'wrong' && (
          <p className="text-red-400 text-sm font-semibold mb-2">
            Answer was {problem?.answer}
          </p>
        )}
        <p className="text-5xl sm:text-6xl font-extrabold text-slate-100 tracking-tight">
          {problem?.display} =
        </p>

        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          className="mt-6 w-full text-center text-3xl bg-slate-900 border border-slate-600 focus:border-indigo-500 focus:outline-none rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitAnswer(); } }}
          placeholder="?"
          disabled={!!feedback}
          autoComplete="off"
        />
        <p className="text-slate-600 text-xs mt-2">Press Enter to submit</p>
      </div>

      <button
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-3 px-10 rounded-xl transition-colors w-full"
        onClick={submitAnswer}
        disabled={!!feedback || !input.trim()}
      >
        Submit
      </button>
    </div>
  );
}
