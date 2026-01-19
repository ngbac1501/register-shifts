"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

const schema = z.object({
  date: z.string().min(1, "Chọn ngày"),
  shiftId: z.string().min(1, "Chọn ca làm"),
});

type FormData = z.infer<typeof schema>;

const SHIFTS = [
  { id: "morning", name: "Ca sáng (06:30-14:30)" },
  { id: "afternoon", name: "Ca chiều (14:30-22:30)" },
  { id: "night", name: "Ca đêm (22:30-06:30)" },
  { id: "parttime", name: "Part-time (Tùy chỉnh)" },
];

export default function ShiftRegisterForm() {
  const [user] = useAuthState(auth);
  const {
    register: formRegister,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isDateInvalid, setIsDateInvalid] = useState(false);

  const selectedDate = watch("date");

  useEffect(() => {
    const checkDate = async () => {
      if (!selectedDate || !user) return;

      setIsDateInvalid(false);
      setError("");

      try {
        const { getDocs, query, where } = await import("firebase/firestore");
        const q = query(
          collection(db, "schedules"),
          where("employeeId", "==", user.uid),
          where("date", "==", selectedDate),
          where("status", "==", "completed")
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setIsDateInvalid(true);
          setError("Bạn đã có ca làm việc hoàn thành trong ngày này.");
        }
      } catch (err) {
        console.error("Error validating date:", err);
      }
    };

    const timer = setTimeout(() => {
      checkDate();
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [selectedDate, user]);

  const onSubmit = async (data: FormData) => {
    setError("");
    setSuccess("");
    if (!user) {
      setError("Bạn cần đăng nhập để đăng ký ca.");
      return;
    }
    try {
      // Check for existing completed shift on the same date
      const { getDocs, query, where } = await import("firebase/firestore");
      const q = query(
        collection(db, "schedules"),
        where("employeeId", "==", user.uid),
        where("date", "==", data.date),
        where("status", "==", "completed")
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError("Bạn đã có ca làm việc hoàn thành trong ngày này.");
        return;
      }

      await addDoc(collection(db, "schedules"), {
        employeeId: user.uid,
        shiftId: data.shiftId,
        date: data.date,
        status: "pending",
        requestedBy: user.uid,
        createdAt: Timestamp.now(),
      });
      setSuccess("Đăng ký ca thành công! Chờ quản lý duyệt.");
      reset();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md mx-auto">
      <div>
        <label>Ngày làm việc</label>
        <input type="date" {...formRegister("date")} className="input input-bordered w-full" />
        {errors.date && <p className="text-red-500 text-sm">{errors.date.message}</p>}
      </div>
      <div>
        <label>Chọn ca làm</label>
        <select {...formRegister("shiftId")} className="input input-bordered w-full">
          <option value="">-- Chọn ca --</option>
          {SHIFTS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {errors.shiftId && <p className="text-red-500 text-sm">{errors.shiftId.message}</p>}
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting || isDateInvalid}>
        Đăng ký ca
      </button>
      {success && <p className="text-green-600 text-sm">{success}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}
