import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPacijentPoId } from "../../api/pacijenti";
import { getTermini } from "../../api/termini";
import { getIzvestajiZaPacijenta } from "../../api/izvestaji";
import type { Izvestaj, Pacijent, Termin } from "../../types";
import { sacuvajIzvestajKaoPdf } from "../../utils/izvestajPdf";
import "./Pacijenti.css";

type IzvestajSaTerminInfo = Izvestaj & {
  termin?: {
    datumVreme: string;
    usluga?: {
      naziv: string;
    };
  };
};

const formatDatumIVreme = (vrednost: string) =>
  new Date(vrednost).toLocaleString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatStatus = (status: Termin["status"]) => {
  if (status === "ZAVRSENO") return "Završen";
  if (status === "OTKAZANO") return "Otkazan";
  return "Zakazan";
};

export default function PacijentDetalji() {
  const { id } = useParams();
  const pacijentId = Number(id);
  const ispravanPacijentId = Number.isFinite(pacijentId);

  const [pacijent, setPacijent] = useState<Pacijent | null>(null);
  const [termini, setTermini] = useState<Termin[]>([]);
  const [izvestaji, setIzvestaji] = useState<IzvestajSaTerminInfo[]>([]);
  const [ucitavanje, setUcitavanje] = useState(ispravanPacijentId);
  const [greska, setGreska] = useState("");

  useEffect(() => {
    if (!ispravanPacijentId) {
      return;
    }

    let ignore = false;

    const ucitajDetalje = async () => {
      setUcitavanje(true);
      setGreska("");
      try {
        const [pacijentRes, terminiRes, izvestajiRes] = await Promise.all([
          getPacijentPoId(pacijentId),
          getTermini(),
          getIzvestajiZaPacijenta(pacijentId),
        ]);

        if (ignore) return;

        setPacijent(pacijentRes.data);
        setTermini(
          terminiRes.data
            .filter((termin) => termin.pacijent.id === pacijentId)
            .sort(
              (a, b) =>
                new Date(b.datumVreme).getTime() -
                new Date(a.datumVreme).getTime(),
            ),
        );
        setIzvestaji(izvestajiRes.data as IzvestajSaTerminInfo[]);
      } catch {
        if (!ignore) {
          setGreska("Greška pri učitavanju detalja pacijenta.");
        }
      } finally {
        if (!ignore) {
          setUcitavanje(false);
        }
      }
    };

    ucitajDetalje();

    return () => {
      ignore = true;
    };
  }, [ispravanPacijentId, pacijentId]);

  const brojZavrsenihTermina = useMemo(
    () => termini.filter((termin) => termin.status === "ZAVRSENO").length,
    [termini],
  );

  if (!ispravanPacijentId) {
    return (
      <div className="pacijenti-page">
        <p className="pacijenti-error">Pacijent nije pronađen.</p>
        <Link to="/pacijenti" className="pacijenti-back-link">
          Nazad na listu pacijenata
        </Link>
      </div>
    );
  }

  if (ucitavanje) {
    return (
      <div className="pacijenti-page">
        <p className="pacijenti-state">Učitavanje detalja pacijenta...</p>
      </div>
    );
  }

  if (greska || !pacijent) {
    return (
      <div className="pacijenti-page">
        <p className="pacijenti-error">{greska || "Pacijent nije pronađen."}</p>
        <Link to="/pacijenti" className="pacijenti-back-link">
          Nazad na listu pacijenata
        </Link>
      </div>
    );
  }

  return (
    <div className="pacijenti-page pacijent-detalji-page">
      <div className="pacijent-detalji-header">
        <div>
          <p className="pacijenti-eyebrow">Profil pacijenta</p>
          <h2>
            {pacijent.ime} {pacijent.prezime}
          </h2>
          <p className="pacijenti-subtitle">
            Kompletna istorija termina, izveštaja i osnovnih podataka.
          </p>
        </div>
        <Link to="/pacijenti" className="pacijenti-back-link">
          Nazad na listu
        </Link>
      </div>

      <section className="pacijent-info-grid">
        <article className="pacijent-info-card">
          <h3>Osnovne informacije</h3>
          <dl>
            <div>
              <dt>JMBG</dt>
              <dd>{pacijent.jmbg}</dd>
            </div>
            <div>
              <dt>Telefon</dt>
              <dd>{pacijent.telefon || "-"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{pacijent.email || "-"}</dd>
            </div>
          </dl>
        </article>

        <article className="pacijent-info-card">
          <h3>Sažetak</h3>
          <dl>
            <div>
              <dt>Ukupno termina</dt>
              <dd>{termini.length}</dd>
            </div>
            <div>
              <dt>Završenih termina</dt>
              <dd>{brojZavrsenihTermina}</dd>
            </div>
            <div>
              <dt>Ukupno izveštaja</dt>
              <dd>{izvestaji.length}</dd>
            </div>
          </dl>
        </article>

        <article className="pacijent-info-card pacijent-info-card-wide">
          <h3>Napomena</h3>
          <p>{pacijent.napomena?.trim() || "Nema dodatne napomene."}</p>
        </article>
      </section>

      <section className="pacijent-sekcija">
        <h3>Svi termini</h3>
        {termini.length === 0 ? (
          <p className="pacijenti-state">Pacijent trenutno nema termina.</p>
        ) : (
          <div className="pacijenti-table-wrap">
            <table className="pacijenti-table pacijent-termini-table">
              <thead>
                <tr>
                  <th>Datum i vreme</th>
                  <th>Usluga</th>
                  <th>Status</th>
                  <th>Dermatolog</th>
                </tr>
              </thead>
              <tbody>
                {termini.map((termin) => (
                  <tr key={termin.id}>
                    <td>{formatDatumIVreme(termin.datumVreme)}</td>
                    <td>{termin.usluga.naziv}</td>
                    <td>
                      <span
                        className={`termin-status-badge termin-status-${termin.status.toLowerCase()}`}
                      >
                        {formatStatus(termin.status)}
                      </span>
                    </td>
                    <td>
                      {termin.dermatolog.ime} {termin.dermatolog.prezime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="pacijent-sekcija">
        <h3>Svi izveštaji</h3>
        {izvestaji.length === 0 ? (
          <p className="pacijenti-state">
            Za ovog pacijenta još nema izveštaja.
          </p>
        ) : (
          <div className="pacijent-izvestaji-lista">
            {izvestaji.map((izvestaj) => (
              <article className="pacijent-izvestaj-card" key={izvestaj.id}>
                <p className="pacijent-izvestaj-meta">
                  {formatDatumIVreme(izvestaj.kreiranoAt)} ·{" "}
                  {izvestaj.dermatolog.ime} {izvestaj.dermatolog.prezime}
                </p>
                {izvestaj.termin && (
                  <p className="pacijent-izvestaj-termin">
                    Termin: {formatDatumIVreme(izvestaj.termin.datumVreme)}
                    {izvestaj.termin.usluga?.naziv
                      ? ` · ${izvestaj.termin.usluga.naziv}`
                      : ""}
                  </p>
                )}
                <p>
                  <strong>Dijagnoza:</strong> {izvestaj.dijagnoza}
                </p>
                {izvestaj.anamneza && (
                  <p>
                    <strong>Anamneza:</strong> {izvestaj.anamneza}
                  </p>
                )}
                {izvestaj.terapija && (
                  <p>
                    <strong>Terapija:</strong> {izvestaj.terapija}
                  </p>
                )}
                <div className="pacijent-izvestaj-akcije">
                  <button
                    type="button"
                    className="pacijent-izvestaj-pdf-button"
                    onClick={() =>
                      sacuvajIzvestajKaoPdf(izvestaj, pacijent, izvestaj.termin)
                    }
                  >
                    Sačuvaj PDF
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
