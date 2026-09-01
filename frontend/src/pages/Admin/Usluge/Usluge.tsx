import { useEffect, useState } from "react";
import {
  getUsluge,
  dodajUslugu,
  izmeniUslugu,
  obrisiUslugu,
} from "../../../api/usluge";
import type { Usluga } from "../../../types";
import "./Usluge.css";

export default function UslugeLista() {
  const [usluge, setUsluge] = useState<Usluga[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState("");
  const [prikaziForm, setPrikaziForm] = useState(false);
  const [izmenaId, setIzmenaId] = useState<number | null>(null);

  const [forma, setForma] = useState({
    naziv: "",
    opis: "",
    trajanjeMin: 30,
    cena: 0,
  });

  useEffect(() => {
    let ignore = false;

    const ucitaj = async () => {
      setUcitavanje(true);
      try {
        const res = await getUsluge();
        if (!ignore) setUsluge(res.data);
      } catch {
        if (!ignore) setGreska("Greška pri učitavanju usluga.");
      } finally {
        if (!ignore) setUcitavanje(false);
      }
    };

    ucitaj();
    return () => {
      ignore = true;
    };
  }, []);

  const ucitajUsluge = async () => {
    setUcitavanje(true);
    try {
      const res = await getUsluge();
      setUsluge(res.data);
    } catch {
      setGreska("Greška pri učitavanju usluga.");
    } finally {
      setUcitavanje(false);
    }
  };

  const resetujFormu = () => {
    setForma({ naziv: "", opis: "", trajanjeMin: 30, cena: 0 });
    setIzmenaId(null);
    setPrikaziForm(false);
  };

  const handleNovaUsluga = () => {
    resetujFormu();
    setPrikaziForm(true);
  };

  const handleIzmeniKlik = (usluga: Usluga) => {
    setForma({
      naziv: usluga.naziv,
      opis: usluga.opis || "",
      trajanjeMin: usluga.trajanjeMin,
      cena: usluga.cena,
    });
    setIzmenaId(usluga.id);
    setPrikaziForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGreska("");
    try {
      if (izmenaId) {
        await izmeniUslugu(izmenaId, forma);
      } else {
        await dodajUslugu(forma);
      }
      resetujFormu();
      ucitajUsluge();
    } catch {
      setGreska(
        izmenaId ? "Greška pri izmeni usluge." : "Greška pri dodavanju usluge.",
      );
    }
  };

  const handleObrisi = async (id: number) => {
    if (!confirm("Da li ste sigurni da želite da obrišete ovu uslugu?")) return;
    try {
      await obrisiUslugu(id);
      ucitajUsluge();
    } catch {
      setGreska("Neuspešno brisanje (usluga možda ima povezane termine).");
    }
  };

  return (
    <div className="usluge-page">
      <div className="usluge-header">
        <div>
          <h2>Cenovnik usluga</h2>
          <p className="usluge-subtitle">
            Upravljajte pregledom, cenama i trajanjem dermatoloških usluga.
          </p>
        </div>
        <button className="usluge-add-button" onClick={handleNovaUsluga}>
          + Dodaj uslugu
        </button>
      </div>

      {greska && <p className="usluge-error">{greska}</p>}

      {prikaziForm && (
        <div className="usluge-modal-overlay" onClick={resetujFormu}>
          <div
            className="usluge-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="usluge-modal-header">
              <h2>{izmenaId ? "Izmena usluge" : "Nova usluga"}</h2>
              <button
                type="button"
                className="usluge-modal-close"
                onClick={resetujFormu}
                aria-label="Zatvori modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="usluge-form">
              <div className="usluge-form-grid">
                <div className="usluge-field">
                  <label htmlFor="naziv-usluge">Naziv usluge *</label>
                  <input
                    id="naziv-usluge"
                    value={forma.naziv}
                    onChange={(e) =>
                      setForma({ ...forma, naziv: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="usluge-field">
                  <label htmlFor="cena-usluge">Cena (RSD) *</label>
                  <input
                    id="cena-usluge"
                    type="number"
                    min={0}
                    step="0.01"
                    value={forma.cena}
                    onChange={(e) =>
                      setForma({ ...forma, cena: Number(e.target.value) })
                    }
                    required
                  />
                </div>
                <div className="usluge-field">
                  <label htmlFor="trajanje-usluge">Trajanje (min) *</label>
                  <input
                    id="trajanje-usluge"
                    type="number"
                    min={1}
                    value={forma.trajanjeMin}
                    onChange={(e) =>
                      setForma({
                        ...forma,
                        trajanjeMin: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="usluge-field usluge-field-wide">
                  <label htmlFor="opis-usluge">Opis</label>
                  <textarea
                    id="opis-usluge"
                    rows={5}
                    value={forma.opis}
                    onChange={(e) =>
                      setForma({ ...forma, opis: e.target.value })
                    }
                  ></textarea>
                </div>
              </div>
              <div className="usluge-modal-footer">
                <button
                  type="button"
                  className="usluge-cancel-button"
                  onClick={resetujFormu}
                >
                  Otkaži
                </button>
                <button type="submit" className="usluge-submit-button">
                  {izmenaId ? "Sačuvaj izmene" : "Dodaj uslugu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ucitavanje ? (
        <p className="usluge-state">Učitavanje...</p>
      ) : usluge.length === 0 ? (
        <p className="usluge-state">Nema unetih usluga.</p>
      ) : (
        <div className="usluge-grid">
          {usluge.map((u) => (
            <article className="usluga-card" key={u.id}>
              <h3>{u.naziv}</h3>
              <p className="usluga-description">
                {u.opis || "Bez opisa usluge."}
              </p>
              <div className="usluga-meta">
                <span>{u.trajanjeMin} min</span>
                <span>{u.cena.toLocaleString("sr-RS")} RSD</span>
              </div>
              <div className="usluga-actions">
                <button
                  className="usluga-action"
                  onClick={() => handleIzmeniKlik(u)}
                >
                  Izmeni
                </button>
                <button
                  className="usluga-action usluga-action-danger"
                  onClick={() => handleObrisi(u.id)}
                >
                  Obriši
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
