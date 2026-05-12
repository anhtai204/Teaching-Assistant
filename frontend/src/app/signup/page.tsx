"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, Input, Select } from "@/components/ui/FormElements";
import { apiFetch } from "@/lib/api";

export default function SignUpPage() {
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
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const role = "student";

    try {
      const res = await apiFetch("/api/auth/register", {
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

      // Automatically sign in after signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login?signup=success");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-mesh flex overflow-hidden">
      {/* Left Side: Aesthetic Panel */}
      <div className="hidden lg:flex w-1/2 relative bg-[#0F172A] items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-500/20 rounded-full blur-[130px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/20 rounded-full blur-[110px] animate-pulse delay-1000" />
        
        <div className="relative z-10 max-w-lg text-white space-y-8 animate-float">
          <div className="inline-block p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-5xl font-bold leading-tight">Start Your AI Learning Journey.</h2>
          <p className="text-xl text-blue-100 leading-relaxed">
            Create an account to access course-specific AI assistants, personalized revision tools, and lecture-based roadmaps.
          </p>
          
          <ul className="space-y-4 pt-4">
            {['Personalized AI Tutoring', 'Lecture-to-Revision Roadmaps', 'Collaborative Course Management'].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-blue-50 font-medium">
                <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="absolute bottom-12 left-12 right-12 flex justify-between text-white/40 text-xs font-medium uppercase tracking-widest">
          <span>Student & Lecturer Portal</span>
          <span>Knowledge Reinforcement System</span>
        </div>
      </div>

      {/* Right Side: Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white/40 backdrop-blur-sm lg:bg-transparent overflow-y-auto">
        <div className="w-full max-w-[480px] space-y-10 py-12">
          <div className="space-y-3">
            <div className="lg:hidden inline-block p-2 rounded-xl bg-brand-600 text-white mb-4">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Create account</h1>
            <p className="text-slate-500 font-medium">Sign up in seconds to start learning with AI.</p>
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
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="First name" name="firstName" placeholder="John" required />
                <Input label="Last name" name="lastName" placeholder="Doe" required />
              </div>
              
              <Input 
                label="University Email" 
                name="email"
                type="email" 
                placeholder="john@university.edu" 
                required 
              />
              
              <Input 
                label="Create Password" 
                name="password"
                type="password" 
                placeholder="••••••••" 
                required 
              />

            </div>

            <div className="space-y-4 pt-2">
              <Button className="w-full py-4 text-lg font-bold shadow-premium" type="submit" isLoading={isLoading}>
                Get started
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white lg:bg-mesh px-4 text-slate-400 font-bold tracking-widest">Or sign up with</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full py-4 flex items-center justify-center gap-3 font-bold border-2" 
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

          <p className="text-center text-sm font-medium text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-brand-600 hover:text-brand-700 transition-colors decoration-2 underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
