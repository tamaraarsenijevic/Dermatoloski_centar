import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { formatDoctorName } from "../../utils/formatters";
import "./AdminLayout.css";

interface Props {
  children: ReactNode;
}

const navItems = [
  { path: "/admin/dermatolozi", label: "Zaposleni", icon: "users" },
  { path: "/admin/usluge", label: "Usluge", icon: "briefcase" },
];

function Icon({ name }: { name: string }) {
  if (name === "users") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function AdminLayout({ children }: Props) {
  const { user, logout } = useAuth();
  const initials = user ? `${user.ime[0] ?? ""}${user.prezime[0] ?? ""}` : "";

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img
            className="admin-brand-logo"
            src="/logo.png"
            alt="Dermatološki Centar"
          />
        </div>

        <nav className="admin-nav" aria-label="Admin navigacija">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `admin-link${isActive ? " active" : ""}`
              }
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-bottom">
          {user && (
            <div className="admin-user">
              <div className="admin-avatar">{initials}</div>
              <div className="admin-user-details">
                <strong>
                  {formatDoctorName(user.ime, user.prezime, user.uloga)}
                </strong>
                <span>Administrator</span>
              </div>
            </div>
          )}

          <button className="admin-logout" type="button" onClick={logout}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Odjavi se
          </button>
        </div>
      </aside>

      <main className="admin-content">{children}</main>
    </div>
  );
}
