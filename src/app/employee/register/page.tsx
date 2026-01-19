'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCollection, useDocument } from '@/hooks/use-firestore';
import { Shift, Schedule, Store } from '@/types';
import { collection, addDoc, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Clock, Calendar as CalendarIcon, AlertCircle, CalendarDays } from 'lucide-react';
import { getConflicts, getAvailableSlots, Conflict } from '@/lib/conflict-detection';
import { ConflictWarning } from '@/components/shared/ConflictWarning';
import { BulkRegisterModal } from '@/components/employee/BulkRegisterModal';
import { ShiftSelectionGrid } from '@/components/employee/ShiftSelectionGrid';
import { isSameDay, startOfDay } from 'date-fns';

export default function EmployeeRegisterPage() {
    const { user } = useAuth();
    const { data: shifts } = useCollection<Shift>('shifts', [
        where('isActive', '==', true),
    ]);

    const { data: mySchedules } = useCollection<Schedule>('schedules', [
        where('employeeId', '==', user?.id || ''),
    ]);

    const { data: allSchedules } = useCollection<Schedule>('schedules', [
        where('storeId', '==', user?.storeId || ''),
    ]);

    const { data: store } = useDocument<Store>('stores', user?.storeId || '');

    const [formData, setFormData] = useState({
        date: '',
        shiftId: '',
        startTime: '',
        endTime: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [conflicts, setConflicts] = useState<Conflict[]>([]);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const selectedShift = useMemo(() => shifts?.find(s => s.id === formData.shiftId), [shifts, formData.shiftId]);
    const isPartTime = selectedShift?.type === 'parttime';

    const handleShiftChange = (shiftId: string) => {
        const shift = shifts?.find(s => s.id === shiftId);
        setFormData(prev => ({
            ...prev,
            shiftId,
            startTime: shift?.startTime || '',
            endTime: shift?.endTime || '',
        }));
    };

    // Validation Logic
    useEffect(() => {
        if (!formData.date) {
            setValidationError(null);
            return;
        }

        const selectedDate = startOfDay(new Date(formData.date));
        const today = startOfDay(new Date());

        // 1. Check if date is in the past
        if (selectedDate < today) {
            setValidationError('Không thể đăng ký cho ngày đã qua.');
            return;
        }

        // 2. Check for existing pending schedules
        const hasPending = mySchedules?.some(s => {
            const scheduleDate = s.date instanceof Date ? s.date : s.date.toDate();
            return isSameDay(scheduleDate, selectedDate) && s.status === 'pending';
        });

        if (hasPending) {
            setValidationError('Bạn đã có ca chờ duyệt trong ngày này. Vui lòng chỉnh sửa ca đã có thay vì đăng ký mới.');
            return;
        }

        setValidationError(null);
    }, [formData.date, mySchedules]);

    // Calculate conflicts when user selects date and shift
    useEffect(() => {
        const checkConflicts = async () => {
            if (!formData.date || !formData.shiftId || !user) {
                setConflicts([]);
                return;
            }

            const selectedDate = new Date(formData.date);

            const result = await getConflicts(
                user.id,
                formData.shiftId,
                selectedDate,
                user.storeId || '',
                {
                    existingSchedules: allSchedules,
                    shifts: shifts,
                    shift: selectedShift,
                    store: store || undefined,
                    customStartTime: isPartTime ? formData.startTime : undefined,
                    customEndTime: isPartTime ? formData.endTime : undefined,
                }
            );
            setConflicts(result);
        };

        const timer = setTimeout(() => {
            checkConflicts();
        }, 300);

        return () => clearTimeout(timer);
    }, [formData.date, formData.shiftId, formData.startTime, formData.endTime, user, allSchedules, shifts, store, selectedShift, isPartTime]);

    const hasErrors = useMemo(() => {
        return conflicts.some(c => c.severity === 'error') || !!validationError;
    }, [conflicts, validationError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (hasErrors) {
            setMessage({
                type: 'error',
                text: validationError || 'Không thể đăng ký do có xung đột. Vui lòng kiểm tra cảnh báo.',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const scheduleData: any = {
                storeId: user?.storeId,
                employeeId: user?.id,
                shiftId: formData.shiftId,
                date: Timestamp.fromDate(new Date(formData.date)),
                status: 'pending',
                requestedBy: user?.id,
                createdBy: user?.id,
                isAssigned: false,
                createdAt: Timestamp.now(),
            };

            if (isPartTime) {
                scheduleData.startTime = formData.startTime;
                scheduleData.endTime = formData.endTime;
            }

            await addDoc(collection(db, 'schedules'), scheduleData);

            setMessage({
                type: 'success',
                text: 'Đăng ký ca làm việc thành công!',
            });
            setFormData({
                date: '',
                shiftId: '',
                startTime: '',
                endTime: '',
            });
            setConflicts([]);
        } catch (error) {
            console.error('Error submitting shift:', error);
            setMessage({
                type: 'error',
                text: 'Có lỗi xảy ra khi đăng ký ca làm việc.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkSubmit = async (schedules: Array<{ date: Date; shiftId: string; startTime?: string; endTime?: string }>) => {
        try {
            const promises = schedules.map(schedule => {
                const scheduleData: any = {
                    storeId: user?.storeId,
                    employeeId: user?.id,
                    shiftId: schedule.shiftId,
                    date: Timestamp.fromDate(schedule.date),
                    status: 'pending',
                    requestedBy: user?.id,
                    createdBy: user?.id,
                    isAssigned: false,
                    createdAt: Timestamp.now(),
                };

                if (schedule.startTime) scheduleData.startTime = schedule.startTime;
                if (schedule.endTime) scheduleData.endTime = schedule.endTime;

                return addDoc(collection(db, 'schedules'), scheduleData);
            });

            await Promise.all(promises);
            setMessage({
                type: 'success',
                text: `Đăng ký thành công ${schedules.length} ca! Chờ quản lý duyệt.`,
            });
        } catch (error) {
            console.error('Error bulk submitting:', error);
            setMessage({
                type: 'error',
                text: 'Có lỗi xảy ra khi đăng ký nhiều ca.',
            });
        }
    };

    const getShiftSlots = (shiftId: string) => {
        if (!formData.date || !user?.storeId) return null;

        const shift = shifts?.find(s => s.id === shiftId);

        return getAvailableSlots(
            shiftId,
            new Date(formData.date),
            user.storeId,
            shift,
            store || undefined,
            allSchedules
        );
    };

    return (
        <div className="max-w-xl mx-auto animate-fadeIn">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Đăng ký ca làm</h1>
                    <p className="text-gray-600 dark:text-gray-400">Chọn ngày và ca làm việc bạn muốn đăng ký</p>
                </div>
                <button
                    onClick={() => setIsBulkModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                    <CalendarDays className="w-5 h-5" />
                    Đăng ký nhiều ca
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Ngày làm việc <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                required
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        {validationError && (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {validationError}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Chọn ca làm việc <span className="text-red-500">*</span>
                        </label>

                        <ShiftSelectionGrid
                            shifts={shifts}
                            selectedShiftId={formData.shiftId}
                            date={formData.date}
                            onSelect={(shiftId) => handleShiftChange(shiftId)}
                            userStoreId={user?.storeId}
                            allSchedules={allSchedules}
                            store={store || undefined}
                        />
                    </div>

                    {isPartTime && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Giờ bắt đầu
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Giờ kết thúc
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>
                    )}

                    {conflicts.length > 0 && (
                        <ConflictWarning conflicts={conflicts} />
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting || hasErrors}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium dark:disabled:bg-gray-600"
                    >
                        {isSubmitting ? 'Đang xử lý...' : 'Đăng ký ca làm'}
                    </button>
                </form>
            </div>

            <BulkRegisterModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSubmit={handleBulkSubmit}
                shifts={shifts}
                allSchedules={allSchedules}
                store={store || undefined}
                user={user!}
            />
        </div>
    );
}

