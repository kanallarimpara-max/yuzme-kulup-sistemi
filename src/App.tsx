import { Camera, FileUp, MessagesSquare, Target, Baby, BadgePlus, Banknote, BookOpen, Building2, CalendarCheck, CalendarDays, ClipboardCheck, Coins, Dumbbell, ShoppingBag, Store, Wallet as Wallet2, LayoutDashboard, LineChart as LineChartIcon, Medal, Palette, Settings, Timer, UserPlus, Users, Waves } from 'lucide-react';
import { Award, Bell, Flag, Gauge, Menu, Phone, Radio, Settings2, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { isRinging } from './lib/call';
import { useSession } from './lib/session';
import { useLiveImport } from './lib/useLiveImport';
import { useCollection } from './lib/store';
import { AdSlot, useAppDesign } from './lib/design';
import { ROLE_LABEL, type CallDoc, type Role } from './lib/types';
import Landing from './pages/Landing';
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
import SessionAnalysis from './pages/coach/SessionAnalysis';
import Chat from './pages/Chat';
import Standards from './pages/Standards';
import LiveResults from './pages/LiveResults';
import RaceCalendar from './pages/RaceCalendar';
import Capacity from './pages/admin/Capacity';
import SkillCards from './pages/coach/SkillCards';
import RaceDayPage from './pages/coach/RaceDay';
import SettingsPage from './pages/Settings';
import TempPasswordNotice from './pages/TempPasswordNotice';
import Social from './pages/Social';
import Finance from './pages/admin/Finance';
import Staff from './pages/admin/Staff';
import ParentHome from './pages/parent/ParentHome';
import Platform from './pages/super/Platform';
import ResultUpload from './pages/super/ResultUpload';
import CreditAdmin from './pages/super/CreditAdmin';
import Market from './pages/Market';
import Wallet from './pages/coach/Wallet';
import WorkoutStore from './pages/coach/WorkoutStore';
import PreRegister from './pages/PreRegister';
import PreRegDesign from './pages/secretary/PreRegDesign';
import Registrations from './pages/secretary/Registrations';
import StudentsPayments from './pages/secretary/StudentsPayments';

type NavItem = { to: string; label: string; icon: typeof Waves; roles: Role[] };

const NAV: NavItem[] = [
  { to: '/panel', label: 'Panel', icon: LayoutDashboard, roles: ['super', 'admin', 'secretary', 'coach', 'parent'] },
  { to: '/dersler', label: 'Ders saatleri', icon: BookOpen, roles: ['admin'] },
  { to: '/finans', label: 'Gelir gider', icon: Banknote, roles: ['admin'] },
  { to: '/doluluk', label: 'Dönem doluluğu', icon: Gauge, roles: ['admin', 'secretary'] },
  { to: '/personel', label: 'Personel', icon: BadgePlus, roles: ['admin'] },
  { to: '/sporcularim', label: 'Sporcularım', icon: Baby, roles: ['parent'] },
  { to: '/kulup', label: 'Kulüp ayarları', icon: Settings, roles: ['admin'] },
  { to: '/kayit', label: 'Kayıt', icon: UserPlus, roles: ['secretary'] },
  { to: '/ogrenciler', label: 'Öğrenciler', icon: Users, roles: ['secretary', 'admin'] },
  { to: '/on-kayit-ayar', label: 'Ön kayıt', icon: Palette, roles: ['secretary'] },
  { to: '/yoklama', label: 'Yoklama', icon: ClipboardCheck, roles: ['coach'] },
  { to: '/ogrencilerim', label: 'Öğrencilerim', icon: Users, roles: ['coach'] },
  { to: '/derece', label: 'Antrenman derecesi', icon: Medal, roles: ['coach'] },
  { to: '/yaris-gunu', label: 'Yarış günü', icon: Flag, roles: ['coach', 'admin'] },
  { to: '/beceri', label: 'Beceri karnesi', icon: Award, roles: ['coach', 'admin'] },
  { to: '/takvim', label: 'Yarış takvimi', icon: CalendarDays, roles: ['admin', 'coach', 'parent'] },
  { to: '/canli-sonuclar', label: 'Canlı sonuçlar', icon: Radio, roles: ['admin', 'secretary', 'coach', 'parent'] },
  { to: '/performans', label: 'Performans', icon: LineChartIcon, roles: ['coach', 'admin', 'parent'] },
  { to: '/ders-analizi', label: 'Ders analizi', icon: Sparkles, roles: ['coach', 'admin'] },
  { to: '/barajlar', label: 'Barajlar', icon: Target, roles: ['admin', 'coach', 'parent'] },
  { to: '/antrenman', label: 'Antrenman', icon: Dumbbell, roles: ['coach'] },
  { to: '/musaitlik', label: 'Dersler ve müsaitlik', icon: CalendarCheck, roles: ['coach'] },
  { to: '/kronometre/kontrol', label: 'Kronometre', icon: Timer, roles: ['coach', 'admin'] },
  { to: '/mesajlar', label: 'Mesajlar', icon: MessagesSquare, roles: ['super', 'admin', 'secretary', 'coach', 'parent'] },
  { to: '/sosyal', label: 'Sosyal', icon: Camera, roles: ['super', 'admin', 'secretary', 'coach', 'parent'] },
  { to: '/duyurular', label: 'Duyurular', icon: Bell, roles: ['admin', 'secretary', 'coach', 'parent'] },
  { to: '/platform', label: 'Platform', icon: Building2, roles: ['super'] },
  { to: '/sonuc-yukle', label: 'Sonuç yükle', icon: FileUp, roles: ['super'] },
  { to: '/kredi-yonetimi', label: 'Kredi yönetimi', icon: Coins, roles: ['super'] },
  { to: '/kredilerim', label: 'Kredilerim', icon: Wallet2, roles: ['coach'] },
  { to: '/antrenman-pazari', label: 'Antrenman pazarı', icon: Store, roles: ['coach'] },
  { to: '/market', label: 'Market', icon: ShoppingBag, roles: ['super', 'admin', 'secretary', 'coach', 'parent'] },
  { to: '/ayarlar', label: 'Ayarlar', icon: Settings2, roles: ['super', 'admin', 'secretary', 'coach', 'parent'] },
];

const AD_SLOT: Record<string, string> = { '/panel': 'panel', '/market': 'market', '/sosyal': 'sosyal' };

/** Kullanıcı başka ekrandayken de gelen aramayı görür. */
function IncomingCall({ uid }: { uid: string }) {
  const calls = useCollection<CallDoc>('calls', { contains: ['memberIds', uid] });
  if (!calls.some((c) => isRinging(c, uid))) return null;
  return <NavLink className="call-alert" to="/mesajlar"><Phone size={17} />Gelen arama var, açmak için dokun</NavLink>;
}

/** Kaydedilemeyen işlem sessizce kaybolmasın. */
function ErrorToast() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let timer = 0;
    const onError = () => {
      setShown(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShown(false), 5000);
    };
    window.addEventListener('unhandledrejection', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onError);
      window.clearTimeout(timer);
    };
  }, []);
  return shown ? <p className="error-toast" role="alert">İşlem kaydedilemedi. Bağlantını kontrol edip tekrar dene.</p> : null;
}

