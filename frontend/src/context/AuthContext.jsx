import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { endpoints, tokenStore } from '../services/api.js';
import { formatMoney, formatDate } from '../utils/format.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) return;
    endpoints.auth.me().then((res) => setUser(res.data.user)).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('ef:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ef:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await endpoints.auth.login(credentials);
    tokenStore.set(res.data.token, Boolean(credentials.remember));
    setUser(res.data.user);
  }, []);

  const register = useCallback(async (payload) => {
    const res = await endpoints.auth.register(payload);
    tokenStore.set(res.data.token, true);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    await endpoints.auth.logout().catch(() => {});
    tokenStore.clear();
    setUser(null);
  }, []);

  const clearSession = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  const value = useMemo(() => ({
    user, loading, login, register, logout, clearSession, setUser,
    money: (n, compact) => formatMoney(n, user?.currency, compact),
    date: (d) => formatDate(d, user?.dateFormat),
  }), [user, loading, login, register, logout, clearSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
