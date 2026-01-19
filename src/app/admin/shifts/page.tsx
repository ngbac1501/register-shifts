'use client';

import { useState } from 'react';
import { useCollection } from '@/hooks/use-firestore';
import { Shift } from '@/types';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Clock, Plus, Edit, Trash2, Search } from 'lucide-react';
import { calculateDuration, getShiftTypeLabel } from '@/lib/utils';

export default function AdminShiftsPage() {
    const { data: shifts, loading } = useCollection<Shift>('shifts');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        startTime: '',
        endTime: '',
        type: 'fulltime' as 'fulltime' | 'parttime',
    });

    const filteredShifts = shifts?.filter(shift =>
        shift.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleOpenModal = (shift?: Shift) => {
        if (shift) {
            setEditingShift(shift);
            setFormData({
                name: shift.name,
                startTime: shift.startTime,
                endTime: shift.endTime,
                type: shift.type,
            });
        } else {
            setEditingShift(null);
            setFormData({
                name: '',
                startTime: '',
                endTime: '',
                type: 'fulltime',
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingShift(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const duration = calculateDuration(formData.startTime, formData.endTime);

        try {
            const shiftData = {
                ...formData,
                duration,
                isActive: true,
            };

            if (editingShift) {
                await updateDoc(doc(db, 'shifts', editingShift.id), shiftData);
            } else {
                await addDoc(collection(db, 'shifts'), shiftData);
            }
            handleCloseModal();
        } catch (error) {
            console.error('Error saving shift:', error);
            alert('Có lỗi xảy ra khi lưu ca làm việc');
        }
    };

    const handleToggleActive = async (shift: Shift) => {
        try {
            await updateDoc(doc(db, 'shifts', shift.id), {
                isActive: !shift.isActive,
            });
        } catch (error) {
            console.error('Error toggling shift status:', error);
        }
    };

    const handleDelete = async (shiftId: string) => {
        if (!confirm('Bạn có chắc muốn xóa ca làm việc này?')) return;
        try {
            await deleteDoc(doc(db, 'shifts', shiftId));
        } catch (error) {
            console.error('Error deleting shift:', error);
            alert('Có lỗi xảy ra khi xóa ca làm việc');
        }
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Cấu hình ca làm việc</h1>
                <p className="text-gray-600">Thiết lập các ca làm việc trong hệ thống</p>
            </div>

            {/* Search and Add */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm ca làm việc..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Thêm ca làm việc
                </button>
            </div>

            {/* Shifts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full p-8 text-center text-gray-500">Đang tải...</div>
                ) : filteredShifts.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-gray-500">
                        {searchTerm ? 'Không tìm thấy ca làm việc nào' : 'Chưa có ca làm việc nào'}
                    </div>
                ) : (
                    filteredShifts.map((shift) => (
                        <div
                            key={shift.id}
                            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-lg ${shift.type === 'fulltime' ? 'bg-blue-100' : 'bg-purple-100'
                                        }`}>
                                        <Clock className={`w-6 h-6 ${shift.type === 'fulltime' ? 'text-blue-600' : 'text-purple-600'
                                            }`} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{shift.name}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full ${shift.type === 'fulltime'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-purple-100 text-purple-800'
                                            }`}>
                                            {getShiftTypeLabel(shift.type)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggleActive(shift)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${shift.isActive
                                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                        }`}
                                >
                                    {shift.isActive ? 'Hoạt động' : 'Tạm dừng'}
                                </button>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Giờ bắt đầu:</span>
                                    <span className="font-medium text-gray-900">{shift.startTime}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Giờ kết thúc:</span>
                                    <span className="font-medium text-gray-900">{shift.endTime}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Thời lượng:</span>
                                    <span className="font-medium text-gray-900">{shift.duration} giờ</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => handleOpenModal(shift)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Edit className="w-4 h-4" />
                                    Sửa
                                </button>
                                <button
                                    onClick={() => handleDelete(shift.id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Xóa
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            {editingShift ? 'Sửa ca làm việc' : 'Thêm ca làm việc mới'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tên ca <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Ca sáng"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Loại ca <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="fulltime">Full-time (8 tiếng)</option>
                                    <option value="parttime">Part-time (&lt; 8 tiếng)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Giờ bắt đầu <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Giờ kết thúc <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {formData.startTime && formData.endTime && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-sm text-blue-800">
                                        <span className="font-medium">Thời lượng:</span>{' '}
                                        {calculateDuration(formData.startTime, formData.endTime)} giờ
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    {editingShift ? 'Cập nhật' : 'Thêm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
