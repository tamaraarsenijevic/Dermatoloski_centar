import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosResponse } from "axios";
import Pacijenti from "./Pacijenti";
import * as pacijentiApi from "../../../api/pacijenti";
import type { Pacijent } from "../../../types";

const makeAxiosResponse = <T,>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {} as AxiosResponse<T>["headers"],
  config: {} as AxiosResponse<T>["config"],
});

vi.mock("../../../api/pacijenti");
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("Pacijenti", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prikazuje poruku za učitavanje početno", () => {
    vi.mocked(pacijentiApi.getPacijenti).mockReturnValue(
      new Promise<AxiosResponse<Pacijent[]>>(() => undefined),
    );
    render(<Pacijenti />);
    expect(screen.getByText("Učitavanje...")).toBeInTheDocument();
  });

  it("učitava i prikazuje sve pacijente", async () => {
    const mockPacijenti = [
      {
        id: 1,
        ime: "Jovana",
        prezime: "Jovanović",
        jmbg: "1234567890123",
        telefon: "0601234567",
        email: "jovana@test.com",
        napomena: "Osjetljiva koža",
      },
      {
        id: 2,
        ime: "Marko",
        prezime: "Marković",
        jmbg: "9876543210987",
        telefon: "0602345678",
        email: "marko@test.com",
        napomena: "",
      },
    ];

    vi.mocked(pacijentiApi.getPacijenti).mockResolvedValue(
      makeAxiosResponse<Pacijent[]>(mockPacijenti),
    );

    render(<Pacijenti />);

    await waitFor(() => {
      expect(screen.getByText("Jovana Jovanović")).toBeInTheDocument();
      expect(screen.getByText("Marko Marković")).toBeInTheDocument();
    });
  });

  it("prikazuje grešku ako učitavanje ne uspe", async () => {
    vi.mocked(pacijentiApi.getPacijenti).mockRejectedValue(
      new Error("API greška"),
    );

    render(<Pacijenti />);

    await waitFor(() => {
      expect(
        screen.getByText("Greška pri učitavanju pacijenata."),
      ).toBeInTheDocument();
    });
  });

  it("filtrira pacijente po pretrazi", async () => {
    const mockPacijenti = [
      {
        id: 1,
        ime: "Jovana",
        prezime: "Jovanović",
        jmbg: "1234567890123",
        telefon: "0601234567",
        email: "jovana@test.com",
        napomena: "",
      },
      {
        id: 2,
        ime: "Marko",
        prezime: "Marković",
        jmbg: "9876543210987",
        telefon: "0602345678",
        email: "marko@test.com",
        napomena: "",
      },
    ];

    vi.mocked(pacijentiApi.getPacijenti)
      .mockImplementationOnce(async () =>
        makeAxiosResponse<Pacijent[]>(mockPacijenti),
      )
      .mockImplementationOnce(async () =>
        makeAxiosResponse<Pacijent[]>([mockPacijenti[0]]),
      );

    const user = userEvent.setup();
    render(<Pacijenti />);

    await waitFor(() => {
      expect(screen.getByText("Jovana Jovanović")).toBeInTheDocument();
    });

    const searchField = screen.getByPlaceholderText(
      /pretraga|Search/i,
    ) as HTMLInputElement;
    await user.type(searchField, "Jovana");

    await waitFor(
      () => {
        expect(pacijentiApi.getPacijenti).toHaveBeenCalledWith("Jovana");
      },
      { timeout: 500 },
    );
  });

  it("prikazuje formu za dodavanje pacijenta", async () => {
    vi.mocked(pacijentiApi.getPacijenti).mockResolvedValue(
      makeAxiosResponse<Pacijent[]>([]),
    );

    render(<Pacijenti />);

    await waitFor(() => {
      expect(
        screen.getByText("Nema pacijenata za zadatu pretragu."),
      ).toBeInTheDocument();
    });

    const dodajBtn = screen.getByRole("button", { name: /dodaj pacijenta/i });
    fireEvent.click(dodajBtn);

    await waitFor(() => {
      expect(screen.getByLabelText("Ime *")).toBeInTheDocument();
    });
  });

  it("kreira novog pacijenta", async () => {
    vi.mocked(pacijentiApi.getPacijenti).mockResolvedValue(
      makeAxiosResponse<Pacijent[]>([]),
    );
    vi.mocked(pacijentiApi.dodajPacijenta).mockResolvedValue(
      makeAxiosResponse<Pacijent>({
        id: 3,
        ime: "Petar",
        prezime: "Petrović",
        jmbg: "5555555555555",
        telefon: "0603456789",
        email: "petar@test.com",
        napomena: "",
      }),
    );

    const user = userEvent.setup();
    render(<Pacijenti />);

    await waitFor(() => {
      expect(
        screen.getByText("Nema pacijenata za zadatu pretragu."),
      ).toBeInTheDocument();
    });

    const dodajBtn = screen.getByRole("button", { name: /dodaj|novi/i });
    fireEvent.click(dodajBtn);

    const imeInput = screen.getByLabelText("Ime *");
    await user.type(imeInput, "Petar");
    await user.type(screen.getByLabelText("Prezime *"), "Petrović");
    await user.type(screen.getByLabelText("JMBG *"), "5555555555555");

    const submitBtn = screen.getByRole("button", { name: /sačuvaj|spremi/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(pacijentiApi.dodajPacijenta).toHaveBeenCalled();
    });
  });
});
