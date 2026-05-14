"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

interface AuthCtx {
  token: string | null;
  setToken: (t: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({ token: null, setToken: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("sd_token");
    if (t) setTokenState(t);
  }, []);

  const setToken = (t: string | null) => {
    setTokenState(t);
    if (t) localStorage.setItem("sd_token", t);
    else localStorage.removeItem("sd_token");
  };

  const logout = () => setToken(null);

  return (
    <AuthContext.Provider value={{ token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
