
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
  Users
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
    { to: '/all-employees', icon: Users, label: 'All Employees', roles: [UserRole.EMPLOYEE] },
    { to: '/swaps', icon: ArrowLeftRight, label: 'Shift Swaps', roles: [UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.SUPERVISOR] },
  ].filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 bg-gray-900 text-white">
        <div className="p-6">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">SS</div>
            <div>
              <h1 className="text-sm font-black tracking-tight leading-none">Staff Scheduler</h1>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Scheduling System</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-8">
          <p className="px-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Menu</p>
          {menuItems.map(item => (
            <SidebarItem key={item.to} to={item.to} icon={item.icon} label={item.label} active={location.pathname === item.to} />
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-400 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-white font-black uppercase border border-gray-700">{user.name.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold truncate text-sm">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold opacity-40 leading-none">{user.jobTitle || user.role}</p>
              <p className="text-[9px] text-gray-500 mt-0.5">Mgr: {user.managerName || 'System'}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center space-x-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-xs font-black uppercase tracking-widest">
            <LogOut size={16} /><span>Logout</span>
          </button>
        </div>
      </aside>
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-gray-900 text-white">
          <h1 className="text-xl font-black text-blue-400 tracking-tighter">Swipr<span className="text-white">.</span></h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-12 bg-[#F8FAFC]">{children}</main>
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
