import http from "./http";
import type { Termin } from "../types";

export const getTermini = () => http.get<Termin[]>("/termini");

export const zakaziTermin = (data: {
  datumVreme: string;
  pacijentId: number;
  dermatologId: number;
  uslugaId: number;
  napomena?: string;
}) => http.post<Termin>("/termini", data);

export const izmeniTermin = (id: number, data: Partial<Termin>) =>
  http.put<Termin>(`/termini/${id}`, data);

export const obrisiTermin = (id: number) => http.delete(`/termini/${id}`);
