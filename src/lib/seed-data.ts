'use client';

import { db } from '@/lib/firebase/config';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function seedFirestoreData() {
    try {
        console.log('🌱 Seeding Firestore data...');

        // Get user IDs from Authentication (you need to manually get these from Firebase Console)
        const userIds = {
            admin: 'ADMIN_UID_HERE',
            manager1: 'MANAGER1_UID_HERE',
            manager2: 'MANAGER2_UID_HERE',
            employee1: 'EMPLOYEE1_UID_HERE',
            employee2: 'EMPLOYEE2_UID_HERE',
            employee3: 'EMPLOYEE3_UID_HERE',
        };

        // Create users collection
        await setDoc(doc(db, 'users', userIds.admin), {
            email: 'admin@epatta.com',
            displayName: 'Admin Epatta',
            role: 'admin',
            createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'users', userIds.manager1), {
            email: 'manager1@epatta.com',
            displayName: 'Nguyễn Văn A',
            role: 'manager',
            phone: '0901234567',
            storeId: 'store1',
            createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'users', userIds.manager2), {
            email: 'manager2@epatta.com',
            displayName: 'Trần Thị B',
            role: 'manager',
            phone: '0902345678',
            storeId: 'store2',
            createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'users', userIds.employee1), {
            email: 'employee1@epatta.com',
            displayName: 'Phạm Thị D',
            role: 'employee',
            phone: '0904567890',
            employeeType: 'fulltime',
            hourlyRate: 35000,
            storeId: 'store1',
            createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'users', userIds.employee2), {
            email: 'employee2@epatta.com',
            displayName: 'Hoàng Văn E',
            role: 'employee',
            phone: '0905678901',
            employeeType: 'fulltime',
            hourlyRate: 35000,
            storeId: 'store2',
            createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'users', userIds.employee3), {
            email: 'employee3@epatta.com',
            displayName: 'Võ Thị F',
            role: 'employee',
            phone: '0906789012',
            employeeType: 'parttime',
            hourlyRate: 30000,
            storeId: 'store1',
            createdAt: serverTimestamp(),
        });

        // Create stores
        await setDoc(doc(db, 'stores', 'store1'), {
            name: 'Epatta Coffee Quận 1',
            address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
            managerId: userIds.manager1,
            isActive: true,
            createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'stores', 'store2'), {
            name: 'Epatta Tea Quận 3',
            address: '456 Võ Văn Tần, Quận 3, TP.HCM',
            managerId: userIds.manager2,
            isActive: true,
            createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'stores', 'store3'), {
            name: 'Epatta Coffee Thủ Đức',
            address: '789 Võ Văn Ngân, Thủ Đức, TP.HCM',
            managerId: userIds.manager1,
            isActive: true,
            createdAt: serverTimestamp(),
        });

        // Create shifts
        await setDoc(doc(db, 'shifts', 'shift1'), {
            name: 'Ca sáng',
            startTime: '06:30',
            endTime: '14:30',
            duration: 8,
            type: 'fulltime',
            isActive: true,
        });

        await setDoc(doc(db, 'shifts', 'shift2'), {
            name: 'Ca chiều',
            startTime: '14:30',
            endTime: '22:30',
            duration: 8,
            type: 'fulltime',
            isActive: true,
        });

        await setDoc(doc(db, 'shifts', 'shift3'), {
            name: 'Ca đêm',
            startTime: '22:30',
            endTime: '06:30',
            duration: 8,
            type: 'fulltime',
            isActive: true,
        });

        await setDoc(doc(db, 'shifts', 'shift4'), {
            name: 'Part-time sáng',
            startTime: '08:00',
            endTime: '12:00',
            duration: 4,
            type: 'parttime',
            isActive: true,
        });

        await setDoc(doc(db, 'shifts', 'shift5'), {
            name: 'Part-time chiều',
            startTime: '16:00',
            endTime: '20:00',
            duration: 4,
            type: 'parttime',
            isActive: true,
        });

        console.log('✅ Seeding completed!');
        return { success: true };
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        return { success: false, error };
    }
}
