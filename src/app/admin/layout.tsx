'use client';

import { useAuth } from '@/hooks/use-auth';
import { useStore } from '@/contexts/StoreContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard,
    Store,
    Users,
    Clock,
    LogOut,
    Menu,
    X,
    Settings,
    ClipboardCheck,
    TrendingUp,
    Award,
    ChevronDown,
    CheckCircle,
    Layers
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { stores, selectedStoreId, setSelectedStoreId, loading: storeLoading } = useStore();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const handleLogout = async () => {
        const { signOut } = await import('@/lib/firebase/auth');
        await signOut();
        router.push('/login');
    };

    if (authLoading || storeLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    if (!user || user.role !== 'admin') return null;

    const currentStore = stores.find(s => s.id === selectedStoreId);

    const navItems = [
        { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
        { href: '/admin/stores', label: 'Quản lý cửa hàng', icon: Store },
        { href: '/admin/users', label: 'Quản lý người dùng', icon: Users },
        { href: '/admin/shifts', label: 'Cấu hình ca làm', icon: Clock },
    ];

    const manageItems = [
        { href: '/admin/manage/schedule', label: 'Lịch làm việc', icon: Clock },
        { href: '/admin/manage/employees', label: 'Nhân viên', icon: Users },
        { href: '/admin/manage/leaves', label: 'Nghỉ phép', icon: ClipboardCheck },
        { href: '/admin/manage/approvals', label: 'Duyệt yêu cầu', icon: ClipboardCheck },
        // { href: '/admin/manage/payroll', label: 'Báo cáo lương', icon: LayoutDashboard }, // Admin usually does analytics not payroll execution directly per store? Or keep it.
        { href: '/admin/skills', label: 'Kỹ năng & Đào tạo', icon: Award },
        { href: '/admin/settings', label: 'Cài đặt hệ thống', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 fixed top-0 left-0 right-0 z-30">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </button>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">Admin Panel</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        title="Đăng xuất"
                    >
                        <LogOut className="w-6 h-6" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden ml-1">
                        <img
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=random`}
                            alt={user.displayName}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </div>

            {/* Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm animate-fadeIn"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:transform-none'}`}>
                <div className="max-h-full flex flex-col">
                    {/* Sidebar Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 h-32 flex items-center justify-center shrink-0">
                        <Image src="/logoEpatta.png" alt="Epatta" width={180} height={100} className="h-[100px] w-auto object-contain" />
                    </div>

                    {/* Store Selector */}
                    <div className="px-4 py-4 shrink-0">
                        <div className="relative">
                            <button
                                onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                                className="w-full flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors group"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg text-orange-700 dark:text-orange-300">
                                        {selectedStoreId ? <Store className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Cửa hàng làm việc</p>
                                        <p className="font-bold text-gray-900 dark:text-white truncate text-sm">
                                            {currentStore?.name || 'Tất cả chi nhánh'}
                                        </p>
                                    </div>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-orange-600 transition-transform duration-200 ${isStoreDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {isStoreDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsStoreDropdownOpen(false)} />
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-20 py-2 animate-fadeIn max-h-60 overflow-y-auto w-full">
                                        <button
                                            onClick={() => {
                                                setSelectedStoreId(null);
                                                setIsStoreDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2 ${!selectedStoreId ? 'bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'}`}
                                        >
                                            <Layers className="w-4 h-4" />
                                            <span className="text-sm font-medium truncate">Tất cả chi nhánh</span>
                                            {!selectedStoreId && <CheckCircle className="w-4 h-4 ml-auto" />}
                                        </button>

                                        {stores.length > 0 && stores.map((store) => (
                                            <button
                                                key={store.id}
                                                onClick={() => {
                                                    setSelectedStoreId(store.id);
                                                    setIsStoreDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2 ${selectedStoreId === store.id ? 'bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                <Store className="w-4 h-4" />
                                                <span className="text-sm font-medium truncate">{store.name}</span>
                                                {selectedStoreId === store.id && <CheckCircle className="w-4 h-4 ml-auto" />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
                        <div className="px-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Hệ thống
                        </div>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-orange-600 dark:hover:text-orange-400'
                                        }`}
                                >
                                    <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-orange-500 dark:group-hover:text-orange-400'}`} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}

                        <div className="px-2 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Vận hành
                        </div>
                        {manageItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-orange-600 dark:hover:text-orange-400'
                                        }`}
                                >
                                    <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-orange-500 dark:group-hover:text-orange-400'}`} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-4 shrink-0 lg:block hidden">
                        <div className="flex items-center justify-between px-2">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Thông báo</span>
                            <NotificationBell />
                        </div>
                        <div className="flex items-center gap-3 mb-2 px-2">
                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold border border-orange-200 dark:border-orange-800">
                                {user.displayName?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.displayName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Administrator</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-72 min-h-screen pt-20 lg:pt-8 p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe z-40 flex items-center justify-around px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <Link
                    href="/admin"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/admin' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <LayoutDashboard className="w-6 h-6" strokeWidth={pathname === '/admin' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Tổng quan</span>
                </Link>
                <Link
                    href="/admin/stores"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/admin/stores' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <Store className="w-6 h-6" strokeWidth={pathname === '/admin/stores' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Cửa hàng</span>
                </Link>
                <Link
                    href="/admin/users"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/admin/users' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <Users className="w-6 h-6" strokeWidth={pathname === '/admin/users' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Người dùng</span>
                </Link>
                <Link
                    href="/admin/shifts"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/admin/shifts' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <Clock className="w-6 h-6" strokeWidth={pathname === '/admin/shifts' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Ca làm</span>
                </Link>
                <Link
                    href="/admin/settings"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/admin/settings' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <Settings className="w-6 h-6" strokeWidth={pathname === '/admin/settings' ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Cài đặt</span>
                </Link>
            </nav>
        </div>
    );
}
