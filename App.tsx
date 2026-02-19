
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users as UsersIcon, 
  ArrowLeftRight, 
  LogOut, 
  Menu, 
  X,
  Users,
  Activity
} from 'lucide-react';
import { User, UserRole } from './types';
import { store } from './store';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ScheduleManagement from './pages/ScheduleManagement';
import UserManagement from './pages/UserManagement';
import MySchedule from './pages/MySchedule';
import SwapRequests from './pages/SwapRequests';
import AllEmployees from './pages/AllEmployees';

interface AuthContextType {
  user: User | null;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => useContext(AuthContext)!;

const SidebarItem: React.FC<{ to: string, icon: any, label: string, active: boolean, onClick?: () => void }> = ({ to, icon: Icon, label, active, onClick }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 translate-x-1' 
        : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
    }`}
  >
    <Icon size={18} />
    <span className="font-semibold text-sm tracking-tight">{label}</span>
  </Link>
);

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return <Navigate to="/login" />;

  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: [UserRole.MANAGER, UserRole.SUPERVISOR] },
    { to: '/schedule-manager', icon: Calendar, label: 'Schedule Management', roles: [UserRole.MANAGER, UserRole.SUPERVISOR] },
    { to: '/users', icon: UsersIcon, label: 'User Management', roles: [UserRole.MANAGER, UserRole.SUPERVISOR] },
    { to: '/my-schedule', icon: Calendar, label: 'My Schedule', roles: [UserRole.EMPLOYEE] },
    { to: '/all-employees', icon: Users, label: 'All Employees', roles: [UserRole.EMPLOYEE] },
    { to: '/swaps', icon: ArrowLeftRight, label: 'Shift Swaps', roles: [UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.SUPERVISOR] },
  ].filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-white flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-xl shadow-blue-600/30">SS</div>
              <div>
                <h1 className="text-sm font-black tracking-tight leading-none uppercase">Staff Scheduler</h1>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Operational Portal</p>
              </div>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto hide-scrollbar">
          <p className="px-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] mb-4">Navigation</p>
          {menuItems.map(item => (
            <SidebarItem 
              key={item.to} 
              to={item.to} 
              icon={item.icon} 
              label={item.label} 
              active={location.pathname === item.to} 
              onClick={() => setIsMobileMenuOpen(false)}
            />
          ))}
        </nav>

        {/* Bottom Section - Pushed to absolute bottom */}
        <div className="p-4 bg-[#1E293B]/30 border-t border-gray-800/50 space-y-4">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
            <Activity size={14} className="text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em]">System Online v1.1</span>
          </div>
          
          <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800/50">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-500 font-black uppercase text-sm shadow-inner">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate text-sm leading-tight">{user.name}</p>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mt-0.5 truncate">{user.companyName || 'Corporate Division'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 bg-gray-800/50 rounded-lg">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Job Role:</span>
              <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest truncate">{user.jobTitle || user.role}</span>
            </div>
          </div>

          <button 
            onClick={logout} 
            className="flex items-center justify-center space-x-3 w-full px-4 py-4 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all duration-200 group border border-transparent hover:border-rose-500/20 active:scale-95"
          >
            <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-[#0F172A] text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black">SS</div>
            <h1 className="text-lg font-black text-blue-400 tracking-tighter uppercase">Staff Scheduler</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)}>
             <Menu size={24} />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-12 bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('swipr_auth');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (u: string, p: string) => {
    const found = await store.login(u, p);
    if (found) {
      setUser(found);
      sessionStorage.setItem('swipr_auth', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('swipr_auth');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AppLayout children={<Dashboard />} />} />
          <Route path="/schedule-manager" element={<AppLayout children={<ScheduleManagement />} />} />
          <Route path="/users" element={<AppLayout children={<UserManagement />} />} />
          <Route path="/my-schedule" element={<AppLayout children={<MySchedule />} />} />
          <Route path="/all-employees" element={<AppLayout children={<AllEmployees />} />} />
          <Route path="/swaps" element={<AppLayout children={<SwapRequests />} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
}
