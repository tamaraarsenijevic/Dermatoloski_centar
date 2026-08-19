import { createContext } from "react";
import type { Zaposleni } from "../types";

export interface AuthContextType {
  user: Zaposleni | null;
  loading: boolean;
  login: (email: string, lozinka: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
