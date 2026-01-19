import { Schedule, Shift, Store } from '@/types';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, differenceInHours, parse, addDays, isBefore, isAfter } from 'date-fns';
import { calculateDuration } from '@/lib/utils';

export type ConflictType = 'DUPLICATE' | 'OVERTIME' | 'CAPACITY' | 'CONSECUTIVE' | 'OVERLAP';

export interface Conflict {
    type: ConflictType;
    severity: 'warning' | 'error';
    message: string;
    scheduleId?: string;
}

// Helper to get start/end Date objects for a shift/schedule
function getShiftTimeRange(date: Date, startTime: string, endTime: string) {
    const start = parse(startTime, 'HH:mm', date);
    let end = parse(endTime, 'HH:mm', date);

    // Handle overnight shifts (end time < start time)
    if (isBefore(end, start)) {
        end = addDays(end, 1);
    }

    return { start, end };
}

/**
 * Kiểm tra xem nhân viên đã có ca trùng giờ trong ngày chưa
 */
export async function checkEmployeeConflict(
    employeeId: string,
    date: Date,
    startTime: string,
    endTime: string,
    scheduleId?: string, // ID của schedule đang edit (để exclude)
    existingSchedules?: Schedule[],
    shifts?: Shift[]
): Promise<Conflict | null> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Filter schedules trong cùng ngày (hoặc ngày kế tiếp nếu qua đêm)
    // Để đơn giản, lấy các schedule của employee đó, sau đó check overlap time
    const employeeSchedules = existingSchedules?.filter(s => {
        if (scheduleId && s.id === scheduleId) return false;
        if (s.employeeId !== employeeId) return false;
        if (s.status === 'rejected') return false;
        return true;
    }) || [];

    const { start: newStart, end: newEnd } = getShiftTimeRange(date, startTime, endTime);

    for (const schedule of employeeSchedules) {
        const scheduleShift = shifts?.find(s => s.id === schedule.shiftId);
        if (!scheduleShift) continue;

        const scheduleDate = schedule.date instanceof Date ? schedule.date : schedule.date.toDate();

        // Skip nếu schedule quá xa (khác ngày quá nhiều) - optimization
        if (Math.abs(scheduleDate.getTime() - date.getTime()) > 86400000 * 2) continue;

        const sStartTime = schedule.startTime || scheduleShift.startTime;
        const sEndTime = schedule.endTime || scheduleShift.endTime;

        const { start: existingStart, end: existingEnd } = getShiftTimeRange(scheduleDate, sStartTime, sEndTime);

        // Check overlap logic: (StartA < EndB) and (EndA > StartB)
        if (isBefore(newStart, existingEnd) && isAfter(newEnd, existingStart)) {
            return {
                type: 'OVERLAP',
                severity: 'error',
                message: `Trùng giờ với ca làm việc khác (${scheduleShift.name}: ${sStartTime} - ${sEndTime})`,
            };
        }
    }

    return null;
}

/**
 * Kiểm tra ca đã đầy chưa
 */
export async function checkShiftCapacity(
    shiftId: string,
    date: Date,
    storeId: string,
    shift?: Shift,
    store?: Store,
    existingSchedules?: Schedule[],
    scheduleId?: string // ID của schedule đang edit
): Promise<Conflict | null> {
    const maxEmployees = shift?.maxEmployees || store?.maxEmployeesPerShift || 10; // Default 10

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Đếm số nhân viên đã đăng ký ca này trong ngày
    const schedulesForShift = existingSchedules?.filter(s => {
        if (scheduleId && s.id === scheduleId) return false; // Exclude schedule đang edit
        if (s.shiftId !== shiftId) return false;
        if (s.storeId !== storeId) return false;
        if (s.status === 'rejected') return false;

        const scheduleDate = s.date instanceof Date ? s.date : s.date.toDate();
        return scheduleDate >= dayStart && scheduleDate <= dayEnd;
    }) || [];

    const currentCount = schedulesForShift.length;
    const availableSlots = maxEmployees - currentCount;

    if (availableSlots <= 0) {
        return {
            type: 'CAPACITY',
            severity: 'error',
            message: `Ca này đã đầy (${currentCount}/${maxEmployees} người)`,
        };
    }

    if (availableSlots <= maxEmployees * 0.2) {
        return {
            type: 'CAPACITY',
            severity: 'warning',
            message: `Ca này sắp đầy (${currentCount}/${maxEmployees} người)`,
        };
    }

    return null;
}

