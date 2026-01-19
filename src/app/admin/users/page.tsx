'use client';

import { useState } from 'react';
import { useCollection } from '@/hooks/use-firestore';
import { User, Store } from '@/types';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Users, Plus, Edit, Trash2, Search } from 'lucide-react';
import { formatDate, getRoleLabel, getEmployeeTypeLabel } from '@/lib/utils';

export default function AdminUsersPage() {
    const { data: users, loading } = useCollection<User>('users');
    const { data: stores } = useCollection<Store>('stores');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'manager' | 'employee'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        displayName: '',
        role: 'employee' as 'manager' | 'employee',
        storeId: '',
        phone: '',
        employeeType: 'fulltime' as 'fulltime' | 'parttime',
        hourlyRate: '',
    });

    const filteredUsers = users?.filter(user => {
        if (user.role === 'admin') return false; // Don't show admin users
        const matchesSearch =
            user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    }) || [];

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                email: user.email,
                password: '',
                displayName: user.displayName,
                role: user.role as 'manager' | 'employee',
                storeId: user.storeId || '',
                phone: user.phone || '',
                employeeType: user.employeeType || 'fulltime',
                hourlyRate: user.hourlyRate?.toString() || '',
            });
        } else {
            setEditingUser(null);
            setFormData({
                email: '',
                password: '',
                displayName: '',
                role: 'employee',
                storeId: '',
                phone: '',
                employeeType: 'fulltime',
                hourlyRate: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                // Update existing user
                const updateData: any = {
                    displayName: formData.displayName,
                    role: formData.role,
                    storeId: formData.storeId || null,
                    phone: formData.phone || null,
                };

                if (formData.role === 'employee') {
                    updateData.employeeType = formData.employeeType;
                    updateData.hourlyRate = formData.hourlyRate ? parseFloat(formData.hourlyRate) : null;
                }

                await updateDoc(doc(db, 'users', editingUser.id), updateData);
            } else {
                // Create new user
                if (!formData.password) {
                    alert('Vui lòng nhập mật khẩu');
                    return;
                }

                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    formData.email,
                    formData.password
                );

                const userData: any = {
                    email: formData.email,
                    displayName: formData.displayName,
                    role: formData.role,
                    storeId: formData.storeId || null,
                    phone: formData.phone || null,
                    createdAt: Timestamp.now(),
                };

                if (formData.role === 'employee') {
                    userData.employeeType = formData.employeeType;
                    userData.hourlyRate = formData.hourlyRate ? parseFloat(formData.hourlyRate) : null;
                }

                await setDoc(doc(db, 'users', userCredential.user.uid), userData);
            }
            handleCloseModal();
        } catch (error: any) {
            console.error('Error saving user:', error);
            alert(error.message || 'Có lỗi xảy ra khi lưu người dùng');
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;
        try {
            await deleteDoc(doc(db, 'users', userId));
            // Note: This doesn't delete the Firebase Auth user, only Firestore document
            alert('Đã xóa người dùng khỏi Firestore. Lưu ý: Tài khoản Authentication vẫn tồn tại.');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Có lỗi xảy ra khi xóa người dùng');
        }
    };

    const getStoreName = (storeId?: string) => {
        if (!storeId) return '-';
        const store = stores?.find(s => s.id === storeId);
        return store?.name || 'Không xác định';
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý người dùng</h1>
                <p className="text-gray-600">Thêm, sửa, xóa manager và nhân viên</p>
            </div>

            {/* Filters and Add */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm người dùng..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="all">Tất cả vai trò</option>
                    <option value="manager">Quản lý</option>
                    <option value="employee">Nhân viên</option>
                </select>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Thêm người dùng
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Đang tải...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        {searchTerm || roleFilter !== 'all' ? 'Không tìm thấy người dùng nào' : 'Chưa có người dùng nào'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Tên</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Email</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Vai trò</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Cửa hàng</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Loại</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Lương/giờ</th>
                                    <th className="text-right py-3 px-4 text-gray-600 font-medium">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium">{user.displayName}</td>
                                        <td className="py-3 px-4 text-gray-600">{user.email}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.role === 'manager'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {getRoleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{getStoreName(user.storeId)}</td>
                                        <td className="py-3 px-4 text-gray-600">
                                            {user.employeeType ? getEmployeeTypeLabel(user.employeeType) : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                            {user.hourlyRate ? `${user.hourlyRate.toLocaleString('vi-VN')}đ` : '-'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(user)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Sửa"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 my-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            {editingUser ? 'Sửa người dùng' : 'Thêm người dùng mới'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    disabled={!!editingUser}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                    placeholder="user@epatta.com"
                                />
                            </div>

                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mật khẩu <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Tối thiểu 6 ký tự"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tên hiển thị <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Nguyễn Văn A"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Vai trò <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="manager">Quản lý</option>
                                    <option value="employee">Nhân viên</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cửa hàng <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.storeId}
                                    onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">-- Chọn cửa hàng --</option>
                                    {stores?.map((store) => (
                                        <option key={store.id} value={store.id}>
                                            {store.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Số điện thoại
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="0901234567"
                                />
                            </div>

                            {formData.role === 'employee' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Loại nhân viên <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            value={formData.employeeType}
                                            onChange={(e) => setFormData({ ...formData, employeeType: e.target.value as any })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="fulltime">Toàn thời gian</option>
                                            <option value="parttime">Bán thời gian</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Lương theo giờ (VND)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.hourlyRate}
                                            onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="30000"
                                        />
                                    </div>
                                </>
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
                                    {editingUser ? 'Cập nhật' : 'Thêm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
