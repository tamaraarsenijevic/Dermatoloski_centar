import http from "./http";
import type { Zaposleni } from "../types";

interface LoginResponse {
  zaposleni: Zaposleni;
}

export const login = (email: string, lozinka: string) =>
  http.post<LoginResponse>("/auth/login", { email, lozinka });

export const logout = () => http.post("/auth/logout");

export const getCurrentUser = () => http.get<LoginResponse>("/auth/me");
