export type GamePhase = 'idle' | 'computing' | 'playing' | 'reviewing';
export type Language = 'en' | 'es';
export type WordLang = 'en' | 'es' | 'both';
export type WorkerStatus = 'loading' | 'ready';

export interface DrawnTile {
  id: string;
  letter: string; // 'A'-'Z' | 'Ñ' | '?' for wildcards
  isWildcard: boolean;
}

export interface FoundWord {
  word: string;   // uppercase
  lang: WordLang;
  length: number;
}

export interface LengthStat {
  en: number;
  es: number;
  both: number;
  total: number;
}

export interface GameStats {
  totalEn: number;
  totalEs: number;
  totalBoth: number;
  total: number;
  byLength: Record<number, LengthStat>;
}

export interface GameState {
  phase: GamePhase;
  drawSize: 5 | 7 | 8;
  activeLangs: Language[];
  drawnTiles: DrawnTile[];
  selectedTileIds: string[];
  wildcardAssignments: Record<string, string>; // tileId → letter
  allValidWords: FoundWord[];
  foundWords: FoundWord[];
  revealedWords: FoundWord[];
  failedAttempts: number;
  stats: GameStats | null;
}
