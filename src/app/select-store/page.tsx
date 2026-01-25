'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { Store } from '@/types';
import { Loader2, Store as StoreIcon } from 'lucide-react';

export default function SelectStorePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Redirect if user already has a store
        if (!authLoading && user) {
            if (user.storeId) {
                const redirectPath = user.role === 'admin' ? '/admin'
                    : user.role === 'manager' ? '/manager'
                        : '/employee';
                router.push(redirectPath);
                return;
            }
        }

        // Redirect if not authenticated
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        // Fetch stores
        const fetchStores = async () => {
            try {
                const storesSnapshot = await getDocs(collection(db, 'stores'));
                const storesData = storesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Store[];
                setStores(storesData);
            } catch (error) {
                console.error('Error fetching stores:', error);
                toast.error('Không thể tải danh sách cửa hàng');
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading && user && !user.storeId) {
            fetchStores();
        }
    }, [user, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedStoreId) {
            toast.error('Vui lòng chọn cửa hàng');
            return;
        }

        if (!user) return;

        setSubmitting(true);

        try {
            // Update user document with selected store
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                storeId: selectedStoreId,
                updatedAt: new Date()
            });

            toast.success('Đã chọn cửa hàng thành công!');

            // Redirect to employee dashboard
            setTimeout(() => {
                window.location.href = '/employee';
            }, 500);
        } catch (error) {
            console.error('Error updating store:', error);
            toast.error('Có lỗi xảy ra khi cập nhật cửa hàng');
            setSubmitting(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                            <StoreIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Chọn cửa hàng làm việc
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Vui lòng chọn cửa hàng bạn đang làm việc
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="store" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Cửa hàng
                            </label>
                            <select
                                id="store"
                                value={selectedStoreId}
                                onChange={(e) => setSelectedStoreId(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            >
                                <option value="">-- Chọn cửa hàng --</option>
                                {stores.map((store) => (
                                    <option key={store.id} value={store.id}>
                                        {store.name} - {store.address}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !selectedStoreId}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                'Xác nhận'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
