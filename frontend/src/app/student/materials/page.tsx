"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/FormElements";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { StudentHeader } from "@/components/StudentHeader";

interface Material {
  id: string;
  name: string;
  type: string;
  url: string;
  course_name: string;
  is_visible: boolean;
}

export default function StudentMaterialsPage() {
  const { data: session } = useSession();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchMaterials();
    }
  }, [session?.user?.email]); // Use email as a stable unique identifier

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const studentId = (session?.user as any)?.id;
      if (!studentId) return;

      const response = await fetch(`${baseUrl}/api/student/${studentId}/all_materials`);
      if (response.ok) {
        const data = await response.json();
        // Ensure URLs are absolute pointing to the backend
        const formattedData = data.map((m: any) => ({
          ...m,
          url: m.url.startsWith('http') ? m.url : `${baseUrl}/${m.url}`
        }));
        setMaterials(formattedData);
        setFilteredMaterials(formattedData);
        
        // Extract unique courses
        const uniqueCourses = Array.from(new Set(formattedData.map((m: any) => m.course_name))) as string[];
        setCourses(uniqueCourses);
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourse === "All") {
      setFilteredMaterials(materials);
    } else {
      setFilteredMaterials(materials.filter(m => m.course_name === selectedCourse));
    }
  }, [selectedCourse, materials]);

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
      <StudentHeader />

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Global Library</h2>
            <p className="text-slate-500 dark:text-white/60">All materials from your enrolled courses in one place.</p>
          </div>
          
          {/* Filter */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Filter by Course:</label>
            <select 
              className="bg-white dark:bg-[#1A1A3A] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="All" className="dark:bg-[#1A1A3A]">All Courses</option>
              {courses.map(course => (
                <option key={course} value={course} className="dark:bg-[#1A1A3A]">{course}</option>
              ))}
            </select>
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : filteredMaterials.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2 text-slate-400 font-medium bg-transparent">
            {selectedCourse === "All" ? "You haven't joined any courses yet or no materials are available." : `No materials found for ${selectedCourse}.`}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((m) => (
              <Card key={m.id} className={`p-6 hover:shadow-premium transition-all border-none group relative overflow-hidden flex flex-col ${!m.is_visible ? 'opacity-60 bg-slate-50 dark:bg-white/5 grayscale' : ''}`}>
                <div className="flex items-start gap-4 mb-6">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl transition-colors ${!m.is_visible ? 'bg-slate-200 dark:bg-white/10' : 'bg-slate-50 dark:bg-white/5 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/20'}`}>
                    {getFileIcon(m.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate">{m.name}</h3>
                      {!m.is_visible && (
                        <span className="bg-slate-200 dark:bg-amber-500/20 text-slate-500 dark:text-amber-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter shrink-0">Hidden</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded">
                        {m.course_name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase">
                        {m.type}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto pt-6 border-t border-slate-50 dark:border-white/5 flex gap-2">
                  {m.is_visible ? (
                    <Link href={`/student/materials/viewer/${m.id}`} className="flex-1">
                      <Button variant="primary" size="sm" className="w-full text-xs font-bold shadow-sm">View Original</Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1 text-xs font-bold opacity-50 cursor-not-allowed" disabled>Locked by Lecturer</Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-brand-600" disabled={!m.is_visible}>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
