'use client';

import { useAuth } from '@/hooks/use-auth';
import { useDocument } from '@/hooks/use-firestore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutDashboard, Calendar, Users, CheckCircle, LogOut, Store, DollarSign, Settings, Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Store as StoreType } from '@/types';
import { useState } from 'react';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const { data: store } = useDocument<StoreType>('stores', user?.storeId || '');

    useEffect(() => {
        if (!loading && (!user || user.role !== 'manager')) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (!user || user.role !== 'manager') {
        return null;
    }

    const handleLogout = async () => {
        const { signOut } = await import('@/lib/firebase/auth');
        await signOut();
        router.push('/login');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4 bg-gradient-to-r from-green-700 to-emerald-800 text-white shadow-md fixed top-0 left-0 right-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="bg-white w-8 h-8 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
                        <Image src="/logoEpatta.png" alt="Epatta" width={32} height={32} className="w-full h-full object-contain p-1" />
                    </div>
                    <span className="font-bold text-lg">Epatta Manager</span>
                </div>
                <button onClick={toggleSidebar} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Overlay */}
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-opacity"
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 z-40 h-full w-64 bg-gradient-to-b from-green-700 to-emerald-800 text-white shadow-xl transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold">Epatta Manager</h1>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 hover:bg-white/10 rounded">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3 mb-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        <div className="w-10 h-10 rounded-full border-2 border-green-300 overflow-hidden bg-green-800 flex-shrink-0">
                            <img
                                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=random`}
                                alt={user.displayName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-medium truncate" title={user.displayName}>{user.displayName}</p>
                            <p className="text-xs text-green-200 truncate">{user.email}</p>
                        </div>
                    </div>

                    {store && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-green-600/30 rounded-lg">
                            <Store className="w-4 h-4 text-green-200 mt-1 flex-shrink-0" />
                            <span className="text-sm text-green-100 break-words line-clamp-2">{store.name}</span>
                        </div>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto px-2 space-y-1">
                    <Link
                        href="/manager"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center px-4 py-3 hover:bg-white/10 rounded-lg transition-all mx-2 group"
                    >
                        <LayoutDashboard className="w-5 h-5 mr-3 group-hover:text-green-200 transition-colors" />
                        Dashboard
                    </Link>
                    <Link
                        href="/manager/schedule"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center px-4 py-3 hover:bg-white/10 rounded-lg transition-all mx-2 group"
                    >
                        <Calendar className="w-5 h-5 mr-3 group-hover:text-green-200 transition-colors" />
                        Lịch làm việc
                    </Link>
                    <Link
                        href="/manager/approvals"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center px-4 py-3 hover:bg-white/10 rounded-lg transition-all mx-2 group"
                    >
                        <CheckCircle className="w-5 h-5 mr-3 group-hover:text-green-200 transition-colors" />
                        Duyệt ca
                    </Link>
                    <Link
                        href="/manager/payroll"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center px-4 py-3 hover:bg-white/10 rounded-lg transition-all mx-2 group"
                    >
                        <DollarSign className="w-5 h-5 mr-3 group-hover:text-green-200 transition-colors" />
                        Báo cáo lương
                    </Link>
                    <Link
                        href="/manager/employees"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center px-4 py-3 hover:bg-white/10 rounded-lg transition-all mx-2 group"
                    >
                        <Users className="w-5 h-5 mr-3 group-hover:text-green-200 transition-colors" />
                        Nhân viên
                    </Link>
                    <Link
                        href="/manager/settings"
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center px-4 py-3 hover:bg-white/10 rounded-lg transition-all mx-2 group"
                    >
                        <Settings className="w-5 h-5 mr-3 group-hover:text-green-200 transition-colors" />
                        Cài đặt
                    </Link>
                </nav>

                <div className="p-4 mt-auto">
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center w-full px-4 py-3 bg-red-500/80 hover:bg-red-600 text-white rounded-xl transition-colors backdrop-blur-sm"
                    >
                        <LogOut className="w-5 h-5 mr-2" />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 min-h-screen transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
