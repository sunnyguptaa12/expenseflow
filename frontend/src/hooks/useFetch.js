import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

// Runs `fetcher` whenever `deps` change; ignores stale responses.
export function useFetch(fetcher, deps = [], { silent = false } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const counter = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    const id = ++counter.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      if (id === counter.current) setState({ data, loading: false, error: null });
    } catch (err) {
      if (id !== counter.current) return;
      setState((s) => ({ ...s, loading: false, error: err.message }));
      if (!silent) toast.error(err.message);
    }
  }, [silent]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);
  return { ...state, reload: run };
}
