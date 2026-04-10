import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Button } from '../components/ui/Button';

// ── Types ────────────────────────────────────────────────────────────────────

interface Player {
  name: string;
  scores: number[]; // one entry per completed round
}

type Phase = 'setup' | 'names' | 'playing' | 'finished';

interface GameState {
  phase: Phase;
  playerCount: number;
  players: Player[];
  currentInputs: string[]; // draft scores for the round being entered
}

const STORAGE_KEY = 'caliche-scrabble-scores';
const MEDALS = ['🥇', '🥈', '🥉'];
const DEFAULT_PLAYER_NAMES = ['Caliche', 'Manu', 'Ellie'];

// ── Persistence ───────────────────────────────────────────────────────────────

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

function save(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function total(player: Player) {
  return player.scores.reduce((a, b) => a + b, 0);
}

function ranked(players: Player[]) {
  return [...players]
    .map((p, i) => ({ ...p, originalIndex: i, total: total(p) }))
    .sort((a, b) => b.total - a.total);
}

// ── Sub-screens ───────────────────────────────────────────────────────────────

function SetupScreen({ onContinue }: { onContinue: (n: number) => void }) {
  const [count, setCount] = useState(2);
  return (
    <div className="flex flex-col items-center gap-8 py-12 px-4 max-w-sm mx-auto w-full">
      <div className="text-center">
        <div className="text-5xl mb-3">🎲</div>
        <h2 className="text-2xl font-bold text-slate-100">New Game</h2>
        <p className="text-slate-400 text-sm mt-1">How many players?</p>
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        {[2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            onPointerDown={(e) => { e.preventDefault(); setCount(n); }}
            className={clsx(
              'w-14 h-14 rounded-2xl text-xl font-bold transition-all duration-150 select-none',
              count === n
                ? 'bg-indigo-600 text-white scale-105 shadow-lg shadow-indigo-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <Button size="lg" className="w-full" onPointerDown={(e) => { e.preventDefault(); onContinue(count); }}>
        Continue →
      </Button>
    </div>
  );
}

function NamesScreen({
  playerCount,
  onStart,
}: {
  playerCount: number;
  onStart: (names: string[]) => void;
}) {
  const [names, setNames] = useState<string[]>(
    Array.from({ length: playerCount }, (_, i) => DEFAULT_PLAYER_NAMES[i] ?? `Player ${i + 1}`)
  );

  const update = (i: number, val: string) =>
    setNames((prev) => prev.map((n, idx) => (idx === i ? val : n)));

  const valid = names.every((n) => n.trim().length > 0);

  return (
    <div className="flex flex-col items-center gap-6 py-10 px-4 max-w-sm mx-auto w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-100">Player names</h2>
        <p className="text-slate-400 text-sm mt-1">Enter a name for each player</p>
      </div>

      <div className="w-full space-y-3">
        {names.map((name, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-slate-500 text-sm w-6 text-right">{i + 1}.</span>
            <input
              type="text"
              value={name}
              onChange={(e) => update(i, e.target.value)}
              onFocus={(e) => e.target.select()}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        ))}
      </div>

      <Button size="lg" className="w-full" disabled={!valid} onPointerDown={(e) => { e.preventDefault(); onStart(names); }}>
        Start Game
      </Button>
    </div>
  );
}

function PlayingScreen({
  state,
  onSave,
  onAddRound,
  onFinish,
  onUpdateInput,
  onUpdateScore,
}: {
  state: GameState;
  onSave: () => void;
  onAddRound: () => void;
  onFinish: () => void;
  onUpdateInput: (i: number, val: string) => void;
  onUpdateScore: (playerIndex: number, roundIndex: number, score: number) => void;
}) {
  const { players, currentInputs } = state;
  const roundsCompleted = players[0].scores.length;
  const roundNumber = roundsCompleted + 1;
  const scoreGridTemplateColumns = roundsCompleted > 0
    ? `1fr repeat(${roundsCompleted}, auto)`
    : '1fr';

  const inputsValid = currentInputs.every((v) => v.trim() !== '' && !isNaN(Number(v)));
  const inputsBlank = currentInputs.every((v) => v.trim() === '');
  const canFinish = players[0].scores.length > 1 && inputsBlank;

  const [editingCell, setEditingCell] = useState<{ playerIndex: number; roundIndex: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const startEditing = (playerIndex: number, roundIndex: number, value: number) => {
    setEditingCell({ playerIndex, roundIndex });
    setEditingValue(String(value));
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const commitEditing = () => {
    if (!editingCell) return;
    const trimmed = editingValue.trim();
    if (trimmed === '') {
      cancelEditing();
      return;
    }
    const next = Number(trimmed);
    if (Number.isNaN(next)) {
      cancelEditing();
      return;
    }
    onUpdateScore(editingCell.playerIndex, editingCell.roundIndex, next);
    cancelEditing();
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto w-full">
      {/* Score table */}
      <div className="rounded-2xl border border-slate-700 overflow-x-auto overflow-y-hidden max-w-full">
        <div className="min-w-max">
          {/* Header row */}
          <div
            className="grid bg-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400"
            style={{ gridTemplateColumns: scoreGridTemplateColumns }}
          >
            <span>Player</span>
            {players[0].scores.map((_, i) => (
              <span key={i} className="text-center px-2">R{i + 1}</span>
            ))}
          </div>

          {/* Player rows */}
          {players.map((p, pi) => (
            <div
              key={pi}
              className="grid items-center px-4 py-2 border-t border-slate-700/50"
              style={{ gridTemplateColumns: scoreGridTemplateColumns }}
            >
              <span className="font-semibold text-slate-100 text-sm truncate pr-2">{p.name}</span>
              {p.scores.map((s, si) => (
                <span key={si} className="text-center px-2 text-slate-400 text-sm tabular-nums">
                  {editingCell?.playerIndex === pi && editingCell?.roundIndex === si ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={editingValue}
                      autoFocus
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={commitEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEditing();
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 font-semibold text-center tabular-nums focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  ) : (
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        startEditing(pi, si, s);
                      }}
                      className="px-1 rounded hover:text-slate-200 hover:bg-slate-700/40 transition-colors"
                      title="Click to edit"
                    >
                      {s}
                    </button>
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Round input */}
      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
        <h3 className="text-slate-300 font-semibold text-sm">Round {roundNumber} — Enter scores</h3>
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-slate-400 text-sm flex-1 truncate">{p.name}</span>
            <input
              type="number"
              inputMode="numeric"
              value={currentInputs[i]}
              onChange={(e) => onUpdateInput(i, e.target.value)}
              placeholder="0"
              className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold text-center tabular-nums focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="secondary" size="md" className="flex-1" onPointerDown={(e) => { e.preventDefault(); onSave(); }}>
          💾 Save
        </Button>
        <Button variant="primary" size="md" className="flex-1" disabled={!inputsValid} onPointerDown={(e) => { e.preventDefault(); onAddRound(); }}>
          + Add Round
        </Button>
        <Button variant="ghost" size="md" className="flex-1 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300" disabled={!canFinish} onPointerDown={(e) => { e.preventDefault(); onFinish(); }}>
          Finish 🏁
        </Button>
      </div>
    </div>
  );
}

function FinishedScreen({
  players,
  onNewGame,
  onUpdateScore,
}: {
  players: Player[];
  onNewGame: () => void;
  onUpdateScore: (playerIndex: number, roundIndex: number, score: number) => void;
}) {
  const results = ranked(players);

  const [editingCell, setEditingCell] = useState<{ playerIndex: number; roundIndex: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const startEditing = (playerIndex: number, roundIndex: number, value: number) => {
    setEditingCell({ playerIndex, roundIndex });
    setEditingValue(String(value));
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const commitEditing = () => {
    if (!editingCell) return;
    const trimmed = editingValue.trim();
    if (trimmed === '') {
      cancelEditing();
      return;
    }
    const next = Number(trimmed);
    if (Number.isNaN(next)) {
      cancelEditing();
      return;
    }
    onUpdateScore(editingCell.playerIndex, editingCell.roundIndex, next);
    cancelEditing();
  };

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-10 max-w-sm mx-auto w-full">
      <div className="text-center">
        <div className="text-5xl mb-3">🏆</div>
        <h2 className="text-2xl font-bold text-slate-100">Game Over</h2>
        <p className="text-slate-400 text-sm mt-1">Final rankings</p>
      </div>

      <div className="w-full space-y-2">
        {results.map((p, i) => (
          <div
            key={p.originalIndex}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-2xl border',
              i === 0 && 'bg-yellow-500/10 border-yellow-500/30',
              i === 1 && 'bg-slate-700/40 border-slate-600',
              i === 2 && 'bg-orange-900/20 border-orange-700/30',
              i > 2 && 'bg-slate-800/40 border-slate-700',
            )}
          >
            <span className="text-2xl w-8 text-center">{MEDALS[i] ?? `${i + 1}.`}</span>
            <span className="flex-1 font-bold text-slate-100 truncate">{p.name}</span>
            <div className="text-right">
              <span className="text-emerald-400 font-bold text-lg tabular-nums">{p.total}</span>
              <span className="text-slate-500 text-xs ml-1">pts</span>
            </div>
          </div>
        ))}
      </div>

      {/* Per-round breakdown */}
      <div className="w-full rounded-xl border border-slate-700 overflow-hidden">
        <div className="bg-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Round breakdown
        </div>
        {results.map((p) => (
          <div key={p.originalIndex} className="flex items-center gap-2 px-3 py-2 border-t border-slate-700/50">
            <span className="text-slate-300 text-sm font-semibold w-24 truncate">{p.name}</span>
            <div className="flex gap-1.5 flex-wrap">
              {p.scores.map((s, i) => (
                <span key={i} className="text-xs bg-slate-700 rounded px-1.5 py-0.5 text-slate-300 tabular-nums">
                  {editingCell?.playerIndex === p.originalIndex && editingCell?.roundIndex === i ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={editingValue}
                      autoFocus
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={commitEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEditing();
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      className="w-14 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-slate-100 font-semibold text-center tabular-nums focus:outline-none focus:border-indigo-500"
                    />
                  ) : (
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        startEditing(p.originalIndex, i, s);
                      }}
                      className="px-1 rounded hover:text-slate-100 hover:bg-slate-600/40 transition-colors"
                      title="Click to edit"
                    >
                      {s}
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button size="lg" className="w-full" onPointerDown={(e) => { e.preventDefault(); onNewGame(); }}>
        New Game
      </Button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const defaultState: GameState = {
  phase: 'setup',
  playerCount: 2,
  players: [],
  currentInputs: [],
};

export function ScoreTracker() {
  const [game, setGame] = useState<GameState>(() => load() ?? defaultState);

  // Auto-save on every change
  useEffect(() => { save(game); }, [game]);

  const update = (next: GameState) => setGame(next);

  const handleSetup = (n: number) =>
    update({ ...game, phase: 'names', playerCount: n });

  const handleStart = (names: string[]) =>
    update({
      ...game,
      phase: 'playing',
      players: names.map((name) => ({ name, scores: [] })),
      currentInputs: Array(names.length).fill(''),
    });

  const handleUpdateInput = (i: number, val: string) =>
    setGame((g) => ({
      ...g,
      currentInputs: g.currentInputs.map((v, idx) => (idx === i ? val : v)),
    }));

  const handleUpdateScore = (playerIndex: number, roundIndex: number, score: number) =>
    setGame((g) => ({
      ...g,
      players: g.players.map((p, pi) => {
        if (pi !== playerIndex) return p;
        return {
          ...p,
          scores: p.scores.map((s, si) => (si === roundIndex ? score : s)),
        };
      }),
    }));

  const commitRound = (finish: boolean): GameState => {
    const scores = game.currentInputs.map((v) => Number(v) || 0);
    const players = game.players.map((p, i) => ({
      ...p,
      scores: [...p.scores, scores[i]],
    }));
    return {
      ...game,
      players,
      phase: finish ? 'finished' : 'playing',
      currentInputs: Array(players.length).fill(''),
    };
  };

  const handleSave = () => save(game);

  const handleAddRound = () => update(commitRound(false));

  const handleFinish = () =>
    setGame((g) => {
      const roundsCompleted = g.players[0]?.scores.length ?? 0;
      const inputsBlank = g.currentInputs.every((v) => v.trim() === '');
      if (roundsCompleted <= 1 || !inputsBlank) return g;
      return {
        ...g,
        phase: 'finished',
        currentInputs: Array(g.players.length).fill(''),
      };
    });

  const handleNewGame = () => {
    const next = defaultState;
    update(next);
    save(next);
  };

  return (
    <div className="flex-1 flex flex-col">
      {game.phase === 'setup' && <SetupScreen onContinue={handleSetup} />}
      {game.phase === 'names' && <NamesScreen playerCount={game.playerCount} onStart={handleStart} />}
      {game.phase === 'playing' && (
        <PlayingScreen
          state={game}
          onSave={handleSave}
          onAddRound={handleAddRound}
          onFinish={handleFinish}
          onUpdateInput={handleUpdateInput}
          onUpdateScore={handleUpdateScore}
        />
      )}
      {game.phase === 'finished' && (
        <FinishedScreen players={game.players} onNewGame={handleNewGame} onUpdateScore={handleUpdateScore} />
      )}
    </div>
  );
}
