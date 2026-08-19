import http from "./http";

interface MesecnaStatistika {
  brojTermina: number;
  brojIzvrsenihUsluga: number;
  ukupanPrihod: number;
}

export const getMesecnaStatistika = (mesec: number, godina: number) =>
  http.get<MesecnaStatistika>("/statistika/mesecna", {
    params: { mesec, godina },
  });
