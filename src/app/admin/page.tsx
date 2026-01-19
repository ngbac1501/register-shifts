'use client';

import { useMemo } from 'react';
import { useCollection } from '@/hooks/use-firestore';
import { Store, User, Schedule, Shift } from '@/types';
import { Store as StoreIcon, Users, Calendar, ArrowRight, UserCog, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { calculateMonthlyPayroll } from '@/lib/payroll-calculator';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboard() {
  const { data: stores } = useCollection<Store>('stores');
  const { data: allUsers } = useCollection<User>('users');
  const { data: allSchedules } = useCollection<Schedule>('schedules');
  const { data: shifts } = useCollection<Shift>('shifts');

  const employees = allUsers?.filter(u => u.role === 'employee') || [];
  const managers = allUsers?.filter(u => u.role === 'manager') || [];

  // Calculate total payroll for current month across all stores
  const totalSalary = useMemo(() => {
    if (!employees || !allSchedules || !shifts) return 0;

    const currentMonth = new Date();
    const payrollData = calculateMonthlyPayroll(employees, allSchedules, shifts, currentMonth);

    return payrollData.totalSalary;
  }, [employees, allSchedules, shifts]);

  const stats = [
    {
      title: 'Tổng cửa hàng',
      value: stores?.length || 0,
      icon: StoreIcon,
      color: 'blue',
      bg: 'bg-blue-500',
      bgLight: 'bg-blue-50',
    },
    {
      title: 'Tổng nhân viên',
      value: employees.length,
      icon: Users,
      color: 'green',
      bg: 'bg-green-500',
      bgLight: 'bg-green-50',
    },
    {
      title: 'Quản lý',
      value: managers.length,
      icon: UserCog,
      color: 'purple',
      bg: 'bg-purple-500',
      bgLight: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard Admin</h1>
        <p className="text-gray-600 dark:text-gray-400">Tổng quan hệ thống Epatta Coffee & Tea</p>
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
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgLight} dark:bg-opacity-10`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
            </div>
          </div>
        ))}

        {/* Total Payroll Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
              Tháng này
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Tổng chi lương</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{formatCurrency(totalSalary)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tất cả cửa hàng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Stores List */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <StoreIcon className="w-5 h-5 text-blue-500" />
              Cửa hàng gần đây
            </h2>
            <Link href="/admin/stores" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 group">
              Xem tất cả <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tên cửa hàng</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Địa chỉ</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {stores?.slice(0, 5).map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{store.name}</td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-300 text-sm">{store.address}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${store.isActive
                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50'
                        : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                        }`}>
                        {store.isActive ? 'Hoạt động' : 'Tạm dừng'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thao tác nhanh</h2>

          <Link
            href="/admin/stores"
            className="block group bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <StoreIcon className="w-6 h-6 text-white" />
              </div>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-1">Quản lý cửa hàng</h3>
            <p className="text-blue-100 text-sm">Thêm mới hoặc chỉnh sửa thông tin cửa hàng</p>
          </Link>

          <Link
            href="/admin/users"
            className="block group bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 transition-all transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-1">Quản lý người dùng</h3>
            <p className="text-green-100 text-sm">Cấp tài khoản cho quản lý và nhân viên</p>
          </Link>

          <Link
            href="/admin/shifts"
            className="block group bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-1">Cấu hình ca làm</h3>
            <p className="text-orange-100 text-sm">Thiết lập các ca làm việc mặc định</p>
          </Link>
        </div>
      </div>
    </div>
  );
}