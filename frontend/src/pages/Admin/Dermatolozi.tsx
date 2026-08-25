import { useEffect, useState } from "react";
import axios from "axios";
import {
  getZaposleni,
  dodajZaposlenog,
  izmeniZaposlenog,
  obrisiZaposlenog,
} from "../../api/zaposleni";
import { useAuth } from "../../context/useAuth";
import type { Zaposleni, Uloga } from "../../types";
import { formatDoctorName } from "../../utils/formatters";
import "./Dermatolozi.style.css";

interface ModalBrisanja {
  id: number;
  brojTermina: number;
}

export default function Dermatolozi() {
  const { user: trenutniKorisnik } = useAuth();
  const [zaposleni, setZaposleni] = useState<Zaposleni[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState("");
  const [modalOtvoren, setModalOtvoren] = useState(false);
  const [modalBrisanja, setModalBrisanja] = useState<ModalBrisanja | null>(
    null,
  );

  const [novi, setNovi] = useState({
    ime: "",
    prezime: "",
    email: "",
    telefon: "",
    lozinka: "",
    uloga: "DERMATOLOG" as Uloga,
  });

  const ucitajZaposlene = async () => {
    setUcitavanje(true);
    try {
      const res = await getZaposleni();
      setZaposleni(res.data);
    } catch {
      setGreska("Greška pri učitavanju zaposlenih.");
    } finally {
      setUcitavanje(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const ucitaj = async () => {
      setUcitavanje(true);
      try {
        const res = await getZaposleni();
        if (!ignore) setZaposleni(res.data);
      } catch {
        if (!ignore) setGreska("Greška pri učitavanju zaposlenih.");
      } finally {
        if (!ignore) setUcitavanje(false);
      }
    };

    ucitaj();
    return () => {
      ignore = true;
    };
  }, []);

  const handleDodaj = async (e: React.FormEvent) => {
    e.preventDefault();
    setGreska("");
    try {
      await dodajZaposlenog(novi);
      setNovi({
        ime: "",
        prezime: "",
        email: "",
        telefon: "",
        lozinka: "",
        uloga: "DERMATOLOG",
      });
      setModalOtvoren(false);
      ucitajZaposlene();
    } catch {
      setGreska("Greška pri dodavanju (email možda već postoji).");
    }
  };

  const handleDeaktiviraj = async (z: Zaposleni) => {
    try {
      await izmeniZaposlenog(z.id, { aktivan: !z.aktivan });
      ucitajZaposlene();
    } catch {
      setGreska("Greška pri izmeni statusa.");
    }
  };

  const handleObrisi = async (id: number) => {
    try {
      await obrisiZaposlenog(id);
      ucitajZaposlene();
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 409 &&
        ["ZAKAZANI_TERMINI", "POTVRDA_BRISANJA"].includes(
          error.response.data?.kod,
        )
      ) {
        const brojTermina = error.response.data.brojTermina as number;
        setModalBrisanja({ id, brojTermina });
        return;
      }

      setGreska("Neuspešno brisanje (možda ima povezane termine).");
    }
  };

  const potvrdiBrisanje = async () => {
    if (!modalBrisanja) return;

    const { id } = modalBrisanja;
    setModalBrisanja(null);
    try {
      await obrisiZaposlenog(id, true);
      ucitajZaposlene();
    } catch {
      setGreska("Neuspešno brisanje dermatologa.");
    }
  };

  const tekstTermina = (brojTermina: number) => {
    if (brojTermina === 1) return "1 zakazan termin koji nije završen";
    if (brojTermina >= 2 && brojTermina <= 4) {
      return `${brojTermina} zakazana termina koji nisu završeni`;
    }
    return `${brojTermina} zakazanih termina koji nisu završeni`;
  };

  return (
    <div className="dermatolozi-container">
      {/* Zaglavlje */}
      <header className="dermatolozi-header">
        <div>
          <h1 className="dermatolozi-title">Upravljanje zaposlenima</h1>
          <p className="dermatolozi-subtitle">
            Pregled, dodavanje i upravljanje nalozima dermatologa i
            administratora.
          </p>
        </div>
      </header>

      {/* Akcije pre tabele */}
      <div className="dermatolozi-actions">
        <button className="btn-primary" onClick={() => setModalOtvoren(true)}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Dodaj novog zaposlenog
        </button>
      </div>

      {/* Tabela sa zaposlenima */}
      <div className="table-card">
        {ucitavanje ? (
          <div className="loading-state">Učitavanje zaposlenih...</div>
        ) : zaposleni.length === 0 ? (
          <div className="empty-state">
            Trenutno nema registrovanih zaposlenih.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="dermatolozi-table">
              <thead>
                <tr>
                  <th>Ime i prezime</th>
                  <th>Kontakt</th>
                  <th>Uloga</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {zaposleni.map((z) => (
                  <tr key={z.id}>
                    <td>
                      <div className="user-name-cell">
                        <div className="user-avatar">
                          {z.ime[0]}
                          {z.prezime[0]}
                        </div>
                        <span className="font-semibold">
                          {formatDoctorName(z.ime, z.prezime, z.uloga)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="user-contact-cell">
                        <div>{z.email}</div>
                        {z.telefon && (
                          <small className="text-muted">{z.telefon}</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${z.uloga.toLowerCase()}`}>
                        {z.uloga}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${z.aktivan ? "active" : "inactive"}`}
                      >
                        <span className="status-dot"></span>
                        {z.aktivan ? "Aktivan" : "Neaktivan"}
                      </span>
                    </td>
                    <td>
                      {z.id !== trenutniKorisnik?.id && (
                        <div className="action-buttons">
                          <button
                            className={`btn-action ${z.aktivan ? "deactivate" : "activate"}`}
                            onClick={() => handleDeaktiviraj(z)}
                          >
                            {z.aktivan ? "Deaktiviraj" : "Aktiviraj"}
                          </button>
                          <button
                            className="btn-action delete"
                            onClick={() => handleObrisi(z.id)}
                          >
                            Obriši
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL ZA DODAVANJE ZAPOSLENOG */}
      {modalOtvoren && (
        <div className="modal-overlay" onClick={() => setModalOtvoren(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Dodaj novog zaposlenog</h2>
              <button
                className="modal-close-btn"
                onClick={() => setModalOtvoren(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleDodaj} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="ime">Ime</label>
                  <input
                    id="ime"
                    placeholder="Ime"
                    value={novi.ime}
                    onChange={(e) => setNovi({ ...novi, ime: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prezime">Prezime</label>
                  <input
                    id="prezime"
                    placeholder="Prezime"
                    value={novi.prezime}
                    onChange={(e) =>
                      setNovi({ ...novi, prezime: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email adresa</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="ime@dermatologija.rs"
                    value={novi.email}
                    onChange={(e) =>
                      setNovi({ ...novi, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="telefon">Broj telefona</label>
                  <input
                    id="telefon"
                    placeholder="+381 6X XXX XXXX"
                    value={novi.telefon}
                    onChange={(e) =>
                      setNovi({ ...novi, telefon: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lozinka">Lozinka</label>
                  <input
                    id="lozinka"
                    type="password"
                    placeholder="••••••••"
                    value={novi.lozinka}
                    onChange={(e) =>
                      setNovi({ ...novi, lozinka: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="uloga">Uloga u sistemu</label>
                  <select
                    id="uloga"
                    value={novi.uloga}
                    onChange={(e) =>
                      setNovi({ ...novi, uloga: e.target.value as Uloga })
                    }
                  >
                    <option value="DERMATOLOG">Dermatolog</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalOtvoren(false)}
                >
                  Otkaži
                </button>
                <button type="submit" className="btn-primary">
                  Sačuvaj zaposlenog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalBrisanja && (
        <div className="modal-overlay" onClick={() => setModalBrisanja(null)}>
          <div
            className="modal-content message-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {modalBrisanja.brojTermina > 0
                  ? "Zakazani termini"
                  : "Potvrda brisanja"}
              </h2>
              <button
                className="modal-close-btn"
                onClick={() => setModalBrisanja(null)}
                aria-label="Zatvori poruku"
              >
                &times;
              </button>
            </div>
            <div className="message-modal-body">
              {modalBrisanja.brojTermina > 0 ? (
                <>
                  <p>
                    Dermatolog ima {tekstTermina(modalBrisanja.brojTermina)}.
                  </p>
                  <p>
                    Da li ste sigurni da želite da obrišete dermatologa? Ovim će
                    biti obrisani i ti zakazani termini.
                  </p>
                </>
              ) : (
                <p>Da li ste sigurni da želite da obrišete dermatologa?</p>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModalBrisanja(null)}
              >
                Otkaži
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={potvrdiBrisanje}
              >
                Obriši
              </button>
            </div>
          </div>
        </div>
      )}

      {greska && (
        <div className="modal-overlay" onClick={() => setGreska("")}>
          <div
            className="modal-content message-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Greška</h2>
              <button
                className="modal-close-btn"
                onClick={() => setGreska("")}
                aria-label="Zatvori poruku"
              >
                &times;
              </button>
            </div>
            <div className="message-modal-body">
              <p>{greska}</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setGreska("")}
              >
                U redu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
