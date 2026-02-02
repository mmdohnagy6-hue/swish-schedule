
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Lock, User as UserIcon, ShieldCheck } from 'lucide-react';
import { store } from '../store';
import { UserRole } from '../types';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbEmpty, setDbEmpty] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUsers = async () => {
      const users = await store.getUsers();
      setDbEmpty(users.length === 0);
    };
    checkUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const success = await login(username, password);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Connection error. Check Firebase status.');
    } finally {
      setIsLoading(false);
    }
  };

  const createFirstAdmin = async () => {
    const adminUser = {
      id: 'admin-001',
      name: 'System Admin',
      username: 'admin',
      password: 'password123',
      role: UserRole.MANAGER,
      companyName: 'Swish Official',
      employeeId: 'ADMIN-01'
    };
    await store.addUser(adminUser);
    setDbEmpty(false);
    alert('Admin created! User: admin | Pass: password123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl shadow-blue-100/50 p-10 border border-gray-100">
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-20 h-20 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200 rotate-3">
            <Lock className="text-white" size={36} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Swish<span className="text-blue-600">.</span></h1>
          <p className="text-gray-400 font-medium mt-2">Employee Schedule Management</p>
        </div>

        {dbEmpty && (
          <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-2xl">
            <div className="flex items-center space-x-3 text-blue-700 mb-3">
              <ShieldCheck size={20} />
              <span className="font-bold">Initial Setup Required</span>
            </div>
            <p className="text-sm text-blue-600/80 mb-4">No users found in your new Firebase database.</p>
            <button 
              onClick={createFirstAdmin}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              Create Initial Admin
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none font-medium"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none font-medium"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gray-900 hover:bg-black text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
