import {
    doc,
    runTransaction,
    Timestamp,
    updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Approve a shift swap request
 * This performs a transaction to:
 * 1. Verify the swap and schedule still exist and are valid.
 * 2. Update the ShiftSwap status to 'approved'.
 * 3. Update the Schedule's employeeId to the new employee (toEmployeeId).
 * 4. Update the Schedule's assignedBy/approvedBy fields.
 */
export async function approveShiftSwap(
    swapId: string,
    managerId: string
): Promise<void> {
    try {
        await runTransaction(db, async (transaction) => {
            const swapRef = doc(db, 'shift_swaps', swapId);
            const swapSnap = await transaction.get(swapRef);

            if (!swapSnap.exists()) {
                throw new Error('Shift swap request not found');
            }

            const swapData = swapSnap.data();
            if (swapData.status !== 'pending') {
                throw new Error('Swap request is no longer pending');
            }

            if (!swapData.toEmployeeId) {
                throw new Error('No target employee selected for this swap');
            }

            const scheduleRef = doc(db, 'schedules', swapData.scheduleId);
            const scheduleSnap = await transaction.get(scheduleRef);

            if (!scheduleSnap.exists()) {
                throw new Error('Associated schedule not found');
            }

            // 1. Update Shift Swap Status
            transaction.update(swapRef, {
                status: 'approved',
                approvedBy: managerId,
                updatedAt: Timestamp.now(),
            });

            // 2. Update Schedule Owner
            transaction.update(scheduleRef, {
                employeeId: swapData.toEmployeeId,
                assignedBy: managerId, // Or we could keep track of original owner somewhere if needed
                updatedAt: Timestamp.now(),
                // Optional: add a note or flag that this was swapped
                metadata: {
                    swappedFrom: swapData.fromEmployeeId,
                    swapId: swapId,
                    swappedAt: Timestamp.now()
                }
            });
        });
    } catch (error) {
        console.error('Error approving shift swap:', error);
        throw error;
    }
}

/**
 * Reject a shift swap request
 */
export async function rejectShiftSwap(
    swapId: string,
    managerId: string,
    reason?: string
): Promise<void> {
    try {
        const swapRef = doc(db, 'shift_swaps', swapId);
        await updateDoc(swapRef, {
            status: 'rejected',
            approvedBy: managerId,
            rejectionReason: reason || null,
            updatedAt: Timestamp.now(),
        });
    } catch (error) {
        console.error('Error rejecting shift swap:', error);
        throw error;
    }
}
