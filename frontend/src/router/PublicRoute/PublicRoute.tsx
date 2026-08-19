import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

interface Props {
  children: React.ReactNode;
}

export default function PublicRoute({ children }: Props) {
  const { user, loading } = useAuth();

  // Dok se proverava sesija, ne prikazuj ništa (izbegava treperenje)
  if (loading) return <p>Učitavanje...</p>;

  // Ako je korisnik već ulogovan, ne dozvoli pristup ovoj ruti (npr. login)
  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
}
