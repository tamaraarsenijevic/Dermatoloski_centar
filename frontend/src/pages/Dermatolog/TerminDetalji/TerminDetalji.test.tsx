import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AxiosResponse } from "axios";
import userEvent from "@testing-library/user-event";
import type { Termin, Izvestaj } from "../../../types";
import TerminDetalji from "./TerminDetalji";
import * as terminiApi from "../../../api/termini";
import * as izvestajiApi from "../../../api/izvestaji";

const makeAxiosResponse = <T,>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {} as AxiosResponse<T>["headers"],
  config: {} as AxiosResponse<T>["config"],
});

vi.mock("../../../api/termini");
vi.mock("../../../api/izvestaji");
vi.mock("../../../utils/izvestajPdf");
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "1" }),
    useNavigate: () => vi.fn(),
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

describe("TerminDetalji", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prikazuje poruku za učitavanje početno", () => {
    vi.mocked(terminiApi.getTermini).mockReturnValue(
      new Promise<AxiosResponse<Termin[]>>(() => undefined),
    );

    render(<TerminDetalji />);
    expect(screen.getByText("Učitavanje...")).toBeInTheDocument();
  });

  it("prikazuje detalje termina", async () => {
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
        },
        usluga: { id: 1, naziv: "Kontrola", trajanjeMin: 30, cena: 1500 },
      },
    ];

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse(mockTermini),
    );
    vi.mocked(izvestajiApi.getIzvestajZaTermin).mockRejectedValue(
      new Error("Nema izvestaja"),
    );

    render(<TerminDetalji />);

    await waitFor(() => {
      expect(screen.getAllByText("Jovana Jovanović")[0]).toBeInTheDocument();
      expect(screen.getByText("1234567890123")).toBeInTheDocument();
    });
  });

  it("prikazuje grešku ako termin ne postoji", async () => {
    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse<Termin[]>([]),
    );

    render(<TerminDetalji />);

    await waitFor(() => {
      expect(screen.getByText("Termin nije pronađen.")).toBeInTheDocument();
    });
  });

  it("učitava i prikazuje postojeći izveštaj", async () => {
    const mockTermini: Termin[] = [
      {
        id: 1,
        status: "ZAVRSENO",
        datumVreme: new Date("2026-09-02T10:00:00Z").toISOString(),
        dermatolog: { ime: "Petar", prezime: "Petrović" },
        pacijent: {
          id: 1,
          ime: "Jovana",
          prezime: "Jovanović",
          jmbg: "1234567890123",
          telefon: "0601234567",
          email: "jovana@test.com",
        },
        usluga: { id: 1, naziv: "Kontrola", trajanjeMin: 30, cena: 1500 },
      },
    ];

    const mockIzvestaj: Izvestaj = {
      id: 1,
      dijagnoza: "Akne",
      terapija: "Lokalna primena",
      anamneza: "Pacijent se žali na...",
      kreiranoAt: new Date("2026-09-02T10:00:00Z").toISOString(),
      dermatolog: { ime: "Petar", prezime: "Petrović" },
    };

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse(mockTermini),
    );
    vi.mocked(izvestajiApi.getIzvestajZaTermin).mockResolvedValue(
      makeAxiosResponse(mockIzvestaj),
    );

    render(<TerminDetalji />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Akne")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Lokalna primena")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Sačuvaj izmene" }),
      ).toBeDisabled();
    });
  });

  it("menja status termina", async () => {
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
        },
        usluga: { id: 1, naziv: "Kontrola", trajanjeMin: 30, cena: 1500 },
      },
    ];

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse(mockTermini),
    );
    vi.mocked(izvestajiApi.getIzvestajZaTermin).mockRejectedValue(
      new Error("Nema izvestaja"),
    );
    vi.mocked(terminiApi.izmeniTermin).mockResolvedValue(
      makeAxiosResponse<Termin>({ ...mockTermini[0], status: "ZAVRSENO" }),
    );

    render(<TerminDetalji />);

    await waitFor(() => {
      expect(screen.getAllByText("Jovana Jovanović")[0]).toBeInTheDocument();
    });

    const zavrsBtn = screen.getByRole("button", {
      name: /završeno|zavrseno/i,
    });
    fireEvent.click(zavrsBtn);

    await waitFor(() => {
      expect(terminiApi.izmeniTermin).toHaveBeenCalledWith(1, {
        status: "ZAVRSENO",
      });
    });
  });

  it("menja datum i vreme termina", async () => {
    const mockTermin: Termin = {
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
      },
      usluga: { id: 1, naziv: "Kontrola", trajanjeMin: 30, cena: 1500 },
    };

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse([mockTermin]),
    );
    vi.mocked(izvestajiApi.getIzvestajZaTermin).mockRejectedValue(
      new Error("Nema izvestaja"),
    );
    vi.mocked(terminiApi.izmeniTermin).mockResolvedValue(
      makeAxiosResponse({
        ...mockTermin,
        datumVreme: new Date("2026-09-03T11:30:00Z").toISOString(),
      }),
    );

    const user = userEvent.setup();
    render(<TerminDetalji />);

    await waitFor(() => {
      expect(screen.getByLabelText("Datum")).toHaveValue("2026-09-02");
    });
    const datum = screen.getByLabelText("Datum");
    const vreme = screen.getByLabelText("Vreme");
    await user.clear(datum);
    await user.type(datum, "2026-09-03");
    await user.clear(vreme);
    await user.type(vreme, "11:30");
    fireEvent.click(screen.getByRole("button", { name: "Izmeni termin" }));

    await waitFor(() => {
      expect(terminiApi.izmeniTermin).toHaveBeenCalledWith(1, {
        datumVreme: new Date("2026-09-03T11:30").toISOString(),
      });
    });
  });

  it("briše termin nakon potvrde", async () => {
    const mockTermin: Termin = {
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
      },
      usluga: { id: 1, naziv: "Kontrola", trajanjeMin: 30, cena: 1500 },
    };

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse([mockTermin]),
    );
    vi.mocked(izvestajiApi.getIzvestajZaTermin).mockRejectedValue(
      new Error("Nema izvestaja"),
    );
    vi.mocked(terminiApi.obrisiTermin).mockResolvedValue(
      makeAxiosResponse({ poruka: "Termin obrisan." }),
    );
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    render(<TerminDetalji />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Obriši termin" }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Obriši termin" }));

    await waitFor(() => {
      expect(terminiApi.obrisiTermin).toHaveBeenCalledWith(1);
    });
  });

  it("kreira novi izveštaj", async () => {
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
        },
        usluga: { id: 1, naziv: "Kontrola", trajanjeMin: 30, cena: 1500 },
      },
    ];

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse(mockTermini),
    );
    vi.mocked(izvestajiApi.getIzvestajZaTermin).mockRejectedValue(
      new Error("Nema izvestaja"),
    );
    vi.mocked(izvestajiApi.dodajIzvestaj).mockResolvedValue(
      makeAxiosResponse<Izvestaj>({
        id: 1,
        dijagnoza: "Novi nalaz",
        kreiranoAt: new Date("2026-09-02T10:00:00Z").toISOString(),
        dermatolog: { ime: "Petar", prezime: "Petrović" },
      }),
    );

    const user = userEvent.setup();
    render(<TerminDetalji />);

    await waitFor(() => {
      expect(screen.getAllByText("Jovana Jovanović")[0]).toBeInTheDocument();
    });

    const dijagnozaField = screen.getByLabelText("Dijagnoza");
    await user.type(dijagnozaField, "Novi nalaz");

    const submitBtn = screen.getByRole("button", {
      name: /sačuvaj|spremi/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(izvestajiApi.dodajIzvestaj).toHaveBeenCalled();
    });
  });

  it("ažurira postojeći izveštaj", async () => {
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
        },
        usluga: { id: 1, naziv: "Kontrola", trajanjeMin: 30, cena: 1500 },
      },
    ];

    const mockIzvestaj: Izvestaj = {
      id: 1,
      dijagnoza: "Stari nalaz",
      terapija: "Stara terapija",
      anamneza: "Stara anamneza",
      kreiranoAt: new Date("2026-09-02T10:00:00Z").toISOString(),
      dermatolog: { ime: "Petar", prezime: "Petrović" },
    };

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse(mockTermini),
    );
    vi.mocked(izvestajiApi.getIzvestajZaTermin).mockResolvedValue(
      makeAxiosResponse(mockIzvestaj),
    );
    vi.mocked(izvestajiApi.izmeniIzvestaj).mockResolvedValue(
      makeAxiosResponse<Izvestaj>({
        id: 1,
        dijagnoza: "Novi nalaz",
      } as Izvestaj),
    );

    const user = userEvent.setup();
    render(<TerminDetalji />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Stari nalaz")).toBeInTheDocument();
    });

    const dijagnozaField = screen.getByDisplayValue(
      "Stari nalaz",
    ) as HTMLTextAreaElement;
    await user.clear(dijagnozaField);
    await user.type(dijagnozaField, "Novi nalaz");

    const submitBtn = screen.getByRole("button", { name: "Sačuvaj izmene" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(izvestajiApi.izmeniIzvestaj).toHaveBeenCalled();
    });
  });

  it("briše postojeći izveštaj nakon potvrde", async () => {
    const mockTermin: Termin = {
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
      },
      usluga: { id: 1, naziv: "Kontrola", trajanjeMin: 30, cena: 1500 },
    };
    const mockIzvestaj: Izvestaj = {
      id: 7,
      dijagnoza: "Akne",
      terapija: "Terapija",
      anamneza: "Anamneza",
      kreiranoAt: new Date("2026-09-02T10:00:00Z").toISOString(),
      dermatolog: { ime: "Petar", prezime: "Petrović" },
    };

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse([mockTermin]),
    );
    vi.mocked(izvestajiApi.getIzvestajZaTermin).mockResolvedValue(
      makeAxiosResponse(mockIzvestaj),
    );
    vi.mocked(izvestajiApi.obrisiIzvestaj).mockResolvedValue(
      makeAxiosResponse({ poruka: "Izveštaj obrisan." }),
    );
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    render(<TerminDetalji />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Obriši izveštaj" }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Obriši izveštaj" }));

    await waitFor(() => {
      expect(izvestajiApi.obrisiIzvestaj).toHaveBeenCalledWith(7);
    });
  });

  it("prikazuje poruku greške ako je termin zakazan", async () => {
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
        },
        usluga: { id: 1, naziv: "Kontrola", trajanjeMin: 30, cena: 1500 },
      },
    ];

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse(mockTermini),
    );
    vi.mocked(izvestajiApi.getIzvestajZaTermin).mockRejectedValue(
      new Error("Nema izvestaja"),
    );

    render(<TerminDetalji />);

    await waitFor(() => {
      expect(screen.getAllByText("Jovana Jovanović")[0]).toBeInTheDocument();
    });
  });
});
