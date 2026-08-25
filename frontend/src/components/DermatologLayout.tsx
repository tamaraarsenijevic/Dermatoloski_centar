import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./DermatologLayout.css";

interface Props {
  children: ReactNode;
}

const navItems = [
  { path: "/termini", label: "Termini", icon: "calendar" },
  { path: "/pacijenti", label: "Pacijenti", icon: "users" },
  { path: "/izvestaji", label: "Izveštaji", icon: "file" },
];

function Icon({ name }: { name: string }) {
  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

export default function DermatologLayout({ children }: Props) {
  const { user, logout } = useAuth();
  const initials = user ? `${user.ime[0] ?? ""}${user.prezime[0] ?? ""}` : "";

  return (
    <div className="dermatolog-layout">
      <aside className="dermatolog-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">✦</div>
          <div>
            <strong>Dermatološki</strong>
            <span>Centar</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Glavna navigacija">
          <p className="sidebar-label">MENI</p>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-avatar">{initials}</div>
              <div className="sidebar-user-details">
                <strong>
                  {user.ime} {user.prezime}
                </strong>
                <span>Dermatolog</span>
              </div>
            </div>
          )}
          <button className="sidebar-logout" type="button" onClick={logout}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Odjavi se
          </button>
        </div>
      </aside>
      <main className="dermatolog-content">{children}</main>
    </div>
  );
}
