import { User, Store, Shift, Schedule } from '@/types';
import { Timestamp } from 'firebase/firestore';

// Sample admin user
export const sampleAdmin: Omit<User, 'id'> = {
    email: 'admin@epatta.com',
    displayName: 'Admin Epatta',
    role: 'admin',
    createdAt: new Date(),
};

// Sample stores
export const sampleStores: Omit<Store, 'id'>[] = [
    {
        name: 'Epatta Coffee Quận 1',
        address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
        managerId: '', // Will be set after creating manager
        isActive: true,
        createdAt: new Date(),
    },
    {
        name: 'Epatta Tea Quận 3',
        address: '456 Võ Văn Tần, Quận 3, TP.HCM',
        managerId: '',
        isActive: true,
        createdAt: new Date(),
    },
    {
        name: 'Epatta Coffee Thủ Đức',
        address: '789 Võ Văn Ngân, Thủ Đức, TP.HCM',
        managerId: '',
        isActive: true,
        createdAt: new Date(),
    },
];

// Sample shifts
export const sampleShifts: Omit<Shift, 'id'>[] = [
    {
        name: 'Ca sáng',
        startTime: '06:30',
        endTime: '14:30',
        duration: 8,
        type: 'fulltime',
        isActive: true,
    },
    {
        name: 'Ca chiều',
        startTime: '14:30',
        endTime: '22:30',
        duration: 8,
        type: 'fulltime',
        isActive: true,
    },
    {
        name: 'Ca đêm',
        startTime: '22:30',
        endTime: '06:30',
        duration: 8,
        type: 'fulltime',
        isActive: true,
    },
    {
        name: 'Part-time sáng',
        startTime: '08:00',
        endTime: '12:00',
        duration: 4,
        type: 'parttime',
        isActive: true,
    },
    {
        name: 'Part-time chiều',
        startTime: '16:00',
        endTime: '20:00',
        duration: 4,
        type: 'parttime',
        isActive: true,
    },
];

// Sample managers
export const sampleManagers: Omit<User, 'id'>[] = [
    {
        email: 'manager1@epatta.com',
        displayName: 'Nguyễn Văn A',
        role: 'manager',
        phone: '0901234567',
        createdAt: new Date(),
    },
    {
        email: 'manager2@epatta.com',
        displayName: 'Trần Thị B',
        role: 'manager',
        phone: '0902345678',
        createdAt: new Date(),
    },
    {
        email: 'manager3@epatta.com',
        displayName: 'Lê Văn C',
        role: 'manager',
        phone: '0903456789',
        createdAt: new Date(),
    },
];

// Sample employees
export const sampleEmployees: Omit<User, 'id'>[] = [
    {
        email: 'employee1@epatta.com',
        displayName: 'Phạm Thị D',
        role: 'employee',
        phone: '0904567890',
        employeeType: 'fulltime',
        hourlyRate: 35000,
        createdAt: new Date(),
    },
    {
        email: 'employee2@epatta.com',
        displayName: 'Hoàng Văn E',
        role: 'employee',
        phone: '0905678901',
        employeeType: 'fulltime',
        hourlyRate: 35000,
        createdAt: new Date(),
    },
    {
        email: 'employee3@epatta.com',
        displayName: 'Võ Thị F',
        role: 'employee',
        phone: '0906789012',
        employeeType: 'parttime',
        hourlyRate: 30000,
        createdAt: new Date(),
    },
];
