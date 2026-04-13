import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'advanced';
type Phase = 'start' | 'playing' | 'finished';
type Dir = { dr: number; dc: number };

interface WordPlacement {
  id: string;
  word: string;
  cells: [number, number][];
}

interface GridCell {
  letter: string;
  wordIds: string[];
}

interface GameState {
  grid: GridCell[][];
  placements: WordPlacement[];
  rows: number;
  cols: number;
}

interface FlashInfo {
  cells: [number, number][];
  correct: boolean;
}

// ── Config ────────────────────────────────────────────────────────────────────

const DIFF_CONFIG: Record<Difficulty, {
  rows: number; cols: number; wordCount: number;
  lengths: number[]; label: string; dirKey: string;
}> = {
  easy:     { rows: 10, cols: 10, wordCount: 6,  lengths: [5],       label: 'Easy',     dirKey: 'easy' },
  medium:   { rows: 13, cols: 13, wordCount: 8,  lengths: [5, 6],    label: 'Medium',   dirKey: 'medium' },
  advanced: { rows: 17, cols: 17, wordCount: 12, lengths: [5, 6, 7], label: 'Advanced', dirKey: 'advanced' },
};

const DIRS: Record<string, Dir[]> = {
  easy: [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
  ],
  medium: [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: -1, dc: 1 },
  ],
  advanced: [
    { dr: 0, dc: 1 },  { dr: 0, dc: -1 },
    { dr: 1, dc: 0 },  { dr: -1, dc: 0 },
    { dr: 1, dc: 1 },  { dr: 1, dc: -1 },
    { dr: -1, dc: 1 }, { dr: -1, dc: -1 },
  ],
};

