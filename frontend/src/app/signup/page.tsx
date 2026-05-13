"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, Input } from "@/components/ui/FormElements";
import { GraduationCap, UserCircle, ArrowRight, CheckCircle2, Sparkles, ChevronLeft, XCircle, ShieldCheck, Lock } from "lucide-react";

type Role = "student" | "lecturer";

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Password validation states
  const [password, setPassword] = useState("");
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
  });

  useEffect(() => {
    setPasswordValidation({
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    });
  }, [password]);

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    
    if (!isPasswordValid) {
      setError("Mật khẩu chưa đạt yêu cầu bảo mật.");
      return;
    }

    setIsLoading(true);
    setError("");

    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          fullName: `${firstName} ${lastName}`,
          role,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account. Please try again.");
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login?signup=success");
      } else {
        if (role === "lecturer") {
          router.push("/lecturer/dashboard");
        } else {
          router.push("/student/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-mesh flex overflow-hidden font-['Inter']">
      {/* Left Side: Aesthetic Panel */}
      <div className="hidden lg:flex w-1/2 relative bg-[#0F172A] items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-500/20 rounded-full blur-[130px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/20 rounded-full blur-[110px] animate-pulse delay-1000" />
        
        <div className="relative z-10 max-w-lg text-white space-y-8 animate-float">
          <div className="inline-block p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
            <Sparkles className="h-10 w-10 text-amber-400" />
          </div>
          <h2 className="text-5xl font-extrabold leading-tight text-white tracking-tight font-['Lexend']">
            Start Your AI <span className="text-blue-400">Learning Journey.</span>
          </h2>
          <p className="text-xl text-blue-100/80 leading-relaxed font-medium">
            Create an account to access course-specific AI assistants, personalized revision tools, and lecture-based roadmaps.
          </p>
          
          <ul className="space-y-5 pt-4">
            {[
              { text: 'Personalized AI Tutoring', color: 'text-indigo-400' },
              { text: 'Lecture-to-Revision Roadmaps', color: 'text-emerald-400' },
              { text: 'Collaborative Course Management', color: 'text-blue-400' }
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-4 text-white/90 font-semibold group transition-all hover:translate-x-2">
                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20 group-hover:bg-white/20">
                  <CheckCircle2 className={`h-3.5 w-3.5 ${feature.color}`} />
                </div>
                {feature.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="absolute bottom-12 left-12 right-12 flex justify-between text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">
          <span>Student & Lecturer Portal</span>
          <span>Knowledge Reinforcement System</span>
        </div>
      </div>

      {/* Right Side: Signup Flow */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white/60 backdrop-blur-xl lg:bg-transparent overflow-y-auto relative">
        <div className="w-full max-w-[520px] space-y-10 py-12 relative z-10">
          
          {step === 2 && (
            <button 
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors mb-6 group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Quay lại
            </button>
          )}

          <div className="space-y-4">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter font-['Lexend']">
              {step === 1 ? "Chọn vai trò của bạn" : "Hoàn tất đăng ký"}
            </h1>
            <p className="text-slate-500 font-medium text-lg">
              {step === 1 
                ? "Bạn tham gia hệ thống với tư cách là người học hay người hướng dẫn?" 
                : `Chào mừng ${role === 'student' ? 'Sinh viên' : 'Giảng viên'}! Hãy điền thông tin cá nhân.`}
            </p>
          </div>

          {step === 1 ? (
            /* Step 1: Role Selection */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-reveal">
              <RoleCard 
                selected={role === "student"}
                onClick={() => { setRole("student"); setStep(2); }}
                icon={<GraduationCap className="w-12 h-12" />}
                title="Sinh viên"
                description="Tôi muốn học tập và ôn luyện hiệu quả với trợ lý AI."
                color="indigo"
              />
              <RoleCard 
                selected={role === "lecturer"}
                onClick={() => { setRole("lecturer"); setStep(2); }}
                icon={<UserCircle className="w-12 h-12" />}
                title="Giảng viên"
                description="Tôi muốn quản lý học liệu và theo dõi tiến độ lớp học."
                color="blue"
              />
            </div>
          ) : (
            /* Step 2: Form */
            <form className="space-y-6 animate-reveal" onSubmit={handleSubmit}>
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 text-sm text-red-600 border border-red-100 flex items-center gap-3 animate-shake">
                  <XCircle className="h-5 w-5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-5 font-['Inter']">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input label="Tên" name="firstName" placeholder="Vd: Tùng" required />
                  <Input label="Họ" name="lastName" placeholder="Vd: Nguyễn" required />
                </div>
                
                <Input 
                  label="Email Đại học / Tổ chức" 
                  name="email"
                  type="email" 
                  placeholder="example@university.edu.vn" 
                  required 
                />
                
                <div className="space-y-3">
                  <Input 
                    label="Mật khẩu" 
                    name="password"
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                  
                  {/* Password Requirements UI */}
                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <ShieldCheck className="w-3 h-3 text-indigo-500" />
                      Yêu cầu mật khẩu
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                      <ValidationItem label="Ít nhất 8 ký tự" valid={passwordValidation.minLength} />
                      <ValidationItem label="Chữ cái viết hoa" valid={passwordValidation.hasUpper} />
                      <ValidationItem label="Chữ cái viết thường" valid={passwordValidation.hasLower} />
                      <ValidationItem label="Ít nhất 1 chữ số" valid={passwordValidation.hasNumber} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <Button 
                  className="w-full py-5 text-lg font-black shadow-xl shadow-indigo-200 rounded-2xl group" 
                  type="submit" 
                  isLoading={isLoading}
                  disabled={!isPasswordValid && password.length > 0}
                >
                  Tạo tài khoản ngay <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">
                    <span className="bg-white lg:bg-transparent px-4">Hoặc đăng ký nhanh qua</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full py-5 flex items-center justify-center gap-3 font-bold border-2 rounded-2xl hover:bg-slate-50 transition-all active:scale-95" 
                  type="button"
                  onClick={() => signIn("google", { callbackUrl: role === 'lecturer' ? "/lecturer/dashboard" : "/student/dashboard" })}
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
          )}

          <p className="text-center text-sm font-bold text-slate-500">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 transition-colors decoration-2 underline-offset-4 hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function RoleCard({ selected, onClick, icon, title, description, color }: { 
  selected: boolean, 
  onClick: () => void, 
  icon: React.ReactNode, 
  title: string, 
  description: string,
  color: "indigo" | "blue"
}) {
  const colorStyles = {
    indigo: "hover:border-indigo-600 hover:bg-indigo-50/30 text-indigo-600",
    blue: "hover:border-blue-600 hover:bg-blue-50/30 text-blue-600"
  };

  return (
    <Card 
      onClick={onClick}
      className={`p-8 cursor-pointer transition-all duration-500 border-2 flex flex-col items-center text-center gap-6 rounded-[2.5rem] group relative overflow-hidden ${
        selected ? `border-${color}-600 bg-${color}-50 shadow-2xl` : `border-slate-100 ${colorStyles[color]} shadow-lg shadow-slate-100 hover:scale-105`
      }`}
    >
      <div className={`p-5 rounded-3xl transition-all duration-500 ${
        selected ? 'bg-white shadow-xl scale-110' : 'bg-slate-50 group-hover:bg-white group-hover:shadow-lg group-hover:-translate-y-2'
      }`}>
        {icon}
      </div>
      <div>
        <h3 className="text-2xl font-black text-slate-900 mb-2 font-['Lexend']">{title}</h3>
        <p className="text-slate-500 text-sm font-medium leading-relaxed">{description}</p>
      </div>
      <div className={`absolute bottom-4 right-4 transition-all duration-500 ${selected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${color === 'indigo' ? 'bg-indigo-600' : 'bg-blue-600'} text-white`}>
            <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
}

function ValidationItem({ label, valid }: { label: string, valid: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-[11px] font-bold transition-colors ${valid ? 'text-emerald-600' : 'text-slate-300'}`}>
      <CheckCircle2 className={`w-3.5 h-3.5 ${valid ? 'opacity-100' : 'opacity-20'}`} />
      {label}
    </div>
  );
}
