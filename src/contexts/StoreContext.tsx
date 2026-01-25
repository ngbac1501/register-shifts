'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Store } from '@/types';

interface StoreContextType {
    selectedStoreId: string | null;
    setSelectedStoreId: (storeId: string | null) => void;
    stores: Store[];
    loading: boolean;
    currentStore: Store | undefined;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial load of selected store from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('selectedStoreId');
        if (saved) {
            setSelectedStoreIdState(saved);
        }
    }, []);

    // Fetch stores based on role
    useEffect(() => {
        if (!user) {
            setStores([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        let q;

        if (user.role === 'admin') {
            // Admin sees all stores
            q = query(collection(db, 'stores'), where('isActive', '==', true));
        } else if (user.role === 'manager') {
            // Manager sees only their stores
            q = query(collection(db, 'stores'), where('managerId', '==', user.id), where('isActive', '==', true));
        } else {
            // Employees usually belong to one store, but for context we might just fetch that one
            // However, this context is primarily for Admin/Manager switching. 
            // Employees might not need this complex logic if they are single-store.
            // But if we want consistency, we can fetch the store they belong to.
            if (user.storeId) {
                // Fetch just their store? Or maybe we don't need to fetch list for employee
                q = query(collection(db, 'stores'), where('id', '==', user.storeId)); // Note: 'id' field might not be indexed queryable like this usually docId. 
                // Actually easier to just return empty for employee if they don't switch
                setStores([]); // Employees don't switch stores usually
                setLoading(false);
                return;
            } else {
                setStores([]);
                setLoading(false);
                return;
            }
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const storeList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
            // Only update if stores have deeply changed to avoid loops? 
            // Actually simply setting state is fine if value is same? React optimizes.
            // But let's check length at least.
            setStores(storeList);

            // Auto-select logic
            setSelectedStoreIdState(prev => {
                // If selection exists and is valid, keep it
                if (prev && storeList.find(s => s.id === prev)) return prev;

                // If Admin, allow null (All Stores) as default/fallback
                if (user?.role === 'admin') return null;

                // For Managers/Others: Auto-select first store if available
                if (storeList.length > 0) return storeList[0].id;

                return prev;
            });

            setLoading(false);
        }, (error) => {
            console.error("Error fetching stores:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.role, user?.id]); // Re-run only when role or ID changes (primitives)

    // Save to localStorage when changed
    const setSelectedStoreId = (storeId: string | null) => {
        setSelectedStoreIdState(storeId);
        if (storeId) {
            localStorage.setItem('selectedStoreId', storeId);
        } else {
            localStorage.removeItem('selectedStoreId');
        }
    };

    const currentStore = stores.find(s => s.id === selectedStoreId);

    return (
        <StoreContext.Provider value={{ selectedStoreId, setSelectedStoreId, stores, loading, currentStore }}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStore must be used within StoreProvider');
    }
    return context;
}
