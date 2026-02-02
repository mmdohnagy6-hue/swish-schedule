
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { store } from '../store';
import { User, UserRole } from '../types';
import { UserPlus, Search, Edit2, Trash2, X, Fingerprint } from 'lucide-react';

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

  // Fix: refreshUsers must await the promise from store.getUsers()
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
      companyName: currentUser?.companyName || 'Swish',
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
    u.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">Create and manage access for your employees.</p>
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
              placeholder="Search by name, ID or username..." 
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
                      <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600 border border-blue-100">
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
                  <td className="px-6 py-4 text-gray-500 font-medium">{u.companyName}</td>
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
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingUserId ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                  <input 
                    type="text" required placeholder="John Doe"
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300 transition-all"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Job Title</label>
                  <input 
                    type="text" placeholder="Software Engineer"
                    value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300 transition-all"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Name</label>
                  <input 
                    type="text" required placeholder="Swish"
                    value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300 transition-all"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Manager Name</label>
                  <input 
                    type="text" placeholder="Admin Manager"
                    value={formData.managerName} onChange={e => setFormData({ ...formData, managerName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300 transition-all"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
                  <input 
                    type="text" required placeholder="jdoe"
                    value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300 transition-all"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <input 
                    type="text" required placeholder="Enter password"
                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300 transition-all"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Employee ID (Unique)</label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      type="text" required placeholder="EMP-001"
                      value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300 transition-all"
                    />
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                   <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
                   <select 
                    value={formData.role} 
                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-sm"
                   >
                     <option value={UserRole.EMPLOYEE}>Employee</option>
                     <option value={UserRole.MANAGER}>Manager</option>
                     {currentUser?.role === UserRole.SUPERVISOR && <option value={UserRole.SUPERVISOR}>Supervisor</option>}
                   </select>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" className="bg-[#2563EB] text-white px-10 py-3 rounded-lg font-bold shadow-sm hover:bg-blue-700 transition-all active:scale-95">
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
