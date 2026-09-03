import { createContext, useCallback, useContext, useState } from "react";
import { api, setToken, getToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("medisphere_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [ready, setReady] = useState(!!getToken() && !!user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (username, role) => {
    setLoading(true);
    setError(null);
    try {
      const { token, user: nextUser } = await api.login(username, role);
      setToken(token);
      localStorage.setItem("medisphere_user", JSON.stringify(nextUser));
      setUser(nextUser);
      setReady(true);
      return nextUser;
    } catch (e) {
      setError(e.response?.data?.message || "Sign-in failed. Is the backend running?");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem("medisphere_user");
    setUser(null);
    setReady(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
