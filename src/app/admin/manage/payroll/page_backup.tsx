'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCollection, useDocument } from '@/hooks/use-firestore';
import { Schedule, Shift, User, Store } from '@/types';
import { where } from 'firebase/firestore';
import { DollarSign, Download, TrendingUp, TrendingDown, Users, Clock, Calendar } from 'lucide-react';
import { formatCurrency, getEmployeeTypeLabel } from '@/lib/utils';
import { calculateMonthlyPayroll, compareWithPreviousMonth } from '@/lib/payroll-calculator';
import { exportPayrollToExcel } from '@/lib/export-excel';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function ManagerPayrollPage() {
    const { user } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    const { data: store } = useDocument<Store>('stores', user?.storeId || '');

    const { data: employees } = useCollection<User>('users', [
        where('storeId', '==', user?.storeId || ''),
        where('role', '==', 'employee'),
    ]);

    const { data: schedules } = useCollection<Schedule>('schedules', [
        where('storeId', '==', user?.storeId || ''),
    ]);

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

    if (!currentPayroll) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Báo cáo lương tháng</h1>
                <p className="text-gray-600">Xem và quản lý lương nhân viên theo tháng</p>
            </div>

            {/* Month Selector */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
                <div className="flex items-center justify-between">
                    <button
                        onClick={handlePreviousMonth}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        ← Tháng trước
                    </button>

                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-gray-900">
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
                            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Tháng sau →
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Tổng chi phí lương</p>
                            <p className="text-2xl font-bold text-gray-900">
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

                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Clock className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Tổng giờ làm</p>
                            <p className="text-2xl font-bold text-purple-600">{currentPayroll.totalHours}h</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Tổng ca hoàn thành</p>
                            <p className="text-2xl font-bold text-blue-600">{currentPayroll.totalShifts}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Users className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Số nhân viên</p>
                            <p className="text-2xl font-bold text-green-600">{currentPayroll.employees.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payroll Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Chi tiết lương nhân viên</h2>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Xuất Excel
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">STT</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Nhân viên</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Loại NV</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Lương/giờ</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Số ca</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Tổng giờ</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Phụ cấp đêm</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Tổng lương</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentPayroll.employees.map((emp, index) => (
                                <tr key={emp.employeeId} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-6 text-gray-600">{index + 1}</td>
                                    <td className="py-4 px-6">
                                        <p className="font-medium text-gray-900">{emp.employeeName}</p>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.employeeType === 'fulltime'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-purple-100 text-purple-800'
                                            }`}>
                                            {getEmployeeTypeLabel(emp.employeeType as any)}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right text-gray-900">
                                        {formatCurrency(emp.hourlyRate)}
                                    </td>
                                    <td className="py-4 px-6 text-right text-gray-900">{emp.completedShifts}</td>
                                    <td className="py-4 px-6 text-right text-gray-900">{emp.totalHours}h</td>
                                    <td className="py-4 px-6 text-right text-purple-600">
                                        {emp.nightShiftAllowance > 0 ? formatCurrency(emp.nightShiftAllowance) : '-'}
                                    </td>
                                    <td className="py-4 px-6 text-right font-bold text-orange-600">
                                        {formatCurrency(emp.totalSalary)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                            <tr>
                                <td colSpan={4} className="py-4 px-6 font-bold text-gray-900">TỔNG CỘNG</td>
                                <td className="py-4 px-6 text-right font-bold text-gray-900">
                                    {currentPayroll.totalShifts}
                                </td>
                                <td className="py-4 px-6 text-right font-bold text-gray-900">
                                    {currentPayroll.totalHours}h
                                </td>
                                <td className="py-4 px-6 text-right font-bold text-purple-600">
                                    {formatCurrency(currentPayroll.totalNightAllowance)}
                                </td>
                                <td className="py-4 px-6 text-right font-bold text-orange-600">
                                    {formatCurrency(currentPayroll.totalSalary)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
