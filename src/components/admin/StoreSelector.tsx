'use client';

import { useAuth } from '@/hooks/use-auth';
import { useStore } from '@/contexts/StoreContext';
import { useCollection } from '@/hooks/use-firestore';
import { Store } from '@/types';
import { Store as StoreIcon, ChevronDown, Layers } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function StoreSelector() {
    const { user } = useAuth();
    const { selectedStoreId, setSelectedStoreId } = useStore();
    const { data: stores } = useCollection<Store>('stores');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedStore = stores?.find(s => s.id === selectedStoreId);

    // ... useEffect ...

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full md:w-auto flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-orange-200 dark:border-orange-800 rounded-xl hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        {selectedStoreId ? (
                            <StoreIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        ) : (
                            <Layers className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        )}
                    </div>
                    <div className="text-left">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Cửa hàng đang quản lý</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {selectedStore ? selectedStore.name : 'Tất cả chi nhánh'}
                        </p>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">

                    {stores && stores.length > 0 ? (
                        stores.map((store) => (
                            <button
                                key={store.id}
                                onClick={() => {
                                    setSelectedStoreId(store.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${selectedStoreId === store.id ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                                    }`}
                            >
                                <p className="font-semibold text-gray-900 dark:text-white">{store.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{store.address}</p>
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                            Không có cửa hàng nào
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
