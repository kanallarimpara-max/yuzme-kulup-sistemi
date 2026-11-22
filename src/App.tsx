import { CalendarDays, LayoutDashboard, LogOut, Timer, Waves } from 'lucide-react';
import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useSession } from './lib/session';
import { ROLE_LABEL, type Role } from './lib/types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TimerDisplay from './pages/TimerDisplay';
import TimerControl from './pages/TimerControl';

type NavItem = { to: string; label: string; icon: typeof Waves; roles: Role[] };

const NAV: NavItem[] = [
  { to: '/panel', label: 'Panel', icon: LayoutDashboard, roles: ['super', 'admin', 'secretary', 'coach', 'parent'] },
  { to: '/kronometre/kontrol', label: 'Kronometre', icon: Timer, roles: ['coach', 'admin'] },
];

function Shell() {
  const { user, club, signOut } = useSession();
  if (!user) return <Navigate to="/giris" replace />;
  const items = NAV.filter((n) => n.roles.includes(user.role));
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Waves size={20} /></span>
          <span><strong>{club?.name ?? 'Yüzme Kulüp Sistemi'}</strong><small>{ROLE_LABEL[user.role]}</small></span>
        </div>
        <nav>
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}><Icon size={18} /><span>{label}</span></NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="who"><CalendarDays size={15} />{user.tag}</span>
          <button className="ghost icon" onClick={signOut} aria-label="Çıkış yap" title="Çıkış yap"><LogOut size={18} /></button>
        </div>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  );
}

export default function App() {
  const { ready, user } = useSession();
  if (!ready) return <div className="center-screen">Yükleniyor…</div>;
  return (
    <Routes>
      <Route path="/giris" element={user ? <Navigate to="/panel" replace /> : <Login />} />
      <Route path="/kronometre/ekran" element={user ? <TimerDisplay /> : <Navigate to="/giris" replace />} />
      <Route element={<Shell />}>
        <Route path="/panel" element={<Dashboard />} />
        <Route path="/kronometre/kontrol" element={<TimerControl />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/panel' : '/giris'} replace />} />
    </Routes>
  );
}
