'use client';

import { useState } from 'react';
import { useCollection } from '@/hooks/use-firestore';
import { Store, User } from '@/types';
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Store as StoreIcon, Plus, Edit, Trash2, Search } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AdminStoresPage() {
    const { data: stores, loading } = useCollection<Store>('stores');
    const { data: users } = useCollection<User>('users');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        managerId: '',
    });

    const managers = users?.filter(u => u.role === 'manager') || [];

    const filteredStores = stores?.filter(store =>
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.address.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleOpenModal = (store?: Store) => {
        if (store) {
            setEditingStore(store);
            setFormData({
                name: store.name,
                address: store.address,
                managerId: store.managerId,
            });
        } else {
            setEditingStore(null);
            setFormData({ name: '', address: '', managerId: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingStore(null);
        setFormData({ name: '', address: '', managerId: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingStore) {
                await updateDoc(doc(db, 'stores', editingStore.id), {
                    ...formData,
                });
            } else {
                await addDoc(collection(db, 'stores'), {
                    ...formData,
                    isActive: true,
                    createdAt: Timestamp.now(),
                });
            }
            handleCloseModal();
        } catch (error) {
            console.error('Error saving store:', error);
            alert('Có lỗi xảy ra khi lưu cửa hàng');
        }
    };

    const handleToggleActive = async (store: Store) => {
        try {
            await updateDoc(doc(db, 'stores', store.id), {
                isActive: !store.isActive,
            });
        } catch (error) {
            console.error('Error toggling store status:', error);
        }
    };

    const handleDelete = async (storeId: string) => {
        if (!confirm('Bạn có chắc muốn xóa cửa hàng này?')) return;
        try {
            await deleteDoc(doc(db, 'stores', storeId));
        } catch (error) {
            console.error('Error deleting store:', error);
            alert('Có lỗi xảy ra khi xóa cửa hàng');
        }
    };

    const getManagerName = (managerId: string) => {
        const manager = managers.find(m => m.id === managerId);
        return manager?.displayName || 'Chưa gán';
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý cửa hàng</h1>
                <p className="text-gray-600">Thêm, sửa, xóa cửa hàng trong hệ thống</p>
            </div>

            {/* Search and Add */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm cửa hàng..."
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
                    Thêm cửa hàng
                </button>
            </div>

            {/* Stores Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Đang tải...</div>
                ) : filteredStores.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        {searchTerm ? 'Không tìm thấy cửa hàng nào' : 'Chưa có cửa hàng nào'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Tên cửa hàng</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Địa chỉ</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Quản lý</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Trạng thái</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Ngày tạo</th>
                                    <th className="text-right py-3 px-4 text-gray-600 font-medium">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStores.map((store) => (
                                    <tr key={store.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium">{store.name}</td>
                                        <td className="py-3 px-4 text-gray-600">{store.address}</td>
                                        <td className="py-3 px-4 text-gray-600">{getManagerName(store.managerId)}</td>
                                        <td className="py-3 px-4">
                                            <button
                                                onClick={() => handleToggleActive(store)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${store.isActive
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {store.isActive ? 'Hoạt động' : 'Tạm dừng'}
                                            </button>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{formatDate(store.createdAt)}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(store)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Sửa"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(store.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={handleCloseModal}>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all scale-100 animate-slideUp" onClick={(e) => e.stopPropagation()}>
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                        <StoreIcon className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">
                                            {editingStore ? 'Chỉnh sửa cửa hàng' : 'Thêm cửa hàng mới'}
                                        </h2>
                                        <p className="text-blue-100 text-sm mt-0.5">
                                            {editingStore ? 'Cập nhật thông tin cửa hàng' : 'Tạo cửa hàng mới trong hệ thống'}
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
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Tên cửa hàng <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white placeholder-gray-400"
                                        placeholder="Epatta Coffee Quận 1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Địa chỉ <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white placeholder-gray-400"
                                        placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Quản lý <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={formData.managerId}
                                        onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white"
                                    >
                                        <option value="">-- Chọn quản lý --</option>
                                        {managers.map((manager) => (
                                            <option key={manager.id} value={manager.id}>
                                                {manager.displayName} ({manager.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 px-6 py-3 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-all"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 font-semibold transition-all transform hover:-translate-y-0.5"
                                    >
                                        {editingStore ? 'Cập nhật' : 'Thêm mới'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
