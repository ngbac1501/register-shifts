'use client';

import { useMemo, useState } from 'react';
import { useCollection } from '@/hooks/use-firestore';
import { Store, User, Schedule, Shift, Leave } from '@/types';
import { Store as StoreIcon, Users, Calendar, ArrowRight, DollarSign, TrendingUp, TrendingDown, Clock, Activity, FileText, Award } from 'lucide-react';
import Link from 'next/link';
import { calculateMonthlyPayroll, compareWithPreviousMonth } from '@/lib/payroll-calculator';
import { formatCurrency } from '@/lib/utils';
import { subMonths, format, isSameMonth, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { useStore } from '@/contexts/StoreContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const { selectedStoreId } = useStore();

  // Data Fetching with Store filtering (if applicable for global context, though dashboard often shows overview)
  // Logic: If selectedStoreId is 'all', show all data. If specific, filter by it.
  const storeQuery = selectedStoreId ? [
    // We can filter collections here, but since 'users' and 'schedules' need specific field queries,
    // and useCollection API is simple, we might filter client-side for complex join-like needs 
    // or just fetch all and filter in useMemo for best performance on small-medium datasets.
    // Given the dashboard aggregates EVERYTHING, usually fetching all is safer for "Total" cards unless optimized deeply.
    // However, let's respect the "Context" if the user switched store in Sidebar.
    // actually, typically Admin Dashboard "Overview" might be global, but if there is a store context, it should probably reflect that.
    // Let's filter client-side to be safe and responsive.
  ] : [];

  const { data: stores } = useCollection<Store>('stores');
  const { data: allUsers } = useCollection<User>('users');
  const { data: allSchedules } = useCollection<Schedule>('schedules');
  const { data: shifts } = useCollection<Shift>('shifts');
  const { data: leaves } = useCollection<Leave>('leaves');

  // Filter consistency
  // If a store is selected, filter the data. If not, use all.
  const currentStores = useMemo(() =>
    selectedStoreId ? stores?.filter(s => s.id === selectedStoreId) : stores
    , [stores, selectedStoreId]);

  const currentUsers = useMemo(() =>
    selectedStoreId ? allUsers?.filter(u => u.storeId === selectedStoreId) : allUsers
    , [allUsers, selectedStoreId]);

  const currentSchedules = useMemo(() =>
    selectedStoreId ? allSchedules?.filter(s => s.storeId === selectedStoreId) : allSchedules
    , [allSchedules, selectedStoreId]);

  const employees = currentUsers?.filter(u => u.role === 'employee') || [];
  const managers = currentUsers?.filter(u => u.role === 'manager') || [];
  const fulltimeCount = employees.filter(e => e.employeeType === 'fulltime' || !e.employeeType).length;
  const parttimeCount = employees.filter(e => e.employeeType === 'parttime').length;

  // --- Calculations ---

  // 1. Employee Distribution by Store (Pie Chart) -> Only relevant if All Stores selected
  const storeDistribution = useMemo(() => {
    if (!stores || !allUsers || selectedStoreId) return []; // Don't show if single store

    return stores.map(store => ({
      name: store.name,
      value: allUsers.filter(u => u.storeId === store.id && u.role === 'employee').length
    })).filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [stores, allUsers, selectedStoreId]);

  // 2. Payroll Trend (Last 6 Months) (Area Chart)
  const payrollTrend = useMemo(() => {
    if (!employees || !currentSchedules || !shifts) return [];

    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const payroll = calculateMonthlyPayroll(employees, currentSchedules, shifts, date);
      data.push({
        month: format(date, 'MM/yyyy'),
        amount: payroll.totalSalary,
        rawDate: date
      });
    }
    return data;
  }, [employees, currentSchedules, shifts]);

  // 3. Current Month Stats vs Last Month
  const payrollComparison = useMemo(() => {
    if (!employees || !currentSchedules || !shifts) return { current: 0, percent: 0, trend: 'neutral' };

    const currentMonth = new Date();
    const prevMonth = subMonths(currentMonth, 1);

    const curr = calculateMonthlyPayroll(employees, currentSchedules, shifts, currentMonth);
    const prev = calculateMonthlyPayroll(employees, currentSchedules, shifts, prevMonth);

    const comparison = compareWithPreviousMonth(curr, prev);

    return {
      current: curr.totalSalary,
      percent: Math.abs(comparison.salaryChangePercent).toFixed(1),
      trend: comparison.salaryChange >= 0 ? 'increase' : 'decrease'
    };
  }, [employees, currentSchedules, shifts]);

  // 4. Shift Status (Bar Chart) - This Week
  const shiftStats = useMemo(() => {
    if (!currentSchedules) return [];

    // Group by status
    const stats = {
      completed: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    const now = new Date();
    // Filter for current month approx or all time? Let's do current month to be relevant
    currentSchedules.forEach(s => {
      // Simple filter: statuses breakdown for ALL time or Current Month?
      // Let's do Current Month for relevance
      if (isSameMonth(s.date instanceof Date ? s.date : s.date.toDate(), now)) {
        const status = s.status || 'pending';
        if (stats[status as keyof typeof stats] !== undefined) {
          stats[status as keyof typeof stats]++;
        }
      }
    });

    return [
      { name: 'Hoàn thành', value: stats.completed, color: '#10b981' },
      { name: 'Đã duyệt', value: stats.approved, color: '#3b82f6' },
      { name: 'Chờ duyệt', value: stats.pending, color: '#f59e0b' },
      { name: 'Từ chối', value: stats.rejected, color: '#ef4444' },
    ];
  }, [currentSchedules]);

  // 5. Recent Activity (Leaves & Schedules combined?) -> Just Leaves for now
  const recentActivities = useMemo(() => {
    if (!leaves || !allUsers) return [];

    // Filter leaves if a store is selected
    const filteredLeaves = selectedStoreId ? leaves.filter(l => l.storeId === selectedStoreId) : leaves;

    // Map leaves to activity
    const activities = filteredLeaves.map(leave => {
      const user = allUsers.find(u => u.id === leave.employeeId);
      return {
        id: leave.id,
        type: 'leave',
        user: user?.displayName || 'Không rõ',
        avatar: user?.photoURL,
        action: `xin nghỉ ${leave.totalDays} ngày`,
        time: leave.createdAt instanceof Date ? leave.createdAt : leave.createdAt.toDate(),
        status: leave.status
      };
    });

    // Sort by time desc
    return activities.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5);
  }, [leaves, allUsers, selectedStoreId]);

  // 6. Leave Stats (Pie Chart) - From Analytics
  const leaveStats = useMemo(() => {
    if (!leaves) return [];
    // Filter by store if selected
    const filtered = selectedStoreId ? leaves.filter(l => l.storeId === selectedStoreId) : leaves;

    const stats = [
      { name: 'Phép năm', value: filtered.filter(l => l.type === 'annual').length },
      { name: 'Nghỉ ốm', value: filtered.filter(l => l.type === 'sick').length },
      { name: 'Việc riêng', value: filtered.filter(l => l.type === 'personal').length },
      { name: 'Không lương', value: filtered.filter(l => l.type === 'unpaid').length },
    ].filter(item => item.value > 0);

    return stats.length > 0 ? stats : [{ name: 'Không có dữ liệu', value: 1 }];
  }, [leaves, selectedStoreId]);

  // 7. Employee Performance (Top 5 by hours) - From Analytics
  const employeePerformanceData = useMemo(() => {
    if (!currentSchedules || !shifts || !currentUsers) return [];

    // Helper Maps
    const shiftMap = new Map(shifts.map(s => [s.id, s]));

    // Aggregate Hours
    const stats = new Map<string, { name: string, hours: number, tasks: number }>();

    currentSchedules.forEach(schedule => {
      if (schedule.status !== 'completed' && schedule.status !== 'approved') return;

      const empId = schedule.employeeId;
      const employee = currentUsers.find(u => u.id === empId); // Using array find is okay for small sets, map is faster but this works
      if (!employee) return;

      const shift = shiftMap.get(schedule.shiftId);

      if (!stats.has(empId)) {
        stats.set(empId, { name: employee.displayName, hours: 0, tasks: 0 });
      }
      const entry = stats.get(empId)!;
      entry.hours += (shift?.duration || 0);
      entry.tasks += 1;
    });

    return Array.from(stats.values())
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);
  }, [currentSchedules, shifts, currentUsers]);


  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard & Báo cáo</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Tổng quan hệ thống {selectedStoreId ? '- ' + stores?.find(s => s.id === selectedStoreId)?.name : 'toàn chuỗi'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <Calendar className="w-4 h-4" />
          {format(new Date(), 'dd/MM/yyyy', { locale: vi })}
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Payroll Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-white/20 backdrop-blur-sm`}>
              {payrollComparison.trend === 'increase' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {payrollComparison.percent}%
            </div>
          </div>
          <p className="text-blue-100 text-sm font-medium mb-1">Tổng chi lương (T{new Date().getMonth() + 1})</p>
          <h3 className="text-3xl font-bold">{formatCurrency(payrollComparison.current)}</h3>
        </div>

        {/* Employees Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs text-gray-400">{fulltimeCount} FT / {parttimeCount} PT</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Tổng nhân viên</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{employees.length}</h3>
        </div>

        {/* Stores Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <StoreIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
              Active
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Cửa hàng hoạt động</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
            {currentStores?.filter(s => s.isActive).length}/{currentStores?.length}
          </h3>
        </div>

        {/* Shifts Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Ca làm tháng này</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
            {currentSchedules?.filter(s => isSameMonth(s.date instanceof Date ? s.date : s.date.toDate(), new Date())).length}
          </h3>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Payroll Trend (Large) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-500" />
            Xu hướng chi phí lương
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={payrollTrend}>
                <defs>
                  <linearGradient id="colorSalary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', borderColor: '#E5E7EB' }}
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Chi phí']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Chi phí"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSalary)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leave Stats (Side) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-500" />
            Thống kê nghỉ phép
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leaveStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Không có dữ liệu' ? '#E5E7EB' : COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [value, name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Shift Status & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shift Status */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            Trạng thái ca (Tháng này)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shiftStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [value, 'Số ca']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {shiftStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Nhân viên năng suất (Top 5)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeePerformanceData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }}
                  width={100}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${value} giờ`, 'Tổng giờ']}
                />
                <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={20} fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>


      {/* Row 4: Recent Activity & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Store Distribution (Pie) - Only if All Stores selected */}
        {!selectedStoreId && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <StoreIcon className="w-5 h-5 text-purple-500" />
              Phân bổ nhân sự
            </h2>
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={storeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {storeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.length}</p>
                  <p className="text-xs text-gray-500">Nhân viên</p>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {storeDistribution.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity List */}
        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 ${!selectedStoreId ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              Hoạt động gần đây (Nghỉ phép)
            </h2>
            <Link href="/admin/manage/leaves" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Xem tất cả
            </Link>
          </div>
          <div className="space-y-4">
            {recentActivities.length > 0 ? recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-gray-100 dark:border-gray-700">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                  <img
                    src={activity.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.user || '')}`}
                    alt="user"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {activity.user}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {format(activity.time, 'dd/MM HH:mm', { locale: vi })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {activity.action}
                  </p>
                </div>
                <div>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${activity.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                    activity.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                    {activity.status === 'approved' ? 'Đã duyệt' :
                      activity.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-center text-gray-500 py-8">Chưa có hoạt động nào</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}