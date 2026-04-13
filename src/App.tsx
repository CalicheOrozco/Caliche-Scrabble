import { useEffect, useMemo, useState } from 'react';
import { DictionaryProvider } from './context/DictionaryContext';
import { useGame } from './hooks/useGame';
import type { DrawSize } from './constants/game';

import { Header } from './components/layout/Header';
import { GameControls } from './components/game/GameControls';
import { TileRack } from './components/game/TileRack';
import { WordBuilder } from './components/game/WordBuilder';
import { WildcardPicker } from './components/game/WildcardPicker';
import { StatsPanel } from './components/stats/StatsPanel';
import { FoundWordsList } from './components/stats/FoundWordsList';
import { ReviewModal } from './components/stats/ReviewModal';
import { WordChecker } from './pages/WordChecker';
import { ScoreTracker } from './pages/ScoreTracker';
import { SpanishRecall } from './pages/SpanishRecall';
import { NumberSequence } from './pages/NumberSequence';
import { WordSearch } from './pages/WordSearch';
import { MemorySequence } from './pages/MemorySequence';
import { MemoryInverse } from './pages/MemoryInverse';
import { MathProblems } from './pages/MathProblems';
import { FastCategory } from './pages/FastCategory';
import { StroopEffect } from './pages/StroopEffect';
import { PracticeMenu } from './pages/MinigamesMenu';

type Page = 'game' | 'minigames' | 'checker' | 'scores' | 'recall' | 'numbers' | 'wordsearch' | 'memory' | 'memoryinverse' | 'math' | 'fastcategory' | 'stroop';

function pageFromPathname(pathname: string): Page {
  const normalized = pathname.replace(/\/+$/, '');
  if (/^\/ScoreTracker$/i.test(normalized)) return 'scores';
  if (/^\/(WordChecker|checker)$/i.test(normalized)) return 'checker';
  if (/^\/(mini-games|practice|menu)$/i.test(normalized)) return 'minigames';
  if (/^\/recall$/i.test(normalized)) return 'recall';
  if (/^\/number-sequence$/i.test(normalized)) return 'numbers';
  if (/^\/word-search$/i.test(normalized)) return 'wordsearch';
  if (/^\/memory-sequence$/i.test(normalized)) return 'memory';
  if (/^\/memory-inverse$/i.test(normalized)) return 'memoryinverse';
  if (/^\/math-problems$/i.test(normalized)) return 'math';
  if (/^\/fast-category$/i.test(normalized)) return 'fastcategory';
  if (/^\/stroop-effect$/i.test(normalized)) return 'stroop';
  return 'game';
}

function pathnameForPage(page: Page): string {
  switch (page) {
    case 'game':          return '/';
    case 'minigames':     return '/mini-games';
    case 'checker':       return '/WordChecker';
    case 'scores':        return '/ScoreTracker';
    case 'recall':        return '/recall';
    case 'numbers':       return '/number-sequence';
    case 'wordsearch':    return '/word-search';
    case 'memory':        return '/memory-sequence';
    case 'memoryinverse': return '/memory-inverse';
    case 'math':          return '/math-problems';
    case 'fastcategory':  return '/fast-category';
    case 'stroop':        return '/stroop-effect';
  }
}

