import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedRoute from "../ProtectedRoute";
import { useAuth } from "../../context/useAuth";

vi.mock("../../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state while auth is loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <ProtectedRoute dozvoljeneUloge={["ADMIN"]}>
          <div>Admin page</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Učitavanje...")).toBeInTheDocument();
  });

  it("redirects to login when no user is logged in", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute dozvoljeneUloge={["ADMIN"]}>
                <div>Admin page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects home when user role is not allowed", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 2,
        ime: "Petar",
        prezime: "Petrović",
        email: "petar@derm.com",
        telefon: "062",
        uloga: "DERMATOLOG",
        aktivan: true,
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute dozvoljeneUloge={["ADMIN"]}>
                <div>Admin page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renders children when user has a valid role", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 3,
        ime: "Ivana",
        prezime: "Ivić",
        email: "ivana@admin.com",
        telefon: "063",
        uloga: "ADMIN",
        aktivan: true,
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <ProtectedRoute dozvoljeneUloge={["ADMIN"]}>
          <div>Admin page</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Admin page")).toBeInTheDocument();
  });
});
