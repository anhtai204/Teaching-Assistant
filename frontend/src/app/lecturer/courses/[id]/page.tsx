"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Input } from "@/components/ui/FormElements";
import { Button } from "@/components/ui/Button";
import { UserMenu } from "@/components/UserMenu";

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  enrollment_code: string;
  greeting_message: string;
}

export default function CourseManagement() {
  const { id } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [greeting, setGreeting] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Fetch course details (from list for now since no single get endpoint yet)
      const courseRes = await fetch(`${baseUrl}/api/courses`);
      if (courseRes.ok) {
        const allCourses = await courseRes.json();
        const found = allCourses.find((c: Course) => c.id === id);
        if (found) {
          setCourse(found);
          setGreeting(found.greeting_message || "");
        }
      }

      // Fetch students
      const studentsRes = await fetch(`${baseUrl}/api/courses/${id}/students`);
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/courses/${id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ greeting_message: greeting }),
      });

      if (response.ok) {
        alert("Settings saved successfully!");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to remove this student from the course?")) return;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/courses/${id}/students/${studentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setStudents(students.filter(s => s.id !== studentId));
      }
    } catch (error) {
      console.error("Failed to remove student:", error);
    }
  };

  if (isLoading) return <div className="p-20 text-center">Loading...</div>;
  if (!course) return <div className="p-20 text-center text-red-500">Course not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F23]">
      <nav className="bg-white dark:bg-[#0F0F23] border-b border-slate-200 dark:border-white/5 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/lecturer/dashboard" className="text-slate-500 hover:text-slate-900 transition-colors">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{course.name} ({course.code})</h1>
          </div>
          <UserMenu />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Settings */}
        <div className="lg:col-span-1 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">General Info</h2>
            <Card className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Enrollment Code</p>
                <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                  <span className="text-2xl font-mono font-bold text-brand-600 tracking-wider">{course.enrollment_code}</span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    navigator.clipboard.writeText(course.enrollment_code);
                    alert("Code copied!");
                  }}>
                    Copy
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Share this code with your students so they can join the class.</p>
              </div>
            </Card>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">AI Assistant Greeting</h2>
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">First Message</label>
                <textarea 
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                  rows={4}
                  placeholder="e.g. Chào em, thầy là bot trợ giảng môn Trí tuệ nhân tạo..."
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveSettings} className="w-full" isLoading={isSaving}>
                Save Greeting
              </Button>
            </Card>
          </section>
        </div>

        {/* Right Column: Student List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Enrolled Students ({students.length})</h2>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Student Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Email</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">
                            {student.full_name.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-900">{student.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{student.email}</td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => handleRemoveStudent(student.id)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-slate-500">
                        No students enrolled yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
