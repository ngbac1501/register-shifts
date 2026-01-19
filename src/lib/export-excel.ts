import * as XLSX from 'xlsx';
import { PayrollData, MonthlyPayroll } from './payroll-calculator';
import { formatCurrency } from './utils';

/**
 * Export payroll data to Excel
 */
export function exportPayrollToExcel(payroll: MonthlyPayroll, storeName: string) {
    // Prepare data for Excel
    const data = payroll.employees.map((emp, index) => ({
        'STT': index + 1,
        'Tên nhân viên': emp.employeeName,
        'Loại NV': emp.employeeType === 'fulltime' ? 'Full-time' : 'Part-time',
        'Lương/giờ': emp.hourlyRate,
        'Số ca hoàn thành': emp.completedShifts,
        'Tổng giờ': emp.totalHours,
        'Tổng lương': emp.totalSalary,
    }));

    // Add summary row
    data.push({
        'STT': '' as any,
        'Tên nhân viên': 'TỔNG CỘNG',
        'Loại NV': '' as any,
        'Lương/giờ': '' as any,
        'Số ca hoàn thành': payroll.totalShifts,
        'Tổng giờ': payroll.totalHours,
        'Tổng lương': payroll.totalSalary,
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
        { wch: 5 },  // STT
        { wch: 25 }, // Tên nhân viên
        { wch: 12 }, // Loại NV
        { wch: 12 }, // Lương/giờ
        { wch: 18 }, // Số ca hoàn thành
        { wch: 12 }, // Tổng giờ
        { wch: 15 }, // Tổng lương
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Bảng lương');

    // Generate filename
    const monthYear = `${payroll.month.getMonth() + 1}-${payroll.month.getFullYear()}`;
    const filename = `BangLuong_${storeName}_${monthYear}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
}
