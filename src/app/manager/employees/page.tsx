'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCollection } from '@/hooks/use-firestore';
import { User, Schedule } from '@/types';
import { where, updateDoc, doc, Timestamp, setDoc, collection, query, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { createUserInSecondaryApp } from '@/lib/firebase';
import { Users, Search, Edit, UserPlus, X, Phone, Mail, DollarSign, Loader2, Lock, Trash2 } from 'lucide-react';
import { getEmployeeTypeLabel, formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import ConfirmModal from '@/components/shared/ConfirmModal';

export default function ManagerEmployeesPage() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'fulltime' | 'parttime'>('all');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; employeeId: string | null }>({ isOpen: false, employeeId: null });

    const [formData, setFormData] = useState({
        displayName: '',
        phone: '',
        employeeType: 'fulltime' as 'fulltime' | 'parttime',
        hourlyRate: 0,
    });

    const [addFormData, setAddFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        phone: '',
        employeeType: 'fulltime' as 'fulltime' | 'parttime',
        hourlyRate: 0,
    });

    const { data: employees, loading } = useCollection<User>('users', [
        where('storeId', '==', user?.storeId || ''),
        where('role', '==', 'employee'),
    ]);

    const { data: schedules } = useCollection<Schedule>('schedules', [
        where('storeId', '==', user?.storeId || ''),
    ]);

    const filteredEmployees = employees?.filter(emp => {
        const matchesSearch = emp.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === 'all' || emp.employeeType === filterType;
        return matchesSearch && matchesFilter;
    }) || [];

    const getEmployeeStats = (employeeId: string) => {
        const employeeSchedules = schedules?.filter(s => s.employeeId === employeeId) || [];
        const approvedSchedules = employeeSchedules.filter(s => s.status === 'approved');
        const pendingSchedules = employeeSchedules.filter(s => s.status === 'pending');
        const totalHours = employeeSchedules.filter(s => s.status === 'completed').length * 8;

        return {
            totalSchedules: employeeSchedules.length,
            approved: approvedSchedules.length,
            pending: pendingSchedules.length,
            totalHours,
        };
    };

    const handleEdit = (employee: User) => {
        setEditingEmployee(employee);
        setFormData({
            displayName: employee.displayName,
            phone: employee.phone || '',
            employeeType: employee.employeeType || 'fulltime',
            hourlyRate: employee.hourlyRate || 0,
        });
        setIsEditModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsEditModalOpen(false);
        setEditingEmployee(null);
        setFormData({
            displayName: '',
            phone: '',
            employeeType: 'fulltime',
            hourlyRate: 0,
        });
    };

    const handleSubmitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEmployee) return;

        try {
            await updateDoc(doc(db, 'users', editingEmployee.id), {
                displayName: formData.displayName,
                phone: formData.phone,
                employeeType: formData.employeeType,
                hourlyRate: Number(formData.hourlyRate),
                updatedAt: Timestamp.now(),
            });
            handleCloseModal();
            toast.success('Cập nhật nhân viên thành công');
        } catch (error) {
            console.error('Error updating employee:', error);
            toast.error('Có lỗi xảy ra khi cập nhật thông tin nhân viên');
        }
    };

    const handleDeleteClick = (employeeId: string) => {
        setDeleteModal({ isOpen: true, employeeId });
    };

    const handleConfirmDelete = async () => {
        if (!deleteModal.employeeId) return;
        const employeeId = deleteModal.employeeId;

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Không tìm thấy thông tin xác thực');

            const response = await fetch('/api/users/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUserId: employeeId }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Không thể xóa nhân viên');
            }

            toast.success('Đã xóa nhân viên thành công');
            setDeleteModal({ isOpen: false, employeeId: null });
        } catch (error: any) {
            console.error('Error deleting employee:', error);
            toast.error('Có lỗi xảy ra: ' + error.message);
        }
    };

    const handleCloseAddModal = () => {
        setIsAddModalOpen(false);
        setAddFormData({
            displayName: '',
            email: '',
            password: '',
            phone: '',
            employeeType: 'fulltime',
            hourlyRate: 0,
        });
    };

    const handleSubmitAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.storeId) return;

        if (!addFormData.password || addFormData.password.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        setIsSubmitting(true);
        try {
            const q = query(
                collection(db, 'users'),
                where('email', '==', addFormData.email)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                toast.error('Email này đã tồn tại trong hệ thống!');
                setIsSubmitting(false);
                return;
            }

            const newUser = await createUserInSecondaryApp(addFormData.email, addFormData.password);

            await setDoc(doc(db, 'users', newUser.uid), {
                displayName: addFormData.displayName,
                email: addFormData.email,
                phone: addFormData.phone,
                employeeType: addFormData.employeeType,
                hourlyRate: Number(addFormData.hourlyRate),
                role: 'employee',
                storeId: user.storeId,
                createdAt: Timestamp.now(),
                photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(addFormData.displayName)}&background=random`,
                isActive: true,
            });

            handleCloseAddModal();
            toast.success('Thêm nhân viên thành công');
        } catch (error: any) {
            console.error('Error adding employee:', error);
            toast.error('Có lỗi xảy ra khi thêm nhân viên: ' + (error.message || error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Quản lý nhân viên</h1>
                    <p className="text-gray-600 dark:text-gray-400">Xem danh sách, chỉnh sửa và thêm mới nhân viên</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-green-500/30 transition-all transform hover:-translate-y-0.5"
                >
                    <UserPlus className="w-5 h-5" />
                    <span className="font-semibold">Thêm nhân viên</span>
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none dark:text-white"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-3 rounded-xl whitespace-nowrap transition-all font-medium ${filterType === 'all' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => setFilterType('fulltime')}
                        className={`px-4 py-3 rounded-xl whitespace-nowrap transition-all font-medium ${filterType === 'fulltime' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                    >
                        Full-time
                    </button>
                    <button
                        onClick={() => setFilterType('parttime')}
                        className={`px-4 py-3 rounded-xl whitespace-nowrap transition-all font-medium ${filterType === 'parttime' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                    >
                        Part-time
                    </button>
                </div>
            </div>

            {/* Employee Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Không tìm thấy nhân viên</h3>
                        <p className="text-gray-500 dark:text-gray-400">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                    </div>
                ) : (
                    filteredEmployees.map((employee) => {
                        const stats = getEmployeeStats(employee.id);
                        return (
                            <div key={employee.id} className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                {/* Card Header */}
                                <div className="p-6 border-b border-gray-50 dark:border-gray-700/50 relative">
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button
                                            onClick={() => handleEdit(employee)}
                                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                            title="Chỉnh sửa"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(employee.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Xóa nhân viên"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 p-1 flex-shrink-0">
                                            <img
                                                src={employee.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.displayName)}&background=random`}
                                                alt={employee.displayName}
                                                className="w-full h-full object-cover rounded-xl"
                                            />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-green-600 transition-colors">
                                                {employee.displayName}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${employee.employeeType === 'fulltime'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                                                    : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                                                    }`}>
                                                    {getEmployeeTypeLabel(employee.employeeType || 'fulltime')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="px-6 py-4 space-y-3 bg-gray-50/50 dark:bg-gray-700/10">
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        <span className="truncate">{employee.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        <span>{employee.phone || 'Chưa cập nhật'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-medium text-gray-900 dark:text-gray-200">
                                        <DollarSign className="w-4 h-4 text-green-500" />
                                        <span>{formatCurrency(employee.hourlyRate || 0)} / giờ</span>
                                    </div>
                                </div>

                                {/* Stats Footer */}
                                <div className="px-6 py-4 grid grid-cols-3 gap-2 border-t border-gray-50 dark:border-gray-700/50">
                                    <div className="text-center">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tổng ca</div>
                                        <div className="font-bold text-gray-900 dark:text-white">{stats.totalSchedules}</div>
                                    </div>
                                    <div className="text-center border-l border-gray-100 dark:border-gray-700">
                                        <div className="text-xs text-green-600 dark:text-green-400 mb-1">Đã duyệt</div>
                                        <div className="font-bold text-gray-900 dark:text-white">{stats.approved}</div>
                                    </div>
                                    <div className="text-center border-l border-gray-100 dark:border-gray-700">
                                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">Chờ duyệt</div>
                                        <div className="font-bold text-gray-900 dark:text-white">{stats.pending}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add/Edit Modal */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform transition-all scale-100 animate-fadeIn">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {isAddModalOpen ? 'Thêm nhân viên mới' : 'Chỉnh sửa thông tin'}
                            </h2>
                            <button
                                onClick={isAddModalOpen ? handleCloseAddModal : handleCloseModal}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={isAddModalOpen ? handleSubmitAdd : handleSubmitEdit} className="space-y-5">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Họ và tên <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={isAddModalOpen ? addFormData.displayName : formData.displayName}
                                            onChange={(e) => isAddModalOpen
                                                ? setAddFormData({ ...addFormData, displayName: e.target.value })
                                                : setFormData({ ...formData, displayName: e.target.value })
                                            }
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all dark:text-white"
                                            placeholder="Nguyễn Văn A"
                                        />
                                    </div>

                                    {isAddModalOpen && (
                                        <div>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Email <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={addFormData.email}
                                                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all dark:text-white"
                                                    placeholder="email@example.com"
                                                />
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    Email này được dùng để đăng nhập
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Mật khẩu <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="password"
                                                        required
                                                        minLength={6}
                                                        value={addFormData.password}
                                                        onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all dark:text-white"
                                                        placeholder="Tối thiểu 6 ký tự"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                        <Lock className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Số điện thoại
                                        </label>
                                        <input
                                            type="tel"
                                            value={isAddModalOpen ? addFormData.phone : formData.phone}
                                            onChange={(e) => isAddModalOpen
                                                ? setAddFormData({ ...addFormData, phone: e.target.value })
                                                : setFormData({ ...formData, phone: e.target.value })
                                            }
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all dark:text-white"
                                            placeholder="0123 456 789"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Loại hợp đồng
                                            </label>
                                            <select
                                                value={isAddModalOpen ? addFormData.employeeType : formData.employeeType}
                                                onChange={(e) => isAddModalOpen
                                                    ? setAddFormData({ ...addFormData, employeeType: e.target.value as any })
                                                    : setFormData({ ...formData, employeeType: e.target.value as any })
                                                }
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all dark:text-white"
                                            >
                                                <option value="fulltime">Full-time</option>
                                                <option value="parttime">Part-time</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Lương / giờ
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1000"
                                                    required
                                                    value={isAddModalOpen ? addFormData.hourlyRate : formData.hourlyRate}
                                                    onChange={(e) => isAddModalOpen
                                                        ? setAddFormData({ ...addFormData, hourlyRate: Number(e.target.value) })
                                                        : setFormData({ ...formData, hourlyRate: Number(e.target.value) })
                                                    }
                                                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all dark:text-white"
                                                />
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                                    <button
                                        type="button"
                                        onClick={isAddModalOpen ? handleCloseAddModal : handleCloseModal}
                                        className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-green-500/30 font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                        {isAddModalOpen ? (isSubmitting ? 'Đang thêm...' : 'Thêm nhân viên') : 'Lưu thay đổi'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, employeeId: null })}
                onConfirm={handleConfirmDelete}
                title="Xóa nhân viên?"
                message="CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn nhân viên và TOÀN BỘ lịch làm việc của họ. Bạn có chắc chắn không?"
                confirmText="Xác nhận xóa"
                cancelText="Hủy"
            />
        </div>
    );
}
