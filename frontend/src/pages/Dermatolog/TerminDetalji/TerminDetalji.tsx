import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { getTermini, izmeniTermin, obrisiTermin } from "../../../api/termini";
import {
  dodajIzvestaj,
  getIzvestajZaTermin,
  obrisiIzvestaj,
  izmeniIzvestaj,
} from "../../../api/izvestaji";
import type { Izvestaj, Termin } from "../../../types";
import { sacuvajIzvestajKaoPdf } from "../../../utils/izvestajPdf";
import "./TerminDetalji.css";

const statusNazivi: Record<Termin["status"], string> = {
  ZAKAZANO: "Zakazano",
  OTKAZANO: "Otkazano",
  ZAVRSENO: "Završeno",
};

const formatDatumIVreme = (vrednost: string) =>
  new Date(vrednost).toLocaleString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatZaDatum = (vrednost: string) => {
  const datum = new Date(vrednost);
  const godina = datum.getFullYear();
  const mesec = String(datum.getMonth() + 1).padStart(2, "0");
  const dan = String(datum.getDate()).padStart(2, "0");
  return `${godina}-${mesec}-${dan}`;
};

const formatZaVreme = (vrednost: string) => {
  const datum = new Date(vrednost);
  return `${String(datum.getHours()).padStart(2, "0")}:${String(
    datum.getMinutes(),
  ).padStart(2, "0")}`;
};

