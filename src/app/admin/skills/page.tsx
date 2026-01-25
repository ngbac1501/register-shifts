'use client';

import { useState } from 'react';
import { useCollection } from '@/hooks/use-firestore';
import type { Skill, EmployeeSkill, User } from '@/types';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Award, Plus, X, Users, TrendingUp, Loader2, Trash2, UserPlus, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteSkill, assignSkillToEmployee } from '@/lib/skill-service';
import { useAuth } from '@/hooks/use-auth';

export default function AdminSkillsPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [skillName, setSkillName] = useState('');
    const [skillDescription, setSkillDescription] = useState('');
    const [skillCategory, setSkillCategory] = useState<'technical' | 'soft' | 'management'>('technical');
    const [loading, setLoading] = useState(false);

    // Assign Modal State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('beginner');

    const { user } = useAuth();

    const { data: skills, loading: skillsLoading } = useCollection<Skill>('skills', []);
    const { data: employeeSkills } = useCollection<EmployeeSkill>('employee_skills', []);
    const { data: employees } = useCollection<User>('users', []);

    const handleAddSkill = async () => {
        if (!skillName.trim()) {
            toast.error('Vui lòng nhập tên kỹ năng');
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'skills'), {
                name: skillName,
                description: skillDescription,
                category: skillCategory,
                isActive: true,
                createdAt: Timestamp.now(),
            });

            toast.success('Đã thêm kỹ năng mới!');
            setIsAddModalOpen(false);
            setSkillName('');
            setSkillDescription('');
            setSkillCategory('technical');
        } catch (error) {
            console.error('Error adding skill:', error);
            toast.error('Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSkill = async (skillId: string, skillName: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa kỹ năng "${skillName}"?`)) return;

        try {
            await deleteSkill(skillId);
            toast.success('Đã xóa kỹ năng');
        } catch (error) {
            console.error('Error deleting skill:', error);
            toast.error('Có lỗi xảy ra khi xóa');
        }
    };

    const handleOpenAssignModal = (skill: Skill) => {
        setSelectedSkill(skill);
        setSelectedEmployeeId('');
        setSelectedLevel('beginner');
        setIsAssignModalOpen(true);
    };

    const handleAssignSkill = async () => {
        if (!selectedSkill || !selectedEmployeeId || !user) return;

        setLoading(true);
        try {
            await assignSkillToEmployee(
                selectedEmployeeId,
                selectedSkill.id,
                selectedLevel,
                user.id
            );
            toast.success('Đã gán kỹ năng thành công');
            setIsAssignModalOpen(false);
        } catch (error: any) {
            console.error('Error assigning skill:', error);
            toast.error(error.message === 'Employee already has this skill'
                ? 'Nhân viên đã có kỹ năng này rồi'
                : 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            technical: 'Kỹ thuật',
            soft: 'Kỹ năng mềm',
            management: 'Quản lý',
        };
        return labels[category] || category;
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            technical: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            soft: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            management: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        };
        return colors[category] || 'bg-gray-100 text-gray-800';
    };

    const getSkillStats = (skillId: string) => {
        const skillEmployees = employeeSkills?.filter(es => es.skillId === skillId) || [];
        return {
            total: skillEmployees.length,
            beginner: skillEmployees.filter(es => es.level === 'beginner').length,
            intermediate: skillEmployees.filter(es => es.level === 'intermediate').length,
            advanced: skillEmployees.filter(es => es.level === 'advanced').length,
            expert: skillEmployees.filter(es => es.level === 'expert').length,
        };
    };

    const totalSkills = skills?.length || 0;
    const totalEmployeeSkills = employeeSkills?.length || 0;
    const avgSkillsPerEmployee = employees?.length ? (totalEmployeeSkills / employees.length).toFixed(1) : 0;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Quản lý kỹ năng
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Theo dõi và phát triển kỹ năng của nhân viên
                    </p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl shadow-lg hover:shadow-purple-500/30 transition-all transform hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">Thêm kỹ năng</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Tổng kỹ năng</p>
                            <p className="text-3xl font-bold mt-1">{totalSkills}</p>
                        </div>
                        <Award className="w-12 h-12 opacity-80" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Nhân viên có kỹ năng</p>
                            <p className="text-3xl font-bold mt-1">{totalEmployeeSkills}</p>
                        </div>
                        <Users className="w-12 h-12 opacity-80" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">TB kỹ năng/người</p>
                            <p className="text-3xl font-bold mt-1">{avgSkillsPerEmployee}</p>
                        </div>
                        <TrendingUp className="w-12 h-12 opacity-80" />
                    </div>
                </div>
            </div>

            {/* Skills List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Danh sách kỹ năng
                    </h2>
                </div>
                <div className="p-6">
                    {skillsLoading ? (
                        <div className="text-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-500" />
                            <p className="text-gray-500">Đang tải...</p>
                        </div>
                    ) : !skills || skills.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Chưa có kỹ năng nào</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {skills.map((skill) => {
                                const stats = getSkillStats(skill.id);
                                return (
                                    <div key={skill.id} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-600">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                                                    {skill.name}
                                                </h3>
                                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(skill.category)}`}>
                                                    {getCategoryLabel(skill.category)}
                                                </span>
                                            </div>
                                            <Award className="w-6 h-6 text-purple-500" />
                                        </div>
                                        {skill.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                {skill.description}
                                            </p>
                                        )}
                                        <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Nhân viên:</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">{stats.total}</span>
                                            </div>
                                            {stats.total > 0 && (
                                                <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                                                    <div className="text-center">
                                                        <div className="text-gray-500">Mới</div>
                                                        <div className="font-semibold text-blue-600">{stats.beginner}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-gray-500">TB</div>
                                                        <div className="font-semibold text-green-600">{stats.intermediate}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-gray-500">Cao</div>
                                                        <div className="font-semibold text-orange-600">{stats.advanced}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-gray-500">Chuyên</div>
                                                        <div className="font-semibold text-purple-600">{stats.expert}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                            <button
                                                onClick={() => handleOpenAssignModal(skill)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                Gán NV
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSkill(skill.id, skill.name)}
                                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                title="Xóa kỹ năng"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Thêm kỹ năng mới
                            </h2>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tên kỹ năng <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={skillName}
                                    onChange={(e) => setSkillName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none dark:text-white"
                                    placeholder="Ví dụ: Pha chế Espresso"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Danh mục
                                </label>
                                <select
                                    value={skillCategory}
                                    onChange={(e) => setSkillCategory(e.target.value as any)}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none dark:text-white"
                                >
                                    <option value="technical">Kỹ thuật</option>
                                    <option value="soft">Kỹ năng mềm</option>
                                    <option value="management">Quản lý</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Mô tả
                                </label>
                                <textarea
                                    value={skillDescription}
                                    onChange={(e) => setSkillDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none dark:text-white resize-none"
                                    placeholder="Mô tả về kỹ năng này..."
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleAddSkill}
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Đang thêm...' : 'Thêm kỹ năng'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {isAssignModalOpen && selectedSkill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Gán kỹ năng: <span className="text-purple-600">{selectedSkill.name}</span>
                            </h2>
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Chọn nhân viên <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white"
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {employees?.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.displayName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Trình độ
                                </label>
                                <select
                                    value={selectedLevel}
                                    onChange={(e) => setSelectedLevel(e.target.value as any)}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white"
                                >
                                    <option value="beginner">Mới (Beginner)</option>
                                    <option value="intermediate">Trung bình (Intermediate)</option>
                                    <option value="advanced">Khá (Advanced)</option>
                                    <option value="expert">Chuyên gia (Expert)</option>
                                </select>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleAssignSkill}
                                    disabled={loading || !selectedEmployeeId}
                                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
