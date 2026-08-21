import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import "./Login.style.css";

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
      setGreska("Pogrešan email ili lozinka. Pokušajte ponovo.");
    } finally {
      setUcitavanje(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-form-panel">
          <div className="login-header">
            <div className="login-brand">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Dermatološki Centar
            </div>
            <h1 className="login-title">Dobro došli nazad</h1>
            <p className="login-description">
              Unesite vaše pristupne podatke za ulazak u sistem.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label className="login-label" htmlFor="email">
                Email adresa
              </label>
              <input
                className="login-input"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ime@dermatologija.rs"
                required
              />
            </div>
            <div className="login-field-password">
              <label className="login-label" htmlFor="lozinka">
                Lozinka
              </label>
              <input
                className="login-input"
                id="lozinka"
                type="password"
                value={lozinka}
                onChange={(e) => setLozinka(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {greska && (
              <div className="login-error">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {greska}
              </div>
            )}

            <button
              className="login-button"
              type="submit"
              disabled={ucitavanje}
            >
              {ucitavanje ? "Prijavljivanje u toku..." : "Prijavi se"}
            </button>
          </form>

          <p className="login-copyright">
            © {new Date().getFullYear()} Dermatološki Centar. Sva prava
            zadržana.
          </p>
        </div>

        <div className="login-image-panel">
          <div className="login-image-overlay" />
          <div className="login-image-content">
            <h2 className="login-image-title">
              Napredna nega i stručna dermatološka dijagnostika
            </h2>
            <p className="login-image-description">
              Integrisani portal za upravljanje kartonima pacijenata, terminima
              i medicinskim izveštajima.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
