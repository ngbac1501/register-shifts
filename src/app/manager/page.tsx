'use client';

import { useAuth } from '@/hooks/use-auth';
import { useCollection } from '@/hooks/use-firestore';
import { Schedule, User, Shift } from '@/types';
import { where } from 'firebase/firestore';
import { Calendar, Users, Clock, CheckCircle, ChevronRight, AlertCircle, Briefcase, TrendingUp } from 'lucide-react';
import { format, isSameDay, isWithinInterval, parse, startOfDay, addDays, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { data: schedules } = useCollection<Schedule>('schedules', [
    where('storeId', '==', user?.storeId || ''),
  ]);
  const { data: employees } = useCollection<User>('users', [
    where('storeId', '==', user?.storeId || ''),
    where('role', '==', 'employee'),
  ]);
  const { data: shifts } = useCollection<Shift>('shifts');

  // --- Derived State Calculations ---
  const now = new Date();
  const today = startOfDay(now);

  const pendingSchedules = schedules?.filter(s => s.status === 'pending') || [];

  // Filter for Today's and Yesterday's Schedules (to catch overnight shifts)
  const relevantSchedules = schedules?.filter(s => {
    if (s.status !== 'approved') return false;
    const sDate = s.date instanceof Date ? s.date : s.date.toDate();
    return isSameDay(sDate, now) || isSameDay(sDate, subDays(now, 1));
  }) || [];

  // Determine Active Shifts (Working Now)
  const activeShifts = relevantSchedules.filter(s => {
    if (!s.startTime || !s.endTime) {
      // Fallback to shift definition
      const shift = shifts?.find(sh => sh.id === s.shiftId);
      if (!shift?.startTime || !shift?.endTime) return false;
      s.startTime = shift.startTime;
      s.endTime = shift.endTime;
    }

    const sDate = s.date instanceof Date ? s.date : s.date.toDate();
    const isToday = isSameDay(sDate, now);

    // Create Date objects for start and end relative to the schedule's date
    // Note: We parse against 'now' just to get HH:mm, then set the date components manually
    // Actually simpler: Parse against sDate (which is the schedule day)
    let start = parse(s.startTime, 'HH:mm', sDate);
    let end = parse(s.endTime, 'HH:mm', sDate);

    // Handle overnight (if end < start, it means it ends the next day)
    if (end < start) {
      end = addDays(end, 1);
    }

    return isWithinInterval(now, { start, end });
  });

  const todaySchedules = schedules?.filter(s => {
    const sDate = s.date instanceof Date ? s.date : s.date.toDate();
    return isSameDay(sDate, now) && s.status === 'approved';
  }) || [];

  const upcomingShifts = todaySchedules.filter(s => {
    // If it's already active, it's not "upcoming" for this list (or maybe we want to show it? Usually upcoming means future start)
    // Let's stick to "Starts later today"
    if (!s.startTime) {
      const shift = shifts?.find(sh => sh.id === s.shiftId);
      if (!shift?.startTime) return false;
      s.startTime = shift.startTime;
    }

    const start = parse(s.startTime, 'HH:mm', now);
    return start > now;
  });

  // Sort upcoming by time
  upcomingShifts.sort((a, b) => {
    if (!a.startTime || !b.startTime) return 0;
    return a.startTime.localeCompare(b.startTime);
  });

  // --- Chart Data Calculations ---
  // 1. Weekly Shift Status Distribution
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
  const weeklyStatusData = last7Days.map(date => {
    const daySchedules = schedules?.filter(s => isSameDay(s.date instanceof Date ? s.date : s.date.toDate(), date)) || [];
    return {
      name: format(date, 'dd/MM'),
      'Đã duyệt': daySchedules.filter(s => s.status === 'approved').length,
      'Chờ duyệt': daySchedules.filter(s => s.status === 'pending').length,
      'Từ chối': daySchedules.filter(s => s.status === 'rejected').length,
    };
  });

  // 2. Labor Hours Trend
  const laborHoursData = last7Days.map(date => {
    const daySchedules = schedules?.filter(s =>
      isSameDay(s.date instanceof Date ? s.date : s.date.toDate(), date) && s.status === 'approved'
    ) || [];

    let totalMinutes = 0;
    daySchedules.forEach(s => {
      let startStr = s.startTime;
      let endStr = s.endTime;

      if (!startStr || !endStr) {
        const shift = shifts?.find(sh => sh.id === s.shiftId);
        startStr = shift?.startTime;
        endStr = shift?.endTime;
      }

      if (startStr && endStr) {
        const start = parse(startStr, 'HH:mm', today);
        let end = parse(endStr, 'HH:mm', today);
        if (end < start) end = addDays(end, 1);
        totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
      }
    });

    return {
      name: format(date, 'eee', { locale: vi }),
      hours: Math.round(totalMinutes / 60 * 10) / 10,
    };
  });

  const stats = [
    {
      title: 'Nhân viên',
      value: employees?.length || 0,
      icon: Users,
      color: 'bg-blue-500',
      desc: 'Tổng số nhân viên',
    },
    {
      title: 'Chờ duyệt',
      value: pendingSchedules.length,
      icon: AlertCircle,
      color: 'bg-yellow-500',
      desc: 'Yêu cầu cần xử lý',
      urgent: pendingSchedules.length > 0
    },
    {
      title: 'Ca hôm nay',
      value: todaySchedules.length,
      icon: Calendar,
      color: 'bg-green-500',
      desc: 'Tổng ca làm việc',
    },
    {
      title: 'Đang làm việc',
      value: activeShifts.length,
      icon: Briefcase,
      color: 'bg-purple-500',
      desc: 'Nhân viên online',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Xin chào, {user?.displayName} 👋</h1>
        <p className="text-gray-600 dark:text-gray-400">Đây là tổng quan cửa hàng của bạn hôm nay</p>
      </div>

      {/* --- 1. Today's Live Status (Hero) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Shifts Column */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

          <div className="flex items-center justify-between mb-6 relative z-10">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Đang làm việc ({activeShifts.length})
            </h2>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
              {format(now, 'EEEE, dd/MM', { locale: vi })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
            {activeShifts.length === 0 ? (
              <div className="col-span-full py-8 text-center bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-blue-100">Hiện không có nhân viên nào trong ca</p>
              </div>
            ) : (
              activeShifts.map(s => {
                const employee = employees?.find(e => e.id === s.employeeId);
                const shift = shifts?.find(sh => sh.id === s.shiftId);
                return (
                  <div key={s.id} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 flex items-center gap-3 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                      {employee?.displayName?.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold truncate">{employee?.displayName}</p>
                      <p className="text-sm text-blue-100 truncate">
                        {shift?.name} ({s.startTime} - {s.endTime})
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Upcoming Column */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-gray-400" />
            Sắp tới hôm nay
          </h3>

          <div className="space-y-4">
            {upcomingShifts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Không còn ca nào hôm nay</p>
            ) : (
              upcomingShifts.slice(0, 3).map(s => {
                const employee = employees?.find(e => e.id === s.employeeId);
                const shift = shifts?.find(sh => sh.id === s.shiftId);
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{employee?.displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {shift?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg">
                        {s.startTime}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            {upcomingShifts.length > 3 && (
              <p className="text-xs text-center text-gray-500 mt-2">+{upcomingShifts.length - 3} ca khác</p>
            )}
          </div>
        </div>
      </div>

      {/* --- 2. Professional Statistics Charts --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Status Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Trạng thái ca làm việc (7 ngày qua)</h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> <span className="text-gray-500">Đã duyệt</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> <span className="text-gray-500">Chờ duyệt</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> <span className="text-gray-500">Từ chối</span></div>
            </div>
          </div>
          <div className="h-[300px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyStatusData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                <Tooltip
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="Đã duyệt" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Chờ duyệt" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Từ chối" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Labor Hours Area Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Tổng giờ làm việc trong tuần</h3>
          <div className="h-[300px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={laborHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorHours)"
                  name="Tổng giờ"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- 3. Classic Stats Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border transition-all hover:shadow-md ${stat.urgent ? 'border-yellow-300 dark:border-yellow-700 ring-2 ring-yellow-100 dark:ring-yellow-900/20' : 'border-gray-100 dark:border-gray-700'}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-xl shadow-lg shadow-gray-200 dark:shadow-none text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
              {stat.urgent && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                </span>
              )}
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</p>
              <p className="font-medium text-gray-700 dark:text-gray-300">{stat.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- 3. Quick Actions --- */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Truy cập nhanh</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/manager/schedule" className="group p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Lịch làm việc</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Xem và sắp xếp ca</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-gray-300 group-hover:text-blue-500" />
            </Link>

            <Link href="/manager/approvals" className="group p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-yellow-200 dark:hover:border-yellow-800 transition-all flex items-center gap-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-xl group-hover:scale-110 transition-transform">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">Duyệt yêu cầu</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{pendingSchedules.length} yêu cầu chờ</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-gray-300 group-hover:text-yellow-500" />
            </Link>

            <Link href="/manager/employees" className="group p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-green-200 dark:hover:border-green-800 transition-all flex items-center gap-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Nhân viên</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý hồ sơ</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-gray-300 group-hover:text-green-500" />
            </Link>

            <Link href="/manager/payroll" className="group p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 transition-all flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Báo cáo lương</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Xem thống kê</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-gray-300 group-hover:text-purple-500" />
            </Link>
          </div>
        </div>

        {/* --- 4. Pending Requests (Compact) --- */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Cần duyệt gấp</h2>
              {pendingSchedules.length > 0 && (
                <Link href="/manager/approvals" className="text-sm text-blue-600 hover:underline">Xem tất cả</Link>
              )}
            </div>

            {pendingSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <CheckCircle className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Mọi thứ đã được xử lý xong!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSchedules.slice(0, 5).map(s => {
                  const employee = employees?.find(e => e.id === s.employeeId);
                  const shift = shifts?.find(sh => sh.id === s.shiftId);
                  return (
                    <div key={s.id} className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-bold text-orange-700 dark:text-orange-400">
                          {employee?.displayName?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{employee?.displayName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {format(s.date instanceof Date ? s.date : s.date.toDate(), 'dd/MM')} • {shift?.name}
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/manager/approvals"
                        className="block w-full text-center py-1.5 bg-white dark:bg-gray-800 text-xs font-semibold text-orange-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-orange-100 dark:border-orange-900/30"
                      >
                        Xử lý ngay
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}