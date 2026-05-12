"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, Input } from "@/components/ui/FormElements";
import { Button } from "@/components/ui/Button";

import { LayoutDashboard, BookOpen, Clock, LogOut, Plus, ArrowRight, Search, PlusCircle, X, GraduationCap, Sparkles } from "lucide-react";
import { StudentHeader } from "@/components/StudentHeader";

interface Course {
  id: string;
  name: string;
  code: string;
}

export default function StudentDashboard() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [enrollCode, setEnrollCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchCourses();
    }
  }, [session]);

  const fetchCourses = async () => {
    if (!session?.user) {
      console.log("DEBUG: No session user found");
      return;
    }
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const studentId = (session.user as any).id;
      console.log(`DEBUG: Fetching courses for studentId: ${studentId} at ${baseUrl}`);
      
      if (!studentId) {
        console.error("DEBUG: studentId is undefined");
        return;
      }

      const response = await fetch(`${baseUrl}/api/student/${studentId}/courses`);
      if (response.ok) {
        const data = await response.json();
        console.log(`DEBUG: Fetched ${data.length} courses`, data);
        setCourses(data);
      } else {
        const errorText = await response.text();
        console.error(`DEBUG: Failed to fetch courses: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error("DEBUG: Failed to fetch courses exception:", error);
    }
  };

  const handleJoinCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/courses/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: (session?.user as any)?.id,
          enrollment_code: enrollCode
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Joined ${data.course_name} successfully!`);
        setIsModalOpen(false);
        setEnrollCode("");
        fetchCourses();
      } else {
        const err = await response.json();
        alert(err.detail || "Failed to join course");
      }
    } catch (error) {
      console.error("Join course error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F0F23]">
      <StudentHeader />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-slate-900">
              Welcome back, <span className="text-blue-600">{session?.user?.name?.split(' ')[0] || 'Student'}!</span> 👋
            </h2>
            <p className="text-lg text-slate-500 font-medium">
              You have <span className="text-slate-900 font-bold">{courses.length} active courses</span> this semester.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="h-14 px-8 shadow-lg shadow-indigo-500/20">
            <PlusCircle className="mr-2 w-5 h-5" />
            Join New Class
          </Button>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Courses Column - Full Width */}
          <div className="lg:col-span-3 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-500" />
                My Courses
              </h3>
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-blue-500 outline-none transition-all w-64"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Link key={course.id} href={`/student/courses/${course.id}`} className="group">
                  <Card className="p-8 h-full flex flex-col justify-between border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[100px] -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500" />

                    <div className="relative z-10 space-y-4">
                      <div className="bg-blue-100 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-md w-fit uppercase tracking-wider">
                        {course.code}
                      </div>
                      <h4 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                        {course.name}
                      </h4>
                    </div>

                    <div className="pt-10 flex justify-between items-center relative z-10 border-t border-slate-50 mt-auto">
                      <span className="text-sm font-bold text-slate-400 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                        Go to class <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                      </span>
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-45 transition-all duration-300">
                        <Plus className="h-5 w-5" />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
              {courses.length === 0 && (
                <div className="col-span-full py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Plus className="w-10 h-10 text-slate-300" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">No active classes</h4>
                  <p className="text-slate-500 max-w-xs mx-auto mb-8 font-medium">Join your first class using the code provided by your lecturer.</p>
                  <Button variant="outline" onClick={() => setIsModalOpen(true)}>Join your first class</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Join Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-10 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="text-center mb-10">
              <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                <PlusCircle className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-3">Join a Class</h3>
              <p className="text-slate-500 font-medium px-4">Enter the 6-character code provided by your lecturer to access course materials.</p>
            </div>

            <form onSubmit={handleJoinCourse} className="space-y-8">
              <div className="flex justify-center">
                <input
                  className="w-full text-center text-4xl font-mono font-bold tracking-[0.4em] rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 py-6 text-blue-600 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-8 focus:ring-blue-500/5 transition-all uppercase placeholder:text-slate-200"
                  maxLength={6}
                  placeholder="XXXXXX"
                  required
                  autoFocus
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value.toUpperCase())}
                />
              </div>
              <Button type="submit" className="w-full h-16 text-lg" isLoading={isLoading}>
                Access Course Content
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
