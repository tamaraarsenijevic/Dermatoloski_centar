import { useEffect, useState } from "react";
import { getTermini } from "../../../api/termini";
import { getIzvestajZaTermin } from "../../../api/izvestaji";
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
  const [greska, setGreska] = useState("");

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
    setGreska("");
  };

  return (
    <div className="izvestaji-page">
      <div className="izvestaji-header">
        <div>
          <p className="izvestaji-eyebrow">Medicinska dokumentacija</p>
          <h2>Izveštaji sa pregleda</h2>
          <p className="izvestaji-subtitle">
            Pregledajte nalaze završenih pregleda i preuzmite ih kao PDF.
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
                  <p className="izvestaji-kicker">Pregled zapisa</p>
                  <h3>
                    Izveštaj — {izabraniTermin.pacijent.ime}{" "}
                    {izabraniTermin.pacijent.prezime}
                  </h3>
                </div>
              </div>
              {izvestajiPoTerminu[izabraniTermin.id] ? (
                <div className="izvestaj-form">
                  {(["dijagnoza", "terapija", "anamneza"] as const).map(
                    (polje) => (
                      <div className="izvestaj-field" key={polje}>
                        <span className="izvestaj-field-label">
                          {polje === "dijagnoza"
                            ? "Dijagnoza"
                            : polje === "terapija"
                              ? "Terapija"
                              : "Anamneza"}
                        </span>
                        <p className="izvestaj-readonly-value">
                          {izvestajiPoTerminu[izabraniTermin.id][polje] || "-"}
                        </p>
                      </div>
                    ),
                  )}
                  <div className="izvestaj-form-footer">
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
                    >
                      Preuzmi PDF
                    </button>
                  </div>
                </div>
              ) : (
                <p className="izvestaji-state">
                  Za ovaj termin nema sačuvanog izveštaja.
                </p>
              )}
            </>
          ) : (
            <div className="izvestaji-empty">
              <span className="izvestaji-empty-icon">i</span>
              <h3>Izaberite termin</h3>
              <p>
                Odaberite završeni termin sa leve strane da pregledate izveštaj.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
