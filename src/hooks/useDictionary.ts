import { useCallback, useEffect } from 'react';
import type { FoundWord, GameStats, Language } from '../types';
import { useDictionaryContext } from '../context/DictionaryContext';

type OnWordsFound = (words: FoundWord[], stats: GameStats) => void;

export function useDictionary(onWordsFound: OnWordsFound) {
  const { status, subscribe, postMessage } = useDictionaryContext();

  useEffect(() => {
    return subscribe('WORDS_FOUND', (data) => {
      const { words, stats } = data as { words: FoundWord[]; stats: GameStats; elapsed: number };
      onWordsFound(words, stats);
    });
  }, [subscribe, onWordsFound]);

  const findWords = useCallback(
    (regularLetters: string[], wildcards: number, langs: Language[]) => {
      postMessage({ type: 'FIND_WORDS', regularLetters, wildcards, langs });
    },
    [postMessage]
  );

  return { status, findWords };
}
