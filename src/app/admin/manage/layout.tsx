'use client';

import { AdminStoreProvider } from '@/contexts/AdminStoreContext';
import { ReactNode } from 'react';

export default function AdminManageLayout({ children }: { children: ReactNode }) {
    return (
        <AdminStoreProvider>
            {children}
        </AdminStoreProvider>
    );
}
