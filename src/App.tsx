import { Bell, BookOpen, CalendarCheck, CalendarDays, ClipboardCheck, Dumbbell, LayoutDashboard, LineChart as LineChartIcon, LogOut, Medal, Palette, Settings, Timer, UserPlus, Users, Waves } from 'lucide-react';
import { NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useSession } from './lib/session';
import { ROLE_LABEL, type Role } from './lib/types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TimerDisplay from './pages/TimerDisplay';
import TimerControl from './pages/TimerControl';
import Lessons from './pages/admin/Lessons';
import ClubSetup from './pages/admin/ClubSetup';
import AvailabilityPage from './pages/coach/AvailabilityPage';
import Notices from './pages/Notices';
import Attendance from './pages/coach/Attendance';
import MyStudents from './pages/coach/MyStudents';
import ResultsEntry from './pages/coach/ResultsEntry';
import WorkoutBuilder from './pages/coach/WorkoutBuilder';
import Performance from './pages/Performance';
import PreRegister from './pages/PreRegister';
import PreRegDesign from './pages/secretary/PreRegDesign';
import Registrations from './pages/secretary/Registrations';
import StudentsPayments from './pages/secretary/StudentsPayments';

type NavItem = { to: string; label: string; icon: typeof Waves; roles: Role[] };

const NAV: NavItem[] = [
  { to: '/panel', label: 'Panel', icon: LayoutDashboard, roles: ['super', 'admin', 'secretary', 'coach', 'parent'] },
  { to: '/dersler', label: 'Ders saatleri', icon: BookOpen, roles: ['admin'] },
  { to: '/kulup', label: 'Kulüp ayarları', icon: Settings, roles: ['admin'] },
  { to: '/kayit', label: 'Kayıt', icon: UserPlus, roles: ['secretary'] },
  { to: '/ogrenciler', label: 'Öğrenciler', icon: Users, roles: ['secretary', 'admin'] },
  { to: '/on-kayit-ayar', label: 'Ön kayıt', icon: Palette, roles: ['secretary'] },
  { to: '/yoklama', label: 'Yoklama', icon: ClipboardCheck, roles: ['coach'] },
  { to: '/ogrencilerim', label: 'Öğrencilerim', icon: Users, roles: ['coach'] },
  { to: '/derece', label: 'Derece girişi', icon: Medal, roles: ['coach'] },
  { to: '/performans', label: 'Performans', icon: LineChartIcon, roles: ['coach', 'admin', 'parent'] },
  { to: '/antrenman', label: 'Antrenman', icon: Dumbbell, roles: ['coach'] },
  { to: '/musaitlik', label: 'Müsaitlik', icon: CalendarCheck, roles: ['coach'] },
  { to: '/kronometre/kontrol', label: 'Kronometre', icon: Timer, roles: ['coach', 'admin'] },
  { to: '/duyurular', label: 'Duyurular', icon: Bell, roles: ['admin', 'secretary', 'coach', 'parent'] },
];

function Shell() {
  const { user, club, signOut } = useSession();
  const { pathname } = useLocation();
  if (!user) return <Navigate to="/giris" replace />;
  const items = NAV.filter((n) => n.roles.includes(user.role));
  // Menüde olmayan sayfa adres çubuğundan da açılamaz. Asıl veri yetkisi Firestore kurallarındadır.
  if (!items.some((n) => n.to === pathname)) return <Navigate to="/panel" replace />;
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
      <Route path="/on-kayit/:slug" element={<PreRegister />} />
      <Route path="/kronometre/ekran" element={user?.role === 'coach' || user?.role === 'admin' ? <TimerDisplay /> : <Navigate to="/giris" replace />} />
      <Route element={<Shell />}>
        <Route path="/panel" element={<Dashboard />} />
        <Route path="/kronometre/kontrol" element={<TimerControl />} />
        <Route path="/dersler" element={<Lessons />} />
        <Route path="/kulup" element={<ClubSetup />} />
        <Route path="/musaitlik" element={<AvailabilityPage />} />
        <Route path="/duyurular" element={<Notices />} />
        <Route path="/yoklama" element={<Attendance />} />
        <Route path="/ogrencilerim" element={<MyStudents />} />
        <Route path="/derece" element={<ResultsEntry />} />
        <Route path="/performans" element={<Performance />} />
        <Route path="/antrenman" element={<WorkoutBuilder />} />
        <Route path="/kayit" element={<Registrations />} />
        <Route path="/ogrenciler" element={<StudentsPayments />} />
        <Route path="/on-kayit-ayar" element={<PreRegDesign />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/panel' : '/giris'} replace />} />
    </Routes>
  );
}
