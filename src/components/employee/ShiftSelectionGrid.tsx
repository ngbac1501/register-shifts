
import { Clock } from 'lucide-react';
import { Shift, Schedule, Store } from '@/types';
import { getAvailableSlots } from '@/lib/conflict-detection';

interface ShiftSelectionGridProps {
    shifts: Shift[] | undefined;
    selectedShiftId: string;
    date: string | Date;
    onSelect: (shiftId: string) => void;
    userStoreId?: string;
    allSchedules?: Schedule[];
    store?: Store;
}

export function ShiftSelectionGrid({
    shifts,
    selectedShiftId,
    date,
    onSelect,
    userStoreId,
    allSchedules,
    store
}: ShiftSelectionGridProps) {
    if (!shifts) return null;

    const getShiftSlots = (shiftId: string) => {
        if (!date || !userStoreId) return null;

        const shift = shifts.find(s => s.id === shiftId);

        return getAvailableSlots(
            shiftId,
            new Date(date),
            userStoreId,
            shift,
            store,
            allSchedules
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shifts.filter(s => s.type !== 'parttime').map((shift) => {
                const slots = getShiftSlots(shift.id);
                const isDisabled = slots ? slots.available === 0 : false;
                const isSelected = selectedShiftId === shift.id;

                return (
                    <div
                        key={shift.id}
                        onClick={() => !isDisabled && onSelect(shift.id)}
                        className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer group flex flex-col justify-between min-h-[120px] ${isSelected
                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-400'
                                : isDisabled
                                    ? 'border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 opacity-60 cursor-not-allowed'
                                    : 'border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className={`font-bold text-lg ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                                {shift.name}
                            </h3>
                            {isSelected && (
                                <div className="bg-blue-500 text-white p-1 rounded-full shadow-sm">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span>{shift.startTime} - {shift.endTime}</span>
                        </div>

                        {slots && (
                            <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700/50">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">Trạng thái:</span>
                                    <span className={`font-medium ${slots.available === 0 ? 'text-red-500' :
                                            slots.available < 3 ? 'text-orange-500' : 'text-green-500'
                                        }`}>
                                        {slots.available === 0 ? 'Hết chỗ' : `Còn ${slots.available}/${slots.total} chỗ`}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-1 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${slots.available === 0 ? 'bg-red-500' :
                                                slots.available < 3 ? 'bg-orange-500' : 'bg-green-500'
                                            }`}
                                        style={{ width: `${(slots.available / slots.total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Part-time Card */}
            {shifts.find(s => s.type === 'parttime') && (
                <div
                    onClick={() => onSelect(shifts.find(s => s.type === 'parttime')?.id!)}
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer group flex flex-col justify-between min-h-[120px] ${selectedShiftId === shifts.find(s => s.type === 'parttime')?.id
                            ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 dark:border-purple-400'
                            : 'border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-purple-200 dark:hover:border-purple-700 hover:shadow-md'
                        }`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className={`font-bold text-lg ${selectedShiftId === shifts.find(s => s.type === 'parttime')?.id ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-white'}`}>
                            Part-time
                        </h3>
                        {selectedShiftId === shifts.find(s => s.type === 'parttime')?.id && (
                            <div className="bg-purple-500 text-white p-1 rounded-full shadow-sm">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Ca làm việc linh hoạt, đăng ký theo giờ tùy chỉnh.
                    </div>
                    <div className="mt-auto pt-2 flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                        <Clock className="w-3 h-3" /> Tùy chọn giờ
                    </div>
                </div>
            )}
        </div>
    );
}
