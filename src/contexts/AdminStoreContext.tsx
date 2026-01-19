'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminStoreContextType {
    selectedStoreId: string | null;
    setSelectedStoreId: (storeId: string | null) => void;
}

const AdminStoreContext = createContext<AdminStoreContextType | undefined>(undefined);

export function AdminStoreProvider({ children }: { children: ReactNode }) {
    const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('adminSelectedStoreId');
        if (saved) {
            setSelectedStoreIdState(saved);
        }
    }, []);

    // Save to localStorage when changed
    const setSelectedStoreId = (storeId: string | null) => {
        setSelectedStoreIdState(storeId);
        if (storeId) {
            localStorage.setItem('adminSelectedStoreId', storeId);
        } else {
            localStorage.removeItem('adminSelectedStoreId');
        }
    };

    return (
        <AdminStoreContext.Provider value={{ selectedStoreId, setSelectedStoreId }}>
            {children}
        </AdminStoreContext.Provider>
    );
}

export function useAdminStore() {
    const context = useContext(AdminStoreContext);
    if (context === undefined) {
        throw new Error('useAdminStore must be used within AdminStoreProvider');
    }
    return context;
}
