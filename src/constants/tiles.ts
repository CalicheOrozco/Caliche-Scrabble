export const TILE_DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 3, E: 15, F: 2, G: 2, H: 2, I: 8, J: 1,
  K: 1, L: 5, M: 3, N: 6, O: 6, P: 3, Q: 1, R: 6, S: 6, T: 6,
  U: 6, V: 2, W: 1, X: 1, Y: 1, Z: 1,
};

export const WILDCARD_COUNT = 2;

// All letters this app knows (26 standard + Ñ reachable via wildcard)
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ';

export function buildBag(): string[] {
  const bag: string[] = [];
  for (const [letter, count] of Object.entries(TILE_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) bag.push(letter);
  }
  for (let i = 0; i < WILDCARD_COUNT; i++) bag.push('?');
  return bag; // 100 regular + 2 wildcards = 102 tiles
}
