import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PublicRoute from "./PublicRoute";
import { useAuth } from "../../context/useAuth";

vi.mock("../../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("PublicRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when user is not logged in", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <div>Login page</div>
              </PublicRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects to home when user is already logged in", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1,
        ime: "Ana",
        prezime: "Anić",
        email: "ana@derm.com",
        telefon: "061",
        uloga: "DERMATOLOG",
        aktivan: true,
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/" element={<div>Home page</div>} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <div>Login page</div>
              </PublicRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Home page")).toBeInTheDocument();
  });

  it("shows loading while session is being checked", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <PublicRoute>
          <div>Login page</div>
        </PublicRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Učitavanje...")).toBeInTheDocument();
  });
});
