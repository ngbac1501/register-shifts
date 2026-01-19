'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getCurrentUser } from '@/lib/firebase/auth';
import { useAuthStore } from '@/store/auth-store';

export const useAuth = () => {
    const { user, firebaseUser, loading, setUser, setFirebaseUser, setLoading } = useAuthStore();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setFirebaseUser(firebaseUser);

            if (firebaseUser) {
                const userData = await getCurrentUser(firebaseUser);
                setUser(userData);
            } else {
                setUser(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, [setUser, setFirebaseUser, setLoading]);

    return {
        user,
        firebaseUser,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isManager: user?.role === 'manager',
        isEmployee: user?.role === 'employee',
    };
};
