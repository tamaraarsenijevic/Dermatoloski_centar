import http from "./http";

interface MesecnaStatistika {
  brojTermina: number;
  brojZavrsenihTermina: number;
  brojIzvrsenihUsluga: number;
  ukupanPrihod: number;
  terminiPoUslugama: Array<{
    uslugaId: number;
    naziv: string;
    broj: number;
  }>;
}

export const getMesecnaStatistika = (mesec: number, godina: number) =>
  http.get<MesecnaStatistika>("/statistika/mesecna", {
    params: { mesec, godina },
  });
