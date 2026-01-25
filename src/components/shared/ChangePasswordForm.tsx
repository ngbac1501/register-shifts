'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Lock, Save, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PasswordInput } from '@/components/ui/PasswordInput';

export default function ChangePasswordForm() {
    const [loading, setLoading] = useState(false);
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user || !user.email) {
            toast.error('Không tìm thấy thông tin người dùng');
            return;
        }

        if (passwords.newPassword.length < 6) {
            toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }

        if (passwords.currentPassword === passwords.newPassword) {
            toast.error('Mật khẩu mới không được trùng với mật khẩu hiện tại');
            return;
        }

        setLoading(true);
        try {
            // 1. Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, passwords.currentPassword);
            await reauthenticateWithCredential(user, credential);

            // 2. Update Password
            await updatePassword(user, passwords.newPassword);

            toast.success('Đổi mật khẩu thành công');
            setPasswords({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (error: any) {
            console.error('Change password error:', error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                toast.error('Mật khẩu hiện tại không đúng');
            } else if (error.code === 'auth/too-many-requests') {
                toast.error('Quá nhiều lần thử thất bại. Vui lòng thử lại sau.');
            } else if (error.code === 'auth/weak-password') {
                toast.error('Mật khẩu quá yếu (tối thiểu 6 ký tự)');
            } else {
                toast.error('Có lỗi xảy ra: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-orange-600" />
                    Đổi mật khẩu
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <PasswordInput
                    label="Mật khẩu hiện tại"
                    name="currentPassword"
                    value={passwords.currentPassword}
                    onChange={handleChange}
                    required
                    placeholder="Nhập mật khẩu hiện tại"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PasswordInput
                        label="Mật khẩu mới"
                        name="newPassword"
                        value={passwords.newPassword}
                        onChange={handleChange}
                        required
                        minLength={6}
                        placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                    />

                    <PasswordInput
                        label="Xác nhận mật khẩu mới"
                        name="confirmPassword"
                        value={passwords.confirmPassword}
                        onChange={handleChange}
                        required
                        minLength={6}
                        placeholder="Nhập lại mật khẩu mới"
                    />
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white rounded-lg transition-all shadow-md disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Thay đổi mật khẩu
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