function GamePage() {
  const [wildcardPickerTileId, setWildcardPickerTileId] = useState<string | null>(null);

  const {
    state, workerStatus, wordStatus, foundWordSet,
    draw, selectTile, submitWord, assignWildcard,
    clearSelection, revealWord, shuffleTiles,
    reset, setDrawSize, toggleLang, setReviewing, exitReviewing,
  } = useGame();

  const usedTileIds = useMemo(() => new Set<string>(), []);

  const selectedTilesData = state.selectedTileIds
    .map((id) => state.drawnTiles.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  const handleNewDraw = () => { reset(); draw(); };

  return (
    <>
      <main className="flex-1 flex flex-col items-center gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
        <GameControls
          drawSize={state.drawSize as DrawSize}
          activeLangs={state.activeLangs}
          workerStatus={workerStatus}
          phase={state.phase}
          onDrawSizeChange={setDrawSize}
          onToggleLang={toggleLang}
          onDraw={draw}
          onReset={handleNewDraw}
        />

        {state.drawnTiles.length > 0 && (
          <div className="w-full flex flex-col items-center gap-6">
            <WordBuilder
              selectedTiles={selectedTilesData}
              wildcardAssignments={state.wildcardAssignments}
              wordStatus={wordStatus}
              onClear={clearSelection}
              onSubmit={submitWord}
              onWildcardClick={(id) => setWildcardPickerTileId(id)}
            />
            <TileRack
              tiles={state.drawnTiles}
              selectedTileIds={state.selectedTileIds}
              usedTileIds={usedTileIds}
              wildcardAssignments={state.wildcardAssignments}
              onTileClick={selectTile}
            />
            <button
              onPointerDown={(e) => { e.preventDefault(); shuffleTiles(); }}
              className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1.5 transition-colors select-none"
            >
              <span>⇌</span> Shuffle
            </button>
          </div>
        )}

        {state.phase === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-12">
            <div className="text-6xl mb-2">🎯</div>
            <h2 className="text-2xl font-bold text-slate-200">Train your Scrabble anagram skills!</h2>
            <p className="text-slate-400 max-w-sm text-sm leading-relaxed">
              Choose how many tiles to draw, pick your languages, and start finding words.
              Click the letters to spell them out.
            </p>
          </div>
        )}

        {(state.phase === 'playing' || state.phase === 'computing' || state.phase === 'reviewing') && (
          <div className="w-full space-y-4">
            <StatsPanel
              stats={state.stats}
              foundWords={state.foundWords}
              revealedWords={state.revealedWords}
              failedAttempts={state.failedAttempts}
              phase={state.phase}
              onReview={setReviewing}
              onReveal={revealWord}
            />
            <FoundWordsList
              foundWords={state.foundWords}
              revealedWords={state.revealedWords}
            />
          </div>
        )}
      </main>

      {wildcardPickerTileId && (
        <WildcardPicker
          tileId={wildcardPickerTileId}
          onSelect={(id, letter) => { assignWildcard(id, letter); setWildcardPickerTileId(null); }}
          onClose={() => setWildcardPickerTileId(null)}
        />
      )}

      {state.phase === 'reviewing' && (
        <ReviewModal
          allWords={state.allValidWords}
          foundWordSet={foundWordSet}
          onClose={exitReviewing}
          onNewDraw={handleNewDraw}
        />
      )}
    </>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(() => pageFromPathname(window.location.pathname));

  useEffect(() => {
    const syncFromUrl = () => {
      const nextPage = pageFromPathname(window.location.pathname);
      setPage(nextPage);

      // If the user landed on an alias route (e.g. /practice), normalize to the
      // canonical pathname so the URL doesn't keep the old alias.
      const canonical = pathnameForPage(nextPage);
      if (window.location.pathname !== canonical) {
        window.history.replaceState({}, '', canonical);
      }
    };

    // Run once on mount to normalize the initial URL.
    syncFromUrl();

    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const navigate = (nextPage: Page) => {
    setPage(nextPage);
    const nextPathname = pathnameForPage(nextPage);
    if (window.location.pathname !== nextPathname) {
      window.history.pushState({}, '', nextPathname);
    }
  };

  const MINIGAME_PAGES: Page[] = ['numbers', 'wordsearch', 'memory', 'memoryinverse', 'math', 'fastcategory', 'stroop'];
  const isMinigame = MINIGAME_PAGES.includes(page);

  return (
    <DictionaryProvider>
      <div className="min-h-dvh bg-slate-900 text-slate-100 flex flex-col">
        {page !== 'scores' && <Header page={page} onNavigate={navigate} />}
        {isMinigame && (
          <div className="px-4 pt-3 pb-0 max-w-3xl mx-auto w-full">
            <button
              onClick={() => navigate('minigames')}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Mini games
            </button>
          </div>
        )}
        {page === 'game' && <GamePage />}
        {page === 'minigames' && <PracticeMenu onNavigate={navigate} />}
        {page === 'checker' && <WordChecker />}
        {page === 'scores' && <ScoreTracker />}
        {page === 'recall' && <SpanishRecall />}
        {page === 'numbers' && <NumberSequence />}
        {page === 'wordsearch' && <WordSearch />}
        {page === 'memory' && <MemorySequence />}
        {page === 'memoryinverse' && <MemoryInverse />}
        {page === 'math' && <MathProblems />}
        {page === 'fastcategory' && <FastCategory />}
        {page === 'stroop' && <StroopEffect />}
      </div>
    </DictionaryProvider>
  );
}
