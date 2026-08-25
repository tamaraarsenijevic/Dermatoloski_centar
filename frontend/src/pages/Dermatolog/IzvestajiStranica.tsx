import { useEffect, useState } from "react";
import { getTermini } from "../../api/termini";
import { dodajIzvestaj, getIzvestajiZaPacijenta } from "../../api/izvestaji";
import type { Termin, Izvestaj } from "../../types";
import { useAuth } from "../../context/useAuth";

export default function IzvestajiStranica() {
  const [termini, setTermini] = useState<Termin[]>([]);
  const [izabraniTermin, setIzabraniTermin] = useState<Termin | null>(null);
  const [istorija, setIstorija] = useState<Izvestaj[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const { logout } = useAuth();

  const [forma, setForma] = useState({
    dijagnoza: "",
    terapija: "",
    anamneza: "",
  });

  useEffect(() => {
    let ignore = false;

    const ucitaj = async () => {
      setUcitavanje(true);
      try {
        const res = await getTermini();
        if (!ignore)
          setTermini(res.data.filter((t) => t.status === "ZAVRSENO"));
      } catch {
        if (!ignore) setGreska("Greška pri učitavanju termina.");
      } finally {
        if (!ignore) setUcitavanje(false);
      }
    };

    ucitaj();
    return () => {
      ignore = true;
    };
  }, []);

  const handleIzaberiTermin = async (termin: Termin) => {
    setIzabraniTermin(termin);
    setForma({ dijagnoza: "", terapija: "", anamneza: "" });
    setPoruka("");
    setGreska("");
    try {
      const res = await getIzvestajiZaPacijenta(termin.pacijent.id);
      setIstorija(res.data);
    } catch {
      setIstorija([]);
    }
  };

  const handleUnos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!izabraniTermin) return;
    setGreska("");
    try {
      await dodajIzvestaj({
        terminId: izabraniTermin.id,
        dijagnoza: forma.dijagnoza,
        terapija: forma.terapija,
        anamneza: forma.anamneza,
      });
      setPoruka("Izveštaj uspešno sačuvan.");
      setForma({ dijagnoza: "", terapija: "", anamneza: "" });
      const res = await getIzvestajiZaPacijenta(izabraniTermin.pacijent.id);
      setIstorija(res.data);
    } catch {
      setGreska(
        "Greška pri čuvanju izveštaja (možda već postoji za ovaj termin).",
      );
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
        <h2>Izveštaji sa pregleda</h2>
        <button onClick={logout}>Odjavi se</button>
      </div>

      {greska && <p style={{ color: "red" }}>{greska}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 24,
          marginTop: 16,
        }}
      >
        <div>
          <h3>Završeni termini bez izveštaja</h3>
          {ucitavanje ? (
            <p>Učitavanje...</p>
          ) : termini.length === 0 ? (
            <p>Nema završenih termina.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {termini.map((t) => (
                <li
                  key={t.id}
                  onClick={() => handleIzaberiTermin(t)}
                  style={{
                    padding: 10,
                    marginBottom: 6,
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    cursor: "pointer",
                    background:
                      izabraniTermin?.id === t.id ? "#f0f4ff" : "white",
                  }}
                >
                  <strong>
                    {t.pacijent.ime} {t.pacijent.prezime}
                  </strong>
                  <br />
                  {new Date(t.datumVreme).toLocaleString("sr-RS")} —{" "}
                  {t.usluga.naziv}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {izabraniTermin ? (
            <>
              <h3>
                Unos izveštaja — {izabraniTermin.pacijent.ime}{" "}
                {izabraniTermin.pacijent.prezime}
              </h3>
              {poruka && <p style={{ color: "green" }}>{poruka}</p>}
              <form onSubmit={handleUnos} style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 8 }}>
                  <label>Dijagnoza</label>
                  <textarea
                    value={forma.dijagnoza}
                    onChange={(e) =>
                      setForma({ ...forma, dijagnoza: e.target.value })
                    }
                    required
                    style={{ width: "100%", minHeight: 60, padding: 8 }}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>Terapija</label>
                  <textarea
                    value={forma.terapija}
                    onChange={(e) =>
                      setForma({ ...forma, terapija: e.target.value })
                    }
                    style={{ width: "100%", minHeight: 60, padding: 8 }}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>Anamneza</label>
                  <textarea
                    value={forma.anamneza}
                    onChange={(e) =>
                      setForma({ ...forma, anamneza: e.target.value })
                    }
                    style={{ width: "100%", minHeight: 60, padding: 8 }}
                  />
                </div>
                <button type="submit">Sačuvaj izveštaj</button>
              </form>

              <h3>Istorija pregleda pacijenta</h3>
              {istorija.length === 0 ? (
                <p>Nema ranijih izveštaja.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {istorija.map((iz) => (
                    <li
                      key={iz.id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 6,
                        padding: 10,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ fontSize: 13, color: "#666" }}>
                        {new Date(iz.kreiranoAt).toLocaleString("sr-RS")} —{" "}
                        {formatDoctorName(
                          iz.dermatolog.ime,
                          iz.dermatolog.prezime,
                          "DERMATOLOG",
                        )}
                      </div>
                      <div>
                        <strong>Dijagnoza:</strong> {iz.dijagnoza}
                      </div>
                      {iz.terapija && (
                        <div>
                          <strong>Terapija:</strong> {iz.terapija}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p>Izaberite termin sa leve strane da unesete izveštaj.</p>
          )}
        </div>
      </div>
    </div>
  );
}
