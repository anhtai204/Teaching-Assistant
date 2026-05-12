"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/FormElements";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { StudentHeader } from "@/components/StudentHeader";
import { Folder, Upload, Globe, User, Search, Filter, Loader2, CheckCircle2, X, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";

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
  const [activeTab, setActiveTab] = useState<"courses" | "personal">("courses");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user) {
      fetchMaterials();
    }
  }, [session?.user?.email, activeTab]);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const studentId = (session?.user as any)?.id;
      if (!studentId) return;

      const mode = activeTab === "courses" ? "course" : "personal";
      const url = activeTab === "courses" 
        ? `/api/materials?user_id=${studentId}&mode=all` // All authorized materials
        : `/api/materials?user_id=${studentId}&mode=personal`;

      const response = await apiFetch(url);
      if (response.ok) {
        const data = await response.json();
        const formattedData = data.map((m: any) => ({
          ...m,
          url: m.url ? (m.url.startsWith('http') ? m.url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/${m.url}`) : "#"
        }));
        setMaterials(formattedData);
        setFilteredMaterials(formattedData);
        
        if (activeTab === "courses") {
          const uniqueCourses = Array.from(new Set(formattedData.map((m: any) => m.course_name).filter(Boolean))) as string[];
          setCourses(uniqueCourses);
        }
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", (session.user as any).id);

    try {
      const response = await apiFetch(`/api/materials/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        fetchMaterials();
      } else {
        alert("Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (activeTab === "courses") {
      if (selectedCourse === "All") {
        setFilteredMaterials(materials);
      } else {
        setFilteredMaterials(materials.filter(m => m.course_name === selectedCourse));
      }
    } else {
      setFilteredMaterials(materials);
    }
  }, [selectedCourse, materials, activeTab]);

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
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white">Library</h2>
            <p className="text-slate-500 dark:text-white/60 font-medium">Manage your academic resources and personal uploads.</p>
          </div>

          <div className="flex bg-white dark:bg-[#1A1A3A] p-1.5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
            <button
              onClick={() => setActiveTab("courses")}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "courses" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                : "text-slate-500 dark:text-white/40 hover:text-indigo-600 dark:hover:text-indigo-400"
              }`}
            >
              <Globe className="w-4 h-4" />
              Course Materials
            </button>
            <button
              onClick={() => setActiveTab("personal")}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "personal" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                : "text-slate-500 dark:text-white/40 hover:text-indigo-600 dark:hover:text-indigo-400"
              }`}
            >
              <User className="w-4 h-4" />
              My Uploads
            </button>
          </div>
        </header>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-6">
            {activeTab === "courses" && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter:</span>
                <select 
                  className="bg-transparent border-none text-sm font-bold text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                >
                  <option value="All">All Courses</option>
                  {courses.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {filteredMaterials.length} Items Found
            </div>
          </div>

          {activeTab === "personal" && (
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                className="h-10 px-6 gap-2 shadow-indigo-500/10"
                isLoading={isUploading}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-white dark:bg-[#1A1A3A] rounded-3xl animate-pulse border border-slate-100 dark:border-white/5" />
            ))}
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="py-32 text-center bg-white dark:bg-[#1A1A3A] border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
            <div className="bg-slate-50 dark:bg-white/5 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
              <Folder className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No files found</h4>
            <p className="text-slate-500 dark:text-white/40 max-w-xs mx-auto font-medium">
              {activeTab === "courses" 
                ? "Join your first course to see academic materials here." 
                : "Upload your personal notes and references to use with AI Assistant."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((m) => (
              <Card key={m.id} className={`p-7 hover:shadow-xl transition-all border-none group relative overflow-hidden flex flex-col dark:bg-[#1A1A3A] ${!m.is_visible ? 'opacity-60 grayscale' : ''}`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-bl-[60px] -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500" />
                
                <div className="flex items-start gap-5 mb-8 relative z-10">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm transition-colors ${!m.is_visible ? 'bg-slate-100 dark:bg-white/5' : 'bg-slate-50 dark:bg-white/10 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-6'}`}>
                    {getFileIcon(m.type)}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate text-lg group-hover:text-indigo-600 transition-colors" title={m.name}>{m.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        {m.course_name || "Personal"}
                      </span>
                      <span className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {m.type}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto pt-6 border-t border-slate-50 dark:border-white/5 flex gap-3 relative z-10">
                  {m.is_visible ? (
                    <Link href={`/student/materials/viewer/${m.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs font-bold h-10 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all">View Document</Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1 text-xs font-bold opacity-50 cursor-not-allowed h-10" disabled>Locked</Button>
                  )}
                  <a href={m.url} download={m.name} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" disabled={!m.is_visible}>
                      <Upload className="h-5 w-5 rotate-180" />
                    </Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
