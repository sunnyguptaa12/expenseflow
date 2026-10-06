import { useEffect, useState } from 'react';
import { endpoints } from '../services/api.js';

// Private files need the Authorization header, so they are fetched as blobs and shown via object URLs.
export function useBlobUrl(path, params) {
  const [state, setState] = useState({ url: null, type: null, loading: Boolean(path), error: false });
  const key = path ? `${path}?${JSON.stringify(params || {})}` : null;

  useEffect(() => {
    if (!path) { setState({ url: null, type: null, loading: false, error: false }); return undefined; }
    let objectUrl; let cancelled = false;
    setState({ url: null, type: null, loading: true, error: false });
    endpoints.files.blob(path, params).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setState({ url: objectUrl, type: blob.type, loading: false, error: false });
    }).catch(() => !cancelled && setState({ url: null, type: null, loading: false, error: true }));
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}
