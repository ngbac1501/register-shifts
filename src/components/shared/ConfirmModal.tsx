import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    showCancel?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'danger',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy bỏ',
    isLoading = false,
    showCancel = true
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <AlertTriangle className="w-6 h-6 text-red-600" />;
            case 'warning':
                return <AlertCircle className="w-6 h-6 text-orange-600" />;
            case 'info':
                return <Info className="w-6 h-6 text-blue-600" />;
        }
    };

    const getColorClasses = () => {
        switch (type) {
            case 'danger':
                return {
                    bg: 'bg-red-50 dark:bg-red-900/20',
                    button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
                    iconBg: 'bg-red-100 dark:bg-red-900/40'
                };
            case 'warning':
                return {
                    bg: 'bg-orange-50 dark:bg-orange-900/20',
                    button: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
                    iconBg: 'bg-orange-100 dark:bg-orange-900/40'
                };
            case 'info':
                return {
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                    button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
                    iconBg: 'bg-blue-100 dark:bg-blue-900/40'
                };
        }
    };

    const colors = getColorClasses();

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100 animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 text-center">
                    <div className={`mx-auto mb-4 w-12 h-12 rounded-full ${colors.iconBg} flex items-center justify-center`}>
                        {getIcon()}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        {showCancel && (
                            <button
                                disabled={isLoading}
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            disabled={isLoading}
                            onClick={onConfirm}
                            className={`${showCancel ? 'flex-1' : 'w-full'} px-4 py-2.5 text-white rounded-xl font-medium shadow-md transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${colors.button}`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang xử lý...</span>
                                </>
                            ) : (
                                confirmText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
