'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Store, Users, Clock, LogOut, Menu, X, Settings, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    if (!user || user.role !== 'admin') {
        return null;
    }

    const handleLogout = async () => {
        const { signOut } = await import('@/lib/firebase/auth');
        await signOut();
        router.push('/login');
    };

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/stores', label: 'Cửa hàng', icon: Store },
        { href: '/admin/users', label: 'Người dùng', icon: Users },
        { href: '/admin/shifts', label: 'Ca làm việc', icon: Clock },
    ];

    const manageItems = [
        { href: '/admin/manage/schedule', label: 'Lịch làm việc', icon: Clock },
        { href: '/admin/manage/employees', label: 'Nhân viên', icon: Users },
        { href: '/admin/manage/approvals', label: 'Duyệt yêu cầu', icon: ClipboardCheck },
        { href: '/admin/manage/payroll', label: 'Báo cáo lương', icon: LayoutDashboard },
        { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            {/* Mobile Header */}
            <header className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-2">
                    <div className="bg-white dark:bg-gray-800 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
                        <Image src="/logoEpatta.png" alt="Epatta" width={32} height={32} className="w-full h-full object-contain p-1" />
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-lg">Admin</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </header>

            {/* Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm animate-fadeIn"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Layout Container */}
            <div className="flex">
                {/* Sidebar */}
                <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:transform-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}>
                    <div className="h-full flex flex-col">
                        {/* Sidebar Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 hidden lg:block">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-white dark:bg-gray-800 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                    <Image src="/logoEpatta.png" alt="Epatta" width={40} height={40} className="w-full h-full object-contain p-1" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Epatta</h1>
                                    <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full w-fit">ADMIN PANEL</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold border border-orange-200 dark:border-orange-800">
                                    {user.displayName?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.displayName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                            <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Menu
                            </div>
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                            ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-orange-600 dark:hover:text-orange-400'
                                            }`}
                                    >
                                        <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-orange-500 dark:group-hover:text-orange-400'}`} />
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}

                            <div className="px-4 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Quản lý cửa hàng
                            </div>
                            {manageItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                            ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-orange-600 dark:hover:text-orange-400'
                                            }`}
                                    >
                                        <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-orange-500 dark:group-hover:text-orange-400'}`} />
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Sidebar Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                            <button
                                onClick={handleLogout}
                                className="flex items-center justify-center w-full px-4 py-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors font-medium border border-transparent hover:border-red-200 dark:hover:border-red-800"
                            >
                                <LogOut className="w-5 h-5 mr-2" />
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-h-screen">
                    <div className="p-4 md:p-8 max-w-7xl mx-auto dark:text-white pt-20 lg:pt-8 w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
