import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { Zaposleni } from "../types";
import {
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
} from "../api/auth";
import { AuthContext } from "./AuthContext.types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Zaposleni | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const proveriSesiju = async () => {
      try {
        const res = await getCurrentUser();
        if (isMounted) setUser(res.data.zaposleni);
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    proveriSesiju();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, lozinka: string) => {
    const res = await apiLogin(email, lozinka);
    setUser(res.data.zaposleni);
    setLoading(false);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
