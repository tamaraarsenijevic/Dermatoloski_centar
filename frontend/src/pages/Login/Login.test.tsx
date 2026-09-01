import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";
import { useAuth } from "../../context/useAuth";

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: mockLogin,
      logout: vi.fn(),
    });
  });

  it("submits login and redirects to home", async () => {
    mockLogin.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email adresa"), {
      target: { value: "ana@derm.com" },
    });
    fireEvent.change(screen.getByLabelText("Lozinka"), {
      target: { value: "secret123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Prijavi se" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("ana@derm.com", "secret123");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows an error when login fails", async () => {
    mockLogin.mockRejectedValue(new Error("bad"));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email adresa"), {
      target: { value: "bad@user.com" },
    });
    fireEvent.change(screen.getByLabelText("Lozinka"), {
      target: { value: "wrong" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Prijavi se" }));

    await waitFor(() => {
      expect(
        screen.getByText("Pogrešan email ili lozinka. Pokušajte ponovo."),
      ).toBeInTheDocument();
    });
  });

  it("toggles password visibility", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const passwordInput = screen.getByLabelText("Lozinka");
    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByTitle("Prikaži lozinku"));
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByTitle("Sakrij lozinku"));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
