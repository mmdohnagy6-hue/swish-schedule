
import React, { useState, useEffect } from 'react';
import { store } from '../store';
import { User, UserRole, ScheduleDay, DayType } from '../types';
import { format, addDays } from 'date-fns';
import { useAuth } from '../App';
import { Search, ChevronLeft, ChevronRight, Moon, Home } from 'lucide-react';

const manualStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

export default function AllEmployees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(manualStartOfWeek(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [schedules, setSchedules] = useState<Record<string, Record<string, ScheduleDay>>>({});

  useEffect(() => {
    const unsubscribeUsers = store.subscribeToUsers((allUsers) => {
      if (user) {
        const filtered = allUsers.filter(u => 
          u.companyName?.trim().toLowerCase() === user.companyName?.trim().toLowerCase() &&
          u.role !== UserRole.SUPERVISOR
        );
        
        const sorted = [...filtered].sort((a, b) => {
          if (a.id === user.id) return -1;
          if (b.id === user.id) return 1;
          return a.name.localeCompare(b.name);
        });
        
        setEmployees(sorted);
      }
    });

    const unsubscribeSchedules = store.subscribeToSchedules((data) => {
      setSchedules(data);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeSchedules();
    };
  }, [user]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-[#111827] tracking-tight">All Employees</h1>
          <p className="text-[#6B7280] font-medium text-base mt-1">
            View schedules for your colleagues at <span className="text-blue-600 font-bold">{user?.companyName}</span>
          </p>
        </div>
        
        <div className="flex items-center bg-white border border-[#E5E7EB] rounded-2xl p-1 shadow-sm">
          <button 
            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
            className="p-3 hover:bg-gray-50 rounded-xl text-[#9CA3AF] transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="px-8 font-black text-[#374151] text-sm uppercase tracking-widest text-center min-w-[240px]">
            {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
          </div>
          <button 
            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
            className="p-3 hover:bg-gray-50 rounded-xl text-[#9CA3AF] transition-colors"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      <div className="relative group max-w-5xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#D1D5DB] group-focus-within:text-blue-500 transition-colors" size={22} />
        <input 
          type="text" 
          placeholder="Search employees by name or title..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-16 pr-6 py-6 bg-white border border-[#F3F4F6] rounded-[28px] text-base font-bold outline-none focus:ring-4 focus:ring-blue-500/5 shadow-sm transition-all placeholder:text-[#9CA3AF]"
        />
      </div>

      <div className="bg-white rounded-[48px] border border-[#F3F4F6] shadow-2xl shadow-blue-100/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] border-collapse">
            <thead>
              <tr className="bg-white">
                <th className="px-10 py-10 text-left text-[11px] font-black text-[#D1D5DB] uppercase tracking-[0.25em] w-[320px]">Employee</th>
                {weekDays.map(day => (
                  <th key={day.toString()} className="px-4 py-10 text-center min-w-[140px]">
                    <p className="text-[11px] font-black text-[#9CA3AF] uppercase tracking-widest">{format(day, 'EEE')}</p>
                    <p className="text-3xl font-black text-[#111827] mt-1.5">{format(day, 'd')}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-blue-50/10 transition-colors group">
                  <td className="px-10 py-12">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-[24px] bg-[#F9FAFB] border border-[#F3F4F6] flex items-center justify-center font-black text-blue-600 text-2xl shadow-sm group-hover:bg-white group-hover:shadow-md transition-all">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-black text-[#111827] text-lg leading-tight mb-1">{emp.name}</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">{emp.jobTitle || 'STAFF'}</span>
                            {emp.id === user?.id && (
                                <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter">YOU</span>
                            )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayData = (schedules[emp.id] || {})[dateStr];
                    const isNormal = dayData?.type === DayType.NORMAL_SHIFT;
                    const isWFH = dayData?.type === DayType.WORK_FROM_HOME;
                    const isTask = dayData?.type === DayType.TASK;
                    const isSpecial = dayData?.type && ![DayType.NORMAL_SHIFT, DayType.WORK_FROM_HOME, DayType.DAY_OFF, DayType.TASK].includes(dayData.type);

                    return (
                      <td key={dateStr} className="p-3">
                        <div className={`h-[120px] w-full rounded-[30px] flex flex-col items-center justify-center p-5 transition-all duration-300 border-2 ${
                          (isNormal || isWFH || isTask || isSpecial)
                            ? 'bg-white border-[#F3F4F6] shadow-sm hover:shadow-md hover:-translate-y-1' 
                            : 'bg-transparent border-transparent'
                        }`}>
                          {(isNormal || isWFH || isTask || isSpecial) && dayData.shift ? (
                            <div className="text-center space-y-2">
                                <div className="flex items-center justify-center gap-1.5">
                                  {isWFH && <Home size={12} className="text-indigo-500" />}
                                  <p className={`text-[12px] font-black tracking-tight ${isWFH ? 'text-indigo-600' : isTask ? 'text-purple-600' : isSpecial ? 'text-orange-600' : 'text-[#111827]'}`}>
                                      {dayData.shift.startTime} - {dayData.shift.endTime}
                                  </p>
                                </div>
                                <div className={`w-10 h-1.5 rounded-full mx-auto opacity-30 ${isWFH ? 'bg-indigo-500' : isTask ? 'bg-purple-500' : isSpecial ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                            </div>
                          ) : (
                            <div className="opacity-[0.05] group-hover:opacity-[0.15] transition-opacity">
                                <Moon size={24} className="text-[#9CA3AF]" />
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {filteredEmployees.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[48px] border-2 border-dashed border-gray-100">
            <div className="bg-gray-50 p-6 rounded-full mb-6">
                <Search className="text-gray-300" size={48} />
            </div>
            <p className="text-gray-400 font-black text-xl uppercase tracking-widest">No colleagues found</p>
        </div>
      )}
    </div>
  );
}
