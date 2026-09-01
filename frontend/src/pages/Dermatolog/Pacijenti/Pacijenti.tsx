import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPacijenti, dodajPacijenta } from "../../../api/pacijenti";
import type { Pacijent } from "../../../types";
import "./Pacijenti.css";

export default function Pacijenti() {
  const [pacijenti, setPacijenti] = useState<Pacijent[]>([]);
  const [pretraga, setPretraga] = useState("");
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState("");
  const [prikaziForm, setPrikaziForm] = useState(false);
  const navigate = useNavigate();

  const [novi, setNovi] = useState({
    ime: "",
    prezime: "",
    jmbg: "",
    telefon: "",
    email: "",
    napomena: "",
  });

  const ucitajPacijente = async (pretragaVrednost?: string) => {
    setUcitavanje(true);
    setGreska("");
    try {
      const res = await getPacijenti(pretragaVrednost);
      setPacijenti(res.data);
    } catch {
      setGreska("Greška pri učitavanju pacijenata.");
    } finally {
      setUcitavanje(false);
    }
  };

  useEffect(() => {
    const debounceId = window.setTimeout(() => {
      ucitajPacijente(pretraga.trim() || undefined);
    }, 350);

    return () => {
      window.clearTimeout(debounceId);
    };
  }, [pretraga]);

  const handleDodaj = async (e: React.FormEvent) => {
    e.preventDefault();
    setGreska("");
    try {
      await dodajPacijenta(novi);
      setNovi({
        ime: "",
        prezime: "",
        jmbg: "",
        telefon: "",
        email: "",
        napomena: "",
      });
      setPrikaziForm(false);
      ucitajPacijente(pretraga.trim() || undefined);
    } catch {
      setGreska("Greška pri unosu (JMBG možda već postoji).");
    }
  };

  const resetujFormu = () => {
    setNovi({
      ime: "",
      prezime: "",
      jmbg: "",
      telefon: "",
      email: "",
      napomena: "",
    });
    setPrikaziForm(false);
  };

  return (
    <div className="pacijenti-page">
      <div className="pacijenti-header">
        <div>
          <h2>Pacijenti</h2>
          <p className="pacijenti-subtitle">
            Pregled svih pacijenata sa brzim pristupom detaljima, terminima i
            izveštajima.
          </p>
        </div>
        <button
          className="pacijenti-add-button"
          onClick={() => setPrikaziForm(true)}
        >
          + Dodaj pacijenta
        </button>
      </div>

      {greska && <p className="pacijenti-error">{greska}</p>}

      <div className="pacijenti-toolbar">
        <input
          className="pacijenti-search"
          placeholder="Pretraga po imenu, prezimenu ili JMBG-u"
          value={pretraga}
          onChange={(e) => setPretraga(e.target.value)}
        />
      </div>

      {prikaziForm && (
        <div className="pacijenti-modal-overlay" onClick={resetujFormu}>
          <div
            className="pacijenti-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pacijenti-modal-header">
              <h2>Novi pacijent</h2>
              <button
                type="button"
                className="pacijenti-modal-close"
                onClick={resetujFormu}
                aria-label="Zatvori modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleDodaj} className="pacijenti-form">
              <div className="pacijenti-form-grid">
                <div className="pacijenti-field">
                  <label htmlFor="pacijent-ime">Ime *</label>
                  <input
                    id="pacijent-ime"
                    value={novi.ime}
                    onChange={(e) => setNovi({ ...novi, ime: e.target.value })}
                    required
                  />
                </div>
                <div className="pacijenti-field">
                  <label htmlFor="pacijent-prezime">Prezime *</label>
                  <input
                    id="pacijent-prezime"
                    value={novi.prezime}
                    onChange={(e) =>
                      setNovi({ ...novi, prezime: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="pacijenti-field">
                  <label htmlFor="pacijent-jmbg">JMBG *</label>
                  <input
                    id="pacijent-jmbg"
                    value={novi.jmbg}
                    onChange={(e) => setNovi({ ...novi, jmbg: e.target.value })}
                    required
                  />
                </div>
                <div className="pacijenti-field">
                  <label htmlFor="pacijent-telefon">Telefon</label>
                  <input
                    id="pacijent-telefon"
                    value={novi.telefon}
                    onChange={(e) =>
                      setNovi({ ...novi, telefon: e.target.value })
                    }
                  />
                </div>
                <div className="pacijenti-field">
                  <label htmlFor="pacijent-email">Email</label>
                  <input
                    id="pacijent-email"
                    type="email"
                    value={novi.email}
                    onChange={(e) =>
                      setNovi({ ...novi, email: e.target.value })
                    }
                  />
                </div>
                <div className="pacijenti-field pacijenti-field-wide">
                  <label htmlFor="pacijent-napomena">Napomena</label>
                  <textarea
                    id="pacijent-napomena"
                    rows={4}
                    value={novi.napomena}
                    onChange={(e) =>
                      setNovi({ ...novi, napomena: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="pacijenti-modal-footer">
                <button
                  type="button"
                  className="pacijenti-cancel-button"
                  onClick={resetujFormu}
                >
                  Otkaži
                </button>
                <button type="submit" className="pacijenti-submit-button">
                  Sačuvaj pacijenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ucitavanje ? (
        <p className="pacijenti-state">Učitavanje...</p>
      ) : pacijenti.length === 0 ? (
        <p className="pacijenti-state">Nema pacijenata za zadatu pretragu.</p>
      ) : (
        <div className="pacijenti-table-wrap">
          <table className="pacijenti-table">
            <thead>
              <tr>
                <th>Ime i prezime</th>
                <th>JMBG</th>
                <th>Telefon</th>
                <th>Email</th>
                <th className="pacijenti-col-action">Detalji</th>
              </tr>
            </thead>
            <tbody>
              {pacijenti.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/pacijenti/${p.id}`)}
                  className="pacijenti-row-clickable"
                >
                  <td>
                    <strong>
                      {p.ime} {p.prezime}
                    </strong>
                  </td>
                  <td>{p.jmbg}</td>
                  <td>{p.telefon || "-"}</td>
                  <td>{p.email || "-"}</td>
                  <td className="pacijenti-cell-action">Otvori</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
