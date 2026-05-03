"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, Input } from "@/components/ui/FormElements";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
        setError("Invalid email or password. Please try again.");
        setIsLoading(false);
      } else {
        // Fetch session to check role
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
      setError("An unexpected error occurred. Please try again later.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-mesh flex overflow-hidden">
      {/* Left Side: Aesthetic Panel */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12 overflow-hidden bg-[#020617]">

        {/* Aurora gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-cyan-500/10 to-purple-600/20" />

        {/* Glow orbs */}
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/30 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] bg-cyan-400/30 rounded-full blur-[140px] animate-pulse delay-700" />
        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse delay-1000" />

        {/* subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#ffffff22_1px,transparent_1px),linear-gradient(to_bottom,#ffffff22_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="relative z-10 max-w-lg text-white space-y-8">

          {/* glass icon */}
          <div className="inline-flex p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-indigo-500/20">
            <svg className="h-10 w-10 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <h2 className="text-5xl font-bold leading-tight bg-gradient-to-r from-indigo-200 via-cyan-200 to-purple-300 bg-clip-text text-transparent">
            Elevate Your Learning with AI
          </h2>

          <p className="text-xl text-indigo-100/80 leading-relaxed">
            Join thousands of students and lecturers using our platform to master complex subjects through personalized AI guidance.
          </p>

          <div className="flex gap-4 pt-4 items-center">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-[#020617] bg-gradient-to-br from-indigo-400 to-cyan-300 shadow-lg" />
              ))}
            </div>
            <p className="text-sm text-indigo-200 font-medium">
              Joined by <span className="text-white font-bold">2k+ students</span> today
            </p>
          </div>
        </div>

        {/* footer */}
        <div className="absolute bottom-12 left-12 right-12 flex justify-between text-indigo-200/40 text-xs font-medium uppercase tracking-widest">
          <span>AI Teaching Assistant v2.0</span>
          <span>© 2026 EduAI</span>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white/40 backdrop-blur-sm lg:bg-transparent">
        <div className="w-full max-w-[440px] space-y-10">
          <div className="space-y-3">
            <div className="lg:hidden inline-block p-2 rounded-xl bg-brand-600 text-white mb-4">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Sign in</h1>
            <p className="text-slate-500 font-medium">Welcome back! Please enter your details.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 rounded-2xl bg-red-50 text-sm text-red-600 border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-5">
              <Input
                label="Email address"
                name="email"
                type="email"
                placeholder="name@university.edu"
                required
              />
              <div className="space-y-1">
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
                <div className="flex justify-end">
                  <Link href="#" className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors">
                    Forgot password?
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 transition-all cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm font-medium text-slate-600 cursor-pointer select-none">
                Remember for 30 days
              </label>
            </div>

            <div className="space-y-4 pt-2">
              <Button className="w-full py-4 text-lg font-bold shadow-premium" type="submit" isLoading={isLoading}>
                Sign in
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white lg:bg-mesh px-4 text-slate-400 font-bold tracking-widest">Or continue with</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full py-4 flex items-center justify-center gap-3 font-bold border-2"
                type="button"
                onClick={() => signIn("google")}
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

          <p className="text-center text-sm font-medium text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-bold text-brand-600 hover:text-brand-700 transition-colors decoration-2 underline-offset-4 hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
