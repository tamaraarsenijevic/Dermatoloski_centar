import { useContext } from "react";
import { AuthContext } from "./AuthContext/AuthContext.types";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth mora biti unutar AuthProvider-a");
  return context;
}
