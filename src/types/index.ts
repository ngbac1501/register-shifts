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

// ==================== PHASE 1: LEAVE MANAGEMENT ====================

// Leave Types
export type LeaveType = 'annual' | 'sick' | 'personal' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

// Leave Interface
export interface Leave {
  id: string;
  employeeId: string;
  storeId: string;
  type: LeaveType;
  startDate: Timestamp | Date;
  endDate: Timestamp | Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string; // managerId or adminId
  rejectedReason?: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// Leave with populated data
export interface LeaveWithDetails extends Leave {
  employee?: User;
  store?: Store;
  approver?: User;
}

// Leave Balance
export interface LeaveBalance {
  employeeId: string;
  year: number;
  annual: {
    total: number;
    used: number;
    remaining: number;
  };
  sick: {
    total: number;
    used: number;
    remaining: number;
  };
  personal: {
    total: number;
    used: number;
    remaining: number;
  };
}

// Leave Form Data
export interface LeaveFormData {
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
}

// ==================== PHASE 1: NOTIFICATIONS ====================

// Notification Types
export type NotificationType =
  | 'schedule_approved'
  | 'schedule_rejected'
  | 'shift_reminder'
  | 'swap_request'
  | 'swap_approved'
  | 'swap_rejected'
  | 'leave_approved'
  | 'leave_rejected'
  | 'shift_assigned'
  | 'training_enrolled'
  | 'training_completed';

// Notification Interface
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp | Date;
}

// Notification Preferences
export interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  shiftReminder: boolean;
  shiftReminderHours: number; // Hours before shift
  leaveUpdates: boolean;
  swapRequests: boolean;
  trainingUpdates: boolean;
}

// ==================== PHASE 2: ENHANCED SHIFT SWAPS ====================

// Enhanced Shift Swap Types
export type ShiftSwapType = 'direct' | 'marketplace';

// Enhanced Shift Swap Interface
export interface ShiftSwapEnhanced {
  id: string;
  type: ShiftSwapType;
  fromEmployeeId: string;
  toEmployeeId?: string; // Optional for marketplace
  scheduleId: string;
  shiftDetails: {
    date: Timestamp | Date;
    shiftName: string;
    startTime: string;
    endTime: string;
  };
  reason?: string;
  status: SwapStatus;
  isMarketplace: boolean;
  interestedEmployees?: string[]; // For marketplace
  createdAt: Timestamp | Date;
  approvedBy?: string;
  expiresAt?: Timestamp | Date; // Auto-cancel if not claimed
  updatedAt?: Timestamp | Date;
}

// Shift Swap with populated data
export interface ShiftSwapEnhancedWithDetails extends ShiftSwapEnhanced {
  fromEmployee?: User;
  toEmployee?: User;
  schedule?: ScheduleWithDetails;
  interestedEmployeeDetails?: User[];
}

// ==================== PHASE 3: SKILLS & TRAINING ====================

// Skill Types
export type SkillCategory = 'technical' | 'soft' | 'management';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// Skill Interface
export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  isActive: boolean;
  createdAt: Timestamp | Date;
}

// Employee Skill
export interface EmployeeSkill {
  id: string;
  employeeId: string;
  skillId: string;
  level: SkillLevel;
  certifiedBy?: string; // managerId or adminId
  certifiedAt?: Timestamp | Date;
  expiresAt?: Timestamp | Date; // For certifications
  notes?: string;
}

// Employee Skill with populated data
export interface EmployeeSkillWithDetails extends EmployeeSkill {
  employee?: User;
  skill?: Skill;
  certifier?: User;
}

// Training Program Types
export type TrainingStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type EnrollmentStatus = 'enrolled' | 'completed' | 'dropped';

// Training Program
export interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  skillId: string;
  duration: number; // hours
  instructor?: string;
  maxParticipants: number;
  currentParticipants: number;
  status: TrainingStatus;
  startDate: Timestamp | Date;
  endDate: Timestamp | Date;
  createdBy: string; // adminId
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// Training Enrollment
export interface TrainingEnrollment {
  id: string;
  programId: string;
  employeeId: string;
  status: EnrollmentStatus;
  progress: number; // 0-100
  enrolledAt: Timestamp | Date;
  completedAt?: Timestamp | Date;
  certificateUrl?: string;
  notes?: string;
}

// Training with populated data
export interface TrainingProgramWithDetails extends TrainingProgram {
  skill?: Skill;
  creator?: User;
  enrollments?: TrainingEnrollment[];
}

export interface TrainingEnrollmentWithDetails extends TrainingEnrollment {
  program?: TrainingProgramWithDetails;
  employee?: User;
}

// ==================== ANALYTICS & REPORTS ====================

// Analytics Data Types
export interface AnalyticsData {
  period: string; // 'day' | 'week' | 'month' | 'year'
  startDate: Date;
  endDate: Date;
  totalHours: number;
  totalCost: number;
  totalShifts: number;
  averageHoursPerEmployee: number;
  attendanceRate: number;
  leaveRate: number;
}

export interface StoreAnalytics extends AnalyticsData {
  storeId: string;
  storeName: string;
  employeeCount: number;
  topPerformers: {
    employeeId: string;
    employeeName: string;
    totalHours: number;
  }[];
}

export interface EmployeeAnalytics {
  employeeId: string;
  employeeName: string;
  totalHours: number;
  totalShifts: number;
  completedShifts: number;
  cancelledShifts: number;
  lateCount: number;
  earlyLeaveCount: number;
  leavesTaken: number;
  attendanceRate: number;
  estimatedSalary: number;
}

// Report Types
export interface PayrollReport {
  employeeId: string;
  employeeName: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  deductions: number;
  netPay: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

// ==================== PWA ====================

// PWA Install Prompt
export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Service Worker Message
export interface ServiceWorkerMessage {
  type: 'SKIP_WAITING' | 'CLIENTS_CLAIM' | 'CACHE_UPDATED';
  payload?: any;
}
