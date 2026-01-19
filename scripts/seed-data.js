import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCeasdqs56fGNLj9R4I0JKm1oWTE7_L7bU",
    authDomain: "register-cfde0.firebaseapp.com",
    projectId: "register-cfde0",
    storageBucket: "register-cfde0.firebasestorage.app",
    messagingSenderId: "306115533590",
    appId: "1:306115533590:web:99cbf59ac386098af84e37",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Sample data
const users = [
    {
        email: 'admin@epatta.com',
        password: '123456',
        displayName: 'Admin Epatta',
        role: 'admin',
    },
    {
        email: 'manager1@epatta.com',
        password: '123456',
        displayName: 'Nguyễn Văn A',
        role: 'manager',
        phone: '0901234567',
    },
    {
        email: 'manager2@epatta.com',
        password: '123456',
        displayName: 'Trần Thị B',
        role: 'manager',
        phone: '0902345678',
    },
    {
        email: 'employee1@epatta.com',
        password: '123456',
        displayName: 'Phạm Thị D',
        role: 'employee',
        phone: '0904567890',
        employeeType: 'fulltime',
        hourlyRate: 35000,
    },
    {
        email: 'employee2@epatta.com',
        password: '123456',
        displayName: 'Hoàng Văn E',
        role: 'employee',
        phone: '0905678901',
        employeeType: 'fulltime',
        hourlyRate: 35000,
    },
    {
        email: 'employee3@epatta.com',
        password: '123456',
        displayName: 'Võ Thị F',
        role: 'employee',
        phone: '0906789012',
        employeeType: 'parttime',
        hourlyRate: 30000,
    },
];

const shifts = [
    {
        name: 'Ca sáng',
        startTime: '06:30',
        endTime: '14:30',
        duration: 8,
        type: 'fulltime',
        isActive: true,
    },
    {
        name: 'Ca chiều',
        startTime: '14:30',
        endTime: '22:30',
        duration: 8,
        type: 'fulltime',
        isActive: true,
    },
    {
        name: 'Ca đêm',
        startTime: '22:30',
        endTime: '06:30',
        duration: 8,
        type: 'fulltime',
        isActive: true,
    },
    {
        name: 'Part-time sáng',
        startTime: '08:00',
        endTime: '12:00',
        duration: 4,
        type: 'parttime',
        isActive: true,
    },
    {
        name: 'Part-time chiều',
        startTime: '16:00',
        endTime: '20:00',
        duration: 4,
        type: 'parttime',
        isActive: true,
    },
];

async function seedData() {
    console.log('🌱 Starting to seed data...\n');

    try {
        // 1. Create users and get their IDs
        console.log('👤 Creating users...');
        const userIds = {};

        for (const userData of users) {
            try {
                const { email, password, ...userInfo } = userData;
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const userId = userCredential.user.uid;
                userIds[email] = userId;

                // Create user document in Firestore
                await setDoc(doc(db, 'users', userId), {
                    email,
                    ...userInfo,
                    createdAt: serverTimestamp(),
                });

                console.log(`  ✅ Created user: ${email} (${userInfo.role})`);
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    console.log(`  ⚠️  User already exists: ${userData.email}`);
                } else {
                    console.error(`  ❌ Error creating user ${userData.email}:`, error.message);
                }
            }
        }

        // 2. Create stores
        console.log('\n🏪 Creating stores...');
        const stores = [
            {
                id: 'store1',
                name: 'Epatta Coffee Quận 1',
                address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
                managerId: userIds['manager1@epatta.com'] || 'placeholder',
                isActive: true,
            },
            {
                id: 'store2',
                name: 'Epatta Tea Quận 3',
                address: '456 Võ Văn Tần, Quận 3, TP.HCM',
                managerId: userIds['manager2@epatta.com'] || 'placeholder',
                isActive: true,
            },
            {
                id: 'store3',
                name: 'Epatta Coffee Thủ Đức',
                address: '789 Võ Văn Ngân, Thủ Đức, TP.HCM',
                managerId: userIds['manager1@epatta.com'] || 'placeholder',
                isActive: true,
            },
        ];

        for (const store of stores) {
            const { id, ...storeData } = store;
            await setDoc(doc(db, 'stores', id), {
                ...storeData,
                createdAt: serverTimestamp(),
            });
            console.log(`  ✅ Created store: ${storeData.name}`);
        }

        // Update managers and employees with storeId
        console.log('\n🔄 Updating users with store assignments...');
        if (userIds['manager1@epatta.com']) {
            await setDoc(doc(db, 'users', userIds['manager1@epatta.com']), {
                storeId: 'store1',
            }, { merge: true });
            console.log('  ✅ Assigned manager1 to store1');
        }

        if (userIds['manager2@epatta.com']) {
            await setDoc(doc(db, 'users', userIds['manager2@epatta.com']), {
                storeId: 'store2',
            }, { merge: true });
            console.log('  ✅ Assigned manager2 to store2');
        }

        // Assign employees to stores
        const employeeStoreMap = {
            'employee1@epatta.com': 'store1',
            'employee2@epatta.com': 'store2',
            'employee3@epatta.com': 'store1',
        };

        for (const [email, storeId] of Object.entries(employeeStoreMap)) {
            if (userIds[email]) {
                await setDoc(doc(db, 'users', userIds[email]), {
                    storeId,
                }, { merge: true });
                console.log(`  ✅ Assigned ${email} to ${storeId}`);
            }
        }

        // 3. Create shifts
        console.log('\n⏰ Creating shifts...');
        for (let i = 0; i < shifts.length; i++) {
            const shiftId = `shift${i + 1}`;
            await setDoc(doc(db, 'shifts', shiftId), shifts[i]);
            console.log(`  ✅ Created shift: ${shifts[i].name}`);
        }

        console.log('\n✨ Seeding completed successfully!');
        console.log('\n📝 Summary:');
        console.log(`  - Users created: ${Object.keys(userIds).length}`);
        console.log(`  - Stores created: ${stores.length}`);
        console.log(`  - Shifts created: ${shifts.length}`);
        console.log('\n🔐 Login credentials:');
        console.log('  Admin: admin@epatta.com / 123456');
        console.log('  Manager: manager1@epatta.com / 123456');
        console.log('  Employee: employee1@epatta.com / 123456');

    } catch (error) {
        console.error('❌ Error seeding data:', error);
    }

    process.exit(0);
}

seedData();
