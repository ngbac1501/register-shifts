'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { StoreSelector } from '@/components/admin/StoreSelector';
import { useCollection, useDocument } from '@/hooks/use-firestore';
import { Schedule, Shift, User, Store } from '@/types';
import { where } from 'firebase/firestore';
import { DollarSign, Download, TrendingUp, TrendingDown, Users, Clock, Calendar } from 'lucide-react';
import { formatCurrency, getEmployeeTypeLabel } from '@/lib/utils';
import { calculateMonthlyPayroll, compareWithPreviousMonth } from '@/lib/payroll-calculator';
import { exportPayrollToExcel } from '@/lib/export-excel';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function AdminPayrollPage() {
    const { selectedStoreId } = useStore();
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    const { data: store } = useDocument<Store>('stores', selectedStoreId || '');

    const { data: employees } = useCollection<User>('users',
        selectedStoreId ? [
            where('storeId', '==', selectedStoreId),
            where('role', '==', 'employee'),
        ] : []
    );

    const { data: schedules } = useCollection<Schedule>('schedules',
        selectedStoreId ? [where('storeId', '==', selectedStoreId)] : []
    );

    const { data: shifts } = useCollection<Shift>('shifts');

    // Tính payroll cho tháng hiện tại
    const currentPayroll = useMemo(() => {
        if (!employees || !schedules || !shifts) return null;
        return calculateMonthlyPayroll(employees, schedules, shifts, selectedMonth);
    }, [employees, schedules, shifts, selectedMonth]);

    // Tính payroll cho tháng trước
    const previousPayroll = useMemo(() => {
        if (!employees || !schedules || !shifts) return null;
        const prevMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
        return calculateMonthlyPayroll(employees, schedules, shifts, prevMonth);
    }, [employees, schedules, shifts, selectedMonth]);

    // So sánh với tháng trước
    const comparison = useMemo(() => {
        if (!currentPayroll || !previousPayroll) return null;
        return compareWithPreviousMonth(currentPayroll, previousPayroll);
    }, [currentPayroll, previousPayroll]);

    const handlePreviousMonth = () => {
        setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
    };

    const handleThisMonth = () => {
        setSelectedMonth(new Date());
    };

    const handleExport = () => {
        if (!currentPayroll || !store) return;
        exportPayrollToExcel(currentPayroll, store.name);
    };

    if (!selectedStoreId) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Báo cáo lương</h1>
                    <p className="text-gray-600 dark:text-gray-400">Xem báo cáo lương nhân viên theo tháng</p>
                </div>
                <StoreSelector />
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-8 text-center">
                    <DollarSign className="w-16 h-16 mx-auto mb-4 text-orange-400" />
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Chưa chọn cửa hàng</p>
                    <p className="text-gray-600 dark:text-gray-400">Vui lòng chọn cửa hàng để xem báo cáo lương</p>
                </div>
            </div>
        );
    }

    if (!currentPayroll) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Báo cáo lương tháng</h1>
                    <p className="text-gray-600 dark:text-gray-400">Xem và quản lý lương nhân viên theo tháng</p>
                </div>
                <StoreSelector />
            </div>

            {/* Month Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <button
                        onClick={handlePreviousMonth}
                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                        ← Tháng trước
                    </button>

                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {format(selectedMonth, 'MMMM yyyy', { locale: vi })}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleThisMonth}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Tháng này
                        </button>
                        <button
                            onClick={handleNextMonth}
                            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                        >
                            Tháng sau →
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Tổng chi phí lương</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(currentPayroll.totalSalary)}
                            </p>
                        </div>
                    </div>
                    {comparison && (
                        <div className={`flex items-center gap-1 text-sm ${comparison.salaryChange >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {comparison.salaryChange >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                            ) : (
                                <TrendingDown className="w-4 h-4" />
                            )}
                            <span>{Math.abs(comparison.salaryChangePercent).toFixed(1)}% so với tháng trước</span>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Tổng giờ làm</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{currentPayroll.totalHours}h</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Tổng ca hoàn thành</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentPayroll.totalShifts}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Số nhân viên</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{currentPayroll.employees.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payroll Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Chi tiết lương nhân viên</h2>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Xuất Excel
                    </button>
                </div>

            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">STT</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Nhân viên</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Loại NV</th>
                            <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Lương/giờ</th>
                            <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Số ca</th>
                            <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Tổng giờ</th>
                            <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Phụ cấp đêm</th>
                            <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Tổng lương</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {currentPayroll.employees.map((emp, index) => (
                            <tr key={emp.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700">
                                <td className="py-4 px-6 text-gray-600 dark:text-gray-400">{index + 1}</td>
                                <td className="py-4 px-6">
                                    <p className="font-medium text-gray-900 dark:text-white">{emp.employeeName}</p>
                                </td>
                                <td className="py-4 px-6">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.employeeType === 'fulltime'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                        }`}>
                                        {getEmployeeTypeLabel(emp.employeeType as any)}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-right text-gray-900 dark:text-gray-200">
                                    {formatCurrency(emp.hourlyRate)}
                                </td>
                                <td className="py-4 px-6 text-right text-gray-900 dark:text-gray-200">{emp.completedShifts}</td>
                                <td className="py-4 px-6 text-right text-gray-900 dark:text-gray-200">{emp.totalHours}h</td>
                                <td className="py-4 px-6 text-right text-purple-600 dark:text-purple-400">
                                    {emp.nightShiftAllowance > 0 ? formatCurrency(emp.nightShiftAllowance) : '-'}
                                </td>
                                <td className="py-4 px-6 text-right font-bold text-orange-600 dark:text-orange-400">
                                    {formatCurrency(emp.totalSalary)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-800/80 border-t-2 border-gray-300 dark:border-gray-600">
                        <tr>
                            <td colSpan={4} className="py-4 px-6 font-bold text-gray-900 dark:text-white">TỔNG CỘNG</td>
                            <td className="py-4 px-6 text-right font-bold text-gray-900 dark:text-white">
                                {currentPayroll.totalShifts}
                            </td>
                            <td className="py-4 px-6 text-right font-bold text-gray-900 dark:text-white">
                                {currentPayroll.totalHours}h
                            </td>
                            <td className="py-4 px-6 text-right font-bold text-purple-600 dark:text-purple-400">
                                {formatCurrency(currentPayroll.totalNightAllowance)}
                            </td>
                            <td className="py-4 px-6 text-right font-bold text-orange-600 dark:text-orange-400">
                                {formatCurrency(currentPayroll.totalSalary)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {currentPayroll.employees.map((emp, index) => (
                        <div key={emp.employeeId} className="p-4 bg-white dark:bg-gray-800">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500 text-xs shadow-sm">
                                        #{index + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-base">{emp.employeeName}</h3>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${emp.employeeType === 'fulltime'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                            }`}>
                                            {getEmployeeTypeLabel(emp.employeeType as any)}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 mb-0.5">Tổng lương</p>
                                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                        {formatCurrency(emp.totalSalary)}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-2 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Số ca làm</p>
                                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                        {emp.completedShifts}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Tổng giờ</p>
                                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                                        <Clock className="w-3.5 h-3.5 text-purple-500" />
                                        {emp.totalHours}h
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Lương/giờ</p>
                                    <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                                        {formatCurrency(emp.hourlyRate)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Phụ cấp đêm</p>
                                    <p className={`font-semibold mt-0.5 ${emp.nightShiftAllowance > 0
                                        ? 'text-purple-600 dark:text-purple-400'
                                        : 'text-gray-400'
                                        }`}>
                                        {emp.nightShiftAllowance > 0 ? formatCurrency(emp.nightShiftAllowance) : '-'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mobile Summary Footer */}
                <div className="bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Tổng ca làm</span>
                        <span className="font-bold text-gray-900 dark:text-white">{currentPayroll.totalShifts}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Tổng giờ</span>
                        <span className="font-bold text-gray-900 dark:text-white">{currentPayroll.totalHours}h</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Phụ cấp đêm</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(currentPayroll.totalNightAllowance)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700/50 mt-2">
                        <span className="text-base font-bold text-gray-900 dark:text-white">TỔNG CỘNG</span>
                        <span className="text-xl font-bold text-orange-600 dark:text-orange-500">{formatCurrency(currentPayroll.totalSalary)}</span>
                    </div>
                </div>
            </div>
        </div>

    );
}
