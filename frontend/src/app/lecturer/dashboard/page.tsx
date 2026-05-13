"use client";

import { Button } from "@/components/ui/Button";
import { Card, Input } from "@/components/ui/FormElements";
import { LayoutDashboard, BookOpen, MessageSquare, BarChart3, Plus, Settings, Edit2, ShieldAlert, PlusCircle, X, Users, ArrowRight, ExternalLink } from "lucide-react";
import { LecturerHeader } from "@/components/LecturerHeader";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  enrollment_code: string;
}

export default function LecturerDashboard() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({ name: "", code: "", description: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchCourses();
    }
  }, [session]);

  const fetchCourses = async () => {
    try {
      const lecturerId = (session?.user as any)?.id;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/courses?lecturer_id=${lecturerId}`);
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    }
  };

  const handleEditClick = (course: Course) => {
    setEditingCourseId(course.id);
    setNewCourse({ name: course.name, code: course.code, description: course.description || "" });
    setIsModalOpen(true);
  };

  const handleSubmitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const lecturerId = (session?.user as any)?.id;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const url = editingCourseId ? `${baseUrl}/api/courses/${editingCourseId}` : `${baseUrl}/api/courses`;
      const method = editingCourseId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newCourse, lecturer_id: lecturerId }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        setEditingCourseId(null);
        setNewCourse({ name: "", code: "", description: "" });
        fetchCourses();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.detail || "Failed to save course"}`);
      }
    } catch (error) {
      console.error("Failed to save course:", error);
      alert("Network error: Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F0F23]">
      <LecturerHeader />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white">Manage Your <span className="text-blue-600">Courses</span></h2>
            <p className="text-lg text-slate-500 dark:text-white/50 font-medium">Create environments, upload materials, and monitor AI student interactions.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/lecturer/materials">
              <Button variant="outline" className="h-14 px-8 border-2">
                <BookOpen className="mr-2 w-5 h-5" />
                Manage All Materials
              </Button>
            </Link>
            <Button onClick={() => setIsModalOpen(true)} className="h-14 px-8 shadow-lg shadow-indigo-500/20">
              <PlusCircle className="mr-2 w-5 h-5" />
              Create New Course
            </Button>
          </div>
        </header>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <Card key={course.id} className="p-8 border-none hover:shadow-2xl transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[100px] -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500" />

              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="bg-blue-100 text-blue-700 text-[10px] font-black px-3 py-1.5 rounded-md w-fit uppercase tracking-wider">
                    {course.code}
                  </div>
                  <button
                    onClick={() => handleEditClick(course)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                    title="Edit Course Info"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors leading-tight mb-2 truncate" title={course.name}>
                    {course.name}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-400 dark:text-white/40 font-bold text-xs uppercase tracking-widest">
                    <Users className="w-3.5 h-3.5" />
                    <span>Invite Code: <span className="text-blue-600 select-all">{course.enrollment_code}</span></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-white/5">
                  <Link href={`/lecturer/courses/${course.id}`} className="w-full">
                    <Button variant="primary" size="sm" className="w-full h-11">
                      Control Room
                    </Button>
                  </Link>
                  <Link href={`/lecturer/materials?course_id=${course.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full h-11 border-2">
                      Materials
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}

          {courses.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white dark:bg-white/3 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem]">
              <div className="bg-slate-50 dark:bg-white/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-300 dark:text-white/20">
                <BookOpen className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No courses launched yet</h3>
              <p className="text-slate-500 dark:text-white/40 max-w-sm mx-auto mb-10 font-medium">Launch your first course to begin interacting with students through your custom AI assistant.</p>
              <Button size="lg" className="px-10 h-16 text-lg" onClick={() => setIsModalOpen(true)}>
                Launch First Course <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Create Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg p-12 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setEditingCourseId(null);
                setNewCourse({ name: "", code: "", description: "" });
              }}
              className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X className="h-7 w-7" />
            </button>

            <div className="mb-10">
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{editingCourseId ? "Update Course" : "Launch New Course"}</h3>
              <p className="text-slate-500 dark:text-white/50 font-medium">Define the core identity of your course workspace.</p>
            </div>

            <form onSubmit={handleSubmitCourse} className="space-y-8">
              <Input
                label="Course Display Name"
                placeholder="e.g. Introduction to Neural Networks"
                required
                value={newCourse.name}
                onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
              />
              <Input
                label="Course ID / Code"
                placeholder="e.g. AI-101"
                required
                value={newCourse.code}
                onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
              />
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700 dark:text-white/60 ml-1">Workspace Description (Optional)</label>
                <textarea
                  className="w-full rounded-xl border-2 border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-5 py-4 text-slate-900 dark:text-white transition-all focus:border-blue-500 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-8 focus:ring-blue-500/5 font-medium placeholder:text-slate-300 dark:placeholder:text-white/20"
                  rows={4}
                  placeholder="What will students learn in this environment?"
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full h-16 text-xl font-bold shadow-xl shadow-indigo-500/20" isLoading={isLoading}>
                {editingCourseId ? "Save Changes" : "Initialize Course Workspace"}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
