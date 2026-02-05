
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { store } from '../store';
import { User, UserRole } from '../types';
import { UserPlus, Search, Edit2, Trash2, X, Fingerprint, ShieldCheck } from 'lucide-react';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: UserRole.EMPLOYEE,
    jobTitle: '',
    employeeId: '',
    companyName: '',
    managerName: ''
  });

  useEffect(() => {
    refreshUsers();
  }, [currentUser]);

  const refreshUsers = async () => {
    const all = await store.getUsers();
    let filtered = all;
    
    if (currentUser?.role === UserRole.MANAGER) {
      filtered = all.filter(u => u.companyName === currentUser.companyName);
    }
    
    setUsers(filtered);
  };

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setFormData({ 
      name: '', 
      username: '', 
      password: '', 
      role: UserRole.EMPLOYEE,
      jobTitle: '',
      employeeId: '',
      companyName: currentUser?.role === UserRole.SUPERVISOR ? '' : (currentUser?.companyName || 'Swipr'),
      managerName: currentUser?.name || ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({ 
      name: user.name, 
      username: user.username, 
      password: user.password || '', 
      role: user.role,
      jobTitle: user.jobTitle || '',
      employeeId: user.employeeId || '',
      companyName: user.companyName || '',
      managerName: user.managerName || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUserId) {
      await store.updateUser({ id: editingUserId, ...formData });
    } else {
      await store.addUser({ id: Math.random().toString(36).substr(2, 9), ...formData });
    }
    await refreshUsers();
    setShowModal(false);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputClass = "w-full px-5 py-3.5 rounded-2xl bg-gray-900 border border-gray-800 text-white text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-600 transition-all";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            {currentUser?.role === UserRole.SUPERVISOR && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-purple-200">
                <ShieldCheck size={12} />
                Supervisor Access
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">Create and manage access for your employees across the platform.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-[#2563EB] text-white px-5 py-2.5 rounded-lg font-bold shadow-sm hover:bg-blue-700 flex items-center space-x-2 transition-all"
        >
          <UserPlus size={18} />
          <span>Add New Employee</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, ID, username or company..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400 tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                      {u.employeeId || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold border ${u.role === UserRole.SUPERVISOR ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-600 font-medium">{u.jobTitle || 'No Title'}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Manager: {u.managerName || 'System'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-500 font-medium">{u.companyName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                      u.role === UserRole.SUPERVISOR ? 'bg-purple-50 text-purple-700' :
                      u.role === UserRole.MANAGER ? 'bg-blue-50 text-blue-700' : 
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button onClick={() => handleOpenEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={async () => { if(confirm('Delete user?')) { await store.deleteUser(u.id); await refreshUsers(); } }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 flex justify-between items-center border-b border-gray-50">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {editingUserId ? 'Edit Account' : 'Create Account'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <input 
                    type="text" required placeholder="John Doe"
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Job Title</label>
                  <input 
                    type="text" placeholder="Software Engineer"
                    value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Company Name</label>
                  <input 
                    type="text" required placeholder="Swipr"
                    value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Manager Name</label>
                  <input 
                    type="text" placeholder="Admin Manager"
                    value={formData.managerName} onChange={e => setFormData({ ...formData, managerName: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Username</label>
                  <input 
                    type="text" required placeholder="jdoe"
                    value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                  <input 
                    type="text" required placeholder="Enter password"
                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Employee ID (Unique)</label>
                  <div className="relative">
                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" required placeholder="EMP-001"
                      value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                      className={`${inputClass} pl-12`}
                    />
                  </div>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Role</label>
                   <select 
                    value={formData.role} 
                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className={`${inputClass} appearance-none cursor-pointer`}
                   >
                     <option value={UserRole.EMPLOYEE}>Employee</option>
                     <option value={UserRole.MANAGER}>Manager</option>
                     <option value={UserRole.SUPERVISOR}>Supervisor</option>
                   </select>
                </div>
              </div>
              <div className="flex justify-end pt-6">
                <button type="submit" className="bg-[#2563EB] text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">
                  {editingUserId ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
