import http from "./http";
import type { Izvestaj } from "../types";

export const dodajIzvestaj = (data: {
  terminId: number;
  dijagnoza: string;
  terapija?: string;
  anamneza?: string;
}) => http.post<Izvestaj>("/izvestaji", data);

export const getIzvestajZaTermin = (terminId: number) =>
  http.get<Izvestaj>(`/izvestaji/termin/${terminId}`);

export const getIzvestajiZaPacijenta = (pacijentId: number) =>
  http.get<Izvestaj[]>(`/izvestaji/pacijent/${pacijentId}`);
