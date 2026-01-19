'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCollection } from '@/hooks/use-firestore';
import { Schedule, Shift } from '@/types';
import { where } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { getStatusColor, getStatusLabel } from '@/lib/utils';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function EmployeeSchedulePage() {
    const { user } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(new Date());

    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const { data: schedules } = useCollection<Schedule>('schedules', [
        where('employeeId', '==', user?.id || ''),
    ]);

    const { data: shifts } = useCollection<Shift>('shifts', [
        where('isActive', '==', true),
    ]);

    const getSchedulesForDay = (day: Date) => {
        return schedules?.filter(schedule => {
            const scheduleDate = schedule.date instanceof Date
                ? schedule.date
                : schedule.date.toDate();
            return isSameDay(scheduleDate, day);
        }) || [];
    };

    const getShiftInfo = (schedule: Schedule) => {
        const shift = shifts?.find(s => s.id === schedule.shiftId);
        let time = shift ? `${shift.startTime} - ${shift.endTime}` : '';
        if (schedule.startTime && schedule.endTime) {
            time = `${schedule.startTime} - ${schedule.endTime}`;
        }

        return shift ? {
            name: shift.type === 'parttime' ? 'Part-time' : shift.name,
            time,
            duration: shift.duration,
        } : { name: 'Unknown', time: '', duration: 0 };
    };

    const handlePreviousWeek = () => {
        setCurrentWeek(subWeeks(currentWeek, 1));
    };

    const handleNextWeek = () => {
        setCurrentWeek(addWeeks(currentWeek, 1));
    };

    const handleToday = () => {
        setCurrentWeek(new Date());
    };

    const getStatusBgColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30',
            approved: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30',
            rejected: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30',
            completed: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30',
        };
        return colors[status] || 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700';
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Lịch làm việc cá nhân</h1>
                <p className="text-gray-600 dark:text-gray-400">Xem lịch làm việc và trạng thái ca đã đăng ký</p>
            </div>

            {/* Week Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <button
                        onClick={handlePreviousWeek}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {format(weekStart, 'dd/MM', { locale: vi })} - {format(weekEnd, 'dd/MM/yyyy', { locale: vi })}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tuần {format(currentWeek, 'w', { locale: vi })}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleToday}
                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/30"
                        >
                            Hôm nay
                        </button>
                        <button
                            onClick={handleNextWeek}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Header Row */}
                <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
                    {weekDays.map((day, index) => {
                        const isToday = isSameDay(day, new Date());
                        return (
                            <div
                                key={index}
                                className={`p-4 text-center border-r border-gray-100 dark:border-gray-700 last:border-r-0 ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                                    }`}
                            >
                                <div className={`text-xs uppercase font-bold mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {format(day, 'EEEE', { locale: vi })}
                                </div>
                                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-lg font-bold ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-gray-900 dark:text-white'
                                    }`}>
                                    {format(day, 'd')}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Content Row */}
                <div className="grid grid-cols-7">
                    {weekDays.map((day, index) => {
                        const daySchedules = getSchedulesForDay(day);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <div
                                key={index}
                                className={`min-h-[200px] p-2 border-r border-gray-100 dark:border-gray-700 last:border-r-0 ${isToday ? 'bg-blue-50/10 dark:bg-blue-900/5' : ''
                                    }`}
                            >
                                <div className="space-y-2">
                                    {daySchedules.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center py-8 opacity-50 group cursor-default">
                                            <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mb-1"></div>
                                            <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mb-1"></div>
                                            <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                                        </div>
                                    ) : (
                                        daySchedules.map((schedule) => {
                                            const shift = getShiftInfo(schedule);
                                            return (
                                                <div
                                                    key={schedule.id}
                                                    className={`p-3 rounded-xl border hover:shadow-md transition-all group ${getStatusBgColor(schedule.status)
                                                        }`}
                                                >
                                                    <div className="font-bold text-gray-900 dark:text-white text-sm mb-1 truncate" title={shift.name}>
                                                        {shift.name}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 mb-2">
                                                        <Clock className="w-3 h-3" />
                                                        {shift.time}
                                                    </div>
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusColor(schedule.status)
                                                            }`}>
                                                            {getStatusLabel(schedule.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
