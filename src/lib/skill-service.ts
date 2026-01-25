import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    Timestamp,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { EmployeeSkill, SkillLevel } from '@/types';

/**
 * Delete a skill
 * Note: This realistically should also check for and delete related employee_skills
 * or handle them appropriately. For now, we just delete the skill definition.
 */
export async function deleteSkill(skillId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'skills', skillId));

        // Optional: Clean up related employee skills
        // const q = query(collection(db, 'employee_skills'), where('skillId', '==', skillId));
        // const snapshot = await getDocs(q);
        // const batch = writeBatch(db);
        // snapshot.docs.forEach(d => batch.delete(d.ref));
        // await batch.commit();

    } catch (error) {
        console.error('Error deleting skill:', error);
        throw error;
    }
}

/**
 * Assign a skill to an employee
 */
export async function assignSkillToEmployee(
    employeeId: string,
    skillId: string,
    level: SkillLevel,
    certifierId?: string
): Promise<string> {
    try {
        // Check if employee already has this skill
        const q = query(
            collection(db, 'employee_skills'),
            where('employeeId', '==', employeeId),
            where('skillId', '==', skillId)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            throw new Error('Employee already has this skill');
        }

        const data = {
            employeeId,
            skillId,
            level,
            certifiedBy: certifierId,
            certifiedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, 'employee_skills'), data);
        return docRef.id;
    } catch (error) {
        console.error('Error assigning skill:', error);
        throw error;
    }
}
