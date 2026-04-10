import type { DrawnTile, FoundWord, GameState, GamePhase, GameStats, Language } from '../types';
import { DEFAULT_DRAW_SIZE } from '../constants/game';

export type GameAction =
  | { type: 'SET_DRAW_SIZE'; size: 5 | 7 | 8 }
  | { type: 'TOGGLE_LANG'; lang: Language }
  | { type: 'DRAW_TILES'; tiles: DrawnTile[] }
  | { type: 'WORDS_COMPUTED'; words: FoundWord[]; stats: GameStats }
  | { type: 'SELECT_TILE'; tileId: string }
  | { type: 'DESELECT_TILE'; tileId: string }
  | { type: 'ASSIGN_WILDCARD'; tileId: string; letter: string }
  | { type: 'WORD_FOUND'; word: FoundWord }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'FAILED_ATTEMPT' }
  | { type: 'REVEAL_WORD' }
  | { type: 'SHUFFLE_TILES' }
  | { type: 'SET_PHASE'; phase: GamePhase }
  | { type: 'RESET' };

export const initialState: GameState = {
  phase: 'idle',
  drawSize: DEFAULT_DRAW_SIZE as 5 | 7 | 8,
  activeLangs: ['en', 'es'],
  drawnTiles: [],
  selectedTileIds: [],
  wildcardAssignments: {},
  allValidWords: [],
  foundWords: [],
  revealedWords: [],
  failedAttempts: 0,
  stats: null,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_DRAW_SIZE':
      return { ...state, drawSize: action.size };

    case 'TOGGLE_LANG': {
      const has = state.activeLangs.includes(action.lang);
      if (has && state.activeLangs.length === 1) return state; // keep at least one
      const activeLangs = has
        ? state.activeLangs.filter((l) => l !== action.lang)
        : [...state.activeLangs, action.lang];
      return { ...state, activeLangs };
    }

    case 'DRAW_TILES':
      return {
        ...state,
        phase: 'computing',
        drawnTiles: action.tiles,
        selectedTileIds: [],
        wildcardAssignments: {},
        allValidWords: [],
        foundWords: [],
        revealedWords: [],
        failedAttempts: 0,
        stats: null,
      };

    case 'WORDS_COMPUTED':
      return {
        ...state,
        phase: 'playing',
        allValidWords: action.words,
        stats: action.stats,
      };

    case 'SELECT_TILE':
      if (state.selectedTileIds.includes(action.tileId)) return state;
      return {
        ...state,
        selectedTileIds: [...state.selectedTileIds, action.tileId],
      };

    case 'DESELECT_TILE':
      return {
        ...state,
        selectedTileIds: state.selectedTileIds.filter((id) => id !== action.tileId),
      };

    case 'ASSIGN_WILDCARD':
      return {
        ...state,
        wildcardAssignments: {
          ...state.wildcardAssignments,
          [action.tileId]: action.letter,
        },
      };

    case 'WORD_FOUND':
      return {
        ...state,
        foundWords: [...state.foundWords, action.word],
        selectedTileIds: [],
        wildcardAssignments: {},
        failedAttempts: 0,
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedTileIds: [],
        wildcardAssignments: {},
      };

    case 'FAILED_ATTEMPT':
      return { ...state, failedAttempts: state.failedAttempts + 1 };

    case 'REVEAL_WORD': {
      const knownWords = new Set([
        ...state.foundWords.map((w) => w.word),
        ...state.revealedWords.map((w) => w.word),
      ]);
      const candidates = state.allValidWords.filter((w) => !knownWords.has(w.word));
      if (candidates.length === 0) return state;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      return {
        ...state,
        revealedWords: [...state.revealedWords, pick],
        failedAttempts: 0,
      };
    }

    case 'SHUFFLE_TILES': {
      const shuffled = [...state.drawnTiles];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return { ...state, drawnTiles: shuffled };
    }

    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'RESET':
      return {
        ...initialState,
        drawSize: state.drawSize,
        activeLangs: state.activeLangs,
      };

    default:
      return state;
  }
}
