import http from "./http";
import type { Zaposleni, Uloga } from "../types";

export const getZaposleni = () => http.get<Zaposleni[]>("/zaposleni");

export const dodajZaposlenog = (data: {
  ime: string;
  prezime: string;
  email: string;
  telefon: string;
  lozinka: string;
  uloga: Uloga;
}) => http.post<Zaposleni>("/zaposleni", data);

export const izmeniZaposlenog = (id: number, data: Partial<Zaposleni>) =>
  http.put<Zaposleni>(`/zaposleni/${id}`, data);

export const obrisiZaposlenog = (id: number, force = false) =>
  http.delete(`/zaposleni/${id}`, {
    params: force ? { force: true } : undefined,
  });
