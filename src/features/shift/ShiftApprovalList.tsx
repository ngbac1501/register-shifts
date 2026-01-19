"use client";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Schedule {
  id: string;
  employeeId: string;
  shiftId: string;
  date: string;
  status: string;
}

const SHIFT_LABELS: Record<string, string> = {
  morning: "Ca sáng",
  afternoon: "Ca chiều",
  night: "Ca đêm",
  parttime: "Part-time",
};

export default function ShiftApprovalList({ storeId }: { storeId?: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSchedules() {
      setLoading(true);
      setError("");
      try {
        // Lấy các ca đăng ký chờ duyệt (pending)
        const q = query(collection(db, "schedules"), where("status", "==", "pending"));
        const snap = await getDocs(q);
        setSchedules(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Schedule)));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedules();
  }, []);

  const handleApprove = async (id: string) => {
    await updateDoc(doc(db, "schedules", id), { status: "approved" });
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };
  const handleReject = async (id: string) => {
    await updateDoc(doc(db, "schedules", id), { status: "rejected" });
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  if (loading) return <p>Đang tải danh sách...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!schedules.length) return <p>Không có ca nào chờ duyệt.</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-2">Danh sách ca chờ duyệt</h2>
      <ul className="divide-y">
        {schedules.map((s) => (
          <li key={s.id} className="py-2 flex items-center justify-between">
            <div>
              <div><b>Ngày:</b> {s.date}</div>
              <div><b>Ca:</b> {SHIFT_LABELS[s.shiftId] || s.shiftId}</div>
              <div><b>Nhân viên:</b> {s.employeeId}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-success btn-sm" onClick={() => handleApprove(s.id)}>Duyệt</button>
              <button className="btn btn-error btn-sm" onClick={() => handleReject(s.id)}>Từ chối</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
