'use client';

import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    type = 'danger',
    isLoading = false
}: ConfirmModalProps) {
    const colors = {
        danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
        info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm">
            <div className="flex flex-col items-center text-center">
                <div className={`p-3 rounded-full mb-4 ${type === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                        type === 'warning' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                    <AlertTriangle className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {title}
                </h3>

                <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {message}
                </p>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-3 text-white rounded-xl font-medium transition-all shadow-lg ${colors[type]} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Đang xử lý...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
