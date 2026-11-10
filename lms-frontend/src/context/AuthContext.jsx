import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(tokenStore.get()));

  /* Restore the session on first paint: a stored JWT is only trusted after
     /auth/me confirms it still resolves to a live user. */
  useEffect(() => {
    let alive = true;
    const restore = async () => {
      if (!tokenStore.get()) {
        setBooting(false);
        return;
      }
      try {
        const res = await api.me();
        if (alive) setUser(res.data);
      } catch {
        tokenStore.clear();
      } finally {
        if (alive) setBooting(false);
      }
    };
    restore();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await api.login(credentials);
    tokenStore.set(res.token);
    setUser(res.data);
    return res.data;
  }, []);

  const register = useCallback(async (values) => {
    const res = await api.register(values);
    tokenStore.set(res.token);
    setUser(res.data);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      booting,
      isAuthenticated: Boolean(user),
      isStudent: user?.role === 'student',
      isInstructor: user?.role === 'instructor' || user?.role === 'admin',
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      setUser,
    }),
    [user, booting, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
