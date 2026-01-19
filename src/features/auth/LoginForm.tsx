"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { login } from "@/features/auth/firebaseAuth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function LoginForm() {
  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [error, setError] = useState("");

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      await login(data.email, data.password);
      // TODO: redirect to dashboard
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm mx-auto">
      <div>
        <label>Email</label>
        <input type="email" {...formRegister("email")} className="input input-bordered w-full" />
        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
      </div>
      <div>
        <label>Mật khẩu</label>
        <input type="password" {...formRegister("password")} className="input input-bordered w-full" />
        {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
        Đăng nhập
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}
