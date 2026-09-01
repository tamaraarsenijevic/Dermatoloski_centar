import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { AxiosResponse } from "axios";
import type { Pacijent, Termin, Izvestaj } from "../../../types";
import PacijentDetalji from "./PacijentDetalji";
import * as pacijentiApi from "../../../api/pacijenti";
import * as terminiApi from "../../../api/termini";
import * as izvestajiApi from "../../../api/izvestaji";

const useParamsMock = vi.hoisted(() => vi.fn(() => ({ id: "1" })));

const makeAxiosResponse = <T,>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {} as AxiosResponse<T>["headers"],
  config: {} as AxiosResponse<T>["config"],
});

vi.mock("../../../api/pacijenti");
vi.mock("../../../api/termini");
vi.mock("../../../api/izvestaji");
vi.mock("../../../utils/izvestajPdf");
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: useParamsMock,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

describe("PacijentDetalji", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useParamsMock.mockReturnValue({ id: "1" });
  });

  it("prikazuje poruku za učitavanje početno", () => {
    vi.mocked(pacijentiApi.getPacijentPoId).mockReturnValue(
      new Promise<AxiosResponse<Pacijent>>(() => undefined),
    );
    vi.mocked(terminiApi.getTermini).mockReturnValue(
      new Promise<AxiosResponse<Termin[]>>(() => undefined),
    );
    vi.mocked(izvestajiApi.getIzvestajiZaPacijenta).mockReturnValue(
      new Promise<AxiosResponse<Izvestaj[]>>(() => undefined),
    );

    render(<PacijentDetalji />);
    expect(
      screen.getByText("Učitavanje detalja pacijenta..."),
    ).toBeInTheDocument();
  });

  it("prikazuje detalje pacijenta", async () => {
    const mockPacijent: Pacijent = {
      id: 1,
      ime: "Jovana",
      prezime: "Jovanović",
      jmbg: "1234567890123",
      telefon: "0601234567",
      email: "jovana@test.com",
      napomena: "Osjetljiva koža",
    };

    vi.mocked(pacijentiApi.getPacijentPoId).mockResolvedValue(
      makeAxiosResponse(mockPacijent),
    );
    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse<Termin[]>([]),
    );
    vi.mocked(izvestajiApi.getIzvestajiZaPacijenta).mockResolvedValue(
      makeAxiosResponse<Izvestaj[]>([]),
    );

    render(<PacijentDetalji />);

    await waitFor(() => {
      expect(screen.getByText("Jovana Jovanović")).toBeInTheDocument();
      expect(screen.getByText("1234567890123")).toBeInTheDocument();
    });
  });

  it("prikazuje sve termine pacijenta", async () => {
    const mockPacijent: Pacijent = {
      id: 1,
      ime: "Jovana",
      prezime: "Jovanović",
      jmbg: "1234567890123",
      telefon: "0601234567",
      email: "jovana@test.com",
      napomena: "",
    };

    const mockTermini: Termin[] = [
      {
        id: 1,
        status: "ZAVRSENO",
        datumVreme: new Date("2026-09-02T10:00:00Z").toISOString(),
        pacijent: { id: 1, ime: "Jovana", prezime: "Jovanović" },
        usluga: { id: 1, naziv: "Kontrola", trajanjeMin: 30, cena: 1500 },
      } as Termin,
      {
        id: 2,
        status: "ZAKAZANO",
        datumVreme: new Date("2026-09-03T14:00:00Z").toISOString(),
        pacijent: { id: 1, ime: "Jovana", prezime: "Jovanović" },
        usluga: { id: 1, naziv: "Tretman", trajanjeMin: 45, cena: 2000 },
      } as Termin,
    ];

    vi.mocked(pacijentiApi.getPacijentPoId).mockResolvedValue(
      makeAxiosResponse(mockPacijent),
    );
    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse(mockTermini),
    );
    vi.mocked(izvestajiApi.getIzvestajiZaPacijenta).mockResolvedValue(
      makeAxiosResponse<Izvestaj[]>([]),
    );

    render(<PacijentDetalji />);

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("prikazuje sve izveštaje pacijenta", async () => {
    const mockPacijent: Pacijent = {
      id: 1,
      ime: "Jovana",
      prezime: "Jovanović",
      jmbg: "1234567890123",
      telefon: "0601234567",
      email: "jovana@test.com",
      napomena: "",
    };

    const mockIzvestaji: Izvestaj[] = [
      {
        id: 1,
        dijagnoza: "Akne",
        terapija: "Lokalna terapija",
        anamneza: "Bez posebnih napomena",
        kreiranoAt: "2026-09-02T10:00:00Z",
        dermatolog: { ime: "Petar", prezime: "Petrović" },
      },
    ];

    vi.mocked(pacijentiApi.getPacijentPoId).mockResolvedValue(
      makeAxiosResponse(mockPacijent),
    );
    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse<Termin[]>([]),
    );
    vi.mocked(izvestajiApi.getIzvestajiZaPacijenta).mockResolvedValue(
      makeAxiosResponse(mockIzvestaji),
    );

    render(<PacijentDetalji />);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("Akne")).toBeInTheDocument();
    });
  });

  it("prikazuje grešku za neispravnu ID", () => {
    useParamsMock.mockReturnValue({ id: "nevalidan" });

    render(<PacijentDetalji />);

    expect(screen.getByText("Pacijent nije pronađen.")).toBeInTheDocument();
  });

  it("prikazuje grešku ako učitavanje ne uspe", async () => {
    vi.mocked(pacijentiApi.getPacijentPoId).mockRejectedValue(
      new Error("API greška"),
    );
    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse<Termin[]>([]),
    );
    vi.mocked(izvestajiApi.getIzvestajiZaPacijenta).mockResolvedValue(
      makeAxiosResponse<Izvestaj[]>([]),
    );

    render(<PacijentDetalji />);

    await waitFor(() => {
      expect(
        screen.getByText("Greška pri učitavanju detalja pacijenta."),
      ).toBeInTheDocument();
    });
  });
});
