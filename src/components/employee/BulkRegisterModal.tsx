import React, { useState, useMemo, useEffect } from 'react';
import { Shift, Schedule, Store, User } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { Calendar, X, Plus, Clock, AlertCircle } from 'lucide-react';
import { getConflicts, Conflict } from '@/lib/conflict-detection';
import { ConflictWarning } from '../shared/ConflictWarning';
import { format, addDays, startOfWeek, startOfDay, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';

interface BulkRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (schedules: Array<{ date: Date; shiftId: string; startTime?: string; endTime?: string }>) => Promise<void>;
    shifts?: Shift[];
    allSchedules?: Schedule[];
    store?: Store;
    user: User;
}

export function BulkRegisterModal({
    isOpen,
    onClose,
    onSubmit,
    shifts,
    allSchedules,
    store,
    user,
}: BulkRegisterModalProps) {
    const [mode, setMode] = useState<'multiple' | 'weekly'>('multiple');
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [selectedShiftId, setSelectedShiftId] = useState('');

    // Multiple dates mode time
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    // Weekly mode data
    const [weeklyPattern, setWeeklyPattern] = useState<{ [key: number]: string }>({});
    const [weeklyTimes, setWeeklyTimes] = useState<{ [key: number]: { start: string, end: string } }>({});

    const [startDate, setStartDate] = useState('');
    const [weeks, setWeeks] = useState(4);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [conflicts, setConflicts] = useState<{ [key: string]: Conflict[] }>({});

    const selectedShift = useMemo(() => shifts?.find(s => s.id === selectedShiftId), [shifts, selectedShiftId]);
    const isSelectedShiftPartTime = selectedShift?.type === 'parttime';

    const mySchedules = useMemo(() => allSchedules?.filter(s => s.employeeId === user.id) || [], [allSchedules, user.id]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedDates([]);
            setSelectedShiftId('');
            setWeeklyPattern({});
            setWeeklyTimes({});
            setStartDate('');
            setWeeks(4);
            setConflicts({});
            setMode('multiple');
            setStartTime('');
            setEndTime('');
        }
    }, [isOpen]);

    // Update time defaults when shift changes (Multiple Mode)
    useEffect(() => {
        if (selectedShift) {
            setStartTime(selectedShift.startTime);
            setEndTime(selectedShift.endTime);
        }
    }, [selectedShift]);

    const handleDateToggle = (date: string) => {
        setSelectedDates(prev =>
            prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
        );
    };

    const handleWeekdayShiftChange = (weekday: number, shiftId: string) => {
        setWeeklyPattern(prev => ({
            ...prev,
            [weekday]: shiftId,
        }));

        // Update detailed times for this weekday
        const shift = shifts?.find(s => s.id === shiftId);
        if (shift) {
            setWeeklyTimes(prev => ({
                ...prev,
                [weekday]: { start: shift.startTime, end: shift.endTime }
            }));
        }
    };

    const handleWeekdayTimeChange = (weekday: number, type: 'start' | 'end', value: string) => {
        setWeeklyTimes(prev => ({
            ...prev,
            [weekday]: { ...prev[weekday], [type]: value }
        }));
    };

    // Generate schedules based on mode
    const generatedSchedules = useMemo(() => {
        if (mode === 'multiple') {
            return selectedDates.map(date => ({
                date: new Date(date),
                shiftId: selectedShiftId,
                startTime: isSelectedShiftPartTime ? startTime : undefined,
                endTime: isSelectedShiftPartTime ? endTime : undefined,
            }));
        } else {
            // Weekly pattern mode
            if (!startDate) return [];

            const schedules: Array<{ date: Date; shiftId: string; startTime?: string; endTime?: string }> = [];
            const start = new Date(startDate);

            for (let week = 0; week < weeks; week++) {
                Object.entries(weeklyPattern).forEach(([weekday, shiftId]) => {
                    const dayIndex = parseInt(weekday);
                    if (shiftId) {
                        const date = addDays(startOfWeek(start, { weekStartsOn: 1 }), dayIndex + week * 7);
                        if (date >= start) { // Only generate from start date
                            const shift = shifts?.find(s => s.id === shiftId);
                            const isPartTime = shift?.type === 'parttime';
                            const times = weeklyTimes[dayIndex];

                            schedules.push({
                                date,
                                shiftId,
                                startTime: isPartTime && times ? times.start : undefined,
                                endTime: isPartTime && times ? times.end : undefined,
                            });
                        }
                    }
                });
            }

            return schedules;
        }
    }, [mode, selectedDates, selectedShiftId, weeklyPattern, startDate, weeks, isSelectedShiftPartTime, startTime, endTime, weeklyTimes, shifts]);

    // Check conflicts for all generated schedules
    useEffect(() => { // Changed useMemo to useEffect for async
        const checkAllConflicts = async () => {
            const newConflicts: { [key: string]: Conflict[] } = {};
            const today = startOfDay(new Date());

            for (const schedule of generatedSchedules) {
                if (!schedule.shiftId) continue;

                const shift = shifts?.find(s => s.id === schedule.shiftId);
                const key = `${format(schedule.date, 'yyyy-MM-dd')}-${schedule.shiftId}`;
                const scheduleDate = startOfDay(schedule.date);
                const currentConflicts: Conflict[] = [];

                // 1. Validation: Past Date
                if (scheduleDate < today) {
                    currentConflicts.push({
                        type: 'OVERLAP', // Using OVERLAP as a generic time error
                        severity: 'error',
                        message: `Không thể đăng ký ngày kết thúc (${format(schedule.date, 'dd/MM')})`
                    });
                }

                // 2. Validation: Pending Schedule
                const hasPending = mySchedules.some(s => {
                    const sDate = s.date instanceof Date ? s.date : s.date.toDate();
                    return isSameDay(sDate, scheduleDate) && s.status === 'pending';
                });

                if (hasPending) {
                    currentConflicts.push({
                        type: 'DUPLICATE',
                        severity: 'error',
                        message: `Đã có ca chờ duyệt ngày ${format(schedule.date, 'dd/MM')}`
                    });
                }

                if (currentConflicts.length > 0) {
                    newConflicts[key] = currentConflicts;
                    continue; // Skip further server-side checks if basic validation fails
                }

                const result = await getConflicts(
                    user.id,
                    schedule.shiftId,
                    schedule.date,
                    user.storeId || '',
                    {
                        existingSchedules: allSchedules,
                        shifts: shifts,
                        shift: shift,
                        store: store || undefined,
                        customStartTime: schedule.startTime,
                        customEndTime: schedule.endTime,
                    }
                );

                if (result.length > 0) {
                    newConflicts[key] = result;
                }
            }

            setConflicts(newConflicts);
        };

        const timer = setTimeout(() => {
            if (generatedSchedules.length > 0) {
                checkAllConflicts();
            } else {
                setConflicts({});
            }
        }, 500); // Debounce

        return () => clearTimeout(timer);

    }, [generatedSchedules, user, allSchedules, shifts, store, mySchedules]);

    const hasErrors = useMemo(() => {
        return Object.values(conflicts).some(conflictList =>
            conflictList.some(c => c.severity === 'error')
        );
    }, [conflicts]);

    const handleSubmit = async () => {
        if (generatedSchedules.length === 0 || hasErrors) return;

        setIsSubmitting(true);
        try {
            await onSubmit(generatedSchedules);
            onClose();
        } catch (error) {
            console.error('Error submitting bulk register:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const weekdays = [0, 1, 2, 3, 4, 5, 6]; // 0 = Mon
    const weekdayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Đăng ký nhiều ca</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Mode Selection */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <button
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'multiple' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                            onClick={() => setMode('multiple')}
                        >
                            Chọn nhiều ngày
                        </button>
                        <button
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'weekly' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                            onClick={() => setMode('weekly')}
                        >
                            Theo mẫu tuần
                        </button>
                    </div>

                    {mode === 'multiple' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Chọn các ngày</label>
                                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 max-h-60 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {/* Simple date picker helper */}
                                    {Array.from({ length: 30 }).map((_, i) => {
                                        const d = addDays(new Date(), i);
                                        const dateStr = format(d, 'yyyy-MM-dd');
                                        const isSelected = selectedDates.includes(dateStr);
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleDateToggle(dateStr)}
                                                className={`p-2 text-sm rounded-md border ${isSelected ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:text-gray-300'}`}
                                            >
                                                {format(d, 'dd/MM (EEE)', { locale: vi })}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ca làm việc</label>
                                <select
                                    value={selectedShiftId}
                                    onChange={(e) => setSelectedShiftId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">-- Chọn ca --</option>
                                    {shifts?.filter(s => s.type !== 'parttime').map(shift => (
                                        <option key={shift.id} value={shift.id}>
                                            {shift.name} ({shift.startTime} - {shift.endTime})
                                        </option>
                                    ))}
                                    {shifts?.find(s => s.type === 'parttime') && (
                                        <option value={shifts.find(s => s.type === 'parttime')?.id}>
                                            Part-time (Giờ linh hoạt)
                                        </option>
                                    )}
                                </select>
                            </div>

                            {isSelectedShiftPartTime && (
                                <div className="grid grid-cols-2 gap-4 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900/50">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Giờ bắt đầu
                                        </label>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Giờ kết thúc
                                        </label>
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngày bắt đầu</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số tuần</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={weeks}
                                        onChange={(e) => setWeeks(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {weekdays.map((dayIndex) => {
                                    const currentShiftId = weeklyPattern[dayIndex];
                                    const currentShift = shifts?.find(s => s.id === currentShiftId);
                                    const isPartTime = currentShift?.type === 'parttime';
                                    const times = weeklyTimes[dayIndex] || { start: '', end: '' };

                                    return (
                                        <div key={dayIndex} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700/30">
                                            <div className="flex items-center gap-4">
                                                <div className="w-24 font-medium text-gray-700 dark:text-gray-300">{weekdayLabels[dayIndex]}</div>
                                                <select
                                                    value={currentShiftId || ''}
                                                    onChange={(e) => handleWeekdayShiftChange(dayIndex, e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                                                >
                                                    <option value="">-- Nghỉ --</option>
                                                    {shifts?.filter(s => s.type !== 'parttime').map(shift => (
                                                        <option key={shift.id} value={shift.id}>
                                                            {shift.name} ({shift.startTime} - {shift.endTime})
                                                        </option>
                                                    ))}
                                                    {shifts?.find(s => s.type === 'parttime') && (
                                                        <option value={shifts.find(s => s.type === 'parttime')?.id}>
                                                            Part-time (Giờ linh hoạt)
                                                        </option>
                                                    )}
                                                </select>
                                            </div>

                                            {isPartTime && (
                                                <div className="mt-2 flex gap-4 pl-28">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">Từ:</span>
                                                        <input
                                                            type="time"
                                                            value={times.start}
                                                            onChange={(e) => handleWeekdayTimeChange(dayIndex, 'start', e.target.value)}
                                                            className="px-2 py-1 text-sm border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">Đến:</span>
                                                        <input
                                                            type="time"
                                                            value={times.end}
                                                            onChange={(e) => handleWeekdayTimeChange(dayIndex, 'end', e.target.value)}
                                                            className="px-2 py-1 text-sm border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Preview Generated Schedules */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Dự kiến đăng ký: {generatedSchedules.length} ca
                        </h3>
                        {/* Show conflicts if any */}
                        {Object.values(conflicts).flat().length > 0 && (
                            <div className="mt-2 space-y-2">
                                <div className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" /> Phát hiện xung đột:
                                </div>
                                {Object.values(conflicts).flat().slice(0, 3).map((c, i) => (
                                    <div key={i} className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-1 rounded">
                                        • {c.message}
                                    </div>
                                ))}
                                {Object.values(conflicts).flat().length > 3 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 pl-2">... và các lỗi khác</div>
                                )}
                            </div>
                        )}
                        {generatedSchedules.length > 0 && !hasErrors && (
                            <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Sẵn sàng đăng ký
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={generatedSchedules.length === 0 || hasErrors || isSubmitting}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-600 transition-colors"
                        >
                            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đăng ký'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

