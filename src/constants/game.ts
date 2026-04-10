export const DRAW_SIZES = [5, 7, 8] as const;
export type DrawSize = (typeof DRAW_SIZES)[number];
export const DEFAULT_DRAW_SIZE = 7;
export const MIN_WORD_LENGTH = 2;
export const MAX_WORD_LENGTH = 15;
