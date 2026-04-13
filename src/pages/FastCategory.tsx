import { useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category { name: string; emoji: string; prompt: string }
type CategoryBank = Record<'easy' | 'medium' | 'advanced', Category[]>

// ── Config ────────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'advanced';
type Phase = 'start' | 'ready' | 'recording' | 'review' | 'results';

const ROUNDS_PER_GAME = 5;

const DIFF_CONFIG: Record<Difficulty, { timeLimit: number; label: string }> = {
  easy:     { timeLimit: 30, label: 'Easy' },
  medium:   { timeLimit: 20, label: 'Medium' },
  advanced: { timeLimit: 15, label: 'Advanced' },
};

const STORAGE_KEY = 'fast_category_voice_best';

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
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

function pickAudioMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  if (typeof MediaRecorder.isTypeSupported !== 'function') return null;

  const candidates = [
    // Safari prefers MP4/AAC when available.
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',

    // Chromium/Firefox.
    'audio/webm;codecs=opus',
    'audio/webm',

    // Legacy / fallbacks.
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];

  for (const mimeType of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
    } catch {
      // Some browsers throw on malformed strings; keep probing.
    }
  }

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FastCategory() {
  const [bank, setBank]               = useState<CategoryBank | null>(null);
  const [difficulty, setDifficulty]   = useState<Difficulty>('easy');
  const [phase, setPhase]             = useState<Phase>('start');
  const [queue, setQueue]             = useState<Category[]>([]);
  const [roundIndex, setRoundIndex]   = useState(0);
  const [scores, setScores]           = useState<number[]>([]);
  const [selfScore, setSelfScore]     = useState(0);
  const [timeLeft, setTimeLeft]       = useState(30);
  const [audioUrl, setAudioUrl]       = useState<string | null>(null);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [micError, setMicError]       = useState<string | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [bestScores, setBestScores]   = useState<Record<Difficulty, number>>(loadBest);

  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const streamRef    = useRef<MediaStream | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const audioBlobRef = useRef<string | null>(null);

  // Load categories from JSON
  useEffect(() => {
    fetch('/fast_categories.json')
      .then((r) => r.json())
      .then((data: CategoryBank) => setBank(data))
      .catch(() => setBank({ easy: [], medium: [], advanced: [] }));
  }, []);

  const stopTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  useEffect(() => () => {
    stopTimer();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioBlobRef.current) URL.revokeObjectURL(audioBlobRef.current);
  }, []);

  const currentCategory = queue[roundIndex] ?? null;
  const cfg = DIFF_CONFIG[difficulty];

  // ── Start game ──────────────────────────────────────────────────────────────
  const startGame = () => {
    if (!bank) return;
    const picked = shuffle(bank[difficulty]).slice(0, ROUNDS_PER_GAME);
    setQueue(picked);
    setRoundIndex(0);
    setScores([]);
    setSelfScore(0);
    setAudioUrl(null);
    setMicError(null);
    setIsNewRecord(false);
    setPhase('ready');
  };

  // ── Start recording ─────────────────────────────────────────────────────────
  const startRecording = async () => {
    setMicError(null);
    if (audioBlobRef.current) {
      URL.revokeObjectURL(audioBlobRef.current);
      audioBlobRef.current = null;
    }
    setAudioUrl(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const recordedType = recorder.mimeType || mimeType || chunksRef.current[0]?.type || '';
        const blob = recordedType
          ? new Blob(chunksRef.current, { type: recordedType })
          : new Blob(chunksRef.current);
        const url = URL.createObjectURL(blob);
        audioBlobRef.current = url;
        setAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setSelfScore(0);
        setPhase('review');
      };

      recorder.start(100);
      setTimeLeft(cfg.timeLimit);
      setPhase('recording');

      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { stopTimer(); recorder.stop(); return 0; }
          return t - 1;
        });
      }, 1000);

    } catch {
      setMicError('Microphone access denied. Please allow microphone access and try again.');
    }
  };

  const stopRecordingEarly = () => { stopTimer(); recorderRef.current?.stop(); };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else {
      audioRef.current.play().catch((err) => {
        // Avoid noisy Unhandled Promise Rejection in Safari.
        console.warn('Audio playback failed', err);
      });
    }
  };

  const submitRound = () => {
    const newScores = [...scores, selfScore];
    setScores(newScores);
    if (roundIndex + 1 >= ROUNDS_PER_GAME) {
      const total = newScores.reduce((a, b) => a + b, 0);
      const newRecord = saveBest(difficulty, total);
      setIsNewRecord(newRecord);
      setBestScores(loadBest());
      setPhase('results');
    } else {
      setRoundIndex((i) => i + 1);
      setAudioUrl(null);
      setSelfScore(0);
      setPhase('ready');
    }
  };

  const timerPct = (timeLeft / cfg.timeLimit) * 100;
  const totalScore = scores.reduce((a, b) => a + b, 0);
  const loaded = bank !== null && bank[difficulty].length > 0;

  // ── Start screen ──────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Fast Category</h2>
          <p className="text-slate-400 text-sm mt-2">
            Record yourself naming things from a category, listen back and count how many you got.
          </p>
          <p className="text-slate-500 text-xs mt-1">{ROUNDS_PER_GAME} rounds per game</p>
        </div>

        <div className="flex gap-2">
          {(['easy', 'medium', 'advanced'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
                difficulty === d
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {DIFF_CONFIG[d].label}
              <span className="block text-xs font-normal opacity-60 mt-0.5">
                {DIFF_CONFIG[d].timeLimit}s / round
              </span>
            </button>
          ))}
        </div>

        <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm space-y-2">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-3">Best total score</p>
          {(['easy', 'medium', 'advanced'] as Difficulty[]).map((d) => (
            <div key={d} className="flex justify-between">
              <span className="text-slate-400">{DIFF_CONFIG[d].label}</span>
              <span className="text-slate-200 font-semibold">
                {bestScores[d] > 0 ? `${bestScores[d]} words` : '—'}
              </span>
            </div>
          ))}
        </div>

        <button
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-3 px-12 rounded-xl transition-colors"
          onClick={startGame}
          disabled={!loaded}
        >
          {loaded ? 'Start' : 'Loading…'}
        </button>
      </div>
    );
  }

  // ── Results screen ────────────────────────────────────────────────────────
  if (phase === 'results') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100">Done!</h2>
          {isNewRecord && <p className="text-yellow-400 font-semibold mt-1">New personal best!</p>}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center w-full space-y-4">
          <p className="text-slate-400 text-sm">Total words</p>
          <p className="text-6xl font-extrabold text-white">{scores.reduce((a, b) => a + b, 0)}</p>
          <div className="space-y-2 pt-2">
            {queue.map((cat, i) => (
              <div key={i} className="flex justify-between items-center text-sm px-2">
                <span className="text-slate-400">{cat.emoji} {cat.name}</span>
                <span className="text-white font-bold">{scores[i] ?? 0}</span>
              </div>
            ))}
          </div>
          {bestScores[difficulty] > 0 && (
            <p className="text-slate-400 text-sm pt-2">
              Best: <span className="text-slate-200 font-semibold">{bestScores[difficulty]} words</span>
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
            onClick={startGame}
          >
            Play again
          </button>
          <button
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
            onClick={() => setPhase('start')}
          >
            Change difficulty
          </button>
        </div>
      </div>
    );
  }

  // ── Ready screen ──────────────────────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-slate-400 text-sm">
          Round <span className="text-white font-bold">{roundIndex + 1}</span> of {ROUNDS_PER_GAME}
          {scores.length > 0 && <span className="ml-2 text-emerald-400">· {totalScore} so far</span>}
        </div>

        <div className="text-center">
          <p className="text-7xl">{currentCategory?.emoji}</p>
          <h3 className="text-3xl font-extrabold text-slate-100 mt-3">{currentCategory?.name}</h3>
          <p className="text-slate-400 mt-2 text-sm">{currentCategory?.prompt}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-400 text-center">
          You have <span className="text-white font-bold">{cfg.timeLimit} seconds</span> to record.
          Then listen back and count how many you said.
        </div>

        {micError && <p className="text-red-400 text-sm text-center">{micError}</p>}

        <button
          className="bg-red-500 hover:bg-red-400 text-white font-bold py-4 px-12 rounded-2xl text-lg transition-colors flex items-center gap-3"
          onClick={startRecording}
        >
          <span className="w-3 h-3 bg-white rounded-full" />
          Start Recording
        </button>
      </div>
    );
  }

  // ── Recording screen ──────────────────────────────────────────────────────
  if (phase === 'recording') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <p className="text-5xl">{currentCategory?.emoji}</p>
          <h3 className="text-2xl font-bold text-slate-100 mt-2">{currentCategory?.name}</h3>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute w-32 h-32 bg-red-500/20 rounded-full animate-ping" />
          <div className="absolute w-24 h-24 bg-red-500/30 rounded-full animate-pulse" />
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded-sm" />
          </div>
        </div>

        <p className={`text-6xl font-extrabold tabular-nums font-mono ${
          timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'
        }`}>
          {timeLeft}s
        </p>

        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden max-w-xs">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-red-500' : 'bg-red-400'}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>

        <button
          className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-8 rounded-xl transition-colors"
          onClick={stopRecordingEarly}
        >
          Stop early
        </button>
      </div>
    );
  }

  // ── Review screen ─────────────────────────────────────────────────────────
  if (phase === 'review') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-10 max-w-lg mx-auto w-full">
        <div className="text-center">
          <p className="text-5xl">{currentCategory?.emoji}</p>
          <h3 className="text-2xl font-bold text-slate-100 mt-2">{currentCategory?.name}</h3>
          <p className="text-slate-400 text-sm mt-1">Listen to your recording</p>
        </div>

        {audioUrl && (
          <div className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col items-center gap-4">
            <audio
              ref={audioRef}
              src={audioUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            <button
              onClick={togglePlay}
              className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center transition-colors"
            >
              <span className="text-white text-2xl font-bold ml-1">
                {isPlaying ? '⏸' : '▶'}
              </span>
            </button>
            <p className="text-slate-400 text-sm">{isPlaying ? 'Playing…' : 'Tap to play'}</p>
          </div>
        )}

        <div className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-center">
          <p className="text-slate-300 font-semibold mb-4">How many correct answers did you say?</p>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setSelfScore((s) => Math.max(0, s - 1))}
              className="w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded-full text-2xl font-bold text-slate-200 transition-colors"
            >−</button>
            <span className="text-5xl font-extrabold text-white w-16 text-center">{selfScore}</span>
            <button
              onClick={() => setSelfScore((s) => s + 1)}
              className="w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded-full text-2xl font-bold text-slate-200 transition-colors"
            >+</button>
          </div>
        </div>

        <button
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-12 rounded-xl transition-colors w-full"
          onClick={submitRound}
        >
          {roundIndex + 1 < ROUNDS_PER_GAME ? 'Next Round →' : 'See Results'}
        </button>
      </div>
    );
  }

  return null;
}