function Shell() {
  const { user, club } = useSession();
  useLiveImport();
  const { pathname } = useLocation();
  const design = useAppDesign();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);
  if (!user) return <Navigate to="/giris" replace />;
  const items = NAV.filter((n) => n.roles.includes(user.role));
  // Menüde olmayan sayfa adres çubuğundan da açılamaz. Asıl veri yetkisi Firestore kurallarındadır.
  if (!items.some((n) => n.to === pathname)) return <Navigate to="/panel" replace />;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className={club?.logoUrl || design.logoUrl ? 'brand-mark' : 'brand-mark logo'}><img src={club?.logoUrl || design.logoUrl || './icon.svg'} alt="" /></span>
          <span><strong>{club?.name ?? design.appName}</strong><small>{ROLE_LABEL[user.role]}</small></span>
        </div>
        <nav className={menuOpen ? 'open' : ''}>
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={`${to}-${label}`} to={to}><Icon size={18} /><span>{label}</span></NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="ghost icon menu-toggle" aria-expanded={menuOpen} aria-label={menuOpen ? 'Menüyü kapat' : 'Tüm menü'} onClick={() => setMenuOpen((o) => !o)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </aside>
      <ErrorToast />
      {user.tempPassword && pathname !== '/ayarlar' && <TempPasswordNotice uid={user.id} />}
      {pathname !== '/mesajlar' && <IncomingCall uid={user.id} />}
      <main className="content">{user.role !== 'super' && AD_SLOT[pathname] && <AdSlot slot={AD_SLOT[pathname]} />}<Outlet /></main>
    </div>
  );
}

export default function App() {
  const { ready, user } = useSession();
  useAppDesign();
  const { pathname } = useLocation();
  // Ön kayıt sırasında hesap açılıp kapanır; form yeniden yüklenirse başarı mesajı kaybolur.
  if (!ready && !pathname.startsWith('/on-kayit/')) return <div className="center-screen">Yükleniyor…</div>;
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/panel" replace /> : <Landing />} />
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
        <Route path="/barajlar" element={<Standards />} />
        <Route path="/canli-sonuclar" element={<LiveResults />} />
        <Route path="/takvim" element={<RaceCalendar />} />
        <Route path="/doluluk" element={<Capacity />} />
        <Route path="/beceri" element={<SkillCards />} />
        <Route path="/yaris-gunu" element={<RaceDayPage />} />
        <Route path="/ayarlar" element={<SettingsPage />} />
        <Route path="/mesajlar" element={<Chat />} />
        <Route path="/sosyal" element={<Social />} />
        <Route path="/finans" element={<Finance />} />
        <Route path="/personel" element={<Staff />} />
        <Route path="/sporcularim" element={<ParentHome />} />
        <Route path="/platform" element={<Platform />} />
        <Route path="/sonuc-yukle" element={<ResultUpload />} />
        <Route path="/kredi-yonetimi" element={<CreditAdmin />} />
        <Route path="/kredilerim" element={<Wallet />} />
        <Route path="/antrenman-pazari" element={<WorkoutStore />} />
        <Route path="/market" element={<Market />} />
        <Route path="/yoklama" element={<Attendance />} />
        <Route path="/ogrencilerim" element={<MyStudents />} />
        <Route path="/derece" element={<ResultsEntry />} />
        <Route path="/performans" element={<Performance />} />
        <Route path="/ders-analizi" element={<SessionAnalysis />} />
        <Route path="/antrenman" element={<WorkoutBuilder />} />
        <Route path="/kayit" element={<Registrations />} />
        <Route path="/ogrenciler" element={<StudentsPayments />} />
        <Route path="/on-kayit-ayar" element={<PreRegDesign />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/panel' : '/'} replace />} />
    </Routes>
  );
}
