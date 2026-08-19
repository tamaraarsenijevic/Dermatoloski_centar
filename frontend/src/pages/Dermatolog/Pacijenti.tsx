import { useEffect, useState } from "react";
import { getPacijenti, dodajPacijenta } from "../../api/pacijenti";
import type { Pacijent } from "../../types";
import { useAuth } from "../../context/useAuth";

export default function Pacijenti() {
  const [pacijenti, setPacijenti] = useState<Pacijent[]>([]);
  const [pretraga, setPretraga] = useState("");
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState("");
  const [prikaziForm, setPrikaziForm] = useState(false);
  const { logout } = useAuth();

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
    let ignore = false;

    const ucitaj = async () => {
      setUcitavanje(true);
      try {
        const res = await getPacijenti();
        if (!ignore) setPacijenti(res.data);
      } catch {
        if (!ignore) setGreska("Greška pri učitavanju pacijenata.");
      } finally {
        if (!ignore) setUcitavanje(false);
      }
    };

    ucitaj();
    return () => {
      ignore = true;
    };
  }, []);

  const handlePretraga = (e: React.FormEvent) => {
    e.preventDefault();
    ucitajPacijente(pretraga);
  };

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
      ucitajPacijente();
    } catch {
      setGreska("Greška pri unosu (JMBG možda već postoji).");
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Pacijenti</h2>
        <button onClick={logout}>Odjavi se</button>
      </div>

      {greska && <p style={{ color: "red" }}>{greska}</p>}

      <form onSubmit={handlePretraga} style={{ margin: "16px 0" }}>
        <input
          placeholder="Pretraga po imenu, prezimenu ili JMBG-u"
          value={pretraga}
          onChange={(e) => setPretraga(e.target.value)}
          style={{ padding: 8, width: 300, marginRight: 8 }}
        />
        <button type="submit">Pretraži</button>
      </form>

      <button
        onClick={() => setPrikaziForm(!prikaziForm)}
        style={{ marginBottom: 16 }}
      >
        {prikaziForm ? "Otkaži" : "+ Dodaj pacijenta"}
      </button>

      {prikaziForm && (
        <form
          onSubmit={handleDodaj}
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
              placeholder="Ime"
              value={novi.ime}
              onChange={(e) => setNovi({ ...novi, ime: e.target.value })}
              required
            />
            <input
              placeholder="Prezime"
              value={novi.prezime}
              onChange={(e) => setNovi({ ...novi, prezime: e.target.value })}
              required
            />
            <input
              placeholder="JMBG"
              value={novi.jmbg}
              onChange={(e) => setNovi({ ...novi, jmbg: e.target.value })}
              required
            />
            <input
              placeholder="Telefon"
              value={novi.telefon}
              onChange={(e) => setNovi({ ...novi, telefon: e.target.value })}
            />
            <input
              placeholder="Email"
              type="email"
              value={novi.email}
              onChange={(e) => setNovi({ ...novi, email: e.target.value })}
            />
            <input
              placeholder="Napomena"
              value={novi.napomena}
              onChange={(e) => setNovi({ ...novi, napomena: e.target.value })}
            />
          </div>
          <button type="submit" style={{ marginTop: 12 }}>
            Sačuvaj
          </button>
        </form>
      )}

      {ucitavanje ? (
        <p>Učitavanje...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
              <th style={{ padding: 8 }}>Ime i prezime</th>
              <th style={{ padding: 8 }}>JMBG</th>
              <th style={{ padding: 8 }}>Telefon</th>
              <th style={{ padding: 8 }}>Email</th>
            </tr>
          </thead>
          <tbody>
            {pacijenti.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>
                  {p.ime} {p.prezime}
                </td>
                <td style={{ padding: 8 }}>{p.jmbg}</td>
                <td style={{ padding: 8 }}>{p.telefon || "-"}</td>
                <td style={{ padding: 8 }}>{p.email || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
