import { useRef, useState } from 'react';
import type { FoundWord } from '../../types';
import { Badge } from '../ui/Badge';


function googleUrl(word: string, lang: FoundWord['lang']) {
  const query = lang === 'en'
    ? `${word} is a word?`
    : `${word} es una palabra?`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function groupByLengthAndLang(words: FoundWord[]) {
  const groups: Record<number, Record<string, FoundWord[]>> = {};
  for (const w of words) {
    if (!groups[w.length]) groups[w.length] = { en: [], es: [], both: [] };
    groups[w.length][w.lang].push(w);
  }
  return groups;
}

const LANG_LABEL: Record<string, string> = { en: 'EN', es: 'ES', both: 'EN+ES' };
const LANG_COLOR: Record<string, string> = {
  en: 'text-blue-400',
  es: 'text-orange-400',
  both: 'text-emerald-400',
};

interface FoundWordsListProps {
  foundWords: FoundWord[];
  revealedWords: FoundWord[];
}

function WordSection({
  words,
  revealed = false,
}: {
  words: FoundWord[];
  revealed?: boolean;
}) {
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  const speakingRef = useRef<string | null>(null);

  if (words.length === 0) return null;

  const groups = groupByLengthAndLang(words);
  const lengths = Object.keys(groups).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-2">
      {lengths.map((len) => {
        const byLang = groups[len];
        const langKeys = (['en', 'es', 'both'] as const).filter(
          (l) => byLang[l]?.length > 0
        );
        return (
          <div key={len}>
            <div className="text-slate-500 text-xs font-semibold mb-1">{len} letters</div>
            <div className="space-y-1">
              {langKeys.map((lang) => (
                <div key={lang} className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-xs font-bold w-10 shrink-0 ${LANG_COLOR[lang]}`}>
                    {LANG_LABEL[lang]}
                  </span>
                  {byLang[lang].sort((a, b) => a.word.localeCompare(b.word)).map((w) => (
                    <div key={w.word} className="flex items-center gap-0.5">
                      <a
                        href={googleUrl(w.word, w.lang)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors cursor-pointer ${
                          revealed
                            ? 'bg-rose-950/40 hover:bg-rose-950/60 border border-rose-500/20'
                            : 'bg-slate-700/60 hover:bg-slate-600/70'
                        }`}
                      >
                        <span
                          className={`font-bold text-sm uppercase ${
                            revealed ? 'text-rose-400/70 line-through' : 'text-emerald-300'
                          }`}
                        >
                          {w.word}
                        </span>
                        <Badge lang={w.lang} />
                      </a>
                      <button
                        title={`Pronounce "${w.word}"`}
                        onClick={() => {
                          if (speakingRef.current === w.word) {
                            window.speechSynthesis.cancel();
                            speakingRef.current = null;
                            setSpeakingWord(null);
                            return;
                          }
                          speakingRef.current = w.word;
                          setSpeakingWord(w.word);
                          if (!window.speechSynthesis) return;
                          window.speechSynthesis.cancel();
                          const utter = new SpeechSynthesisUtterance(w.word);
                          utter.lang = w.lang === 'es' ? 'es-ES' : 'en-US';
                          utter.rate = 0.85;
                          utter.onend = () => {
                            speakingRef.current = null;
                            setSpeakingWord(null);
                          };
                          window.speechSynthesis.speak(utter);
                        }}
                        className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors ${
                          speakingWord === w.word
                            ? 'bg-indigo-500 text-white'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {speakingWord === w.word ? '■' : '▶'}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FoundWordsList({ foundWords, revealedWords }: FoundWordsListProps) {
  if (foundWords.length === 0 && revealedWords.length === 0) return null;

  return (
    <div className="max-h-64 overflow-y-auto rounded-xl bg-slate-800/50 border border-slate-700 p-3 space-y-4">
      {foundWords.length > 0 && (
        <div>
          <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Found
          </h3>
          <WordSection words={foundWords} />
        </div>
      )}

      {revealedWords.length > 0 && (
        <div>
          <h3 className="text-rose-500/70 text-xs font-semibold uppercase tracking-wider mb-2">
            Revealed
          </h3>
          <WordSection words={revealedWords} revealed />
        </div>
      )}
    </div>
  );
}
