'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from 'next-themes';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Moon, Sun, Monitor, Save, User, Phone, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function AdminSettingsPage() {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState({
        displayName: '',
        phone: '',
        photoURL: '',
    });

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                phone: user.phone || '',
                photoURL: user.photoURL || '',
            });
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setSuccessMessage('');
        try {
            await updateDoc(doc(db, 'users', user.id), {
                displayName: formData.displayName,
                phone: formData.phone,
                photoURL: formData.photoURL,
            });
            setSuccessMessage('Cập nhật thông tin thành công!');

            // Auto hide success message
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Có lỗi xảy ra khi cập nhật hồ sơ');
        } finally {
            setLoading(false);
        }
    };

    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Limit file size (e.g., 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('File quá lớn. Vui lòng chọn ảnh dưới 2MB');
            return;
        }

        setUploading(true);
        try {
            // Convert to Base64 with resizing
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 300;
                    const MAX_HEIGHT = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    setFormData(prev => ({ ...prev, photoURL: dataUrl }));
                    setUploading(false);
                };
            };
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Lỗi xử lý ảnh');
            setUploading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Cài đặt</h1>
                <p className="text-gray-600 dark:text-gray-400">Quản lý hồ sơ và giao diện ứng dụng</p>
            </div>

            {/* General Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-orange-600" />
                        Giao diện
                    </h2>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Chọn chế độ hiển thị mong muốn</p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setTheme('light')}
                            className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'light'
                                ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            <Sun className="w-6 h-6" />
                            <span className="font-medium">Sáng</span>
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'dark'
                                ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            <Moon className="w-6 h-6" />
                            <span className="font-medium">Tối</span>
                        </button>
                        <button
                            onClick={() => setTheme('system')}
                            className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'system'
                                ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            <Monitor className="w-6 h-6" />
                            <span className="font-medium">Hệ thống</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Profile Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-orange-600" />
                        Hồ sơ cá nhân
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Avatar Preview */}
                    <div className="flex items-center gap-6">
                        <div className="relative group w-24 h-24">
                            <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 border-2 border-gray-200 dark:border-gray-600">
                                <img
                                    src={formData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.displayName)}&background=random`}
                                    alt="Avatar preview"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6" />}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Ảnh đại diện</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Nhấp vào ảnh để tải lên ảnh mới. <br />
                                Hiển thị ở sidebar và danh sách nhân viên.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tên hiển thị
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Tên hiển thị"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Số điện thoại
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="0123 456 789"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            {successMessage}
                        </p>
                        <button
                            type="submit"
                            disabled={loading || uploading}
                            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg transition-all shadow-md disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Lưu thay đổi
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            <p className="text-center text-xs text-gray-400">Version: 1.0.1 (Admin Update)</p>
        </div >
    );
}
