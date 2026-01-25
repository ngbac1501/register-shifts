'use client';

import { useAuth } from '@/hooks/use-auth';
import { useStore } from '@/contexts/StoreContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard,
    Calendar,
    Users,
    CheckCircle,
    LogOut,
    Store,
    DollarSign,
    Settings,
    Menu,
    X,
    ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { stores, selectedStoreId, setSelectedStoreId, loading: storeLoading } = useStore();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'manager')) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const handleLogout = async () => {
        const { signOut } = await import('@/lib/firebase/auth');
        await signOut();
        router.push('/login');
    };

    if (authLoading || storeLoading) { // Show loading state
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (!user || user.role !== 'manager') return null;

    const currentStore = stores.find(s => s.id === selectedStoreId);

    const navItems = [
        { href: '/manager', icon: LayoutDashboard, label: 'Tổng quan' },
        { href: '/manager/schedule', icon: Calendar, label: 'Lịch làm việc' },
        { href: '/manager/approvals', icon: CheckCircle, label: 'Phê duyệt' },
        { href: '/manager/employees', icon: Users, label: 'Nhân viên' },
        { href: '/manager/leaves', icon: Calendar, label: 'Nghỉ phép' }, // Icon duplicate but ok
        { href: '/manager/payroll', icon: DollarSign, label: 'Bảng lương' },
        { href: '/manager/settings', icon: Settings, label: 'Cài đặt' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 fixed top-0 left-0 right-0 z-30">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </button>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">Epatta</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <img
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=random`}
                            alt={user.displayName}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </div>

            {/* Overlay */}
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:transform-none'
                }`}>
                <div className="p-6 flex items-center justify-center border-b border-gray-100 dark:border-gray-800 h-32">
                    <Image src="/logoEpatta.png" alt="Epatta" width={180} height={100} className="h-[100px] w-auto object-contain" />
                </div>

                {/* Store Selector */}
                <div className="px-4 py-4">
                    <div className="relative">
                        <button
                            onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                            className="w-full flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors group"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg text-green-700 dark:text-green-300">
                                    <Store className="w-5 h-5" />
                                </div>
                                <div className="text-left overflow-hidden">
                                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Cửa hàng hiện tại</p>
                                    <p className="font-bold text-gray-900 dark:text-white truncate text-sm">
                                        {currentStore?.name || 'Chọn cửa hàng'}
                                    </p>
                                </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-green-600 transition-transform duration-200 ${isStoreDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isStoreDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsStoreDropdownOpen(false)} />
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-20 py-2 animate-fadeIn max-h-60 overflow-y-auto">
                                    {stores.length === 0 ? (
                                        <div className="px-4 py-2 text-sm text-gray-500 text-center">Không có cửa hàng</div>
                                    ) : (
                                        stores.map((store) => (
                                            <button
                                                key={store.id}
                                                onClick={() => {
                                                    setSelectedStoreId(store.id);
                                                    setIsStoreDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2 ${selectedStoreId === store.id ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                <Store className="w-4 h-4" />
                                                <span className="text-sm font-medium truncate">{store.name}</span>
                                                {selectedStoreId === store.id && <CheckCircle className="w-4 h-4 ml-auto" />}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/30'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400'}`} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Thông báo</span>
                        <NotificationBell />
                    </div>
                    <div className="flex items-center gap-3 mb-2 px-2">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <img
                                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=random`}
                                alt={user.displayName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{user.displayName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Quản lý</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Đăng xuất"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-72 min-h-screen pt-20 lg:pt-8 p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
                {!selectedStoreId ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm mt-8">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
                            <Store className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Chưa chọn cửa hàng</h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                            Vui lòng chọn một cửa hàng từ menu bên trái để bắt đầu quản lý lịch làm việc và nhân viên.
                        </p>
                        <button
                            onClick={() => setIsStoreDropdownOpen(true)}
                            className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium shadow-lg shadow-green-500/30 hover:bg-green-700 transition-all lg:hidden"
                        >
                            Chọn cửa hàng ngay
                        </button>
                    </div>
                ) : (
                    children
                )}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe z-40 flex items-center justify-around px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <Link
                    href="/manager"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/manager' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <LayoutDashboard className="w-6 h-6" strokeWidth={pathname === '/manager' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Tổng quan</span>
                </Link>
                <Link
                    href="/manager/schedule"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/manager/schedule' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <Calendar className="w-6 h-6" strokeWidth={pathname === '/manager/schedule' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Lịch</span>
                </Link>
                <Link
                    href="/manager/approvals"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/manager/approvals' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <CheckCircle className="w-6 h-6" strokeWidth={pathname === '/manager/approvals' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Duyệt</span>
                </Link>
                <Link
                    href="/manager/employees"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/manager/employees' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <Users className="w-6 h-6" strokeWidth={pathname === '/manager/employees' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Nhân viên</span>
                </Link>
                <Link
                    href="/manager/settings"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/manager/settings' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <Settings className="w-6 h-6" strokeWidth={pathname === '/manager/settings' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Cài đặt</span>
                </Link>
            </nav>
        </div>
    );
}
