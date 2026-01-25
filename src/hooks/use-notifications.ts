'use client';

import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit as limitQuery,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Notification } from '@/types';
import {
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
} from '@/lib/notifications/notification-service';

interface UseNotificationsOptions {
    limit?: number;
    unreadOnly?: boolean;
}

interface UseNotificationsReturn {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    error: Error | null;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (notificationId: string) => Promise<void>;
    deleteAll: () => Promise<void>;
    refresh: () => void;
}

/**
 * Hook to manage notifications for the current user
 */
export function useNotifications(
    options: UseNotificationsOptions = {}
): UseNotificationsReturn {
    const { limit = 50, unreadOnly = false } = options;
    const { user } = useAuth();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // Build query
        let q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.id),
            orderBy('createdAt', 'desc'),
            limitQuery(limit)
        );

        if (unreadOnly) {
            q = query(
                collection(db, 'notifications'),
                where('userId', '==', user.id),
                where('isRead', '==', false),
                orderBy('createdAt', 'desc'),
                limitQuery(limit)
            );
        }

        // Subscribe to real-time updates
        const unsubscribe: Unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const notifs: Notification[] = [];
                let unread = 0;

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const notification: Notification = {
                        id: doc.id,
                        userId: data.userId,
                        type: data.type,
                        title: data.title,
                        message: data.message,
                        isRead: data.isRead,
                        link: data.link,
                        metadata: data.metadata,
                        createdAt: data.createdAt?.toDate() || new Date(),
                    };

                    notifs.push(notification);
                    if (!notification.isRead) {
                        unread++;
                    }
                });

                setNotifications(notifs);
                setUnreadCount(unread);
                setLoading(false);
            },
            (err) => {
                console.error('Error fetching notifications:', err);
                setError(err as Error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user, limit, unreadOnly, refreshKey]);

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await markAsRead(notificationId);
        } catch (err) {
            console.error('Error marking as read:', err);
            throw err;
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!user) return;
        try {
            await markAllAsRead(user.id);
        } catch (err) {
            console.error('Error marking all as read:', err);
            throw err;
        }
    };

    const handleDelete = async (notificationId: string) => {
        try {
            await deleteNotification(notificationId);
        } catch (err) {
            console.error('Error deleting notification:', err);
            throw err;
        }
    };

    const handleDeleteAll = async () => {
        if (!user) return;
        try {
            await deleteAllNotifications(user.id);
        } catch (err) {
            console.error('Error deleting all notifications:', err);
            throw err;
        }
    };

    const refresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    return {
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        deleteNotification: handleDelete,
        deleteAll: handleDeleteAll,
        refresh,
    };
}

/**
 * Hook to get only unread count (lightweight)
 */
export function useUnreadCount(): number {
    const { user } = useAuth();
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!user) {
            setCount(0);
            return;
        }

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.id),
            where('isRead', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [user]);

    return count;
}