export default function TerminDetalji() {
  const { id } = useParams();
  const terminId = Number(id);
  const [termin, setTermin] = useState<Termin | null>(null);
  const [izvestaj, setIzvestaj] = useState<Izvestaj | null>(null);
  const [forma, setForma] = useState({
    dijagnoza: "",
    terapija: "",
    anamneza: "",
  });
  const [terminForma, setTerminForma] = useState({ datum: "", vreme: "" });
  const [ucitavanje, setUcitavanje] = useState(true);
  const [slanje, setSlanje] = useState(false);
  const [cuvanjeTermina, setCuvanjeTermina] = useState(false);
  const [brisanje, setBrisanje] = useState(false);
  const [brisanjeIzvestaja, setBrisanjeIzvestaja] = useState(false);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;

    const ucitaj = async () => {
      try {
        const terminiRes = await getTermini();
        const pronadjen = terminiRes.data.find(
          (stavka) => stavka.id === terminId,
        );
        if (!pronadjen) {
          if (!ignore) setGreska("Termin nije pronađen.");
          return;
        }

        const izvestajRes = await getIzvestajZaTermin(terminId).catch(
          () => null,
        );
        if (ignore) return;
        setTermin(pronadjen);
        setTerminForma({
          datum: formatZaDatum(pronadjen.datumVreme),
          vreme: formatZaVreme(pronadjen.datumVreme),
        });
        setIzvestaj(izvestajRes?.data ?? null);
        if (izvestajRes?.data) {
          setForma({
            dijagnoza: izvestajRes.data.dijagnoza,
            terapija: izvestajRes.data.terapija || "",
            anamneza: izvestajRes.data.anamneza || "",
          });
        }
      } catch {
        if (!ignore) setGreska("Greška pri učitavanju detalja termina.");
      } finally {
        if (!ignore) setUcitavanje(false);
      }
    };

    if (!Number.isFinite(terminId)) return;
    ucitaj();
    return () => {
      ignore = true;
    };
  }, [terminId]);

  const promeniStatus = async (status: Termin["status"]) => {
    if (!termin) return;
    setGreska("");
    try {
      await izmeniTermin(termin.id, { status });
      setTermin({ ...termin, status });
      setPoruka(`Termin je označen kao ${statusNazivi[status].toLowerCase()}.`);
    } catch {
      setGreska("Greška pri promeni statusa termina.");
    }
  };

  const sacuvajTermin = async (e: FormEvent) => {
    e.preventDefault();
    if (!termin) return;
    setCuvanjeTermina(true);
    setGreska("");
    setPoruka("");
    try {
      const datumVreme = new Date(`${terminForma.datum}T${terminForma.vreme}`);
      if (Number.isNaN(datumVreme.getTime())) {
        setGreska("Datum i vreme termina nisu ispravni.");
        return;
      }
      const res = await izmeniTermin(termin.id, {
        datumVreme: datumVreme.toISOString(),
      });
      setTermin({ ...termin, ...res.data });
      setTerminForma({
        datum: formatZaDatum(res.data.datumVreme),
        vreme: formatZaVreme(res.data.datumVreme),
      });
      setPoruka("Datum i vreme termina su uspešno izmenjeni.");
    } catch (error) {
      const poruka = axios.isAxiosError(error)
        ? error.response?.data?.greska
        : undefined;
      setGreska(poruka || "Greška pri izmeni datuma i vremena termina.");
    } finally {
      setCuvanjeTermina(false);
    }
  };

  const obrisi = async () => {
    if (
      !termin ||
      !window.confirm("Da li ste sigurni da želite da obrišete termin?")
    ) {
      return;
    }
    setBrisanje(true);
    setGreska("");
    try {
      await obrisiTermin(termin.id);
      navigate("/termini");
    } catch (error) {
      const poruka = axios.isAxiosError(error)
        ? error.response?.data?.greska
        : undefined;
      setGreska(poruka || "Greška pri brisanju termina.");
    } finally {
      setBrisanje(false);
    }
  };

  const sacuvajIzvestaj = async (e: FormEvent) => {
    e.preventDefault();
    if (!termin) return;
    setSlanje(true);
    setGreska("");
    setPoruka("");
    try {
      const res = izvestaj
        ? await izmeniIzvestaj(izvestaj.id, forma)
        : await dodajIzvestaj({ terminId: termin.id, ...forma });
      setIzvestaj(res.data);
      setPoruka("Izveštaj je uspešno sačuvan.");
    } catch {
      setGreska(
        "Izveštaj za ovaj termin već postoji ili podaci nisu ispravni.",
      );
    } finally {
      setSlanje(false);
    }
  };

  const obrisiPostojeciIzvestaj = async () => {
    if (
      !izvestaj ||
      !window.confirm("Da li ste sigurni da želite da obrišete izveštaj?")
    ) {
      return;
    }
    setBrisanjeIzvestaja(true);
    setGreska("");
    setPoruka("");
    try {
      await obrisiIzvestaj(izvestaj.id);
      setIzvestaj(null);
      setForma({ dijagnoza: "", terapija: "", anamneza: "" });
      setPoruka("Izveštaj je uspešno obrisan.");
    } catch (error) {
      const greska = axios.isAxiosError(error)
        ? error.response?.data?.greska
        : undefined;
      setGreska(greska || "Greška pri brisanju izveštaja.");
    } finally {
      setBrisanjeIzvestaja(false);
    }
  };

  if (!Number.isFinite(terminId)) {
    return (
      <div className="termin-detalji">
        <p className="termin-detalji-greska">Termin nije pronađen.</p>
        <Link to="/termini" className="termin-detalji-back">
          Nazad na termine
        </Link>
      </div>
    );
  }
  if (ucitavanje)
    return (
      <div className="termin-detalji">
        <p>Učitavanje...</p>
      </div>
    );
  if (greska && !termin) {
    return (
      <div className="termin-detalji">
        <p className="termin-detalji-greska">{greska}</p>
        <Link to="/termini" className="termin-detalji-back">
          Nazad na termine
        </Link>
      </div>
    );
  }
  if (!termin) return null;

  return (
    <div className="termin-detalji">
      <div className="termin-detalji-header">
        <div>
          <p className="termin-detalji-eyebrow">Detalji termina</p>
          <h2>
            {termin.pacijent.ime} {termin.pacijent.prezime}
          </h2>
          <p>
            {formatDatumIVreme(termin.datumVreme)} · {termin.usluga.naziv}
          </p>
        </div>
        <Link to="/termini" className="termin-detalji-back">
          Nazad na termine
        </Link>
      </div>

      {greska && <p className="termin-detalji-greska">{greska}</p>}
      {poruka && <p className="termin-detalji-poruka">{poruka}</p>}

      <div className="termin-detalji-grid">
        <section className="termin-detalji-panel">
          <h3>Podaci o pacijentu</h3>
          <dl className="termin-podaci">
            <div className="termin-izmena-red">
              <dd>
                <form onSubmit={sacuvajTermin} className="termin-vreme-form">
                  <div className="termin-vreme-polja">
                    <label>
                      Datum
                      <input
                        type="date"
                        value={terminForma.datum}
                        onChange={(e) =>
                          setTerminForma({
                            ...terminForma,
                            datum: e.target.value,
                          })
                        }
                        required
                      />
                    </label>
                    <label>
                      Vreme
                      <input
                        type="time"
                        value={terminForma.vreme}
                        onChange={(e) =>
                          setTerminForma({
                            ...terminForma,
                            vreme: e.target.value,
                          })
                        }
                        required
                      />
                    </label>
                  </div>
                  <button type="submit" disabled={cuvanjeTermina}>
                    {cuvanjeTermina ? "Čuvanje..." : "Izmeni termin"}
                  </button>
                </form>
              </dd>
            </div>
            <div>
              <dt>Ime i prezime</dt>
              <dd>
                {termin.pacijent.ime} {termin.pacijent.prezime}
              </dd>
            </div>
            <div>
              <dt>JMBG</dt>
              <dd>{termin.pacijent.jmbg}</dd>
            </div>
            <div>
              <dt>Telefon</dt>
              <dd>{termin.pacijent.telefon || "-"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{termin.pacijent.email || "-"}</dd>
            </div>
          </dl>
          <Link
            to={`/pacijenti/${termin.pacijent.id}`}
            className="termin-detalji-link"
          >
            Otvori karton pacijenta
          </Link>
        </section>

        <section className="termin-detalji-panel">
          <h3>Termin</h3>
          <dl className="termin-podaci">
            <div>
              <dt>Usluga</dt>
              <dd>
                {termin.usluga.naziv} ({termin.usluga.trajanjeMin} min)
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`status-${termin.status.toLowerCase()}`}>
                  {statusNazivi[termin.status]}
                </span>
              </dd>
            </div>
            <div>
              <dt>Napomena</dt>
              <dd>{termin.napomena || "Nema napomene."}</dd>
            </div>
          </dl>
          <div className="status-akcije">
            {(Object.keys(statusNazivi) as Termin["status"][]).map((status) => (
              <button
                key={status}
                type="button"
                className={termin.status === status ? "status-aktivan" : ""}
                onClick={() => promeniStatus(status)}
              >
                {statusNazivi[status]}
              </button>
            ))}
            <button
              type="button"
              className="termin-brisi"
              onClick={obrisi}
              disabled={brisanje}
            >
              {brisanje ? "Brisanje..." : "Obriši termin"}
            </button>
          </div>
        </section>
      </div>

      <section className="termin-detalji-panel termin-izvestaj-panel">
        <div className="termin-panel-heading">
          <div>
            <h3>{izvestaj ? "Izveštaj sa pregleda" : "Dodaj izveštaj"}</h3>
          </div>
          {izvestaj && (
            <button
              type="button"
              onClick={() =>
                sacuvajIzvestajKaoPdf(izvestaj, termin.pacijent, termin)
              }
            >
              Sačuvaj PDF
            </button>
          )}
        </div>
        <form onSubmit={sacuvajIzvestaj} className="termin-izvestaj-form">
          <label>
            Dijagnoza
            <textarea
              value={forma.dijagnoza}
              onChange={(e) =>
                setForma({ ...forma, dijagnoza: e.target.value })
              }
              required
            />
          </label>
          <label>
            Terapija
            <textarea
              value={forma.terapija}
              onChange={(e) => setForma({ ...forma, terapija: e.target.value })}
            />
          </label>
          <label>
            Anamneza
            <textarea
              value={forma.anamneza}
              onChange={(e) => setForma({ ...forma, anamneza: e.target.value })}
            />
          </label>
          <div className="termin-izvestaj-akcije">
            <button type="submit" disabled={slanje || brisanjeIzvestaja}>
              {slanje
                ? "Čuvanje..."
                : izvestaj
                  ? "Sačuvaj izmene"
                  : "Sačuvaj izveštaj"}
            </button>
            {izvestaj && (
              <button
                type="button"
                className="izvestaj-brisi"
                onClick={obrisiPostojeciIzvestaj}
                disabled={slanje || brisanjeIzvestaja}
              >
                {brisanjeIzvestaja ? "Brisanje..." : "Obriši izveštaj"}
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
