'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { signIn } from '@/lib/firebase/auth';
import { signInWithGoogle } from '@/lib/firebase/google-auth';
import { loginSchema, type LoginFormData } from '@/lib/validations/schemas';

import ConfirmModal from '@/components/shared/ConfirmModal';
import { PasswordInput } from '@/components/ui/PasswordInput';

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

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await signInWithGoogle();

      toast.success('Đăng nhập thành công!');

      if (result.isNewUser || !result.user.storeId) {
        // New user or user without store - redirect to store selection
        setTimeout(() => {
          window.location.href = '/select-store';
        }, 500);
      } else {
        // Existing user with store - redirect to dashboard
        const redirectPath = result.user.role === 'admin' ? '/admin'
          : result.user.role === 'manager' ? '/manager'
            : '/employee';

        setTimeout(() => {
          window.location.href = redirectPath;
        }, 500);
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const errorMessage = err.code === 'auth/popup-closed-by-user'
        ? 'Bạn đã đóng cửa sổ đăng nhập'
        : err.code === 'auth/cancelled-popup-request'
          ? 'Đã hủy yêu cầu đăng nhập'
          : 'Đăng nhập bằng Google thất bại. Vui lòng thử lại.';

      setErrorModal({
        isOpen: true,
        title: 'Đăng Nhập Thất Bại',
        message: errorMessage
      });
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
        {/* Logo */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-white dark:bg-gray-800 rounded-3xl mb-6 shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden">
            <Image
              src="/logoEpatta.png"
              alt="Epatta Logo"
              width={128}
              height={128}
              className="w-full h-full object-contain p-3"
              priority
            />
          </div>
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
            <PasswordInput
              {...register('password')}
              id="password"
              label="Mật khẩu"
              placeholder="••••••••"
              error={errors.password?.message}
            />

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

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400">Hoặc</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-4 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none shadow-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Đăng nhập bằng Google
          </button>

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
