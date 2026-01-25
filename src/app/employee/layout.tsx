'use client';

import { useAuth } from '@/hooks/use-auth';
import { useDocument } from '@/hooks/use-firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard,
    Calendar,
    PlusCircle,
    History,
    LogOut,
    Store,
    FileText,
    Settings,
    MoreHorizontal,
    Bell,
    Repeat
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Store as StoreType } from '@/types';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { data: store } = useDocument<StoreType>('stores', user?.storeId || '');

    useEffect(() => {
        if (!loading && (!user || user.role !== 'employee')) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) return null; // Or skeleton
    if (!user || user.role !== 'employee') return null;

    const navItems = [
        { href: '/employee', icon: LayoutDashboard, label: 'Home' },
        { href: '/employee/schedule', icon: Calendar, label: 'Lịch' },
        { href: '/employee/register', icon: PlusCircle, label: 'Đăng ký', highlight: true },
        { href: '/employee/shift-marketplace', icon: Repeat, label: 'Đổi ca' },
        { href: '/employee/settings', icon: Settings, label: 'Cài đặt' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 lg:pb-0">
            {/* Desktop Sidebar - Hidden on Mobile */}
            <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-screen w-72 flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-6 flex items-center justify-center border-b border-gray-100 dark:border-gray-700 h-32">
                    <Image src="/logoEpatta.png" alt="Epatta" width={180} height={100} className="h-[100px] w-auto object-contain" />
                </div>

                {store && (
                    <div className="px-6 py-4">
                        <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800">
                            <Store className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <div>
                                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Cửa hàng</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{store.name}</p>
                            </div>
                        </div>
                    </div>
                )}

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400'}`} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                    <Link
                        href="/employee/requests"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${pathname === '/employee/requests'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <FileText className={`w-5 h-5 mr-3 ${pathname === '/employee/requests' ? 'text-white' : 'text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400'}`} />
                        <span className="font-medium">Ca đã đăng ký</span>
                    </Link>
                    <Link
                        href="/employee/leaves"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${pathname === '/employee/leaves'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <Calendar className={`w-5 h-5 mr-3 ${pathname === '/employee/leaves' ? 'text-white' : 'text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400'}`} />
                        <span className="font-medium">Nghỉ phép</span>
                    </Link>
                    <Link
                        href="/employee/history"
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${pathname === '/employee/history'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        <History className={`w-5 h-5 mr-3 ${pathname === '/employee/history' ? 'text-white' : 'text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400'}`} />
                        <span className="font-medium">Lịch sử & Lương</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Thông báo</span>
                        <NotificationBell align="left" direction="up" />
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
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        </div>
                        <button
                            onClick={async () => {
                                const { signOut } = await import('@/lib/firebase/auth');
                                await signOut();
                                router.push('/login');
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Đăng xuất"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Top Bar */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Image src="/logoEpatta.png" alt="Epatta" width={40} height={40} className="w-10 h-10 object-contain" />
                    <span className="font-bold text-lg text-gray-900 dark:text-white">Epatta</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell align="right" direction="down" />
                    <button
                        onClick={async () => {
                            const { signOut } = await import('@/lib/firebase/auth');
                            await signOut();
                            router.push('/login');
                        }}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        title="Đăng xuất"
                    >
                        <LogOut className="w-6 h-6" />
                    </button>
                    <Link href="/employee/settings" className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 ml-1">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600">
                            <img
                                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=random`}
                                alt={user.displayName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="lg:ml-72 min-h-screen pt-20 lg:pt-8 p-4 lg:p-8 max-w-7xl mx-auto">
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe z-40 flex items-center justify-around px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                {navItems.slice(0, 5).map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            {item.highlight ? (
                                <div className={`p-2 rounded-full -mt-6 shadow-lg ${isActive ? 'bg-purple-600 text-white' : 'bg-purple-600 text-white'}`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                            ) : (
                                <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                            )}
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    );
}
