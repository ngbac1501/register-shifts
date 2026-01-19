# Hệ Thống Quản Lý Ca Làm Việc Epatta Coffee & Tea

Ứng dụng web quản lý ca làm việc hoàn chỉnh cho chuỗi cà phê Epatta Coffee & Tea, được xây dựng với Next.js 14, Firebase và Tailwind CSS.

## ✨ Tính Năng

### 🔐 Phân Quyền Người Dùng

**Admin** - Quản trị viên hệ thống
- Quản lý toàn bộ chuỗi cửa hàng
- Thêm/sửa/xóa cửa hàng, quản lý, nhân viên
- Xem báo cáo tổng hợp toàn hệ thống
- Cấu hình ca làm việc và chính sách

**Manager** - Quản lý cửa hàng
- Quản lý ca làm việc của cửa hàng mình phụ trách
- Duyệt/từ chối yêu cầu đăng ký ca
- Tạo lịch làm việc tự động/thủ công
- Xem báo cáo nhân sự cửa hàng

**Employee** - Nhân viên cửa hàng
- Đăng ký ca làm việc
- Xem lịch làm việc cá nhân
- Yêu cầu đổi ca với đồng nghiệp
- Xem tổng số giờ làm và lương dự kiến

### ⏰ Ca Làm Việc

**Ca chính (Full-time - 8 tiếng):**
- Ca sáng: 06:30 - 14:30
- Ca chiều: 14:30 - 22:30
- Ca đêm: 22:30 - 06:30

**Ca Part-time (linh động < 8 tiếng):**
- Part-time sáng: 08:00 - 12:00
- Part-time chiều: 16:00 - 20:00

## 🛠️ Tech Stack

- **Frontend:** Next.js 14+ (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4, Custom Coffee Theme
- **State Management:** Zustand
- **Data Fetching:** Custom Firestore Hooks với Real-time Listeners
- **Forms:** React Hook Form + Zod Validation
- **Backend:** Firebase (Authentication + Firestore)
- **Icons:** Lucide React
- **Date Handling:** date-fns

## 📦 Installation

### Prerequisites

- Node.js 18+ và npm
- Firebase project với Firestore và Authentication enabled

### Setup

1. **Clone repository**
```bash
git clone <your-repo-url>
cd my-project
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase**

Tạo file `.env.local` từ template:
```bash
cp .env.local.example .env.local
```

Cập nhật các biến môi trường trong `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. **Deploy Firestore Security Rules**
```bash
firebase deploy --only firestore:rules
```

5. **Run development server**
```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trong browser.

## 🔥 Firebase Setup

### 1. Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Tạo project mới
3. Enable Authentication (Email/Password)
4. Enable Firestore Database

### 2. Firestore Collections

Hệ thống sử dụng các collections sau:

- `users` - Thông tin người dùng (admin, manager, employee)
- `stores` - Danh sách cửa hàng
- `shifts` - Cấu hình ca làm việc
- `schedules` - Lịch làm việc đã đăng ký
- `shift_swaps` - Yêu cầu đổi ca

### 3. Seed Initial Data

Tạo tài khoản admin đầu tiên:

```javascript
// Sử dụng Firebase Console hoặc script
{
  email: "admin@epatta.com",
  password: "123456",
  displayName: "Admin Epatta",
  role: "admin"
}
```

## 🎨 UI/UX Features

- **Modern Design** - Gradient backgrounds, smooth animations
- **Coffee Theme** - Màu sắc ấm áp phù hợp với thương hiệu cà phê
- **Responsive** - Hoạt động tốt trên desktop, tablet, mobile
- **Real-time Updates** - Dữ liệu cập nhật tức thì với Firestore listeners
- **Loading States** - Skeleton screens và loading indicators
- **Empty States** - Thông báo thân thiện khi không có dữ liệu

## 📱 Demo Accounts

Sau khi seed data, bạn có thể đăng nhập với:

- **Admin:** admin@epatta.com / 123456
- **Manager:** manager1@epatta.com / 123456
- **Employee:** employee1@epatta.com / 123456

## 🚀 Deployment

### Vercel (Recommended)

```bash
npm run build
vercel deploy
```

### Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

## 📁 Project Structure

```
my-project/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Admin dashboard
│   │   ├── manager/           # Manager dashboard
│   │   ├── employee/          # Employee dashboard
│   │   └── login/             # Login page
│   ├── components/            # Shared components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities & Firebase
│   │   ├── firebase/         # Firebase config & helpers
│   │   ├── validations/      # Zod schemas
│   │   └── utils.ts          # Utility functions
│   ├── store/                # Zustand stores
│   ├── styles/               # Global styles
│   └── types/                # TypeScript types
├── firestore.rules           # Firestore security rules
└── package.json
```

## 🔒 Security

- Firebase Security Rules đảm bảo role-based access control
- Protected routes kiểm tra authentication và role
- Input validation với Zod schemas
- Secure password hashing với Firebase Auth

## 🎯 Roadmap

- [ ] Calendar view với drag-and-drop
- [ ] Auto-scheduling algorithm
- [ ] Shift trading marketplace
- [ ] Push notifications
- [ ] Export reports (PDF/Excel)
- [ ] Mobile app (React Native)
- [ ] Multi-language support (i18n)
- [ ] Dark mode
- [ ] Analytics dashboard

## 📄 License

MIT License

## 👥 Contributors

Được phát triển bởi Gemini AI Assistant

---

**Epatta Coffee & Tea** - Hệ thống quản lý ca làm việc hiện đại 🚀☕
