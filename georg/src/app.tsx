import { Link, NavLink, Route, Routes } from "react-router-dom";

import { AdrDetailPage } from "./pages/adr-detail-page";
import { CataloguePage } from "./pages/catalogue-page";
import { CreateRoomPage } from "./pages/create-room-page";
import { HandoffPage } from "./pages/handoff-page";
import { PlanDetailPage } from "./pages/plan-detail-page";
import { RoomPage } from "./pages/room-page";
import { SettingsPage } from "./pages/settings-page";
import { WorkspaceOverviewPage } from "./pages/workspace-overview-page";

const navItems = [
  { href: "/", label: "Workspace" },
  { href: "/rooms/new", label: "Create room" },
  { href: "/components", label: "Components" },
  { href: "/patterns", label: "Patterns" },
  { href: "/settings", label: "Settings" },
];

export function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-wrap">
            <span>Realtime Alignment Workspace</span>
            <span className="brand-tag">agreement before generation</span>
          </span>
        </Link>
        <nav className="topnav">
          {navItems.map((item) => (
            <NavLink key={item.href} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")} to={item.href} end={item.href === "/"}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="page-shell">
        <Routes>
          <Route path="/" element={<WorkspaceOverviewPage />} />
          <Route path="/rooms/new" element={<CreateRoomPage />} />
          <Route path="/rooms/:roomId" element={<RoomPage />} />
          <Route path="/components" element={<CataloguePage kind="components" />} />
          <Route path="/patterns" element={<CataloguePage kind="patterns" />} />
          <Route path="/adrs/:roomId" element={<AdrDetailPage />} />
          <Route path="/plans/:roomId" element={<PlanDetailPage />} />
          <Route path="/handoff/:roomId" element={<HandoffPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <footer className="footer">
        <span className="footer-dot">
          <strong>Live workspace</strong> · realtime ADR + plan + handoff
        </span>
        <span>Bun · React 19 · SQLite · POC vertical slice</span>
      </footer>
    </div>
  );
}
