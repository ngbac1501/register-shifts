'use client';

import { useState } from 'react';
import { useCollection } from '@/hooks/use-firestore';
import type { Leave, User, Store } from '@/types';
import {
    getLeaveTypeLabel,
    getLeaveStatusLabel,
    getLeaveStatusColor
} from '@/lib/leave-service';
import { Calendar, Search, Filter, CheckCircle, XCircle, Clock, Loader2, Check, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import { useStore } from '@/contexts/StoreContext';
import { approveLeave, rejectLeave, updateLeaveStatus, deleteLeave } from '@/lib/leave-service';
import toast from 'react-hot-toast';
import { Pencil } from 'lucide-react';
import { useEffect } from 'react';

export default function AdminLeavesPage() {
    const { user } = useAuth();
    const { selectedStoreId } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [filterStore, setFilterStore] = useState<string>('all');

    useEffect(() => {
        if (selectedStoreId) {
            setFilterStore(selectedStoreId);
        } else {
            setFilterStore('all');
        }
    }, [selectedStoreId]);
    const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
    const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [editStatus, setEditStatus] = useState<string>('');
    const [editReason, setEditReason] = useState('');

    const { data: leaves, loading } = useCollection<Leave>('leaves', []);
    const { data: employees } = useCollection<User>('users', []);
    const { data: stores } = useCollection<Store>('stores', []);

    // Create maps for quick lookup
    const employeeMap = new Map(employees?.map(emp => [emp.id, emp]) || []);
    const storeMap = new Map(stores?.map(store => [store.id, store]) || []);

    // Filter leaves
    const filteredLeaves = leaves?.filter(leave => {
        const employee = employeeMap.get(leave.employeeId);
        const matchesSearch = employee?.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || false;
        const matchesStatus = filterStatus === 'all' || leave.status === filterStatus;
        const matchesStore = filterStore === 'all' || leave.storeId === filterStore;
        return matchesSearch && matchesStatus && matchesStore;
    }) || [];

    // Sort by date (newest first)
    const sortedLeaves = [...filteredLeaves].sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : (a.createdAt as any).toDate?.() || new Date();
        const dateB = b.createdAt instanceof Date ? b.createdAt : (b.createdAt as any).toDate?.() || new Date();
        return dateB.getTime() - dateA.getTime();
    });

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

    const handleApprove = async (leaveId: string) => {
        if (!user) return;
        try {
            await approveLeave(leaveId, user.id);
            toast.success('Đã duyệt đơn nghỉ phép');
        } catch (error) {
            console.error('Error approving leave:', error);
            toast.error('Có lỗi xảy ra');
        }
    };
    const handleReject = async (leaveId: string) => {
        if (!user) return;

        try {
            await rejectLeave(leaveId, user.id, rejectReason);
            toast.success('Đã từ chối đơn nghỉ phép');
            setRejectingLeaveId(null);
            setRejectReason('');
        } catch (error) {
            console.error('Error rejecting leave:', error);
            toast.error('Có lỗi xảy ra');
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

    const handleDeleteClick = async (leaveId: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xoá đơn nghỉ phép này?')) {
            try {
                await deleteLeave(leaveId);
                toast.success('Đã xoá đơn nghỉ phép');
            } catch (error) {
                console.error('Error deleting leave:', error);
                toast.error('Có lỗi xảy ra khi xoá đơn');
            }
        }
    };

    const pendingCount = leaves?.filter(l => l.status === 'pending').length || 0;
    const approvedCount = leaves?.filter(l => l.status === 'approved').length || 0;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Quản lý nghỉ phép
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Xem và theo dõi tất cả đơn nghỉ phép trong hệ thống
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Chờ duyệt</p>
                            <p className="text-3xl font-bold mt-1">{pendingCount}</p>
                        </div>
                        <Clock className="w-12 h-12 opacity-80" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Đã duyệt</p>
                            <p className="text-3xl font-bold mt-1">{approvedCount}</p>
                        </div>
                        <CheckCircle className="w-12 h-12 opacity-80" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Tổng đơn</p>
                            <p className="text-3xl font-bold mt-1">{leaves?.length || 0}</p>
                        </div>
                        <Calendar className="w-12 h-12 opacity-80" />
                    </div>
                </div>
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
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <select
                            value={filterStore}
                            onChange={(e) => setFilterStore(e.target.value)}
                            className="w-full md:w-auto pl-10 pr-8 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white appearance-none"
                        >
                            <option value="all">Tất cả cửa hàng</option>
                            {stores?.map(store => (
                                <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="w-full md:w-auto pl-10 pr-8 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white appearance-none"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="pending">Chờ duyệt</option>
                            <option value="approved">Đã duyệt</option>
                            <option value="rejected">Từ chối</option>
                            <option value="cancelled">Đã hủy</option>
                        </select>
                    </div>
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
                                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Cửa hàng</th>
                                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Nhân viên</th>
                                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Loại</th>
                                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Thời gian</th>
                                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Số ngày</th>
                                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Lý do</th>
                                        <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Trạng thái</th>
                                        <th className="text-right py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedLeaves.map((leave) => {
                                        const employee = employeeMap.get(leave.employeeId);
                                        const store = storeMap.get(leave.storeId);
                                        return (
                                            <tr key={leave.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {store?.name || 'Unknown Store'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold">
                                                            {employee?.displayName.charAt(0) || '?'}
                                                        </div>
                                                        <span className="text-gray-900 dark:text-white">
                                                            {employee?.displayName || 'Unknown'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="text-gray-900 dark:text-white text-sm">
                                                        {getLeaveTypeLabel(leave.type)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                                    <div className="flex flex-col">
                                                        <span>{format(leave.startDate instanceof Date ? leave.startDate : (leave.startDate as any).toDate(), 'dd/MM/yyyy')}</span>
                                                        <span className="text-[10px]">đến {format(leave.endDate instanceof Date ? leave.endDate : (leave.endDate as any).toDate(), 'dd/MM/yyyy')}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                                    {leave.totalDays} ngày
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 max-w-[150px] truncate" title={leave.reason}>
                                                    {leave.reason}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        {getStatusIcon(leave.status)}
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getLeaveStatusColor(leave.status)}`}>
                                                            {getLeaveStatusLabel(leave.status)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(leave)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Chỉnh sửa trạng thái"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(leave.id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Xoá đơn"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
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
                                const store = storeMap.get(leave.storeId);
                                const startDate = leave.startDate instanceof Date ? leave.startDate : (leave.startDate as any).toDate?.() || new Date();
                                const endDate = leave.endDate instanceof Date ? leave.endDate : (leave.endDate as any).toDate?.() || new Date();

                                return (
                                    <div key={leave.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{store?.name || 'Unknown Store'}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                                        {employee?.displayName.charAt(0) || '?'}
                                                    </div>
                                                    <span className="font-bold text-gray-900 dark:text-white">{employee?.displayName || 'Unknown'}</span>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                {getStatusIcon(leave.status)}
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getLeaveStatusColor(leave.status)}`}>
                                                    {getLeaveStatusLabel(leave.status)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Loại nghỉ:</p>
                                                <p className="text-xs font-bold dark:text-white">{getLeaveTypeLabel(leave.type)}</p>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Thời gian:</p>
                                                <p className="text-xs font-bold dark:text-white">
                                                    {format(startDate, 'dd/MM/yyyy')} - {format(endDate, 'dd/MM/yyyy')}
                                                </p>
                                            </div>
                                            <div className="pt-2 border-t border-gray-100 dark:border-gray-600">
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Lý do</p>
                                                <p className="text-xs dark:text-gray-200 line-clamp-2 italic">"{leave.reason}"</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                                                Tổng: {leave.totalDays} ngày
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(leave)}
                                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" /> Sửa
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(leave.id)}
                                                    className="p-2.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

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
                                        if (rejectingLeaveId) handleReject(rejectingLeaveId);
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
    );
}
