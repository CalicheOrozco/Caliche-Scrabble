import { useEffect, useRef, useState } from 'react';
import { useDictionaryContext } from '../context/DictionaryContext';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Badge';

type CheckResult = { word: string; inEn: boolean; inEs: boolean } | null;

function googleUrl(word: string, lang: 'en' | 'es') {
  const query = lang === 'en' ? `${word} is a word?` : `${word} es una palabra?`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function WordChecker() {
  const { status, subscribe, postMessage } = useDictionaryContext();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<CheckResult>(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribe('WORD_CHECKED', (data) => {
      setResult(data as CheckResult);
      setChecking(false);
    });
  }, [subscribe]);

  // Reset result when input changes
  useEffect(() => { setResult(null); }, [input]);

  const check = () => {
    const word = input.trim();
    if (!word || status !== 'ready') return;
    setChecking(true);
    setResult(null);
    postMessage({ type: 'CHECK_WORD', word });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') check();
  };

  const found = result && (result.inEn || result.inEs);
  const lang = result?.inEn && result?.inEs ? 'both' : result?.inEn ? 'en' : 'es';

  return (
    <div className="flex-1 flex flex-col items-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-100">Word Checker</h2>
        <p className="text-slate-400 text-sm mt-1">Type a word to check if it's valid in English or Spanish</p>
      </div>

      {/* Input */}
      <div className="w-full flex flex-col sm:flex-row gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setResult(null); }}
          onKeyDown={handleKey}
          placeholder="Type a word..."
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={status === 'loading'}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-lg font-bold uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 disabled:opacity-40 transition-colors"
        />
        <Button
          variant="primary"
          size="lg"
          disabled={!input.trim() || status !== 'ready' || checking}
          onPointerDown={(e) => { e.preventDefault(); check(); }}
          className="w-full sm:w-auto"
        >
          {checking ? <Spinner /> : 'Check'}
        </Button>
      </div>

      {/* Loading dictionaries */}
      {status === 'loading' && (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Spinner /> Loading dictionaries...
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="w-full">
          {found ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 flex flex-col items-center gap-4">
              <span className="text-4xl font-extrabold uppercase tracking-widest text-emerald-300">
                {result.word}
              </span>
              <p className="text-emerald-400 font-semibold text-lg">Valid word ✓</p>

              {/* Language buttons */}
              <div className="flex gap-3 flex-wrap justify-center">
                {result.inEn && (
                  <a
                    href={googleUrl(result.word, 'en')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 transition-colors font-semibold text-sm"
                  >
                    English ↗
                  </a>
                )}
                {result.inEs && (
                  <a
                    href={googleUrl(result.word, 'es')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600/20 border border-orange-500/40 text-orange-300 hover:bg-orange-600/30 transition-colors font-semibold text-sm"
                  >
                    Spanish ↗
                  </a>
                )}
              </div>

              {lang === 'both' && (
                <p className="text-slate-400 text-xs">Valid in both languages</p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 flex flex-col items-center gap-4">
              <span className="text-4xl font-extrabold uppercase tracking-widest text-slate-500">
                {result.word}
              </span>
              <p className="text-slate-400 font-semibold text-lg">Not found in either dictionary</p>
              <div className="flex gap-3 flex-wrap justify-center">
                <a
                  href={googleUrl(result.word, 'en')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 transition-colors text-sm"
                >
                  Search in English ↗
                </a>
                <a
                  href={googleUrl(result.word, 'es')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 transition-colors text-sm"
                >
                  Search in Spanish ↗
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
