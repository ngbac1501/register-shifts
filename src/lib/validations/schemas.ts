import { z } from 'zod';

// Login Schema
export const loginSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

// Register Schema
export const registerSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    displayName: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
    role: z.string().min(1, 'Vui lòng chọn vai trò'),
    storeId: z.string().optional(),
    phone: z.string().optional(),
    employeeType: z.string().optional(),
    hourlyRate: z.number().positive('Lương phải là số dương').optional(),
});

// Store Schema
export const storeSchema = z.object({
    name: z.string().min(2, 'Tên cửa hàng phải có ít nhất 2 ký tự'),
    address: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự'),
    managerId: z.string().min(1, 'Vui lòng chọn quản lý'),
});

// Shift Schema
export const shiftSchema = z.object({
    name: z.string().min(2, 'Tên ca làm phải có ít nhất 2 ký tự'),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Thời gian không hợp lệ (HH:MM)'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Thời gian không hợp lệ (HH:MM)'),
    duration: z.number().positive('Thời lượng phải là số dương').max(12, 'Thời lượng tối đa 12 giờ'),
    type: z.string().min(1, 'Vui lòng chọn loại ca'),
});

// Schedule Schema
export const scheduleSchema = z.object({
    storeId: z.string().min(1, 'Vui lòng chọn cửa hàng'),
    employeeId: z.string().min(1, 'Vui lòng chọn nhân viên'),
    shiftId: z.string().min(1, 'Vui lòng chọn ca làm'),
    date: z.string().min(1, 'Vui lòng chọn ngày'),
});

// Shift Swap Schema
export const shiftSwapSchema = z.object({
    toEmployeeId: z.string().min(1, 'Vui lòng chọn nhân viên để đổi ca'),
    scheduleId: z.string().min(1, 'Vui lòng chọn ca làm'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type StoreFormData = z.infer<typeof storeSchema>;
export type ShiftFormData = z.infer<typeof shiftSchema>;
export type ScheduleFormData = z.infer<typeof scheduleSchema>;
export type ShiftSwapFormData = z.infer<typeof shiftSwapSchema>;
