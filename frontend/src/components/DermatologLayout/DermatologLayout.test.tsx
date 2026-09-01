import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DermatologLayout from "../DermatologLayout";
import { useAuth } from "../../context/useAuth";

vi.mock("../../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("DermatologLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders schedule, patients and reports navigation", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 2,
        ime: "Petar",
        prezime: "Petrović",
        email: "petar@derm.com",
        telefon: "061",
        uloga: "DERMATOLOG",
        aktivan: true,
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <DermatologLayout>
          <div>Dermatolog content</div>
        </DermatologLayout>
      </MemoryRouter>,
    );

    expect(screen.getByText("Termini")).toBeInTheDocument();
    expect(screen.getByText("Pacijenti")).toBeInTheDocument();
    expect(screen.getByText("Izveštaji")).toBeInTheDocument();
    expect(screen.getByText("Dermatolog content")).toBeInTheDocument();
    expect(screen.getByText("Dr Petar Petrović")).toBeInTheDocument();
  });

  it("calls logout when the user clicks logout", () => {
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 2,
        ime: "Petar",
        prezime: "Petrović",
        email: "petar@derm.com",
        telefon: "061",
        uloga: "DERMATOLOG",
        aktivan: true,
      },
      loading: false,
      login: vi.fn(),
      logout,
    });

    render(
      <MemoryRouter>
        <DermatologLayout>
          <div>Dermatolog content</div>
        </DermatologLayout>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /odjavi se/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
