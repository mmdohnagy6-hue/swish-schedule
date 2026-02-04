
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { store } from '../store';
import { DayType, SwapStatus, Shift, User, UserRole, ScheduleDay } from '../types';
import { addDays, format, differenceInMinutes, isWithinInterval } from 'date-fns';
import { Clock, Coffee, ArrowLeftRight, ChevronLeft, ChevronRight, Moon, CheckCircle2, AlertCircle, LogOut, ClipboardList } from 'lucide-react';

const manualParseISO = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const manualStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

const parseTimeToDate = (timeStr: string, baseDate: Date) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

const StatusBadge = ({ status, type }: { status: 'COMPLETED' | 'WORKING' | 'UPCOMING' | 'OFF', type: DayType }) => {
  const isTask = type === DayType.TASK;
  const styles = {
    COMPLETED: 'bg-[#64748B] text-white',
    WORKING: isTask ? 'bg-purple-600 text-white' : 'bg-[#22C55E] text-white',
    UPCOMING: isTask ? 'bg-purple-400 text-white' : 'bg-[#3B82F6] text-white',
    OFF: 'bg-gray-100 text-gray-400'
  };
  if (status === 'OFF') return null;
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
};

const OFF_DAY_THEMES: Record<string, { border: string, icon: any, badge: string, bg: string }> = {
  [DayType.DAY_OFF]: { 
    border: 'border-t-blue-500', 
    icon: Moon, 
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    bg: 'bg-blue-50/10'
  },
  [DayType.ABSENT]: { 
    border: 'border-t-gray-900', 
    icon: Moon, 
    badge: 'bg-gray-900 text-white border-gray-900',
    bg: 'bg-gray-50'
  },
  [DayType.PUBLIC_HOLIDAY]: { 
    border: 'border-t-green-500', 
    icon: Moon, 
    badge: 'bg-green-100 text-green-700 border-green-200',
    bg: 'bg-green-50/10'
  },
  [DayType.ANNUAL_LEAVE]: { 
    border: 'border-t-yellow-500', 
    icon: Moon, 
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    bg: 'bg-yellow-50/10'
  },
  [DayType.TARDY]: { 
    border: 'border-t-indigo-500', 
    icon: AlertCircle, 
    badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    bg: 'bg-indigo-50/10'
  },
  [DayType.EARLY_LEAVE]: { 
    border: 'border-t-rose-500', 
    icon: LogOut, 
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    bg: 'bg-rose-50/10'
  },
  [DayType.TASK]: {
    border: 'border-t-purple-600',
    icon: ClipboardList,
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    bg: 'bg-purple-50/20'
  }
};

