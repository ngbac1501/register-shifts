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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={handleCloseModal}>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all scale-100 animate-slideUp" onClick={(e) => e.stopPropagation()}>

                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                        <Clock className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">
                                            {editingShift ? 'Cập nhật ca làm việc' : 'Thêm ca làm việc mới'}
                                        </h2>
                                        <p className="text-blue-100 text-sm mt-0.5">
                                            {editingShift ? 'Chỉnh sửa thông tin thời gian và loại ca' : 'Thiết lập khung giờ làm việc mới cho hệ thống'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-240px)]">

                                {/* Shift Info Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                        Thông tin chung
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Tên ca làm việc <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white placeholder-gray-400"
                                                placeholder="Ví dụ: Ca sáng, Ca chiều..."
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Loại ca <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    required
                                                    value={formData.type}
                                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white appearance-none"
                                                >
                                                    <option value="fulltime">Full-time (8 tiếng)</option>
                                                    <option value="parttime">Part-time (&lt; 8 tiếng)</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 dark:border-gray-700"></div>

                                {/* Time Info Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                                        Thời gian
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Giờ bắt đầu <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                required
                                                value={formData.startTime}
                                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Giờ kết thúc <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="time"
                                                required
                                                value={formData.endTime}
                                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {formData.startTime && formData.endTime && (
                                        <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-blue-600 dark:text-blue-300 font-medium uppercase tracking-wide">Thời lượng làm việc</p>
                                                <p className="text-lg font-bold text-blue-700 dark:text-blue-200">
                                                    {calculateDuration(formData.startTime, formData.endTime)} tiếng
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-6 py-3 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-all"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-blue-500/30 font-semibold transition-all transform hover:-translate-y-0.5"
                                >
                                    {editingShift ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
