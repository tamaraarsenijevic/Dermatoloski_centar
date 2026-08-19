import http from "./http";
import type { Usluga } from "../types";

export const getUsluge = () => http.get<Usluga[]>("/usluge");
