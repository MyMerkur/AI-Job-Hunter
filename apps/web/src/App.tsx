import { NavLink, Outlet } from 'react-router-dom';

const navigation = [
  ['Dashboard', '/'], ['CV Upload', '/cv-upload'], ['Jobs', '/jobs'],
  ['Applications', '/applications'], ['Logs', '/logs'], ['Settings', '/settings'],
] as const;

export function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/">AI <span>Job Hunter</span></NavLink>
        <nav aria-label="Ana menü">
          {navigation.map(([label, to]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="sidebar-note">Başvurular, gönderilmeden önce her zaman sizin incelemenize sunulur.</p>
      </aside>
      <main className="page-content"><Outlet /></main>
    </div>
  );
}
