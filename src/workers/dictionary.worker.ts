import type { FoundWord, GameStats, Language, LengthStat } from '../types';

// Alphabet index: A=0..Z=25, Ñ=26
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ';
const ALPHA_LEN = ALPHABET.length; // 27
const CHAR_IDX = new Map<string, number>(
  [...ALPHABET].map((c, i) => [c, i])
);

function encodeWord(word: string): Uint8Array {
  const counts = new Uint8Array(ALPHA_LEN);
  for (let i = 0; i < word.length; i++) {
    const idx = CHAR_IDX.get(word[i]);
    if (idx !== undefined) counts[idx]++;
  }
  return counts;
}

// Indexed by length (2..15)
type WordBank = Record<number, string[]>;
type EncodedBank = Record<number, Uint8Array[]>;

let enWords: WordBank = {};
let esWords: WordBank = {};
let enEncoded: EncodedBank = {};
let esEncoded: EncodedBank = {};
let isReady = false;

function buildEncoded(words: WordBank): EncodedBank {
  const encoded: EncodedBank = {};
  for (const [lenStr, arr] of Object.entries(words)) {
    const len = Number(lenStr);
    encoded[len] = arr.map(encodeWord);
  }
  return encoded;
}

async function loadDictionaries() {
  self.postMessage({ type: 'LOADING' });
  try {
    const [enRes, esRes] = await Promise.all([
      fetch('/dicts/en.json'),
      fetch('/dicts/es.json'),
    ]);
    const [enRaw, esRaw] = await Promise.all([enRes.json(), esRes.json()]);
    enWords = enRaw as WordBank;
    esWords = esRaw as WordBank;
    // Convert string keys to number keys
    enWords = Object.fromEntries(Object.entries(enWords).map(([k, v]) => [Number(k), v]));
    esWords = Object.fromEntries(Object.entries(esWords).map(([k, v]) => [Number(k), v]));
    enEncoded = buildEncoded(enWords);
    esEncoded = buildEncoded(esWords);
    isReady = true;
    self.postMessage({ type: 'READY' });
  } catch (err) {
    self.postMessage({ type: 'ERROR', message: String(err) });
  }
}

function canForm(wordCounts: Uint8Array, tileCounts: Uint8Array, wildcards: number): boolean {
  let needed = 0;
  for (let i = 0; i < ALPHA_LEN; i++) {
    const shortage = wordCounts[i] - tileCounts[i];
    if (shortage > 0) {
      needed += shortage;
      if (needed > wildcards) return false;
    }
  }
  return true;
}

function findWords(
  regularLetters: string[],
  wildcards: number,
  langs: Language[]
): FoundWord[] {
  const maxLen = regularLetters.length + wildcards;
  const tileCounts = encodeWord(regularLetters.join(''));

  const enSet = new Set<string>();
  const esSet = new Set<string>();

  const useEn = langs.includes('en');
  const useEs = langs.includes('es');

  for (let len = 2; len <= maxLen; len++) {
    if (useEn && enWords[len]) {
      const encoded = enEncoded[len];
      const words = enWords[len];
      for (let i = 0; i < encoded.length; i++) {
        if (canForm(encoded[i], tileCounts, wildcards)) {
          enSet.add(words[i]);
        }
      }
    }
    if (useEs && esWords[len]) {
      const encoded = esEncoded[len];
      const words = esWords[len];
      for (let i = 0; i < encoded.length; i++) {
        if (canForm(encoded[i], tileCounts, wildcards)) {
          esSet.add(words[i]);
        }
      }
    }
  }

  const results: FoundWord[] = [];
  for (const word of enSet) {
    const inEs = esSet.has(word);
    results.push({ word, length: word.length, lang: inEs ? 'both' : 'en' });
    if (inEs) esSet.delete(word);
  }
  for (const word of esSet) {
    results.push({ word, length: word.length, lang: 'es' });
  }
  return results;
}

function computeStats(words: FoundWord[]): GameStats {
  let totalEn = 0, totalEs = 0, totalBoth = 0;
  const byLength: Record<number, LengthStat> = {};

  for (const w of words) {
    if (!byLength[w.length]) byLength[w.length] = { en: 0, es: 0, both: 0, total: 0 };
    const bucket = byLength[w.length];
    if (w.lang === 'en') { totalEn++; bucket.en++; }
    else if (w.lang === 'es') { totalEs++; bucket.es++; }
    else { totalBoth++; bucket.both++; }
    bucket.total++;
  }

  return {
    totalEn,
    totalEs,
    totalBoth,
    total: words.length,
    byLength,
  };
}

self.addEventListener('message', async (e: MessageEvent) => {
  const { type } = e.data;

  if (type === 'INIT') {
    await loadDictionaries();
    return;
  }

  if (type === 'CHECK_WORD') {
    if (!isReady) { self.postMessage({ type: 'NOT_READY' }); return; }
    const word = (e.data.word as string).trim().toUpperCase();
    const len = word.length;
    const inEn = !!(enWords[len] && enWords[len].includes(word));
    const inEs = !!(esWords[len] && esWords[len].includes(word));
    self.postMessage({ type: 'WORD_CHECKED', word, inEn, inEs });
    return;
  }

  if (type === 'FIND_WORDS') {
    if (!isReady) {
      self.postMessage({ type: 'NOT_READY' });
      return;
    }
    const t0 = performance.now();
    const { regularLetters, wildcards, langs } = e.data as {
      regularLetters: string[];
      wildcards: number;
      langs: Language[];
    };
    const words = findWords(regularLetters, wildcards, langs);
    const stats = computeStats(words);
    self.postMessage({
      type: 'WORDS_FOUND',
      words,
      stats,
      elapsed: Math.round(performance.now() - t0),
    });
  }
});
