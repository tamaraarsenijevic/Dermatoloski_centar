import http from "./http";
import type { Izvestaj } from "../types";

export const dodajIzvestaj = (data: {
  terminId: number;
  dijagnoza: string;
  terapija?: string;
  anamneza?: string;
}) => http.post<Izvestaj>("/izvestaji", data);

export const izmeniIzvestaj = (
  id: number,
  data: {
    dijagnoza: string;
    terapija?: string;
    anamneza?: string;
  },
) => http.put<Izvestaj>(`/izvestaji/${id}`, data);

export const obrisiIzvestaj = (id: number) =>
  http.delete<{ poruka: string }>(`/izvestaji/${id}`);

export const getIzvestajZaTermin = (terminId: number) =>
  http.get<Izvestaj>(`/izvestaji/termin/${terminId}`);

export const getIzvestajiZaPacijenta = (pacijentId: number) =>
  http.get<Izvestaj[]>(`/izvestaji/pacijent/${pacijentId}`);
