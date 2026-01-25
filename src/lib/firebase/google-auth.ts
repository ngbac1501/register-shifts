import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import type { User } from '@/types';

export async function signInWithGoogle() {
    try {
        // Sign in with Google popup
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;

        // Check if user exists in Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            // Existing user - return user data
            return {
                isNewUser: false,
                user: userDoc.data() as User
            };
        } else {
            // New user - create basic user document without storeId
            const newUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                photoURL: firebaseUser.photoURL || '',
                role: 'employee', // Default role
                // storeId will be set after store selection
                createdAt: new Date()
            };

            await setDoc(userDocRef, newUser);

            return {
                isNewUser: true,
                user: newUser
            };
        }
    } catch (error: any) {
        console.error('Google sign-in error:', error);
        throw error;
    }
}
