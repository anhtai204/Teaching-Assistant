"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/FormElements";
import { Button } from "@/components/ui/Button";
import { UserMenu } from "@/components/UserMenu";
import Link from "next/link";

interface Material {
  id: string;
  name: string;
  type: string;
  url: string;
  is_visible: boolean;
}

interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export default function StudentCourseWorkspace() {
  const { id: courseId } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
      fetchMaterials();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/courses`);
      if (response.ok) {
        const data = await response.json();
        const found = data.find((c: any) => c.id === courseId);
        if (found) setCourse(found);
      }
    } catch (error) {
      console.error("Error fetching course:", error);
    }
  };

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/student/courses/${courseId}/materials`);
      if (response.ok) {
        const data = await response.json();
        // Ensure URLs are absolute pointing to the backend
        const formattedData = data.map((m: any) => ({
          ...m,
          url: m.url.startsWith('http') ? m.url : `${baseUrl}/${m.url}`
        }));
        setMaterials(formattedData);
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'pdf') return '📄';
    if (t === 'doc' || t === 'docx') return '📝';
    if (t === 'ppt' || t === 'pptx') return '📊';
    if (t === 'mp4' || t === 'mov') return '🎬';
    if (t === 'mp3' || t === 'wav') return '🎧';
    return '📁';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F23] flex flex-col">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-[#0F0F23]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/student/dashboard" className="text-slate-400 hover:text-brand-600 transition-colors">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <p className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 tracking-widest">{course?.code}</p>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{course?.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/student/chat?course_id=${courseId}`}>
              <Button className="flex items-center gap-2 shadow-premium hover:scale-105 active:scale-95 transition-all">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Chat with AI
              </Button>
            </Link>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block mx-2" />
            <UserMenu />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main Content: Materials */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Course Materials</h2>
              <span className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">{materials.length} Documents</span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 bg-white rounded-3xl animate-pulse border border-slate-100" />
                ))}
              </div>
            ) : materials.length === 0 ? (
              <Card className="p-20 text-center border-dashed border-2 text-slate-400 font-medium bg-transparent">
                No materials available yet for this course.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {materials.map(m => (
                  <Card key={m.id} className={`p-6 hover:shadow-premium transition-all border-none group relative overflow-hidden dark:bg-[#1A1A3A] ${!m.is_visible ? 'opacity-60 bg-slate-50 dark:bg-white/5 grayscale' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl transition-colors ${!m.is_visible ? 'bg-slate-200 dark:bg-white/10' : 'bg-slate-50 dark:bg-white/5 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/20'}`}>
                        {getFileIcon(m.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white truncate mb-1">{m.name}</h3>
                          {!m.is_visible && (
                            <span className="bg-slate-200 dark:bg-amber-500/20 text-slate-500 dark:text-amber-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter">Hidden</span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-400 dark:text-white/30 uppercase">{m.type} File</p>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      {m.is_visible ? (
                        <Link href={`/student/materials/viewer/${m.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs font-bold">View Original</Button>
                        </Link>
                      ) : (
                        <Button variant="outline" size="sm" className="flex-1 text-xs font-bold opacity-50 cursor-not-allowed" disabled>Locked by Lecturer</Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-brand-600 hover:bg-brand-50" disabled={!m.is_visible}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: AI Info & Stats */}
          <div className="space-y-6">
            <Card className="p-8 bg-gradient-to-br from-brand-600 to-brand-800 text-white border-none shadow-premium relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 h-40 w-40 bg-brand-400/20 rounded-full blur-3xl group-hover:bg-brand-400/30 transition-all duration-700" />
              <div className="absolute -left-10 -bottom-10 h-32 w-32 bg-rose-500/10 rounded-full blur-2xl" />
              <div className="relative z-10 space-y-4">
                <h3 className="text-xl font-bold font-['Poppins'] text-white">Need help?</h3>
                <p className="text-white/90 text-sm leading-relaxed font-medium">
                  Our AI Assistant has read all <span className="text-brand-200 font-bold">{materials.length} documents</span> and is ready to explain complex concepts to you.
                </p>
                <Link href={`/student/chat?course_id=${courseId}`}>
                  <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 border-none font-bold mt-4 shadow-lg active:scale-[0.98] transition-all">
                    Ask AI Assistant
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-8 space-y-6 border-none shadow-sm">
              <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest">About this course</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {course?.description || "Welcome to your learning workspace. Access documents and interact with our specialized AI to master this subject."}
              </p>
              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{materials.length}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Files</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">Active</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Status</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
