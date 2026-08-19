export type Uloga = "ADMIN" | "DERMATOLOG";
export type StatusTermina = "ZAKAZANO" | "OTKAZANO" | "ZAVRSENO";

export interface Zaposleni {
  id: number;
  ime: string;
  prezime: string;
  email: string;
  telefon: string;
  uloga: Uloga;
  aktivan: boolean;
}

export interface Pacijent {
  id: number;
  ime: string;
  prezime: string;
  jmbg: string;
  telefon?: string;
  email?: string;
  napomena?: string;
}

export interface Usluga {
  id: number;
  naziv: string;
  opis?: string;
  trajanjeMin: number;
  cena: number;
}

export interface Termin {
  id: number;
  datumVreme: string;
  status: StatusTermina;
  napomena?: string;
  dermatolog: { ime: string; prezime: string };
  pacijent: Pacijent;
  usluga: Usluga;
}

export interface Izvestaj {
  id: number;
  dijagnoza: string;
  terapija?: string;
  anamneza?: string;
  kreiranoAt: string;
  dermatolog: { ime: string; prezime: string };
}
