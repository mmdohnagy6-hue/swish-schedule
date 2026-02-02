
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Clock, Plus, Search, Check, Coffee, ChevronDown, ChevronUp, X 
} from 'lucide-react';
import { useAuth } from '../App';
import { store } from '../store';
import { DayType, User, UserRole, ScheduleDay, Break } from '../types';
import { addDays, format } from 'date-fns';

// Local implementation for start of week (Sunday start)
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

export default function ScheduleManagement() {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [allSchedules, setAllSchedules] = useState<Record<string, Record<string, ScheduleDay>>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  
  const [editingDay, setEditingDay] = useState<{ userId: string, date: string } | null>(null);
  const [editFormData, setEditFormData] = useState<ScheduleDay | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const users = await store.getUsers();
      const empList = users.filter(u => u.role === UserRole.EMPLOYEE);
      setEmployees(empList);
      const appData = await store.getCurrentAppData();
      setAllSchedules(appData.schedules);
    };
    fetchData();
  }, [editingDay]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const handleEditDay = (userId: string, date: string, existing?: ScheduleDay) => {
    setEditingDay({ userId, date });
    setEditFormData(existing || {
      id: Math.random().toString(),
      date,
      type: DayType.NORMAL_SHIFT,
      shift: {
        startTime: '08:00',
        endTime: '16:00',
        breaks: [
          { id: 'b1', start: '10:00', end: '10:15' },
          { id: 'b2', start: '13:00', end: '13:30' },
          { id: 'b3', start: '15:30', end: '15:45' }
        ] as [Break, Break, Break]
      }
    });
  };

  const saveDay = async () => {
    if (editingDay && editFormData) {
      await store.updateDay(editingDay.userId, editingDay.date, editFormData);
      setEditingDay(null);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Schedule Management</h1>
          <p className="text-gray-500 font-medium">Manage all employee shifts in one place.</p>
        </div>
        <div className="flex items-center bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
          <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"><ChevronLeft size={20} /></button>
          <div className="px-6 font-bold text-gray-800 text-sm">
            {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
          </div>
          <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search employees..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm transition-all"
        />
      </div>

      <div className="space-y-6">
        {filteredEmployees.map(emp => (
          <div key={emp.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div 
              onClick={() => setCollapsed(prev => ({ ...prev, [emp.id]: !prev[emp.id] }))}
              className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50/50"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-blue-100">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{emp.name}</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{emp.jobTitle || 'Employee'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-xs font-bold text-gray-300">WEEKLY VIEW</span>
                <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                  {collapsed[emp.id] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </div>
              </div>
            </div>

            {!collapsed[emp.id] && (
              <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {weekDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayData = (allSchedules[emp.id] || {})[dateStr];
                  const isNormal = dayData?.type === DayType.NORMAL_SHIFT;

                  return (
                    <div 
                      key={dateStr}
                      onClick={() => handleEditDay(emp.id, dateStr, dayData)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[140px] ${
                        isNormal 
                          ? 'border-blue-100 bg-blue-50/30 hover:border-blue-400' 
                          : 'border-gray-50 bg-gray-50/50 hover:border-gray-200'
                      }`}
                    >
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{format(day, 'EEE')}</p>
                        <p className="text-xl font-black text-gray-800">{format(day, 'd')}</p>
                      </div>

                      <div className="mt-4">
                        {dayData ? (
                          <div className="space-y-1">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                              isNormal ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                              {dayData.type.replace('_', ' ')}
                            </span>
                            {isNormal && dayData.shift && (
                              <p className="text-[10px] font-bold text-gray-600 mt-1">{dayData.shift.startTime} - {dayData.shift.endTime}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] font-bold text-gray-300 uppercase">Not Set</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {editingDay && editFormData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Edit Day</h2>
                <p className="text-sm font-bold text-blue-600">{format(new Date(editingDay.date), 'EEEE, MMM d, yyyy')}</p>
              </div>
              <button onClick={() => setEditingDay(null)} className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-gray-900 transition-all"><X size={24} /></button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-2">
                {Object.values(DayType).filter(t => !['TARDY', 'EARLY_LEAVE'].includes(t)).map(type => (
                  <button
                    key={type}
                    onClick={() => setEditFormData({ ...editFormData, type })}
                    className={`py-3 px-4 rounded-xl text-xs font-bold uppercase border-2 transition-all ${
                      editFormData.type === type 
                        ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100' 
                        : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {editFormData.type === DayType.NORMAL_SHIFT && editFormData.shift && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Time</label>
                      <input type="time" value={editFormData.shift.startTime} onChange={(e) => setEditFormData({...editFormData, shift: {...editFormData.shift!, startTime: e.target.value}})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:border-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Time</label>
                      <input type="time" value={editFormData.shift.endTime} onChange={(e) => setEditFormData({...editFormData, shift: {...editFormData.shift!, endTime: e.target.value}})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:border-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mandatory Breaks (3)</label>
                      <Coffee size={16} className="text-orange-500" />
                    </div>
                    {editFormData.shift.breaks.map((br, idx) => (
                      <div key={idx} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <span className="text-[10px] font-black text-gray-300 w-6">#0{idx+1}</span>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input type="time" value={br.start} onChange={(e) => { const nb = [...editFormData.shift!.breaks]; nb[idx].start = e.target.value; setEditFormData({...editFormData, shift: {...editFormData.shift!, breaks: nb as any}})}} className="bg-white p-2 text-xs font-bold border border-gray-200 rounded-lg outline-none" />
                          <input type="time" value={br.end} onChange={(e) => { const nb = [...editFormData.shift!.breaks]; nb[idx].end = e.target.value; setEditFormData({...editFormData, shift: {...editFormData.shift!, breaks: nb as any}})}} className="bg-white p-2 text-xs font-bold border border-gray-200 rounded-lg outline-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={saveDay} className="w-full py-4 bg-gray-900 text-white rounded-[24px] font-black shadow-xl hover:bg-black transition-all active:scale-95">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
