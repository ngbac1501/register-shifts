# Firestore Database Schema

## Collections Structure

### users
Lưu trữ thông tin người dùng (admin, manager, employee)

```typescript
{
  id: string;                    // Auto-generated document ID
  email: string;                 // Email đăng nhập
  displayName: string;           // Tên hiển thị
  role: 'admin' | 'manager' | 'employee';  // Vai trò
  storeId?: string;              // ID cửa hàng (cho manager/employee)
  phone?: string;                // Số điện thoại
  employeeType?: 'fulltime' | 'parttime';  // Loại nhân viên
  hourlyRate?: number;           // Lương theo giờ (VND)
  createdAt: Timestamp;          // Thời gian tạo
}
```

**Indexes:**
- `role` (ascending)
- `storeId` (ascending)

---

### stores
Danh sách các cửa hàng trong chuỗi

```typescript
{
  id: string;                    // Auto-generated document ID
  name: string;                  // Tên cửa hàng
  address: string;               // Địa chỉ
  managerId: string;             // ID của manager phụ trách
  isActive: boolean;             // Trạng thái hoạt động
  createdAt: Timestamp;          // Thời gian tạo
}
```

**Indexes:**
- `isActive` (ascending)
- `managerId` (ascending)

---

### shifts
Cấu hình các ca làm việc

```typescript
{
  id: string;                    // Auto-generated document ID
  name: string;                  // Tên ca (Ca sáng, Ca chiều, etc.)
  startTime: string;             // Giờ bắt đầu (HH:mm format)
  endTime: string;               // Giờ kết thúc (HH:mm format)
  duration: number;              // Thời lượng (giờ)
  type: 'fulltime' | 'parttime'; // Loại ca
  isActive: boolean;             // Trạng thái hoạt động
}
```

**Indexes:**
- `isActive` (ascending)
- `type` (ascending)

---

### schedules
Lịch làm việc đã đăng ký

```typescript
{
  id: string;                    // Auto-generated document ID
  storeId: string;               // ID cửa hàng
  employeeId: string;            // ID nhân viên
  shiftId: string;               // ID ca làm việc
  date: Timestamp;               // Ngày làm việc
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedBy: string;           // ID người tạo yêu cầu
  approvedBy?: string;           // ID manager duyệt
  createdAt: Timestamp;          // Thời gian tạo
  updatedAt?: Timestamp;         // Thời gian cập nhật
}
```

**Indexes:**
- Composite: `storeId` (ascending) + `date` (ascending)
- Composite: `employeeId` (ascending) + `date` (descending)
- Composite: `storeId` (ascending) + `status` (ascending)

---

### shift_swaps
Yêu cầu đổi ca giữa nhân viên

```typescript
{
  id: string;                    // Auto-generated document ID
  fromEmployeeId: string;        // ID nhân viên muốn đổi ca
  toEmployeeId: string;          // ID nhân viên nhận ca
  scheduleId: string;            // ID schedule cần đổi
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;          // Thời gian tạo
  approvedBy?: string;           // ID manager duyệt
}
```

**Indexes:**
- Composite: `fromEmployeeId` (ascending) + `status` (ascending)
- Composite: `toEmployeeId` (ascending) + `status` (ascending)

---

## Sample Data

### Sample Admin
```json
{
  "email": "admin@epatta.com",
  "displayName": "Admin Epatta",
  "role": "admin",
  "createdAt": "2026-01-18T00:00:00Z"
}
```

### Sample Store
```json
{
  "name": "Epatta Coffee Quận 1",
  "address": "123 Nguyễn Huệ, Quận 1, TP.HCM",
  "managerId": "manager_id_here",
  "isActive": true,
  "createdAt": "2026-01-18T00:00:00Z"
}
```

### Sample Shift
```json
{
  "name": "Ca sáng",
  "startTime": "06:30",
  "endTime": "14:30",
  "duration": 8,
  "type": "fulltime",
  "isActive": true
}
```

### Sample Schedule
```json
{
  "storeId": "store_id_here",
  "employeeId": "employee_id_here",
  "shiftId": "shift_id_here",
  "date": "2026-01-20T00:00:00Z",
  "status": "pending",
  "requestedBy": "employee_id_here",
  "createdAt": "2026-01-18T00:00:00Z"
}
```

---

## Relationships

```
users (manager) ──┬── stores
                  │
users (employee) ─┼── schedules ── shifts
                  │
                  └── shift_swaps
```

---

## Security Rules

Xem file `firestore.rules` để biết chi tiết về security rules.

**Tóm tắt:**
- Users chỉ có thể đọc/ghi dữ liệu của chính mình
- Admin có quyền đọc/ghi tất cả stores và shifts
- Manager có quyền đọc/ghi schedules của cửa hàng mình quản lý
- Employee có thể tạo schedule với status 'pending'
- Employee chỉ có thể đọc schedules của chính mình
