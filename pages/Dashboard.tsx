
import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Clock, Coffee, AlertCircle, TrendingUp, Calendar, UserCheck, Timer, ChevronRight, Building2, Filter, Home } from 'lucide-react';
import { store } from '../store';
import { DayType, UserRole, User } from '../types';
import { format, isWithinInterval, isValid, differenceInMinutes } from 'date-fns';
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
  if (!timeStr || typeof timeStr !== 'string') return new Date(NaN);
  const parts = timeStr.split(':');
  if (parts.length < 2) return new Date(NaN);
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

interface UserWithBreak extends User {
  breakStart?: string;
  breakEnd?: string;
  isWFH?: boolean;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  const [stats, setStats] = useState({
    totalEmployees: 0,
    workingNow: 0,
    onBreakNow: 0,
    pendingSwaps: 0
  });
  
  const [liveStatus, setLiveStatus] = useState<{ working: (User & { isWFH?: boolean })[], onBreak: UserWithBreak[] }>({
    working: [],
    onBreak: []
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  const companies = ['All', 'Swish', 'mishmash', 'Fm', 'TEC'];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    calculateStats();
    return () => clearInterval(timer);
  }, [currentTime, user, selectedCompany]);

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

    if (selectedCompany !== 'All') {
      employees = employees.filter(e => e.companyName?.trim().toLowerCase() === selectedCompany.toLowerCase());
      swapRequests = swapRequests.filter(r => {
        const reqUser = data.users.find(u => u.id === r.requesterId);
        return reqUser?.companyName?.trim().toLowerCase() === selectedCompany.toLowerCase();
      });
    }
    
    const working: (User & { isWFH?: boolean })[] = [];
    const onBreak: UserWithBreak[] = [];

