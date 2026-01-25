'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, X, Check, Trash2 } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification
    } = useNotifications({ limit: 10 });

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleNotificationClick = async (notificationId: string, link?: string) => {
        await markAsRead(notificationId);
        if (link) {
            setIsOpen(false);
            window.location.href = link;
        }
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        await deleteNotification(notificationId);
    };

    const getNotificationIcon = (type: string) => {
        const icons: Record<string, string> = {
            schedule_approved: '✅',
            schedule_rejected: '❌',
            shift_reminder: '⏰',
            swap_request: '🔄',
            swap_approved: '✅',
            swap_rejected: '❌',
            leave_approved: '✅',
            leave_rejected: '❌',
            shift_assigned: '📋',
            training_enrolled: '📚',
            training_completed: '🎓',
        };
        return icons[type] || '🔔';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full transform translate-x-1 -translate-y-1 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="fixed lg:absolute left-4 right-4 lg:left-auto lg:right-0 mt-2 lg:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 animate-fadeIn overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Thông báo
                            {unreadCount > 0 && (
                                <span className="ml-2 text-sm font-normal text-gray-500">
                                    ({unreadCount} chưa đọc)
                                </span>
                            )}
                        </h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                    title="Đánh dấu tất cả đã đọc"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">
                                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                                <p className="mt-2 text-sm">Đang tải...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Không có thông báo mới</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification.id, notification.link)}
                                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Icon */}
                                            <div className="flex-shrink-0 text-2xl">
                                                {getNotificationIcon(notification.type)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className={`text-sm font-semibold ${!notification.isRead
                                                        ? 'text-gray-900 dark:text-white'
                                                        : 'text-gray-700 dark:text-gray-300'
                                                        }`}>
                                                        {notification.title}
                                                    </h4>
                                                    {!notification.isRead && (
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-500">
                                                        {formatDistanceToNow(
                                                            notification.createdAt instanceof Date
                                                                ? notification.createdAt
                                                                : new Date(),
                                                            {
                                                                addSuffix: true,
                                                                locale: vi,
                                                            }
                                                        )}
                                                    </span>
                                                    <button
                                                        onClick={(e) => handleDelete(e, notification.id)}
                                                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                            <Link
                                href="/notifications"
                                onClick={() => setIsOpen(false)}
                                className="block text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                                Xem tất cả thông báo
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
