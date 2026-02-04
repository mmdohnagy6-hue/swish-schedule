
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Search, Coffee, X, Save, Calendar, Clock, Plus, Users, ShieldCheck, Timer, CheckSquare, Square, Moon, Mail, Briefcase, Building2, ClipboardList
} from 'lucide-react';
import { store } from '../store';
import { DayType, User, UserRole, ScheduleDay, Break } from '../types';
import { addDays, format } from 'date-fns';
import { useAuth } from '../App';

const manualStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

const parseMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const formatMinutes = (mTotal: number) => {
  const h = Math.floor(mTotal / 60) % 24;
  const m = Math.floor(mTotal % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export default function ScheduleManagement() {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(manualStartOfWeek(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [allSchedules, setAllSchedules] = useState<Record<string, Record<string, ScheduleDay>>>({});
  
  const [editingDay, setEditingDay] = useState<{ userId: string, date: string } | null>(null);
  const [editFormData, setEditFormData] = useState<ScheduleDay | null>(null);
  const [applyToWeek, setApplyToWeek] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribeToUsers((users) => {
      let filtered = users.filter(u => u.role === UserRole.EMPLOYEE);
      if (currentUser?.role === UserRole.MANAGER) {
        filtered = filtered.filter(u => u.companyName === currentUser.companyName);
      }
      setEmployees(filtered);
    });
    
    const loadSchedules = async () => {
      const data = await store.getCurrentAppData();
      setAllSchedules(data.schedules);
    };
    
    loadSchedules();
    return () => unsubscribe();
  }, [editingDay, currentUser]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const calculateAutoBreaks = (startTime: string, endTime: string): [Break, Break, Break] => {
    const startMins = parseMinutes(startTime);
    const endMins = parseMinutes(endTime);

    const b1Start = startMins + 75; 
    const b1End = b1Start + 15;

    const b2Start = b1Start + 120; 
    const b2End = b2Start + 30;

    const b3Start = endMins - 90; 
    const b3End = b3Start + 15;

    return [
      { id: 'b1', start: formatMinutes(b1Start), end: formatMinutes(b1End) },
      { id: 'b2', start: formatMinutes(b2Start), end: formatMinutes(b2End) },
      { id: 'b3', start: formatMinutes(b3Start), end: formatMinutes(b3End) }
    ];
  };

  const handleTimeChange = (type: 'start' | 'end', value: string) => {
    if (!editFormData?.shift) return;
    
    const newShift = { ...editFormData.shift };
    if (type === 'start') newShift.startTime = value;
    else newShift.endTime = value;

    newShift.breaks = calculateAutoBreaks(newShift.startTime, newShift.endTime);
    setEditFormData({ ...editFormData, shift: newShift });
  };

  const handleEditDay = (userId: string, date: string, existing?: ScheduleDay) => {
    setEditingDay({ userId, date });
    setApplyToWeek(false);
    
    const defaultStart = '08:00';
    const defaultEnd = '16:00';
    
    setEditFormData(existing || {
      id: Math.random().toString(),
      date,
      type: DayType.NORMAL_SHIFT,
      minutes: 0,
      shift: {
        startTime: defaultStart,
        endTime: defaultEnd,
        breaks: calculateAutoBreaks(defaultStart, defaultEnd)
      }
    });
  };

  const saveDay = async () => {
    if (!editingDay || !editFormData) return;
    setIsSaving(true);
    try {
      if (applyToWeek) {
        const batchData: Record<string, any> = {};
        weekDays.forEach(day => {
          const dStr = format(day, 'yyyy-MM-dd');
          batchData[dStr] = { ...editFormData, date: dStr, id: Math.random().toString() };
        });
        await store.updateBatchDays(editingDay.userId, batchData);
      } else {
        await store.updateDay(editingDay.userId, editingDay.date, editFormData);
      }
      
      const data = await store.getCurrentAppData();
      setAllSchedules(data.schedules);
      setEditingDay(null);
    } catch (err) {
      alert('Error saving roster');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Master Roster</h1>
            {currentUser?.role === UserRole.SUPERVISOR && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-purple-200">
                <ShieldCheck size={12} />
                Supervisor Access
              </span>
            )}
          </div>
          <p className="text-gray-400 font-medium text-sm mt-1">Manage team shifts and attendance globally.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search employee..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-blue-500/10 outline-none w-64 text-sm font-medium"
            />
          </div>

          <div className="flex bg-gray-50 border border-gray-200 rounded-2xl p-1">
            <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 transition-all"><ChevronLeft size={18} /></button>
            <div className="px-6 font-black text-gray-800 text-xs min-w-[200px] text-center flex items-center justify-center uppercase tracking-widest">
              {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
            </div>
            <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 transition-all"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-blue-50/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-[300px]">Employee</th>
                {weekDays.map(day => (
                  <th key={day.toString()} className="px-4 py-6 text-center border-l border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{format(day, 'EEE')}</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{format(day, 'd')}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-8">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-[20px] bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-200">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-gray-900 leading-tight">{emp.name}</h3>
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-wider">
                            <Briefcase size={10} /> {emp.jobTitle || 'CSR'}
                          </span>
                          <span className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                            <Building2 size={10} /> {emp.companyName || 'Swipr'}
                          </span>
                          <span className="flex items-center gap-1.5 text-[9px] font-medium text-gray-400 lowercase tracking-tight">
                            <Mail size={10} /> {emp.username || 'email@example.com'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayData = (allSchedules[emp.id] || {})[dateStr];
                    const isNormal = dayData?.type === DayType.NORMAL_SHIFT;
                    const isTask = dayData?.type === DayType.TASK;
                    const isOff = !dayData || dayData.type === DayType.DAY_OFF;

                    return (
                      <td key={dateStr} className="p-2 border-l border-gray-100">
                        <div 
                          onClick={() => handleEditDay(emp.id, dateStr, dayData)}
                          className={`min-h-[160px] p-4 rounded-[24px] border-2 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${
                            isNormal 
                              ? 'bg-blue-50/30 border-blue-100 hover:border-blue-400 hover:bg-white' 
                              : isTask
                                ? 'bg-purple-50/30 border-purple-100 hover:border-purple-400 hover:bg-white'
                                : isOff 
                                  ? 'bg-gray-50/50 border-transparent hover:border-gray-200 hover:bg-white'
                                  : 'bg-orange-50/30 border-orange-100 hover:border-orange-400 hover:bg-white'
                          }`}
                        >
                          {(isNormal || isTask) ? (
                            <div className="space-y-4">
                              <div className="space-y-0.5">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isTask ? 'text-purple-600' : 'text-blue-600'}`}>
                                  {isTask ? 'Task' : 'Shift'}
                                </p>
                                <p className="text-sm font-black text-gray-900">{dayData.shift?.startTime} - {dayData.shift?.endTime}</p>
                              </div>
                              <div className={`space-y-1.5 pt-2 border-t ${isTask ? 'border-purple-100/50' : 'border-blue-100/50'}`}>
                                {dayData.shift?.breaks.map((br, idx) => (
                                  <div key={idx} className="flex justify-between items-center group/break">
                                    <span className={`text-[9px] font-black uppercase ${isTask ? 'text-purple-400' : 'text-blue-400'}`}>Br {idx + 1}</span>
                                    <span className="text-[10px] font-bold text-gray-500">{br.start}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : isOff ? (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-2 opacity-40">
                              <Moon size={24} className="text-gray-400" />
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Day Off</span>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="space-y-0.5">
                                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{dayData.type.replace('_', ' ')}</p>
                                <p className="text-sm font-black text-gray-900">{dayData.shift?.startTime || '--:--'} - {dayData.shift?.endTime || '--:--'}</p>
                              </div>
                              <div className="p-3 bg-orange-100/50 rounded-xl flex items-center justify-between">
                                <Timer size={14} className="text-orange-600" />
                                <span className="text-[11px] font-black text-orange-700">{dayData.minutes || 0}m</span>
                              </div>
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

      {editingDay && editFormData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                  <Calendar size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">Modify Roster</h2>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{format(new Date(editingDay.date), 'EEEE, MMMM do')}</p>
                </div>
              </div>
              <button onClick={() => setEditingDay(null)} className="p-3 hover:bg-white rounded-2xl text-gray-400"><X size={24} /></button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] hide-scrollbar">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Classification</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[DayType.NORMAL_SHIFT, DayType.TASK, DayType.DAY_OFF, DayType.ABSENT, DayType.PUBLIC_HOLIDAY, DayType.ANNUAL_LEAVE, DayType.TARDY, DayType.EARLY_LEAVE].map(type => (
                    <button
                      key={type}
                      onClick={() => setEditFormData({ ...editFormData, type })}
                      className={`py-3 px-3 rounded-2xl text-[9px] font-black uppercase border-2 transition-all ${
                        editFormData.type === type 
                          ? (type === DayType.TASK ? 'border-purple-600 bg-purple-600 text-white shadow-lg' : 'border-blue-600 bg-blue-600 text-white shadow-lg') 
                          : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {(editFormData.type === DayType.TARDY || editFormData.type === DayType.EARLY_LEAVE) && (
                <div className="space-y-3 p-6 bg-indigo-50 rounded-[32px] border border-indigo-100">
                   <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Duration in Minutes</label>
                   <div className="relative">
                     <Timer className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={20} />
                     <input 
                      type="number" 
                      value={editFormData.minutes || ''} 
                      onChange={e => setEditFormData({ ...editFormData, minutes: parseInt(e.target.value) || 0 })}
                      className="w-full pl-12 pr-4 py-4 bg-white border-2 border-indigo-200 rounded-2xl font-black text-lg outline-none focus:border-indigo-600 transition-all"
                      placeholder="Enter minutes"
                     />
                   </div>
                </div>
              )}

              {(editFormData.type === DayType.NORMAL_SHIFT || editFormData.type === DayType.TASK) && editFormData.shift && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shift Start</label>
                      <input type="time" value={editFormData.shift.startTime} onChange={e => handleTimeChange('start', e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black outline-none focus:border-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shift End</label>
                      <input type="time" value={editFormData.shift.endTime} onChange={e => handleTimeChange('end', e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black outline-none focus:border-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mandatory Breaks (Auto-Generated)</label>
                      <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-3 py-1 rounded-full border border-orange-200">POLICY REQUIRED</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {editFormData.shift.breaks.map((br, idx) => (
                        <div key={idx} className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                           <div className="w-8 h-8 rounded-xl bg-white border flex items-center justify-center text-[10px] font-black text-gray-400">{idx+1}</div>
                           <div className="flex-1 flex items-center justify-between text-xs font-black text-gray-700">
                             <span>{br.start}</span>
                             <span className="text-gray-300">→</span>
                             <span>{br.end}</span>
                           </div>
                           <Coffee size={16} className="text-orange-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <label 
                  className={`flex items-center gap-3 p-5 rounded-[28px] border-2 cursor-pointer transition-all ${
                    applyToWeek ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-100 bg-gray-50'
                  }`}
                  onClick={() => setApplyToWeek(!applyToWeek)}
                >
                  {applyToWeek ? <CheckSquare className="text-blue-600" /> : <Square className="text-gray-300" />}
                  <div>
                    <p className={`text-xs font-black uppercase tracking-widest ${applyToWeek ? 'text-blue-600' : 'text-gray-500'}`}>Apply to Entire Week</p>
                    <p className="text-[9px] font-bold text-gray-400">Sync these settings for all 7 days of this roster.</p>
                  </div>
                </label>

                <button 
                  onClick={saveDay} 
                  disabled={isSaving}
                  className="w-full py-5 bg-gray-900 text-white rounded-[28px] font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Save size={20} />
                  {isSaving ? 'Processing...' : 'Save Roster Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
