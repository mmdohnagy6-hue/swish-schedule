
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { store } from '../store';
import { SwapStatus, UserRole } from '../types';
import { ArrowLeftRight, Check, X, Clock, Calendar as CalendarIcon, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

const manualParseISO = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function SwapRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    refresh();
  }, [user]);

  // Fix: refresh function must be async to await data from store
  const refresh = async () => {
    const all = await store.getSwapRequests();
    const users = await store.getUsers();
    
    const mapped = all.map(r => ({
      ...r,
      requester: users.find(u => u.id === r.requesterId),
      target: users.find(u => u.id === r.targetId)
    }));

    if (user?.role === UserRole.SUPERVISOR) {
      // Supervisor sees everything
      setRequests(mapped);
    } else if (user?.role === UserRole.MANAGER) {
      // Manager only sees requests for their company
      setRequests(mapped.filter(r => 
        (r.requester?.companyName === user.companyName || r.target?.companyName === user.companyName) &&
        r.status !== SwapStatus.REJECTED
      ));
    } else {
      // Employee only sees requests they are part of
      setRequests(mapped.filter(r => (r.requesterId === user?.id || r.targetId === user?.id)));
    }
  };

  const handleAction = async (id: string, nextStatus: SwapStatus) => {
    await store.updateSwapRequest(id, nextStatus);
    await refresh();
  };

  const getStatusLabel = (status: SwapStatus) => {
    switch(status) {
      case SwapStatus.PENDING_TARGET: return { label: 'Colleague Approval Needed', color: 'bg-yellow-50 text-yellow-700' };
      case SwapStatus.PENDING_MANAGER: return { label: 'Manager Approval Needed', color: 'bg-blue-50 text-blue-700' };
      case SwapStatus.APPROVED: return { label: 'Approved & Swapped', color: 'bg-green-50 text-green-700' };
      case SwapStatus.REJECTED: return { label: 'Rejected', color: 'bg-red-50 text-red-700' };
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Swap Requests</h1>
          <p className="text-gray-500">
            {user?.role === UserRole.SUPERVISOR ? 'Global overview of all swaps' : 'Track and manage shift change proposals'}
          </p>
        </div>
        {user?.role === UserRole.SUPERVISOR && (
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            Supervisor Mode
          </span>
        )}
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowLeftRight className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No shift swaps found.</p>
          </div>
        ) : (
          requests.map(req => {
            const statusInfo = getStatusLabel(req.status);
            const isTarget = req.targetId === user?.id;
            const isManager = user?.role === UserRole.MANAGER;
            const isSupervisor = user?.role === UserRole.SUPERVISOR;

            return (
              <div key={req.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center space-x-6">
                  <div className="flex -space-x-3">
                    <div className="w-12 h-12 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center font-bold text-indigo-700">
                      {req.requester?.name.charAt(0)}
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-white bg-indigo-500 flex items-center justify-center font-bold text-white">
                      {req.target?.name.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-bold text-gray-900">{req.requester?.name}</span>
                      <ArrowLeftRight size={14} className="text-gray-400" />
                      <span className="font-bold text-gray-900">{req.target?.name}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <CalendarIcon size={14} />
                        <span>{format(manualParseISO(req.date), 'EEEE, MMM dd')}</span>
                      </span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {isSupervisor && (
                         <span className="text-[10px] font-bold text-gray-400 uppercase">
                           Company: {req.requester?.companyName}
                         </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Action for Target Employee */}
                  {isTarget && req.status === SwapStatus.PENDING_TARGET && (
                    <>
                      <button 
                        onClick={() => handleAction(req.id, SwapStatus.REJECTED)}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Reject Swap"
                      >
                        <X size={24} />
                      </button>
                      <button 
                        onClick={() => handleAction(req.id, SwapStatus.PENDING_MANAGER)}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-2"
                      >
                        <Check size={20} />
                        <span>Accept Swap</span>
                      </button>
                    </>
                  )}

                  {/* Action for Manager or Supervisor */}
                  {(isManager || isSupervisor) && req.status === SwapStatus.PENDING_MANAGER && (
                    <>
                      <button 
                        onClick={() => handleAction(req.id, SwapStatus.REJECTED)}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <X size={24} />
                      </button>
                      <button 
                        onClick={() => handleAction(req.id, SwapStatus.APPROVED)}
                        className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-green-100 hover:bg-green-700 transition-all flex items-center space-x-2"
                      >
                        <Check size={20} />
                        <span>Approve Swap</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
