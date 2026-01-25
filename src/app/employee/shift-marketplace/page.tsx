'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCollection } from '@/hooks/use-firestore';
import type { ShiftSwapEnhanced, Schedule, User, Shift } from '@/types';
import { addDoc, collection, updateDoc, doc, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Calendar, Clock, Users, Plus, X, CheckCircle, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function ShiftMarketplacePage() {
    const { user } = useAuth();
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
    const [reason, setReason] = useState('');
    const [expiryDays, setExpiryDays] = useState(3);
    const [loading, setLoading] = useState(false);

    // Memoize query constraints to prevent infinite loops
    // Timestamp.now() changes on every render, causing useCollection to re-subscribe infinitely
    const marketplaceConstraints = useMemo(() => {
        if (!user?.storeId) return [];
        return [
            where('isMarketplace', '==', true),
            where('status', '==', 'pending'),
            where('storeId', '==', user.storeId)
        ];
    }, [user?.storeId]);

    const scheduleConstraints = useMemo(() => {
        if (!user?.id) return [];
        return [
            where('employeeId', '==', user.id),
            where('status', '==', 'approved'),
            where('date', '>=', Timestamp.fromDate(new Date())) // Use stable Date instead of Timestamp.now()
        ];
    }, [user?.id]);

    // Get marketplace swaps
    const { data: marketplaceSwaps, loading: swapsLoading } = useCollection<ShiftSwapEnhanced>(
        'shift_swaps',
        marketplaceConstraints
    );

    // Get my upcoming schedules (approved only)
    const { data: mySchedules } = useCollection<Schedule>(
        'schedules',
        scheduleConstraints
    );

    // Get all users for display
    const { data: users } = useCollection<User>('users', []);
    const { data: shifts } = useCollection<Shift>('shifts', []);

    const userMap = new Map(users?.map(u => [u.id, u]) || []);
    const shiftMap = new Map(shifts?.map(s => [s.id, s]) || []);

    const handlePostToMarketplace = async () => {
        if (!user || !selectedScheduleId) {
            toast.error('Vui lòng chọn ca làm việc');
            return;
        }

        setLoading(true);
        try {
            const schedule = mySchedules?.find(s => s.id === selectedScheduleId);
            if (!schedule) {
                toast.error('Không tìm thấy ca làm việc');
                return;
            }

            const shift = shiftMap.get(schedule.shiftId);
            const expiresAt = Timestamp.fromDate(addDays(new Date(), expiryDays));

            await addDoc(collection(db, 'shift_swaps'), {
                type: 'marketplace',
                fromEmployeeId: user.id,
                storeId: user.storeId, // Add storeId for filtering
                scheduleId: selectedScheduleId,
                shiftDetails: {
                    date: schedule.date,
                    shiftName: shift?.name || 'Unknown',
                    startTime: schedule.startTime || shift?.startTime || '',
                    endTime: schedule.endTime || shift?.endTime || '',
                },
                reason: reason || 'Không thể làm ca này',
                status: 'pending',
                isMarketplace: true,
                interestedEmployees: [],
                createdAt: Timestamp.now(),
                expiresAt,
            });

            toast.success('Đã đăng ca lên marketplace!');
            setIsPostModalOpen(false);
            setSelectedScheduleId('');
            setReason('');
            setExpiryDays(3);
        } catch (error) {
            console.error('Error posting to marketplace:', error);
            toast.error('Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const handleClaimShift = async (swapId: string, fromEmployeeId: string) => {
        if (!user) return;

        if (user.id === fromEmployeeId) {
            toast.error('Bạn không thể nhận ca của chính mình');
            return;
        }

        try {
            const swapRef = doc(db, 'shift_swaps', swapId);
            await updateDoc(swapRef, {
                toEmployeeId: user.id,
                interestedEmployees: [user.id],
                updatedAt: Timestamp.now(),
            });

            toast.success('Đã gửi yêu cầu nhận ca! Chờ manager duyệt.');
        } catch (error) {
            console.error('Error claiming shift:', error);
            toast.error('Có lỗi xảy ra');
        }
    };

    const handleCancelPost = async (swapId: string) => {
        if (!user) return;

        try {
            const swapRef = doc(db, 'shift_swaps', swapId);
            await updateDoc(swapRef, {
                status: 'rejected',
                updatedAt: Timestamp.now(),
            });

            toast.success('Đã hủy đăng ca');
        } catch (error) {
            console.error('Error cancelling post:', error);
            toast.error('Có lỗi xảy ra');
        }
    };

    // Filter my posted swaps
    const myPostedSwaps = marketplaceSwaps?.filter(s => s.fromEmployeeId === user?.id) || [];
    const availableSwaps = marketplaceSwaps?.filter(s => s.fromEmployeeId !== user?.id) || [];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Chợ đổi ca
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Đăng ca bạn không thể làm hoặc nhận ca từ người khác
                    </p>
                </div>
                <button
                    onClick={() => setIsPostModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">Đăng ca</span>
                </button>
            </div>

            {/* My Posted Shifts */}
            {myPostedSwaps.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Ca của tôi đã đăng ({myPostedSwaps.length})
                        </h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myPostedSwaps.map((swap) => {
                            const shift = swap.shiftDetails;
                            const interestedCount = swap.interestedEmployees?.length || 0;
                            const claimed = swap.toEmployeeId ? userMap.get(swap.toEmployeeId) : null;

                            return (
                                <div key={swap.id} className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-700">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {shift.shiftName}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleCancelPost(swap.id)}
                                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                            title="Hủy đăng"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Calendar className="w-4 h-4" />
                                            {format(
                                                shift.date instanceof Date ? shift.date : (shift.date as any).toDate?.() || new Date(),
                                                'dd/MM/yyyy (EEEE)',
                                                { locale: vi }
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Clock className="w-4 h-4" />
                                            {shift.startTime} - {shift.endTime}
                                        </div>
                                        {claimed ? (
                                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                                                <CheckCircle className="w-4 h-4" />
                                                Đã có người nhận: {claimed.displayName}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                <Users className="w-4 h-4" />
                                                {interestedCount} người quan tâm
                                            </div>
                                        )}
                                    </div>
                                    {swap.reason && (
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 italic">
                                            "{swap.reason}"
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Available Shifts */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Ca có sẵn ({availableSwaps.length})
                    </h2>
                </div>
                <div className="p-6">
                    {swapsLoading ? (
                        <div className="text-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                            <p className="text-gray-500">Đang tải...</p>
                        </div>
                    ) : availableSwaps.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Chưa có ca nào được đăng</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableSwaps.map((swap) => {
                                const fromEmployee = userMap.get(swap.fromEmployeeId);
                                const shift = swap.shiftDetails;
                                const isClaimed = !!swap.toEmployeeId;
                                const isClaimedByMe = swap.toEmployeeId === user?.id;

                                return (
                                    <div key={swap.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-700">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                        {shift.shiftName}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Từ: {fromEmployee?.displayName || 'Unknown'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-sm mb-4">
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                <Calendar className="w-4 h-4" />
                                                {format(
                                                    shift.date instanceof Date ? shift.date : (shift.date as any).toDate?.() || new Date(),
                                                    'dd/MM/yyyy (EEEE)',
                                                    { locale: vi }
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                <Clock className="w-4 h-4" />
                                                {shift.startTime} - {shift.endTime}
                                            </div>
                                        </div>
                                        {swap.reason && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-4">
                                                "{swap.reason}"
                                            </p>
                                        )}
                                        {isClaimed ? (
                                            <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-lg text-sm font-medium text-center">
                                                {isClaimedByMe ? 'Bạn đã nhận ca này' : 'Đã có người nhận'}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleClaimShift(swap.id, swap.fromEmployeeId)}
                                                className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all"
                                            >
                                                Nhận ca này
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Post Modal */}
            {isPostModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Đăng ca lên marketplace
                            </h2>
                            <button
                                onClick={() => setIsPostModalOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Chọn ca làm việc <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedScheduleId}
                                    onChange={(e) => setSelectedScheduleId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white"
                                    required
                                >
                                    <option value="">-- Chọn ca --</option>
                                    {mySchedules?.map((schedule) => {
                                        const shift = shiftMap.get(schedule.shiftId);
                                        const dateObj = schedule.date instanceof Date ? schedule.date : (schedule.date as any).toDate?.() || new Date();
                                        const startTime = schedule.startTime || shift?.startTime;
                                        const endTime = schedule.endTime || shift?.endTime;
                                        return (
                                            <option key={schedule.id} value={schedule.id}>
                                                {shift?.name} - {format(dateObj, 'dd/MM/yyyy', { locale: vi })} ({startTime} - {endTime})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Lý do (tùy chọn)
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white resize-none"
                                    placeholder="Vì sao bạn không thể làm ca này?"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Hết hạn sau (ngày)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="7"
                                    value={expiryDays}
                                    onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:text-white"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsPostModalOpen(false)}
                                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handlePostToMarketplace}
                                    disabled={loading || !selectedScheduleId}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Đang đăng...' : 'Đăng ca'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
