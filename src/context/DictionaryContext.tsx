import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { WorkerStatus } from '../types';

type Handler = (data: Record<string, unknown>) => void;

interface DictionaryContextValue {
  status: WorkerStatus;
  subscribe: (type: string, handler: Handler) => () => void;
  postMessage: (msg: Record<string, unknown>) => void;
}

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

export function DictionaryProvider({ children }: { children: ReactNode }) {
  const workerRef = useRef<Worker | null>(null);
  const listenersRef = useRef<Map<string, Set<Handler>>>(new Map());
  const [status, setStatus] = useState<WorkerStatus>('loading');

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/dictionary.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { type } = e.data;
      if (type === 'READY') setStatus('ready');
      listenersRef.current.get(type)?.forEach((h) => h(e.data));
    };

    worker.postMessage({ type: 'INIT' });
    return () => { worker.terminate(); workerRef.current = null; };
  }, []);

  const subscribe = useCallback((type: string, handler: Handler) => {
    if (!listenersRef.current.has(type)) listenersRef.current.set(type, new Set());
    listenersRef.current.get(type)!.add(handler);
    return () => listenersRef.current.get(type)?.delete(handler);
  }, []);

  const postMessage = useCallback((msg: Record<string, unknown>) => {
    workerRef.current?.postMessage(msg);
  }, []);

  return (
    <DictionaryContext.Provider value={{ status, subscribe, postMessage }}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionaryContext() {
  const ctx = useContext(DictionaryContext);
  if (!ctx) throw new Error('useDictionaryContext must be used inside DictionaryProvider');
  return ctx;
}
