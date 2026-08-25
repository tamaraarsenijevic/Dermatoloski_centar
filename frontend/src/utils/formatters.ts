import type { Uloga } from "../types";

export function formatDoctorName(
  ime: string,
  prezime: string,
  uloga?: Uloga,
): string {
  const imeIPrezime = `${ime} ${prezime}`.trim();

  if (uloga === "DERMATOLOG") {
    return `Dr ${imeIPrezime}`;
  }

  return imeIPrezime;
}
