import { useEffect, useState } from "react";
import { getMesecnaStatistika } from "../../../api/statistika";
import "./Statistika.css";

const naziviMeseci = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

export default function Statistika() {
  const danas = new Date();
  const [mesec, setMesec] = useState(danas.getMonth() + 1);
  const [godina, setGodina] = useState(danas.getFullYear());
  const [podaci, setPodaci] = useState<{
    brojTermina: number;
    brojZavrsenihTermina: number;
    brojIzvrsenihUsluga: number;
    ukupanPrihod: number;
    terminiPoUslugama: Array<{
      uslugaId: number;
      naziv: string;
      broj: number;
    }>;
  } | null>(null);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState("");

  useEffect(() => {
    let ignore = false;

    const ucitajStatistiku = async () => {
      setUcitavanje(true);
      setGreska("");
      try {
        const res = await getMesecnaStatistika(mesec, godina);
        if (!ignore) {
          setPodaci({
            ...res.data,
            brojZavrsenihTermina:
              res.data.brojZavrsenihTermina ?? res.data.brojIzvrsenihUsluga,
            terminiPoUslugama: res.data.terminiPoUslugama ?? [],
          });
        }
      } catch {
        if (!ignore) {
          setPodaci(null);
          setGreska("Greška pri učitavanju statistike.");
        }
      } finally {
        if (!ignore) setUcitavanje(false);
      }
    };

    void ucitajStatistiku();
    return () => {
      ignore = true;
    };
  }, [mesec, godina]);

  return (
    <div className="statistika-page">
      <header className="statistika-header">
        <div>
          <p className="statistika-eyebrow">Pregled poslovanja</p>
          <h2>Mesečna statistika</h2>
          <p className="statistika-subtitle">
            Pregled termina, izvršenih usluga i prihoda za izabrani period.
          </p>
        </div>
        <div className="statistika-filters" aria-label="Izbor perioda">
          <label>
            Mesec
            <select
              value={mesec}
              onChange={(e) => setMesec(Number(e.target.value))}
            >
              {naziviMeseci.map((naziv, index) => (
                <option value={index + 1} key={naziv}>
                  {naziv}
                </option>
              ))}
            </select>
          </label>
          <label>
            Godina
            <input
              type="number"
              min="2000"
              max="2100"
              value={godina}
              onChange={(e) => setGodina(Number(e.target.value))}
            />
          </label>
        </div>
      </header>

      {greska && <p className="statistika-error">{greska}</p>}
      {ucitavanje ? (
        <p className="statistika-state">Učitavanje statistike...</p>
      ) : podaci ? (
        <>
          <div className="statistika-grid">
            <article className="statistika-card">
              <span className="statistika-card-label">Zakazani termini</span>
              <strong>{podaci.brojTermina}</strong>
              <span className="statistika-card-note">ukupno u periodu</span>
            </article>
            <article className="statistika-card">
              <span className="statistika-card-label">Završeni termini</span>
              <strong>{podaci.brojZavrsenihTermina}</strong>
              <span className="statistika-card-note">
                termini sa statusom završeno
              </span>
            </article>
            <article className="statistika-card statistika-card-accent">
              <span className="statistika-card-label">Ukupan prihod</span>
              <strong>{podaci.ukupanPrihod.toLocaleString("sr-RS")} RSD</strong>
              <span className="statistika-card-note">ostvaren prihod</span>
            </article>
          </div>
          <section
            className="statistika-chart"
            aria-labelledby="statistika-chart-title"
          >
            <div className="statistika-chart-header">
              <div>
                <p className="statistika-eyebrow">Potražnja</p>
                <h3 id="statistika-chart-title">Zakazani termini po usluzi</h3>
              </div>
              <span className="statistika-chart-total">
                {podaci.brojTermina} ukupno
              </span>
            </div>
            {podaci.terminiPoUslugama.length === 0 ? (
              <p className="statistika-state">
                Nema zakazanih termina u izabranom periodu.
              </p>
            ) : (
              <div className="statistika-bars">
                {podaci.terminiPoUslugama.map((stavka) => {
                  const procenat = (stavka.broj / podaci.brojTermina) * 100;
                  return (
                    <div className="statistika-bar-row" key={stavka.uslugaId}>
                      <div className="statistika-bar-label">
                        <span>{stavka.naziv}</span>
                        <strong>{stavka.broj}</strong>
                      </div>
                      <div className="statistika-bar-track">
                        <div
                          className="statistika-bar-fill"
                          style={{ width: `${procenat}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
