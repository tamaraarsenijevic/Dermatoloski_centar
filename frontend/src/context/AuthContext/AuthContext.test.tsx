import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosResponse } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Zaposleni } from "../../types";
import { AuthProvider } from "../AuthContext";
import { useAuth } from "../useAuth";
import {
  getCurrentUser,
  login as loginApi,
  logout as logoutApi,
} from "../../api/auth";

const makeAxiosResponse = <T,>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {} as AxiosResponse<T>["headers"],
  config: {} as AxiosResponse<T>["config"],
});

const createZaposleni = (overrides: Partial<Zaposleni> = {}): Zaposleni => ({
  id: 1,
  ime: "Test",
  prezime: "Korisnik",
  email: "test@derm.com",
  telefon: "061000000",
  uloga: "DERMATOLOG",
  aktivan: true,
  ...overrides,
});

vi.mock("../../api/auth", () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

describe("Frontend auth flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ucitava postojeću sesiju iz backend-a", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(
      makeAxiosResponse({
        zaposleni: createZaposleni({
          id: 10,
          ime: "Ana",
          prezime: "Anić",
          email: "ana@derm.com",
          telefon: "061111222",
        }),
      }),
    );

    function SessionUser() {
      const { user, loading } = useAuth();
      return <div>{loading ? "loading" : (user?.email ?? "no-user")}</div>;
    }

    render(
      <AuthProvider>
        <SessionUser />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("ana@derm.com")).toBeInTheDocument();
    });
  });

  it("login postavlja korisnika u context", async () => {
    vi.mocked(loginApi).mockResolvedValue(
      makeAxiosResponse({
        zaposleni: createZaposleni({
          id: 9,
          ime: "Mila",
          prezime: "Milić",
          email: "mila@derm.com",
          telefon: "062333444",
          uloga: "ADMIN",
        }),
      }),
    );

    function LoginButton() {
      const { user, login } = useAuth();
      return (
        <div>
          <span>{user?.email ?? "no-user"}</span>
          <button onClick={() => login("mila@derm.com", "pass")}>Login</button>
        </div>
      );
    }

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <LoginButton />
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(screen.getByText("mila@derm.com")).toBeInTheDocument();
    });
  });

  it("useAuth baca grešku ako se koristi van AuthProvider", () => {
    function Broken() {
      useAuth();
      return null;
    }

    expect(() => render(<Broken />)).toThrow(
      "useAuth mora biti unutar AuthProvider-a",
    );
  });

  it("logout uklanja korisnika iz context", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(
      makeAxiosResponse({
        zaposleni: createZaposleni({
          id: 8,
          ime: "Sara",
          prezime: "Sarić",
          email: "sara@derm.com",
          telefon: "063444555",
        }),
      }),
    );
    vi.mocked(logoutApi).mockResolvedValue(makeAxiosResponse({}));

    function LogoutButton() {
      const { user, logout } = useAuth();

      return (
        <div>
          <span>{user?.email ?? "no-user"}</span>
          <button onClick={() => logout()}>Logout</button>
        </div>
      );
    }

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("sara@derm.com")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => {
      expect(screen.getByText("no-user")).toBeInTheDocument();
    });
  });
});
