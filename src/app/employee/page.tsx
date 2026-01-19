'use client';

import { useAuth } from '@/hooks/use-auth';
import { useCollection } from '@/hooks/use-firestore';
import { Schedule, Shift } from '@/types';
import { where } from 'firebase/firestore';
import { Calendar, Clock, CheckCircle, XCircle, DollarSign, Loader2 } from 'lucide-react';
import { formatCurrency, calculateDuration, calculateNightShiftHours } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { data: schedules, loading } = useCollection<Schedule>('schedules', [
    where('employeeId', '==', user?.id || ''),
  ]);
  const { data: shifts } = useCollection<Shift>('shifts'); // Fetch shifts

  const approvedSchedules = schedules?.filter(s => s.status === 'approved') || [];
  const completedSchedules = schedules?.filter(s => s.status === 'completed') || [];
  const pendingSchedules = schedules?.filter(s => s.status === 'pending') || [];
  const rejectedSchedules = schedules?.filter(s => s.status === 'rejected') || [];

  // Tính lương từ ca completed (Fix: use calculateDuration for part-time/flexible shifts and include Night Shift)
  const totalHours = completedSchedules.reduce((sum, schedule) => {
    if (schedule.startTime && schedule.endTime) {
      return sum + calculateDuration(schedule.startTime, schedule.endTime);
    }
    const shift = shifts?.find(s => s.id === schedule.shiftId);
    return sum + (shift?.duration || 0);
  }, 0);

  const estimatedSalary = completedSchedules.reduce((sum, schedule) => {
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

    const hourlyRate = user?.hourlyRate || 0;
    const base = duration * hourlyRate;
    const allowance = nightHours * hourlyRate * 0.3;
    return sum + base + allowance;
  }, 0);

  const stats = [
    {
      title: 'Chờ duyệt',
      value: pendingSchedules.length,
      icon: Clock,
      color: 'blue',
      bg: 'bg-blue-500',
      text: 'text-blue-600',
      bgLight: 'bg-blue-50',
    },
    {
      title: 'Đã duyệt',
      value: approvedSchedules.length,
      icon: CheckCircle,
      color: 'green',
      bg: 'bg-green-500',
      text: 'text-green-600',
      bgLight: 'bg-green-50',
    },
    {
      title: 'Từ chối',
      value: rejectedSchedules.length,
      icon: XCircle,
      color: 'red',
      bg: 'bg-red-500',
      text: 'text-red-600',
      bgLight: 'bg-red-50',
    },
    {
      title: 'Lương dự kiến',
      value: formatCurrency(estimatedSalary),
      icon: DollarSign,
      color: 'purple',
      bg: 'bg-purple-500',
      text: 'text-purple-600',
      bgLight: 'bg-purple-50',
      isText: true,
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard Nhân viên</h1>
        <p className="text-gray-600 dark:text-gray-400">Quản lý ca làm việc và theo dõi lương</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1 font-medium">{stat.title}</p>
                <p className={`${stat.isText ? 'text-xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white`}>
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgLight} dark:bg-opacity-10`}>
                <stat.icon className={`w-6 h-6 ${stat.text} dark:text-${stat.color}-400`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Shifts - Spans 2 columns */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Ca làm sắp tới
          </h2>
          {approvedSchedules.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Chưa có ca làm nào được duyệt</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Đăng ký ca mới để bắt đầu làm việc</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvedSchedules.slice(0, 5).map((schedule) => {
                const shift = shifts?.find(s => s.id === schedule.shiftId);
                const date = schedule.date instanceof Date ? schedule.date : schedule.date.toDate();

                return (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-900/30">
                        {format(date, 'dd')}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {shift?.type === 'parttime' ? 'Part-time' : (shift?.name || 'Ca làm việc')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          {schedule.startTime && schedule.endTime
                            ? `${schedule.startTime} - ${schedule.endTime}`
                            : (shift ? `${shift.startTime} - ${shift.endTime}` : schedule.shiftId)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium border border-green-200 dark:border-green-800">
                        Đã duyệt
                      </span>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 capitalize font-medium">
                        {format(date, 'EEEE, MM/yyyy', { locale: vi })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions - Spans 1 column */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Thao tác nhanh</h2>
          <a
            href="/employee/register"
            className="block group bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
            <h3 className="text-lg font-bold mb-1">Đăng ký ca mới</h3>
            <p className="text-blue-100 text-sm">Đăng ký ca làm việc cho tuần tới</p>
          </a>

          <a
            href="/employee/schedule"
            className="block group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Xem lịch làm</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Lịch làm việc cá nhân</p>
              </div>
            </div>
          </a>

          <a
            href="/employee/history"
            className="block group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-2xl hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lịch sử & Lương</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Thống kê thu nhập</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}