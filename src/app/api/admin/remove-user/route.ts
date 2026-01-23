import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const { uid } = await request.json();

        if (!uid) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Ideally, we should verify the caller is an admin here using session/token verification.
        // For now, relying on client-side Admin check, but this route should be protected in production.

        await adminAuth.deleteUser(uid);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting auth user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
