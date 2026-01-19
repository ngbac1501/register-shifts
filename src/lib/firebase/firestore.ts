import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    QueryConstraint,
    DocumentData,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// Generic CRUD operations

// Create document
export const createDocument = async <T extends DocumentData>(
    collectionName: string,
    data: Omit<T, 'id' | 'createdAt'>
): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error: any) {
        throw new Error(`Failed to create document: ${error.message}`);
    }
};

// Read single document
export const getDocument = async <T extends DocumentData>(
    collectionName: string,
    documentId: string
): Promise<T | null> => {
    try {
        const docRef = doc(db, collectionName, documentId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data(),
            } as unknown as T;
        }

        return null;
    } catch (error: any) {
        throw new Error(`Failed to get document: ${error.message}`);
    }
};

// Read multiple documents with query
export const getDocuments = async <T extends DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[] = []
): Promise<T[]> => {
    try {
        const q = query(collection(db, collectionName), ...constraints);
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as unknown as T[];
    } catch (error: any) {
        throw new Error(`Failed to get documents: ${error.message}`);
    }
};

// Update document
export const updateDocument = async <T extends DocumentData>(
    collectionName: string,
    documentId: string,
    data: Partial<T>
): Promise<void> => {
    try {
        const docRef = doc(db, collectionName, documentId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });
    } catch (error: any) {
        throw new Error(`Failed to update document: ${error.message}`);
    }
};

// Delete document
export const deleteDocument = async (
    collectionName: string,
    documentId: string
): Promise<void> => {
    try {
        const docRef = doc(db, collectionName, documentId);
        await deleteDoc(docRef);
    } catch (error: any) {
        throw new Error(`Failed to delete document: ${error.message}`);
    }
};

// Collection-specific helpers

// Users
export const getUsersByRole = async (role: string) => {
    return getDocuments('users', [where('role', '==', role)]);
};

export const getUsersByStore = async (storeId: string) => {
    return getDocuments('users', [where('storeId', '==', storeId)]);
};

// Stores
export const getActiveStores = async () => {
    return getDocuments('stores', [where('isActive', '==', true)]);
};

// Shifts
export const getActiveShifts = async () => {
    return getDocuments('shifts', [where('isActive', '==', true)]);
};

// Schedules
export const getSchedulesByEmployee = async (employeeId: string) => {
    return getDocuments('schedules', [
        where('employeeId', '==', employeeId),
        orderBy('date', 'desc'),
    ]);
};

export const getSchedulesByStore = async (storeId: string) => {
    return getDocuments('schedules', [
        where('storeId', '==', storeId),
        orderBy('date', 'desc'),
    ]);
};

export const getPendingSchedules = async (storeId: string) => {
    return getDocuments('schedules', [
        where('storeId', '==', storeId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
    ]);
};

export const getSchedulesByDateRange = async (
    storeId: string,
    startDate: Date,
    endDate: Date
) => {
    return getDocuments('schedules', [
        where('storeId', '==', storeId),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'asc'),
    ]);
};

// Shift Swaps
export const getPendingSwaps = async () => {
    return getDocuments('shift_swaps', [
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
    ]);
};

export const getSwapsByEmployee = async (employeeId: string) => {
    return getDocuments('shift_swaps', [
        where('fromEmployeeId', '==', employeeId),
        orderBy('createdAt', 'desc'),
    ]);
};