const FILLER = 'AAAAABBCCDDDEEEEEFGHIIIIIJLLMMNNNOOOOPPRRRRSSSSTTTUUUVYZ';
const STORAGE_KEY = 'wordsearch_best';

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
  const cs = Math.floor((ms % 1000) / 10);
  if (minutes > 0) return `${minutes}:${String(seconds).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  return `${seconds}.${String(cs).padStart(2, '0')}s`;
}

function loadBest(): Record<Difficulty, number | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { easy: null, medium: null, advanced: null };
  } catch {
    return { easy: null, medium: null, advanced: null };
  }
}

function saveBest(diff: Difficulty, ms: number): boolean {
  const best = loadBest();
  if (best[diff] === null || ms < best[diff]!) {
    best[diff] = ms;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
    return true;
  }
  return false;
}

function startRange(size: number, wordLen: number, step: number): [number, number] {
  if (step > 0) return [0, size - wordLen];
  if (step < 0) return [wordLen - 1, size - 1];
  return [0, size - 1];
}

function generateGame(words: string[], rows: number, cols: number, dirKey: string): GameState {
  const grid: GridCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ letter: '', wordIds: [] }))
  );
  const placements: WordPlacement[] = [];
  const dirs = DIRS[dirKey];

  for (const word of words) {
    let placed = false;
    for (let attempt = 0; attempt < 150 && !placed; attempt++) {
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const [minR, maxR] = startRange(rows, word.length, dir.dr);
      const [minC, maxC] = startRange(cols, word.length, dir.dc);
      const startRow = minR + Math.floor(Math.random() * (maxR - minR + 1));
      const startCol = minC + Math.floor(Math.random() * (maxC - minC + 1));

      const cells: [number, number][] = [];
      let canPlace = true;

      for (let i = 0; i < word.length; i++) {
        const r = startRow + dir.dr * i;
        const c = startCol + dir.dc * i;
        if (r < 0 || r >= rows || c < 0 || c >= cols) { canPlace = false; break; }
        const existing = grid[r][c].letter;
        if (existing && existing !== word[i]) { canPlace = false; break; }
        cells.push([r, c]);
      }

      if (canPlace) {
        const id = `w${placements.length}`;
        for (let i = 0; i < word.length; i++) {
          const [r, c] = cells[i];
          grid[r][c].letter = word[i];
          grid[r][c].wordIds.push(id);
        }
        placements.push({ id, word, cells });
        placed = true;
      }
    }
  }

  // Fill empty cells
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (!grid[r][c].letter)
        grid[r][c].letter = FILLER[Math.floor(Math.random() * FILLER.length)];

  return { grid, placements, rows, cols };
}

function getSelectionCells(
  start: [number, number],
  end: [number, number],
  rows: number,
  cols: number,
): [number, number][] {
  const [r1, c1] = start;
  const [r2, c2] = end;
  const dr = r2 - r1;
  const dc = c2 - c1;
  if (dr === 0 && dc === 0) return [[r1, c1]];

  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);
  let stepR: number, stepC: number, steps: number;

  if (absDr === 0) {
    stepR = 0; stepC = Math.sign(dc); steps = absDc;
  } else if (absDc === 0) {
    stepR = Math.sign(dr); stepC = 0; steps = absDr;
  } else if (absDr === absDc) {
    stepR = Math.sign(dr); stepC = Math.sign(dc); steps = absDr;
  } else if (absDr > absDc * 2) {
    stepR = Math.sign(dr); stepC = 0; steps = absDr;
  } else if (absDc > absDr * 2) {
    stepR = 0; stepC = Math.sign(dc); steps = absDc;
  } else {
    stepR = Math.sign(dr); stepC = Math.sign(dc); steps = Math.min(absDr, absDc);
  }

  const cells: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const r = r1 + stepR * i;
    const c = c1 + stepC * i;
    if (r >= 0 && r < rows && c >= 0 && c < cols) cells.push([r, c]);
  }
  return cells;
}

function cellKey(r: number, c: number) { return `${r},${c}`; }

function checkSelection(cells: [number, number][], placements: WordPlacement[], foundIds: Set<string>): WordPlacement | null {
  const selFwd = cells.map(([r, c]) => cellKey(r, c)).join('|');
  const selBwd = [...cells].reverse().map(([r, c]) => cellKey(r, c)).join('|');
  for (const p of placements) {
    if (foundIds.has(p.id)) continue;
    const fwd = p.cells.map(([r, c]) => cellKey(r, c)).join('|');
    if (selFwd === fwd || selBwd === fwd) return p;
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WordSearch({ initialDifficulty = 'easy' }: { initialDifficulty?: Difficulty }) {
  const [wordBank, setWordBank] = useState<Record<string, string[]>>({});
  const [phase, setPhase] = useState<Phase>('start');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [game, setGame] = useState<GameState | null>(null);
  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
  const [flashInfo, setFlashInfo] = useState<FlashInfo | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finalMs, setFinalMs] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [bestTimes, setBestTimes] = useState<Record<Difficulty, number | null>>(loadBest);

  const gridRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const isPointerDownRef = useRef(false);
  const selectionStartRef = useRef<[number, number] | null>(null);

  // Load word bank — tries JSON first, falls back to .txt
  useEffect(() => {
    function removeAccents(w: string) {
      return w.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function parseTxt(text: string) {
      const by: Record<string, string[]> = { '5': [], '6': [], '7': [] };
      for (const line of text.split('\n')) {
        const word = removeAccents(line.trim().toUpperCase());
        const l = word.length;
        if ((l === 5 || l === 6 || l === 7) && /^[A-Z]+$/.test(word)) {
          if (by[l].length < 1000) by[l].push(word);
        }
      }
      return by;
    }

    fetch('/word_search_words.json')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setWordBank)
      .catch(() =>
        fetch('/Spanish_5-6-7letters_sorted.txt')
          .then((r) => { if (!r.ok) throw new Error(); return r.text(); })
          .then((text) => setWordBank(parseTxt(text)))
          .catch(() =>
            fetch('/Spanish_5-6-7letters.txt')
              .then((r) => r.text())
              .then((text) => setWordBank(parseTxt(text)))
              .catch(() => setWordBank({}))
          )
      );
  }, []);

  // RAF timer
  const tickRef = useRef<() => void>(null!);
  const tick = useCallback(() => {
    if (startTimeRef.current !== null) {
      setElapsedMs(Date.now() - startTimeRef.current);
      rafRef.current = requestAnimationFrame(tickRef.current);
    }
  }, []);
  tickRef.current = tick;

  const stopTimer = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // Derived sets for fast lookup
  const foundCellSet = useMemo(() => {
    if (!game) return new Set<string>();
    const s = new Set<string>();
    for (const p of game.placements) {
      if (foundIds.has(p.id)) p.cells.forEach(([r, c]) => s.add(cellKey(r, c)));
    }
    return s;
  }, [game, foundIds]);

  const selectedSet = useMemo(
    () => new Set(selectedCells.map(([r, c]) => cellKey(r, c))),
    [selectedCells]
  );

  const flashSet = useMemo(
    () => new Set((flashInfo?.cells ?? []).map(([r, c]) => cellKey(r, c))),
    [flashInfo]
  );

  const startGame = () => {
    if (!wordBank) return;
    const cfg = DIFF_CONFIG[difficulty];
    const pool: string[] = [];
    for (const l of cfg.lengths) {
      const words = wordBank[String(l)] ?? [];
      pool.push(...shuffle(words));
    }
    const picked = shuffle(pool).slice(0, cfg.wordCount);
    const newGame = generateGame(picked, cfg.rows, cfg.cols, cfg.dirKey);
    setGame(newGame);
    setFoundIds(new Set());
    setSelectedCells([]);
    setFlashInfo(null);
    setElapsedMs(0);
    setFinalMs(0);
    setIsNewRecord(false);
    stopTimer();
    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
    setPhase('playing');
  };

  // Pointer handlers
  const getCellFromPoint = (x: number, y: number): [number, number] | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el) return null;
    const row = el.dataset.row !== undefined ? parseInt(el.dataset.row) : null;
    const col = el.dataset.col !== undefined ? parseInt(el.dataset.col) : null;
    if (row === null || col === null || isNaN(row as number) || isNaN(col as number)) return null;
    return [row as number, col as number];
  };

  const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'playing' || !game) return;
    e.preventDefault();
    gridRef.current?.setPointerCapture(e.pointerId);
    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    isPointerDownRef.current = true;
    selectionStartRef.current = cell;
    setSelectedCells([cell]);
  };

  const handleGridPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || !selectionStartRef.current || !game) return;
    e.preventDefault();
    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    setSelectedCells(
      getSelectionCells(selectionStartRef.current, cell, game.rows, game.cols)
    );
  };

  const handleGridPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || !game) return;
    e.preventDefault();
    isPointerDownRef.current = false;

    const match = checkSelection(selectedCells, game.placements, foundIds);

    if (match) {
      // Correct — flash green, add to found
      setFlashInfo({ cells: match.cells, correct: true });
      setTimeout(() => setFlashInfo(null), 600);
      const newFoundIds = new Set(foundIds);
      newFoundIds.add(match.id);
      setFoundIds(newFoundIds);
      setSelectedCells([]);
      selectionStartRef.current = null;

      if (newFoundIds.size === game.placements.length) {
        stopTimer();
        const elapsed = Date.now() - startTimeRef.current!;
        setFinalMs(elapsed);
        const newRecord = saveBest(difficulty, elapsed);
        setIsNewRecord(newRecord);
        setBestTimes(loadBest());
        setTimeout(() => setPhase('finished'), 400);
      }
    } else {
      // Wrong — flash red, clear
      if (selectedCells.length > 1) {
        setFlashInfo({ cells: selectedCells, correct: false });
        setTimeout(() => setFlashInfo(null), 350);
      }
      setSelectedCells([]);
      selectionStartRef.current = null;
    }
  };

  // ── Start screen ─────────────────────────────────────────────────────────────
  if (phase === 'start') {
    const loaded = Object.keys(wordBank).length > 0;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Word Search</h2>
          <p className="text-slate-400 text-sm mt-2">
            Find all the hidden Spanish words in the grid.
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
              <span className="block text-xs font-normal opacity-70">
                {DIFF_CONFIG[d].rows}×{DIFF_CONFIG[d].cols} · {DIFF_CONFIG[d].wordCount} words
              </span>
            </button>
          ))}
        </div>

        <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm space-y-2">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3">Best times</p>
          {(['easy', 'medium', 'advanced'] as Difficulty[]).map((d) => (
            <div key={d} className="flex justify-between">
              <span className="text-slate-400">{DIFF_CONFIG[d].label}</span>
              <span className="text-slate-200 font-semibold">
                {bestTimes[d] !== null ? formatTime(bestTimes[d]!) : '—'}
              </span>
            </div>
          ))}
        </div>

        <div className="text-xs text-slate-600 text-center leading-relaxed max-w-xs">
          {difficulty === 'easy' && 'Horizontal and vertical only'}
          {difficulty === 'medium' && 'Horizontal, vertical and diagonal'}
          {difficulty === 'advanced' && 'All directions, including backwards'}
        </div>

        <button
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-3 px-12 rounded-xl transition-colors"
          onClick={startGame}
          disabled={!loaded}
        >
          {loaded ? 'Start' : 'Loading…'}
        </button>
      </div>
    );
  }

  // ── Finished screen ───────────────────────────────────────────────────────────
  if (phase === 'finished') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Completed!</h2>
          {isNewRecord && <p className="text-yellow-400 font-semibold mt-1">New personal best!</p>}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center w-full">
          <p className="text-slate-400 text-sm uppercase tracking-wider">Time</p>
          <p className="text-5xl font-extrabold text-white mt-2">{formatTime(finalMs)}</p>
          <p className="text-slate-500 text-sm mt-3">
            {DIFF_CONFIG[difficulty].label} · {game?.placements.length} words
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

  // ── Playing screen ────────────────────────────────────────────────────────────
  if (!game) return null;

  const remaining = game.placements.length - foundIds.size;
  const cfg = DIFF_CONFIG[difficulty];
  const cellSizeClass = cfg.cols >= 17 ? 'text-xs' : cfg.cols >= 13 ? 'text-sm' : 'text-base';

  return (
    <div className="flex-1 flex flex-col items-center gap-3 px-2 py-4 w-full">
      {/* Top bar */}
      <div className="w-full max-w-2xl flex items-center justify-between px-2">
        <span className="text-slate-400 text-sm">
          <span className="text-white font-bold">{remaining}</span> left
        </span>
        <span className="text-white font-mono font-bold text-xl tabular-nums">
          {formatTime(elapsedMs)}
        </span>
        <button
          className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
          onClick={() => { stopTimer(); setPhase('start'); }}
        >
          Quit
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-2xl items-start justify-center">
        {/* Grid */}
        <div
          ref={gridRef}
          className="select-none rounded-xl overflow-hidden border border-slate-700 shrink-0"
          style={{ touchAction: 'none' }}
          onPointerDown={handleGridPointerDown}
          onPointerMove={handleGridPointerMove}
          onPointerUp={handleGridPointerUp}
          onPointerCancel={handleGridPointerUp}
        >
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${game.cols}, minmax(0, 1fr))` }}
          >
            {game.grid.flatMap((row, r) =>
              row.map((cell, c) => {
                const key = cellKey(r, c);
                const isFound = foundCellSet.has(key);
                const isSelected = selectedSet.has(key);
                const isFlash = flashSet.has(key);

                let bg = 'bg-slate-800 hover:bg-slate-700';
                if (isFound)    bg = 'bg-emerald-600/30';
                if (isSelected) bg = 'bg-indigo-500/50';
                if (isFlash)    bg = flashInfo?.correct ? 'bg-emerald-500/70' : 'bg-red-500/50';

                const textColor = isFound
                  ? 'text-emerald-400'
                  : isSelected || isFlash
                  ? 'text-white'
                  : 'text-slate-300';

                const size = cfg.cols >= 17 ? 'w-9 h-9' : cfg.cols >= 13 ? 'w-10 h-10' : 'w-11 h-11';

                return (
                  <div
                    key={key}
                    data-row={r}
                    data-col={c}
                    className={`
                      ${size} flex items-center justify-center
                      font-bold ${cellSizeClass} ${bg} ${textColor}
                      border border-slate-700/40 transition-colors duration-75 cursor-default
                    `}
                  >
                    {cell.letter}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Word list */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 w-full lg:w-48 shrink-0">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3">
            Words to find
          </p>
          <ul className="space-y-1.5">
            {game.placements.map((p) => {
              const found = foundIds.has(p.id);
              return (
                <li
                  key={p.id}
                  className={`text-sm font-semibold tracking-wide ${
                    found
                      ? 'text-emerald-400 line-through opacity-60'
                      : 'text-slate-200'
                  }`}
                >
                  {found ? '✓ ' : '· '}{p.word}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
