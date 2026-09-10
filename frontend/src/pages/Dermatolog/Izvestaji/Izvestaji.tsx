import { useEffect, useState } from "react";
import { getTermini } from "../../../api/termini";
import {
  dodajIzvestaj,
  getIzvestajZaTermin,
  obrisiIzvestaj,
  izmeniIzvestaj,
} from "../../../api/izvestaji";
import type { Termin, Izvestaj } from "../../../types";
import {
  otvoriIzvestajKaoPdf,
  sacuvajIzvestajKaoPdf,
} from "../../../utils/izvestajPdf";
import "./Izvestaji.css";

export default function IzvestajiStranica() {
  const [termini, setTermini] = useState<Termin[]>([]);
  const [izabraniTermin, setIzabraniTermin] = useState<Termin | null>(null);
  const [izvestajiPoTerminu, setIzvestajiPoTerminu] = useState<
    Record<number, Izvestaj>
  >({});
  const [ucitavanje, setUcitavanje] = useState(true);
  const [brisanje, setBrisanje] = useState(false);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [forma, setForma] = useState({
    dijagnoza: "",
    terapija: "",
    anamneza: "",
  });

  useEffect(() => {
    let ignore = false;

    const ucitaj = async () => {
      setUcitavanje(true);
      try {
        const res = await getTermini();
        const zavrseni = res.data
          .filter((t) => t.status === "ZAVRSENO")
          .sort(
            (a, b) =>
              new Date(b.datumVreme).getTime() -
              new Date(a.datumVreme).getTime(),
          );
        const rezultati = await Promise.all(
          zavrseni.map(async (termin) => {
            const izvestaj = await getIzvestajZaTermin(termin.id).catch(
              () => null,
            );
            return izvestaj ? ([termin.id, izvestaj.data] as const) : null;
          }),
        );
        if (!ignore) {
          setTermini(zavrseni);
          setIzvestajiPoTerminu(
            Object.fromEntries(
              rezultati.filter(
                (rezultat): rezultat is readonly [number, Izvestaj] =>
                  rezultat !== null,
              ),
            ),
          );
        }
      } catch {
        if (!ignore) setGreska("Greška pri učitavanju termina.");
      } finally {
        if (!ignore) setUcitavanje(false);
      }
    };

    ucitaj();
    return () => {
      ignore = true;
    };
  }, []);

  const handleIzaberiTermin = async (termin: Termin) => {
    setIzabraniTermin(termin);
    const izvestaj = izvestajiPoTerminu[termin.id];
    setForma({
      dijagnoza: izvestaj?.dijagnoza || "",
      terapija: izvestaj?.terapija || "",
      anamneza: izvestaj?.anamneza || "",
    });
    setPoruka("");
    setGreska("");
  };

  const handleUnos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!izabraniTermin) return;
    setGreska("");
    try {
      const postojeciIzvestaj = izvestajiPoTerminu[izabraniTermin.id];
      const res = postojeciIzvestaj
        ? await izmeniIzvestaj(postojeciIzvestaj.id, forma)
        : await dodajIzvestaj({ terminId: izabraniTermin.id, ...forma });
      setPoruka(
        postojeciIzvestaj
          ? "Izveštaj uspešno ažuriran."
          : "Izveštaj uspešno sačuvan.",
      );
      setIzvestajiPoTerminu({
        ...izvestajiPoTerminu,
        [izabraniTermin.id]: res.data,
      });
    } catch {
      setGreska("Greška pri čuvanju izveštaja.");
    }
  };

  const handleBrisanje = async () => {
    if (!izabraniTermin) return;
    const izvestaj = izvestajiPoTerminu[izabraniTermin.id];
    if (
      !izvestaj ||
      !window.confirm("Da li ste sigurni da želite da obrišete izveštaj?")
    ) {
      return;
    }
    setBrisanje(true);
    setGreska("");
    setPoruka("");
    try {
      await obrisiIzvestaj(izvestaj.id);
      const preostaliIzvestaji = { ...izvestajiPoTerminu };
      delete preostaliIzvestaji[izabraniTermin.id];
      setIzvestajiPoTerminu(preostaliIzvestaji);
      setForma({ dijagnoza: "", terapija: "", anamneza: "" });
      setPoruka("Izveštaj je uspešno obrisan.");
    } catch {
      setGreska("Greška pri brisanju izveštaja.");
    } finally {
      setBrisanje(false);
    }
  };

  return (
    <div className="izvestaji-page">
      <div className="izvestaji-header">
        <div>
          <p className="izvestaji-eyebrow">Medicinska dokumentacija</p>
          <h2>Izveštaji sa pregleda</h2>
          <p className="izvestaji-subtitle">
            Unesite nalaz za završen pregled i sačuvajte ga kao PDF.
          </p>
        </div>
      </div>

      {greska && <p className="izvestaji-error">{greska}</p>}

      <div className="izvestaji-layout">
        <section className="izvestaji-panel termini-panel">
          <div className="izvestaji-panel-heading">
            <div>
              <p className="izvestaji-kicker">Pregledi</p>
              <h3>Završeni termini</h3>
            </div>
            <span className="izvestaji-count">{termini.length}</span>
          </div>
          {ucitavanje ? (
            <p className="izvestaji-state">Učitavanje...</p>
          ) : termini.length === 0 ? (
            <p className="izvestaji-state">Nema završenih termina.</p>
          ) : (
            <ul className="termini-lista">
              {termini.map((t) => (
                <li
                  key={t.id}
                  onClick={() => handleIzaberiTermin(t)}
                  className={`termin-item ${izabraniTermin?.id === t.id ? "termin-item-active" : ""}`}
                >
                  <strong className="termin-pacijent">
                    {t.pacijent.ime} {t.pacijent.prezime}
                  </strong>
                  <span>{new Date(t.datumVreme).toLocaleString("sr-RS")}</span>
                  <span className="termin-usluga">{t.usluga.naziv}</span>
                  {izvestajiPoTerminu[t.id] && (
                    <button
                      type="button"
                      className="izvestaj-dokument-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        otvoriIzvestajKaoPdf(
                          izvestajiPoTerminu[t.id],
                          t.pacijent,
                          t,
                        );
                      }}
                    >
                      PDF dokument ·{" "}
                      {new Date(t.datumVreme).toLocaleDateString("sr-RS")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="izvestaji-panel izvestaj-editor">
          {izabraniTermin ? (
            <>
              <div className="izvestaji-panel-heading">
                <div>
                  <p className="izvestaji-kicker">
                    {izvestajiPoTerminu[izabraniTermin.id]
                      ? "Izmena zapisa"
                      : "Novi zapis"}
                  </p>
                  <h3>
                    Unos izveštaja — {izabraniTermin.pacijent.ime}{" "}
                    {izabraniTermin.pacijent.prezime}
                  </h3>
                </div>
              </div>
              {poruka && <p className="izvestaji-success">{poruka}</p>}
              <form onSubmit={handleUnos} className="izvestaj-form">
                <div className="izvestaj-field">
                  <label htmlFor="dijagnoza">Dijagnoza</label>
                  <textarea
                    id="dijagnoza"
                    value={forma.dijagnoza}
                    onChange={(e) =>
                      setForma({ ...forma, dijagnoza: e.target.value })
                    }
                    required
                    style={{ width: "100%", minHeight: 60, padding: 8 }}
                  />
                </div>
                <div className="izvestaj-field">
                  <label htmlFor="terapija">Terapija</label>
                  <textarea
                    id="terapija"
                    value={forma.terapija}
                    onChange={(e) =>
                      setForma({ ...forma, terapija: e.target.value })
                    }
                  />
                </div>
                <div className="izvestaj-field">
                  <label htmlFor="anamneza">Anamneza</label>
                  <textarea
                    id="anamneza"
                    value={forma.anamneza}
                    onChange={(e) =>
                      setForma({ ...forma, anamneza: e.target.value })
                    }
                  />
                </div>
                <div className="izvestaj-form-footer">
                  <button
                    type="submit"
                    className="izvestaj-primary-button"
                    disabled={brisanje}
                  >
                    {izvestajiPoTerminu[izabraniTermin.id]
                      ? "Ažuriraj izveštaj"
                      : "Sačuvaj izveštaj"}
                  </button>
                  {izvestajiPoTerminu[izabraniTermin.id] && (
                    <>
                      <button
                        type="button"
                        className="izvestaj-delete-button"
                        onClick={handleBrisanje}
                        disabled={brisanje}
                      >
                        {brisanje ? "Brisanje..." : "Obriši izveštaj"}
                      </button>
                      <button
                        type="button"
                        className="izvestaj-pdf-button"
                        onClick={() =>
                          sacuvajIzvestajKaoPdf(
                            izvestajiPoTerminu[izabraniTermin.id],
                            izabraniTermin.pacijent,
                            izabraniTermin,
                          )
                        }
                        disabled={brisanje}
                      >
                        Preuzmi PDF
                      </button>
                    </>
                  )}
                </div>
              </form>
            </>
          ) : (
            <div className="izvestaji-empty">
              <span className="izvestaji-empty-icon">+</span>
              <h3>Izaberite termin</h3>
              <p>
                Odaberite završeni termin sa leve strane da unesete izveštaj.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
