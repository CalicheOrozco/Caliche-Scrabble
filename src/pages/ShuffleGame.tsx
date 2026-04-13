import { useState } from 'react';
import { NumberSequence } from './NumberSequence';
import { WordSearch } from './WordSearch';
import { MemorySequence } from './MemorySequence';
import { MemoryInverse } from './MemoryInverse';
import { MathProblems } from './MathProblems';
import { FastCategory } from './FastCategory';
import { StroopEffect } from './StroopEffect';

type Difficulty = 'easy' | 'medium' | 'advanced';
type GameId = 'numbers' | 'wordsearch' | 'memory' | 'memoryinverse' | 'math' | 'fastcategory' | 'stroop';

const GAMES: GameId[] = ['numbers', 'wordsearch', 'memory', 'memoryinverse', 'math', 'fastcategory', 'stroop'];

const GAME_LABELS: Record<GameId, string> = {
  numbers:      'Number Sequence',
  wordsearch:   'Word Search',
  memory:       'Memory Sequence',
  memoryinverse: 'Memory Inverse',
  math:         'Math Problems',
  fastcategory: 'Fast Category',
  stroop:       'Stroop Effect',
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const DIFF_OPTIONS: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy',     label: 'Easy',     description: 'Warm up' },
  { value: 'medium',   label: 'Medium',   description: 'A challenge' },
  { value: 'advanced', label: 'Advanced', description: 'No mercy' },
];

export function ShuffleGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);

  if (selectedGame) {
    switch (selectedGame) {
      case 'numbers':       return <NumberSequence initialDifficulty={difficulty} />;
      case 'wordsearch':    return <WordSearch initialDifficulty={difficulty} />;
      case 'memory':        return <MemorySequence initialDifficulty={difficulty} />;
      case 'memoryinverse': return <MemoryInverse initialDifficulty={difficulty} />;
      case 'math':          return <MathProblems initialDifficulty={difficulty} />;
      case 'fastcategory':  return <FastCategory initialDifficulty={difficulty} />;
      case 'stroop':        return <StroopEffect initialDifficulty={difficulty} />;
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-12 max-w-sm mx-auto w-full">
      <div className="text-center">
        <div className="text-5xl mb-3">🎲</div>
        <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Shuffle</h2>
        <p className="text-slate-400 text-sm mt-2">Pick a difficulty — we'll choose the game</p>
      </div>

      <div className="w-full flex flex-col gap-3">
        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Difficulty</p>
        <div className="flex flex-col gap-2">
          {DIFF_OPTIONS.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => setDifficulty(value)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition-colors border ${
                difficulty === value
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-700/40'
              }`}
            >
              <span>{label}</span>
              <span className={`text-xs font-normal ${difficulty === value ? 'text-indigo-200' : 'text-slate-500'}`}>
                {description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setSelectedGame(pickRandom(GAMES))}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-lg rounded-2xl transition-colors"
      >
        Play!
      </button>
    </main>
  );
}

export { GAME_LABELS };
