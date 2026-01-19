'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        // Redirect based on role
        switch (user.role) {
          case 'admin':
            router.push('/admin');
            break;
          case 'manager':
            router.push('/manager');
            break;
          case 'employee':
            router.push('/employee');
            break;
          default:
            router.push('/login');
        }
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coffee-medium mx-auto"></div>
        <p className="mt-4 text-gray-600">Đang tải...</p>
      </div>
    </div>
  );
}
