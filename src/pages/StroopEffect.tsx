import { useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'advanced';
type Phase = 'start' | 'showing' | 'question' | 'feedback' | 'results';

const COLORS = [
  'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange',
  'Pink', 'Cyan', 'Lime', 'Brown', 'Gray', 'White','Black',
] as const;
type ColorName = (typeof COLORS)[number];

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const COLOR_HEX: Record<ColorName, string> = {
  Red:    '#ef4444',
  Blue:   '#3b82f6',
  Green:  '#22c55e',
  Yellow: '#facc15',
  Purple: '#a855f7',
  Orange: '#f97316',
  Pink:  '#ec4899',
  Cyan:  '#06b6d4',
  Lime:  '#84cc16',
  Brown: '#a16207',
  Gray:  '#6b7280',
  White: '#f1f5f9',
  Black: '#11181c',
  
};

interface CardData {
  word: string;           // always a color name
  textColor: ColorName;   // color of the word text
  bgColor: ColorName | null;
  number: number | null;        // advanced only: a digit shown alongside the word
  numberColor: ColorName | null; // advanced only: color of that digit
}

interface Question {
  text: string;
  answer: string;
  options: string[];
}

const DIFF_CONFIG: Record<Difficulty, {
  label: string; rounds: number; defaultShowTime: number; showTimes: number[]; hint: string;
}> = {
  easy:     { label: 'Easy',     rounds: 8,  defaultShowTime: 5, showTimes: [3, 5, 8], hint: 'Word & text color only, no background' },
  medium:   { label: 'Medium',   rounds: 8,  defaultShowTime: 4, showTimes: [2, 4, 6], hint: 'Word, text color & background color' },
  advanced: { label: 'Advanced', rounds: 10, defaultShowTime: 3, showTimes: [2, 3, 5], hint: 'Word + number on card, each with its own color' },
};

const STORAGE_KEY = 'stroop_best';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickExcluding<T>(arr: readonly T[], ...exclude: T[]): T {
  const pool = arr.filter((x) => !exclude.includes(x));
  return pickRandom(pool);
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

// ── Card & question generation ────────────────────────────────────────────────

function generateCard(diff: Difficulty): CardData {
  if (diff === 'easy') {
    const word = pickRandom(COLORS);
    const textColor = pickExcluding(COLORS, word);
    return { word, textColor, bgColor: null, number: null, numberColor: null };
  }
  if (diff === 'medium') {
    const word = pickRandom(COLORS);
    const textColor = pickExcluding(COLORS, word);
    const bgColor = pickExcluding(COLORS, word, textColor);
    return { word, textColor, bgColor, number: null, numberColor: null };
  }
  // advanced: word (color name) + a number, each with their own color
  const word = pickRandom(COLORS);
  const textColor = pickExcluding(COLORS, word);
  const bgColor = pickExcluding(COLORS, word, textColor);
  const number = pickRandom(NUMBERS);
  const numberColor = pickExcluding(COLORS, textColor, bgColor);
  return { word, textColor, bgColor, number, numberColor };
}

// Always fill wrong options with colors that appeared on the card first,
// so the user can't trivially eliminate options that "weren't shown".
function colorWrongOptions(answer: ColorName, shownColors: Set<ColorName>): string[] {
  const fromCard = shuffleArr([...shownColors].filter((c) => c !== answer));
  if (fromCard.length >= 2) return fromCard.slice(0, 2);
  // Pad with random unseen colors if not enough card colors available
  const unseen = shuffleArr(COLORS.filter((c) => c !== answer && !shownColors.has(c)));
  return [...fromCard, ...unseen].slice(0, 2);
}

function generateQuestion(card: CardData, diff: Difficulty): Question {
  const shownColors = new Set<ColorName>([card.textColor]);
  shownColors.add(card.word as ColorName);
  if (card.bgColor) shownColors.add(card.bgColor);
  if (card.numberColor) shownColors.add(card.numberColor);

  type QType = 'word' | 'textColor' | 'bgColor' | 'number' | 'numberColor' | 'notShown';
  let pool: QType[];
  if (diff === 'easy') {
    pool = ['word', 'textColor'];
  } else if (diff === 'medium') {
    pool = ['word', 'textColor', 'bgColor', 'notShown'];
  } else {
    pool = ['word', 'textColor', 'bgColor', 'number', 'numberColor', 'notShown'];
  }

  const qType = pickRandom(pool);
  let text = '';
  let answer = '';
  let wrongOptions: string[] = [];

  if (qType === 'word') {
    text = 'What was the word?';
    answer = card.word;
    wrongOptions = colorWrongOptions(card.word as ColorName, shownColors);
  } else if (qType === 'textColor') {
    text = 'What color was the word text?';
    answer = card.textColor;
    wrongOptions = colorWrongOptions(card.textColor, shownColors);
  } else if (qType === 'bgColor') {
    text = 'What was the background color?';
    answer = card.bgColor!;
    wrongOptions = colorWrongOptions(card.bgColor!, shownColors);
  } else if (qType === 'number') {
    text = 'What number was shown?';
    answer = String(card.number!);
    wrongOptions = shuffleArr(NUMBERS.filter((n) => n !== card.number!).map((n) => String(n))).slice(0, 2);
  } else if (qType === 'numberColor') {
    text = 'What color was the number?';
    answer = card.numberColor!;
    wrongOptions = colorWrongOptions(card.numberColor!, shownColors);
  } else {
    text = 'Which color was NOT shown?';
    const notShownColors = COLORS.filter((c) => !shownColors.has(c));
    answer = pickRandom(notShownColors);
    wrongOptions = shuffleArr([...shownColors]).slice(0, 2);
  }

  return { text, answer, options: shuffleArr([answer, ...wrongOptions]) };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StroopEffect() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [showTime, setShowTime]     = useState(DIFF_CONFIG.easy.defaultShowTime);
  const [phase, setPhase]           = useState<Phase>('start');
  const [round, setRound]           = useState(0);
  const [score, setScore]           = useState(0);
  const [card, setCard]             = useState<CardData | null>(null);
  const [question, setQuestion]     = useState<Question | null>(null);
  const [timeLeft, setTimeLeft]     = useState(0);
  const [lastCorrect, setLastCorrect]   = useState<boolean | null>(null);
  const [selectedOpt, setSelectedOpt]   = useState<string | null>(null);
  const [bestScores, setBestScores] = useState<Record<Difficulty, number>>(loadBest);
  const [isNewRecord, setIsNewRecord]   = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cfg = DIFF_CONFIG[difficulty];

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRound = (roundNum: number, diff: Difficulty, time: number) => {
    clearTimer();
    const newCard = generateCard(diff);
    setCard(newCard);
    setQuestion(null);
    setLastCorrect(null);
    setSelectedOpt(null);
    setRound(roundNum);
    setTimeLeft(time);
    setPhase('showing');

    let remaining = time;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearTimer();
        const q = generateQuestion(newCard, diff);
        setQuestion(q);
        setPhase('question');
        setTimeLeft(0);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
  };

  const handleStart = () => {
    setScore(0);
    setIsNewRecord(false);
    startRound(1, difficulty, showTime);
  };

  const handleAnswer = (option: string) => {
    if (!question || phase !== 'question') return;
    const correct = option === question.answer;
    setLastCorrect(correct);
    setSelectedOpt(option);
    const newScore = score + (correct ? 1 : 0);
    setScore(newScore);
    setPhase('feedback');

    const currentRound = round;
    const totalRounds = cfg.rounds;
    const currentDiff = difficulty;
    const currentTime = showTime;

    setTimeout(() => {
      if (currentRound >= totalRounds) {
        const newRecord = saveBest(currentDiff, newScore);
        setIsNewRecord(newRecord);
        setBestScores(loadBest());
        setPhase('results');
      } else {
        startRound(currentRound + 1, currentDiff, currentTime);
      }
    }, 900);
  };

  useEffect(() => () => clearTimer(), []);

  // ── Start screen ──────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-2">Stroop Effect</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            A card flashes briefly. Study it, then answer the question about what you saw.
          </p>
        </div>

        {/* Difficulty */}
        <div className="w-full space-y-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest text-center">Difficulty</p>
          <div className="flex gap-2">
            {(['easy', 'medium', 'advanced'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); setShowTime(DIFF_CONFIG[d].defaultShowTime); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  difficulty === d ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {DIFF_CONFIG[d].label}
              </button>
            ))}
          </div>
          <p className="text-slate-500 text-xs text-center">{cfg.hint}</p>
        </div>

        {/* Show time */}
        <div className="w-full space-y-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest text-center">Card display time</p>
          <div className="flex gap-2 justify-center">
            {cfg.showTimes.map((t) => (
              <button
                key={t}
                onClick={() => setShowTime(t)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  showTime === t ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>

        {bestScores[difficulty] > 0 && (
          <p className="text-slate-500 text-sm">
            Best: <span className="text-indigo-400 font-semibold">{bestScores[difficulty]}/{cfg.rounds}</span>
          </p>
        )}

        <button
          onClick={handleStart}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-2xl transition-colors"
        >
          Start
        </button>
      </div>
    );
  }

  // ── Showing phase ─────────────────────────────────────────────────────────
  if (phase === 'showing' && card) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between w-full">
          <span className="text-slate-400 text-sm">Round {round}/{cfg.rounds}</span>
          <span className="text-2xl font-bold text-indigo-400">{timeLeft}s</span>
        </div>

        <div
          className="relative w-full rounded-3xl flex items-center justify-center select-none"
          style={{
            backgroundColor: card.bgColor ? COLOR_HEX[card.bgColor] : '#1e293b',
            minHeight: '200px',
          }}
        >
          {/* Main word */}
          <span
            className="font-black leading-none"
            style={{ color: COLOR_HEX[card.textColor], fontSize: '4.5rem' }}
          >
            {card.word}
          </span>

          {/* Number (advanced only) — top-right corner with its own color */}
          {card.number !== null && card.numberColor !== null && (
            <span
              className="absolute top-4 right-5 font-black leading-none"
              style={{ color: COLOR_HEX[card.numberColor], fontSize: '2.5rem' }}
            >
              {card.number}
            </span>
          )}
        </div>

        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / showTime) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  // ── Question / Feedback phase ──────────────────────────────────────────────
  if ((phase === 'question' || phase === 'feedback') && question) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center space-y-1">
          <p className="text-slate-400 text-sm">Round {round}/{cfg.rounds} · Score {score}</p>
          <p className="text-2xl font-bold text-slate-100 leading-snug">{question.text}</p>
        </div>

        <div className="w-full flex flex-col gap-3">
          {question.options.map((opt) => {
            const isColor = (COLORS as readonly string[]).includes(opt);
            const isAnswer = opt === question.answer;
            const isSelected = opt === selectedOpt;

            let cls = 'w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 border-2 transition-colors ';
            if (phase === 'feedback') {
              if (isAnswer)        cls += 'bg-green-900/40 border-green-500 text-green-300';
              else if (isSelected) cls += 'bg-red-900/40 border-red-500 text-red-300';
              else                 cls += 'bg-slate-800/20 border-slate-700/50 text-slate-600';
            } else {
              cls += 'bg-slate-800/40 hover:bg-slate-700/60 active:bg-slate-700/80 border-slate-700 text-slate-100';
            }

            return (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={phase === 'feedback'}
                className={cls}
              >
                {isColor && (
                  <span
                    className="w-5 h-5 rounded-full shrink-0 border border-white/20"
                    style={{ backgroundColor: COLOR_HEX[opt as ColorName] }}
                  />
                )}
                {opt}
              </button>
            );
          })}
        </div>

        {phase === 'feedback' && lastCorrect !== null && (
          <p className={`text-xl font-bold ${lastCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {lastCorrect ? '✓ Correct!' : `✗ It was ${question.answer}`}
          </p>
        )}
      </div>
    );
  }

  // ── Results phase ─────────────────────────────────────────────────────────
  if (phase === 'results') {
    const pct = Math.round((score / cfg.rounds) * 100);
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center space-y-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Results</p>
          <p className="text-6xl font-black text-slate-100">
            {score}<span className="text-3xl text-slate-500">/{cfg.rounds}</span>
          </p>
          <p className="text-slate-400">{pct}% correct</p>
          {isNewRecord && <p className="text-indigo-400 font-semibold">New record!</p>}
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleStart}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-2xl transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={() => setPhase('start')}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl transition-colors"
          >
            Change Settings
          </button>
        </div>
      </div>
    );
  }

  return null;
}
