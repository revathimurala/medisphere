import { createContext, useCallback, useContext, useState } from "react";
import { api, setToken, getToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("medisphere_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(!!getToken() && !!user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (username, password, role) => {
    setLoading(true);
    setError(null);
    try {
      const { token, user: nextUser } = await api.login(username, password, role);
      setToken(token);
      localStorage.setItem("medisphere_user", JSON.stringify(nextUser));
      setUser(nextUser);
      setReady(true);
      return nextUser;
    } catch (e) {
      const msg = e.response?.data?.message || e.message || "Sign-in failed. Please verify your credentials.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const { token, user: nextUser } = await api.register(formData);
      setToken(token);
      localStorage.setItem("medisphere_user", JSON.stringify(nextUser));
      setUser(nextUser);
      setReady(true);
      return nextUser;
    } catch (e) {
      const msg = e.response?.data?.message || e.message || "Registration failed. Please try again.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem("medisphere_user");
    setUser(null);
    setReady(false);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, loading, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
