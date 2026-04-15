import { useCallback, useEffect, useRef, useState } from 'react';

// ── Config ────────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'advanced';
type Phase = 'start' | 'playing' | 'finished';

const EMOJIS = [
  '😀','😂','😍','😎','🤔','😴','🥰','😱',
  '🤩','🥳','🍕','🍔','🌮','🍦','🎂','🍩',
  '⭐','🔥','💎','🎮','⚽','🎸','🌈','🎯',
  '👍','🌸','🇲🇽','🎃','🎁','🏆','🇨🇦',
] as const;

const DIFF_CONFIG: Record<Difficulty, {
  cols: number; pairs: number; label: string; flipBackMs: number;
}> = {
  easy:     { cols: 4, pairs: 8,  label: 'Easy',     flipBackMs: 1000 },
  medium:   { cols: 4, pairs: 12, label: 'Medium',   flipBackMs: 800  },
  advanced: { cols: 5, pairs: 15, label: 'Advanced', flipBackMs: 600  },
};

const STORAGE_KEY = 'emoji_memory_best';

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadBest(): Record<Difficulty, number | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { easy: null, medium: null, advanced: null };
  } catch { return { easy: null, medium: null, advanced: null }; }
}

function saveBest(diff: Difficulty, moves: number): boolean {
  const best = loadBest();
  if (best[diff] === null || moves < best[diff]!) {
    best[diff] = moves;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
    return true;
  }
  return false;
}

