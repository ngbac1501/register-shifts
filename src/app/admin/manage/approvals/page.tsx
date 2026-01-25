'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useStore } from '@/contexts/StoreContext';
import { StoreSelector } from '@/components/admin/StoreSelector';
import { useCollection } from '@/hooks/use-firestore';
import { Schedule, Shift, User } from '@/types';
import { where, updateDoc, doc, Timestamp, deleteField, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { Clock, Edit, AlertTriangle, Filter, Trash2, Search, Calendar, ChevronDown, Check, X, Loader2, CheckCircle2 } from 'lucide-react';
import { formatDate, getStatusLabel, calculateDuration } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, subMonths, startOfYear, subYears, isWithinInterval, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ShiftSwapEnhanced, ShiftSwapEnhancedWithDetails } from '@/types';
import { approveShiftSwap, rejectShiftSwap } from '@/lib/shift-swap-service';
import { ArrowRightLeft } from 'lucide-react';

export default function AdminApprovalsPage() {
    const { user } = useAuth();
    const { selectedStoreId } = useStore();
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('pending');
    const [activeTab, setActiveTab] = useState<'schedules' | 'swaps'>('schedules');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRangeFilter, setDateRangeFilter] = useState('all');

    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [rejectingSchedule, setRejectingSchedule] = useState<Schedule | null>(null);
    const [rejectingSwap, setRejectingSwap] = useState<ShiftSwapEnhanced | null>(null);
    const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [editFormData, setEditFormData] = useState({
        date: '',
        shiftId: '',
        status: 'pending' as 'pending' | 'approved' | 'rejected' | 'completed',
        startTime: '',
        endTime: '',
    });

    const { data: schedules, loading } = useCollection<Schedule>('schedules',
        selectedStoreId ? [where('storeId', '==', selectedStoreId)] : []
    );

    const { data: shifts } = useCollection<Shift>('shifts', [
        where('isActive', '==', true),
    ]);

    const { data: employees } = useCollection<User>('users',
        selectedStoreId ? [
            where('storeId', '==', selectedStoreId),
            where('role', '==', 'employee'),
        ] : []
    );

    const { data: shiftSwaps } = useCollection<ShiftSwapEnhanced>('shift_swaps',
        selectedStoreId ? [where('storeId', '==', selectedStoreId)] : []
    );

    const getShiftInfo = (schedule: Schedule) => {
        const shift = shifts?.find(s => s.id === schedule.shiftId);
        let time = shift ? `${shift.startTime} - ${shift.endTime}` : '';
        let duration = shift?.duration || 0;

        if (schedule.startTime && schedule.endTime) {
            time = `${schedule.startTime} - ${schedule.endTime}`;
            duration = calculateDuration(schedule.startTime, schedule.endTime);
        }

        return shift ? {
            name: shift.type === 'parttime' ? 'Part-time' : shift.name,
            time: time,
            duration: duration,
        } : { name: 'Unknown', time: '', duration: 0 };
    };

    const getEmployeeInfo = (employeeId: string) => {
        const employee = employees?.find(e => e.id === employeeId);
        return employee ? {
            name: employee.displayName,
            email: employee.email,
            photoURL: employee.photoURL,
        } : { name: 'Không xác định', email: '', photoURL: null };
    };

    const filteredSchedules = schedules?.filter(s => {
        // 1. Status Filter
        const matchesStatus = statusFilter === 'all' ? true : s.status === statusFilter;

        // 2. Search Filter
        const employeeName = getEmployeeInfo(s.employeeId).name.toLowerCase();
        const matchesSearch = employeeName.includes(searchTerm.toLowerCase());

        // 3. Date Range Filter
        let matchesDate = true;
        if (dateRangeFilter !== 'all') {
            const scheduleDate = s.date instanceof Date ? s.date : s.date.toDate();
            const now = new Date();

            switch (dateRangeFilter) {
                case 'today':
                    matchesDate = isSameDay(scheduleDate, now);
                    break;
                case 'week':
                    matchesDate = isWithinInterval(scheduleDate, {
                        start: startOfWeek(now, { weekStartsOn: 1 }),
                        end: endOfWeek(now, { weekStartsOn: 1 })
                    });
                    break;
                case 'lastWeek':
                    {
                        const lastWeek = subWeeks(now, 1);
                        matchesDate = isWithinInterval(scheduleDate, {
                            start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
                            end: endOfWeek(lastWeek, { weekStartsOn: 1 })
                        });
                    }
                    break;
                case 'nextWeek':
                    {
                        const nextWeek = addWeeks(now, 1);
                        matchesDate = isWithinInterval(scheduleDate, {
                            start: startOfWeek(nextWeek, { weekStartsOn: 1 }),
                            end: endOfWeek(nextWeek, { weekStartsOn: 1 })
                        });
                    }
                    break;
                case 'month':
                    matchesDate = isWithinInterval(scheduleDate, {
                        start: startOfMonth(now),
                        end: endOfDay(now) // Up to today, or end of month? Usually means "This month" so strictly within current month
                    });
                    // Actually, let's just check month and year
                    matchesDate = scheduleDate.getMonth() === now.getMonth() && scheduleDate.getFullYear() === now.getFullYear();
                    break;
                case 'lastMonth':
                    const lastMonth = subMonths(now, 1);
                    matchesDate = scheduleDate.getMonth() === lastMonth.getMonth() && scheduleDate.getFullYear() === lastMonth.getFullYear();
                    break;
                case 'year':
                    matchesDate = scheduleDate.getFullYear() === now.getFullYear();
                    break;
                case 'lastYear':
                    matchesDate = scheduleDate.getFullYear() === subYears(now, 1).getFullYear();
                    break;
                default:
                    matchesDate = true;
            }
        }

        return matchesStatus && matchesSearch && matchesDate;
    })?.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : a.date.toDate();
        const dateB = b.date instanceof Date ? b.date : b.date.toDate();
        return dateB.getTime() - dateA.getTime();
    }) || [];

    const filteredSwaps = shiftSwaps?.filter(s => {
        const matchesStatus = statusFilter === 'all' ? true : s.status === statusFilter;

        // Simple search by fromEmployee name for now
        const fromEmployee = getEmployeeInfo(s.fromEmployeeId);
        const toEmployee = s.toEmployeeId ? getEmployeeInfo(s.toEmployeeId) : { name: '' };
        const matchesSearch = fromEmployee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            toEmployee.name.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesStatus && matchesSearch;
    })?.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : (a.createdAt as any).toDate?.() || new Date();
        const dateB = b.createdAt instanceof Date ? b.createdAt : (b.createdAt as any).toDate?.() || new Date();
        return dateB.getTime() - dateA.getTime();
    }) || [];

    const pendingCount = schedules?.filter(s => s.status === 'pending').length || 0;
    const approvedCount = schedules?.filter(s => s.status === 'approved').length || 0;
    const rejectedCount = schedules?.filter(s => s.status === 'rejected').length || 0;
    const completedCount = schedules?.filter(s => s.status === 'completed').length || 0;

    const pendingSwapCount = shiftSwaps?.filter(s => s.status === 'pending').length || 0;

    const editingShift = shifts?.find(s => s.id === editFormData.shiftId);
    const isEditingPartTime = editingShift?.type === 'parttime';

    const handleApprove = async (scheduleId: string) => {
        try {
            await updateDoc(doc(db, 'schedules', scheduleId), {
                status: 'approved',
                approvedBy: user?.id,
                updatedAt: Timestamp.now(),
            });
            toast.success('Đã duyệt ca làm việc thành công!');
        } catch (error) {
            console.error('Error approving schedule:', error);
            toast.error('Có lỗi xảy ra khi duyệt yêu cầu');
        }
    };

    const handleComplete = async (scheduleId: string) => {
        try {
            await updateDoc(doc(db, 'schedules', scheduleId), {
                status: 'completed',
                updatedAt: Timestamp.now(),
            });
            toast.success('Đã đánh dấu hoàn thành!');
        } catch (error) {
            console.error('Error completing schedule:', error);
            toast.error('Có lỗi xảy ra khi hoàn thành ca làm việc');
        }
    };

    const handleRejectClick = (schedule: Schedule) => {
        setRejectingSchedule(schedule);
        setIsRejectModalOpen(true);
    };

    const handleDeleteClick = (schedule: Schedule) => {
        setDeletingSchedule(schedule);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmReject = async () => {
        if (!rejectingSchedule) return;

        try {
            await updateDoc(doc(db, 'schedules', rejectingSchedule.id), {
                status: 'rejected',
                approvedBy: user?.id,
                updatedAt: Timestamp.now(),
            });
            setIsRejectModalOpen(false);
            setRejectingSchedule(null);
            toast.success('Đã từ chối yêu cầu');
        } catch (error) {
            console.error('Error rejecting schedule:', error);
            toast.error('Có lỗi xảy ra khi từ chối yêu cầu');
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingSchedule) return;

        try {
            await deleteDoc(doc(db, 'schedules', deletingSchedule.id));
            setIsDeleteModalOpen(false);
            setDeletingSchedule(null);
            toast.success('Đã xóa ca làm việc');
        } catch (error) {
            console.error('Error deleting schedule:', error);
            toast.error('Có lỗi xảy ra khi xoá yêu cầu');
        }
    };

    const handleApproveSwap = async (swapId: string) => {
        if (!user) return;
        try {
            await approveShiftSwap(swapId, user.id);
            toast.success('Đã duyệt đổi ca');
        } catch (error) {
            console.error('Error approving swap:', error);
            toast.error('Có lỗi xảy ra');
        }
    };

    const handleRejectSwap = async () => {
        if (!user || !rejectingSwap) return;
        try {
            await rejectShiftSwap(rejectingSwap.id, user.id);
            toast.success('Đã từ chối đổi ca');
            setRejectingSwap(null);
            setIsRejectModalOpen(false);
        } catch (error) {
            console.error('Error rejecting swap:', error);
            toast.error('Có lỗi xảy ra');
        }
    };

    const openRejectSwapModal = (swap: ShiftSwapEnhanced) => {
        setRejectingSwap(swap);
        setIsRejectModalOpen(true);
    };

    const handleEdit = (schedule: Schedule) => {
        setEditingSchedule(schedule);
        const scheduleDate = schedule.date instanceof Date ? schedule.date : schedule.date.toDate();
        const shift = shifts?.find(s => s.id === schedule.shiftId);

        setEditFormData({
            date: format(scheduleDate, 'yyyy-MM-dd'),
            shiftId: schedule.shiftId,
            status: schedule.status,
            startTime: schedule.startTime || shift?.startTime || '',
            endTime: schedule.endTime || shift?.endTime || '',
        });
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingSchedule(null);
        setEditFormData({ date: '', shiftId: '', status: 'pending', startTime: '', endTime: '' });
    };

    const handleShiftChange = (shiftId: string) => {
        const shift = shifts?.find(s => s.id === shiftId);
        setEditFormData(prev => ({
            ...prev,
            shiftId,
            startTime: shift?.startTime || '',
            endTime: shift?.endTime || '',
        }));
    };

    const handleSubmitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchedule) return;

        try {
            const updateData: any = {
                shiftId: editFormData.shiftId,
                date: Timestamp.fromDate(new Date(editFormData.date)),
                status: editFormData.status,
                updatedAt: Timestamp.now(),
            };

            if (isEditingPartTime) {
                updateData.startTime = editFormData.startTime;
                updateData.endTime = editFormData.endTime;
            } else {
                updateData.startTime = deleteField();
                updateData.endTime = deleteField();
            }

            await updateDoc(doc(db, 'schedules', editingSchedule.id), updateData);
            handleCloseEditModal();
        } catch (error) {
            console.error('Error updating schedule:', error);
            alert('Có lỗi xảy ra khi cập nhật ca làm việc');
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Quản lý ca làm việc</h1>
                <p className="text-gray-600 dark:text-gray-400">Duyệt, chỉnh sửa và quản lý ca làm việc của nhân viên</p>
            </div>

            {/* Store Selector */}
            <StoreSelector />

            {/* Stats Cards / Filters */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { id: 'all', label: 'Tất cả', count: schedules?.length || 0, color: 'blue', border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
                    { id: 'pending', label: 'Chờ duyệt', count: pendingCount, color: 'yellow', border: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-600' },
                    { id: 'approved', label: 'Đã duyệt', count: approvedCount, color: 'green', border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-600' },
                    { id: 'completed', label: 'Hoàn thành', count: completedCount, color: 'purple', border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-600' },
                    { id: 'rejected', label: 'Từ chối', count: rejectedCount, color: 'red', border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-600' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setStatusFilter(item.id as any)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 transform hover:-translate-y-1 ${statusFilter === item.id
                            ? `${item.border} ${item.bg} dark:bg-opacity-20`
                            : `border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-${item.color}-300`
                            }`}
                    >
                        <p className={`text-sm mb-1 font-medium ${statusFilter === item.id ? item.text : 'text-gray-500 dark:text-gray-400'}`}>{item.label}</p>
                        <p className={`text-2xl font-bold ${statusFilter === item.id ? item.text : 'text-gray-900 dark:text-white'}`}>{item.count}</p>
                    </button>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('schedules')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'schedules'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    Đăng ký ca ({pendingCount})
                </button>
                <button
                    onClick={() => setActiveTab('swaps')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'swaps'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    <ArrowRightLeft className="w-4 h-4" />
                    Đổi ca ({pendingSwapCount})
                </button>
            </div>

            {/* Advanced Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4">
                <div className="relative md:w-64">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <div className="relative">
                        <select
                            value={dateRangeFilter}
                            onChange={(e) => setDateRangeFilter(e.target.value)}
                            className="w-full pl-12 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white appearance-none"
                        >
                            <option value="all">Tất cả thời gian</option>
                            <option value="today">Hôm nay</option>
                            <option value="week">Tuần này</option>
                            <option value="nextWeek">Tuần sau</option>
                            <option value="lastWeek">Tuần trước</option>
                            <option value="month">Tháng này</option>
                            <option value="lastMonth">Tháng trước</option>
                            <option value="year">Năm nay</option>
                            <option value="lastYear">Năm trước</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên nhân viên..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white"
                    />
                </div>

                {(searchTerm || dateRangeFilter !== 'all') && (
                    <button
                        onClick={() => { setSearchTerm(''); setDateRangeFilter('all'); }}
                        className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        Xóa bộ lọc
                    </button>
                )}
            </div>

            {/* Table View */}
            {activeTab === 'schedules' ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        {loading ? (
                            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                        ) : filteredSchedules.length === 0 ? (
                            <div className="p-12 text-center">
                                <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">Không tìm thấy ca làm việc nào phù hợp</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Nhân viên</th>
                                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Thời gian</th>
                                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Ca làm việc</th>
                                        <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Trạng thái</th>
                                        <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredSchedules.map((schedule) => {
                                        const shift = getShiftInfo(schedule);
                                        const employee = getEmployeeInfo(schedule.employeeId);
                                        const isPending = schedule.status === 'pending';
                                        const isApproved = schedule.status === 'approved';
                                        const isRejected = schedule.status === 'rejected';

                                        return (
                                            <tr key={schedule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                                                            <img
                                                                src={employee.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=random`}
                                                                alt={employee.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{employee.name}</p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{employee.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            {formatDate(schedule.date, 'dd/MM/yyyy')}
                                                        </span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                                            {format(schedule.date instanceof Date ? schedule.date : schedule.date.toDate(), 'EEEE', { locale: vi })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{shift.name}</p>
                                                        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            <span>{shift.time} ({shift.duration}h)</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${schedule.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                                                        schedule.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' :
                                                            schedule.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                                                                'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
                                                        }`}>
                                                        {getStatusLabel(schedule.status)}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {isPending && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApprove(schedule.id)}
                                                                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                                    title="Duyệt"
                                                                >
                                                                    <Check className="w-5 h-5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectClick(schedule)}
                                                                    className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                                    title="Từ chối"
                                                                >
                                                                    <X className="w-5 h-5" />
                                                                </button>
                                                            </>
                                                        )}

                                                        {isApproved && (
                                                            <button
                                                                onClick={() => handleComplete(schedule.id)}
                                                                className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                                                title="Đánh dấu hoàn thành"
                                                            >
                                                                <CheckCircle2 className="w-5 h-5" />
                                                            </button>
                                                        )}

                                                        {isRejected && (
                                                            <button
                                                                onClick={() => handleDeleteClick(schedule)}
                                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                title="Xoá"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => handleEdit(schedule)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <Edit className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Mobile List View */}
                    <div className="md:hidden">
                        {loading ? (
                            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                        ) : filteredSchedules.length === 0 ? (
                            <div className="p-12 text-center">
                                <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">Không tìm thấy ca làm việc nào phù hợp</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredSchedules.map((schedule) => {
                                    const shift = getShiftInfo(schedule);
                                    const employee = getEmployeeInfo(schedule.employeeId);
                                    const isPending = schedule.status === 'pending';
                                    const isApproved = schedule.status === 'approved';
                                    const isRejected = schedule.status === 'rejected';

                                    return (
                                        <div key={schedule.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                                                        <img
                                                            src={employee.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=random`}
                                                            alt={employee.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white">{employee.name}</p>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                            <Calendar className="w-3 h-3" />
                                                            <span>{formatDate(schedule.date, 'dd/MM/yyyy')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${schedule.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                                                    schedule.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' :
                                                        schedule.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                                                            'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
                                                    }`}>
                                                    {getStatusLabel(schedule.status)}
                                                </span>
                                            </div>

                                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 mb-3 border border-gray-100 dark:border-gray-700/50">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{shift.name}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-white dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">
                                                        {shift.duration}h
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>{shift.time}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 pt-2">
                                                {isPending && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(schedule.id)}
                                                            className="flex-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 py-2 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                                        >
                                                            Duyệt
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectClick(schedule)}
                                                            className="flex-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 py-2 rounded-lg text-sm font-medium hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                                                        >
                                                            Từ chối
                                                        </button>
                                                    </>
                                                )}

                                                {isApproved && (
                                                    <button
                                                        onClick={() => handleComplete(schedule.id)}
                                                        className="flex-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 py-2 rounded-lg text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                                                    >
                                                        Hoàn thành
                                                    </button>
                                                )}

                                                <div className="flex gap-2 ml-2 border-l border-gray-100 dark:border-gray-700 pl-2">
                                                    <button
                                                        onClick={() => handleEdit(schedule)}
                                                        className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    {isRejected && (
                                                        <button
                                                            onClick={() => handleDeleteClick(schedule)}
                                                            className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            ) : (
                /* Swap Requests Table */
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="hidden md:block overflow-x-auto">
                        {filteredSwaps.length === 0 ? (
                            <div className="p-12 text-center">
                                <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">Không tìm thấy yêu cầu đổi ca nào</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Từ nhân viên</th>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Đến nhân viên</th>
                                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Ca làm việc</th>
                                        <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Trạng thái</th>
                                        <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredSwaps.map((swap) => {
                                        const fromEmployee = getEmployeeInfo(swap.fromEmployeeId);
                                        const toEmployee = swap.toEmployeeId ? getEmployeeInfo(swap.toEmployeeId) : null;
                                        const shift = swap.shiftDetails;
                                        const isPending = swap.status === 'pending';

                                        return (
                                            <tr key={swap.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs ring-2 ring-white dark:ring-gray-800">
                                                            {fromEmployee.name.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-gray-900 dark:text-white">{fromEmployee.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    {toEmployee ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs ring-2 ring-white dark:ring-gray-800">
                                                                {toEmployee.name.charAt(0)}
                                                            </div>
                                                            <span className="font-medium text-gray-900 dark:text-white">{toEmployee.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Chưa có người nhận</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{shift.shiftName}</p>
                                                        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            <span>{formatDate(shift.date, 'dd/MM/yyyy')}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${swap.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                                                        swap.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' :
                                                            'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                                        }`}>
                                                        {getStatusLabel(swap.status)}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    {isPending && swap.toEmployeeId && (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleApproveSwap(swap.id)}
                                                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                                title="Duyệt"
                                                            >
                                                                <Check className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => openRejectSwapModal(swap)}
                                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                title="Từ chối"
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {/* Mobile View for Swaps */}
                    <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredSwaps.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                Không có yêu cầu nào
                            </div>
                        ) : (
                            filteredSwaps.map(swap => (
                                <div key={swap.id} className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {getEmployeeInfo(swap.fromEmployeeId).name}
                                        </span>
                                        <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {swap.toEmployeeId ? getEmployeeInfo(swap.toEmployeeId).name : '...'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500 mb-3">
                                        {swap.shiftDetails.shiftName} - {formatDate(swap.shiftDetails.date, 'dd/MM/yyyy')}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${swap.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            swap.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {getStatusLabel(swap.status)}
                                        </span>
                                        {swap.status === 'pending' && swap.toEmployeeId && (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleApproveSwap(swap.id)} className="text-green-600 text-sm font-medium">Duyệt</button>
                                                <button onClick={() => openRejectSwapModal(swap)} className="text-red-600 text-sm font-medium">Từ chối</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}


            {/* Modal Overlay Base */}
            {
                (isRejectModalOpen || isEditModalOpen || isDeleteModalOpen) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">

                        {/* Reject Modal */}
                        {isRejectModalOpen && rejectingSchedule && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Xác nhận từ chối</h2>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    Bạn chắc chắn muốn từ chối ca làm việc của <span className="font-semibold text-gray-900 dark:text-white">{getEmployeeInfo(rejectingSchedule.employeeId).name}</span>?
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsRejectModalOpen(false)}
                                        className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={handleConfirmReject}
                                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-red-500/30"
                                    >
                                        Từ chối
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Reject Swap Modal */}
                        {isRejectModalOpen && rejectingSwap && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Từ chối đổi ca</h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    Bạn có chắc chắn muốn từ chối yêu cầu đổi ca này không?
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setIsRejectModalOpen(false); setRejectingSwap(null); }}
                                        className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                                    >Hủy</button>
                                    <button
                                        onClick={handleRejectSwap}
                                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-red-500/30"
                                    >Từ chối</button>
                                </div>
                            </div>
                        )}

                        {/* Delete Modal */}
                        {isDeleteModalOpen && deletingSchedule && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                                        <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Xoá ca làm việc</h2>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    Hành động này không thể hoàn tác. Bạn chắc chắn muốn xoá ca làm việc này không?
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsDeleteModalOpen(false)}
                                        className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={handleConfirmDelete}
                                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-red-500/30"
                                    >
                                        Xoá vĩnh viễn
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Edit Modal */}
                        {isEditModalOpen && editingSchedule && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 animate-fadeIn max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chỉnh sửa ca làm việc</h2>
                                    <button onClick={handleCloseEditModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmitEdit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Ngày làm việc
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={editFormData.date}
                                            onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Ca làm việc
                                        </label>
                                        <div className="relative">
                                            <select
                                                required
                                                value={editFormData.shiftId}
                                                onChange={(e) => handleShiftChange(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white appearance-none"
                                            >
                                                <option value="">-- Chọn ca --</option>
                                                {shifts?.filter(s => s.type !== 'parttime').map((shift) => (
                                                    <option key={shift.id} value={shift.id} className="dark:bg-gray-800">
                                                        {shift.name} ({shift.startTime} - {shift.endTime})
                                                    </option>
                                                ))}
                                                {shifts?.find(s => s.type === 'parttime') && (
                                                    <option value={shifts.find(s => s.type === 'parttime')?.id} className="dark:bg-gray-800">
                                                        Part-time (Giờ linh hoạt)
                                                    </option>
                                                )}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {isEditingPartTime && (
                                        <div className="grid grid-cols-2 gap-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Giờ bắt đầu
                                                </label>
                                                <input
                                                    type="time"
                                                    required
                                                    value={editFormData.startTime}
                                                    onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Giờ kết thúc
                                                </label>
                                                <input
                                                    type="time"
                                                    required
                                                    value={editFormData.endTime}
                                                    onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Trạng thái
                                        </label>
                                        <div className="relative">
                                            <select
                                                required
                                                value={editFormData.status}
                                                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white appearance-none"
                                            >
                                                <option value="pending" className="dark:bg-gray-800">Chờ duyệt</option>
                                                <option value="approved" className="dark:bg-gray-800">Đã duyệt</option>
                                                <option value="rejected" className="dark:bg-gray-800">Từ chối</option>
                                                <option value="completed" className="dark:bg-gray-800">Hoàn thành</option>
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-700 mt-2">
                                        <button
                                            type="button"
                                            onClick={handleCloseEditModal}
                                            className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-blue-500/30 font-medium transition-colors"
                                        >
                                            Cập nhật
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
}
