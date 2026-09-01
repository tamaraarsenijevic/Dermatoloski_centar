import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AxiosResponse } from "axios";
import userEvent from "@testing-library/user-event";
import type { Zaposleni } from "../../../types";
import Dermatolozi from "./Dermatolozi";
import * as zaposleniApi from "../../../api/zaposleni";
import { useAuth } from "../../../context/useAuth";

const makeAxiosResponse = <T,>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {} as AxiosResponse<T>["headers"],
  config: {} as AxiosResponse<T>["config"],
});

vi.mock("../../../api/zaposleni");
vi.mock("../../../context/useAuth");
vi.mock("axios", () => ({
  default: {
    create: () => ({}),
    isAxiosError: () => true,
  },
}));
vi.mock("../../../utils/formatters", () => ({
  formatDoctorName: (ime: string, prezime: string) => `${ime} ${prezime}`,
}));

describe("Dermatolozi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const adminUser: Zaposleni = {
      id: 7,
      ime: "Admin",
      prezime: "Adminović",
      email: "admin@test.com",
      telefon: "061000000",
      uloga: "ADMIN",
      aktivan: true,
    };

    vi.mocked(useAuth).mockReturnValue({
      user: adminUser,
      loading: false,
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("prikazuje poruku za učitavanje početno", () => {
    vi.mocked(zaposleniApi.getZaposleni).mockReturnValue(
      new Promise<AxiosResponse<Zaposleni[]>>(() => undefined),
    );
    render(<Dermatolozi />);
    expect(screen.getByText("Učitavanje zaposlenih...")).toBeInTheDocument();
  });

  it("učitava i prikazuje sve zaposlene", async () => {
    const mockZaposleni: Zaposleni[] = [
      {
        id: 8,
        ime: "Petar",
        prezime: "Petrović",
        email: "petar@test.com",
        telefon: "060",
        uloga: "DERMATOLOG",
        aktivan: true,
      },
      {
        id: 9,
        ime: "Maja",
        prezime: "Majić",
        email: "maja@test.com",
        telefon: "061",
        uloga: "DERMATOLOG",
        aktivan: true,
      },
    ];

    vi.mocked(zaposleniApi.getZaposleni).mockResolvedValue(
      makeAxiosResponse(mockZaposleni),
    );
    render(<Dermatolozi />);

    await waitFor(() => {
      expect(screen.getByText("Petar Petrović")).toBeInTheDocument();
      expect(screen.getByText("Maja Majić")).toBeInTheDocument();
    });
  });

  it("prikazuje grešku ako učitavanje ne uspe", async () => {
    vi.mocked(zaposleniApi.getZaposleni).mockRejectedValue(
      new Error("API greška"),
    );

    render(<Dermatolozi />);

    await waitFor(() => {
      expect(
        screen.getByText("Greška pri učitavanju zaposlenih."),
      ).toBeInTheDocument();
    });
  });

  it("kreira novog dermatologa", async () => {
    vi.mocked(zaposleniApi.getZaposleni).mockResolvedValue(
      makeAxiosResponse<Zaposleni[]>([]),
    );
    vi.mocked(zaposleniApi.dodajZaposlenog).mockResolvedValue(
      makeAxiosResponse<Zaposleni>({
        id: 10,
        ime: "Nikola",
        prezime: "Nikolić",
        email: "nikola@test.com",
        telefon: "062",
        uloga: "DERMATOLOG",
        aktivan: true,
      }),
    );

    const user = userEvent.setup();
    render(<Dermatolozi />);

    await waitFor(() => {
      expect(
        screen.getByText("Trenutno nema registrovanih zaposlenih."),
      ).toBeInTheDocument();
    });

    const dodajBtn = screen.getByRole("button", { name: /dodaj|novi/i });
    fireEvent.click(dodajBtn);

    const imeInput = screen.getByLabelText("Ime");
    await user.type(imeInput, "Nikola");
    await user.type(screen.getByLabelText("Prezime"), "Nikolić");
    await user.type(screen.getByLabelText("Email adresa"), "nikola@test.com");
    await user.type(screen.getByLabelText("Broj telefona"), "062");
    await user.type(screen.getByLabelText("Lozinka"), "lozinka");

    const submitBtn = screen.getByRole("button", {
      name: /sačuvaj|spremi/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(zaposleniApi.dodajZaposlenog).toHaveBeenCalled();
    });
  });

  it("menja status zaposlenog", async () => {
    const mockZaposleni: Zaposleni[] = [
      {
        id: 8,
        ime: "Petar",
        prezime: "Petrović",
        email: "petar@test.com",
        telefon: "060",
        uloga: "DERMATOLOG",
        aktivan: true,
      },
    ];

    vi.mocked(zaposleniApi.getZaposleni).mockResolvedValue(
      makeAxiosResponse(mockZaposleni),
    );
    vi.mocked(zaposleniApi.izmeniZaposlenog).mockResolvedValue(
      makeAxiosResponse({ ...mockZaposleni[0], aktivan: false }),
    );

    render(<Dermatolozi />);

    await waitFor(() => {
      expect(screen.getByText("Petar Petrović")).toBeInTheDocument();
    });

    const statusBtn = screen.getByRole("button", {
      name: /deaktiviraj|deaktiviran/i,
    });
    fireEvent.click(statusBtn);

    await waitFor(() => {
      expect(zaposleniApi.izmeniZaposlenog).toHaveBeenCalled();
    });
  });

  it("otvara modal za brisanje", async () => {
    const mockZaposleni: Zaposleni[] = [
      {
        id: 8,
        ime: "Petar",
        prezime: "Petrović",
        email: "petar@test.com",
        telefon: "060",
        uloga: "DERMATOLOG",
        aktivan: true,
      },
    ];

    vi.mocked(zaposleniApi.getZaposleni).mockResolvedValue(
      makeAxiosResponse(mockZaposleni),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(zaposleniApi.obrisiZaposlenog).mockResolvedValue(
      makeAxiosResponse({}),
    );

    render(<Dermatolozi />);

    await waitFor(() => {
      expect(screen.getByText("Petar Petrović")).toBeInTheDocument();
    });

    const obrisiBtn = screen.getByRole("button", { name: /obriši/i });
    fireEvent.click(obrisiBtn);

    await waitFor(() => {
      expect(zaposleniApi.obrisiZaposlenog).toHaveBeenCalledWith(8);
    });
  });
});
