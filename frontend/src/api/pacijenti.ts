import http from "./http";
import type { Pacijent } from "../types";

export const getPacijenti = (pretraga?: string) =>
  http.get<Pacijent[]>("/pacijenti", { params: { pretraga } });

export const getPacijentPoId = (id: number) =>
  http.get<Pacijent>(`/pacijenti/${id}`);

export const dodajPacijenta = (data: Omit<Pacijent, "id">) =>
  http.post<Pacijent>("/pacijenti", data);
