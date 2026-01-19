'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCollection } from '@/hooks/use-firestore';
import { Schedule, Shift } from '@/types';
import { where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Trash2, AlertTriangle, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getStatusColor, getStatusLabel, formatDate } from '@/lib/utils';

export default function EmployeeRequestsPage() {
    const { user } = useAuth();
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const { data: schedules } = useCollection<Schedule>('schedules', [
        where('employeeId', '==', user?.id || ''),
    ]);

    const { data: shifts } = useCollection<Shift>('shifts', [
        where('isActive', '==', true),
    ]);

    const getShiftInfo = (shiftId: string) => {
        const shift = shifts?.find(s => s.id === shiftId);
        return shift ? {
            name: shift.name,
            time: `${shift.startTime} - ${shift.endTime}`,
        } : { name: 'Unknown', time: '' };
    };

    const filteredSchedules = schedules?.filter(s => {
        if (filterStatus === 'all') return true;
        return s.status === filterStatus;
    }).sort((a, b) => {
        // Sort by date desc (newest first)
        const dateA = a.date instanceof Date ? a.date : a.date.toDate();
        const dateB = b.date instanceof Date ? b.date : b.date.toDate();
        return dateB.getTime() - dateA.getTime();
    }) || [];

    const handleDeleteClick = (schedule: Schedule) => {
        setDeletingSchedule(schedule);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingSchedule) return;
        try {
            await deleteDoc(doc(db, 'schedules', deletingSchedule.id));
            setIsDeleteModalOpen(false);
            setDeletingSchedule(null);
        } catch (error) {
            console.error('Error deleting request:', error);
            alert('Có lỗi xảy ra khi xóa yêu cầu');
        }
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Ca đã đăng ký</h1>
                <p className="text-gray-600">Quản lý và theo dõi trạng thái các ca làm việc đã đăng ký</p>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                >
                    Tất cả
                </button>
                <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${filterStatus === 'pending'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                >
                    <Clock className="w-4 h-4" /> Chờ duyệt
                </button>
                <button
                    onClick={() => setFilterStatus('approved')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${filterStatus === 'approved'
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                >
                    <CheckCircle className="w-4 h-4" /> Đã duyệt
                </button>
                <button
                    onClick={() => setFilterStatus('rejected')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${filterStatus === 'rejected'
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                >
                    <XCircle className="w-4 h-4" /> Từ chối
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Ngày làm việc</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Ca làm việc</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Trạng thái</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredSchedules.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-gray-500">
                                        Không tìm thấy ca làm việc nào
                                    </td>
                                </tr>
                            ) : (
                                filteredSchedules.map((schedule) => {
                                    const shift = getShiftInfo(schedule.shiftId);
                                    const date = schedule.date instanceof Date ? schedule.date : schedule.date.toDate();
                                    const isPending = schedule.status === 'pending';
                                    const isRejected = schedule.status === 'rejected';

                                    return (
                                        <tr key={schedule.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-6 text-sm text-gray-900">
                                                <div className="font-medium">{format(date, 'dd/MM/yyyy')}</div>
                                                <div className="text-gray-500 text-xs">{format(date, 'EEEE', { locale: vi })}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="font-medium text-gray-900">{shift.name}</div>
                                                <div className="text-sm text-gray-500">{shift.time}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(schedule.status)} bg-opacity-10`}>
                                                    {getStatusLabel(schedule.status)}
                                                </span>
                                                {isRejected && (
                                                    <div className="text-xs text-red-500 mt-1">Đã bị từ chối</div>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                {isPending && (
                                                    <button
                                                        onClick={() => handleDeleteClick(schedule)}
                                                        className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ml-auto"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Hủy đăng ký
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && deletingSchedule && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Xác nhận hủy đăng ký</h2>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Bạn có chắc chắn muốn hủy đăng ký ca <span className="font-semibold">{getShiftInfo(deletingSchedule.shiftId).name}</span> vào ngày <span className="font-semibold">{formatDate(deletingSchedule.date, 'dd/MM/yyyy')}</span>?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setDeletingSchedule(null);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Không
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Hủy đăng ký
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
