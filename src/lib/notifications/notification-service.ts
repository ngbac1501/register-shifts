import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    doc,
    deleteDoc,
    Timestamp,
    getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Notification, NotificationType } from '@/types';

/**
 * Create a new notification
 */
export async function createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, any>
): Promise<string> {
    try {
        const notificationData = {
            userId,
            type,
            title,
            message,
            isRead: false,
            link,
            metadata,
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, 'notifications'), notificationData);
        return docRef.id;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, any>
): Promise<void> {
    try {
        const promises = userIds.map(userId =>
            createNotification(userId, type, title, message, link, metadata)
        );
        await Promise.all(promises);
    } catch (error) {
        console.error('Error creating bulk notifications:', error);
        throw error;
    }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
    try {
        await updateDoc(doc(db, 'notifications', notificationId), {
            isRead: true,
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
    try {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('isRead', '==', false)
        );

        const snapshot = await getDocs(q);
        const promises = snapshot.docs.map(doc =>
            updateDoc(doc.ref, { isRead: true })
        );

        await Promise.all(promises);
    } catch (error) {
        console.error('Error marking all as read:', error);
        throw error;
    }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(userId: string): Promise<void> {
    try {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId)
        );

        const snapshot = await getDocs(q);
        const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));

        await Promise.all(promises);
    } catch (error) {
        console.error('Error deleting all notifications:', error);
        throw error;
    }
}

// ==================== NOTIFICATION HELPERS ====================

/**
 * Create notification for schedule approval
 */
export async function notifyScheduleApproved(
    employeeId: string,
    scheduleName: string,
    date: Date,
    shiftName: string
): Promise<void> {
    await createNotification(
        employeeId,
        'schedule_approved',
        'Ca làm việc đã được duyệt',
        `Ca ${shiftName} ngày ${date.toLocaleDateString('vi-VN')} đã được phê duyệt.`,
        '/employee/schedule',
        { scheduleName, date: date.toISOString(), shiftName }
    );
}

/**
 * Create notification for schedule rejection
 */
export async function notifyScheduleRejected(
    employeeId: string,
    scheduleName: string,
    date: Date,
    shiftName: string,
    reason?: string
): Promise<void> {
    const message = reason
        ? `Ca ${shiftName} ngày ${date.toLocaleDateString('vi-VN')} đã bị từ chối. Lý do: ${reason}`
        : `Ca ${shiftName} ngày ${date.toLocaleDateString('vi-VN')} đã bị từ chối.`;

    await createNotification(
        employeeId,
        'schedule_rejected',
        'Ca làm việc bị từ chối',
        message,
        '/employee/schedule',
        { scheduleName, date: date.toISOString(), shiftName, reason }
    );
}

/**
 * Create notification for shift reminder
 */
export async function notifyShiftReminder(
    employeeId: string,
    shiftName: string,
    date: Date,
    startTime: string
): Promise<void> {
    await createNotification(
        employeeId,
        'shift_reminder',
        'Nhắc nhở ca làm việc',
        `Bạn có ca ${shiftName} vào ${startTime} ngày ${date.toLocaleDateString('vi-VN')}.`,
        '/employee/schedule',
        { shiftName, date: date.toISOString(), startTime }
    );
}

/**
 * Create notification for leave approval
 */
export async function notifyLeaveApproved(
    employeeId: string,
    leaveType: string,
    startDate: Date,
    endDate: Date
): Promise<void> {
    await createNotification(
        employeeId,
        'leave_approved',
        'Đơn nghỉ phép đã được duyệt',
        `Đơn nghỉ ${leaveType} từ ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString('vi-VN')} đã được phê duyệt.`,
        '/employee/leaves',
        { leaveType, startDate: startDate.toISOString(), endDate: endDate.toISOString() }
    );
}

/**
 * Create notification for leave rejection
 */
export async function notifyLeaveRejected(
    employeeId: string,
    leaveType: string,
    startDate: Date,
    endDate: Date,
    reason?: string
): Promise<void> {
    const message = reason
        ? `Đơn nghỉ ${leaveType} từ ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString('vi-VN')} đã bị từ chối. Lý do: ${reason}`
        : `Đơn nghỉ ${leaveType} từ ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString('vi-VN')} đã bị từ chối.`;

    await createNotification(
        employeeId,
        'leave_rejected',
        'Đơn nghỉ phép bị từ chối',
        message,
        '/employee/leaves',
        { leaveType, startDate: startDate.toISOString(), endDate: endDate.toISOString(), reason }
    );
}

/**
 * Create notification for swap request
 */
export async function notifySwapRequest(
    toEmployeeId: string,
    fromEmployeeName: string,
    shiftName: string,
    date: Date
): Promise<void> {
    await createNotification(
        toEmployeeId,
        'swap_request',
        'Yêu cầu đổi ca mới',
        `${fromEmployeeName} muốn đổi ca ${shiftName} ngày ${date.toLocaleDateString('vi-VN')} với bạn.`,
        '/employee/requests',
        { fromEmployeeName, shiftName, date: date.toISOString() }
    );
}

/**
 * Create notification for swap approval
 */
export async function notifySwapApproved(
    employeeIds: string[],
    shiftName: string,
    date: Date
): Promise<void> {
    await createBulkNotifications(
        employeeIds,
        'swap_approved',
        'Đổi ca đã được duyệt',
        `Yêu cầu đổi ca ${shiftName} ngày ${date.toLocaleDateString('vi-VN')} đã được phê duyệt.`,
        '/employee/schedule',
        { shiftName, date: date.toISOString() }
    );
}

/**
 * Create notification for swap rejection
 */
export async function notifySwapRejected(
    employeeIds: string[],
    shiftName: string,
    date: Date,
    reason?: string
): Promise<void> {
    const message = reason
        ? `Yêu cầu đổi ca ${shiftName} ngày ${date.toLocaleDateString('vi-VN')} đã bị từ chối. Lý do: ${reason}`
        : `Yêu cầu đổi ca ${shiftName} ngày ${date.toLocaleDateString('vi-VN')} đã bị từ chối.`;

    await createBulkNotifications(
        employeeIds,
        'swap_rejected',
        'Đổi ca bị từ chối',
        message,
        '/employee/requests',
        { shiftName, date: date.toISOString(), reason }
    );
}

/**
 * Create notification for shift assignment
 */
export async function notifyShiftAssigned(
    employeeId: string,
    shiftName: string,
    date: Date,
    assignedBy: string
): Promise<void> {
    await createNotification(
        employeeId,
        'shift_assigned',
        'Bạn được phân ca mới',
        `Bạn được phân ca ${shiftName} ngày ${date.toLocaleDateString('vi-VN')}.`,
        '/employee/schedule',
        { shiftName, date: date.toISOString(), assignedBy }
    );
}
