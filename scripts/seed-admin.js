import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
    readFileSync(join(__dirname, '../firebase-service-account.json'), 'utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function seedData() {
    console.log('🌱 Starting to seed data with Admin SDK...\n');

    try {
        // 1. Get existing users from Authentication
        console.log('👤 Getting existing users...');
        const listUsersResult = await auth.listUsers();
        const userMap = {};

        listUsersResult.users.forEach(user => {
            const email = user.email;
            if (email) {
                userMap[email] = user.uid;
                console.log(`  ✅ Found user: ${email} (${user.uid})`);
            }
        });

        // 2. Create user documents in Firestore
        console.log('\n📝 Creating user documents in Firestore...');

        const users = [
            {
                email: 'admin@epatta.com',
                displayName: 'Admin Epatta',
                role: 'admin',
            },
            {
                email: 'manager1@epatta.com',
                displayName: 'Nguyễn Văn A',
                role: 'manager',
                phone: '0901234567',
                storeId: 'store1',
            },
            {
                email: 'manager2@epatta.com',
                displayName: 'Trần Thị B',
                role: 'manager',
                phone: '0902345678',
                storeId: 'store2',
            },
            {
                email: 'employee1@epatta.com',
                displayName: 'Phạm Thị D',
                role: 'employee',
                phone: '0904567890',
                employeeType: 'fulltime',
                hourlyRate: 35000,
                storeId: 'store1',
            },
            {
                email: 'employee2@epatta.com',
                displayName: 'Hoàng Văn E',
                role: 'employee',
                phone: '0905678901',
                employeeType: 'fulltime',
                hourlyRate: 35000,
                storeId: 'store2',
            },
            {
                email: 'employee3@epatta.com',
                displayName: 'Võ Thị F',
                role: 'employee',
                phone: '0906789012',
                employeeType: 'parttime',
                hourlyRate: 30000,
                storeId: 'store1',
            },
        ];

        for (const userData of users) {
            const userId = userMap[userData.email];
            if (userId) {
                await db.collection('users').doc(userId).set({
                    ...userData,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`  ✅ Created user doc: ${userData.email}`);
            } else {
                console.log(`  ⚠️  User not found in Auth: ${userData.email}`);
            }
        }

        // 3. Create stores
        console.log('\n🏪 Creating stores...');
        const stores = [
            {
                id: 'store1',
                name: 'Epatta Coffee Quận 1',
                address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
                managerId: userMap['manager1@epatta.com'] || '',
                isActive: true,
            },
            {
                id: 'store2',
                name: 'Epatta Tea Quận 3',
                address: '456 Võ Văn Tần, Quận 3, TP.HCM',
                managerId: userMap['manager2@epatta.com'] || '',
                isActive: true,
            },
            {
                id: 'store3',
                name: 'Epatta Coffee Thủ Đức',
                address: '789 Võ Văn Ngân, Thủ Đức, TP.HCM',
                managerId: userMap['manager1@epatta.com'] || '',
                isActive: true,
            },
        ];

        for (const store of stores) {
            const { id, ...storeData } = store;
            await db.collection('stores').doc(id).set({
                ...storeData,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`  ✅ Created store: ${storeData.name}`);
        }

        // 4. Create shifts
        console.log('\n⏰ Creating shifts...');
        const shifts = [
            {
                id: 'shift1',
                name: 'Ca sáng',
                startTime: '06:30',
                endTime: '14:30',
                duration: 8,
                type: 'fulltime',
                isActive: true,
            },
            {
                id: 'shift2',
                name: 'Ca chiều',
                startTime: '14:30',
                endTime: '22:30',
                duration: 8,
                type: 'fulltime',
                isActive: true,
            },
            {
                id: 'shift3',
                name: 'Ca đêm',
                startTime: '22:30',
                endTime: '06:30',
                duration: 8,
                type: 'fulltime',
                isActive: true,
            },
            {
                id: 'shift4',
                name: 'Part-time sáng',
                startTime: '08:00',
                endTime: '12:00',
                duration: 4,
                type: 'parttime',
                isActive: true,
            },
            {
                id: 'shift5',
                name: 'Part-time chiều',
                startTime: '16:00',
                endTime: '20:00',
                duration: 4,
                type: 'parttime',
                isActive: true,
            },
        ];

        for (const shift of shifts) {
            const { id, ...shiftData } = shift;
            await db.collection('shifts').doc(id).set(shiftData);
            console.log(`  ✅ Created shift: ${shiftData.name}`);
        }

        // 5. Create sample schedules
        console.log('\n📅 Creating sample schedules...');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const schedules = [
            {
                storeId: 'store1',
                employeeId: userMap['employee1@epatta.com'],
                shiftId: 'shift1',
                date: admin.firestore.Timestamp.fromDate(tomorrow),
                status: 'approved',
                requestedBy: userMap['employee1@epatta.com'],
                approvedBy: userMap['manager1@epatta.com'],
            },
            {
                storeId: 'store2',
                employeeId: userMap['employee2@epatta.com'],
                shiftId: 'shift2',
                date: admin.firestore.Timestamp.fromDate(tomorrow),
                status: 'pending',
                requestedBy: userMap['employee2@epatta.com'],
            },
        ];

        for (const schedule of schedules) {
            if (schedule.employeeId) {
                await db.collection('schedules').add({
                    ...schedule,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`  ✅ Created schedule for employee`);
            }
        }

        console.log('\n✨ Seeding completed successfully!');
        console.log('\n📝 Summary:');
        console.log(`  - Users: ${Object.keys(userMap).length}`);
        console.log(`  - Stores: ${stores.length}`);
        console.log(`  - Shifts: ${shifts.length}`);
        console.log(`  - Schedules: ${schedules.length}`);
        console.log('\n🔐 Login credentials:');
        console.log('  Admin: admin@epatta.com / 123456');
        console.log('  Manager: manager1@epatta.com / 123456');
        console.log('  Employee: employee1@epatta.com / 123456');
        console.log('\n🌐 Open: http://localhost:3000');

    } catch (error) {
        console.error('❌ Error seeding data:', error);
    }

    process.exit(0);
}

seedData();
