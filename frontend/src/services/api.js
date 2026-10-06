import axios from 'axios';

const TOKEN_KEY = 'ef_token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY),
  set: (token, remember) => { tokenStore.clear(); (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token); },
  clear: () => { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); },
};

const api = axios.create({ baseURL: import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_URL || '/api'), timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    let message = error.response?.data?.message || (error.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Cannot reach the server. Check your connection.');
    // Blob error bodies need decoding to surface the server message.
    if (error.response?.data instanceof Blob && error.response.data.type.includes('json')) {
      try { message = JSON.parse(await error.response.data.text()).message || message; } catch { /* keep default */ }
    }
    const isAuthCall = /\/auth\/(login|register|forgot-password|reset-password)/.test(error.config?.url || '');
    if (error.response?.status === 401 && !isAuthCall) {
      tokenStore.clear();
      window.dispatchEvent(new Event('ef:unauthorized'));
    }
    return Promise.reject(Object.assign(new Error(message), { status: error.response?.status, details: error.response?.data?.details }));
  }
);

export const unwrap = (promise) => promise.then((res) => res.data);

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Strips empty values so query strings stay clean.
export const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && !v.length)));

export const endpoints = {
  auth: {
    register: (b) => unwrap(api.post('/auth/register', b)),
    login: (b) => unwrap(api.post('/auth/login', b)),
    logout: () => unwrap(api.post('/auth/logout')),
    me: () => unwrap(api.get('/auth/me')),
    forgot: (b) => unwrap(api.post('/auth/forgot-password', b)),
    reset: (b) => unwrap(api.post('/auth/reset-password', b)),
    changePassword: (b) => unwrap(api.put('/auth/change-password', b)),
  },
  users: {
    update: (b) => unwrap(api.put('/users/profile', b)),
    uploadAvatar: (file) => { const f = new FormData(); f.append('file', file); return unwrap(api.post('/users/profile-image', f)); },
    removeAvatar: () => unwrap(api.delete('/users/profile-image')),
    logoutAll: () => unwrap(api.post('/users/logout-all')),
  },
  list: (path, params) => unwrap(api.get(path, { params: clean(params) })),
  create: (path, body) => unwrap(api.post(path, body)),
  update: (path, body) => unwrap(api.put(path, body)),
  remove: (path) => unwrap(api.delete(path)),
  patch: (path) => unwrap(api.patch(path)),
  files: {
    upload: (file) => { const f = new FormData(); f.append('file', file); return unwrap(api.post('/files/upload', f)); },
    extract: (file) => { const f = new FormData(); f.append('file', file); return unwrap(api.post('/files/extract-pdf', f)); },
    importCsv: (file, confirm) => { const f = new FormData(); f.append('file', file); f.append('confirm', String(confirm)); return unwrap(api.post('/files/import-csv', f)); },
    blob: (path, params) => api.get(path, { params: clean(params), responseType: 'blob' }).then((r) => r.data),
  },
};
export default api;
