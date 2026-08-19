import { useEffect, useState } from "react";
import {
  getZaposleni,
  dodajZaposlenog,
  izmeniZaposlenog,
  obrisiZaposlenog,
} from "../../api/zaposleni";
import type { Zaposleni, Uloga } from "../../types";
import { useAuth } from "../../context/useAuth";

export default function DermatolozeLista() {
  const [zaposleni, setZaposleni] = useState<Zaposleni[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState("");
  const [prikaziForm, setPrikaziForm] = useState(false);
  const { logout } = useAuth();

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
      setPrikaziForm(false);
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
    if (!confirm("Da li ste sigurni da želite da obrišete ovog zaposlenog?"))
      return;
    try {
      await obrisiZaposlenog(id);
      ucitajZaposlene();
    } catch {
      setGreska("Neuspešno brisanje (možda ima povezane termine).");
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
        <h2>Upravljanje zaposlenima</h2>
        <button onClick={logout}>Odjavi se</button>
      </div>

      {greska && <p style={{ color: "red" }}>{greska}</p>}

      <button
        onClick={() => setPrikaziForm(!prikaziForm)}
        style={{ margin: "16px 0" }}
      >
        {prikaziForm ? "Otkaži" : "+ Dodaj dermatologa"}
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
              placeholder="Email"
              type="email"
              value={novi.email}
              onChange={(e) => setNovi({ ...novi, email: e.target.value })}
              required
            />
            <input
              placeholder="Broj telefona"
              value={novi.telefon}
              onChange={(e) => setNovi({ ...novi, telefon: e.target.value })}
              required
            />
            <input
              placeholder="Lozinka"
              type="password"
              value={novi.lozinka}
              onChange={(e) => setNovi({ ...novi, lozinka: e.target.value })}
              required
            />
            <select
              value={novi.uloga}
              onChange={(e) =>
                setNovi({ ...novi, uloga: e.target.value as Uloga })
              }
            >
              <option value="DERMATOLOG">Dermatolog</option>
              <option value="ADMIN">Admin</option>
            </select>
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
              <th style={{ padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>Uloga</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {zaposleni.map((z) => (
              <tr key={z.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>
                  {z.ime} {z.prezime}
                </td>
                <td style={{ padding: 8 }}>{z.email}</td>
                <td style={{ padding: 8 }}>{z.uloga}</td>
                <td style={{ padding: 8 }}>
                  {z.aktivan ? "Aktivan" : "Neaktivan"}
                </td>
                <td style={{ padding: 8 }}>
                  <button
                    onClick={() => handleDeaktiviraj(z)}
                    style={{ marginRight: 8 }}
                  >
                    {z.aktivan ? "Deaktiviraj" : "Aktiviraj"}
                  </button>
                  <button onClick={() => handleObrisi(z.id)}>Obriši</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
