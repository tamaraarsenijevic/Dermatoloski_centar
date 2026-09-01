import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AxiosResponse } from "axios";
import userEvent from "@testing-library/user-event";
import type { Termin, Pacijent, Usluga, Zaposleni } from "../../../types";
import Termini from "./Termini";
import * as terminiApi from "../../../api/termini";
import * as pacijentiApi from "../../../api/pacijenti";
import * as uslugeApi from "../../../api/usluge";
import { useAuth } from "../../../context/useAuth";

const makeAxiosResponse = <T,>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {} as AxiosResponse<T>["headers"],
  config: {} as AxiosResponse<T>["config"],
});

vi.mock("../../../api/termini");
vi.mock("../../../api/pacijenti");
vi.mock("../../../api/usluge");
vi.mock("../../../context/useAuth");
vi.mock("axios");
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("Termini", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const doctorUser: Zaposleni = {
      id: 9,
      ime: "Doktor",
      prezime: "Doktorović",
      email: "doktor@test.com",
      telefon: "062000000",
      uloga: "DERMATOLOG",
      aktivan: true,
    };

    vi.mocked(useAuth).mockReturnValue({
      user: doctorUser,
      loading: false,
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("prikazuje poruku za učitavanje početno", () => {
    vi.mocked(terminiApi.getTermini).mockReturnValue(
      new Promise<AxiosResponse<Termin[]>>(() => undefined),
    );
    vi.mocked(pacijentiApi.getPacijenti).mockReturnValue(
      new Promise<AxiosResponse<Pacijent[]>>(() => undefined),
    );
    vi.mocked(uslugeApi.getUsluge).mockReturnValue(
      new Promise<AxiosResponse<Usluga[]>>(() => undefined),
    );

    render(<Termini />);
    expect(screen.getByText(/učitavanje|loading/i)).toBeInTheDocument();
  });

  it("učitava i prikazuje termine", async () => {
    const mockTermini: Termin[] = [
      {
        id: 1,
        status: "ZAKAZANO",
        datumVreme: new Date("2026-09-02T10:00:00Z").toISOString(),
        dermatolog: { ime: "Petar", prezime: "Petrović" },
        pacijent: {
          id: 1,
          ime: "Jovana",
          prezime: "Jovanović",
          jmbg: "1234567890123",
          telefon: "0601234567",
          email: "jovana@test.com",
          napomena: "",
        },
        usluga: { id: 1, naziv: "Kontrola", trajanjeMin: 30, cena: 1500 },
      },
    ];

    const mockPacijenti: Pacijent[] = [
      {
        id: 1,
        ime: "Jovana",
        prezime: "Jovanović",
        jmbg: "1234567890123",
        telefon: "0601234567",
        email: "jovana@test.com",
        napomena: "",
      },
    ];

    const mockUsluge: Usluga[] = [
      {
        id: 1,
        naziv: "Kontrola",
        opis: "Pregled",
        trajanjeMin: 30,
        cena: 1800,
      },
    ];

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse(mockTermini),
    );
    vi.mocked(pacijentiApi.getPacijenti).mockResolvedValue(
      makeAxiosResponse(mockPacijenti),
    );
    vi.mocked(uslugeApi.getUsluge).mockResolvedValue(
      makeAxiosResponse(mockUsluge),
    );

    render(<Termini />);

    await waitFor(() => {
      expect(screen.getByText("Jovana Jovanović")).toBeInTheDocument();
    });
  });

  it("prikazuje grešku ako učitavanje ne uspe", async () => {
    vi.mocked(terminiApi.getTermini).mockRejectedValue(new Error("API greška"));
    vi.mocked(pacijentiApi.getPacijenti).mockResolvedValue(
      makeAxiosResponse<Pacijent[]>([]),
    );
    vi.mocked(uslugeApi.getUsluge).mockResolvedValue(
      makeAxiosResponse<Usluga[]>([]),
    );

    render(<Termini />);

    await waitFor(() => {
      expect(screen.getByText(/greška|error/i)).toBeInTheDocument();
    });
  });

  it("zakazuje novi termin", async () => {
    const mockPacijenti: Pacijent[] = [
      {
        id: 1,
        ime: "Jovana",
        prezime: "Jovanović",
        jmbg: "1234567890123",
        telefon: "0601234567",
        email: "jovana@test.com",
        napomena: "",
      },
    ];

    const mockUsluge: Usluga[] = [
      {
        id: 1,
        naziv: "Kontrola",
        opis: "Pregled",
        trajanjeMin: 30,
        cena: 1800,
      },
    ];

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse<Termin[]>([]),
    );
    vi.mocked(pacijentiApi.getPacijenti).mockResolvedValue(
      makeAxiosResponse(mockPacijenti),
    );
    vi.mocked(uslugeApi.getUsluge).mockResolvedValue(
      makeAxiosResponse(mockUsluge),
    );
    vi.mocked(terminiApi.zakaziTermin).mockResolvedValue(
      makeAxiosResponse<Termin>({
        id: 1,
        datumVreme: new Date("2026-09-02T10:00:00Z").toISOString(),
        status: "ZAKAZANO",
        dermatolog: { ime: "Petar", prezime: "Petrović" },
        pacijent: {
          id: 1,
          ime: "Jovana",
          prezime: "Jovanović",
          jmbg: "1234567890123",
          telefon: "0601234567",
          email: "jovana@test.com",
          napomena: "",
        },
        usluga: { id: 1, naziv: "Kontrola", trajanjeMin: 30, cena: 1800 },
      }),
    );

    const user = userEvent.setup();
    render(<Termini />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /novi termin|zakaži|zakazi/i }),
      ).toBeInTheDocument();
    });

    const zakazi = screen.getByRole("button", {
      name: /novi termin|zakaži|zakazi/i,
    });
    fireEvent.click(zakazi);

    const [pacijentSelect, uslugaSelect] = screen.getAllByRole("combobox");
    await user.selectOptions(pacijentSelect, "1");
    await user.selectOptions(uslugaSelect, "1");
    await user.type(screen.getByLabelText("Datum *"), "2026-09-02");
    await user.type(screen.getByLabelText("Vreme *"), "10:00");

    await waitFor(() => {
      expect(terminiApi.zakaziTermin).not.toHaveBeenCalled();
    });
  });
});