    employees.forEach(emp => {
      const schedule = data.schedules[emp.id]?.[today];
      const isShiftType = schedule && [DayType.NORMAL_SHIFT, DayType.WORK_FROM_HOME, DayType.TASK, DayType.TARDY, DayType.EARLY_LEAVE].includes(schedule.type);
      
      if (isShiftType && schedule.shift) {
        const { startTime, endTime, breaks } = schedule.shift;
        const start = parseTime(startTime);
        const end = parseTime(endTime);

        if (isValid(start) && isValid(end) && isWithinInterval(nowTime, { start, end })) {
          let currentBreak: any = null;
          if (breaks && Array.isArray(breaks)) {
            breaks.forEach(b => {
              if (b && b.start && b.end) {
                const bStart = parseTime(b.start);
                const bEnd = parseTime(b.end);
                if (isValid(bStart) && isValid(bEnd) && isWithinInterval(nowTime, { start: bStart, end: bEnd })) {
                  currentBreak = b;
                }
              }
            });
          }

          if (currentBreak) {
            onBreak.push({
              ...emp,
              breakStart: currentBreak.start,
              breakEnd: currentBreak.end,
              isWFH: schedule.type === DayType.WORK_FROM_HOME
            });
          } else {
            working.push({
              ...emp,
              isWFH: schedule.type === DayType.WORK_FROM_HOME
            });
          }
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
        
        <div className="flex items-center gap-4">
          {user?.role === UserRole.SUPERVISOR && (
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none">
                <Building2 size={18} />
              </div>
              <select 
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="pl-12 pr-10 py-3.5 bg-white border border-gray-100 rounded-[22px] shadow-sm font-black text-xs uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none min-w-[180px] cursor-pointer"
              >
                {companies.map(c => (
                  <option key={c} value={c}>{c === 'All' ? 'All Companies' : c}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                <Filter size={14} />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3 bg-white border border-gray-100 px-5 py-3.5 rounded-[22px] shadow-sm">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
            <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Systems Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={UsersIcon} 
          label="Employees" 
          value={stats.totalEmployees} 
          color="bg-blue-600" 
          description={`Total ${selectedCompany !== 'All' ? selectedCompany : 'Workforce'}`} 
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
          description="Awaiting decision" 
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
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Working in {selectedCompany === 'All' ? 'all companies' : selectedCompany}</p>
                </div>
              </div>
              <span className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Live Now</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveStatus.working.length === 0 ? (
                <div className="col-span-2 py-10 text-center border-2 border-dashed border-gray-50 rounded-[32px]">
                  <Clock className="mx-auto text-gray-200 mb-2" size={32} />
                  <p className="text-gray-400 font-bold text-sm">No active shifts found for this selection.</p>
                </div>
              ) : (
                liveStatus.working.map(emp => (
                  <div key={emp.id} className="flex items-center p-4 bg-gray-50 rounded-3xl border border-gray-100 group hover:bg-white hover:shadow-lg transition-all duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center font-black text-blue-600 text-lg mr-4 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                      {emp.isWFH ? <Home size={20} /> : emp.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-sm leading-tight flex items-center gap-2">
                        {emp.name}
                        {emp.isWFH && <span className="bg-indigo-100 text-indigo-600 text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase">WFH</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{emp.jobTitle}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest border-l pl-2">{emp.companyName}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-blue-50/20">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                  <Timer size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Current Breaks</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Employees resting</p>
                </div>
              </div>
              <span className="bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{stats.onBreakNow} Total</span>
            </div>
            <div className="space-y-4">
              {liveStatus.onBreak.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-gray-50 rounded-[32px]">
                  <Coffee className="mx-auto text-gray-200 mb-2" size={32} />
                  <p className="text-gray-400 font-bold text-sm">Everyone is currently on duty.</p>
                </div>
              ) : (
                liveStatus.onBreak.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-5 bg-orange-50/20 rounded-[28px] border border-orange-100/50 hover:bg-white hover:shadow-lg transition-all duration-300 group">
                    <div className="flex items-center">
                       <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center font-black text-orange-600 text-xl mr-5 shadow-sm group-hover:bg-orange-500 group-hover:text-white transition-all">
                         {emp.isWFH ? <Home size={24} /> : emp.name.charAt(0)}
                       </div>
                       <div>
                         <p className="font-black text-gray-900 text-lg leading-tight flex items-center gap-2">
                            {emp.name}
                            {emp.isWFH && <span className="bg-indigo-100 text-indigo-600 text-[10px] px-2 py-0.5 rounded-md font-black uppercase">WFH</span>}
                         </p>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{emp.jobTitle} • {emp.companyName}</p>
                       </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-orange-700 bg-white px-3 py-1.5 rounded-xl border border-orange-100 shadow-sm uppercase tracking-tighter">
                        Ends at {emp.breakEnd}
                      </span>
                      {emp.breakEnd && (
                        <p className="text-[9px] font-bold text-orange-400 mt-1 uppercase tracking-widest">
                          {Math.max(0, differenceInMinutes(parseTime(emp.breakEnd), currentTime))}m left
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-gray-900 p-10 rounded-[48px] shadow-2xl shadow-blue-200/50 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h2 className="text-3xl font-black mb-6 tracking-tight leading-none">Swipr <br/>Intelligence<span className="text-blue-500">.</span></h2>
              <p className="text-gray-400 font-medium text-sm mb-10 leading-relaxed">
                {selectedCompany !== 'All' ? `${selectedCompany} capacity` : 'Global operational capacity'} is currently at <span className="text-blue-400 font-black">{stats.totalEmployees > 0 ? Math.round((stats.workingNow / stats.totalEmployees) * 100) : 0}%</span>. 
              </p>
              <button className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-[24px] font-black text-sm tracking-widest uppercase transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                Detailed Analysis
              </button>
            </div>
            <Calendar size={180} className="absolute -bottom-16 -right-16 text-gray-800 opacity-30 group-hover:rotate-12 transition-transform duration-700" />
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-blue-50/20">
             <div className="flex items-center space-x-3 mb-6">
                <TrendingUp size={20} className="text-blue-600" />
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Live Statistics</h3>
             </div>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-500">Company Filter</span>
                  <span className="text-blue-600 font-black uppercase tracking-wider">{selectedCompany}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-500">Sync Latency</span>
                  <span className="text-emerald-500">12ms</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
