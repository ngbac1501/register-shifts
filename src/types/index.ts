import { Timestamp } from 'firebase/firestore';

// User Roles
export type UserRole = 'admin' | 'manager' | 'employee';

// Employee Types
export type EmployeeType = 'fulltime' | 'parttime';

// Shift Types
export type ShiftType = 'fulltime' | 'parttime';

// Schedule Status
export type ScheduleStatus = 'pending' | 'approved' | 'rejected' | 'completed';

// Shift Swap Status
export type SwapStatus = 'pending' | 'approved' | 'rejected';

// User Interface
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  storeId?: string; // For manager and employee
  phone?: string;
  employeeType?: EmployeeType; // For employee
  hourlyRate?: number; // For employee
  createdAt: Timestamp | Date;
  photoURL?: string;
}

// Store Interface
export interface Store {
  id: string;
  name: string;
  address: string;
  managerId: string;
  isActive: boolean;
  maxEmployeesPerShift?: number; // Số nhân viên tối đa cho 1 ca (default)
  maxHoursPerWeek?: number; // Số giờ tối đa/tuần cho 1 nhân viên
  minDaysOff?: number; // Số ngày nghỉ tối thiểu/tháng
  createdAt: Timestamp | Date;
}

// Shift Interface
export interface Shift {
  id: string;
  name: string; // Ca sáng, Ca chiều, Ca đêm, Part-time
  startTime: string; // Format: "06:30"
  endTime: string; // Format: "14:30"
  duration: number; // Hours (8 for fulltime, < 8 for parttime)
  type: ShiftType;
  isActive: boolean;
  maxEmployees?: number; // Số nhân viên tối đa cho ca này
}

// Schedule Interface
export interface Schedule {
  id: string;
  storeId: string;
  employeeId: string;
  shiftId: string;
  date: Timestamp | Date;
  status: ScheduleStatus;
  startTime?: string; // Custom start time for flexible shifts (Part-time)
  endTime?: string;   // Custom end time for flexible shifts (Part-time)
  requestedBy: string; // employeeId
  createdBy: string; // ID của người tạo (manager hoặc employee)
  assignedBy?: string; // ID của manager assign (nếu có)
  isAssigned?: boolean; // true nếu được manager assign
  approvedBy?: string; // managerId
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// Shift Swap Interface
export interface ShiftSwap {
  id: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  scheduleId: string;
  status: SwapStatus;
  createdAt: Timestamp | Date;
  approvedBy?: string; // managerId
}

// Extended interfaces with populated data
export interface ScheduleWithDetails extends Schedule {
  employee?: User;
  shift?: Shift;
  store?: Store;
}

export interface ShiftSwapWithDetails extends ShiftSwap {
  fromEmployee?: User;
  toEmployee?: User;
  schedule?: ScheduleWithDetails;
}

// Form Data Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  storeId?: string;
  phone?: string;
  employeeType?: EmployeeType;
  hourlyRate?: number;
}

export interface ShiftFormData {
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: ShiftType;
}

export interface ScheduleFormData {
  storeId: string;
  employeeId: string;
  shiftId: string;
  date: Date;
}

export interface StoreFormData {
  name: string;
  address: string;
  managerId: string;
}

// Statistics Types
export interface DashboardStats {
  totalStores?: number;
  totalUsers?: number;
  totalShifts?: number;
  totalSchedules?: number;
  pendingApprovals?: number;
  totalWorkingHours?: number;
  estimatedSalary?: number;
}

// Chart Data Types
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}
