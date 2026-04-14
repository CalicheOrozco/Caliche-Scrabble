import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDictionaryContext } from '../context/DictionaryContext';

// ── Types & Config ────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'advanced';
type Phase = 'start' | 'playing' | 'feedback' | 'finished';

interface WordBank {
  easy: string[];
  medium: string[];
  advanced: string[];
}

const DIFF_CONFIG: Record<Difficulty, {
  label: string;
  timeMs: number;
  roundCount: number;
  invalidRatio: number;
  hint: string;
}> = {
  easy:     { label: 'Easy',     timeMs: 4000, roundCount: 15, invalidRatio: 0.4,  hint: '4 s per word · common words' },
  medium:   { label: 'Medium',   timeMs: 3000, roundCount: 20, invalidRatio: 0.45, hint: '3 s per word · mid-frequency words' },
  advanced: { label: 'Advanced', timeMs: 2000, roundCount: 25, invalidRatio: 0.5,  hint: '2 s per word · rare words' },
};

const STORAGE_KEY = 'wordflash_best';

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadBest(): Record<Difficulty, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { easy: 0, medium: 0, advanced: 0 };
  } catch { return { easy: 0, medium: 0, advanced: 0 }; }
}

function saveBest(diff: Difficulty, score: number): boolean {
  const best = loadBest();
  if (score > best[diff]) {
    best[diff] = score;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
    return true;
  }
  return false;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Only actual Spanish Scrabble letters — no accents
const VOWELS = 'AEIOU';
const CONSONANTS = 'BCDFGHJKLMNÑPQRSTVWXYZ';

// Similar-consonant pairs for realistic mutations
const SIMILAR: Record<string, string> = {
  B:'V', V:'B', S:'Z', Z:'S', G:'J', J:'G',
  R:'L', L:'R', N:'M', M:'N', T:'D', D:'T',
  P:'B', K:'C', C:'K', F:'V',
};

function makeFake(validSet: Set<string>, word: string): string {
  const w = word.toUpperCase();

  const ops: Array<() => string | null> = [
    // swap two adjacent letters (very realistic)
    () => {
      if (w.length < 2) return null;
      const i = Math.floor(Math.random() * (w.length - 1));
      return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
    },
    // change one vowel to another vowel
    () => {
      const vi = [...w].map((c, i) => (VOWELS.includes(c) ? i : -1)).filter(i => i >= 0);
      if (!vi.length) return null;
      const i = vi[Math.floor(Math.random() * vi.length)];
      const others = VOWELS.replace(w[i], '');
      return w.slice(0, i) + others[Math.floor(Math.random() * others.length)] + w.slice(i + 1);
    },
    // change consonant to a similar-looking consonant
    () => {
      const ci = [...w].map((c, i) => (CONSONANTS.includes(c) && SIMILAR[c] ? i : -1)).filter(i => i >= 0);
      if (!ci.length) return null;
      const i = ci[Math.floor(Math.random() * ci.length)];
      return w.slice(0, i) + SIMILAR[w[i]] + w.slice(i + 1);
    },
    // remove one letter
    () => {
      if (w.length < 3) return null;
      const i = Math.floor(Math.random() * w.length);
      return w.slice(0, i) + w.slice(i + 1);
    },
    // double a letter
    () => {
      const i = Math.floor(Math.random() * w.length);
      return w.slice(0, i) + w[i] + w.slice(i);
    },
  ];

  for (let attempt = 0; attempt < 40; attempt++) {
    const op = ops[Math.floor(Math.random() * ops.length)];
    const result = op();
    if (result && result !== w && result.length >= 2 && !validSet.has(result)) return result;
  }
  // Fallback: double the first letter
  return w[0] + w;
}

interface RoundItem {
  word: string;
  isValid: boolean;
}

function buildRounds(pool: string[], count: number, invalidRatio: number): RoundItem[] {
  const validSet = new Set(pool);
  const words = shuffle(pool).slice(0, count);
  const invalidCount = Math.round(count * invalidRatio);

  const items: RoundItem[] = words.map((word, i) => {
    if (i < invalidCount) {
      return { word: makeFake(validSet, word), isValid: false };
    }
    return { word, isValid: true };
  });

  return shuffle(items);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WordFlash() {
  const { status: dictStatus, subscribe, postMessage } = useDictionaryContext();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [phase, setPhase]           = useState<Phase>('start');
  const [bank, setBank]             = useState<WordBank | null>(null);
  const [rounds, setRounds]         = useState<RoundItem[]>([]);
  const [index, setIndex]           = useState(0);
  const [score, setScore]           = useState(0);
  const [streak, setStreak]         = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [timerPct, setTimerPct]     = useState(100);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [bestScores, setBestScores] = useState<Record<Difficulty, number>>(loadBest);

  const [wordLang, setWordLang] = useState<Record<string, 'en' | 'es'>>({});

  const wordBoxRef = useRef<HTMLDivElement | null>(null);
  const wordRef = useRef<HTMLSpanElement | null>(null);
  const [fitScale, setFitScale] = useState(1);

  // Separate refs: countdownRef for the timer bar, answerRef for post-answer pause
  // They must NOT clear each other.
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCountdown = () => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  };
  const clearAnswer = () => {
    if (answerRef.current) { clearTimeout(answerRef.current); answerRef.current = null; }
  };

  useEffect(() => () => { clearCountdown(); clearAnswer(); }, []);

  useEffect(() => {
    return subscribe('WORD_CHECKED', (data) => {
      const word = String(data.word ?? '').toUpperCase();
      const inEn = Boolean(data.inEn);
      const inEs = Boolean(data.inEs);

      // Pick a single language for the query.
      const lang: 'en' | 'es' = inEs ? 'es' : inEn ? 'en' : 'es';
      setWordLang((prev) => (prev[word] ? prev : { ...prev, [word]: lang }));
    });
  }, [subscribe]);

  // Load word bank
  useEffect(() => {
    fetch('/special_words.json')
      .then(r => r.json())
      .then(setBank)
      .catch(() => setBank({ easy: [], medium: [], advanced: [] }));
  }, []);

  // Countdown timer — only runs while playing
  useEffect(() => {
    if (phase !== 'playing') return;
    const cfg = DIFF_CONFIG[difficulty];
    const startAt = Date.now();

    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - startAt;
      const remaining = cfg.timeMs - elapsed;
      if (remaining <= 0) {
        clearCountdown();
        // Time's up — counts as wrong
        setLastCorrect(false);
        setStreak(0);
        setTimerPct(0);
        setPhase('feedback');
      } else {
        setTimerPct((remaining / cfg.timeMs) * 100);
      }
    }, 50);

    return clearCountdown;
  }, [phase, difficulty]);

  // When feedback phase ends, advance to next word or finish
  useEffect(() => {
    if (phase !== 'feedback') return;

    answerRef.current = setTimeout(() => {
      setRounds(prev => {
        const nextIndex = index + 1;
        if (nextIndex >= prev.length) {
          setPhase('finished');
        } else {
          setIndex(nextIndex);
          setLastCorrect(null);
          setTimerPct(100);
          setPhase('playing');
        }
        return prev;
      });
    }, 700);

    return clearAnswer;
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save best on finish
  useEffect(() => {
    if (phase !== 'finished') return;
    setTimeout(() => {
      const newRecord = saveBest(difficulty, score);
      setIsNewRecord(newRecord);
      setBestScores(loadBest());
    }, 0);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'finished') return;
    if (dictStatus !== 'ready') return;

    const validWords = rounds
      .filter((r) => r.isValid)
      .map((r) => r.word.toUpperCase());

    for (const w of new Set(validWords)) {
      if (!wordLang[w]) postMessage({ type: 'CHECK_WORD', word: w });
    }
  }, [phase, dictStatus, rounds, wordLang, postMessage]);

  function googleUrl(word: string, lang: 'en' | 'es') {
    const query = lang === 'en' ? `${word} is a word?` : `${word} es una palabra?`;
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  function fallbackLang(word: string): 'en' | 'es' {
    if (word.includes('Ñ')) return 'es';
    return 'es';
  }

  const handleAnswer = (answer: 'valid' | 'invalid') => {
    if (phase !== 'playing') return;
    clearCountdown();
    const item = rounds[index];
    const correct = (answer === 'valid') === item.isValid;
    setScore(prev => prev + (correct ? 1 : 0));
    setStreak(prev => correct ? prev + 1 : 0);
    setLastCorrect(correct);
    setTimerPct(0);
    setPhase('feedback');
  };

  const startGame = () => {
    if (!bank) return;
    clearCountdown();
    clearAnswer();
    const cfg = DIFF_CONFIG[difficulty];
    const newRounds = buildRounds(bank[difficulty], cfg.roundCount, cfg.invalidRatio);
    setRounds(newRounds);
    setIndex(0);
    setScore(0);
    setStreak(0);
    setLastCorrect(null);
    setIsNewRecord(false);
    setTimerPct(100);
    setPhase('playing');
  };

  const cfg = DIFF_CONFIG[difficulty];
  const currentItem = rounds[index] ?? null;

  const currentWord = (currentItem?.word ?? '').toUpperCase();
  const wordLen = currentWord.length;
  const wordStyle: React.CSSProperties = {
    // Keep long words inside the card on mobile/tablet.
    fontSize: wordLen >= 13
      ? 'clamp(1.75rem, 7vw, 3rem)'
      : wordLen >= 10
        ? 'clamp(2rem, 8vw, 3.5rem)'
        : 'clamp(2.25rem, 9vw, 4rem)',
    letterSpacing: wordLen >= 13
      ? '0.10em'
      : wordLen >= 10
        ? '0.14em'
        : '0.20em',
  };

  useLayoutEffect(() => {
    if (phase === 'feedback') return;

    const update = () => {
      const box = wordBoxRef.current;
      const wordEl = wordRef.current;
      if (!box || !wordEl) return;

      // scrollWidth is the unscaled width of the word; clientWidth is available space.
      const available = box.clientWidth;
      const needed = wordEl.scrollWidth;
      if (!available || !needed) return;

      const nextScale = needed > available ? Math.max(0.5, available / needed) : 1;
      setFitScale(nextScale);
    };

    update();

    const box = wordBoxRef.current;
    if (!box || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => update());
    ro.observe(box);
    return () => ro.disconnect();
  }, [currentWord, phase, difficulty]);

  // ── Start screen ──────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Word Flash</h2>
          <p className="text-slate-400 text-sm mt-2">Is it a valid Scrabble word? Decide fast.</p>
        </div>

        <div className="flex gap-2">
          {(['easy', 'medium', 'advanced'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors text-center ${
                difficulty === d
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {DIFF_CONFIG[d].label}
              <span className="block text-xs font-normal opacity-70 mt-0.5">{DIFF_CONFIG[d].roundCount} words</span>
            </button>
          ))}
        </div>

        <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm space-y-1">
          <p className="text-slate-400 text-xs">{cfg.hint}</p>
          <p className="text-slate-500 text-xs">~{Math.round(cfg.invalidRatio * 100)}% of words are fake</p>
        </div>

        <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm space-y-2">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3">Best score</p>
          {(['easy', 'medium', 'advanced'] as Difficulty[]).map((d) => (
            <div key={d} className="flex justify-between">
              <span className="text-slate-400">{DIFF_CONFIG[d].label}</span>
              <span className="text-slate-200 font-semibold">
                {bestScores[d] > 0 ? `${bestScores[d]} / ${DIFF_CONFIG[d].roundCount}` : '—'}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={startGame}
          disabled={!bank}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-3 px-12 rounded-xl transition-colors"
        >
          {bank ? 'Start' : 'Loading…'}
        </button>
      </div>
    );
  }

  // ── Finished screen ───────────────────────────────────────────────────────
  if (phase === 'finished') {
    const pct = rounds.length > 0 ? Math.round((score / rounds.length) * 100) : 0;
    const validWords = rounds
      .filter((r) => r.isValid)
      .map((r) => r.word.toUpperCase());
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <div className="text-5xl mb-2">{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'}</div>
          <h2 className="text-3xl font-bold text-slate-100">Done!</h2>
          {isNewRecord && <p className="text-yellow-400 font-semibold mt-1">New personal best!</p>}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center w-full space-y-3">
          <p className="text-slate-400 text-sm">Correct answers</p>
          <p className="text-6xl font-extrabold text-white">{score}<span className="text-3xl text-slate-500">/{rounds.length}</span></p>
          <p className="text-2xl font-bold text-indigo-400">{pct}%</p>
          {bestScores[difficulty] > 0 && (
            <p className="text-slate-400 text-sm pt-2">
              Best: <span className="text-slate-200 font-semibold">{bestScores[difficulty]} / {rounds.length}</span>
            </p>
          )}
        </div>

        <div className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-slate-300 font-semibold">Valid words</p>
            <p className="text-slate-500 text-sm">{validWords.length}</p>
          </div>
          <div className="max-h-40 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {validWords.map((w, i) => (
                <a
                  key={`${w}-${i}`}
                  href={googleUrl(w, wordLang[w] ?? fallbackLang(w))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900/30 text-slate-200 text-sm font-semibold hover:bg-slate-900/50 transition-colors"
                  title="Search on Google"
                >
                  {w}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={startGame} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-xl transition-colors">
            Play again
          </button>
          <button onClick={() => setPhase('start')} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-xl transition-colors">
            Change difficulty
          </button>
        </div>
      </div>
    );
  }

  // ── Playing / Feedback screen ─────────────────────────────────────────────
  const feedbackBorder =
    lastCorrect === true  ? 'border-emerald-500 bg-emerald-500/10' :
    lastCorrect === false ? 'border-red-500 bg-red-500/10' :
                            'border-slate-700 bg-slate-800/40';

  return (
    <div className="flex-1 flex flex-col items-center gap-4 sm:gap-5 px-4 py-5 sm:py-6 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="w-full flex items-center justify-between text-sm">
        <span className="text-slate-400">
          <span className="text-white font-bold">{index + 1}</span>/{rounds.length}
        </span>
        {streak >= 3 && (
          <span className="text-amber-400 font-bold text-xs">🔥 ×{streak}</span>
        )}
        <span className="text-slate-400">
          <span className="text-white font-bold">{score}</span> correct
        </span>
      </div>

      {/* Timer bar */}
      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-none ${
            timerPct > 50 ? 'bg-indigo-500' : timerPct > 25 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Word card */}
      <div
        className={`w-full flex-1 flex flex-col items-center justify-center border-2 rounded-2xl transition-colors duration-150 overflow-hidden ${feedbackBorder}`}
        style={{ minHeight: '180px' }}
      >
        {phase === 'feedback' && lastCorrect !== null ? (
          <div className="text-center px-4">
            <p className={`text-5xl font-extrabold mb-2 ${lastCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
              {lastCorrect ? '✓' : '✗'}
            </p>
            {!lastCorrect && currentItem && (
              <p className="text-slate-400 text-sm mt-1">
                {currentItem.isValid
                  ? <><span className="text-emerald-300 font-semibold">{currentItem.word}</span> is valid</>
                  : <><span className="text-red-300 font-semibold">{currentItem.word}</span> is not valid</>
                }
              </p>
            )}
          </div>
        ) : (
          <div ref={wordBoxRef} className="w-full px-4 flex items-center justify-center">
            <span
              ref={wordRef}
              className="inline-block font-extrabold text-slate-100 text-center select-none leading-none whitespace-nowrap"
              style={{
                ...wordStyle,
                transform: `scale(${fitScale})`,
                transformOrigin: 'center',
              }}
            >
              {currentWord}
            </span>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="w-full grid grid-cols-2 gap-3">
        <button
          onPointerDown={(e) => { e.preventDefault(); handleAnswer('valid'); }}
          disabled={phase !== 'playing'}
          className="py-4 sm:py-5 bg-emerald-700/40 hover:bg-emerald-700/60 active:bg-emerald-700/80 border-2 border-emerald-600/50 disabled:opacity-40 text-emerald-300 font-extrabold text-lg sm:text-xl rounded-2xl transition-colors select-none"
        >
          ✓ Valid
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleAnswer('invalid'); }}
          disabled={phase !== 'playing'}
          className="py-4 sm:py-5 bg-red-700/40 hover:bg-red-700/60 active:bg-red-700/80 border-2 border-red-600/50 disabled:opacity-40 text-red-300 font-extrabold text-lg sm:text-xl rounded-2xl transition-colors select-none"
        >
          ✗ Invalid
        </button>
      </div>

      <button
        className="text-slate-600 hover:text-slate-400 text-xs"
        onClick={() => { clearCountdown(); clearAnswer(); setPhase('start'); }}
      >
        Quit
      </button>
    </div>
  );
}
