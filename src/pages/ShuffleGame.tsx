import { useState, type ReactNode } from 'react';
import { NumberSequence } from './NumberSequence';
import { WordSearch } from './WordSearch';
import { MemorySequence } from './MemorySequence';
import { MemoryInverse } from './MemoryInverse';
import { MathProblems } from './MathProblems';
import { FastCategory } from './FastCategory';
import { StroopEffect } from './StroopEffect';
import { EmojiMemory } from './EmojiMemory';
import { Crossword } from './Crossword';

type Difficulty = 'easy' | 'medium' | 'advanced';
type GameId = 'numbers' | 'wordsearch' | 'memory' | 'memoryinverse' | 'math' | 'fastcategory' | 'stroop' | 'emojimemory' | 'crossword';

const GAMES: GameId[] = ['numbers', 'wordsearch', 'memory', 'memoryinverse', 'math', 'fastcategory', 'stroop', 'emojimemory', 'crossword'];

const GAME_LABELS: Record<GameId, string> = {
  numbers:      'Number Sequence',
  wordsearch:   'Word Search',
  memory:       'Memory Sequence',
  memoryinverse: 'Memory Inverse',
  math:         'Math Problems',
  fastcategory: 'Fast Category',
  stroop:       'Stroop Effect',
  emojimemory:  'Emoji Memory',
  crossword:    'Crossword',
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

  const handleNewShuffle = () => {
    const others = GAMES.filter(g => g !== selectedGame);
    setSelectedGame(pickRandom(others));
  };

  if (selectedGame) {
    let game: ReactNode;
    switch (selectedGame) {
      case 'numbers':       game = <NumberSequence initialDifficulty={difficulty} autoStart />; break;
      case 'wordsearch':    game = <WordSearch initialDifficulty={difficulty} autoStart />; break;
      case 'memory':        game = <MemorySequence initialDifficulty={difficulty} autoStart />; break;
      case 'memoryinverse': game = <MemoryInverse initialDifficulty={difficulty} autoStart />; break;
      case 'math':          game = <MathProblems initialDifficulty={difficulty} autoStart />; break;
      case 'fastcategory':  game = <FastCategory initialDifficulty={difficulty} autoStart />; break;
      case 'stroop':        game = <StroopEffect initialDifficulty={difficulty} autoStart />; break;
      case 'emojimemory':   game = <EmojiMemory initialDifficulty={difficulty} autoStart />; break;
      case 'crossword':     game = <Crossword initialDifficulty={difficulty} autoStart />; break;
    }

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Shuffle bar */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
            🎲 {GAME_LABELS[selectedGame]}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleNewShuffle}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              New shuffle
            </button>
            <button
              onClick={() => setSelectedGame(null)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Menu
            </button>
          </div>
        </div>
        {game}
      </div>
    );
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
