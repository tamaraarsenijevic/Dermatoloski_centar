import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AxiosResponse } from "axios";
import userEvent from "@testing-library/user-event";
import type { Usluga } from "../../../types";
import UslugeLista from "./Usluge";
import * as uslugeApi from "../../../api/usluge";

const makeAxiosResponse = <T,>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {} as AxiosResponse<T>["headers"],
  config: {} as AxiosResponse<T>["config"],
});

vi.mock("../../../api/usluge");

describe("Usluge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("prikazuje poruku za učitavanje početno", () => {
    vi.mocked(uslugeApi.getUsluge).mockReturnValue(
      new Promise<AxiosResponse<Usluga[]>>(() => undefined),
    );
    render(<UslugeLista />);
    expect(screen.getByText("Učitavanje...")).toBeInTheDocument();
  });

  it("učitava i prikazuje sve usluge", async () => {
    const mockUsluge: Usluga[] = [
      {
        id: 1,
        naziv: "Kontrola",
        opis: "Pregled",
        trajanjeMin: 30,
        cena: 1800,
      },
      {
        id: 2,
        naziv: "Tretman",
        opis: "Lečenje",
        trajanjeMin: 45,
        cena: 2500,
      },
    ];

    vi.mocked(uslugeApi.getUsluge).mockResolvedValue(
      makeAxiosResponse(mockUsluge),
    );

    render(<UslugeLista />);

    await waitFor(() => {
      expect(screen.getAllByText("Kontrola")[0]).toBeInTheDocument();
      expect(screen.getByText("Tretman")).toBeInTheDocument();
    });
  });

  it("prikazuje grešku ako učitavanje ne uspe", async () => {
    vi.mocked(uslugeApi.getUsluge).mockRejectedValue(new Error("API greška"));

    render(<UslugeLista />);

    await waitFor(() => {
      expect(
        screen.getByText("Greška pri učitavanju usluga."),
      ).toBeInTheDocument();
    });
  });

  it("prikazuje poruku ako nema usluga", async () => {
    vi.mocked(uslugeApi.getUsluge).mockResolvedValue(
      makeAxiosResponse<Usluga[]>([]),
    );

    render(<UslugeLista />);

    await waitFor(() => {
      expect(screen.getByText("Nema unetih usluga.")).toBeInTheDocument();
    });
  });

  it("kreira novu uslugu", async () => {
    vi.mocked(uslugeApi.getUsluge).mockResolvedValue(
      makeAxiosResponse<Usluga[]>([]),
    );
    vi.mocked(uslugeApi.dodajUslugu).mockResolvedValue(
      makeAxiosResponse<Usluga>({
        id: 3,
        naziv: "Nova usluga",
        opis: "Novi tretman",
        trajanjeMin: 60,
        cena: 3000,
      }),
    );

    const user = userEvent.setup();
    render(<UslugeLista />);

    await waitFor(() => {
      expect(screen.getByText("Nema unetih usluga.")).toBeInTheDocument();
    });

    const dodajBtn = screen.getByRole("button", { name: /dodaj|novi/i });
    fireEvent.click(dodajBtn);

    const nazivInput = screen.getByLabelText("Naziv usluge *");
    await user.type(nazivInput, "Nova usluga");

    const submitBtn = screen.getByRole("button", { name: "Dodaj uslugu" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(uslugeApi.dodajUslugu).toHaveBeenCalled();
    });
  });

  it("uređuje postojeću uslugu", async () => {
    const mockUsluge: Usluga[] = [
      {
        id: 1,
        naziv: "Kontrola",
        opis: "Pregled",
        trajanjeMin: 30,
        cena: 1800,
      },
    ];

    vi.mocked(uslugeApi.getUsluge).mockResolvedValue(
      makeAxiosResponse(mockUsluge),
    );
    vi.mocked(uslugeApi.izmeniUslugu).mockResolvedValue(
      makeAxiosResponse<Usluga>({
        id: 1,
        naziv: "Kontrola Plus",
        opis: "Detaljniji pregled",
        trajanjeMin: 45,
        cena: 2200,
      }),
    );

    const user = userEvent.setup();
    render(<UslugeLista />);

    await waitFor(() => {
      expect(screen.getAllByText("Kontrola")[0]).toBeInTheDocument();
    });

    const urediBtn = screen.getByRole("button", { name: /uredi|izmeni/i });
    fireEvent.click(urediBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Kontrola")).toBeInTheDocument();
    });

    const nazivInput = screen.getByDisplayValue("Kontrola") as HTMLInputElement;
    await user.clear(nazivInput);
    await user.type(nazivInput, "Kontrola Plus");

    const submitBtn = screen.getByRole("button", {
      name: /sačuvaj|spremi/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(uslugeApi.izmeniUslugu).toHaveBeenCalled();
    });
  });

  it("briše uslugu", async () => {
    const mockUsluge: Usluga[] = [
      {
        id: 1,
        naziv: "Kontrola",
        opis: "Pregled",
        trajanjeMin: 30,
        cena: 1800,
      },
    ];

    vi.mocked(uslugeApi.getUsluge).mockResolvedValue(
      makeAxiosResponse(mockUsluge),
    );
    vi.mocked(uslugeApi.obrisiUslugu).mockResolvedValue(
      makeAxiosResponse({ poruka: "Obrisano" }),
    );

    render(<UslugeLista />);

    await waitFor(() => {
      expect(screen.getAllByText("Kontrola")[0]).toBeInTheDocument();
    });

    const obrisiBtn = screen.getByRole("button", { name: /obriši/i });
    fireEvent.click(obrisiBtn);

    await waitFor(() => {
      expect(uslugeApi.obrisiUslugu).toHaveBeenCalled();
    });
  });

  it("onemogućava uslugu bez brisanja", async () => {
    const mockUsluga: Usluga = {
      id: 1,
      naziv: "Kontrola",
      opis: "Pregled",
      trajanjeMin: 30,
      cena: 1800,
      aktivan: true,
    };

    vi.mocked(uslugeApi.getUsluge).mockResolvedValue(
      makeAxiosResponse([mockUsluga]),
    );
    vi.mocked(uslugeApi.izmeniUslugu).mockResolvedValue(
      makeAxiosResponse({ ...mockUsluga, aktivan: false }),
    );

    render(<UslugeLista />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Deaktiviraj" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Deaktiviraj" }));

    await waitFor(() => {
      expect(uslugeApi.izmeniUslugu).toHaveBeenCalledWith(1, {
        aktivan: false,
      });
    });
  });

  it("prikazuje formu za dodavanje usluge", async () => {
    vi.mocked(uslugeApi.getUsluge).mockResolvedValue(
      makeAxiosResponse<Usluga[]>([]),
    );

    render(<UslugeLista />);

    await waitFor(() => {
      expect(screen.getByText("Nema unetih usluga.")).toBeInTheDocument();
    });

    const dodajBtn = screen.getByRole("button", { name: /dodaj|novi/i });
    fireEvent.click(dodajBtn);

    await waitFor(() => {
      expect(screen.getAllByDisplayValue("")[0]).toBeInTheDocument();
    });
  });
});
