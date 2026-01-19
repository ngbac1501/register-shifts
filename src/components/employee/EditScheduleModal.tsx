
import { useState, useEffect } from 'react';
import { Shift, Schedule, Store } from '@/types';
import { ShiftSelectionGrid } from '@/components/employee/ShiftSelectionGrid';
import { Clock, AlertCircle, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { getConflicts } from '@/lib/conflict-detection';

interface EditScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    schedule: Schedule | null;
    shifts: Shift[] | undefined;
    userStoreId?: string;
    allSchedules?: Schedule[];
    store?: Store;
    userId: string;
}

export function EditScheduleModal({
    isOpen,
    onClose,
    schedule,
    shifts,
    userStoreId,
    allSchedules,
    store,
    userId
}: EditScheduleModalProps) {
    const [selectedShiftId, setSelectedShiftId] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (schedule && shifts) {
            setSelectedShiftId(schedule.shiftId);
            if (schedule.startTime) setStartTime(schedule.startTime);
            if (schedule.endTime) setEndTime(schedule.endTime);

            // Set default times from shift if not in schedule
            const shift = shifts.find(s => s.id === schedule.shiftId);
            if (shift) {
                if (!schedule.startTime) setStartTime(shift.startTime);
                if (!schedule.endTime) setEndTime(shift.endTime);
            }
        }
    }, [schedule, shifts, isOpen]);

    const handleShiftSelect = (shiftId: string) => {
        setSelectedShiftId(shiftId);
        const shift = shifts?.find(s => s.id === shiftId);
        if (shift) {
            setStartTime(shift.startTime);
            setEndTime(shift.endTime);
        }
    };

    const handleSubmit = async () => {
        if (!schedule) return;
        setError(null);
        setIsSubmitting(true);

        try {
            const shift = shifts?.find(s => s.id === selectedShiftId);
            const isPartTime = shift?.type === 'parttime';

            // Check conflicts
            const scheduleDate = schedule.date instanceof Date ? schedule.date : schedule.date.toDate();
            const conflicts = await getConflicts(
                userId,
                selectedShiftId,
                scheduleDate,
                userStoreId || '',
                {
                    existingSchedules: allSchedules?.filter(s => s.id !== schedule.id), // Exclude current schedule
                    shifts,
                    shift,
                    store,
                    customStartTime: isPartTime ? startTime : undefined,
                    customEndTime: isPartTime ? endTime : undefined
                }
            );

            if (conflicts.some(c => c.severity === 'error')) {
                setError('Có xung đột với ca làm việc khác hoặc quy định của cửa hàng.');
                setIsSubmitting(false);
                return;
            }

            const updateData: any = {
                shiftId: selectedShiftId,
                updatedAt: Timestamp.now()
            };

            if (isPartTime) {
                updateData.startTime = startTime;
                updateData.endTime = endTime;
            } else {
                // Clear custom times if switching to fixed shift
                updateData.startTime = shift?.startTime;
                updateData.endTime = shift?.endTime;
            }

            await updateDoc(doc(db, 'schedules', schedule.id), updateData);
            toast.success('Cập nhật ca làm việc thành công');
            onClose();
        } catch (err) {
            console.error('Error updating schedule:', err);
            setError('Có lỗi xảy ra khi cập nhật.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !schedule) return null;

    const selectedShift = shifts?.find(s => s.id === selectedShiftId);
    const isPartTime = selectedShift?.type === 'parttime';
    const scheduleDate = schedule.date instanceof Date ? schedule.date : schedule.date.toDate();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scaleIn">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sửa lịch làm việc</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Ngày: {formatDate(scheduleDate, 'dd/MM/yyyy')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Chọn ca làm việc
                        </label>
                        <ShiftSelectionGrid
                            shifts={shifts}
                            selectedShiftId={selectedShiftId}
                            date={scheduleDate}
                            onSelect={handleShiftSelect}
                            userStoreId={userStoreId}
                            allSchedules={allSchedules?.filter(s => s.id !== schedule.id)} // Exclude self for slots check
                            store={store}
                        />
                    </div>

                    {isPartTime && (
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Giờ bắt đầu
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
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
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
}
