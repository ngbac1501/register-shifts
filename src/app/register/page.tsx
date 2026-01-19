'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signUp } from '@/lib/firebase/auth';
import { useCollection } from '@/hooks/use-firestore';
import { Store } from '@/types';
import { where } from 'firebase/firestore';
import { Coffee, User, Mail, Lock, ArrowRight, Loader2, Store as StoreIcon } from 'lucide-react';

// Schema validation
const signUpSchema = z.object({
  displayName: z.string().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string(),
  storeId: z.string().min(1, 'Vui lòng chọn cửa hàng'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu nhập lại không khớp",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch active stores
  const { data: stores, loading: storesLoading } = useCollection<Store>('stores', [
    where('isActive', '==', true)
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setLoading(true);
      setError('');

      // Always register as 'employee' with selected storeId
      await signUp(data.email, data.password, data.displayName, 'employee', {
        storeId: data.storeId
      });

      // Redirect to employee dashboard or wait for approval page?
      // For now, redirect to employee login or dashboard. 
      // Since email verification might be needed or approval, maybe login is safer, 
      // but usually after signup we sign them in automatically.
      // Let's redirect to /employee
      router.push('/employee');

    } catch (err: any) {
      console.error('Registration error:', err);
      // Handle simplistic Firebase error code mapping if needed, or just show message
      if (err.message.includes('email-already-in-use')) {
        setError('Email này đã được sử dụng');
      } else {
        setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
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

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-600 to-orange-700 rounded-3xl mb-6 shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-300">
            <Coffee className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            Đăng ký tài khoản
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Dành cho nhân viên cửa hàng</p>
        </div>

        {/* Register Form */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 animate-fadeIn border border-white/20 dark:border-gray-700" style={{ animationDelay: '0.1s' }}>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-200 text-sm animate-shake">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 pl-1">
                Họ và tên
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  {...register('displayName')}
                  type="text"
                  id="displayName"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-500 transition-all outline-none dark:text-white"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              {errors.displayName && (
                <p className="mt-2 text-sm text-red-500 pl-1">{errors.displayName.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 pl-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-500 transition-all outline-none dark:text-white"
                  placeholder="email@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-500 pl-1">{errors.email.message}</p>
              )}
            </div>

            {/* Store Selection */}
            <div>
              <label htmlFor="storeId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 pl-1">
                Chọn cửa hàng làm việc
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <StoreIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                {storesLoading ? (
                  <div className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-500">
                    Đang tải danh sách cửa hàng...
                  </div>
                ) : (
                  <select
                    {...register('storeId')}
                    id="storeId"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-500 transition-all outline-none appearance-none dark:text-white"
                  >
                    <option value="">-- Chọn cửa hàng --</option>
                    {stores?.map((store) => (
                      <option key={store.id} value={store.id} className="dark:bg-gray-800">
                        {store.name} - {store.address}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {errors.storeId && (
                <p className="mt-2 text-sm text-red-500 pl-1">{errors.storeId.message}</p>
              )}
              {stores?.length === 0 && !storesLoading && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400 pl-1">Chưa có cửa hàng nào hoạt động.</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 pl-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  {...register('password')}
                  type="password"
                  id="password"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-500 transition-all outline-none dark:text-white"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-500 pl-1">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 pl-1">
                Nhập lại mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  id="confirmPassword"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-500 transition-all outline-none dark:text-white"
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-500 pl-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || storesLoading || stores?.length === 0}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  Đăng ký tài khoản
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center pt-6 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Đã có tài khoản?{' '}
              <Link
                href="/login"
                className="font-semibold text-amber-600 hover:text-amber-500 hover:underline transition-colors"
              >
                Đăng nhập ngay
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
