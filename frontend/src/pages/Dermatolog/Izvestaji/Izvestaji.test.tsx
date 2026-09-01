import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AxiosResponse } from "axios";
import userEvent from "@testing-library/user-event";
import type { Izvestaj, Termin } from "../../../types";
import IzvestajiStranica from "./Izvestaji";
import * as terminiApi from "../../../api/termini";
import * as izvestajiApi from "../../../api/izvestaji";
import * as izvestajPdf from "../../../utils/izvestajPdf";

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

describe("IzvestajiStranica", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prikazuje poruku za učitavanje početno", () => {
    vi.mocked(terminiApi.getTermini).mockReturnValue(
      new Promise<AxiosResponse<Termin[]>>(() => undefined),
    );
    render(<IzvestajiStranica />);
    expect(screen.getByText("Učitavanje...")).toBeInTheDocument();
  });

  it("učitava i prikazuje sve završene termine", async () => {
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
      {
        id: 2,
        status: "ZAKAZANO",
        datumVreme: new Date("2026-09-03T14:00:00Z").toISOString(),
        dermatolog: { ime: "Petar", prezime: "Petrović" },
        pacijent: {
          id: 2,
          ime: "Marko",
          prezime: "Marković",
          jmbg: "2234567890123",
          telefon: "0611234567",
          email: "marko@test.com",
        },
        usluga: { id: 1, naziv: "Tretman", trajanjeMin: 45, cena: 2000 },
      },
    ];

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse(mockTermini),
    );
    vi.mocked(izvestajiApi.getIzvestajZaTermin).mockResolvedValue(
      makeAxiosResponse<Izvestaj>({
        id: 1,
        dijagnoza: "Akne",
        kreiranoAt: new Date("2026-09-02T10:00:00Z").toISOString(),
        dermatolog: { ime: "Petar", prezime: "Petrović" },
      }),
    );

    render(<IzvestajiStranica />);

    await waitFor(() => {
      expect(screen.getByText("Jovana Jovanović")).toBeInTheDocument();
    });

    expect(screen.queryByText("Marko Marković")).not.toBeInTheDocument();
  });

  it("prikazuje poruku ako nema završenih termina", async () => {
    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse<Termin[]>([
        {
          id: 1,
          status: "ZAKAZANO",
          datumVreme: new Date("2026-09-03T14:00:00Z").toISOString(),
          dermatolog: { ime: "Petar", prezime: "Petrović" },
          pacijent: {
            id: 2,
            ime: "Marko",
            prezime: "Marković",
            jmbg: "2234567890123",
            telefon: "0611234567",
            email: "marko@test.com",
          },
          usluga: { id: 1, naziv: "Tretman", trajanjeMin: 30, cena: 1500 },
        },
      ]),
    );

    render(<IzvestajiStranica />);

    await waitFor(() => {
      expect(screen.getByText("Nema završenih termina.")).toBeInTheDocument();
    });
  });

  it("prikazuje grešku ako učitavanje ne uspe", async () => {
    vi.mocked(terminiApi.getTermini).mockRejectedValue(new Error("API greška"));

    render(<IzvestajiStranica />);

    await waitFor(() => {
      expect(
        screen.getByText("Greška pri učitavanju termina."),
      ).toBeInTheDocument();
    });
  });

  it("popunjava formu kada korisnik izabere termin", async () => {
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
      dijagnoza: "Postojeći nalaz",
      terapija: "Terapija",
      anamneza: "Anamneza",
      kreiranoAt: new Date("2026-09-02T10:00:00Z").toISOString(),
      dermatolog: { ime: "Petar", prezime: "Petrović" },
    };

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse(mockTermini),
    );
    vi.mocked(izvestajiApi.getIzvestajZaTermin).mockResolvedValue(
      makeAxiosResponse<Izvestaj>(mockIzvestaj),
    );

    render(<IzvestajiStranica />);

    await waitFor(() => {
      expect(screen.getByText("Jovana Jovanović")).toBeInTheDocument();
    });

    const terminBtn = screen.getByText("Jovana Jovanović");
    fireEvent.click(terminBtn);

    await waitFor(() => {
      const dijagnozaField = screen.getByDisplayValue(
        "Postojeći nalaz",
      ) as HTMLTextAreaElement;
      expect(dijagnozaField).toBeInTheDocument();
    });
  });

  it("kreira novi izveštaj", async () => {
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
    render(<IzvestajiStranica />);

    await waitFor(() => {
      expect(screen.getByText("Jovana Jovanović")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Jovana Jovanović"));

    await waitFor(() => {
      const dijagnozaField = screen.getByLabelText("Dijagnoza");
      expect(dijagnozaField).toBeInTheDocument();
    });

    const dijagnozaField = screen.getAllByRole("textbox")[0];
    await user.clear(dijagnozaField);
    await user.type(dijagnozaField, "Novi nalaz");

    const submitBtn = screen.getByRole("button", {
      name: /sačuvaj|ažuriraj/i,
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
      dijagnoza: "Stari nalaz",
      terapija: "Terapija",
      anamneza: "Anamneza",
      kreiranoAt: new Date("2026-09-02T10:00:00Z").toISOString(),
      dermatolog: { ime: "Petar", prezime: "Petrović" },
    };

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse(mockTermini),
    );
    vi.mocked(izvestajiApi.getIzvestajZaTermin).mockResolvedValue(
      makeAxiosResponse<Izvestaj>(mockIzvestaj),
    );
    vi.mocked(izvestajiApi.izmeniIzvestaj).mockResolvedValue(
      makeAxiosResponse<Izvestaj>({
        id: 1,
        dijagnoza: "Novi nalaz",
        kreiranoAt: new Date("2026-09-02T10:00:00Z").toISOString(),
        dermatolog: { ime: "Petar", prezime: "Petrović" },
      }),
    );

    const user = userEvent.setup();
    render(<IzvestajiStranica />);

    await waitFor(() => {
      expect(screen.getByText("Jovana Jovanović")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Jovana Jovanović"));

    await waitFor(() => {
      const dijagnozaField = screen.getByDisplayValue(
        "Stari nalaz",
      ) as HTMLTextAreaElement;
      expect(dijagnozaField).toBeInTheDocument();
    });

    const dijagnozaField = screen.getByDisplayValue(
      "Stari nalaz",
    ) as HTMLTextAreaElement;
    await user.clear(dijagnozaField);
    await user.type(dijagnozaField, "Novi nalaz");

    const submitBtn = screen.getByRole("button", {
      name: /sačuvaj|ažuriraj/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(izvestajiApi.izmeniIzvestaj).toHaveBeenCalled();
    });
  });

  it("otvara PDF dokument", async () => {
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
      dijagnoza: "Nalaz",
      terapija: "Terapija",
      anamneza: "Anamneza",
      kreiranoAt: new Date("2026-09-02T10:00:00Z").toISOString(),
      dermatolog: { ime: "Petar", prezime: "Petrović" },
    };

    vi.mocked(terminiApi.getTermini).mockResolvedValue(
      makeAxiosResponse(mockTermini),
    );
    vi.mocked(izvestajiApi.getIzvestajZaTermin).mockResolvedValue(
      makeAxiosResponse<Izvestaj>(mockIzvestaj),
    );

    render(<IzvestajiStranica />);

    await waitFor(() => {
      expect(screen.getByText(/PDF dokument/i)).toBeInTheDocument();
    });

    const pdfBtn = screen.getByText(/PDF dokument/i);
    fireEvent.click(pdfBtn);

    expect(izvestajPdf.otvoriIzvestajKaoPdf).toHaveBeenCalled();
  });
});
