import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [greska, setGreska] = useState("");
  const [ucitavanje, setUcitavanje] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGreska("");
    setUcitavanje(true);
    try {
      await login(email, lozinka);
      navigate("/");
    } catch {
      setGreska("Pogrešan email ili lozinka.");
    } finally {
      setUcitavanje(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "80px auto",
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 8,
      }}
    >
      <h2>Prijava</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="lozinka">Lozinka</label>
          <input
            id="lozinka"
            type="password"
            value={lozinka}
            onChange={(e) => setLozinka(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>

        {greska && <p style={{ color: "red" }}>{greska}</p>}

        <button
          type="submit"
          disabled={ucitavanje}
          style={{ width: "100%", padding: 10 }}
        >
          {ucitavanje ? "Prijavljivanje..." : "Prijavi se"}
        </button>
      </form>
    </div>
  );
}
