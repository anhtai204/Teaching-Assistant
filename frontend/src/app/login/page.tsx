"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Input } from "@/components/ui/FormElements";
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if ((session.user as any).role === "lecturer") {
        router.push("/lecturer/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email hoặc mật khẩu không chính xác. Vui lòng thử lại.");
        setIsLoading(false);
      } else {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        if (session?.user?.role === "lecturer") {
          router.push("/lecturer/dashboard");
        } else {
          router.push("/student/dashboard");
        }
        router.refresh();
      }
    } catch (err) {
      setError("Đã xảy ra lỗi không mong đợi. Vui lòng thử lại sau.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-mesh flex overflow-hidden font-['Inter']">
      {/* Left Side: Aesthetic Panel */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12 overflow-hidden bg-[#020617]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-cyan-500/10 to-purple-600/20" />
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/30 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] bg-cyan-400/30 rounded-full blur-[140px] animate-pulse delay-700" />
        
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#ffffff22_1px,transparent_1px),linear-gradient(to_bottom,#ffffff22_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="relative z-10 max-w-lg text-white space-y-8 animate-float">
          <div className="inline-flex p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-indigo-500/20">
            <Sparkles className="h-10 w-10 text-indigo-300" />
          </div>

          <h2 className="text-5xl font-black leading-tight bg-gradient-to-r from-indigo-200 via-cyan-200 to-purple-300 bg-clip-text text-transparent font-['Lexend']">
            Nâng tầm học tập với Trí tuệ nhân tạo
          </h2>

          <p className="text-xl text-indigo-100/80 leading-relaxed font-medium">
            Tham gia cùng hàng nghìn sinh viên và giảng viên để làm chủ mọi môn học thông qua sự hướng dẫn cá nhân hóa từ AI.
          </p>

          <div className="flex gap-4 pt-4 items-center">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 w-12 rounded-full border-2 border-[#020617] bg-gradient-to-br from-indigo-400 to-cyan-300 shadow-xl flex items-center justify-center text-[10px] font-bold text-white overflow-hidden bg-white/10 backdrop-blur-md">
                   <img src={`https://i.pravatar.cc/150?u=${i}`} alt="User" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <p className="text-sm text-indigo-200 font-semibold tracking-wide">
              Đã có <span className="text-white font-black underline decoration-indigo-400 decoration-2 underline-offset-4">+2,000 sinh viên</span> tham gia hôm nay
            </p>
          </div>
        </div>

        <div className="absolute bottom-12 left-12 right-12 flex justify-between text-indigo-200/30 text-[10px] font-black uppercase tracking-[0.2em]">
          <span>AI Teaching Assistant v2.0</span>
          <span>© 2026 EduAI System</span>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white/60 backdrop-blur-xl lg:bg-transparent overflow-y-auto">
        <div className="w-full max-w-[460px] space-y-10 py-12">
          <div className="space-y-4">
            <div className="lg:hidden inline-block p-3 rounded-2xl bg-indigo-600 text-white mb-4 shadow-xl shadow-indigo-200">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter font-['Lexend']">Đăng nhập</h1>
            <p className="text-slate-500 font-medium text-lg">Chào mừng bạn trở lại! Hãy điền thông tin để tiếp tục.</p>
          </div>

          <form className="space-y-6 animate-reveal" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 text-sm text-red-600 border border-red-100 flex items-center gap-3 animate-shake">
                <CheckCircle2 className="h-5 w-5 shrink-0 rotate-45" />
                {error}
              </div>
            )}

            <div className="space-y-5">
              <Input
                label="Địa chỉ Email"
                name="email"
                type="email"
                placeholder="vd: name@university.edu"
                required
              />
              <div className="space-y-2">
                <Input
                  label="Mật khẩu"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
                <div className="flex justify-end px-1">
                  <Link href="#" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors underline-offset-4 hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1">
              <input
                type="checkbox"
                id="remember"
                className="h-5 w-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm font-bold text-slate-600 cursor-pointer select-none">
                Ghi nhớ đăng nhập trong 30 ngày
              </label>
            </div>

            <div className="space-y-4 pt-2">
              <Button className="w-full py-5 text-lg font-black shadow-xl shadow-indigo-200 rounded-2xl group transition-all" type="submit" isLoading={isLoading}>
                Đăng nhập ngay <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">
                  <span className="bg-white lg:bg-transparent px-4">Hoặc tiếp tục với</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full py-5 flex items-center justify-center gap-3 font-bold border-2 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/student/dashboard" })}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google Account
              </Button>
            </div>
          </form>

          <p className="text-center text-sm font-bold text-slate-500">
            Chưa có tài khoản?{" "}
            <Link href="/signup" className="text-indigo-600 hover:text-indigo-700 transition-colors decoration-2 underline-offset-4 hover:underline">
              Đăng ký miễn phí
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
