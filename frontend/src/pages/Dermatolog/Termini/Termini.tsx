import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getTermini, zakaziTermin } from "../../../api/termini";
import { getPacijenti } from "../../../api/pacijenti";
import { getUsluge } from "../../../api/usluge";
import type { Termin, Pacijent, Usluga } from "../../../types";
import { useAuth } from "../../../context/useAuth";
import "./Termini.css";

type PrikazRasporeda = "MESECNI" | "NEDELJNI" | "DNEVNI";

const POCETNI_SAT = 7;
const KRAJNJI_SAT = 21;
const PIXELA_PO_MINUTU = 1;

const nazivDanaKratko = ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"];
const nazivMeseci = [
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

const formatVreme = (datum: Date) =>
  `${String(datum.getHours()).padStart(2, "0")}:${String(
    datum.getMinutes(),
  ).padStart(2, "0")}`;

const formatDatumKratko = (datum: Date) =>
  `${String(datum.getDate()).padStart(2, "0")}.${String(
    datum.getMonth() + 1,
  ).padStart(2, "0")}.${datum.getFullYear()}`;

const getPocetakNedelje = (datum: Date) => {
  const kopija = new Date(datum);
  kopija.setHours(0, 0, 0, 0);
  const dan = kopija.getDay();
  const pomeraj = dan === 0 ? -6 : 1 - dan;
  kopija.setDate(kopija.getDate() + pomeraj);
  return kopija;
};

const isIstiDan = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dodajDane = (datum: Date, brojDana: number) => {
  const kopija = new Date(datum);
  kopija.setDate(kopija.getDate() + brojDana);
  return kopija;
};

const getTerminaInterval = (termin: Termin) => {
  const pocetak = new Date(termin.datumVreme);
  const trajanje = Math.max(termin.usluga.trajanjeMin || 30, 15);
  const kraj = new Date(pocetak.getTime() + trajanje * 60_000);
  return { pocetak, kraj, trajanje };
};

const getStatusClass = (status: Termin["status"]) => {
  if (status === "ZAVRSENO") return "termin-kartica-zavrseno";
  if (status === "OTKAZANO") return "termin-kartica-otkazano";
  return "termin-kartica-zakazano";
};

export default function Termini() {
  const [termini, setTermini] = useState<Termin[]>([]);
  const [pacijenti, setPacijenti] = useState<Pacijent[]>([]);
  const [usluge, setUsluge] = useState<Usluga[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState("");
  const [prikaziForm, setPrikaziForm] = useState(false);
  const [prikaz, setPrikaz] = useState<PrikazRasporeda>("NEDELJNI");
  const [fokusDatum, setFokusDatum] = useState(new Date());
  const { user } = useAuth();
  const navigate = useNavigate();

  const [novi, setNovi] = useState({
    datum: "",
    vreme: "",
    pacijentId: "",
    uslugaId: "",
    napomena: "",
  });

  const ucitajSve = async () => {
    setUcitavanje(true);
    try {
      const [terminiRes, pacijentiRes, uslugeRes] = await Promise.all([
        getTermini(),
        getPacijenti(),
        getUsluge(),
      ]);
      setTermini(terminiRes.data);
      setPacijenti(pacijentiRes.data);
      setUsluge(uslugeRes.data.filter((usluga) => usluga.aktivan !== false));
    } catch {
      setGreska("Greška pri učitavanju podataka.");
    } finally {
      setUcitavanje(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const ucitaj = async () => {
      setUcitavanje(true);
      try {
        const [terminiRes, pacijentiRes, uslugeRes] = await Promise.all([
          getTermini(),
          getPacijenti(),
          getUsluge(),
        ]);
        if (!ignore) {
          setTermini(terminiRes.data);
          setPacijenti(pacijentiRes.data);
          setUsluge(
            uslugeRes.data.filter((usluga) => usluga.aktivan !== false),
          );
        }
      } catch {
        if (!ignore) setGreska("Greška pri učitavanju podataka.");
      } finally {
        if (!ignore) setUcitavanje(false);
      }
    };

    ucitaj();
    return () => {
      ignore = true;
    };
  }, []);

  const handleZakazi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setGreska("");
    try {
      await zakaziTermin({
        datumVreme: `${novi.datum}T${novi.vreme}`,
        pacijentId: Number(novi.pacijentId),
        dermatologId: user.id,
        uslugaId: Number(novi.uslugaId),
        napomena: novi.napomena,
      });
      setNovi({
        datum: "",
        vreme: "",
        pacijentId: "",
        uslugaId: "",
        napomena: "",
      });
      setPrikaziForm(false);
      ucitajSve();
    } catch (error) {
      const poruka = axios.isAxiosError(error)
        ? error.response?.data?.greska
        : undefined;
      setGreska(poruka || "Greška pri zakazivanju termina.");
    }
  };

  const terminiSortirani = [...termini].sort(
    (a, b) =>
      new Date(a.datumVreme).getTime() - new Date(b.datumVreme).getTime(),
  );

  const nedeljaStart = getPocetakNedelje(fokusDatum);
  const daniNedelje = Array.from({ length: 7 }, (_, i) =>
    dodajDane(nedeljaStart, i),
  );
  const ukupnoMinutaPrikaza = (KRAJNJI_SAT - POCETNI_SAT) * 60;
  const visinaKalendara = ukupnoMinutaPrikaza * PIXELA_PO_MINUTU;

  const prikazNaslov =
    prikaz === "MESECNI"
      ? `${nazivMeseci[fokusDatum.getMonth()]} ${fokusDatum.getFullYear()}`
      : prikaz === "NEDELJNI"
        ? `${formatDatumKratko(daniNedelje[0])} - ${formatDatumKratko(daniNedelje[6])}`
        : formatDatumKratko(fokusDatum);

  const promeniPeriod = (smer: 1 | -1) => {
    const sledeci = new Date(fokusDatum);
    if (prikaz === "MESECNI") sledeci.setMonth(sledeci.getMonth() + smer);
    if (prikaz === "NEDELJNI") sledeci.setDate(sledeci.getDate() + 7 * smer);
    if (prikaz === "DNEVNI") sledeci.setDate(sledeci.getDate() + smer);
    setFokusDatum(sledeci);
  };

  const renderMesecniPrikaz = () => {
    const prviUDatumu = new Date(
      fokusDatum.getFullYear(),
      fokusDatum.getMonth(),
      1,
    );
    const zadnjiUDatumu = new Date(
      fokusDatum.getFullYear(),
      fokusDatum.getMonth() + 1,
      0,
    );

    const prviDanUMrezi = getPocetakNedelje(prviUDatumu);
    const celije = Array.from({ length: 42 }, (_, idx) =>
      dodajDane(prviDanUMrezi, idx),
    );

    return (
      <div className="mesecni-prikaz">
        <div className="mesecni-zaglavlje-dani">
          {nazivDanaKratko.map((dan) => (
            <div key={dan} className="mesecni-zaglavlje-cell">
              {dan}
            </div>
          ))}
        </div>
        <div className="mesecni-grid">
          {celije.map((datum) => {
            const terminiUDanu = terminiSortirani.filter((t) =>
              isIstiDan(new Date(t.datumVreme), datum),
            );
            const izAktivnogMeseca =
              datum >= prviUDatumu && datum <= zadnjiUDatumu;
            const danas = isIstiDan(datum, new Date());

            return (
              <div
                key={datum.toISOString()}
                className={`mesecni-cell ${izAktivnogMeseca ? "" : "muted"} ${danas ? "danas" : ""}`}
              >
                <div className="mesecni-broj">{datum.getDate()}</div>
                <div className="mesecni-termini">
                  {terminiUDanu.slice(0, 3).map((t) => {
                    const { pocetak } = getTerminaInterval(t);
                    return (
                      <div
                        key={t.id}
                        className={`mesecni-termin-item ${getStatusClass(t.status)}`}
                        title={`${formatVreme(pocetak)} · ${t.usluga.naziv} · ${t.pacijent.ime} ${t.pacijent.prezime}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/termini/${t.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            navigate(`/termini/${t.id}`);
                          }
                        }}
                      >
                        {formatVreme(pocetak)} {t.usluga.naziv}
                      </div>
                    );
                  })}
                  {terminiUDanu.length > 3 && (
                    <div className="mesecni-vise">
                      +{terminiUDanu.length - 3} još
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderVremenskaMreza = (dani: Date[]) => {
    const satnice = Array.from(
      { length: KRAJNJI_SAT - POCETNI_SAT + 1 },
      (_, i) => POCETNI_SAT + i,
    );
    const kolone = `70px repeat(${dani.length}, minmax(160px, 1fr))`;

    return (
      <div className="vremenska-mreza-wrap">
        <div
          className="vremenska-zaglavlja"
          style={{ gridTemplateColumns: kolone }}
        >
          <div className="satnica-prazno" />
          {dani.map((dan, idx) => (
            <div key={`${dan.toISOString()}-${idx}`} className="dan-zaglavlje">
              <strong>{nazivDanaKratko[idx]}</strong>
              <span>{formatDatumKratko(dan)}</span>
            </div>
          ))}
        </div>

        <div
          className="vremenska-mreza"
          style={{ gridTemplateColumns: kolone }}
        >
          <div className="satnica-kolona" style={{ height: visinaKalendara }}>
            {satnice.map((sat) => (
              <div
                key={`sat-${sat}`}
                className="satnica-red"
                style={{ top: (sat - POCETNI_SAT) * 60 * PIXELA_PO_MINUTU }}
              >
                {String(sat).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {dani.map((dan) => {
            const terminiDana = terminiSortirani.filter((t) =>
              isIstiDan(new Date(t.datumVreme), dan),
            );

            return (
              <div
                key={`kolona-${dan.toISOString()}`}
                className="dan-kolona"
                style={{ height: visinaKalendara }}
              >
                {satnice.map((sat) => (
                  <div
                    key={`${dan.toISOString()}-linija-${sat}`}
                    className="sat-linija"
                    style={{ top: (sat - POCETNI_SAT) * 60 * PIXELA_PO_MINUTU }}
                  />
                ))}

                {terminiDana.map((t) => {
                  const { pocetak, kraj, trajanje } = getTerminaInterval(t);
                  const minuteOdPocetka =
                    (pocetak.getHours() - POCETNI_SAT) * 60 +
                    pocetak.getMinutes();
                  const top = Math.max(0, minuteOdPocetka * PIXELA_PO_MINUTU);
                  const height = Math.max(40, trajanje * PIXELA_PO_MINUTU);

                  if (minuteOdPocetka > ukupnoMinutaPrikaza) return null;

                  return (
                    <div
                      key={t.id}
                      className={`termin-kartica ${getStatusClass(t.status)}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/termini/${t.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          navigate(`/termini/${t.id}`);
                        }
                      }}
                      style={{
                        top,
                        height,
                        opacity: t.status === "OTKAZANO" ? 0.6 : 1,
                      }}
                    >
                      <div className="termin-vreme">
                        {formatVreme(pocetak)} - {formatVreme(kraj)}
                      </div>
                      <div className="termin-usluga">{t.usluga.naziv}</div>
                      <div className="termin-pacijent">
                        {t.pacijent.ime} {t.pacijent.prezime}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="termini-stranica">
      <div className="termini-zaglavlje">
        <h2>Termini</h2>
        <button
          onClick={() => setPrikaziForm(!prikaziForm)}
          className="dugme-zakazi"
        >
          + Zakaži termin
        </button>
      </div>

      {greska && !prikaziForm && <p className="termini-greska">{greska}</p>}

      {prikaziForm && (
        <div
          className="zakazi-modal-overlay"
          onClick={() => setPrikaziForm(false)}
        >
          <div
            className="zakazi-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="zakazi-modal-header">
              <h2>Zakaži termin</h2>
              <button
                type="button"
                className="zakazi-modal-close"
                onClick={() => setPrikaziForm(false)}
                aria-label="Zatvori modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleZakazi} className="forma-zakazi">
              {greska && <p className="zakazi-modal-greska">{greska}</p>}
              <div className="forma-grid">
                <div className="forma-polje">
                  <label htmlFor="termin-datum">Datum *</label>
                  <input
                    id="termin-datum"
                    type="date"
                    value={novi.datum}
                    onChange={(e) =>
                      setNovi({ ...novi, datum: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="forma-polje">
                  <label htmlFor="termin-vreme">Vreme *</label>
                  <input
                    id="termin-vreme"
                    type="time"
                    value={novi.vreme}
                    onChange={(e) =>
                      setNovi({ ...novi, vreme: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="forma-polje">
                  <label htmlFor="termin-pacijent">Pacijent *</label>
                  <select
                    id="termin-pacijent"
                    value={novi.pacijentId}
                    onChange={(e) =>
                      setNovi({ ...novi, pacijentId: e.target.value })
                    }
                    required
                  >
                    <option value="">Izaberi pacijenta</option>
                    {pacijenti.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.ime} {p.prezime}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="forma-polje">
                  <label htmlFor="termin-usluga">Usluga *</label>
                  <select
                    id="termin-usluga"
                    value={novi.uslugaId}
                    onChange={(e) =>
                      setNovi({ ...novi, uslugaId: e.target.value })
                    }
                    required
                  >
                    <option value="">Izaberi uslugu</option>
                    {usluge.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.naziv} ({u.cena} RSD)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="forma-polje forma-polje-wide">
                  <label htmlFor="termin-napomena">Napomena</label>
                  <textarea
                    id="termin-napomena"
                    rows={5}
                    placeholder="Dodajte napomenu"
                    value={novi.napomena}
                    onChange={(e) =>
                      setNovi({ ...novi, napomena: e.target.value })
                    }
                  ></textarea>
                </div>
              </div>
              <div className="zakazi-modal-footer">
                <button
                  type="button"
                  className="zakazi-modal-otkazi"
                  onClick={() => setPrikaziForm(false)}
                >
                  Otkaži
                </button>
                <button type="submit" className="dugme-sacuvaj-termin">
                  Zakaži
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ucitavanje ? (
        <p>Učitavanje...</p>
      ) : (
        <div className="raspored-panel">
          <div className="kontrole-rasporeda">
            <div className="dugmad-prikaza">
              <button
                onClick={() => setPrikaz("MESECNI")}
                className={prikaz === "MESECNI" ? "aktivan" : ""}
              >
                Mesečni
              </button>
              <button
                onClick={() => setPrikaz("NEDELJNI")}
                className={prikaz === "NEDELJNI" ? "aktivan" : ""}
              >
                Nedeljni
              </button>
              <button
                onClick={() => setPrikaz("DNEVNI")}
                className={prikaz === "DNEVNI" ? "aktivan" : ""}
              >
                Dnevni
              </button>
            </div>

            <div className="navigacija-perioda">
              <button onClick={() => promeniPeriod(-1)}>‹</button>
              <strong>{prikazNaslov}</strong>
              <button onClick={() => promeniPeriod(1)}>›</button>
              <button onClick={() => setFokusDatum(new Date())}>Danas</button>
            </div>
          </div>

          {prikaz === "MESECNI" && renderMesecniPrikaz()}
          {prikaz === "NEDELJNI" && renderVremenskaMreza(daniNedelje)}
          {prikaz === "DNEVNI" && renderVremenskaMreza([fokusDatum])}
        </div>
      )}
    </div>
  );
}
