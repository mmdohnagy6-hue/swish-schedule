
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { store } from '../store';
import { SwapStatus, UserRole } from '../types';
import { ArrowLeftRight, Check, X, Clock, Calendar as CalendarIcon, User as UserIcon, MoveRight } from 'lucide-react';
import { format, isValid } from 'date-fns';

const manualParseISO = (dateStr: string | undefined | null) => {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.split('-');
  if (parts.length < 3) return new Date();
  const [y, m, d] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  return isValid(date) ? date : new Date();
};

export default function SwapRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, [user]);

  const refresh = async () => {
    setLoading(true);
    try {
      const all = await store.getSwapRequests();
      const users = await store.getUsers();
      
      const mapped = all.map(r => ({
        ...r,
        requester: users.find(u => u.id === r.requesterId),
        target: users.find(u => u.id === r.targetId)
      }));

      let filtered;
      if (user?.role === UserRole.SUPERVISOR) {
        filtered = mapped;
      } else if (user?.role === UserRole.MANAGER) {
        filtered = mapped.filter(r => 
          (r.requester?.companyName === user.companyName || r.target?.companyName === user.companyName) &&
          r.status !== SwapStatus.REJECTED
        );
      } else {
        filtered = mapped.filter(r => (r.requesterId === user?.id || r.targetId === user?.id));
      }
      setRequests(filtered);
    } catch (error) {
      console.error("Error refreshing swaps:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, nextStatus: SwapStatus) => {
    await store.updateSwapRequest(id, nextStatus);
    await refresh();
  };

  const getStatusLabel = (status: SwapStatus) => {
    switch(status) {
      case SwapStatus.PENDING_TARGET: return { label: 'Colleague Approval', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' };
      case SwapStatus.PENDING_MANAGER: return { label: 'Manager Approval', color: 'bg-blue-50 text-blue-700 border-blue-100' };
      case SwapStatus.APPROVED: return { label: 'Approved & Swapped', color: 'bg-green-50 text-green-700 border-green-100' };
      case SwapStatus.REJECTED: return { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-100' };
      default: return { label: 'Unknown Status', color: 'bg-gray-50 text-gray-500 border-gray-100' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Shift Swaps</h1>
          <p className="text-gray-400 font-medium text-sm mt-1">
            {user?.role === UserRole.SUPERVISOR ? 'Global swap monitoring' : 'Review and manage your shift exchange proposals'}
          </p>
        </div>
        {user?.role === UserRole.SUPERVISOR && (
          <span className="bg-purple-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-100">
            Supervisor
          </span>
        )}
      </div>

      <div className="space-y-6">
        {requests.length === 0 ? (
          <div className="bg-white p-20 rounded-[40px] border border-gray-100 text-center shadow-sm">
            <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <ArrowLeftRight className="text-gray-300" size={40} />
            </div>
            <p className="text-gray-400 font-black text-lg uppercase tracking-widest">No active swaps found</p>
          </div>
        ) : (
          requests.map(req => {
            const statusInfo = getStatusLabel(req.status);
            const isTarget = req.targetId === user?.id;
            const isManager = user?.role === UserRole.MANAGER;
            const isSupervisor = user?.role === UserRole.SUPERVISOR;

            return (
              <div key={req.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-blue-50/20 flex flex-col xl:flex-row xl:items-center justify-between gap-8 group hover:border-blue-100 transition-all duration-300">
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="flex -space-x-5">
                    <div className="w-16 h-16 rounded-[24px] border-4 border-white bg-blue-600 flex items-center justify-center font-black text-white text-xl shadow-xl shadow-blue-200">
                      {req.requester?.name?.charAt(0) || '?'}
                    </div>
                    <div className="w-16 h-16 rounded-[24px] border-4 border-white bg-gray-900 flex items-center justify-center font-black text-white text-xl shadow-xl shadow-gray-200">
                      {req.target?.name?.charAt(0) || '?'}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-black text-gray-900 text-lg uppercase tracking-tight">{req.requester?.name || 'Deleted User'}</span>
                      <div className="px-3 py-1 bg-gray-50 rounded-lg text-gray-400">
                        <ArrowLeftRight size={14} />
                      </div>
                      <span className="font-black text-gray-900 text-lg uppercase tracking-tight">{req.target?.name || 'Deleted User'}</span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex items-center gap-3 bg-blue-50/50 px-4 py-2.5 rounded-2xl border border-blue-50">
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Giving away:</div>
                        <span className="text-sm font-black text-blue-900">{format(manualParseISO(req.requesterDate), 'EEE, MMM d')}</span>
                      </div>
                      <div className="hidden md:flex items-center text-gray-200">
                        <MoveRight size={20} />
                      </div>
                      <div className="flex items-center gap-3 bg-gray-900/5 px-4 py-2.5 rounded-2xl border border-gray-100">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Receiving:</div>
                        <span className="text-sm font-black text-gray-900">{format(manualParseISO(req.targetDate), 'EEE, MMM d')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>

                  <div className="flex items-center gap-2">
                    {isTarget && req.status === SwapStatus.PENDING_TARGET && (
                      <>
                        <button 
                          onClick={() => handleAction(req.id, SwapStatus.REJECTED)}
                          className="p-4 text-red-500 hover:bg-red-50 rounded-[20px] transition-all"
                        >
                          <X size={24} />
                        </button>
                        <button 
                          onClick={() => handleAction(req.id, SwapStatus.PENDING_MANAGER)}
                          className="bg-blue-600 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                        >
                          <Check size={18} />
                          <span>Accept Request</span>
                        </button>
                      </>
                    )}

                    {(isManager || isSupervisor) && req.status === SwapStatus.PENDING_MANAGER && (
                      <>
                        <button 
                          onClick={() => handleAction(req.id, SwapStatus.REJECTED)}
                          className="p-4 text-red-500 hover:bg-red-50 rounded-[20px] transition-all"
                        >
                          <X size={24} />
                        </button>
                        <button 
                          onClick={() => handleAction(req.id, SwapStatus.APPROVED)}
                          className="bg-emerald-600 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
                        >
                          <Check size={18} />
                          <span>Final Approval</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
