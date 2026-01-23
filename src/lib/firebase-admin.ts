import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export function getAdminApp() {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    // Check if we have credentials (runtime only)
    // This check is crucial for build time (static generation) where env vars might be missing
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        const serviceAccount = {
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };

        return initializeApp({
            credential: cert(serviceAccount),
        });
    }

    // Fallback for build time or missing credentials
    // This prevents build crashes but will throw at runtime if used
    return null;
}

// Proxy to delay initialization logic until the first property access
export const adminAuth = new Proxy({}, {
    get: (_target, prop) => {
        const app = getAdminApp();
        if (!app) {
            throw new Error('Firebase Admin not initialized. Check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY env vars.');
        }
        const auth = getAuth(app);
        return (auth as any)[prop];
    }
}) as ReturnType<typeof getAuth>;
