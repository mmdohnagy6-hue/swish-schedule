import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users as UsersIcon, 
  ArrowLeftRight, 
  LogOut, 
  Menu, 
  X
} from 'lucide-react';
import { User, UserRole } from './types';
import { store } from './store';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ScheduleManagement from './pages/ScheduleManagement';
import UserManagement from './pages/UserManagement';
import MySchedule from './pages/MySchedule';
import SwapRequests from './pages/SwapRequests';

interface AuthContextType {
  user: User | null;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => useContext(AuthContext)!;

const SidebarItem: React.FC<{ to: string, icon: any, label: string, active: boolean }> = ({ to, icon: Icon, label, active }) => (
  <Link 
    to={to} 
    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      active ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium text-sm">{label}</span>
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
    { to: '/swaps', icon: ArrowLeftRight, label: 'Shift Swaps', roles: [UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.SUPERVISOR] },
  ].filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 bg-gray-900 text-white">
        <div className="p-6"><h1 className="text-2xl font-black text-blue-400 tracking-tighter">Swipr<span className="text-white">.</span></h1></div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {menuItems.map(item => (
            <SidebarItem key={item.to} to={item.to} icon={item.icon} label={item.label} active={location.pathname === item.to} />
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-400 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold uppercase">{user.name.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold opacity-60">{user.role}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center space-x-3 w-full px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm">
            <LogOut size={18} /><span>Sign Out</span>
          </button>
        </div>
      </aside>
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-gray-900 text-white">
          <h1 className="text-xl font-black text-blue-400 tracking-tighter">Swipr<span className="text-white">.</span></h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-10">{children}</main>
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
          <Route path="/swaps" element={<AppLayout children={<SwapRequests />} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
}