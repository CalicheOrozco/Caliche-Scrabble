# Caliche Scrabble

An anagram trainer built to sharpen your Scrabble skills. Draw random tiles from a real Scrabble bag, find every word you can form from them, and track your progress across English and Spanish dictionaries.

## How it works

**On startup**
A Web Worker (separate thread) loads both dictionaries into memory and encodes every word as a letter-count vector — e.g. "CASA" → `{A:2, C:1, S:1}`. This takes a few seconds once, then all lookups are instant.

**Drawing tiles**
A bag of 102 tiles is built using the exact Scrabble distribution, shuffled randomly, and the first N tiles are dealt. The tiles are sent to the Worker: *"what words can I form from these?"*

**Word search**
The Worker checks every word in both dictionaries (~800k total) against the available tiles. For each word it asks: *"do I have enough of each letter? If not, can I cover the gap with blanks?"* — runs in ~20ms without blocking the UI.

**Clicking letters**
State tracks the order you click. The current word is checked against a `Set` of all valid words for the current hand — O(1) lookup, instant. If valid, it's marked as found and the selection clears.

**Fail counter**
Every time you press Clear with 2+ letters selected that don't form a valid word, the counter goes up by 1. At 5 misses, a "Reveal 1 word" button appears.

```
Raw dictionaries (.txt)
      ↓  preprocess script (run once at build)
  public/dicts/en.json + es.json
      ↓  Web Worker (on app start)
  Words encoded as letter-count vectors
      ↓  canForm() checked for each word
  List of valid words for this hand
      ↓  validWordSet (Set<string>)
  Instant validation as you spell
```

## File map

| What it does | File |
|---|---|
| Tile distribution (the bag) | `src/constants/tiles.ts` |
| Build and shuffle the bag | `src/utils/tileBag.ts` |
| Encode words + anagram search algorithm | `src/workers/dictionary.worker.ts` |
| Preprocess raw dictionaries at build time | `scripts/preprocess-dicts.mjs` |
| All game state (reducer + actions) | `src/store/gameReducer.ts` |
| Wire Worker + state + bag together | `src/hooks/useGame.ts` |
| Web Worker lifecycle | `src/hooks/useDictionary.ts` |
| Tiles rendered on screen | `src/components/game/TileRack.tsx` + `Tile.tsx` |
| Word being spelled | `src/components/game/WordBuilder.tsx` |
| Stats, progress bar, reveal button | `src/components/stats/StatsPanel.tsx` |
| Found / revealed words list | `src/components/stats/FoundWordsList.tsx` |
| "See all words" modal | `src/components/stats/ReviewModal.tsx` |
| Blank tile letter picker | `src/components/game/WildcardPicker.tsx` |
| Entry point, everything wired | `src/App.tsx` |

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Web Worker (off-main-thread dictionary processing)

## Getting started

```bash
npm install
npm run dev
```

The preprocessing script runs automatically before build. To run it manually:

```bash
node scripts/preprocess-dicts.mjs
```
