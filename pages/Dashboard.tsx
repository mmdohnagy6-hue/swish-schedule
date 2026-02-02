
import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Clock, Coffee, AlertCircle, TrendingUp, Calendar, UserCheck, Timer } from 'lucide-react';
import { store } from '../store';
import { DayType, UserRole, User } from '../types';
import { format, isWithinInterval, isValid } from 'date-fns';
import { useAuth } from '../App';

const StatCard = ({ icon: Icon, label, value, color, description }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-blue-50/20 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-4 rounded-2xl ${color} shadow-lg shadow-opacity-20`}>
        <Icon size={24} className="text-white" />
      </div>
      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</div>
    </div>
    <div>
      <div className="text-4xl font-black text-gray-900 tracking-tight">{value}</div>
      <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-tighter">{description}</p>
    </div>
  </div>
);

const parseTime = (timeStr: string) => {
  if (!timeStr) return new Date(NaN);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    workingNow: 0,
    onBreakNow: 0,
    pendingSwaps: 0
  });
  
  const [liveStatus, setLiveStatus] = useState<{ working: User[], onBreak: User[] }>({
    working: [],
    onBreak: []
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    calculateStats();
    return () => clearInterval(timer);
  }, [currentTime, user]);

  const calculateStats = async () => {
    const data = await store.getCurrentAppData();
    const today = format(new Date(), 'yyyy-MM-dd');
    const nowStr = format(new Date(), 'HH:mm');
    const nowTime = parseTime(nowStr);

    let employees = data.users.filter(u => u.role === UserRole.EMPLOYEE);
    let swapRequests = data.swapRequests;

    if (user?.role === UserRole.MANAGER) {
      employees = employees.filter(e => e.companyName === user.companyName);
      swapRequests = swapRequests.filter(r => {
        const reqUser = data.users.find(u => u.id === r.requesterId);
        return reqUser?.companyName === user.companyName;
      });
    }
    
    const working: User[] = [];
    const onBreak: User[] = [];

    employees.forEach(emp => {
      const schedule = data.schedules[emp.id]?.[today];
      if (schedule && schedule.type === DayType.NORMAL_SHIFT && schedule.shift) {
        const { startTime, endTime, breaks } = schedule.shift;
        const start = parseTime(startTime);
        const end = parseTime(endTime);

        if (isValid(start) && isValid(end) && isWithinInterval(nowTime, { start, end })) {
          let isOnBreak = false;
          breaks.forEach(b => {
            const bStart = parseTime(b.start);
            const bEnd = parseTime(b.end);
            if (isValid(bStart) && isValid(bEnd) && isWithinInterval(nowTime, { start: bStart, end: bEnd })) {
              isOnBreak = true;
            }
          });

          if (isOnBreak) onBreak.push(emp);
          else working.push(emp);
        }
      }
    });

    setStats({
      totalEmployees: employees.length,
      workingNow: working.length,
      onBreakNow: onBreak.length,
      pendingSwaps: swapRequests.filter(r => r.status === 'PENDING_MANAGER').length
    });
    setLiveStatus({ working, onBreak });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            {user?.role === UserRole.SUPERVISOR ? 'Global Hub' : 'Operation Dashboard'}
          </h1>
          <p className="text-gray-400 font-medium mt-1">Live metrics as of {format(currentTime, 'pp')}</p>
        </div>
        <div className="flex items-center space-x-3 bg-white border border-gray-100 px-5 py-3 rounded-[24px] shadow-sm">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
          <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Systems Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={UsersIcon} 
          label="Employees" 
          value={stats.totalEmployees} 
          color="bg-blue-600" 
          description="Total Registered workforce" 
        />
        <StatCard 
          icon={Clock} 
          label="Active Shifts" 
          value={stats.workingNow} 
          color="bg-emerald-600" 
          description="Currently on duty" 
        />
        <StatCard 
          icon={Coffee} 
          label="On Break" 
          value={stats.onBreakNow} 
          color="bg-orange-500" 
          description="Taking a pause" 
        />
        <StatCard 
          icon={AlertCircle} 
          label="Swap Alerts" 
          value={stats.pendingSwaps} 
          color="bg-rose-600" 
          description="Awaiting your decision" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-blue-50/20">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">On-Duty Roster</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Who is working right now</p>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Live Now</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveStatus.working.length === 0 ? (
                <div className="col-span-2 py-10 text-center border-2 border-dashed border-gray-50 rounded-[32px]">
                  <Clock className="mx-auto text-gray-200 mb-2" size={32} />
                  <p className="text-gray-400 font-bold text-sm">No employees currently clocked in.</p>
                </div>
              ) : (
                liveStatus.working.map(emp => (
                  <div key={emp.id} className="flex items-center p-4 bg-gray-50 rounded-3xl border border-gray-100 group hover:bg-white hover:shadow-lg transition-all duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center font-black text-blue-600 text-lg mr-4 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-gray-900">{emp.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{emp.jobTitle}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-blue-50/20">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                <Timer size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Current Breaks</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Employees resting</p>
              </div>
            </div>
            <div className="space-y-3">
              {liveStatus.onBreak.length === 0 ? (
                <p className="text-gray-300 font-bold text-center py-4 italic">No one is currently on break.</p>
              ) : (
                liveStatus.onBreak.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-4 bg-orange-50/30 rounded-2xl border border-orange-100">
                    <div className="flex items-center">
                       <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-orange-600 mr-4 shadow-sm">{emp.name.charAt(0)}</div>
                       <p className="font-bold text-gray-800">{emp.name}</p>
                    </div>
                    <span className="text-[10px] font-black text-orange-700 bg-white px-3 py-1 rounded-lg border border-orange-100">ON BREAK</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-gray-900 p-10 rounded-[48px] shadow-2xl shadow-blue-200/50 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h2 className="text-3xl font-black mb-6 tracking-tight leading-none">Swish <br/>Intelligence<span className="text-blue-500">.</span></h2>
              <p className="text-gray-400 font-medium text-sm mb-10 leading-relaxed">
                Your operational capacity is currently at <span className="text-blue-400 font-black">{stats.totalEmployees > 0 ? Math.round((stats.workingNow / stats.totalEmployees) * 100) : 0}%</span>. 
                Keep track of team performance and shift coverage in real-time.
              </p>
              <button className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-[24px] font-black text-sm tracking-widest uppercase transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                View Reports
              </button>
            </div>
            <Calendar size={180} className="absolute -bottom-16 -right-16 text-gray-800 opacity-30 group-hover:rotate-12 transition-transform duration-700" />
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-blue-50/20">
             <div className="flex items-center space-x-3 mb-6">
                <TrendingUp size={20} className="text-blue-600" />
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Platform Status</h3>
             </div>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-500">Database Engine</span>
                  <span className="text-emerald-500">Firestore Cloud</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-500">Sync Latency</span>
                  <span className="text-emerald-500">12ms</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-500">Uptime</span>
                  <span className="text-emerald-500">99.99%</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
