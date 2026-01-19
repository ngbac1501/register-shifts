"use client";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

interface Schedule {
  id: string;
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

export default function EmployeeScheduleList() {
  const [user] = useAuthState(auth);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    async function fetchSchedules() {
      setLoading(true);
      setError("");
      try {
        if (!user) return;
        const q = query(collection(db, "schedules"), where("employeeId", "==", user.uid));
        const snap = await getDocs(q);
        setSchedules(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Schedule)));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedules();
  }, [user]);

  if (!user) return <p>Vui lòng đăng nhập để xem lịch làm việc.</p>;
  if (loading) return <p>Đang tải lịch làm việc...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!schedules.length) return <p>Chưa có ca làm nào.</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-2">Lịch làm việc của bạn</h2>
      <ul className="divide-y">
        {schedules.map((s) => (
          <li key={s.id} className="py-2 flex items-center justify-between">
            <div>
              <div><b>Ngày:</b> {s.date}</div>
              <div><b>Ca:</b> {SHIFT_LABELS[s.shiftId] || s.shiftId}</div>
              <div><b>Trạng thái:</b> {s.status}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
