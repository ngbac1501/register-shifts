import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { User, UserRole, EmployeeType } from '@/types';

// Sign up new user
export const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    additionalData?: {
        storeId?: string;
        phone?: string;
        employeeType?: EmployeeType;
        hourlyRate?: number;
    }
): Promise<User> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Create user document in Firestore
        const userData: any = {
            email,
            displayName,
            role,
            createdAt: serverTimestamp(),
            ...(additionalData?.storeId && { storeId: additionalData.storeId }),
            ...(additionalData?.phone && { phone: additionalData.phone }),
            ...(additionalData?.employeeType && { employeeType: additionalData.employeeType }),
            ...(additionalData?.hourlyRate && { hourlyRate: additionalData.hourlyRate }),
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), userData);

        return {
            id: firebaseUser.uid,
            ...userData,
            createdAt: new Date(),
        } as User;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to sign up');
    }
};

// Sign in existing user
export const signIn = async (email: string, password: string): Promise<User> => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

        if (!userDoc.exists()) {
            throw new Error('User data not found');
        }

        const userData = userDoc.data();

        return {
            id: firebaseUser.uid,
            ...userData,
        } as User;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to sign in');
    }
};

// Sign out
export const signOut = async (): Promise<void> => {
    try {
        await firebaseSignOut(auth);
    } catch (error: any) {
        throw new Error(error.message || 'Failed to sign out');
    }
};

// Get current user data
export const getCurrentUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

        if (!userDoc.exists()) {
            return null;
        }

        const userData = userDoc.data();

        return {
            id: firebaseUser.uid,
            ...userData,
        } as User;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
};
