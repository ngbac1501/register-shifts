import { Schedule, Shift, User } from '@/types';
import { calculateDuration, calculateNightShiftHours } from './utils';

export interface PayrollData {
    employeeId: string;
    employeeName: string;
    employeeType: string;
    hourlyRate: number;
    completedShifts: number;
    totalHours: number;
    nightShiftHours: number;
    nightShiftAllowance: number;
    totalSalary: number;
}

export interface MonthlyPayroll {
    month: Date;
    employees: PayrollData[];
    totalSalary: number;
    totalHours: number;
    totalShifts: number;
    totalNightAllowance: number;
}

/**
 * Tính lương cho một nhân viên trong tháng
 */
export function calculateEmployeePayroll(
    employee: User,
    schedules: Schedule[],
    shifts: Shift[],
    month: Date
): PayrollData {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    // Lọc schedules completed trong tháng
    const completedSchedules = schedules.filter(s => {
        if (s.employeeId !== employee.id) return false;
        if (s.status !== 'completed') return false;

        const scheduleDate = s.date instanceof Date ? s.date : s.date.toDate();
        return scheduleDate >= monthStart && scheduleDate <= monthEnd;
    });

    // Tính tổng giờ và phụ cấp ca đêm
    let totalHours = 0;
    let nightShiftHours = 0;

    completedSchedules.forEach(schedule => {
        // Use schedule times if available, otherwise shift def
        let duration = 0;
        let nightDuration = 0;

        if (schedule.startTime && schedule.endTime) {
            duration = calculateDuration(schedule.startTime, schedule.endTime);
            nightDuration = calculateNightShiftHours(schedule.startTime, schedule.endTime);
        } else {
            const shift = shifts.find(sh => sh.id === schedule.shiftId);
            if (shift) {
                duration = shift.duration;
                if (shift.startTime && shift.endTime) {
                    nightDuration = calculateNightShiftHours(shift.startTime, shift.endTime);
                }
            }
        }

        totalHours += duration;
        nightShiftHours += nightDuration;
    });

    const hourlyRate = employee.hourlyRate || 0;
    const baseSalary = totalHours * hourlyRate;
    const nightShiftAllowance = nightShiftHours * hourlyRate * 0.3; // 30% allowance
    const totalSalary = baseSalary + nightShiftAllowance;

    return {
        employeeId: employee.id,
        employeeName: employee.displayName,
        employeeType: employee.employeeType || 'fulltime',
        hourlyRate: hourlyRate,
        completedShifts: completedSchedules.length,
        totalHours,
        nightShiftHours,
        nightShiftAllowance,
        totalSalary,
    };
}

/**
 * Tính lương cho tất cả nhân viên trong tháng
 */
export function calculateMonthlyPayroll(
    employees: User[],
    schedules: Schedule[],
    shifts: Shift[],
    month: Date
): MonthlyPayroll {
    const employeePayrolls = employees.map(emp =>
        calculateEmployeePayroll(emp, schedules, shifts, month)
    );

    const totalSalary = employeePayrolls.reduce((sum, p) => sum + p.totalSalary, 0);
    const totalHours = employeePayrolls.reduce((sum, p) => sum + p.totalHours, 0);
    const totalShifts = employeePayrolls.reduce((sum, p) => sum + p.completedShifts, 0);
    const totalNightAllowance = employeePayrolls.reduce((sum, p) => sum + p.nightShiftAllowance, 0);

    return {
        month,
        employees: employeePayrolls,
        totalSalary,
        totalHours,
        totalShifts,
        totalNightAllowance,
    };
}

/**
 * So sánh với tháng trước
 */
export function compareWithPreviousMonth(
    current: MonthlyPayroll,
    previous: MonthlyPayroll
): {
    salaryChange: number;
    salaryChangePercent: number;
    hoursChange: number;
    hoursChangePercent: number;
} {
    const salaryChange = current.totalSalary - previous.totalSalary;
    const salaryChangePercent = previous.totalSalary > 0
        ? (salaryChange / previous.totalSalary) * 100
        : 0;

    const hoursChange = current.totalHours - previous.totalHours;
    const hoursChangePercent = previous.totalHours > 0
        ? (hoursChange / previous.totalHours) * 100
        : 0;

    return {
        salaryChange,
        salaryChangePercent,
        hoursChange,
        hoursChangePercent,
    };
}
