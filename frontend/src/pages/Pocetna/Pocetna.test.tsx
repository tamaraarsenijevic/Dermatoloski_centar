import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Pocetna from "./Pocetna";
import { useAuth } from "../../context/useAuth";

vi.mock("../../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("Pocetna route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated user to login", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Pocetna />} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("redirects admin to admin dashboard", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1,
        ime: "Maja",
        prezime: "Majić",
        email: "maja@admin.com",
        telefon: "060",
        uloga: "ADMIN",
        aktivan: true,
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Pocetna />} />
          <Route
            path="/admin/dermatolozi"
            element={<div>Admin dashboard</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Admin dashboard")).toBeInTheDocument();
  });

  it("redirects dermatologist to schedule page", () => {
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
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Pocetna />} />
          <Route path="/termini" element={<div>Termini</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Termini")).toBeInTheDocument();
  });
});
