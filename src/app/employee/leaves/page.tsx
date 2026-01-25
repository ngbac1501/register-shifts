'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCollection } from '@/hooks/use-firestore';
import type { Leave, LeaveBalance, LeaveFormData } from '@/types';
import {
    createLeaveRequest,
    cancelLeave,
    getLeaveBalance,
    checkLeaveConflicts,
    checkLeaveOverlap,
    getLeaveTypeLabel,
    getLeaveStatusLabel,
    getLeaveStatusColor
} from '@/lib/leave-service';
import { Calendar, Plus, X, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { where } from 'firebase/firestore';

export default function EmployeeLeavesPage() {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<LeaveFormData>({
        type: 'annual',
        startDate: new Date(),
        endDate: new Date(),
        reason: '',
    });

    const { data: leaves, loading: leavesLoading } = useCollection<Leave>(
        'leaves',
        user ? [where('employeeId', '==', user.id)] : []
    );

    // Load leave balance
    useEffect(() => {
        if (user) {
            loadLeaveBalance();
        }
    }, [user]);

    const loadLeaveBalance = async () => {
        if (!user) return;
        try {
            const balance = await getLeaveBalance(user.id);
            setLeaveBalance(balance);
        } catch (error) {
            console.error('Error loading leave balance:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.storeId) {
            toast.error('Không tìm thấy thông tin người dùng');
            return;
        }

        setLoading(true);
        try {
            // Validate dates
            if (formData.startDate > formData.endDate) {
                toast.error('Ngày bắt đầu phải trước ngày kết thúc');
                setLoading(false);
                return;
            }

            // Check for overlapping leaves
            const hasOverlap = await checkLeaveOverlap(
                user.id,
                formData.startDate,
                formData.endDate
            );

            if (hasOverlap) {
                toast.error('Khoảng thời gian này trùng với đơn nghỉ phép khác');
                setLoading(false);
                return;
            }

            // Check conflicts with schedules
            const { hasConflict, conflictCount } = await checkLeaveConflicts(
                user.id,
                formData.startDate,
                formData.endDate
            );

            if (hasConflict) {
                const confirmed = window.confirm(
                    `Bạn có ${conflictCount} ca làm việc trong khoảng thời gian này. Bạn có chắc muốn tiếp tục?`
                );
                if (!confirmed) {
                    setLoading(false);
                    return;
                }
            }

            // Create leave request
            await createLeaveRequest(user.id, user.storeId, formData);

            toast.success('Đã gửi đơn nghỉ phép thành công');
            setIsModalOpen(false);
            setFormData({
                type: 'annual',
                startDate: new Date(),
                endDate: new Date(),
                reason: '',
            });

            // Reload balance
            await loadLeaveBalance();
        } catch (error) {
            console.error('Error creating leave request:', error);
            toast.error('Có lỗi xảy ra khi gửi đơn nghỉ phép');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (leaveId: string) => {
        if (!window.confirm('Bạn có chắc muốn hủy đơn nghỉ phép này?')) {
            return;
        }

        try {
            await cancelLeave(leaveId);
            toast.success('Đã hủy đơn nghỉ phép');
            await loadLeaveBalance();
        } catch (error) {
            console.error('Error cancelling leave:', error);
            toast.error('Có lỗi xảy ra khi hủy đơn nghỉ phép');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'rejected':
                return <XCircle className="w-5 h-5 text-red-500" />;
            case 'cancelled':
                return <XCircle className="w-5 h-5 text-gray-500" />;
            default:
                return <Clock className="w-5 h-5 text-yellow-500" />;
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Quản lý nghỉ phép
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Xem số ngày phép còn lại và gửi đơn nghỉ phép
                </p>
            </div>

            {/* Leave Balance Cards */}
            {leaveBalance && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Annual Leave */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Phép năm</h3>
                            <Calendar className="w-8 h-8 opacity-80" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm opacity-90">
                                <span>Tổng:</span>
                                <span>{leaveBalance.annual.total} ngày</span>
                            </div>
                            <div className="flex justify-between text-sm opacity-90">
                                <span>Đã dùng:</span>
                                <span>{leaveBalance.annual.used} ngày</span>
                            </div>
                            <div className="border-t border-white/20 pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold">Còn lại:</span>
                                    <span className="text-2xl font-bold">{leaveBalance.annual.remaining}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sick Leave */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Nghỉ ốm</h3>
                            <AlertCircle className="w-8 h-8 opacity-80" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm opacity-90">
                                <span>Tổng:</span>
                                <span>{leaveBalance.sick.total} ngày</span>
                            </div>
                            <div className="flex justify-between text-sm opacity-90">
                                <span>Đã dùng:</span>
                                <span>{leaveBalance.sick.used} ngày</span>
                            </div>
                            <div className="border-t border-white/20 pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold">Còn lại:</span>
                                    <span className="text-2xl font-bold">{leaveBalance.sick.remaining}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personal Leave */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Việc riêng</h3>
                            <Calendar className="w-8 h-8 opacity-80" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm opacity-90">
                                <span>Tổng:</span>
                                <span>{leaveBalance.personal.total} ngày</span>
                            </div>
                            <div className="flex justify-between text-sm opacity-90">
                                <span>Đã dùng:</span>
                                <span>{leaveBalance.personal.used} ngày</span>
                            </div>
                            <div className="border-t border-white/20 pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold">Còn lại:</span>
                                    <span className="text-2xl font-bold">{leaveBalance.personal.remaining}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">Gửi đơn nghỉ phép</span>
                </button>
            </div>

            {/* Leave History */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Lịch sử nghỉ phép
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    {leavesLoading ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                            <p className="mt-2">Đang tải...</p>
                        </div>
                    ) : !leaves || leaves.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Chưa có đơn nghỉ phép nào</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Loại</th>
                                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Từ ngày</th>
                                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Đến ngày</th>
                                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Số ngày</th>
                                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Lý do</th>
                                    <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Trạng thái</th>
                                    <th className="text-right py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaves.map((leave) => (
                                    <tr key={leave.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="py-3 px-4">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {getLeaveTypeLabel(leave.type)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                            {format(
                                                leave.startDate instanceof Date
                                                    ? leave.startDate
                                                    : (leave.startDate as any).toDate?.() || new Date(),
                                                'dd/MM/yyyy',
                                                { locale: vi }
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                            {format(
                                                leave.endDate instanceof Date
                                                    ? leave.endDate
                                                    : (leave.endDate as any).toDate?.() || new Date(),
                                                'dd/MM/yyyy',
                                                { locale: vi }
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                            {leave.totalDays} ngày
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400 max-w-xs truncate" title={leave.reason}>
                                            {leave.reason}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(leave.status)}
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLeaveStatusColor(leave.status)}`}>
                                                    {getLeaveStatusLabel(leave.status)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {leave.status === 'pending' && (
                                                <button
                                                    onClick={() => handleCancel(leave.id)}
                                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm"
                                                >
                                                    Hủy
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Leave Request Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Gửi đơn nghỉ phép
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Leave Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Loại nghỉ phép <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                                    required
                                >
                                    <option value="annual">Phép năm</option>
                                    <option value="sick">Nghỉ ốm</option>
                                    <option value="personal">Việc riêng</option>
                                    <option value="unpaid">Không lương</option>
                                </select>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Từ ngày <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={format(formData.startDate, 'yyyy-MM-dd')}
                                        onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Đến ngày <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={format(formData.endDate, 'yyyy-MM-dd')}
                                        onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Lý do <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white resize-none"
                                    placeholder="Nhập lý do nghỉ phép..."
                                    required
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg hover:shadow-blue-500/30 font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Đang gửi...' : 'Gửi đơn'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
