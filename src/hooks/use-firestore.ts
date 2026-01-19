'use client';

import { useEffect, useState } from 'react';
import {
    collection,
    query,
    onSnapshot,
    QueryConstraint,
    DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export const useCollection = <T extends DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[] = []
) => {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, collectionName), ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const documents = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as unknown as T[];

                setData(documents);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Firestore error:', err);
                setError(err as Error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [collectionName, JSON.stringify(constraints)]);

    return { data, loading, error };
};

export const useDocument = <T extends DocumentData>(
    collectionName: string,
    documentId: string | null
) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!documentId) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const docRef = collection(db, collectionName);

        const unsubscribe = onSnapshot(
            query(docRef),
            (snapshot) => {
                const doc = snapshot.docs.find((d) => d.id === documentId);

                if (doc) {
                    setData({
                        id: doc.id,
                        ...doc.data(),
                    } as unknown as T);
                } else {
                    setData(null);
                }

                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Firestore error:', err);
                setError(err as Error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [collectionName, documentId]);

    return { data, loading, error };
};
