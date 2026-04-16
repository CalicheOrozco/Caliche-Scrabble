import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'advanced';
type Phase = 'start' | 'playing' | 'finished';
type Dir = 'across' | 'down';

interface Placement {
  id: string;
  word: string;
  row: number;
  col: number;
  dir: Dir;
  number: number;
}

interface Cell {
  letter: string;
  isWord: boolean;
  isHint: boolean;
  userLetter: string;
  number?: number;
  acrossId?: string;
  downId?: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const DIFF_CONFIG: Record<Difficulty, {
  wordCount: number; gridSize: number; revealPct: number; label: string;
}> = {
  easy:     { wordCount: 6,  gridSize: 13, revealPct: 0.45, label: 'Easy' },
  medium:   { wordCount: 9,  gridSize: 15, revealPct: 0.25, label: 'Medium' },
  advanced: { wordCount: 12, gridSize: 17, revealPct: 0.12, label: 'Advanced' },
};

const STORAGE_KEY = 'crossword_best';

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function removeAccents(w: string): string {
  return w.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const cs = Math.floor((ms % 1000) / 10);
  if (m > 0) return `${m}:${String(s % 60).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  return `${s % 60}.${String(cs).padStart(2, '0')}s`;
}

function loadBest(): Record<Difficulty, number | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { easy: null, medium: null, advanced: null };
  } catch { return { easy: null, medium: null, advanced: null }; }
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

function wordPattern(p: Placement, cells: Cell[][]): string {
  const dr = p.dir === 'down' ? 1 : 0;
  const dc = p.dir === 'across' ? 1 : 0;
  return p.word.split('').map((_, i) => {
    const cell = cells[p.row + dr * i]?.[p.col + dc * i];
    if (!cell) return '_';
    if (cell.userLetter) return cell.userLetter;
    return '_';
  }).join('');
}

// ── Crossword Generator ───────────────────────────────────────────────────────

function emptyGrid(size: number): string[][] {
  return Array.from({ length: size }, () => Array(size).fill(''));
}

function canPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dir: Dir,
  isFirst: boolean,
): boolean {
  const rows = grid.length;
  const cols = grid[0].length;
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;
  const len = word.length;

  if (row < 0 || col < 0) return false;
  if (row + dr * (len - 1) >= rows) return false;
  if (col + dc * (len - 1) >= cols) return false;

  // Cell immediately before/after word must be empty
  if (row - dr >= 0 && col - dc >= 0 && grid[row - dr][col - dc] !== '') return false;
  const er = row + dr * len, ec = col + dc * len;
  if (er < rows && ec < cols && grid[er][ec] !== '') return false;

  let intersections = 0;

  for (let i = 0; i < len; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const existing = grid[r][c];

    if (existing !== '') {
      if (existing !== word[i]) return false;
      intersections++;
    } else {
      // Perpendicular neighbors must be empty (prevents parallel adjacency)
      if (dir === 'across') {
        if (r > 0 && grid[r - 1][c] !== '') return false;
        if (r < rows - 1 && grid[r + 1][c] !== '') return false;
      } else {
        if (c > 0 && grid[r][c - 1] !== '') return false;
        if (c < cols - 1 && grid[r][c + 1] !== '') return false;
      }
    }
  }

  return isFirst || intersections > 0;
}

function generateCrossword(
  wordPool: string[],
  targetWords: number,
  gridSize: number,
): Placement[] | null {
  const words = shuffle(wordPool).slice(0, Math.min(wordPool.length, targetWords * 10));
  const grid = emptyGrid(gridSize);
  const placements: Placement[] = [];

  // Place first word horizontally in center
  const first = words[0];
  const startRow = Math.floor(gridSize / 2);
  const startCol = Math.floor((gridSize - first.length) / 2);
  for (let i = 0; i < first.length; i++) grid[startRow][startCol + i] = first[i];
  placements.push({ id: 'w0', word: first, row: startRow, col: startCol, dir: 'across', number: 1 });

  for (let wi = 1; wi < words.length && placements.length < targetWords; wi++) {
    const word = words[wi];
    let placed = false;

    for (const p of shuffle([...placements])) {
      if (placed) break;
      const newDir: Dir = p.dir === 'across' ? 'down' : 'across';
      const dr = newDir === 'down' ? 1 : 0;
      const dc = newDir === 'across' ? 1 : 0;

      for (let pi = 0; pi < p.word.length && !placed; pi++) {
        for (let wi2 = 0; wi2 < word.length && !placed; wi2++) {
          if (p.word[pi] !== word[wi2]) continue;

          const intRow = p.dir === 'across' ? p.row : p.row + pi;
          const intCol = p.dir === 'across' ? p.col + pi : p.col;
          const newRow = intRow - dr * wi2;
          const newCol = intCol - dc * wi2;

          if (canPlace(grid, word, newRow, newCol, newDir, false)) {
            for (let i = 0; i < word.length; i++) {
              grid[newRow + dr * i][newCol + dc * i] = word[i];
            }
            placements.push({ id: `w${placements.length}`, word, row: newRow, col: newCol, dir: newDir, number: 0 });
            placed = true;
          }
        }
      }
    }
  }

  if (placements.length < Math.max(3, Math.floor(targetWords * 0.6))) return null;

  // Assign numbers top-left to bottom-right; cells shared by two words share a number
  const sorted = [...placements].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
  const cellNums = new Map<string, number>();
  let n = 1;
  for (const p of sorted) {
    const key = `${p.row},${p.col}`;
    if (!cellNums.has(key)) cellNums.set(key, n++);
    p.number = cellNums.get(key)!;
  }

  return placements;
}

function buildCells(placements: Placement[], gridSize: number, revealPct: number): Cell[][] {
  const cells: Cell[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => ({ letter: '', isWord: false, isHint: false, userLetter: '' }))
  );

  for (const p of placements) {
    const dr = p.dir === 'down' ? 1 : 0;
    const dc = p.dir === 'across' ? 1 : 0;
    for (let i = 0; i < p.word.length; i++) {
      const cell = cells[p.row + dr * i][p.col + dc * i];
      cell.letter = p.word[i];
      cell.isWord = true;
      if (p.dir === 'across') cell.acrossId = p.id;
      else cell.downId = p.id;
    }
  }

  // Assign numbers
  for (const p of placements) {
    if (cells[p.row][p.col].number === undefined) cells[p.row][p.col].number = p.number;
  }

  // Collect all unique word cell keys
  const allKeys = new Set<string>();
  for (const p of placements) {
    const dr = p.dir === 'down' ? 1 : 0;
    const dc = p.dir === 'across' ? 1 : 0;
    for (let i = 0; i < p.word.length; i++) allKeys.add(`${p.row + dr * i},${p.col + dc * i}`);
  }

  const targetHints = Math.ceil(allKeys.size * revealPct);
  const hintSet = new Set<string>();

  // Guarantee middle letter of each word as a hint
  for (const p of placements) {
    const dr = p.dir === 'down' ? 1 : 0;
    const dc = p.dir === 'across' ? 1 : 0;
    const mid = Math.floor(p.word.length / 2);
    hintSet.add(`${p.row + dr * mid},${p.col + dc * mid}`);
  }

  // Fill up to target with random cells
  for (const key of shuffle([...allKeys])) {
    if (hintSet.size >= targetHints) break;
    hintSet.add(key);
  }

  for (const key of hintSet) {
    const [r, c] = key.split(',').map(Number);
    cells[r][c].isHint = true;
    cells[r][c].userLetter = cells[r][c].letter;
  }

  return cells;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Crossword({ initialDifficulty = 'easy', autoStart = false }: {
  initialDifficulty?: Difficulty;
  autoStart?: boolean;
}) {
  const [difficulty, setDifficulty]     = useState<Difficulty>(initialDifficulty);
  const [phase, setPhase]               = useState<Phase>('start');
  const [wordBank, setWordBank]         = useState<string[]>([]);
  const [cells, setCells]               = useState<Cell[][]>([]);
  const [placements, setPlacements]     = useState<Placement[]>([]);
  const [gridSize, setGridSize]         = useState(13);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [selectedDir, setSelectedDir]   = useState<Dir>('across');
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [justCompleted, setJustCompleted] = useState<string | null>(null); // placement id
  const [elapsedMs, setElapsedMs]       = useState(0);
  const [finalMs, setFinalMs]           = useState(0);
  const [isNewRecord, setIsNewRecord]   = useState(false);
  const [bestTimes, setBestTimes]       = useState<Record<Difficulty, number | null>>(loadBest);

  const inputRef     = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef       = useRef<number | null>(null);
  const tickRef      = useRef<() => void>(null!);
  const prevDoneRef  = useRef<Set<string>>(new Set());

  const stopTimer = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const tick = useCallback(() => {
    if (startTimeRef.current !== null) {
      setElapsedMs(Date.now() - startTimeRef.current);
      rafRef.current = requestAnimationFrame(tickRef.current);
    }
  }, []);
  useEffect(() => { tickRef.current = tick; });

  // Load word bank
  useEffect(() => {
    function parseWords(text: string): string[] {
      const out: string[] = [];
      for (const line of text.split('\n')) {
        const w = removeAccents(line.trim().toUpperCase());
        if (w.length >= 4 && w.length <= 8 && /^[A-Z]+$/.test(w)) out.push(w);
      }
      return out;
    }
    fetch('/word_search_words.json')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Record<string, string[]>) => {
        const words: string[] = [];
        for (const arr of Object.values(data)) words.push(...arr);
        setWordBank(words.map(w => removeAccents(w.toUpperCase())).filter(w => /^[A-Z]{4,8}$/.test(w)));
      })
      .catch(() =>
        fetch('/Spanish_5-6-7letters_sorted.txt')
          .then(r => { if (!r.ok) throw new Error(); return r.text(); })
          .then(t => setWordBank(parseWords(t)))
          .catch(() =>
            fetch('/Spanish_7letters_sorted.txt')
              .then(r => r.text())
              .then(t => setWordBank(parseWords(t)))
              .catch(() => setWordBank([]))
          )
      );
  }, []);

  const startGame = useCallback(() => {
    if (wordBank.length === 0) return;
    const cfg = DIFF_CONFIG[difficulty];
    let result: Placement[] | null = null;
    for (let attempt = 0; attempt < 20 && !result; attempt++) {
      result = generateCrossword(wordBank, cfg.wordCount, cfg.gridSize);
    }
    if (!result) return;

    setCells(buildCells(result, cfg.gridSize, cfg.revealPct));
    setPlacements(result);
    setGridSize(cfg.gridSize);
    setSelectedCell(null);
    setSelectedDir('across');
    prevDoneRef.current = new Set();
    setCompletedIds(new Set());
    setJustCompleted(null);
    setElapsedMs(0);
    setFinalMs(0);
    setIsNewRecord(false);
    stopTimer();
    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
    setPhase('playing');
  }, [wordBank, difficulty, stopTimer, tick]);

  useEffect(() => { if (autoStart && wordBank.length > 0) setTimeout(() => startGame(), 0); }, [autoStart, wordBank]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived: currently selected placement
  const selectedPlacement = useMemo((): Placement | null => {
    if (!selectedCell) return null;
    const [r, c] = selectedCell;
    const cell = cells[r]?.[c];
    if (!cell?.isWord) return null;
    const id = selectedDir === 'across' ? cell.acrossId : cell.downId;
    if (id) return placements.find(p => p.id === id) ?? null;
    const otherId = selectedDir === 'across' ? cell.downId : cell.acrossId;
    return placements.find(p => p.id === otherId) ?? null;
  }, [selectedCell, selectedDir, cells, placements]);

  // Derived: cells belonging to selected word
  const selectedWordKeys = useMemo((): Set<string> => {
    if (!selectedPlacement) return new Set();
    const s = new Set<string>();
    const dr = selectedPlacement.dir === 'down' ? 1 : 0;
    const dc = selectedPlacement.dir === 'across' ? 1 : 0;
    for (let i = 0; i < selectedPlacement.word.length; i++) {
      s.add(`${selectedPlacement.row + dr * i},${selectedPlacement.col + dc * i}`);
    }
    return s;
  }, [selectedPlacement]);

  // Cell tap handler
  const handleCellClick = useCallback((r: number, c: number) => {
    const cell = cells[r]?.[c];
    if (!cell?.isWord) return;
    if (selectedCell?.[0] === r && selectedCell?.[1] === c) {
      if (cell.acrossId && cell.downId) setSelectedDir(d => d === 'across' ? 'down' : 'across');
    } else {
      setSelectedCell([r, c]);
      if (cell.acrossId && !cell.downId) setSelectedDir('across');
      else if (cell.downId && !cell.acrossId) setSelectedDir('down');
      // else keep current direction
    }
    inputRef.current?.focus();
  }, [cells, selectedCell]);

  // Select word by id (from clue list tap)
  const selectWordById = useCallback((id: string) => {
    const p = placements.find(pl => pl.id === id);
    if (!p) return;
    const dr = p.dir === 'down' ? 1 : 0;
    const dc = p.dir === 'across' ? 1 : 0;
    let target: [number, number] = [p.row, p.col];
    for (let i = 0; i < p.word.length; i++) {
      const r = p.row + dr * i, c = p.col + dc * i;
      if (!cells[r][c].isHint && !cells[r][c].userLetter) { target = [r, c]; break; }
    }
    setSelectedCell(target);
    setSelectedDir(p.dir);
    inputRef.current?.focus();
  }, [placements, cells]);

  // Process a letter input
  const processLetter = useCallback((letter: string) => {
    if (!selectedCell || !selectedPlacement || phase !== 'playing') return;
    const [r, c] = selectedCell;
    if (cells[r][c].isHint) return;

    const dr = selectedPlacement.dir === 'down' ? 1 : 0;
    const dc = selectedPlacement.dir === 'across' ? 1 : 0;
    const idx = selectedPlacement.dir === 'across'
      ? c - selectedPlacement.col
      : r - selectedPlacement.row;

    setCells(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      next[r][c].userLetter = letter;
      return next;
    });

    // Advance to next non-hint empty cell in word
    for (let ni = idx + 1; ni < selectedPlacement.word.length; ni++) {
      const nr = selectedPlacement.row + dr * ni;
      const nc = selectedPlacement.col + dc * ni;
      if (!cells[nr][nc].isHint) { setSelectedCell([nr, nc]); return; }
    }
  }, [selectedCell, selectedPlacement, cells, phase]);

  // Process backspace
  const processBackspace = useCallback(() => {
    if (!selectedCell || !selectedPlacement || phase !== 'playing') return;
    const [r, c] = selectedCell;
    const cell = cells[r][c];
    if (cell.isHint) return;

    const dr = selectedPlacement.dir === 'down' ? 1 : 0;
    const dc = selectedPlacement.dir === 'across' ? 1 : 0;
    const idx = selectedPlacement.dir === 'across'
      ? c - selectedPlacement.col
      : r - selectedPlacement.row;

    if (cell.userLetter) {
      setCells(prev => {
        const next = prev.map(row => row.map(c => ({ ...c })));
        next[r][c].userLetter = '';
        return next;
      });
    } else if (idx > 0) {
      const pr = r - dr, pc = c - dc;
      setSelectedCell([pr, pc]);
      if (!cells[pr][pc].isHint) {
        setCells(prev => {
          const next = prev.map(row => row.map(c => ({ ...c })));
          next[pr][pc].userLetter = '';
          return next;
        });
      }
    }
  }, [selectedCell, selectedPlacement, cells, phase]);

  // Desktop keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') { e.preventDefault(); processBackspace(); return; }
    const letter = removeAccents(e.key).toUpperCase();
    if (/^[A-Z]$/.test(letter)) { e.preventDefault(); processLetter(letter); }
  }, [processLetter, processBackspace]);

  // Mobile: capture typed char from onChange
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    e.target.value = ''; // reset immediately
    if (!val) return;
    const letter = removeAccents(val[val.length - 1]).toUpperCase();
    if (/^[A-Z]$/.test(letter)) processLetter(letter);
  }, [processLetter]);

  // Check completion whenever cells change
  useEffect(() => {
    if (phase !== 'playing' || cells.length === 0 || placements.length === 0) return;
    const done = new Set<string>();
    for (const p of placements) {
      const dr = p.dir === 'down' ? 1 : 0;
      const dc = p.dir === 'across' ? 1 : 0;
      if (p.word.split('').every((l, i) => cells[p.row + dr * i]?.[p.col + dc * i]?.userLetter === l)) {
        done.add(p.id);
      }
    }

    const newlyDone = [...done].find(id => !prevDoneRef.current.has(id));
    prevDoneRef.current = done;

    setTimeout(() => {
      setCompletedIds(done);
      if (newlyDone) {
        setJustCompleted(newlyDone);
        setTimeout(() => setJustCompleted(null), 1200);
      }
      if (done.size === placements.length) {
        stopTimer();
        const elapsed = Date.now() - startTimeRef.current!;
        setFinalMs(elapsed);
        setIsNewRecord(saveBest(difficulty, elapsed));
        setBestTimes(loadBest());
        setTimeout(() => setPhase('finished'), 400);
      }
    }, 0);
  }, [cells]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start screen ──────────────────────────────────────────────────────────
  if (phase === 'start') {
    const loaded = wordBank.length > 0;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <div className="text-5xl mb-2">✏️</div>
          <h2 className="text-3xl font-bold text-slate-100">Crossword</h2>
          <p className="text-slate-400 text-sm mt-2">Fill in the hidden Spanish words.</p>
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
                {DIFF_CONFIG[d].wordCount} words · {Math.round(DIFF_CONFIG[d].revealPct * 100)}% hints
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

  // ── Finished screen ───────────────────────────────────────────────────────
  if (phase === 'finished') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <div className="text-5xl mb-2">🎉</div>
          <h2 className="text-3xl font-bold text-slate-100">Completed!</h2>
          {isNewRecord && <p className="text-yellow-400 font-semibold mt-1">New personal best!</p>}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center w-full">
          <p className="text-slate-400 text-sm">Finished in</p>
          <p className="text-5xl font-extrabold text-white mt-1">{formatTime(finalMs)}</p>
          <p className="text-slate-500 text-sm mt-3">
            {DIFF_CONFIG[difficulty].label} · {placements.length} words
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

  // ── Playing screen ────────────────────────────────────────────────────────
  const acrossWords = placements.filter(p => p.dir === 'across').sort((a, b) => a.number - b.number);
  const downWords   = placements.filter(p => p.dir === 'down').sort((a, b) => a.number - b.number);

  const justCompletedWord = justCompleted ? placements.find(p => p.id === justCompleted) : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-2 py-3 w-full gap-2">
      {/* Word completed feedback toast */}
      {justCompletedWord && (
        <div className="shrink-0 flex items-center justify-center">
          <div className="bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg animate-bounce">
            ✓ {justCompletedWord.word}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-1">
        <span className="text-slate-400 text-sm">
          <span className="text-white font-bold">{completedIds.size}</span>
          <span className="text-slate-600">/{placements.length}</span>
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

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* Grid */}
        <div
          className="shrink-0 self-center lg:self-start"
          style={{ width: `min(100%, min(calc(100dvh - 220px), 680px))` }}
        >
          {/* Hidden input captures keyboard on both desktop and mobile */}
          <input
            ref={inputRef}
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={handleKeyDown}
            onChange={handleInputChange}
            defaultValue=""
          />

          <div
            className="grid w-full"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {cells.map((row, r) =>
              row.map((cell, c) => {
                const key = `${r},${c}`;
                const isSelectedCell = selectedCell?.[0] === r && selectedCell?.[1] === c;
                const isSelectedWord = selectedWordKeys.has(key);
                const isDone = !!(
                  (cell.acrossId && completedIds.has(cell.acrossId)) ||
                  (cell.downId   && completedIds.has(cell.downId))
                );

                if (!cell.isWord) {
                  return <div key={key} className="aspect-square bg-slate-950" />;
                }

                const hasInput = !!cell.userLetter && !cell.isHint;
                const isCorrect = hasInput && cell.userLetter === cell.letter;
                const isWrong   = hasInput && cell.userLetter !== cell.letter;

                let bg = 'bg-slate-800';
                if (isSelectedWord)        bg = 'bg-indigo-950/80';
                if (isDone)                bg = 'bg-emerald-900/60';
                if (isCorrect && !isDone)  bg = 'bg-emerald-900/40';
                if (isWrong)               bg = isSelectedWord ? 'bg-red-950/80' : 'bg-red-950/50';
                if (cell.isHint)           bg = isDone ? 'bg-emerald-800/60' : isSelectedWord ? 'bg-indigo-900' : 'bg-slate-700';
                if (isSelectedCell)        bg = isWrong ? 'bg-red-600' : 'bg-indigo-500';

                const textColor = isSelectedCell
                  ? 'text-white font-bold'
                  : isDone
                  ? 'text-emerald-300'
                  : isWrong
                  ? 'text-red-300 font-bold'
                  : isCorrect
                  ? 'text-emerald-400'
                  : cell.isHint
                  ? 'text-slate-400'
                  : 'text-slate-100';

                return (
                  <div
                    key={key}
                    className={`aspect-square relative flex items-center justify-center select-none cursor-pointer border border-slate-900 ${bg} ${textColor} transition-colors duration-75`}
                    style={{ fontSize: `clamp(8px, calc(60vw / ${gridSize}), ${gridSize >= 17 ? 18 : gridSize >= 15 ? 20 : 22}px)` }}
                    onPointerDown={(e) => { e.preventDefault(); handleCellClick(r, c); }}
                  >
                    {cell.number !== undefined && (
                      <span
                        className="absolute top-0 left-0 leading-none pl-px pt-px text-slate-400 font-semibold select-none pointer-events-none"
                        style={{ fontSize: `clamp(5px, calc(20vw / ${gridSize}), ${gridSize >= 17 ? 9 : 10}px)` }}
                      >
                        {cell.number}
                      </span>
                    )}
                    {cell.userLetter}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Clue list */}
        <div className="overflow-y-auto pb-2">
          <div className="flex lg:flex-col gap-4 lg:gap-3">
            {acrossWords.length > 0 && (
              <div className="min-w-32.5 lg:min-w-0">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1.5">Across →</p>
                <ul className="space-y-0.5">
                  {acrossWords.map(p => {
                    const done   = completedIds.has(p.id);
                    const active = selectedPlacement?.id === p.id;
                    return (
                      <li key={p.id}>
                        <button
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => selectWordById(p.id)}
                          className={`w-full text-left text-xs font-mono px-2 py-1 rounded transition-colors ${
                            done   ? 'text-emerald-400 line-through opacity-60' :
                            active ? 'bg-indigo-600/30 text-indigo-200' :
                                     'text-slate-300 hover:text-white'
                          }`}
                        >
                          <span className="font-sans font-bold mr-1 not-italic">{p.number}.</span>
                          {wordPattern(p, cells)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {downWords.length > 0 && (
              <div className="min-w-32.5 lg:min-w-0">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1.5">Down ↓</p>
                <ul className="space-y-0.5">
                  {downWords.map(p => {
                    const done   = completedIds.has(p.id);
                    const active = selectedPlacement?.id === p.id;
                    return (
                      <li key={p.id}>
                        <button
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => selectWordById(p.id)}
                          className={`w-full text-left text-xs font-mono px-2 py-1 rounded transition-colors ${
                            done   ? 'text-emerald-400 line-through opacity-60' :
                            active ? 'bg-indigo-600/30 text-indigo-200' :
                                     'text-slate-300 hover:text-white'
                          }`}
                        >
                          <span className="font-sans font-bold mr-1 not-italic">{p.number}.</span>
                          {wordPattern(p, cells)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
