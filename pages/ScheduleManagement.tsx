
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Search, Coffee, X, Save, Calendar, Clock, Plus, Users, ShieldCheck, Timer, CheckSquare, Square, Moon, Mail, Briefcase, Building2, ClipboardList, FileSpreadsheet, ArrowRight, Filter, CalendarDays, Copy, Check, Home, Star, Palmtree, Thermometer, XCircle, LayoutGrid, Columns, Rows, History, Download, Upload, Trash2
} from 'lucide-react';
import { store } from '../store';
import { DayType, User, UserRole, ScheduleDay, Break, PublicHoliday, LeaveRequest } from '../types';
import { addDays, format } from 'date-fns';
import { useAuth } from '../App';
import * as XLSX from 'xlsx';

const manualStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

const parseMinutes = (t: string) => {
  if (!t) return 0;
  const parts = t.split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
};

const formatMinutes = (mTotal: number) => {
  const h = Math.floor(mTotal / 60) % 24;
  const m = Math.floor(mTotal % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const breakLabels = ["Morning Break", "Lunch", "Afternoon Break"];

const EGYPT_PUBLIC_HOLIDAYS = [
  // 2025
  { id: 'eg-2025-01-07', date: '2025-01-07', name: 'Coptic Christmas' },
  { id: 'eg-2025-01-25', date: '2025-01-25', name: 'Revolution Day / Police Day' },
  { id: 'eg-2025-03-30', date: '2025-03-30', name: 'Eid al-Fitr (Day 1)' },
  { id: 'eg-2025-03-31', date: '2025-03-31', name: 'Eid al-Fitr (Day 2)' },
  { id: 'eg-2025-04-01', date: '2025-04-01', name: 'Eid al-Fitr (Day 3)' },
  { id: 'eg-2025-04-21', date: '2025-04-21', name: 'Sham El-Nessim' },
  { id: 'eg-2025-04-25', date: '2025-04-25', name: 'Sinai Liberation Day' },
  { id: 'eg-2025-05-01', date: '2025-05-01', name: 'Labor Day' },
  { id: 'eg-2025-06-06', date: '2025-06-06', name: 'Eid al-Adha (Day 1)' },
  { id: 'eg-2025-06-07', date: '2025-06-07', name: 'Eid al-Adha (Day 2)' },
  { id: 'eg-2025-06-08', date: '2025-06-08', name: 'Eid al-Adha (Day 3)' },
  { id: 'eg-2025-06-09', date: '2025-06-09', name: 'Eid al-Adha (Day 4)' },
  { id: 'eg-2025-06-26', date: '2025-06-26', name: 'Islamic New Year' },
  { id: 'eg-2025-06-30', date: '2025-06-30', name: 'June 30 Revolution Day' },
  { id: 'eg-2025-07-23', date: '2025-07-23', name: 'Revolution Day' },
  { id: 'eg-2025-09-04', date: '2025-09-04', name: 'Prophet\'s Birthday' },
  { id: 'eg-2025-10-06', date: '2025-10-06', name: 'Armed Forces Day' },
  // 2026
  { id: 'eg-2026-01-07', date: '2026-01-07', name: 'Coptic Christmas' },
  { id: 'eg-2026-01-25', date: '2026-01-25', name: 'Revolution Day' },
  { id: 'eg-2026-03-20', date: '2026-03-20', name: 'Eid al-Fitr (Day 1)' },
  { id: 'eg-2026-03-21', date: '2026-03-21', name: 'Eid al-Fitr (Day 2)' },
  { id: 'eg-2026-03-22', date: '2026-03-22', name: 'Eid al-Fitr (Day 3)' },
  { id: 'eg-2026-04-13', date: '2026-04-13', name: 'Sham El-Nessim' },
  { id: 'eg-2026-04-25', date: '2026-04-25', name: 'Sinai Liberation Day' },
  { id: 'eg-2026-05-01', date: '2026-05-01', name: 'Labor Day' },
  { id: 'eg-2026-05-27', date: '2026-05-27', name: 'Eid al-Adha (Day 1)' },
  { id: 'eg-2026-05-28', date: '2026-05-28', name: 'Eid al-Adha (Day 2)' },
  { id: 'eg-2026-05-29', date: '2026-05-29', name: 'Eid al-Adha (Day 3)' },
  { id: 'eg-2026-05-30', date: '2026-05-30', name: 'Eid al-Adha (Day 4)' },
  { id: 'eg-2026-06-16', date: '2026-06-16', name: 'Islamic New Year' },
  { id: 'eg-2026-06-30', date: '2026-06-30', name: 'June 30 Revolution Day' },
  { id: 'eg-2026-07-23', date: '2026-07-23', name: 'Revolution Day' },
  { id: 'eg-2026-08-25', date: '2026-08-25', name: 'Prophet\'s Birthday' },
  { id: 'eg-2026-10-06', date: '2026-10-06', name: 'Armed Forces Day' },
];

export default function ScheduleManagement() {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(manualStartOfWeek(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>(currentUser?.role === UserRole.SUPERVISOR ? 'Swish' : 'All');
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<string>('All');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'horizontal' | 'grid' | 'vertical'>('horizontal');
  const [weeklyWrap, setWeeklyWrap] = useState(false);
  const [allSchedules, setAllSchedules] = useState<Record<string, Record<string, ScheduleDay>>>({});
  
  const [editingDay, setEditingDay] = useState<{ userId: string, date: string } | null>(null);
  const [editFormData, setEditFormData] = useState<ScheduleDay | null>(null);
  const [applyToWeek, setApplyToWeek] = useState(false);
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exportEndDate, setExportEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showRangeExportModal, setShowRangeExportModal] = useState(false);
  const [showAllCompanySummary, setShowAllCompanySummary] = useState(false);
  const [selectedEmployeeSummary, setSelectedEmployeeSummary] = useState<User | null>(null);
  const [summaryStartDate, setSummaryStartDate] = useState('');
  const [summaryEndDate, setSummaryEndDate] = useState('');
  const [mainStartDate, setMainStartDate] = useState('');
  const [mainEndDate, setMainEndDate] = useState('');
  const [historicalDate, setHistoricalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [historicalType, setHistoricalType] = useState<DayType>(DayType.ANNUAL_LEAVE);
  const [showLeaveBalanceModal, setShowLeaveBalanceModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showClearWeekModal, setShowClearWeekModal] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState<{ current: number, total: number, errors: string[] } | null>(null);
  const [balanceCalcStart, setBalanceCalcStart] = useState(format(new Date(), 'yyyy-MM-01'));
  const [balanceCalcEnd, setBalanceCalcEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  // Calculate total taken days for the selected employee to show remaining balance
  const employeeTotalTaken = useMemo(() => {
    if (!selectedEmployeeSummary) return { annual: 0, public: 0 };
    const empSchedules = allSchedules[selectedEmployeeSummary.id] || {};
    let annual = 0;
    let publicH = 0;
    Object.values(empSchedules).forEach(day => {
      if (day.type === DayType.ANNUAL_LEAVE) annual++;
      if (day.type === DayType.PUBLIC_HOLIDAY) publicH++;
    });
    return { annual, public: publicH };
  }, [selectedEmployeeSummary, allSchedules]);

  const holidaysInCalcRange = useMemo(() => {
    if (!balanceCalcStart || !balanceCalcEnd) return [];
    const start = new Date(balanceCalcStart.replace(/-/g, '/'));
    const end = new Date(balanceCalcEnd.replace(/-/g, '/'));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
    
    // Combine standard Egyptian holidays with any custom ones from Firestore
    const allHolidays = [...EGYPT_PUBLIC_HOLIDAYS, ...publicHolidays];
    // Filter unique by date to avoid double counting if user manually added them too
    const uniqueHolidays = Array.from(new Map(allHolidays.map(h => [h.date, h])).values());

    return uniqueHolidays.filter(h => {
      const hDate = new Date(h.date.replace(/-/g, '/'));
      return hDate >= start && hDate <= end;
    });
  }, [balanceCalcStart, balanceCalcEnd, publicHolidays]);

  const filterOptions = ['All', 'Swish', 'mishmash', 'Fm', 'TEC', 'TEAM LEADER', 'COMPLAIN TEAM'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Robust normalization for team leader names to prevent duplicates
  const normalizeTL = (name: string | undefined) => {
    if (!name) return '';
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove everything except letters and numbers
      .trim();
  };

  // Extract unique team leaders from employees with aggressive normalization
  const teamLeaders = useMemo(() => {
    const uniqueMap = new Map<string, string>();
    employees.forEach(e => {
      const rawTl = e.teamLeader;
      if (rawTl && rawTl.trim()) {
        const tl = rawTl.trim();
        const key = normalizeTL(tl);
        
        if (key && !uniqueMap.has(key)) {
          uniqueMap.set(key, tl);
        }
      }
    });
    return ['All', ...Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b))];
  }, [employees]);

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
    const unsubscribeHolidays = store.subscribeToPublicHolidays((holidays) => {
      setPublicHolidays(holidays);
    });
    const unsubscribeLeaves = store.subscribeToLeaveRequests((leaves) => {
      setLeaveRequests(leaves);
    });
    return () => {
      unsubscribe();
      unsubscribeHolidays();
      unsubscribeLeaves();
    };
  }, [editingDay, currentUser]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const rangeDays = useMemo(() => {
    if (!mainStartDate || !mainEndDate) return null;
    const start = new Date(mainStartDate.replace(/-/g, '/'));
    const end = new Date(mainEndDate.replace(/-/g, '/'));
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    if (start > end) return null;

    const days = [];
    let curr = new Date(start);
    let count = 0;
    // Limit to 45 days for performance
    while (curr <= end && count < 45) {
      days.push(new Date(curr));
      curr = addDays(curr, 1);
      count++;
    }
    return days;
  }, [mainStartDate, mainEndDate]);

  const displayedDays = useMemo(() => {
    if (rangeDays) return rangeDays;
    if (selectedDayIndex === 'all') return weekDays;
    return [weekDays[selectedDayIndex]];
  }, [rangeDays, weekDays, selectedDayIndex]);

  const getShiftCollisionOffset = (userId: string, date: string, startTime: string, endTime: string): number => {
    const currentEmp = employees.find(e => e.id === userId);
    if (!currentEmp) return 0;
    let collisionCount = 0;
    Object.keys(allSchedules).forEach(otherUserId => {
      if (otherUserId === userId) return;
      const otherEmp = employees.find(e => e.id === otherUserId);
      if (!otherEmp || otherEmp.companyName !== currentEmp.companyName) return;
      const daySchedule = allSchedules[otherUserId]?.[date];
      if (daySchedule?.shift && 
          daySchedule.shift.startTime === startTime && 
          daySchedule.shift.endTime === endTime) {
        collisionCount++;
      }
    });
    return collisionCount * 15;
  };

  const calculateAutoBreaks = (startTime: string, endTime: string, offset: number = 0): [Break, Break, Break] => {
    const startMins = parseMinutes(startTime);
    const endMins = parseMinutes(endTime);
    const b1Start = startMins + 75 + offset; 
    const b1End = b1Start + 15;
    const b2Start = b1Start + 120 + offset; 
    const b2End = b2Start + 30;
    const b3Start = endMins - 90 + offset; 
    const b3End = b3Start + 15;
    return [
      { id: 'b1', start: formatMinutes(b1Start), end: formatMinutes(b1End) },
      { id: 'b2', start: formatMinutes(b2Start), end: formatMinutes(b2End) },
      { id: 'b3', start: formatMinutes(b3Start), end: formatMinutes(b3End) }
    ];
  };

  const handleTypeChange = (type: DayType) => {
    if (!editFormData || !editingDay) return;
    const newData = { ...editFormData, type };
    if ([DayType.NORMAL_SHIFT, DayType.WORK_FROM_HOME, DayType.TASK, DayType.TARDY, DayType.EARLY_LEAVE].includes(type) && !newData.shift) {
      const defaultStart = '08:00';
      const defaultEnd = '16:00';
      const offset = getShiftCollisionOffset(editingDay.userId, editingDay.date, defaultStart, defaultEnd);
      newData.shift = {
        startTime: defaultStart,
        endTime: defaultEnd,
        breaks: calculateAutoBreaks(defaultStart, defaultEnd, offset)
      };
    }
    setEditFormData(newData);
  };

  const handleTimeChange = (type: 'start' | 'end', value: string) => {
    if (!editFormData?.shift || !editingDay) return;
    const newShift = { ...editFormData.shift };
    if (type === 'start') {
      newShift.startTime = value;
      // Automatically set end time to 8 hours later
      const startMins = parseMinutes(value);
      const endMins = startMins + 8 * 60;
      newShift.endTime = formatMinutes(endMins);
    } else {
      newShift.endTime = value;
    }
    const offset = getShiftCollisionOffset(editingDay.userId, editingDay.date, newShift.startTime, newShift.endTime);
    newShift.breaks = calculateAutoBreaks(newShift.startTime, newShift.endTime, offset);
    setEditFormData({ ...editFormData, shift: newShift });
  };

  const handleBreakChange = (index: number, field: 'start' | 'end', value: string) => {
    if (!editFormData?.shift) return;
    const newBreaks = [...editFormData.shift.breaks] as [Break, Break, Break];
    newBreaks[index] = { ...newBreaks[index], [field]: value };
    setEditFormData({
      ...editFormData,
      shift: { ...editFormData.shift, breaks: newBreaks }
    });
  };

  const handleEditDay = (userId: string, date: string, existing?: ScheduleDay) => {
    setEditingDay({ userId, date });
    setApplyToWeek(false);
    setSelectedWeekDays([]);
    const defaultStart = '08:00';
    const defaultEnd = '16:00';
    if (existing) {
      setEditFormData(existing);
    } else {
      const offset = getShiftCollisionOffset(userId, date, defaultStart, defaultEnd);
      setEditFormData({
        id: Math.random().toString(),
        date,
        type: DayType.NORMAL_SHIFT,
        minutes: 0,
        shift: {
          startTime: defaultStart,
          endTime: defaultEnd,
          breaks: calculateAutoBreaks(defaultStart, defaultEnd, offset)
        }
      });
    }
  };

  const saveDay = async () => {
    if (!editingDay || !editFormData) return;
    setIsSaving(true);
    try {
      const oldDay = allSchedules[editingDay.userId]?.[editingDay.date];
      const oldType = oldDay?.type;
      const newType = editFormData.type;

      // Update balance if type changed
      if (oldType !== newType) {
        const emp = employees.find(e => e.id === editingDay.userId);
        if (emp) {
          let updatedEmp = { ...emp };
          let balanceChanged = false;
          
          // Add back if old was leave
          if (oldType === DayType.ANNUAL_LEAVE) {
            updatedEmp.annualBalance = (updatedEmp.annualBalance || 0) + 1;
            balanceChanged = true;
          }
          if (oldType === DayType.PUBLIC_HOLIDAY) {
            updatedEmp.publicBalance = (updatedEmp.publicBalance || 0) + 1;
            balanceChanged = true;
          }
          
          // Deduct if new is leave
          if (newType === DayType.ANNUAL_LEAVE) {
            updatedEmp.annualBalance = (updatedEmp.annualBalance || 0) - 1;
            balanceChanged = true;
          }
          if (newType === DayType.PUBLIC_HOLIDAY) {
            updatedEmp.publicBalance = (updatedEmp.publicBalance || 0) - 1;
            balanceChanged = true;
          }
          
          if (balanceChanged) {
            await store.updateUser(updatedEmp);
          }
        }
      }

      if (applyToWeek) {
        const batchMap: Record<string, ScheduleDay> = {};
        const indicesToApply = selectedWeekDays.length > 0 ? selectedWeekDays : [0, 1, 2, 3, 4, 5, 6];
        
        indicesToApply.forEach(idx => {
          const targetDate = format(weekDays[idx], 'yyyy-MM-dd');
          batchMap[targetDate] = { 
            ...editFormData, 
            id: Math.random().toString(), 
            date: targetDate 
          };
        });
        
        await store.updateBatchDays(editingDay.userId, batchMap);
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

  const toggleWeekDay = (idx: number) => {
    setSelectedWeekDays(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleClearWeek = async () => {
    setIsSaving(true);
    try {
      const datesToClear = weekDays.map(d => format(d, 'yyyy-MM-dd'));
      const userIds = Object.keys(allSchedules);
      
      // Iterate through all users and clear their schedules for these dates
      for (const userId of userIds) {
        const userSchedule = allSchedules[userId];
        const hasShiftsInWeek = datesToClear.some(date => userSchedule[date]);
        
        if (hasShiftsInWeek) {
          await store.clearBatchDays(userId, datesToClear);
        }
      }
      
      const appData = await store.getCurrentAppData();
      setAllSchedules(appData.schedules);
      setShowClearWeekModal(false);
      alert('Current week shifts cleared successfully!');
    } catch (error) {
      console.error("Error clearing week:", error);
      alert('Error clearing week shifts. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        // Use header: 1 to get a 2D array (rows as arrays)
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length < 2) {
          alert('Excel file is empty or missing data rows.');
          return;
        }

        setBulkUploadProgress({ current: 0, total: data.length - 1, errors: [] });
        setIsSaving(true);

        const errors: string[] = [];
        let processedCount = 0;
        const batchUpdates: Record<string, Record<string, ScheduleDay>> = {};

        // Skip the first row (headers)
        for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
          const row = data[rowIndex];
          const empId = row[0]?.toString().trim();
          
          if (!empId) {
            processedCount++;
            continue; // Skip empty rows
          }

          const employee = employees.find(emp => emp.employeeId === empId || emp.id === empId);
          if (!employee) {
            errors.push(`Row ${rowIndex + 1}: Employee ID "${empId}" not found in system`);
            processedCount++;
            continue;
          }

          // Process Sunday (index 2) to Saturday (index 8)
          for (let i = 0; i < 7; i++) {
            const cellValue = row[i + 2]?.toString().trim();
            const targetDate = format(weekDays[i], 'yyyy-MM-dd');

            if (!cellValue) continue;

            let dayData: ScheduleDay;
            const timeMatch = cellValue.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
            const upperVal = cellValue.toUpperCase();

            if (upperVal === 'OFF') {
              dayData = {
                id: Math.random().toString(36).substr(2, 9),
                date: targetDate,
                type: DayType.DAY_OFF
              };
            } else if (upperVal === 'ABSENT') {
              dayData = {
                id: Math.random().toString(36).substr(2, 9),
                date: targetDate,
                type: DayType.ABSENT
              };
            } else if (upperVal === 'PUBLIC' || upperVal === 'PUBLIC HOLIDAY') {
              dayData = {
                id: Math.random().toString(36).substr(2, 9),
                date: targetDate,
                type: DayType.PUBLIC_HOLIDAY
              };
            } else if (upperVal === 'SICK') {
              dayData = {
                id: Math.random().toString(36).substr(2, 9),
                date: targetDate,
                type: DayType.SICK
              };
            } else if (upperVal === 'ANNUAL' || upperVal === 'ANNUAL LEAVE') {
              dayData = {
                id: Math.random().toString(36).substr(2, 9),
                date: targetDate,
                type: DayType.ANNUAL_LEAVE
              };
            } else if (upperVal === 'WFH' || upperVal === 'WORK FROM HOME') {
              dayData = {
                id: Math.random().toString(36).substr(2, 9),
                date: targetDate,
                type: DayType.WORK_FROM_HOME
              };
            } else if (timeMatch) {
              const startTime = timeMatch[1];
              const endTime = timeMatch[2];
              
              const breaks: Break[] = Array(3).fill(null).map(() => ({
                id: Math.random().toString(36).substr(2, 9),
                start: '',
                end: ''
              }));

              dayData = {
                id: Math.random().toString(36).substr(2, 9),
                date: targetDate,
                type: DayType.NORMAL_SHIFT,
                shift: {
                  startTime,
                  endTime,
                  breaks: breaks as [Break, Break, Break]
                }
              };
            } else {
              errors.push(`Row ${rowIndex + 1}, Day ${i + 1}: Invalid format "${cellValue}". Expected "HH:mm - HH:mm" or "OFF"`);
              continue;
            }

            if (!batchUpdates[employee.id]) {
              batchUpdates[employee.id] = {};
            }
            batchUpdates[employee.id][targetDate] = dayData;
          }
          
          processedCount++;
          setBulkUploadProgress(prev => prev ? { ...prev, current: processedCount } : null);
        }

        // Apply batch updates to Firestore
        for (const [userId, batch] of Object.entries(batchUpdates)) {
          await store.updateBatchDays(userId, batch);
        }

        const appData = await store.getCurrentAppData();
        setAllSchedules(appData.schedules);
        
        setBulkUploadProgress(prev => prev ? { ...prev, errors } : null);
        if (errors.length === 0) {
          alert('Bulk upload completed successfully for the current week!');
          setShowBulkUploadModal(false);
          setBulkUploadProgress(null);
        }
      } catch (err) {
        console.error('Error processing bulk upload:', err);
        alert('Error processing file. Please check the format.');
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = () => {
    const dataToExport: any[] = [];
    filteredEmployees.forEach(emp => {
      displayedDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayData = (allSchedules[emp.id] || {})[dateStr];
        const isOffDay = !dayData || [DayType.DAY_OFF, DayType.ABSENT, DayType.PUBLIC_HOLIDAY, DayType.ANNUAL_LEAVE, DayType.SICK].includes(dayData.type);

        dataToExport.push({
          'Day': format(day, 'EEEE'),
          'Date': dateStr,
          'ID': emp.employeeId || 'N/A',
          'Employee Name': emp.name,
          'Company': emp.companyName || 'Swipr',
          'Type': dayData?.type || 'DAY_OFF',
          'Start Time': isOffDay ? '--:--' : (dayData?.shift?.startTime || '--:--'),
          'End Time': isOffDay ? '--:--' : (dayData?.shift?.endTime || '--:--')
        });
      });
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    const sheetName = selectedDayIndex === 'all' ? 'Weekly Roster' : format(displayedDays[0], 'EEEE dd');
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const fileName = selectedDayIndex === 'all' 
      ? `Swipr_Export_Week_${format(currentWeekStart, 'yyyy-MM-dd')}.xlsx`
      : `Swipr_Export_Day_${format(displayedDays[0], 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportRangeToExcel = () => {
    const dataToExport: any[] = [];
    const start = new Date(exportStartDate);
    const end = new Date(exportEndDate);
    
    // Generate all days in range
    const daysInRange: Date[] = [];
    let current = new Date(start);
    while (current <= end) {
      daysInRange.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    filteredEmployees.forEach(emp => {
      daysInRange.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayData = (allSchedules[emp.id] || {})[dateStr];
        const isOffDay = !dayData || [DayType.DAY_OFF, DayType.ABSENT, DayType.PUBLIC_HOLIDAY, DayType.ANNUAL_LEAVE, DayType.SICK].includes(dayData.type);

        dataToExport.push({
          'Day': format(day, 'EEEE'),
          'Date': dateStr,
          'ID': emp.employeeId || 'N/A',
          'Employee Name': emp.name,
          'Company': emp.companyName || 'Swipr',
          'Type': dayData?.type || 'DAY_OFF',
          'Start Time': isOffDay ? '--:--' : (dayData?.shift?.startTime || '--:--'),
          'End Time': isOffDay ? '--:--' : (dayData?.shift?.endTime || '--:--')
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Range Roster');
    const fileName = `Swipr_Export_Range_${exportStartDate}_to_${exportEndDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setShowRangeExportModal(false);
  };

  const getEmployeeSummary = (empId: string) => {
    const empSchedules = allSchedules[empId] || {};
    const summary = {
      [DayType.ANNUAL_LEAVE]: [] as string[],
      [DayType.SICK]: [] as string[],
      [DayType.PUBLIC_HOLIDAY]: [] as string[],
      [DayType.ABSENT]: [] as string[],
      [DayType.DAY_OFF]: [] as string[],
      [DayType.TARDY]: [] as string[],
      [DayType.EARLY_LEAVE]: [] as string[],
    };

    Object.entries(empSchedules).forEach(([date, data]) => {
      // Date range filter
      if (summaryStartDate && date < summaryStartDate) return;
      if (summaryEndDate && date > summaryEndDate) return;

      if (summary[data.type as keyof typeof summary]) {
        summary[data.type as keyof typeof summary].push(date);
      }
    });

    return summary;
  };

  const addHistoricalDay = async () => {
    if (!selectedEmployeeSummary) return;
    setIsSaving(true);
    try {
      const newDay: ScheduleDay = {
        id: Math.random().toString(36).substr(2, 9),
        date: historicalDate,
        type: historicalType,
      };
      
      await store.updateDay(selectedEmployeeSummary.id, historicalDate, newDay);
      const data = await store.getCurrentAppData();
      setAllSchedules(data.schedules);
      // Reset date to today for next entry
      setHistoricalDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (error) {
      console.error('Error adding historical day:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderDayCell = (empId: string, dateStr: string, dayData: ScheduleDay | undefined, isCompact: boolean = false) => {
    const isNormal = dayData?.type === DayType.NORMAL_SHIFT;
    const isWFH = dayData?.type === DayType.WORK_FROM_HOME;
    const isTask = dayData?.type === DayType.TASK;
    const isTardy = dayData?.type === DayType.TARDY;
    const isEarly = dayData?.type === DayType.EARLY_LEAVE;
    const isOff = !dayData || dayData.type === DayType.DAY_OFF;

    const baseClasses = `p-4 rounded-[24px] border-2 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between`;
    const themeClasses = isNormal ? 'bg-blue-50/30 border-blue-100 hover:border-blue-400' : 
                        isWFH ? 'bg-indigo-50/30 border-indigo-100 hover:border-indigo-400' : 
                        isTask ? 'bg-purple-50/30 border-purple-100 hover:border-purple-400' : 
                        isOff ? 'bg-gray-50/50 border-transparent hover:border-gray-200' : 
                        'bg-orange-50/30 border-orange-100 hover:border-orange-400';

    return (
      <div 
        onClick={() => handleEditDay(empId, dateStr, dayData)} 
        className={`${baseClasses} ${themeClasses} ${isCompact ? 'min-h-0 py-3' : 'min-h-[160px]'}`}
      >
        {(isNormal || isWFH || isTask || isTardy || isEarly) ? (
          <div className={`${isCompact ? 'flex items-center justify-between w-full' : 'space-y-4'}`}>
            <div className="space-y-0.5">
              <p className={`text-[10px] font-black uppercase tracking-widest ${isTask ? 'text-purple-600' : isTardy ? 'text-indigo-600' : isEarly ? 'text-rose-600' : isWFH ? 'text-indigo-600' : 'text-blue-600'}`}>
                {isWFH ? 'WFH' : isTask ? `Task (${dayData.minutes}m)` : isTardy ? `Tardy (${dayData.minutes}m)` : isEarly ? `Early (${dayData.minutes}m)` : 'Shift'}
              </p>
              <p className={`${isCompact ? 'text-xs' : 'text-sm'} font-black text-gray-900`}>{dayData.shift?.startTime} - {dayData.shift?.endTime}</p>
            </div>
            {!isCompact && (
              <div className="space-y-1.5 pt-2 border-t border-gray-100/50">
                {dayData.shift?.breaks?.map((br, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase">Br {idx + 1}</span>
                    <span className="text-[10px] font-bold text-gray-500">{br.start}</span>
                  </div>
                ))}
              </div>
            )}
            {isCompact && (
               <div className="flex gap-3">
                  {dayData.shift?.breaks?.map((br, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <Coffee size={10} className="text-gray-300" />
                      <span className="text-[9px] font-bold text-gray-400">{br.start}</span>
                    </div>
                  ))}
               </div>
            )}
          </div>
        ) : isOff ? (
          <div className={`flex-1 flex flex-col items-center justify-center ${isCompact ? 'flex-row gap-2' : 'space-y-2'} opacity-40`}>
            <Moon size={isCompact ? 14 : 24} className="text-gray-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Day Off</span>
          </div>
        ) : dayData.type === DayType.PUBLIC_HOLIDAY ? (
          <div className={`flex-1 flex flex-col items-center justify-center ${isCompact ? 'flex-row gap-2' : 'space-y-2'}`}>
            <Star size={isCompact ? 14 : 24} className="text-orange-600" />
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">Public Holiday</span>
          </div>
        ) : dayData.type === DayType.ANNUAL_LEAVE ? (
          <div className={`flex-1 flex flex-col items-center justify-center ${isCompact ? 'flex-row gap-2' : 'space-y-2'}`}>
            <Palmtree size={isCompact ? 14 : 24} className="text-emerald-600" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Annual Leave</span>
          </div>
        ) : dayData.type === DayType.SICK ? (
          <div className={`flex-1 flex flex-col items-center justify-center ${isCompact ? 'flex-row gap-2' : 'space-y-2'}`}>
            <Thermometer size={isCompact ? 14 : 24} className="text-rose-600" />
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Sick</span>
          </div>
        ) : (
          <div className={`${isCompact ? 'flex items-center justify-between w-full' : 'space-y-4'}`}>
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{dayData.type.replace('_', ' ')}</p>
            <p className={`${isCompact ? 'text-xs' : 'text-sm'} font-black text-gray-900`}>{dayData.shift?.startTime || '--:--'} - {dayData.shift?.endTime || '--:--'}</p>
          </div>
        )}
      </div>
    );
  };

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = false;
    if (selectedCompany === 'All') {
      matchesFilter = true;
    } else if (selectedCompany === 'TEAM LEADER') {
      matchesFilter = e.jobTitle?.toLowerCase().includes('team leader') ?? false;
    } else if (selectedCompany === 'COMPLAIN TEAM') {
      matchesFilter = e.jobTitle?.toLowerCase().includes('complain team') ?? false;
    } else {
      matchesFilter = e.companyName?.trim().toLowerCase() === selectedCompany.toLowerCase();
    }

    const matchesTeamLeader = selectedTeamLeader === 'All' || 
                              normalizeTL(e.teamLeader) === normalizeTL(selectedTeamLeader);
    
    return matchesSearch && matchesFilter && matchesTeamLeader;
  });

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
          <div className="flex items-center gap-3">
            {currentUser?.role === UserRole.SUPERVISOR && (
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none">
                  <Building2 size={16} />
                </div>
                <select 
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="pl-10 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none min-w-[160px] cursor-pointer"
                >
                  {filterOptions.map(c => (
                    <option key={c} value={c}>{c === 'All' ? 'All Companies' : c}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                  <Filter size={12} />
                </div>
              </div>
            )}
            
            {currentUser?.role === UserRole.SUPERVISOR && (
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                  <Users size={16} />
                </div>
                <select 
                  value={selectedTeamLeader}
                  onChange={(e) => setSelectedTeamLeader(e.target.value)}
                  className="pl-10 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none min-w-[160px] cursor-pointer"
                >
                  {teamLeaders.map(tl => (
                    <option key={tl} value={tl}>{tl === 'All' ? 'All Team Leaders' : tl}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                  <Filter size={12} />
                </div>
              </div>
            )}

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 rounded-2xl bg-black border border-gray-800 text-white focus:ring-4 focus:ring-blue-500/10 outline-none w-64 text-sm font-medium placeholder:text-gray-600"
              />
            </div>
            {currentUser?.role === UserRole.SUPERVISOR && (
              <div className="flex items-center gap-2">
                <button onClick={exportToExcel} className="flex items-center justify-center p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95" title="Export Current View">
                  <FileSpreadsheet size={20} />
                </button>
                <button onClick={() => setShowRangeExportModal(true)} className="flex items-center justify-center p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95" title="Export Date Range">
                  <Calendar size={20} />
                </button>
                <button 
                  onClick={() => setShowBulkUploadModal(true)} 
                  className="flex items-center justify-center p-3 bg-indigo-500 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 active:scale-95" 
                  title="Bulk Upload Shifts (Excel)"
                >
                  <Upload size={20} />
                </button>
                <button 
                  onClick={() => setShowClearWeekModal(true)} 
                  className="flex items-center justify-center p-3 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 active:scale-95" 
                  title="Clear Current Week Shifts"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={() => setShowAllCompanySummary(true)} 
                  className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95 text-[10px] font-black uppercase tracking-widest"
                >
                  <ClipboardList size={18} />
                  <span>All Company Summary</span>
                </button>
                <button 
                  onClick={() => setShowLeaveBalanceModal(true)} 
                  className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 text-[10px] font-black uppercase tracking-widest"
                >
                  <Star size={18} />
                  <span>Leave Balance</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex bg-gray-50 border border-gray-200 rounded-2xl p-1">
            <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 transition-all"><ChevronLeft size={18} /></button>
            <div className="px-6 font-black text-gray-800 text-xs min-w-[200px] text-center flex items-center justify-center uppercase tracking-widest">
              {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
            </div>
            <button onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 transition-all"><ChevronRight size={18} /></button>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1">
            <div className="flex items-center gap-2 px-3 py-1">
              <Filter size={14} className="text-gray-400" />
              <div className="flex items-center gap-1">
                <input 
                  type="date" 
                  value={mainStartDate}
                  onChange={(e) => setMainStartDate(e.target.value)}
                  className="bg-transparent border-none text-[9px] font-black uppercase outline-none w-[105px] cursor-pointer"
                  title="Start Date"
                />
                <span className="text-gray-300 font-bold">→</span>
                <input 
                  type="date" 
                  value={mainEndDate}
                  onChange={(e) => setMainEndDate(e.target.value)}
                  className="bg-transparent border-none text-[9px] font-black uppercase outline-none w-[105px] cursor-pointer"
                  title="End Date"
                />
              </div>
              {(mainStartDate || mainEndDate) && (
                <button 
                  onClick={() => { setMainStartDate(''); setMainEndDate(''); }}
                  className="p-1.5 hover:bg-white rounded-lg text-rose-500 transition-all shadow-sm"
                  title="Clear Range"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 mx-auto lg:mx-0">
        <div className="flex items-center gap-2 p-2 bg-white border border-gray-100 rounded-[28px] shadow-sm w-fit max-w-full overflow-x-auto hide-scrollbar">
          {rangeDays ? (
            <div className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-blue-100">
              <Calendar size={14} /> Custom Range: {rangeDays.length} Days
            </div>
          ) : (
            <>
              <button onClick={() => setSelectedDayIndex('all')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedDayIndex === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}>
                <CalendarDays size={14} /> Full Week
              </button>
              <div className="w-px h-6 bg-gray-100 mx-1"></div>
              {dayLabels.map((label, idx) => (
                <button key={label} onClick={() => setSelectedDayIndex(idx)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedDayIndex === idx ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {label} {format(weekDays[idx], 'd')}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 bg-white border border-gray-100 rounded-2xl shadow-sm">
          {viewMode === 'horizontal' && (
            <button 
              onClick={() => setWeeklyWrap(!weeklyWrap)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest ${weeklyWrap ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
              title="Wrap Every 7 Days"
            >
              <Rows size={14} />
              <span>{weeklyWrap ? 'Weekly Wrap On' : 'Weekly Wrap Off'}</span>
            </button>
          )}
          <button 
            onClick={() => setViewMode('horizontal')}
            className={`p-2.5 rounded-xl transition-all ${viewMode === 'horizontal' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
            title="Horizontal View"
          >
            <Columns size={18} />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
            title="Grid View (7 Columns)"
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('vertical')}
            className={`p-2.5 rounded-xl transition-all ${viewMode === 'vertical' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
            title="Vertical View"
          >
            <Rows size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-blue-50/20 overflow-hidden">
        {viewMode === 'horizontal' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-[300px]">Employee</th>
                  {(!weeklyWrap ? displayedDays : displayedDays.slice(0, 7)).map(day => (
                    <th key={day.toString()} className="px-4 py-6 text-center border-l border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{format(day, 'EEE')}</p>
                      <p className="text-2xl font-black text-gray-900 mt-1">{format(day, 'd')}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map(emp => {
                  const weeks = [];
                  if (weeklyWrap) {
                    for (let i = 0; i < displayedDays.length; i += 7) {
                      weeks.push(displayedDays.slice(i, i + 7));
                    }
                  } else {
                    weeks.push(displayedDays);
                  }

                  return weeks.map((week, weekIdx) => (
                    <tr key={`${emp.id}-${weekIdx}`} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-5">
                          {weekIdx === 0 ? (
                            <>
                              <div className="w-14 h-14 rounded-[20px] bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-200">
                                {emp.name.charAt(0)}
                              </div>
                              <div className="space-y-1">
                                <h3 className="text-lg font-black text-gray-900 leading-tight">{emp.name}</h3>
                                <div className="flex flex-col gap-1">
                                  <span className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-wider"><Briefcase size={10} /> {emp.jobTitle || 'CSR'}</span>
                                  <span className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider"><Building2 size={10} /> {emp.companyName || 'Swipr'}</span>
                                  {emp.teamLeader && (
                                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase tracking-wider"><Users size={10} /> TL: {emp.teamLeader}</span>
                                  )}
                                  <button 
                                    onClick={() => setSelectedEmployeeSummary(emp)}
                                    className="mt-2 flex items-center gap-1.5 text-[9px] font-black text-white bg-gray-900 px-3 py-1.5 rounded-lg uppercase tracking-wider hover:bg-black transition-all shadow-sm active:scale-95 w-fit"
                                  >
                                    <ClipboardList size={10} /> View Summary
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-3 pl-14">
                              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Week {weekIdx + 1}</span>
                              <div className="h-px w-10 bg-gray-100"></div>
                            </div>
                          )}
                        </div>
                      </td>
                      {week.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayData = (allSchedules[emp.id] || {})[dateStr];
                        return (
                          <td key={dateStr} className="p-2 border-l border-gray-100">
                            {renderDayCell(emp.id, dateStr, dayData)}
                          </td>
                        );
                      })}
                      {/* Fill empty cells if week is partial */}
                      {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                        <td key={`empty-${i}`} className="p-2 border-l border-gray-100 bg-gray-50/20"></td>
                      ))}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-8 space-y-12">
            {filteredEmployees.map(emp => (
              <div key={emp.id} className="space-y-6">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{emp.name}</h3>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{emp.jobTitle || 'CSR'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {displayedDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayData = (allSchedules[emp.id] || {})[dateStr];
                    return (
                      <div key={dateStr} className="space-y-2">
                        <div className="flex justify-between items-center px-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{format(day, 'EEE')}</span>
                          <span className="text-xs font-black text-gray-900">{format(day, 'MMM d')}</span>
                        </div>
                        {renderDayCell(emp.id, dateStr, dayData)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 space-y-12">
            {filteredEmployees.map(emp => (
              <div key={emp.id} className="space-y-6">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{emp.name}</h3>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{emp.jobTitle || 'CSR'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {displayedDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayData = (allSchedules[emp.id] || {})[dateStr];
                    return (
                      <div key={dateStr} className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                        <div className="w-24 shrink-0">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{format(day, 'EEEE')}</p>
                          <p className="text-sm font-black text-gray-900">{format(day, 'MMM d, yyyy')}</p>
                        </div>
                        <div className="flex-1">
                          {renderDayCell(emp.id, dateStr, dayData, true)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingDay && editFormData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg"><Calendar size={24} /></div>
                <div><h2 className="text-xl font-black text-gray-900">Modify Roster</h2><p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{format(new Date(editingDay.date.replace(/-/g, '/')), 'EEEE, MMMM do').toUpperCase()}</p></div>
              </div>
              <button onClick={() => setEditingDay(null)} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-10 space-y-10 overflow-y-auto max-h-[80vh] hide-scrollbar">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Classification</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[DayType.NORMAL_SHIFT, DayType.WORK_FROM_HOME, DayType.TASK, DayType.DAY_OFF, DayType.ABSENT, DayType.PUBLIC_HOLIDAY, DayType.ANNUAL_LEAVE, DayType.SICK, DayType.TARDY, DayType.EARLY_LEAVE].map(type => (
                    <button key={type} onClick={() => handleTypeChange(type)} className={`py-3.5 px-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${editFormData.type === type ? 'border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-100' : 'border-transparent bg-[#F8FAFC] text-gray-500 hover:bg-gray-100'}`}>
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {[DayType.TASK, DayType.TARDY, DayType.EARLY_LEAVE].includes(editFormData.type) && (
                <div className="space-y-4 p-6 bg-gray-50 rounded-[32px] border border-gray-100 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <Timer size={20} className="text-blue-600" />
                    <label className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Duration (Minutes)</label>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={editFormData.minutes || ''} 
                      onChange={e => setEditFormData({ ...editFormData, minutes: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 15, 30, 60"
                      className="w-full p-5 bg-white border border-gray-200 rounded-2xl font-black text-lg outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-300"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs uppercase tracking-widest pointer-events-none">MINS</div>
                  </div>
                </div>
              )}

              {[DayType.NORMAL_SHIFT, DayType.WORK_FROM_HOME, DayType.TASK, DayType.TARDY, DayType.EARLY_LEAVE].includes(editFormData.type) && editFormData.shift && (
                <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Shift Start</label>
                      <input type="time" value={editFormData.shift.startTime} onChange={e => handleTimeChange('start', e.target.value)} className="w-full p-5 bg-[#F8FAFC] border border-transparent rounded-2xl font-black text-lg outline-none focus:bg-white focus:border-blue-500 transition-all text-gray-900" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Shift End</label>
                      <input type="time" value={editFormData.shift.endTime} onChange={e => handleTimeChange('end', e.target.value)} className="w-full p-5 bg-[#F8FAFC] border border-transparent rounded-2xl font-black text-lg outline-none focus:bg-white focus:border-blue-500 transition-all text-gray-900" />
                    </div>
                  </div>

                  <div className="space-y-6 p-8 bg-emerald-50/50 border border-emerald-100 rounded-[32px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100">
                          <Copy size={18} />
                        </div>
                        <div>
                          <label className="text-[11px] font-black text-emerald-900 uppercase tracking-[0.2em]">Apply to other days</label>
                          <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mt-0.5">Duplicates this shift across the week</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setApplyToWeek(!applyToWeek)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${applyToWeek ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100' : 'bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-50'}`}
                      >
                        {applyToWeek ? 'Bulk Mode Active' : 'Enable Bulk Mode'}
                      </button>
                    </div>

                    {applyToWeek && (
                      <div className="space-y-6 pt-6 border-t border-emerald-100 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-wrap gap-2">
                          {dayLabels.map((label, idx) => (
                            <button
                              key={label}
                              onClick={() => toggleWeekDay(idx)}
                              className={`w-12 h-12 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center border-2 ${selectedWeekDays.includes(idx) ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-emerald-50 text-emerald-300 hover:border-emerald-200'}`}
                            >
                              {label[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <label className="text-[11px] font-black text-[#64748B] uppercase tracking-[0.2em] ml-1">Breaks (Staggered Automatically)</label>
                    <div className="space-y-5">
                      {editFormData.shift.breaks.map((br, idx) => (
                        <div key={idx} className="grid grid-cols-[140px_1fr_1fr] items-center gap-6 group">
                          <span className="text-sm font-semibold text-[#475569]">{breakLabels[idx]}</span>
                          <div className="relative">
                            <input type="time" value={br.start} onChange={(e) => handleBreakChange(idx, 'start', e.target.value)} className="w-full bg-white border border-[#E2E8F0] rounded-[14px] px-5 py-3.5 text-base font-bold text-[#1E293B] outline-none focus:border-blue-500 transition-all pr-12 appearance-none" />
                            <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" size={18} />
                          </div>
                          <div className="relative">
                            <input type="time" value={br.end} onChange={(e) => handleBreakChange(idx, 'end', e.target.value)} className="w-full bg-white border border-[#E2E8F0] rounded-[14px] px-5 py-3.5 text-base font-bold text-[#1E293B] outline-none focus:border-blue-500 transition-all pr-12 appearance-none" />
                            <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" size={18} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6 pt-6 border-t border-gray-100">
                <button onClick={saveDay} disabled={isSaving} className="w-full py-6 bg-gray-900 text-white rounded-[32px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50">
                  <Save size={20} /> {isSaving ? 'Processing...' : 'Save Roster Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRangeExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 bg-blue-600 text-white flex justify-between items-center">
              <h3 className="font-black text-xl tracking-tight">Export Date Range</h3>
              <button onClick={() => setShowRangeExportModal(false)} className="p-2 hover:bg-blue-700 rounded-full"><X size={24} /></button>
            </div>
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="date"
                      value={exportStartDate}
                      onChange={e => setExportStartDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 text-sm font-bold bg-gray-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="date"
                      value={exportEndDate}
                      onChange={e => setExportEndDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 text-sm font-bold bg-gray-50 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <button 
                  onClick={exportRangeToExcel}
                  className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center space-x-2"
                >
                  <FileSpreadsheet size={18} />
                  <span>Download Excel</span>
                </button>
                <button onClick={() => setShowRangeExportModal(false)} className="w-full py-2 text-xs font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Upload size={24} />
                <h3 className="font-black text-xl tracking-tight uppercase">Bulk Upload Shifts</h3>
              </div>
              <button onClick={() => { setShowBulkUploadModal(false); setBulkUploadProgress(null); }} className="p-2 hover:bg-indigo-700 rounded-full"><X size={24} /></button>
            </div>
            <div className="p-10 space-y-8">
              <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 space-y-4">
                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest">Excel Format Instructions</h4>
                <p className="text-[10px] font-bold text-indigo-600/80 leading-relaxed uppercase tracking-wider">
                  The system will apply shifts to the 7 days of the currently selected week ({format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d')}).
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2 text-[9px] font-black text-indigo-900 uppercase bg-white/50 px-3 py-1.5 rounded-lg border border-indigo-100/50">
                    <Check size={10} className="text-emerald-500" />
                    Column A: EM ID (Employee ID)
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-black text-indigo-900 uppercase bg-white/50 px-3 py-1.5 rounded-lg border border-indigo-100/50">
                    <Check size={10} className="text-emerald-500" />
                    Column B: Name (Optional)
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-black text-indigo-900 uppercase bg-white/50 px-3 py-1.5 rounded-lg border border-indigo-100/50">
                    <Check size={10} className="text-emerald-500" />
                    Columns C-I: Sunday to Saturday Shifts
                  </div>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-indigo-100/30">
                  <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Cell Value Examples:</p>
                  <div className="flex flex-wrap gap-2">
                    <code className="text-[9px] font-black text-indigo-900 bg-white px-2 py-1 rounded">08:00 - 16:00</code>
                    <code className="text-[9px] font-black text-indigo-900 bg-white px-2 py-1 rounded">OFF</code>
                    <code className="text-[9px] font-black text-indigo-900 bg-white px-2 py-1 rounded">ABSENT</code>
                    <code className="text-[9px] font-black text-indigo-900 bg-white px-2 py-1 rounded">PUBLIC</code>
                    <code className="text-[9px] font-black text-indigo-900 bg-white px-2 py-1 rounded">SICK</code>
                    <code className="text-[9px] font-black text-indigo-900 bg-white px-2 py-1 rounded">ANNUAL</code>
                  </div>
                </div>
              </div>

              {!bulkUploadProgress ? (
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleBulkUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-gray-200 rounded-[32px] p-12 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-indigo-600 shadow-sm transition-all">
                      <FileSpreadsheet size={32} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Click to upload Excel</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">or drag and drop file here</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <span>Processing Progress</span>
                      <span>{Math.round((bulkUploadProgress.current / bulkUploadProgress.total) * 100)}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                      <div 
                        className="h-full bg-indigo-600 transition-all duration-300" 
                        style={{ width: `${(bulkUploadProgress.current / bulkUploadProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-center text-[10px] font-black text-gray-900 uppercase tracking-widest">
                      {bulkUploadProgress.current} / {bulkUploadProgress.total} Rows Processed
                    </p>
                  </div>

                  {bulkUploadProgress.errors.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 space-y-3 max-h-[200px] overflow-y-auto hide-scrollbar">
                      <div className="flex items-center gap-2 text-rose-600 mb-2">
                        <XCircle size={16} />
                        <h5 className="text-[10px] font-black uppercase tracking-widest">Upload Errors ({bulkUploadProgress.errors.length})</h5>
                      </div>
                      {bulkUploadProgress.errors.map((err, idx) => (
                        <p key={idx} className="text-[9px] font-bold text-rose-500 uppercase tracking-wider border-l-2 border-rose-200 pl-3 py-0.5">
                          {err}
                        </p>
                      ))}
                    </div>
                  )}

                  {bulkUploadProgress.current === bulkUploadProgress.total && bulkUploadProgress.errors.length > 0 && (
                    <button 
                      onClick={() => { setShowBulkUploadModal(false); setBulkUploadProgress(null); }}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                    >
                      Close & Review Errors
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showClearWeekModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Trash2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Clear This Week?</h3>
                <p className="text-sm font-bold text-gray-500 leading-relaxed">
                  This will permanently delete all shifts and roster data for the currently selected week:
                  <span className="block text-rose-600 mt-2 font-black">
                    {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
                  </span>
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={handleClearWeek}
                  disabled={isSaving}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 disabled:opacity-50"
                >
                  {isSaving ? 'Clearing...' : 'Yes, Clear Everything'}
                </button>
                <button 
                  onClick={() => setShowClearWeekModal(false)}
                  className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAllCompanySummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-6xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200"><ClipboardList size={24} /></div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">All Company Summary</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Aggregate Attendance & Leave Records</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-1">
                    <input 
                      type="date" 
                      value={summaryStartDate}
                      onChange={(e) => setSummaryStartDate(e.target.value)}
                      className="bg-transparent border-none text-[10px] font-black uppercase outline-none w-[110px] cursor-pointer"
                    />
                    <span className="text-gray-300">→</span>
                    <input 
                      type="date" 
                      value={summaryEndDate}
                      onChange={(e) => setSummaryEndDate(e.target.value)}
                      className="bg-transparent border-none text-[10px] font-black uppercase outline-none w-[110px] cursor-pointer"
                    />
                  </div>
                </div>
                <button onClick={() => setShowAllCompanySummary(false)} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 transition-colors"><X size={24} /></button>
              </div>
            </div>
            
            <div className="p-0 overflow-auto flex-1 hide-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                  <tr className="border-b border-gray-100">
                    <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">Employee</th>
                    <th className="px-4 py-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center bg-emerald-50/30">Annual Bal</th>
                    <th className="px-4 py-6 text-[10px] font-black text-orange-600 uppercase tracking-widest text-center bg-orange-50/30">Public Bal</th>
                    <th className="px-4 py-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center bg-emerald-50/30">Annual</th>
                    <th className="px-4 py-6 text-[10px] font-black text-rose-600 uppercase tracking-widest text-center bg-rose-50/30">Sick</th>
                    <th className="px-4 py-6 text-[10px] font-black text-orange-600 uppercase tracking-widest text-center bg-orange-50/30">Public</th>
                    <th className="px-4 py-6 text-[10px] font-black text-rose-700 uppercase tracking-widest text-center bg-rose-100/30">Absent</th>
                    <th className="px-4 py-6 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center bg-indigo-50/30">Tardy</th>
                    <th className="px-4 py-6 text-[10px] font-black text-rose-500 uppercase tracking-widest text-center bg-rose-50/30">Early</th>
                    <th className="px-4 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center bg-gray-50/30">Off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEmployees.map(emp => {
                    const summary = getEmployeeSummary(emp.id);
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white font-black text-xs">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900">{emp.name}</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{emp.jobTitle || 'CSR'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className={`text-xs font-black ${ (emp.annualBalance || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {emp.annualBalance || 0}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className={`text-xs font-black ${ (emp.publicBalance || 0) < 0 ? 'text-rose-600' : 'text-orange-600'}`}>
                            {emp.publicBalance || 0}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${summary[DayType.ANNUAL_LEAVE].length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-300'}`}>
                              {summary[DayType.ANNUAL_LEAVE].length}
                            </span>
                            {summary[DayType.ANNUAL_LEAVE].length > 0 && (
                              <div className="grid grid-cols-7 gap-0.5 max-w-[140px] mx-auto">
                                {summary[DayType.ANNUAL_LEAVE].sort().map(date => (
                                  <span key={date} className="text-[7px] font-bold text-emerald-600 bg-emerald-50 px-0.5 py-0.5 rounded border border-emerald-100/50 text-center min-w-[16px]">
                                    {format(new Date(date.replace(/-/g, '/')), 'dd')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${summary[DayType.SICK].length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-gray-50 text-gray-300'}`}>
                              {summary[DayType.SICK].length}
                            </span>
                            {summary[DayType.SICK].length > 0 && (
                              <div className="grid grid-cols-7 gap-0.5 max-w-[140px] mx-auto">
                                {summary[DayType.SICK].sort().map(date => (
                                  <span key={date} className="text-[7px] font-bold text-rose-600 bg-rose-50 px-0.5 py-0.5 rounded border border-rose-100/50 text-center min-w-[16px]">
                                    {format(new Date(date.replace(/-/g, '/')), 'dd')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${summary[DayType.PUBLIC_HOLIDAY].length > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-300'}`}>
                              {summary[DayType.PUBLIC_HOLIDAY].length}
                            </span>
                            {summary[DayType.PUBLIC_HOLIDAY].length > 0 && (
                              <div className="grid grid-cols-7 gap-0.5 max-w-[140px] mx-auto">
                                {summary[DayType.PUBLIC_HOLIDAY].sort().map(date => (
                                  <span key={date} className="text-[7px] font-bold text-orange-600 bg-orange-50 px-0.5 py-0.5 rounded border border-orange-100/50 text-center min-w-[16px]">
                                    {format(new Date(date.replace(/-/g, '/')), 'dd')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${summary[DayType.ABSENT].length > 0 ? 'bg-rose-200 text-rose-800' : 'bg-gray-50 text-gray-300'}`}>
                              {summary[DayType.ABSENT].length}
                            </span>
                            {summary[DayType.ABSENT].length > 0 && (
                              <div className="grid grid-cols-7 gap-0.5 max-w-[140px] mx-auto">
                                {summary[DayType.ABSENT].sort().map(date => (
                                  <span key={date} className="text-[7px] font-bold text-rose-800 bg-rose-100 px-0.5 py-0.5 rounded border border-rose-200/50 text-center min-w-[16px]">
                                    {format(new Date(date.replace(/-/g, '/')), 'dd')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${summary[DayType.TARDY].length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-300'}`}>
                              {summary[DayType.TARDY].length}
                            </span>
                            {summary[DayType.TARDY].length > 0 && (
                              <div className="grid grid-cols-7 gap-0.5 max-w-[140px] mx-auto">
                                {summary[DayType.TARDY].sort().map(date => (
                                  <span key={date} className="text-[7px] font-bold text-indigo-600 bg-indigo-50 px-0.5 py-0.5 rounded border border-indigo-100/50 text-center min-w-[16px]">
                                    {format(new Date(date.replace(/-/g, '/')), 'dd')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${summary[DayType.EARLY_LEAVE].length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-gray-50 text-gray-300'}`}>
                              {summary[DayType.EARLY_LEAVE].length}
                            </span>
                            {summary[DayType.EARLY_LEAVE].length > 0 && (
                              <div className="grid grid-cols-7 gap-0.5 max-w-[140px] mx-auto">
                                {summary[DayType.EARLY_LEAVE].sort().map(date => (
                                  <span key={date} className="text-[7px] font-bold text-rose-600 bg-rose-50 px-0.5 py-0.5 rounded border border-rose-100/50 text-center min-w-[16px]">
                                    {format(new Date(date.replace(/-/g, '/')), 'dd')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${summary[DayType.DAY_OFF].length > 0 ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-300'}`}>
                              {summary[DayType.DAY_OFF].length}
                            </span>
                            {summary[DayType.DAY_OFF].length > 0 && (
                              <div className="grid grid-cols-7 gap-0.5 max-w-[140px] mx-auto">
                                {summary[DayType.DAY_OFF].sort().map(date => (
                                  <span key={date} className="text-[7px] font-bold text-gray-400 bg-gray-50 px-0.5 py-0.5 rounded border border-gray-100 text-center min-w-[16px]">
                                    {format(new Date(date.replace(/-/g, '/')), 'dd')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Showing summary for {filteredEmployees.length} employees</p>
              <button 
                onClick={() => {
                  const dataToExport = filteredEmployees.map(emp => {
                    const summary = getEmployeeSummary(emp.id);
                    return {
                      'Employee Name': emp.name,
                      'Employee ID': emp.employeeId || 'N/A',
                      'Job Title': emp.jobTitle || 'CSR',
                      'Annual Leave Count': summary[DayType.ANNUAL_LEAVE].length,
                      'Annual Leave Dates': summary[DayType.ANNUAL_LEAVE].sort().join(', '),
                      'Sick Leave Count': summary[DayType.SICK].length,
                      'Sick Leave Dates': summary[DayType.SICK].sort().join(', '),
                      'Public Holiday Count': summary[DayType.PUBLIC_HOLIDAY].length,
                      'Public Holiday Dates': summary[DayType.PUBLIC_HOLIDAY].sort().join(', '),
                      'Absent Count': summary[DayType.ABSENT].length,
                      'Absent Dates': summary[DayType.ABSENT].sort().join(', '),
                      'Tardy Count': summary[DayType.TARDY].length,
                      'Tardy Dates': summary[DayType.TARDY].sort().join(', '),
                      'Early Leave Count': summary[DayType.EARLY_LEAVE].length,
                      'Early Leave Dates': summary[DayType.EARLY_LEAVE].sort().join(', '),
                      'Day Off Count': summary[DayType.DAY_OFF].length,
                      'Day Off Dates': summary[DayType.DAY_OFF].sort().join(', ')
                    };
                  });
                  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                  const workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(workbook, worksheet, 'Company Summary');
                  XLSX.writeFile(workbook, `Company_Summary_${summaryStartDate || 'All'}_to_${summaryEndDate || 'All'}.xlsx`);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
              >
                <FileSpreadsheet size={16} />
                Export Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEmployeeSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center text-white shadow-lg"><ClipboardList size={24} /></div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{selectedEmployeeSummary.name}</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Attendance & Leave Summary</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmployeeSummary(null)} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh] hide-scrollbar">
              {/* Balance Summary Cards */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[32px] p-6 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg">
                    <Palmtree size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Remaining Annual</p>
                    <p className="text-2xl font-black text-gray-900">{(selectedEmployeeSummary.annualBalance || 0) - employeeTotalTaken.annual} Days</p>
                  </div>
                </div>
                <div className="bg-orange-50 border-2 border-orange-100 rounded-[32px] p-6 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-lg">
                    <Star size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Remaining Public</p>
                    <p className="text-2xl font-black text-gray-900">{(selectedEmployeeSummary.publicBalance || 0) - employeeTotalTaken.public} Days</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50/50 border-2 border-gray-100 rounded-[32px] p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-white shadow-lg">
                      <Filter size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Filter Records</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Show records within a specific date range</p>
                    </div>
                  </div>
                  {(summaryStartDate || summaryEndDate) && (
                    <button 
                      onClick={() => { setSummaryStartDate(''); setSummaryEndDate(''); }}
                      className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">From Date</label>
                    <input 
                      type="date" 
                      value={summaryStartDate}
                      onChange={e => setSummaryStartDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-white text-xs font-bold outline-none focus:ring-4 focus:ring-gray-900/10 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">To Date</label>
                    <input 
                      type="date" 
                      value={summaryEndDate}
                      onChange={e => setSummaryEndDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-white text-xs font-bold outline-none focus:ring-4 focus:ring-gray-900/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              {currentUser?.role === UserRole.SUPERVISOR && (
                <div className="bg-blue-50/50 border-2 border-blue-100 rounded-[32px] p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                      <Plus size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Add Historical Record</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update records from before system implementation</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                      <input 
                        type="date" 
                        value={historicalDate}
                        onChange={e => setHistoricalDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-blue-100 bg-white text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Type</label>
                      <select 
                        value={historicalType}
                        onChange={e => setHistoricalType(e.target.value as DayType)}
                        className="w-full px-4 py-3 rounded-xl border border-blue-100 bg-white text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none"
                      >
                        <option value={DayType.ANNUAL_LEAVE}>Annual Leave</option>
                        <option value={DayType.SICK}>Sick Leave</option>
                        <option value={DayType.PUBLIC_HOLIDAY}>Public Holiday</option>
                        <option value={DayType.DAY_OFF}>Day Off</option>
                        <option value={DayType.ABSENT}>Absent</option>
                        <option value={DayType.TARDY}>Tardy</option>
                        <option value={DayType.EARLY_LEAVE}>Early Leave</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={addHistoricalDay}
                        disabled={isSaving}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSaving ? <Clock size={14} className="animate-spin" /> : <Save size={14} />}
                        Add Record
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(getEmployeeSummary(selectedEmployeeSummary.id)).map(([type, dates]) => {
                  const isAlwaysShown = [DayType.ANNUAL_LEAVE, DayType.SICK, DayType.PUBLIC_HOLIDAY, DayType.ABSENT, DayType.TARDY].includes(type as DayType);
                  if (dates.length === 0 && !isAlwaysShown) return null;
                  
                  const icon = type === DayType.ANNUAL_LEAVE ? <Palmtree size={18} className="text-emerald-600" /> :
                               type === DayType.SICK ? <Thermometer size={18} className="text-rose-600" /> :
                               type === DayType.PUBLIC_HOLIDAY ? <Star size={18} className="text-orange-600" /> :
                               type === DayType.ABSENT ? <XCircle size={18} className="text-rose-600" /> :
                               type === DayType.DAY_OFF ? <Moon size={18} className="text-gray-400" /> :
                               type === DayType.TARDY ? <Timer size={18} className="text-indigo-600" /> :
                               <Clock size={18} className="text-rose-600" />;
                  
                  const colorClass = type === DayType.ANNUAL_LEAVE ? 'bg-emerald-50 border-emerald-100' :
                                     type === DayType.SICK ? 'bg-rose-50 border-rose-100' :
                                     type === DayType.PUBLIC_HOLIDAY ? 'bg-orange-50 border-orange-100' :
                                     type === DayType.ABSENT ? 'bg-rose-50 border-rose-100' :
                                     type === DayType.DAY_OFF ? 'bg-gray-50 border-gray-100' :
                                     type === DayType.TARDY ? 'bg-indigo-50 border-indigo-100' :
                                     'bg-rose-50 border-rose-100';

                  return (
                    <div key={type} className={`p-6 rounded-[32px] border-2 ${colorClass} space-y-4`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {icon}
                          <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest">{type.replace('_', ' ')}</h4>
                        </div>
                        <span className="bg-white px-3 py-1 rounded-full text-xs font-black shadow-sm">{dates.length} Days</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {dates.length > 0 ? (
                          dates.sort().map(date => (
                            <span key={date} className="px-3 py-1 bg-white/50 rounded-lg text-[10px] font-bold text-gray-600 border border-white">
                              {format(new Date(date.replace(/-/g, '/')), 'MMM d, yyyy')}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic opacity-50">No records found</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Leave Request History */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-3 ml-1">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                    <History size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Leave Request History</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recent leave and holiday requests</p>
                  </div>
                </div>
                <div className="bg-white border-2 border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                        <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                        <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {leaveRequests
                        .filter(r => r.userId === selectedEmployeeSummary.id)
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .slice(0, 10)
                        .map(req => (
                          <tr key={req.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-8 py-5 text-xs font-bold text-gray-900">
                              {format(new Date(req.date.replace(/-/g, '/')), 'MMM d, yyyy')}
                            </td>
                            <td className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                              {req.type.replace('_', ' ')}
                            </td>
                            <td className="px-8 py-5">
                              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                req.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      {leaveRequests.filter(r => r.userId === selectedEmployeeSummary.id).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-8 py-12 text-center text-gray-300 font-bold text-[10px] uppercase tracking-widest">
                            No leave requests found for this employee
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Leave Balance Modal */}
      {showLeaveBalanceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Leave Balance Management</h2>
                <p className="text-gray-400 text-sm font-medium">Track and manage employee leave quotas.</p>
              </div>
              <button 
                onClick={() => setShowLeaveBalanceModal(false)}
                className="p-3 hover:bg-white rounded-2xl text-gray-400 transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8">
              {/* Calculation Tool */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-[24px] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <Timer size={18} />
                    </div>
                    <h3 className="font-black text-indigo-900 uppercase tracking-widest text-xs">Public Holiday Credit Tool</h3>
                  </div>
                  <button 
                    onClick={async () => {
                      if (!confirm("Are you sure you want to reset ALL public balances to 0? This cannot be undone.")) return;
                      setIsSaving(true);
                      try {
                        const updatedEmployees = await Promise.all(employees.map(async (emp) => {
                          const updated = { ...emp, publicBalance: 0 };
                          await store.updateUser(updated);
                          return updated;
                        }));
                        setEmployees(updatedEmployees);
                        alert("All public balances have been reset to 0.");
                      } catch (err) {
                        alert("Error resetting balances");
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="text-[9px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600 transition-colors"
                  >
                    Reset All to 0
                  </button>
                </div>
                <p className="text-indigo-700/70 text-xs font-medium">
                  Select a date range to calculate public holidays. For each day in this range, 1 day will be added to the Public Balance of all employees.
                </p>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Start Date</label>
                    <input 
                      type="date" 
                      value={balanceCalcStart}
                      onChange={(e) => setBalanceCalcStart(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-indigo-100 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">End Date</label>
                    <input 
                      type="date" 
                      value={balanceCalcEnd}
                      onChange={(e) => setBalanceCalcEnd(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-indigo-100 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                  <div className="flex-1 min-w-[120px] pb-1">
                    <div className="bg-white/80 border border-indigo-100 rounded-xl px-4 py-2 flex flex-col justify-center">
                      <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest">Egyptian Holidays</span>
                      <span className="text-lg font-black text-indigo-600 leading-tight">{holidaysInCalcRange.length} Days</span>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      if (holidaysInCalcRange.length === 0) {
                        alert('No public holidays found in the selected range. Please add public holidays to the list below first.');
                        return;
                      }
                      
                      const daysCount = holidaysInCalcRange.length;
                      const choice = confirm(`Found ${daysCount} holidays. \n\nClick OK to ADD ${daysCount} days to current balances. \nClick CANCEL to SET all balances to EXACTLY ${daysCount} days.`);
                      
                      setIsSaving(true);
                      try {
                        const updatedEmployees = await Promise.all(employees.map(async (emp) => {
                          const newBalance = choice ? (emp.publicBalance || 0) + daysCount : daysCount;
                          const updated = { ...emp, publicBalance: newBalance };
                          await store.updateUser(updated);
                          return updated;
                        }));
                        setEmployees(updatedEmployees);
                        alert(`Successfully ${choice ? 'added' : 'set'} ${daysCount} days to everyone's public balance.`);
                      } catch (err) {
                        alert('Error updating balances');
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving || holidaysInCalcRange.length === 0}
                    className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    Update All Balances
                  </button>
                </div>
              </div>

              {/* Annual Leave Management Tool */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-[24px] p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <Palmtree size={18} />
                  </div>
                  <h3 className="font-black text-emerald-900 uppercase tracking-widest text-xs">Annual Leave Management Tool</h3>
                </div>
                <p className="text-emerald-700/70 text-xs font-medium">
                  Update the annual leave balance for all employees at once. You can either add days to current balances or set them to a specific value.
                </p>
                <div className="flex items-end gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1">Days</label>
                    <input 
                      type="number" 
                      step="0.25"
                      defaultValue="21"
                      id="annualUpdateAmount"
                      className="w-32 px-4 py-2.5 rounded-xl bg-white border border-emerald-100 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      const amount = parseFloat((document.getElementById('annualUpdateAmount') as HTMLInputElement).value) || 0;
                      if (amount < 0) return;
                      
                      const choice = confirm(`Update Annual Balance for ALL employees with ${amount} days. \n\nClick OK to ADD ${amount} days to current balances. \nClick CANCEL to SET all balances to EXACTLY ${amount} days.`);

                      setIsSaving(true);
                      try {
                        const updatedEmployees = await Promise.all(employees.map(async (emp) => {
                          const newBalance = choice ? (emp.annualBalance || 0) + amount : amount;
                          const updated = { ...emp, annualBalance: newBalance };
                          await store.updateUser(updated);
                          return updated;
                        }));
                        setEmployees(updatedEmployees);
                        alert(`Successfully ${choice ? 'added' : 'set'} ${amount} days to everyone's annual balance.`);
                      } catch (err) {
                        alert('Error updating balances');
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                    className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    Update All Annual Balances
                  </button>
                </div>
              </div>

              {/* Balance Table */}
              <div className="border border-gray-100 rounded-[24px] overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Annual Balance</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Public Balance</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{emp.name}</p>
                              <p className="text-[10px] font-medium text-gray-400">{emp.jobTitle}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Palmtree size={14} className="text-emerald-500" />
                            <input 
                              type="number"
                              value={emp.annualBalance || 0}
                              onChange={async (e) => {
                                const val = parseInt(e.target.value) || 0;
                                const updated = { ...emp, annualBalance: val };
                                setEmployees(prev => prev.map(e => e.id === emp.id ? updated : e));
                                await store.updateUser(updated);
                              }}
                              className="w-16 bg-transparent border-none text-sm font-black text-gray-700 focus:ring-0 p-0"
                            />
                            <span className="text-[10px] font-bold text-gray-400">Days</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Star size={14} className="text-orange-500" />
                            <input 
                              type="number"
                              value={emp.publicBalance || 0}
                              onChange={async (e) => {
                                const val = parseInt(e.target.value) || 0;
                                const updated = { ...emp, publicBalance: val };
                                setEmployees(prev => prev.map(e => e.id === emp.id ? updated : e));
                                await store.updateUser(updated);
                              }}
                              className="w-16 bg-transparent border-none text-sm font-black text-gray-700 focus:ring-0 p-0"
                            />
                            <span className="text-[10px] font-bold text-gray-400">Days</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={async () => {
                              const newAnnual = prompt('Enter new Annual Balance:', (emp.annualBalance || 0).toString());
                              const newPublic = prompt('Enter new Public Balance:', (emp.publicBalance || 0).toString());
                              
                              if (newAnnual !== null || newPublic !== null) {
                                const updated = { 
                                  ...emp, 
                                  annualBalance: newAnnual !== null ? parseInt(newAnnual) : emp.annualBalance,
                                  publicBalance: newPublic !== null ? parseInt(newPublic) : emp.publicBalance
                                };
                                await store.updateUser(updated);
                                setEmployees(prev => prev.map(e => e.id === emp.id ? updated : e));
                              }
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-all"
                          >
                            <Plus size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div> 
  );
}
