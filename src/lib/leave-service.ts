import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    Timestamp,
    getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Leave, LeaveFormData, LeaveBalance } from '@/types';
import { differenceInDays, startOfYear, endOfYear } from 'date-fns';

/**
 * Calculate number of days between two dates (inclusive)
 */
function calculateLeaveDays(startDate: Date, endDate: Date): number {
    return differenceInDays(endDate, startDate) + 1;
}

/**
 * Create a new leave request
 */
export async function createLeaveRequest(
    employeeId: string,
    storeId: string,
    formData: LeaveFormData
): Promise<string> {
    try {
        const totalDays = calculateLeaveDays(formData.startDate, formData.endDate);

        const leaveData = {
            employeeId,
            storeId,
            type: formData.type,
            startDate: Timestamp.fromDate(formData.startDate),
            endDate: Timestamp.fromDate(formData.endDate),
            totalDays,
            reason: formData.reason,
            status: 'pending' as const,
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, 'leaves'), leaveData);
        return docRef.id;
    } catch (error) {
        console.error('Error creating leave request:', error);
        throw error;
    }
}

/**
 * Approve a leave request
 */
export async function approveLeave(
    leaveId: string,
    approverId: string
): Promise<void> {
    try {
        await updateDoc(doc(db, 'leaves', leaveId), {
            status: 'approved',
            approvedBy: approverId,
            updatedAt: Timestamp.now(),
        });
    } catch (error) {
        console.error('Error approving leave:', error);
        throw error;
    }
}

/**
 * Reject a leave request
 */
export async function rejectLeave(
    leaveId: string,
    approverId: string,
    reason?: string
): Promise<void> {
    try {
        await updateDoc(doc(db, 'leaves', leaveId), {
            status: 'rejected',
            approvedBy: approverId,
            rejectedReason: reason,
            updatedAt: Timestamp.now(),
        });
    } catch (error) {
        console.error('Error rejecting leave:', error);
        throw error;
    }
}

/**
 * Cancel a leave request (employee only)
 */
export async function cancelLeave(leaveId: string): Promise<void> {
    try {
        await updateDoc(doc(db, 'leaves', leaveId), {
            status: 'cancelled',
            updatedAt: Timestamp.now(),
        });
    } catch (error) {
        console.error('Error cancelling leave:', error);
        throw error;
    }
}

/**
 * Delete a leave request
 */
export async function deleteLeave(leaveId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'leaves', leaveId));
    } catch (error) {
        console.error('Error deleting leave:', error);
        throw error;
    }
}

/**
 * Get leave balance for an employee
 */
export async function getLeaveBalance(
    employeeId: string,
    year: number = new Date().getFullYear()
): Promise<LeaveBalance> {
    try {
        // Default allocations (can be customized per employee)
        const DEFAULT_ANNUAL = 12; // 12 days per year
        const DEFAULT_SICK = 30; // 30 days per year
        const DEFAULT_PERSONAL = 3; // 3 days per year

        // Get all approved leaves for the year
        const startDate = startOfYear(new Date(year, 0, 1));
        const endDate = endOfYear(new Date(year, 11, 31));

        const q = query(
            collection(db, 'leaves'),
            where('employeeId', '==', employeeId),
            where('status', '==', 'approved'),
            where('startDate', '>=', Timestamp.fromDate(startDate)),
            where('startDate', '<=', Timestamp.fromDate(endDate))
        );

        const snapshot = await getDocs(q);

        let annualUsed = 0;
        let sickUsed = 0;
        let personalUsed = 0;

        snapshot.forEach((doc) => {
            const leave = doc.data();
            const days = leave.totalDays || 0;

            switch (leave.type) {
                case 'annual':
                    annualUsed += days;
                    break;
                case 'sick':
                    sickUsed += days;
                    break;
                case 'personal':
                    personalUsed += days;
                    break;
            }
        });

        return {
            employeeId,
            year,
            annual: {
                total: DEFAULT_ANNUAL,
                used: annualUsed,
                remaining: Math.max(0, DEFAULT_ANNUAL - annualUsed),
            },
            sick: {
                total: DEFAULT_SICK,
                used: sickUsed,
                remaining: Math.max(0, DEFAULT_SICK - sickUsed),
            },
            personal: {
                total: DEFAULT_PERSONAL,
                used: personalUsed,
                remaining: Math.max(0, DEFAULT_PERSONAL - personalUsed),
            },
        };
    } catch (error) {
        console.error('Error getting leave balance:', error);
        throw error;
    }
}

/**
 * Check if leave dates conflict with existing schedules
 */
export async function checkLeaveConflicts(
    employeeId: string,
    startDate: Date,
    endDate: Date
): Promise<{ hasConflict: boolean; conflictCount: number }> {
    try {
        const q = query(
            collection(db, 'schedules'),
            where('employeeId', '==', employeeId),
            where('status', 'in', ['pending', 'approved']),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate))
        );

        const snapshot = await getDocs(q);

        return {
            hasConflict: snapshot.size > 0,
            conflictCount: snapshot.size,
        };
    } catch (error) {
        console.error('Error checking leave conflicts:', error);
        throw error;
    }
}

/**
 * Check if leave dates overlap with existing leaves
 */
export async function checkLeaveOverlap(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeLeaveId?: string
): Promise<boolean> {
    try {
        const q = query(
            collection(db, 'leaves'),
            where('employeeId', '==', employeeId),
            where('status', 'in', ['pending', 'approved'])
        );

        const snapshot = await getDocs(q);

        for (const doc of snapshot.docs) {
            if (excludeLeaveId && doc.id === excludeLeaveId) continue;

            const leave = doc.data();
            const leaveStart = leave.startDate.toDate();
            const leaveEnd = leave.endDate.toDate();

            // Check for overlap
            if (
                (startDate >= leaveStart && startDate <= leaveEnd) ||
                (endDate >= leaveStart && endDate <= leaveEnd) ||
                (startDate <= leaveStart && endDate >= leaveEnd)
            ) {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking leave overlap:', error);
        throw error;
    }
}

/**
 * Get leave type label in Vietnamese
 */
export function getLeaveTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        annual: 'Nghỉ phép năm',
        sick: 'Nghỉ ốm',
        personal: 'Nghỉ việc riêng',
        unpaid: 'Nghỉ không lương',
    };
    return labels[type] || type;
}

/**
 * Get leave status label in Vietnamese
 */
export function getLeaveStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        pending: 'Chờ duyệt',
        approved: 'Đã duyệt',
        rejected: 'Từ chối',
        cancelled: 'Đã hủy',
    };
    return labels[status] || status;
}

/**
 * Get leave status color
 */
export function getLeaveStatusColor(status: string): string {
    const colors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Update leave status (for admin/manager editing)
 */
export async function updateLeaveStatus(
    leaveId: string,
    status: string,
    editorId: string,
    reason?: string
): Promise<void> {
    try {
        const data: any = {
            status,
            updatedAt: Timestamp.now(),
        };

        if (status === 'approved') {
            data.approvedBy = editorId;
        } else if (status === 'rejected') {
            data.rejectedReason = reason;
            data.approvedBy = editorId; // Track who rejected it
        }

        await updateDoc(doc(db, 'leaves', leaveId), data);
    } catch (error) {
        console.error('Error updating leave status:', error);
        throw error;
    }
}
