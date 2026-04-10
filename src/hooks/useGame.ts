import { useCallback, useMemo, useReducer } from 'react';
import { gameReducer, initialState } from '../store/gameReducer';
import { useDictionary } from './useDictionary';
import { drawTiles } from '../utils/tileBag';
import type { FoundWord, GameStats } from '../types';

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const onWordsFound = useCallback((words: FoundWord[], stats: GameStats) => {
    dispatch({ type: 'WORDS_COMPUTED', words, stats });
  }, []);

  const { status: workerStatus, findWords } = useDictionary(onWordsFound);

  // Set of all valid word strings for O(1) lookup
  const validWordSet = useMemo(
    () => new Set(state.allValidWords.map((w) => w.word)),
    [state.allValidWords]
  );

  // Set of already found words
  const foundWordSet = useMemo(
    () => new Set(state.foundWords.map((w) => w.word)),
    [state.foundWords]
  );

  // Derive the current word being spelled
  const currentWord = useMemo(() => {
    return state.selectedTileIds
      .map((id) => {
        const tile = state.drawnTiles.find((t) => t.id === id);
        if (!tile) return '';
        if (tile.isWildcard) return state.wildcardAssignments[id] ?? '?';
        return tile.letter;
      })
      .join('');
  }, [state.selectedTileIds, state.drawnTiles, state.wildcardAssignments]);

  // Validation state of current word
  const wordStatus = useMemo((): 'empty' | 'incomplete' | 'found' | 'valid' | 'invalid' => {
    if (currentWord.length === 0) return 'empty';
    if (currentWord.includes('?')) return 'incomplete';
    if (foundWordSet.has(currentWord)) return 'found';
    if (validWordSet.has(currentWord)) return 'valid';
    return 'invalid';
  }, [currentWord, validWordSet, foundWordSet]);

  const draw = useCallback(() => {
    if (workerStatus !== 'ready') return;
    const tiles = drawTiles(state.drawSize);
    dispatch({ type: 'DRAW_TILES', tiles });
    const regularLetters = tiles.filter((t) => !t.isWildcard).map((t) => t.letter);
    const wildcards = tiles.filter((t) => t.isWildcard).length;
    findWords(regularLetters, wildcards, state.activeLangs);
  }, [workerStatus, state.drawSize, state.activeLangs, findWords]);

  const selectTile = useCallback((tileId: string) => {
    const tile = state.drawnTiles.find((t) => t.id === tileId);
    if (!tile) return;

    if (state.selectedTileIds.includes(tileId)) {
      dispatch({ type: 'DESELECT_TILE', tileId });
    } else {
      dispatch({ type: 'SELECT_TILE', tileId });
    }
  }, [state.drawnTiles, state.selectedTileIds]);

  // Auto-submit when wordStatus turns valid
  const submitWord = useCallback(() => {
    if (wordStatus !== 'valid') return;
    const wordObj = state.allValidWords.find((w) => w.word === currentWord);
    if (wordObj) {
      dispatch({ type: 'WORD_FOUND', word: wordObj });
    }
  }, [wordStatus, currentWord, state.allValidWords]);

  const assignWildcard = useCallback((tileId: string, letter: string) => {
    dispatch({ type: 'ASSIGN_WILDCARD', tileId, letter });
  }, []);

  const clearSelection = useCallback((countAsFailed = false) => {
    if (countAsFailed) dispatch({ type: 'FAILED_ATTEMPT' });
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const revealWord = useCallback(() => {
    dispatch({ type: 'REVEAL_WORD' });
  }, []);

  const shuffleTiles = useCallback(() => {
    dispatch({ type: 'SHUFFLE_TILES' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const setDrawSize = useCallback((size: 5 | 7 | 8) => {
    dispatch({ type: 'SET_DRAW_SIZE', size });
  }, []);

  const toggleLang = useCallback((lang: 'en' | 'es') => {
    dispatch({ type: 'TOGGLE_LANG', lang });
  }, []);

  const setReviewing = useCallback(() => {
    dispatch({ type: 'SET_PHASE', phase: 'reviewing' });
  }, []);

  const exitReviewing = useCallback(() => {
    dispatch({ type: 'SET_PHASE', phase: 'playing' });
  }, []);

  return {
    state,
    workerStatus,
    currentWord,
    wordStatus,
    validWordSet,
    foundWordSet,
    draw,
    selectTile,
    submitWord,
    assignWildcard,
    clearSelection,
    revealWord,
    shuffleTiles,
    reset,
    setDrawSize,
    toggleLang,
    setReviewing,
    exitReviewing,
  };
}
