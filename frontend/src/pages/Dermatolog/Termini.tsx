import { useEffect, useState } from "react";
import { getTermini, zakaziTermin, izmeniTermin } from "../../api/termini";
import { getPacijenti } from "../../api/pacijenti";
import { getUsluge } from "../../api/usluge";
import type { Termin, Pacijent, Usluga } from "../../types";
import { useAuth } from "../../context/useAuth";
import { formatDoctorName } from "../../utils/formatters";

export default function Termini() {
  const [termini, setTermini] = useState<Termin[]>([]);
  const [pacijenti, setPacijenti] = useState<Pacijent[]>([]);
  const [usluge, setUsluge] = useState<Usluga[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState("");
  const [prikaziForm, setPrikaziForm] = useState(false);
  const { user, logout } = useAuth();

  const [novi, setNovi] = useState({
    datumVreme: "",
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
      setUsluge(uslugeRes.data);
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
          setUsluge(uslugeRes.data);
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
        datumVreme: novi.datumVreme,
        pacijentId: Number(novi.pacijentId),
        dermatologId: user.id,
        uslugaId: Number(novi.uslugaId),
        napomena: novi.napomena,
      });
      setNovi({ datumVreme: "", pacijentId: "", uslugaId: "", napomena: "" });
      setPrikaziForm(false);
      ucitajSve();
    } catch {
      setGreska("Greška pri zakazivanju termina.");
    }
  };

  const handleOznaciZavrsen = async (id: number) => {
    try {
      await izmeniTermin(id, { status: "ZAVRSENO" });
      ucitajSve();
    } catch {
      setGreska("Greška pri izmeni statusa.");
    }
  };

  const handleOtkazi = async (id: number) => {
    try {
      await izmeniTermin(id, { status: "OTKAZANO" });
      ucitajSve();
    } catch {
      setGreska("Greška pri otkazivanju.");
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Termini</h2>
        <button onClick={logout}>Odjavi se</button>
      </div>

      {greska && <p style={{ color: "red" }}>{greska}</p>}

      <button
        onClick={() => setPrikaziForm(!prikaziForm)}
        style={{ margin: "16px 0" }}
      >
        {prikaziForm ? "Otkaži" : "+ Zakaži termin"}
      </button>

      {prikaziForm && (
        <form
          onSubmit={handleZakazi}
          style={{
            border: "1px solid #ddd",
            padding: 16,
            marginBottom: 16,
            borderRadius: 8,
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <input
              type="datetime-local"
              value={novi.datumVreme}
              onChange={(e) => setNovi({ ...novi, datumVreme: e.target.value })}
              required
            />
            <select
              value={novi.pacijentId}
              onChange={(e) => setNovi({ ...novi, pacijentId: e.target.value })}
              required
            >
              <option value="">Izaberi pacijenta</option>
              {pacijenti.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ime} {p.prezime}
                </option>
              ))}
            </select>
            <select
              value={novi.uslugaId}
              onChange={(e) => setNovi({ ...novi, uslugaId: e.target.value })}
              required
            >
              <option value="">Izaberi uslugu</option>
              {usluge.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.naziv} ({u.cena} RSD)
                </option>
              ))}
            </select>
            <input
              placeholder="Napomena"
              value={novi.napomena}
              onChange={(e) => setNovi({ ...novi, napomena: e.target.value })}
            />
          </div>
          <button type="submit" style={{ marginTop: 12 }}>
            Zakaži
          </button>
        </form>
      )}

      {ucitavanje ? (
        <p>Učitavanje...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
              <th style={{ padding: 8 }}>Datum i vreme</th>
              <th style={{ padding: 8 }}>Pacijent</th>
              <th style={{ padding: 8 }}>Dermatolog</th>
              <th style={{ padding: 8 }}>Usluga</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {termini.map((t) => (
              <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>
                  {new Date(t.datumVreme).toLocaleString("sr-RS")}
                </td>
                <td style={{ padding: 8 }}>
                  {t.pacijent.ime} {t.pacijent.prezime}
                </td>
                <td style={{ padding: 8 }}>
                  {formatDoctorName(
                    t.dermatolog.ime,
                    t.dermatolog.prezime,
                    "DERMATOLOG",
                  )}
                </td>
                <td style={{ padding: 8 }}>{t.usluga.naziv}</td>
                <td style={{ padding: 8 }}>{t.status}</td>
                <td style={{ padding: 8 }}>
                  {t.status === "ZAKAZANO" && (
                    <>
                      <button
                        onClick={() => handleOznaciZavrsen(t.id)}
                        style={{ marginRight: 8 }}
                      >
                        Završi
                      </button>
                      <button onClick={() => handleOtkazi(t.id)}>Otkaži</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