export default function MySchedule() {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(manualStartOfWeek(new Date()));
  const [showSwapModal, setShowSwapModal] = useState<string | null>(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [now, setNow] = useState(new Date());
  const [colleagues, setColleagues] = useState<User[]>([]);
  const [mySchedule, setMySchedule] = useState<Record<string, ScheduleDay>>({});

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    const loadData = async () => {
      const allUsers = await store.getUsers();
      setColleagues(allUsers.filter(u => u.id !== user?.id && u.role === UserRole.EMPLOYEE));
      
      if (user) {
        const schedule = await store.getSchedule(user.id);
        setMySchedule(schedule);
      }
    };
    loadData();
    return () => clearInterval(timer);
  }, [user]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const handleSwapRequest = async (date: string) => {
    if (!targetEmployeeId) return;
    await store.addSwapRequest({
      id: Math.random().toString(),
      requesterId: user!.id,
      targetId: targetEmployeeId,
      date,
      status: SwapStatus.PENDING_TARGET
    });
    setShowSwapModal(null);
    setTargetEmployeeId('');
  };

  const getShiftInfo = (shift: Shift, date: Date) => {
    const start = parseTimeToDate(shift.startTime, date);
    const end = parseTimeToDate(shift.endTime, date);
    
    let status: 'COMPLETED' | 'WORKING' | 'UPCOMING' = 'UPCOMING';
    let progress = 0;

    if (now > end) {
      status = 'COMPLETED';
      progress = 100;
    } else if (now > start) {
      status = 'WORKING';
      const total = differenceInMinutes(end, start);
      const elapsed = differenceInMinutes(now, start);
      progress = Math.min(Math.max(Math.round((elapsed / total) * 100), 0), 100);
    }

    return { status, progress };
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B]">My Schedule</h1>
          <p className="text-[#64748B] text-sm mt-1">Weekly shift overview and roster</p>
        </div>
        <div className="flex items-center bg-white border border-[#E2E8F0] rounded-xl p-1 shadow-sm">
          <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
            <ChevronLeft size={20} />
          </button>
          <div className="px-6 font-bold text-[#1E293B] text-sm text-center min-w-[180px]">
            {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 6), 'd, yyyy')}
          </div>
          <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {weekDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const data = mySchedule[dateStr];
          const isShift = data?.type === DayType.NORMAL_SHIFT || data?.type === DayType.TASK;
          const isTask = data?.type === DayType.TASK;
          const isOff = !data || !isShift;
          
          let shiftInfo = data?.shift ? getShiftInfo(data.shift, day) : null;
          const theme = data ? OFF_DAY_THEMES[data.type] : OFF_DAY_THEMES[DayType.DAY_OFF];
          const Icon = theme?.icon || Moon;

          const borderColors = {
            COMPLETED: 'border-t-[#64748B]',
            WORKING: isTask ? 'border-t-purple-600' : 'border-t-[#22C55E]',
            UPCOMING: isTask ? 'border-t-purple-400' : 'border-t-[#3B82F6]',
            OFF: isOff ? (theme?.border || 'border-t-gray-100 border-dashed border-2') : 'border-t-transparent'
          };

          return (
            <div key={dateStr} className={`bg-white rounded-[24px] shadow-sm border-t-4 p-6 flex flex-col h-full relative transition-all hover:shadow-md ${isOff ? borderColors.OFF + ' ' + (theme?.bg || '') : borderColors[shiftInfo!.status]}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-[#1E293B] text-lg leading-tight">{format(day, 'EEEE')}</h3>
                  <p className="text-xs font-medium text-[#94A3B8]">{format(day, 'MMM d')}</p>
                </div>
                {isShift && <StatusBadge status={shiftInfo!.status} type={data.type} />}
              </div>

              <div className="flex-1 space-y-6">
                {isOff ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme?.icon === Moon ? (data?.type === DayType.ABSENT ? 'text-gray-400 bg-gray-100' : 'text-blue-300 bg-blue-50') : 'bg-gray-50 text-gray-300'}`}>
                      <Icon size={32} className={data?.type === DayType.TARDY ? 'text-indigo-400' : data?.type === DayType.EARLY_LEAVE ? 'text-rose-400' : ''} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${theme?.badge || 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                      {data?.type?.replace('_', ' ') || 'NOT SET'}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className={`${isTask ? 'bg-purple-50/50 border-purple-100' : 'bg-[#F8FAFC] border-[#F1F5F9]'} rounded-2xl p-4 border`}>
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`p-2 bg-white rounded-lg ${isTask ? 'text-purple-600' : 'text-[#3B82F6]'} shadow-sm`}>
                          {isTask ? <ClipboardList size={16} /> : <Clock size={16} />}
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest">{isTask ? 'Task Time' : 'Shift Time'}</p>
                          <p className="text-sm font-bold text-[#1E293B]">{data.shift!.startTime} - {data.shift!.endTime}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-black text-[#94A3B8] uppercase tracking-widest">
                          <span>Progress</span>
                          <span>{shiftInfo!.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${isTask ? 'bg-purple-600' : (shiftInfo?.status === 'WORKING' ? 'bg-[#22C55E]' : 'bg-[#3B82F6]')}`} 
                            style={{ width: `${shiftInfo!.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={`${isTask ? 'bg-purple-50/50 border-purple-100' : 'bg-[#F8FAFC] border-[#F1F5F9]'} rounded-2xl p-4 border`}>
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`p-2 bg-white rounded-lg ${isTask ? 'text-purple-500' : 'text-[#F97316]'} shadow-sm`}>
                          <Coffee size={16} />
                        </div>
                        <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest">Break Schedule</p>
                      </div>
                      <div className="space-y-2">
                        {data.shift!.breaks.map((br) => (
                          <div key={br.id} className="bg-white px-4 py-2 rounded-xl text-center border border-[#F1F5F9] shadow-sm">
                            <span className="text-xs font-bold text-[#475569]">{br.start} - {br.end}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={() => setShowSwapModal(dateStr)}
                className="mt-6 flex items-center justify-center space-x-2 w-full py-3 text-[#94A3B8] hover:text-[#3B82F6] transition-colors text-[10px] font-black uppercase tracking-widest group"
              >
                <ArrowLeftRight size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                <span>Request Swap</span>
              </button>
            </div>
          );
        })}
      </div>

      {showSwapModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-5 bg-[#3B82F6] text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Request Shift Swap</h3>
              <button onClick={() => setShowSwapModal(null)}><CheckCircle2 size={24} className="opacity-80" /></button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm text-[#64748B] leading-relaxed">
                Choose a colleague to swap your shift for <span className="font-bold text-[#1E293B]">{format(manualParseISO(showSwapModal), 'EEEE, MMM d')}</span>.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Select Colleague</label>
                <select 
                  value={targetEmployeeId} 
                  onChange={e => setTargetEmployeeId(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-[#E2E8F0] text-sm font-bold bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                >
                  <option value="">Select Employee...</option>
                  {colleagues.map(e => <option key={e.id} value={e.id}>{e.name} ({e.jobTitle})</option>)}
                </select>
              </div>
              <div className="flex flex-col space-y-3 pt-2">
                <button 
                  onClick={() => handleSwapRequest(showSwapModal)}
                  disabled={!targetEmployeeId}
                  className="w-full bg-[#3B82F6] text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-[#2563EB] disabled:opacity-50 transition-all active:scale-95"
                >
                  Send Request
                </button>
                <button onClick={() => setShowSwapModal(null)} className="w-full py-2 text-xs font-bold text-[#94A3B8] hover:text-[#475569]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
