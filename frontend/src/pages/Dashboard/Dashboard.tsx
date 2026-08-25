import React, { useState, useEffect } from "react";
import API from "../../api/api";
import type { Pacijent, Termin, Zaposleni } from "../../types";
import { formatDoctorName } from "../../utils/formatters";

interface DashboardProps {
  zaposleni: Zaposleni;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  zaposleni,
  onLogout,
}) => {
  const [pacijenti, setPacijenti] = useState<Pacijent[]>([]);
  const [termini, setTermini] = useState<Termin[]>([]);
  const [pretraga, setPretraga] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const ucitajPodatke = async (): Promise<void> => {
      try {
        const [resPacijenti, resTermini] = await Promise.all([
          API.get<Pacijent[]>("/pacijenti"),
          API.get<Termin[]>("/termini"),
        ]);

        if (!isMounted) return;

        setPacijenti(resPacijenti.data);
        setTermini(resTermini.data);
      } catch (err: unknown) {
        console.error("Greška pri učitavanju podataka:", err);
      }
    };

    void ucitajPodatke();

    return () => {
      isMounted = false;
    };
  }, []);

  const Pretrazi = async (): Promise<void> => {
    try {
      const res = await API.get<Pacijent[]>(`/pacijenti?pretraga=${pretraga}`);
      setPacijenti(res.data);
    } catch (err: unknown) {
      console.error("Greška pri pretrazi:", err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Dermatološki Centar - Dashboard</h1>
        <div>
          <span>
            Dobrodošli,{" "}
            {formatDoctorName(
              zaposleni.ime,
              zaposleni.prezime,
              zaposleni.uloga,
            )}
          </span>
          <button onClick={onLogout} style={{ marginLeft: "10px" }}>
            Odjava
          </button>
        </div>
      </header>

      <section style={{ marginTop: "20px" }}>
        <input
          type="text"
          placeholder="Pretraži pacijente..."
          value={pretraga}
          onChange={(e) => setPretraga(e.target.value)}
        />
        <button onClick={() => void Pretrazi()}>Pretraži</button>
      </section>

      <section style={{ marginTop: "30px" }}>
        <h2>Pacijenti ({pacijenti.length})</h2>
        <ul>
          {pacijenti.map((p) => (
            <li key={p.id}>
              {p.ime} {p.prezime} - {p.jmbg}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: "30px" }}>
        <h2>Zakazani Termini ({termini.length})</h2>
        <ul>
          {termini.map((t) => (
            <li key={t.id}>
              {new Date(t.datumVreme).toLocaleString("sr-Latn-RS")} -{" "}
              {t.usluga?.naziv ?? "Usluga"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default Dashboard;
