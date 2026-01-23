import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        let requesterUid;

        try {
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            requesterUid = decodedToken.uid;
        } catch (error) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        const { targetUserId } = await request.json();
        if (!targetUserId) {
            return NextResponse.json({ error: 'Target User ID required' }, { status: 400 });
        }

        // Get requester info to check role
        const requesterDoc = await adminDb.collection('users').doc(requesterUid).get();
        if (!requesterDoc.exists) {
            return NextResponse.json({ error: 'Requester profile not found' }, { status: 403 });
        }
        const requesterData = requesterDoc.data();

        // Get target info
        const targetDoc = await adminDb.collection('users').doc(targetUserId).get();
        if (!targetDoc.exists) {
            // If user doc doesn't exist but Auth might, we might still want to allow Admin to clean up.
            // But strict RBAC requires knowing target role. 
            // If requester is Admin, we can proceed even if doc missing (just try auth delete).
            // If requester is Manager, we MUST verify target is their employee.
        }
        const targetData = targetDoc.exists ? targetDoc.data() : null;

        // RBAC Logic
        let allowed = false;

        if (requesterData?.role === 'admin') {
            allowed = true;
        } else if (requesterData?.role === 'manager') {
            // Manager can only delete employees of THEIR store
            if (targetData &&
                targetData.role === 'employee' &&
                targetData.storeId === requesterData.storeId) {
                allowed = true;
            } else {
                // Explicit denial if conditions met
                allowed = false;
            }
        }

        if (!allowed) {
            return NextResponse.json({ error: 'Permission denied: Insufficient privileges' }, { status: 403 });
        }

        // Perform Deletion
        const batch = adminDb.batch();

        // 1. Delete associated Schedules
        const schedulesSnap = await adminDb.collection('schedules').where('employeeId', '==', targetUserId).get();
        schedulesSnap.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 2. Delete Firestore User Document (if exists)
        if (targetDoc.exists) {
            batch.delete(adminDb.collection('users').doc(targetUserId));
        }

        await batch.commit();

        // 3. Delete Firebase Auth User
        // Note: This might fail if the user is already gone from Auth but exists in Firestore.
        // We should try/catch this specifically to not fail the whole request if DB part succeeded.
        try {
            await adminAuth.deleteUser(targetUserId);
        } catch (authError: any) {
            if (authError.code === 'auth/user-not-found') {
                // Ignore if already deleted
            } else {
                throw authError; // Rethrow other errors
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully deleted user ${targetUserId} and ${schedulesSnap.size} schedules.`
        });

    } catch (error: any) {
        console.error('Error in /api/users/delete:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
