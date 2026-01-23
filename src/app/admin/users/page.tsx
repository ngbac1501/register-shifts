'use client';

import { useState } from 'react';
import { useCollection } from '@/hooks/use-firestore';
import { User, Store } from '@/types';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
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
                toast.success('Cập nhật người dùng thành công');
            } else {
                // Create new user
                if (!formData.password) {
                    toast.error('Vui lòng nhập mật khẩu');
                    return;
                }

                // Use secondary app to avoid auto-login/redirect
                const { createUserInSecondaryApp } = await import('@/lib/firebase');
                const user = await createUserInSecondaryApp(formData.email, formData.password);

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

                await setDoc(doc(db, 'users', user.uid), userData);
                toast.success('Thêm người dùng mới thành công');
            }
            handleCloseModal();
        } catch (error: any) {
            console.error('Error saving user:', error);
            toast.error(error.message || 'Có lỗi xảy ra khi lưu người dùng');
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;
        try {
            await deleteDoc(doc(db, 'users', userId));
            // Note: This doesn't delete the Firebase Auth user, only Firestore document
            toast.success('Đã xóa người dùng khỏi Firestore');
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Có lỗi xảy ra khi xóa người dùng');
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={handleCloseModal}>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all scale-100 animate-slideUp" onClick={(e) => e.stopPropagation()}>

                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                        <Users className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">
                                            {editingUser ? 'Cập nhật thông tin' : 'Thêm nhân sự mới'}
                                        </h2>
                                        <p className="text-blue-100 text-sm mt-0.5">
                                            {editingUser ? 'Chỉnh sửa thông tin tài khoản và vai trò' : 'Tạo tài khoản mới cho quản lý hoặc nhân viên'}
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

                                {/* Account Info Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                        Thông tin tài khoản
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Email đăng nhập <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                disabled={!!editingUser}
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                                placeholder="user@epatta.com"
                                            />
                                        </div>

                                        {!editingUser && (
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                    Mật khẩu <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="password"
                                                    required={!editingUser}
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white placeholder-gray-400"
                                                    placeholder="Tối thiểu 6 ký tự"
                                                />
                                            </div>
                                        )}

                                        <div className={!editingUser ? "md:col-span-2" : "md:col-span-1"}>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Tên hiển thị <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.displayName}
                                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white placeholder-gray-400"
                                                placeholder="Nguyễn Văn A"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 dark:border-gray-700"></div>

                                {/* Role & Work Info Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                                        Vai trò & Công việc
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Vai trò <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    required
                                                    value={formData.role}
                                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white appearance-none"
                                                >
                                                    <option value="manager">Quản lý</option>
                                                    <option value="employee">Nhân viên</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Cửa hàng làm việc <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    required
                                                    value={formData.storeId}
                                                    onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white appearance-none"
                                                >
                                                    <option value="">-- Chọn cửa hàng --</option>
                                                    {stores?.map((store) => (
                                                        <option key={store.id} value={store.id}>
                                                            {store.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Số điện thoại
                                            </label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white placeholder-gray-400"
                                                placeholder="0901234567"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {formData.role === 'employee' && (
                                    <>
                                        <div className="border-t border-gray-100 dark:border-gray-700"></div>

                                        {/* Employee Specifics */}
                                        <div className="space-y-4 animate-fadeIn">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                                                Chi tiết nhân sự
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                        Loại hình <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            required
                                                            value={formData.employeeType}
                                                            onChange={(e) => setFormData({ ...formData, employeeType: e.target.value as any })}
                                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white appearance-none"
                                                        >
                                                            <option value="fulltime">Toàn thời gian</option>
                                                            <option value="parttime">Bán thời gian</option>
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                        Lương theo giờ (VND)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={formData.hourlyRate}
                                                        onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white placeholder-gray-400"
                                                        placeholder="30000"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
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
                                    {editingUser ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
