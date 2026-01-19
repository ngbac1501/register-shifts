'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCollection } from '@/hooks/use-firestore';
import { Schedule, Shift } from '@/types';
import { where } from 'firebase/firestore';
import { Calendar, DollarSign, Clock, TrendingUp, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { formatDate, formatCurrency, getStatusLabel, getStatusColor, calculateDuration, calculateNightShiftHours } from '@/lib/utils';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function EmployeeHistoryPage() {
    const { user } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    const { data: schedules } = useCollection<Schedule>('schedules', [
        where('employeeId', '==', user?.id || ''),
    ]);

    const { data: shifts } = useCollection<Shift>('shifts');

    // Filter schedules for selected month and calculate stats
    const { monthSchedules, stats } = useMemo(() => {
        const filteredSchedules = schedules?.filter(schedule => {
            const scheduleDate = schedule.date instanceof Date ? schedule.date : schedule.date.toDate();
            // Ensure we compare dates correctly by resetting time components if needed, 
            // but here simply checking range is usually fine
            return scheduleDate >= monthStart && scheduleDate <= monthEnd;
        }) || [];

        const completedForStats = filteredSchedules.filter(s => s.status === 'completed');
        // For salary calculation, only 'completed' status is considered
        const completedForSalary = filteredSchedules.filter(s => s.status === 'completed');

        let totalHours = 0;
        let estimatedSalary = 0;

        completedForSalary.forEach(schedule => {
            let duration = 0;
            let nightHours = 0;

            if (schedule.startTime && schedule.endTime) {
                duration = calculateDuration(schedule.startTime, schedule.endTime);
                nightHours = calculateNightShiftHours(schedule.startTime, schedule.endTime);
            } else {
                const shift = shifts?.find(s => s.id === schedule.shiftId);
                if (shift) {
                    duration = shift.duration;
                    if (shift.startTime && shift.endTime) {
                        nightHours = calculateNightShiftHours(shift.startTime, shift.endTime);
                    }
                }
            }

            totalHours += duration;
            const hourlyRate = user?.hourlyRate || 0;
            estimatedSalary += (duration * hourlyRate) + (nightHours * hourlyRate * 0.3);
        });

        return {
            monthSchedules: filteredSchedules,
            stats: {
                totalShifts: filteredSchedules.length,
                completed: completedForStats.length,
                pending: filteredSchedules.filter(s => s.status === 'pending').length,
                rejected: filteredSchedules.filter(s => s.status === 'rejected').length,
                totalHours: Math.round(totalHours * 10) / 10,
                estimatedSalary,
            }
        };
    }, [schedules, monthStart, monthEnd, shifts, user]) as { monthSchedules: Schedule[]; stats: { totalShifts: number; completed: number; pending: number; rejected: number; totalHours: number; estimatedSalary: number; } };

    const getShiftInfo = (schedule: Schedule) => {
        const shift = shifts?.find(s => s.id === schedule.shiftId);

        let time = shift ? `${shift.startTime} - ${shift.endTime}` : '';
        let duration = shift?.duration || 0;
        let nightHours = 0;

        if (schedule.startTime && schedule.endTime) {
            time = `${schedule.startTime} - ${schedule.endTime}`;
            duration = calculateDuration(schedule.startTime, schedule.endTime);
            nightHours = calculateNightShiftHours(schedule.startTime, schedule.endTime);
        } else if (shift && shift.startTime && shift.endTime) {
            nightHours = calculateNightShiftHours(shift.startTime, shift.endTime);
        }

        return shift ? {
            name: shift.type === 'parttime' ? 'Part-time' : shift.name,
            time,
            duration,
            nightHours,
        } : { name: 'Unknown', time: '', duration: 0, nightHours: 0 };
    };

    const handlePreviousMonth = () => {
        setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
    };

    const handleThisMonth = () => {
        setSelectedMonth(new Date());
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Lịch sử & Lương</h1>
                <p className="text-gray-600 dark:text-gray-400">Xem lịch sử làm việc và thống kê lương theo tháng</p>
            </div>

            {/* Month Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={handlePreviousMonth}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white min-w-[160px] text-center capitalize">
                        {format(selectedMonth, 'MMMM yyyy', { locale: vi })}
                    </h2>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleThisMonth}
                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                        Tháng này
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Tổng ca', value: stats.totalShifts, icon: Calendar, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600' },
                    { label: 'Hoàn thành', value: stats.completed, icon: Clock, color: 'green', bg: 'bg-green-50', text: 'text-green-600' },
                    { label: 'Tổng giờ', value: stats.totalHours + 'h', icon: TrendingUp, color: 'purple', bg: 'bg-purple-50', text: 'text-purple-600' },
                    { label: 'Lương dự kiến', value: formatCurrency(stats.estimatedSalary), icon: DollarSign, color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600', isLarge: true },
                ].map((stat, index) => {
                    const Content = (
                        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 h-full ${stat.label === 'Lương dự kiến' ? 'cursor-pointer hover:border-orange-300 transition-colors' : ''}`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                                    <p className={`font-bold text-gray-900 dark:text-white ${stat.isLarge ? 'text-xl' : 'text-2xl'}`}>
                                        {stat.value}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-xl ${stat.bg} dark:bg-opacity-10`}>
                                    <stat.icon className={`w-6 h-6 ${stat.text} dark:text-${stat.color}-400`} />
                                </div>
                            </div>
                        </div>
                    );

                    if (stat.label === 'Lương dự kiến') {
                        return (
                            <a key={index} href="#payroll-table">
                                {Content}
                            </a>
                        );
                    }
                    return <div key={index}>{Content}</div>;
                })}
            </div>

            {/* Detailed Breakdown */}
            <div id="payroll-table" className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chi tiết ca làm việc</h2>
                </div>

                <div className="overflow-x-auto">
                    {monthSchedules.length === 0 ? (
                        <div className="text-center py-12">
                            <Filter className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <div className="text-gray-500 dark:text-gray-400 font-medium">
                                Không có ca làm việc nào trong tháng này
                            </div>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Ngày</th>
                                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Ca làm việc</th>
                                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Giờ</th>
                                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Thời lượng</th>
                                    <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Phụ cấp ca đêm</th>
                                    <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Trạng thái</th>
                                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Lương</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {monthSchedules
                                    .sort((a, b) => {
                                        const dateA = a.date instanceof Date ? a.date : a.date.toDate();
                                        const dateB = b.date instanceof Date ? b.date : b.date.toDate();
                                        return dateB.getTime() - dateA.getTime();
                                    })
                                    .map((schedule) => {
                                        const shift = getShiftInfo(schedule);
                                        const hourlyRate = user?.hourlyRate || 0;
                                        const nightAllowance = shift.nightHours * hourlyRate * 0.3;
                                        const salary = schedule.status === 'completed'
                                            ? (shift.duration * hourlyRate) + nightAllowance
                                            : 0;

                                        return (
                                            <tr key={schedule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            {formatDate(schedule.date, 'dd/MM/yyyy')}
                                                        </span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                                            {format(schedule.date instanceof Date ? schedule.date : schedule.date.toDate(), 'EEEE', { locale: vi })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-gray-900 dark:text-white font-medium">{shift.name}</td>
                                                <td className="py-4 px-4 text-gray-600 dark:text-gray-300">{shift.time}</td>
                                                <td className="py-4 px-4 text-gray-600 dark:text-gray-300">{shift.duration}h</td>
                                                <td className="py-4 px-4 text-right text-gray-600 dark:text-gray-300">
                                                    {nightAllowance > 0 && schedule.status === 'completed' ? formatCurrency(nightAllowance) : '-'}
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
                                                <td className="py-4 px-6 text-right font-medium text-gray-900 dark:text-white">
                                                    {salary > 0 ? formatCurrency(salary) : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
                                <tr>
                                    <td colSpan={3} className="py-4 px-6 font-bold text-gray-900 dark:text-white text-right">
                                        Tổng cộng tháng này
                                    </td>
                                    <td className="py-4 px-4 font-bold text-purple-600 dark:text-purple-400">
                                        {stats.totalHours}h
                                    </td>
                                    <td className="py-4 px-4"></td>
                                    <td className="py-4 px-6 text-right font-bold text-orange-600 dark:text-orange-400">
                                        {formatCurrency(stats.estimatedSalary)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>

            {/* Additional Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Thông tin lương
                </h3>
                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <p>• Lương theo giờ hiện tại: <span className="font-bold">{formatCurrency(user?.hourlyRate || 0)}</span></p>
                    <p>• Hệ thống chỉ tính lương cho các ca có trạng thái <span className="font-bold">Hoàn thành</span>.</p>
                    <p>• Lương dự kiến là ước tính, chưa bao gồm thưởng, phạt hoặc các khoản khấu trừ khác.</p>
                    <p>• Vui lòng liên hệ quản lý nếu có thắc mắc về bảng lương.</p>
                </div>
            </div>
        </div>
    );
}