/**
 * Kiểm tra nhân viên làm quá giờ quy định chưa
 */
export async function checkOvertime(
    employeeId: string,
    date: Date,
    newShiftDuration: number,
    store?: Store,
    existingSchedules?: Schedule[],
    shifts?: Shift[]
): Promise<Conflict | null> {
    const maxHoursPerWeek = store?.maxHoursPerWeek || 48; // Default 48h/week

    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

    // Tính tổng giờ làm trong tuần
    const schedulesInWeek = existingSchedules?.filter(s => {
        if (s.employeeId !== employeeId) return false;
        if (s.status === 'rejected') return false;

        const scheduleDate = s.date instanceof Date ? s.date : s.date.toDate();
        return scheduleDate >= weekStart && scheduleDate <= weekEnd;
    }) || [];

    let totalHours = 0;
    schedulesInWeek.forEach(schedule => {
        const shift = shifts?.find(sh => sh.id === schedule.shiftId);

        // Calculate duration based on actual custom time if available
        let duration = shift?.duration || 0;
        if (schedule.startTime && schedule.endTime) {
            duration = calculateDuration(schedule.startTime, schedule.endTime);
        }

        totalHours += duration;
    });

    const newTotal = totalHours + newShiftDuration;

    if (newTotal > maxHoursPerWeek) {
        return {
            type: 'OVERTIME',
            severity: 'error',
            message: `Vượt quá giờ làm cho phép (${newTotal}/${maxHoursPerWeek}h/tuần)`,
        };
    }

    if (newTotal > maxHoursPerWeek * 0.9) {
        return {
            type: 'OVERTIME',
            severity: 'warning',
            message: `Sắp đạt giới hạn giờ làm (${newTotal}/${maxHoursPerWeek}h/tuần)`,
        };
    }

    return null;
}

/**
 * Lấy tất cả conflicts cho một schedule
 */
export async function getConflicts(
    employeeId: string,
    shiftId: string,
    date: Date,
    storeId: string,
    options: {
        scheduleId?: string;
        existingSchedules?: Schedule[];
        shifts?: Shift[];
        shift?: Shift;
        store?: Store;
        customStartTime?: string;
        customEndTime?: string;
    }
): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    const startTime = options.customStartTime || options.shift?.startTime || '00:00';
    const endTime = options.customEndTime || options.shift?.endTime || '00:00';

    // Check duplicate/overlap
    const duplicateConflict = await checkEmployeeConflict(
        employeeId,
        date,
        startTime,
        endTime,
        options.scheduleId,
        options.existingSchedules,
        options.shifts
    );
    if (duplicateConflict) conflicts.push(duplicateConflict);

    // Check capacity
    const capacityConflict = await checkShiftCapacity(
        shiftId,
        date,
        storeId,
        options.shift,
        options.store,
        options.existingSchedules,
        options.scheduleId
    );
    if (capacityConflict) conflicts.push(capacityConflict);

    // Check overtime
    let shiftDuration = options.shift?.duration || 8;
    if (options.customStartTime && options.customEndTime) {
        shiftDuration = calculateDuration(options.customStartTime, options.customEndTime);
    }

    // const overtimeConflict = await checkOvertime(
    //     employeeId,
    //     date,
    //     shiftDuration,
    //     options.store,
    //     options.existingSchedules,
    //     options.shifts
    // );
    // if (overtimeConflict) conflicts.push(overtimeConflict);

    return conflicts;
}

/**
 * Tính số slot còn trống cho một ca
 */
export function getAvailableSlots(
    shiftId: string,
    date: Date,
    storeId: string,
    shift?: Shift,
    store?: Store,
    existingSchedules?: Schedule[]
): { total: number; occupied: number; available: number; percentage: number } {
    const maxEmployees = shift?.maxEmployees || store?.maxEmployeesPerShift || 10;

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const schedulesForShift = existingSchedules?.filter(s => {
        if (s.shiftId !== shiftId) return false;
        if (s.storeId !== storeId) return false;
        if (s.status === 'rejected') return false;

        const scheduleDate = s.date instanceof Date ? s.date : s.date.toDate();
        return scheduleDate >= dayStart && scheduleDate <= dayEnd;
    }) || [];

    const occupied = schedulesForShift.length;
    const available = Math.max(0, maxEmployees - occupied);
    const percentage = maxEmployees > 0 ? (available / maxEmployees) * 100 : 0;

    return {
        total: maxEmployees,
        occupied,
        available,
        percentage,
    };
}
