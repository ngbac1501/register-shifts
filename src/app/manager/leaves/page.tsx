'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCollection } from '@/hooks/use-firestore';
import type { Leave, LeaveWithDetails, User } from '@/types';
import {
    approveLeave,
    rejectLeave,
    getLeaveTypeLabel,
    getLeaveStatusLabel,
    getLeaveStatusColor,
    updateLeaveStatus
} from '@/lib/leave-service';
import {
    notifyLeaveApproved,
    notifyLeaveRejected
} from '@/lib/notifications/notification-service';
import { Calendar, CheckCircle, XCircle, Clock, Search, Filter, Loader2, Pencil, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { where } from 'firebase/firestore';

export default function ManagerLeavesPage() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
    const [editStatus, setEditStatus] = useState<string>('');
    const [editReason, setEditReason] = useState('');

    const { data: leaves, loading } = useCollection<Leave>(
        'leaves',
        user?.storeId ? [where('storeId', '==', user.storeId)] : []
    );

    const { data: employees } = useCollection<User>(
        'users',
        user?.storeId ? [where('storeId', '==', user.storeId), where('role', '==', 'employee')] : []
    );

    // Create employee map for quick lookup
    const employeeMap = new Map(employees?.map(emp => [emp.id, emp]) || []);

    // Filter leaves
    const filteredLeaves = leaves?.filter(leave => {
        const employee = employeeMap.get(leave.employeeId);
        const matchesSearch = employee?.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || false;
        const matchesFilter = filterStatus === 'all' || leave.status === filterStatus;
        return matchesSearch && matchesFilter;
    }) || [];

    // Sort by date (newest first)
    const sortedLeaves = [...filteredLeaves].sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : (a.createdAt as any).toDate?.() || new Date();
        const dateB = b.createdAt instanceof Date ? b.createdAt : (b.createdAt as any).toDate?.() || new Date();
        return dateB.getTime() - dateA.getTime();
    });

    const handleApprove = async (leave: Leave) => {
        if (!user) return;

        try {
            await approveLeave(leave.id, user.id);

            // Send notification
            const startDate = leave.startDate instanceof Date ? leave.startDate : (leave.startDate as any).toDate?.() || new Date();
            const endDate = leave.endDate instanceof Date ? leave.endDate : (leave.endDate as any).toDate?.() || new Date();

            await notifyLeaveApproved(
                leave.employeeId,
                getLeaveTypeLabel(leave.type),
                startDate,
                endDate
            );

            toast.success('Đã duyệt đơn nghỉ phép');
        } catch (error) {
            console.error('Error approving leave:', error);
            toast.error('Có lỗi xảy ra khi duyệt đơn');
        }
    };

    const handleReject = async (leave: Leave) => {
        if (!user) return;

        try {
            await rejectLeave(leave.id, user.id, rejectReason);

            // Send notification
            const startDate = leave.startDate instanceof Date ? leave.startDate : (leave.startDate as any).toDate?.() || new Date();
            const endDate = leave.endDate instanceof Date ? leave.endDate : (leave.endDate as any).toDate?.() || new Date();

            await notifyLeaveRejected(
                leave.employeeId,
                getLeaveTypeLabel(leave.type),
                startDate,
                endDate,
                rejectReason
            );

            toast.success('Đã từ chối đơn nghỉ phép');
            setRejectingLeaveId(null);
            setRejectReason('');
        } catch (error) {
            console.error('Error rejecting leave:', error);
            toast.error('Có lỗi xảy ra khi từ chối đơn');
        }
    };

    const handleEditStatus = async () => {
        if (!user || !editingLeave) return;
        try {
            await updateLeaveStatus(
                editingLeave.id,
                editStatus,
                user.id,
                editReason
            );

            // Notify if status changed
            /* 
            // Optional: Implement simple notification for status update
            const startDate = editingLeave.startDate instanceof Date ? editingLeave.startDate : (editingLeave.startDate as any).toDate?.() || new Date();
            const endDate = editingLeave.endDate instanceof Date ? editingLeave.endDate : (editingLeave.endDate as any).toDate?.() || new Date();
             await notifyLeaveStatusUpdated(
                editingLeave.employeeId,
                getLeaveTypeLabel(editingLeave.type),
                editingLeave.status, // old status
                 editStatus, // new status
                startDate,
                endDate
            ); 
            */

            toast.success('Đã cập nhật trạng thái');
            setEditingLeave(null);
            setEditReason('');
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Có lỗi xảy ra');
        }
    };

    const openEditModal = (leave: Leave) => {
        setEditingLeave(leave);
        setEditStatus(leave.status);
        setEditReason(leave.rejectedReason || '');
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

    const pendingCount = leaves?.filter(l => l.status === 'pending').length || 0;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Quản lý nghỉ phép
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Duyệt và quản lý đơn nghỉ phép của nhân viên
                    </p>
                </div>
                {pendingCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-xl">
                        <Clock className="w-5 h-5" />
                        <span className="font-semibold">{pendingCount} đơn chờ duyệt</span>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên nhân viên..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white"
                    >
                        <option value="all">Tất cả</option>
                        <option value="pending">Chờ duyệt</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="rejected">Từ chối</option>
                    </select>
                </div>
            </div>

            {/* Leaves View */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p>Đang tải...</p>
                    </div>
                ) : sortedLeaves.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Không có đơn nghỉ phép nào</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Nhân viên</th>
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
                                    {sortedLeaves.map((leave) => {
                                        const employee = employeeMap.get(leave.employeeId);
                                        return (
                                            <tr key={leave.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                                            {employee?.displayName.charAt(0) || '?'}
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            {employee?.displayName || 'Unknown'}
                                                        </span>
                                                    </div>
                                                </td>
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
                                                    <div className="flex items-center justify-end gap-2">
                                                        {leave.status === 'pending' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApprove(leave)}
                                                                    className="p-2 bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-full transition-colors"
                                                                    title="Duyệt"
                                                                >
                                                                    <Check className="w-5 h-5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setRejectingLeaveId(leave.id)}
                                                                    className="p-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-full transition-colors"
                                                                    title="Từ chối"
                                                                >
                                                                    <X className="w-5 h-5" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => openEditModal(leave)}
                                                                className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                                                                title="Chỉnh sửa trạng thái"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="lg:hidden p-4 space-y-4">
                            {sortedLeaves.map((leave) => {
                                const employee = employeeMap.get(leave.employeeId);
                                const startDate = leave.startDate instanceof Date ? leave.startDate : (leave.startDate as any).toDate?.() || new Date();
                                const endDate = leave.endDate instanceof Date ? leave.endDate : (leave.endDate as any).toDate?.() || new Date();

                                return (
                                    <div key={leave.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                                    {employee?.displayName.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white">{employee?.displayName || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{getLeaveTypeLabel(leave.type)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(leave.status)}
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getLeaveStatusColor(leave.status)}`}>
                                                    {getLeaveStatusLabel(leave.status)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Từ ngày</p>
                                                <p className="text-sm font-semibold dark:text-white">{format(startDate, 'dd/MM/yyyy')}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Đến ngày</p>
                                                <p className="text-sm font-semibold dark:text-white">{format(endDate, 'dd/MM/yyyy')}</p>
                                            </div>
                                            <div className="col-span-2 pt-1 border-t border-gray-100 dark:border-gray-600">
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Lý do</p>
                                                <p className="text-sm dark:text-gray-200 line-clamp-2 italic">"{leave.reason}"</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                                                {leave.totalDays} ngày nghỉ
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {leave.status === 'pending' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(leave)}
                                                            className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-xl text-xs font-bold shadow-md shadow-green-500/20"
                                                        >
                                                            <Check className="w-3.5 h-3.5" /> Duyệt
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectingLeaveId(leave.id)}
                                                            className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20"
                                                        >
                                                            <X className="w-3.5 h-3.5" /> Từ chối
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => openEditModal(leave)}
                                                        className="flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" /> Sửa trạng thái
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
                {/* Reject Modal */}
                {rejectingLeaveId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Từ chối đơn nghỉ phép
                                </h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Lý do từ chối (tùy chọn)
                                    </label>
                                    <textarea
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all dark:text-white resize-none"
                                        placeholder="Nhập lý do từ chối..."
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            setRejectingLeaveId(null);
                                            setRejectReason('');
                                        }}
                                        className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={() => {
                                            const leave = leaves?.find(l => l.id === rejectingLeaveId);
                                            if (leave) handleReject(leave);
                                        }}
                                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Xác nhận từ chối
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {editingLeave && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                Cập nhật trạng thái
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Trạng thái
                                    </label>
                                    <select
                                        value={editStatus}
                                        onChange={(e) => setEditStatus(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white"
                                    >
                                        <option value="pending">Chờ duyệt</option>
                                        <option value="approved">Đã duyệt</option>
                                        <option value="rejected">Từ chối</option>
                                        <option value="cancelled">Đã hủy</option>
                                    </select>
                                </div>
                                {editStatus === 'rejected' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Lý do từ chối
                                        </label>
                                        <textarea
                                            value={editReason}
                                            onChange={(e) => setEditReason(e.target.value)}
                                            rows={3}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white resize-none"
                                            placeholder="Nhập lý do..."
                                        />
                                    </div>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setEditingLeave(null)}
                                        className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={handleEditStatus}
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Cập nhật
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
