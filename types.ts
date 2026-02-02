
export enum UserRole {
  SUPERVISOR = 'SUPERVISOR',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE'
}

export enum DayType {
  NORMAL_SHIFT = 'NORMAL_SHIFT',
  DAY_OFF = 'DAY_OFF',
  ABSENT = 'ABSENT',
  PUBLIC_HOLIDAY = 'PUBLIC_HOLIDAY',
  ANNUAL_LEAVE = 'ANNUAL_LEAVE',
  TARDY = 'TARDY',
  EARLY_LEAVE = 'EARLY_LEAVE'
}

export enum SwapStatus {
  PENDING_TARGET = 'PENDING_TARGET',
  PENDING_MANAGER = 'PENDING_MANAGER',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface Break {
  id: string;
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface Shift {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  breaks: [Break, Break, Break];
}

export interface ScheduleDay {
  id: string;
  date: string; // YYYY-MM-DD
  type: DayType;
  shift?: Shift;
  minutes?: number; // For Tardy/Early Leave duration
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  jobTitle?: string;
  employeeId?: string;
  companyName?: string;
  managerName?: string;
}

export interface SwapRequest {
  id: string;
  requesterId: string;
  targetId: string;
  date: string;
  status: SwapStatus;
  originalShift?: Shift;
  targetShift?: Shift;
}

export interface AppData {
  users: User[];
  schedules: Record<string, Record<string, ScheduleDay>>; // userId -> date -> ScheduleDay
  swapRequests: SwapRequest[];
}
