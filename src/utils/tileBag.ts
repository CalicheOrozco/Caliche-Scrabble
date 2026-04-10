import { buildBag } from '../constants/tiles';
import type { DrawnTile } from '../types';

// Fisher-Yates shuffle in place
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function drawTiles(count: number): DrawnTile[] {
  const bag = shuffle(buildBag());
  return bag.slice(0, count).map((letter, i) => ({
    id: `tile-${Date.now()}-${i}`,
    letter,
    isWildcard: letter === '?',
  }));
}
