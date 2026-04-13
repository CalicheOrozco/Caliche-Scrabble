import { useEffect, useMemo, useRef, useState } from 'react';

const CARD_OPTIONS = [5, 10, 15, 20, 25, 30];

type WordItem = { word: string; translate: string };
type ResultItem = { word: string; translate: string; userAnswer: string; isCorrect: boolean };

function normalizeAnswer(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function pickRandomUnique(items: WordItem[], count: number): WordItem[] {
  const safeCount = Math.min(count, items.length);
  const indices = new Set<number>();
  while (indices.size < safeCount) {
    indices.add(Math.floor(Math.random() * items.length));
  }
  return Array.from(indices).map((i) => items[i]);
}

export function SpanishRecall() {
  const [allItems, setAllItems] = useState<WordItem[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedCount, setSelectedCount] = useState(10);
  const [roundItems, setRoundItems] = useState<WordItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const speakingRef = useRef<number | null>(null);

  useEffect(() => {
    fetch('/words_translated.json')
      .then((r) => r.json())
      .then((data: unknown) => {
        const cleaned = Array.isArray(data)
          ? (data as Record<string, unknown>[])
              .filter((x) => x && typeof x === 'object')
              .map((x) => ({
                word: String(x.word || '').trim(),
                translate: String(x.translate || '').trim(),
              }))
              .filter((x) => x.word && x.translate)
          : [];
        setAllItems(cleaned);
      });
  }, []);

  const totalCards = roundItems.length;

  const currentCard = useMemo(() => {
    if (!isStarted || isFinished) return null;
    if (currentIndex < 0 || currentIndex >= roundItems.length) return null;
    return roundItems[currentIndex];
  }, [isStarted, isFinished, currentIndex, roundItems]);

  const startRound = () => {
    setRoundItems(pickRandomUnique(allItems, selectedCount));
    setCurrentIndex(0);
    setCurrentInput('');
    setResults([]);
    setIsFinished(false);
    setIsStarted(true);
  };

  const recordAndAdvance = (advanceType: 'next' | 'submit') => {
    if (!currentCard) return;
    const isCorrect = normalizeAnswer(currentCard.translate) === normalizeAnswer(currentInput);
    setResults((prev) => [
      ...prev,
      { word: currentCard.word, translate: currentCard.translate, userAnswer: currentInput, isCorrect },
    ]);
    setCurrentInput('');
    if (advanceType === 'submit' || currentIndex === totalCards - 1) {
      setIsFinished(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
  };

  const correctCount = useMemo(() => results.filter((r) => r.isCorrect).length, [results]);
  const scorePercent = useMemo(
    () => (results.length ? Math.round((correctCount / results.length) * 100) : 0),
    [results.length, correctCount]
  );

  const reset = () => {
    setIsStarted(false);
    setIsFinished(false);
    setRoundItems([]);
    setCurrentIndex(0);
    setCurrentInput('');
    setResults([]);
  };

  const repeatSameWords = () => {
    if (!roundItems.length) return;
    setCurrentIndex(0);
    setCurrentInput('');
    setResults([]);
    setIsFinished(false);
    setIsStarted(true);
  };

  // ── Start screen ──────────────────────────────────────────────────────────
  if (!isStarted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Spanish Recall</h2>
          <p className="text-slate-400 text-sm mt-2">
            You will see the Spanish word. Type its English translation.
          </p>
        </div>

        <div className="flex items-center gap-3 text-slate-300">
          <span className="text-sm">Cards:</span>
          <select
            className="bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
            value={selectedCount}
            onChange={(e) => setSelectedCount(parseInt(e.target.value, 10))}
          >
            {CARD_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <p className="text-slate-500 text-sm">
          {allItems.length > 0
            ? `${allItems.length.toLocaleString()} words loaded`
            : 'Loading words…'}
        </p>

        <button
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-3 px-10 rounded-xl transition-colors"
          onClick={startRound}
          disabled={allItems.length === 0}
        >
          Start
        </button>
      </div>
    );
  }

  // ── Results screen ────────────────────────────────────────────────────────
  if (isFinished) {
    return (
      <div className="flex-1 flex flex-col items-center gap-6 px-4 py-10 max-w-2xl mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Results</h2>
          <p className="text-slate-400 mt-1">
            Score:{' '}
            <span className="text-white font-bold text-lg">{scorePercent}%</span>
            {' · '}
            <span className="text-emerald-400 font-semibold">{correctCount} correct</span>
            {' · '}
            <span className="text-red-400 font-semibold">{results.length - correctCount} incorrect</span>
          </p>
        </div>

        <div className="w-full space-y-3">
          {results.map((r, idx) => (
            <div
              key={`${r.word}-${idx}`}
              className={`rounded-xl border p-4 ${
                r.isCorrect
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-300 font-semibold">
                  {idx + 1}. <span className="text-white">{r.word}</span>
                </span>
                <span className={r.isCorrect ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {r.isCorrect ? '✓' : '✕'}
                </span>
              </div>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                <span className="text-slate-400 flex-1">
                  Your answer:{' '}
                  <span className="text-slate-200 font-semibold">
                    {r.userAnswer.trim() || '(empty)'}
                  </span>
                </span>
                <span className="text-slate-400 flex-1">
                  Correct:{' '}
                  <span className="text-slate-200 font-semibold">{r.translate}</span>
                </span>
                <button
                  title={`Pronunciar "${r.translate}"`}
                  onClick={() => {
                    if (speakingRef.current === idx) {
                      window.speechSynthesis.cancel();
                      setSpeakingIdx(null);
                      speakingRef.current = null;
                      return;
                    }
                    speakingRef.current = idx;
                    setSpeakingIdx(idx);
                    if (!window.speechSynthesis) return;
                    window.speechSynthesis.cancel();
                    const utter = new SpeechSynthesisUtterance(r.translate);
                    utter.lang = 'en-US';
                    utter.rate = 0.9;
                    utter.onend = () => {
                      setSpeakingIdx(null);
                      speakingRef.current = null;
                    };
                    window.speechSynthesis.speak(utter);
                  }}
                  className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                    speakingIdx === idx
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {speakingIdx === idx ? '■' : '▶'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <button
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
            onClick={reset}
          >
            New round
          </button>
          <button
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-2 px-6 rounded-xl transition-colors disabled:opacity-40"
            onClick={repeatSameWords}
            disabled={!roundItems.length}
          >
            Repeat same words
          </button>
        </div>
      </div>
    );
  }

  // ── Card screen ───────────────────────────────────────────────────────────
  const shownNumber = currentIndex + 1;
  const remaining = totalCards - shownNumber;
  const isLast = currentIndex === totalCards - 1;

  return (
    <div className="flex-1 flex flex-col items-center gap-6 px-4 py-10 max-w-xl mx-auto w-full">
      <div className="w-full flex justify-between items-center text-sm text-slate-400">
        <span>
          Card <span className="text-slate-200 font-semibold">{shownNumber}</span> of {totalCards}
        </span>
        <span>{remaining} remaining</span>
      </div>

      <div className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
        <p className="text-slate-400 text-sm uppercase tracking-widest font-semibold">
          Spanish
        </p>
        <p className="text-4xl sm:text-5xl font-extrabold text-slate-100">
          {currentCard?.word}
        </p>

        <div className="w-full mt-4">
          <input
            type="text"
            className="w-full text-center text-2xl bg-slate-900 border border-slate-600 focus:border-indigo-500 focus:outline-none rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 transition-colors"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            placeholder="Type in English…"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                recordAndAdvance(isLast ? 'submit' : 'next');
              }
            }}
          />
          <p className="text-slate-600 text-xs mt-2">Enter para continuar</p>
        </div>
      </div>

      <button
        className={`font-semibold py-3 px-10 rounded-xl transition-colors text-white ${
          isLast
            ? 'bg-emerald-700 hover:bg-emerald-600'
            : 'bg-indigo-600 hover:bg-indigo-500'
        }`}
        onClick={() => recordAndAdvance(isLast ? 'submit' : 'next')}
      >
        {isLast ? 'Submit' : 'Next'}
      </button>
    </div>
  );
}
