import http from "./http";
import type { Usluga } from "../types";

export const getUsluge = () => http.get<Usluga[]>("/usluge");

export const dodajUslugu = (data: {
  naziv: string;
  opis?: string;
  trajanjeMin?: number;
  cena: number;
  aktivan?: boolean;
}) => http.post<Usluga>("/usluge", data);

export const izmeniUslugu = (id: number, data: Partial<Usluga>) =>
  http.put<Usluga>(`/usluge/${id}`, data);

export const obrisiUslugu = (id: number) => http.delete(`/usluge/${id}`);
