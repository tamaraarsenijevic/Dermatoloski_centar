import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "./AdminLayout";
import { useAuth } from "../../context/useAuth";

vi.mock("../../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders navigation and user info", () => {
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
      <MemoryRouter>
        <AdminLayout>
          <div>Admin content</div>
        </AdminLayout>
      </MemoryRouter>,
    );

    expect(screen.getByText("Zaposleni")).toBeInTheDocument();
    expect(screen.getByText("Usluge")).toBeInTheDocument();
    expect(screen.getByText("Admin content")).toBeInTheDocument();
    expect(screen.getByText("Maja Majić")).toBeInTheDocument();
  });

  it("calls logout when the button is clicked", () => {
    const logout = vi.fn();
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
      logout,
    });

    render(
      <MemoryRouter>
        <AdminLayout>
          <div>Admin content</div>
        </AdminLayout>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /odjavi se/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