interface Card {
  id: number;
  pairId: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairs: number): Card[] {
  const emojis = shuffle([...EMOJIS]).slice(0, pairs);
  const cards: Card[] = [];
  emojis.forEach((emoji, pairId) => {
    cards.push({ id: pairId * 2,     pairId, emoji, isFlipped: false, isMatched: false });
    cards.push({ id: pairId * 2 + 1, pairId, emoji, isFlipped: false, isMatched: false });
  });
  return shuffle(cards);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EmojiMemory({ initialDifficulty = 'easy', autoStart = false }: {
  initialDifficulty?: Difficulty;
  autoStart?: boolean;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [phase, setPhase]           = useState<Phase>('start');
  const [cards, setCards]           = useState<Card[]>([]);
  const [selected, setSelected]     = useState<number[]>([]);
  const [locked, setLocked]         = useState(false);
  const [moves, setMoves]           = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [bestScores, setBestScores] = useState<Record<Difficulty, number | null>>(loadBest);

  const flipBackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (flipBackRef.current) clearTimeout(flipBackRef.current); }, []);

  const startGame = useCallback(() => {
    if (flipBackRef.current) clearTimeout(flipBackRef.current);
    setCards(buildDeck(DIFF_CONFIG[difficulty].pairs));
    setSelected([]);
    setLocked(false);
    setMoves(0);
    setIsNewRecord(false);
    setPhase('playing');
  }, [difficulty]);

  useEffect(() => { if (autoStart) setTimeout(startGame, 0); }, [autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCardClick = (cardId: number) => {
    if (locked || phase !== 'playing') return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    if (selected.includes(cardId)) return;

    const flipped = cards.map(c => c.id === cardId ? { ...c, isFlipped: true } : c);
    const newSelected = [...selected, cardId];

    if (newSelected.length === 1) {
      setCards(flipped);
      setSelected(newSelected);
      return;
    }

    // Second card selected
    const [firstId] = newSelected;
    const first  = flipped.find(c => c.id === firstId)!;
    const second = flipped.find(c => c.id === cardId)!;
    const newMoves = moves + 1;
    setMoves(newMoves);
    setSelected([]);
    setLocked(true);

    if (first.pairId === second.pairId) {
      // Match!
      const withMatch = flipped.map(c =>
        c.id === firstId || c.id === cardId ? { ...c, isMatched: true } : c
      );
      setCards(withMatch);
      setLocked(false);

      if (withMatch.every(c => c.isMatched)) {
        const newRecord = saveBest(difficulty, newMoves);
        setIsNewRecord(newRecord);
        setBestScores(loadBest());
        setPhase('finished');
      }
    } else {
      // No match — flip back after delay
      setCards(flipped);
      flipBackRef.current = setTimeout(() => {
        setCards(prev => prev.map(c =>
          c.id === firstId || c.id === cardId ? { ...c, isFlipped: false } : c
        ));
        setLocked(false);
      }, DIFF_CONFIG[difficulty].flipBackMs);
    }
  };

  const cfg = DIFF_CONFIG[difficulty];
  const matchedPairs = cards.filter(c => c.isMatched).length / 2;

  // ── Start screen ──────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <div className="text-5xl mb-2">🃏</div>
          <h2 className="text-3xl font-bold text-slate-100">Emoji Memory</h2>
          <p className="text-slate-400 text-sm mt-2">Find all matching emoji pairs.</p>
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
              <span className="block text-xs font-normal opacity-70">{DIFF_CONFIG[d].pairs} pairs</span>
            </button>
          ))}
        </div>

        <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm space-y-2">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3">Best (fewest moves)</p>
          {(['easy', 'medium', 'advanced'] as Difficulty[]).map((d) => (
            <div key={d} className="flex justify-between">
              <span className="text-slate-400">{DIFF_CONFIG[d].label}</span>
              <span className="text-slate-200 font-semibold">
                {bestScores[d] !== null ? `${bestScores[d]} moves` : '—'}
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
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <div className="text-5xl mb-2">🎉</div>
          <h2 className="text-3xl font-bold text-slate-100">Completed!</h2>
          {isNewRecord && <p className="text-yellow-400 font-semibold mt-1">New personal best!</p>}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center w-full space-y-2">
          <p className="text-slate-400 text-sm">Finished in</p>
          <p className="text-6xl font-extrabold text-white">{moves}</p>
          <p className="text-slate-400 text-sm">moves</p>
          {bestScores[difficulty] !== null && (
            <p className="text-slate-400 text-sm pt-2">
              Best: <span className="text-slate-200 font-semibold">{bestScores[difficulty]} moves</span>
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
  return (
    <div className="flex-1 flex flex-col items-center gap-4 px-2 py-6 w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <span className="text-slate-400 text-sm">
          <span className="text-white font-bold">{matchedPairs}</span>
          <span className="text-slate-600">/{cfg.pairs}</span>
        </span>
        <span className="text-slate-400 text-sm">
          <span className="text-white font-bold">{moves}</span> moves
        </span>
        <button
          className="text-slate-500 hover:text-slate-300 text-xs"
          onClick={() => { if (flipBackRef.current) clearTimeout(flipBackRef.current); setPhase('start'); }}
        >
          Quit
        </button>
      </div>

      {/* Grid */}
      <div
        className="grid gap-2.5 w-full"
        style={{ gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))` }}
      >
        {cards.map((card) => {
          const visible = card.isFlipped || card.isMatched;
          return (
            <button
              key={card.id}
              onPointerDown={(e) => { e.preventDefault(); handleCardClick(card.id); }}
              disabled={card.isMatched || card.isFlipped || locked}
              className={`
                aspect-square flex items-center justify-center rounded-xl border-2
                transition-all duration-200 select-none
                ${card.isMatched
                  ? 'bg-emerald-900/30 border-emerald-700/40 opacity-50'
                  : visible
                  ? 'bg-slate-700 border-slate-500 scale-95'
                  : 'bg-indigo-900/60 border-indigo-700 active:scale-90'
                }
              `}
            >
              {visible
                ? <span className={cfg.cols === 5 ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'}>{card.emoji}</span>
                : <span className="text-slate-600 text-xl font-bold">?</span>
              }
            </button>
          );
        })}
      </div>
    </div>
  );
}
