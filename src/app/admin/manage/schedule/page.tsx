'use client';

import { useStore } from '@/contexts/StoreContext';
import { StoreSelector } from '@/components/admin/StoreSelector';
import { useCollection } from '@/hooks/use-firestore';
import { Schedule, Shift, User } from '@/types';
import { where } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { Calendar, Users, Clock, Loader2, ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle } from 'lucide-react';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { calculateDuration, getShiftCategory } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { DeleteConfirmationModal } from '@/components/shared/DeleteConfirmationModal';
import { AssignShiftModal } from '@/app/manager/schedule/AssignShiftModal';

export default function AdminSchedulePage() {
    const { selectedStoreId } = useStore();
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [scheduleToEdit, setScheduleToEdit] = useState<Schedule | null>(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const { data: schedules, loading } = useCollection<Schedule>('schedules',
        selectedStoreId ? [where('storeId', '==', selectedStoreId)] : []
    );

    const { data: shifts } = useCollection<Shift>('shifts');
    const { data: employees } = useCollection<User>('users',
        selectedStoreId ? [
            where('storeId', '==', selectedStoreId),
            where('role', '==', 'employee'),
        ] : []
    );

    const approvedSchedules = schedules?.filter(s => s.status === 'approved' || s.status === 'completed') || [];

    const getSchedulesForDay = (day: Date) => {
        return approvedSchedules.filter(schedule => {
            const scheduleDate = schedule.date instanceof Date
                ? schedule.date
                : schedule.date.toDate();
            return isSameDay(scheduleDate, day);
        });
    };

    const getShiftName = (shiftId: string) => {
        const shift = shifts?.find(s => s.id === shiftId);
        if (shift?.type === 'parttime') return 'Part-time';
        return shift?.name || 'Unknown';
    };

    const getShiftTime = (schedule: Schedule) => {
        if (schedule.startTime && schedule.endTime) {
            return `${schedule.startTime} - ${schedule.endTime}`;
        }
        const shift = shifts?.find(s => s.id === schedule.shiftId);
        return shift ? `${shift.startTime} - ${shift.endTime}` : '';
    };

    const getEmployeeName = (employeeId: string) => {
        const employee = employees?.find(e => e.id === employeeId);
        return employee?.displayName || 'Unknown';
    };

    const handlePreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
    const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
    const handleJumpToNextWeek = () => setCurrentWeek(addWeeks(new Date(), 1));
    const handleToday = () => setCurrentWeek(new Date());

    const handleAddClick = (date: Date) => {
        if (!selectedStoreId) {
            alert('Vui lòng chọn cửa hàng trước');
            return;
        }
        setSelectedDate(date);
        setScheduleToEdit(null);
        setIsAssignModalOpen(true);
    };

    const handleEditClick = (schedule: Schedule) => {
        setScheduleToEdit(schedule);
        const scheduleDate = schedule.date instanceof Date ? schedule.date : schedule.date.toDate();
        setSelectedDate(scheduleDate);
        setIsAssignModalOpen(true);
    };

    const handleDeleteClick = (scheduleId: string) => {
        setScheduleToDelete(scheduleId);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!scheduleToDelete) return;

        try {
            await updateDoc(doc(db, 'schedules', scheduleToDelete), {
                status: 'pending'
            });
            setIsDeleteModalOpen(false);
            setScheduleToDelete(null);
        } catch (error) {
            console.error('Error removing schedule:', error);
            alert('Có lỗi xảy ra khi cập nhật');
        }
    };

    const handleCompleteShift = async (scheduleId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!confirm('Đánh dấu ca làm việc này là đã hoàn thành?')) return;

        try {
            await updateDoc(doc(db, 'schedules', scheduleId), {
                status: 'completed',
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Error completing schedule:', error);
            alert('Có lỗi xảy ra khi cập nhật');
        }
    };

    if (!selectedStoreId) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Lịch làm việc cửa hàng</h1>
                    <p className="text-gray-600 dark:text-gray-400">Quản lý lịch làm việc của nhân viên</p>
                </div>
                <StoreSelector />
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-8 text-center">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-orange-400" />
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Chưa chọn cửa hàng</p>
                    <p className="text-gray-600 dark:text-gray-400">Vui lòng chọn cửa hàng để xem lịch làm việc</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Lịch làm việc cửa hàng</h1>
                    <p className="text-gray-600 dark:text-gray-400">Quản lý lịch làm việc của nhân viên</p>
                </div>
                <StoreSelector />
            </div>

            {/* Week Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
                        <button
                            onClick={handlePreviousWeek}
                            className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {format(weekStart, 'dd/MM', { locale: vi })} - {format(weekEnd, 'dd/MM/yyyy', { locale: vi })}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">|</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">Tuần {format(currentWeek, 'w', { locale: vi })}</span>
                        </div>

                        <button
                            onClick={handleNextWeek}
                            className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={handleToday}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-xl transition-colors font-medium text-sm border ${isSameDay(startOfWeek(currentWeek, { weekStartsOn: 1 }), startOfWeek(new Date(), { weekStartsOn: 1 }))
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'
                                : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            Tuần này
                        </button>
                        <button
                            onClick={handleJumpToNextWeek}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-xl transition-colors font-medium text-sm border ${isSameDay(startOfWeek(currentWeek, { weekStartsOn: 1 }), startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }))
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'
                                : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            Tuần sau
                        </button>
                    </div>
                </div>
            </div>

            {/* Desktop Calendar Grid - Same as Manager */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="grid grid-cols-[100px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20">
                    <div className="p-4 flex items-center justify-center border-r border-gray-100 dark:border-gray-700 font-semibold text-gray-500 dark:text-gray-400">
                        Ca / Ngày
                    </div>
                    {weekDays.map((day, index) => {
                        const isToday = isSameDay(day, new Date());
                        return (
                            <div
                                key={index}
                                className={`p-2 text-center border-r border-gray-100 dark:border-gray-700 last:border-r-0 relative group ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                            >
                                <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {format(day, 'EEE', { locale: vi })}
                                </div>
                                <div className={`text-sm font-bold w-7 h-7 mx-auto rounded-full flex items-center justify-center mb-1 ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-gray-900 dark:text-white'}`}>
                                    {format(day, 'd')}
                                </div>

                                <button
                                    onClick={() => handleAddClick(day)}
                                    className="absolute top-1 right-1 p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                    title="Thêm ca"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {([
                    { id: 'morning', label: 'Ca Sáng', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/10' },
                    { id: 'afternoon', label: 'Ca Chiều', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10' },
                    { id: 'night', label: 'Ca Đêm', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/10' }
                ] as const).map(category => (
                    <div key={category.id} className="grid grid-cols-[100px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                        <div className={`p-4 flex items-center justify-center border-r border-gray-100 dark:border-gray-700 font-bold ${category.color} ${category.bg}`}>
                            {category.label}
                        </div>

                        {weekDays.map((day, dayIndex) => {
                            const daySchedules = getSchedulesForDay(day);
                            const isToday = isSameDay(day, new Date());

                            const cellSchedules = daySchedules.filter(s => {
                                let startTime = s.startTime;
                                if (!startTime) {
                                    const shift = shifts?.find(sh => sh.id === s.shiftId);
                                    startTime = shift?.startTime;
                                }
                                return startTime ? getShiftCategory(startTime) === category.id : false;
                            });

                            return (
                                <div
                                    key={dayIndex}
                                    className={`min-h-[120px] p-1.5 border-r border-gray-100 dark:border-gray-700 last:border-r-0 relative group transition-colors ${isToday ? 'bg-blue-50/5 dark:bg-blue-900/5' : 'hover:bg-gray-50 dark:hover:bg-gray-700/20'}`}
                                >
                                    <div className="space-y-1.5 mt-1">
                                        {loading ? (
                                            <div className="flex justify-center py-2 opacity-50"><Loader2 className="w-4 h-4 animate-spin" /></div>
                                        ) : cellSchedules.map((schedule) => (
                                            <div
                                                key={schedule.id}
                                                onClick={() => handleEditClick(schedule)}
                                                className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-sm hover:shadow-md transition-all cursor-pointer relative group/card hover:border-green-400 dark:hover:border-green-600 ${schedule.status === 'completed' ? 'opacity-60' : ''}`}
                                            >
                                                <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg ${category.id === 'morning' ? 'bg-orange-400' :
                                                    category.id === 'afternoon' ? 'bg-blue-400' : 'bg-purple-400'
                                                    }`}></div>

                                                {schedule.status === 'completed' && (
                                                    <div className="absolute -top-1 -left-1 bg-green-500 text-white rounded-full p-0.5 z-10">
                                                        <CheckCircle className="w-3 h-3" />
                                                    </div>
                                                )}

                                                <div className="absolute -top-1 -right-1 flex flex-col gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-20">
                                                    <button
                                                        onClick={(e) => handleCompleteShift(schedule.id, e)}
                                                        className="p-1 bg-white dark:bg-gray-700 text-green-500 rounded-full shadow-sm hover:bg-green-50 dark:hover:bg-green-900/30 border border-gray-100 dark:border-gray-600"
                                                        title="Hoàn thành"
                                                    >
                                                        <CheckCircle className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(schedule.id);
                                                        }}
                                                        className="p-1 bg-white dark:bg-gray-700 text-red-500 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-100 dark:border-gray-600"
                                                        title="Xóa ca"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                <div className="pl-1.5 overflow-hidden">
                                                    <div className="font-semibold text-gray-900 dark:text-gray-200 text-[11px] truncate leading-tight">
                                                        {getEmployeeName(schedule.employeeId)}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                        {getShiftName(schedule.shiftId)}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {getShiftTime(schedule)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {cellSchedules.length === 0 && (
                                            <div
                                                onClick={() => handleAddClick(day)}
                                                className="h-full min-h-[60px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                            >
                                                <Plus className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Mobile List View */}
            <div className="md:hidden space-y-4">
                {weekDays.map((day, index) => {
                    const daySchedules = getSchedulesForDay(day);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div key={index} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${isToday ? 'border-blue-200 dark:border-blue-800 ring-1 ring-blue-500/20' : 'border-gray-100 dark:border-gray-700'}`}>
                            <div className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 flex items-center justify-between ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${isToday ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                                        {format(day, 'd')}
                                    </div>
                                    <div>
                                        <p className={`font-semibold capitalize ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                                            {format(day, 'EEEE', { locale: vi })}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {daySchedules.length} ca làm
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAddClick(day)}
                                    className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-3">
                                {daySchedules.length === 0 ? (
                                    <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500 italic border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-lg">
                                        Chưa có ca làm việc
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {daySchedules.map(schedule => {
                                            const categoryId = (() => {
                                                let startTime = schedule.startTime;
                                                if (!startTime) {
                                                    const shift = shifts?.find(sh => sh.id === schedule.shiftId);
                                                    startTime = shift?.startTime;
                                                }
                                                return startTime ? getShiftCategory(startTime) : 'morning';
                                            })();

                                            const categoryColor = categoryId === 'morning' ? 'bg-orange-400' :
                                                categoryId === 'afternoon' ? 'bg-blue-400' : 'bg-purple-400';

                                            return (
                                                <div
                                                    key={schedule.id}
                                                    onClick={() => handleEditClick(schedule)}
                                                    className={`relative flex items-center bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 shadow-sm active:scale-[0.99] transition-transform ${schedule.status === 'completed' ? 'opacity-60' : ''}`}
                                                >
                                                    <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${categoryColor}`}></div>

                                                    {schedule.status === 'completed' && (
                                                        <div className="absolute -top-1 -left-1 bg-green-500 text-white rounded-full p-0.5 z-10">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                        </div>
                                                    )}

                                                    <div className="flex-1 ml-3">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-bold text-gray-900 dark:text-white">
                                                                {getEmployeeName(schedule.employeeId)}
                                                            </span>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={(e) => handleCompleteShift(schedule.id, e)}
                                                                    className="p-1.5 text-green-500 bg-green-50 dark:bg-green-900/20 rounded-lg"
                                                                    title="Hoàn thành"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteClick(schedule.id);
                                                                    }}
                                                                    className="p-1.5 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                                            <span>{getShiftName(schedule.shiftId)}</span>
                                                            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {getShiftTime(schedule)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Tổng quan tuần này
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Tổng ca làm việc</p>
                            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{approvedSchedules.length}</p>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-800/40 rounded-xl text-blue-600 dark:text-blue-300">
                            <Calendar className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 border border-green-100 dark:border-green-900/30 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Nhân viên làm việc</p>
                            <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                                {new Set(approvedSchedules.map(s => s.employeeId)).size}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 dark:bg-green-800/40 rounded-xl text-green-600 dark:text-green-300">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-5 border border-purple-100 dark:border-purple-900/30 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">Tổng giờ làm</p>
                            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                                {approvedSchedules.reduce((total, schedule) => {
                                    if (schedule.startTime && schedule.endTime) {
                                        return total + calculateDuration(schedule.startTime, schedule.endTime);
                                    }
                                    const shift = shifts?.find(s => s.id === schedule.shiftId);
                                    return total + (shift?.duration || 0);
                                }, 0).toFixed(1)} <span className="text-lg text-purple-700 dark:text-purple-300">giờ</span>
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 dark:bg-purple-800/40 rounded-xl text-purple-600 dark:text-purple-300">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            <AssignShiftModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                date={selectedDate}
                shifts={shifts || []}
                employees={employees || []}
                existingSchedules={schedules || []}
                storeId={selectedStoreId || ''}
                scheduleToEdit={scheduleToEdit}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Xác nhận hoàn tác"
                message="Bạn có chắc chắn muốn đưa ca làm việc này về trạng thái chờ duyệt (Pending) không?"
            />
        </div>
    );
}
