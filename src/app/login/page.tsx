'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { signIn } from '@/lib/firebase/auth';
import { loginSchema, type LoginFormData } from '@/lib/validations/schemas';

import ConfirmModal from '@/components/shared/ConfirmModal';

export default function LoginPage() {
  const router = useRouter();
  // Keep localized error for generic errors if needed, but mainly use modal
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.';
      case 'auth/user-disabled':
        return 'Tài khoản này đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.';
      case 'auth/user-not-found':
        return 'Email chưa được đăng ký trong hệ thống.';
      case 'auth/wrong-password':
        return 'Mật khẩu không chính xác. Vui lòng thử lại.';
      case 'auth/invalid-credential':
        return 'Thông tin đăng nhập không chính xác.';
      case 'auth/too-many-requests':
        return 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau vài phút.';
      case 'auth/network-request-failed':
        return 'Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền.';
      default:
        return 'Đăng nhập thất bại. Vui lòng thử lại.';
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      setError('');

      const user = await signIn(data.email, data.password);

      // Show success toast
      toast.success('Đăng nhập thành công!');

      // Use window.location.href to force full page reload and avoid race condition
      const redirectPath = user.role === 'admin' ? '/admin'
        : user.role === 'manager' ? '/manager'
          : user.role === 'employee' ? '/employee'
            : null;

      if (redirectPath) {
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 500);
      } else {
        const msg = 'Vai trò không hợp lệ';
        setErrorModal({
          isOpen: true,
          title: 'Lỗi Đăng Nhập',
          message: msg
        });
        toast.error(msg);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = getErrorMessage(err.code || '');

      // Use Modal for the error
      setErrorModal({
        isOpen: true,
        title: 'Đăng Nhập Thất Bại',
        message: errorMessage
      });
      // Also set generic error state just in case, or clear it
      setError('');
      // Optional: keep toast as secondary or remove it. User asked for Modal.
      // toast.error(errorMessage); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 transition-colors duration-500">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-amber-500/20 blur-[100px] animate-pulse"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-orange-500/20 blur-[100px] animate-pulse delay-1000"></div>
      </div>

      <ConfirmModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        message={errorModal.message}
        type="danger"
        confirmText="Đóng"
        showCancel={false}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-gray-800 rounded-3xl mb-6 shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden">
            <Image
              src="/logoEpatta.png"
              alt="Epatta Logo"
              width={80}
              height={80}
              className="w-full h-full object-contain p-2"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            Epatta
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Hệ thống quản lý ca làm việc</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 animate-fadeIn border border-white/20 dark:border-gray-700" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Chào mừng trở lại</h2>

          {/* Fallback inline error if needed, but mainly using Modal now */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-200 text-sm animate-shake">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 pl-1">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-500 transition-all outline-none dark:text-white"
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-500 pl-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 pl-1">
                Mật khẩu
              </label>
              <input
                {...register('password')}
                type="password"
                id="password"
                className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-500 transition-all outline-none dark:text-white"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-2 text-sm text-red-500 pl-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-amber-600/30"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xử lý...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-8 text-center pt-6 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Chưa có tài khoản?{' '}
              <Link
                href="/register"
                className="font-semibold text-amber-600 hover:text-amber-500 hover:underline transition-colors"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-500 mt-8 opacity-80">
          © 2026 Epatta Coffee & Tea. All rights reserved.
        </p>
      </div>
    </div>
  );
}
