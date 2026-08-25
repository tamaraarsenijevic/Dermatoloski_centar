import { jsPDF } from "jspdf";
import type { Izvestaj } from "../types";

type TerminInfo = {
  datumVreme: string;
  usluga?: { naziv: string };
};

const tekst = (vrednost?: string) => vrednost?.trim() || "-";

const napraviPdf = (
  izvestaj: Izvestaj,
  pacijent: { ime: string; prezime: string },
  termin?: TerminInfo,
) => {
  const pdf = new jsPDF();
  const datumIzvestaja = new Date(izvestaj.kreiranoAt).toLocaleString("sr-RS");
  const datumTermina = termin
    ? new Date(termin.datumVreme).toLocaleString("sr-RS")
    : "-";
  let y = 22;

  pdf.setFontSize(20);
  pdf.text("Izvestaj sa pregleda", 20, y);
  y += 12;
  pdf.setFontSize(14);
  pdf.text(`${pacijent.ime} ${pacijent.prezime}`, 20, y);
  y += 10;
  pdf.setFontSize(10);
  pdf.text(`Datum pregleda: ${datumTermina}`, 20, y);
  y += 6;
  pdf.text(`Usluga: ${termin?.usluga?.naziv || "-"}`, 20, y);
  y += 6;
  pdf.text(`Datum izvestaja: ${datumIzvestaja}`, 20, y);
  y += 14;

  const dodajSekciju = (naslov: string, sadrzaj?: string) => {
    pdf.setFontSize(12);
    pdf.text(naslov, 20, y);
    y += 7;
    pdf.setFontSize(10);
    const redovi = pdf.splitTextToSize(tekst(sadrzaj), 170);
    pdf.text(redovi, 20, y);
    y += redovi.length * 5 + 10;
  };

  dodajSekciju("Dijagnoza", izvestaj.dijagnoza);
  dodajSekciju("Anamneza", izvestaj.anamneza);
  dodajSekciju("Terapija", izvestaj.terapija);
  return pdf;
};

export function sacuvajIzvestajKaoPdf(
  izvestaj: Izvestaj,
  pacijent: { ime: string; prezime: string },
  termin?: TerminInfo,
) {
  napraviPdf(izvestaj, pacijent, termin).save(
    `izvestaj-${pacijent.ime}-${pacijent.prezime}.pdf`,
  );
  return true;
}

export function otvoriIzvestajKaoPdf(
  izvestaj: Izvestaj,
  pacijent: { ime: string; prezime: string },
  termin?: TerminInfo,
) {
  const url = napraviPdf(izvestaj, pacijent, termin).output("bloburl");
  window.open(url, "_blank", "noopener,noreferrer");
}
