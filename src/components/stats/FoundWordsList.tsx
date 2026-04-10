import type { FoundWord } from '../../types';
import { Badge } from '../ui/Badge';

function googleUrl(word: string, lang: FoundWord['lang']) {
  const query = lang === 'en'
    ? `${word} is a word?`
    : `${word} es una palabra?`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

interface FoundWordsListProps {
  foundWords: FoundWord[];
  revealedWords: FoundWord[];
}

export function FoundWordsList({ foundWords, revealedWords }: FoundWordsListProps) {
  if (foundWords.length === 0 && revealedWords.length === 0) return null;

  const sortFn = (a: FoundWord, b: FoundWord) =>
    b.length - a.length || a.word.localeCompare(b.word);

  const sortedFound = [...foundWords].sort(sortFn);
  const sortedRevealed = [...revealedWords].sort(sortFn);

  return (
    <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-800/50 border border-slate-700 p-3 space-y-3">
      {sortedFound.length > 0 && (
        <div>
          <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Found
          </h3>
          <div className="flex flex-wrap gap-2">
            {sortedFound.map((w) => (
              <a
                key={w.word}
                href={googleUrl(w.word, w.lang)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-slate-700/60 hover:bg-slate-600/70 rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
              >
                <span className="text-emerald-300 font-bold text-sm uppercase">{w.word}</span>
                <Badge lang={w.lang} />
              </a>
            ))}
          </div>
        </div>
      )}

      {sortedRevealed.length > 0 && (
        <div>
          <h3 className="text-rose-500/70 text-xs font-semibold uppercase tracking-wider mb-2">
            Revealed
          </h3>
          <div className="flex flex-wrap gap-2">
            {sortedRevealed.map((w) => (
              <a
                key={w.word}
                href={googleUrl(w.word, w.lang)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-500/20 rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
              >
                <span className="text-rose-400/70 font-bold text-sm uppercase line-through">{w.word}</span>
                <Badge lang={w.lang} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
