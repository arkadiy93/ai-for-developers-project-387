import { useCallback, useEffect, useState } from 'react';

export type LoadState<T> =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: T };

/**
 * Runs `load` on mount and whenever it changes, so callers memoize it with `useCallback`.
 * `load` resolves to the data, or to undefined on an error response.
 */
export function useLoad<T>(load: () => Promise<T | undefined>) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    load().then(
      (data) => {
        if (active) setState(data ? { status: 'ready', data } : { status: 'error' });
      },
      () => {
        if (active) setState({ status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [load, attempt]);

  // A retry after an error shows the placeholders again; a refresh of loaded data doesn't.
  const reload = useCallback(() => {
    setState((current) => (current.status === 'error' ? { status: 'loading' } : current));
    setAttempt((n) => n + 1);
  }, []);

  return { state, reload };
}
