"use client";

import { Card } from "@/components/ui/FormElements";
import { UploadCloud, FileText, Database, Shield, Eye, EyeOff, Trash2, LayoutDashboard, MessageSquare, BarChart3, ShieldAlert, X, CheckCircle2, AlertCircle, ExternalLink, Clock, PlusCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LecturerHeader } from "@/components/LecturerHeader";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

interface Material {
  id: string;
  name: string;
  type: string;
  status: string;
  is_visible: boolean;
  course_name?: string;
  progress?: number;
}

export default function LecturerMaterialsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Synchronizing Knowledge...</p>
        </div>
      </div>
    }>
      <MaterialsContent />
    </Suspense>
  );
}

function MaterialsContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("course_id");

  const [materials, setMaterials] = useState<Material[]>([]);
  const [courseName, setCourseName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMaterials();
    if (courseId) {
      fetchCourseDetails();
    } else {
      setCourseName("All Courses");
    }
  }, [courseId, session?.user?.email]);

  const fetchCourseDetails = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/courses`);
      if (response.ok) {
        const data = await response.json();
        const course = data.find((c: any) => c.id === courseId);
        if (course) setCourseName(course.name);
      }
    } catch (error) {
      console.error("Error fetching course details:", error);
    }
  };

  useEffect(() => {
    const hasProcessing = materials.some(
      m => m.status.toLowerCase() === "processing" || m.status.toLowerCase() === "pending"
    );

    if (hasProcessing) {
      const interval = setInterval(() => {
        fetchMaterials(false);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [materials]);

  const fetchMaterials = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      let url = `${baseUrl}/api/materials?`;

      if (courseId) {
        url += `course_id=${courseId}`;
      } else if (session?.user) {
        url += `lecturer_id=${(session.user as any).id}`;
      } else {
        setIsLoading(false);
        return;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMaterials(data);
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const processFileUpload = async (file: File) => {
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/materials/upload?course_id=${courseId}`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        fetchMaterials(false);
      } else {
        const err = await response.json();
        alert(err.detail || "Upload failed.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error connecting to backend.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => processFileUpload(file));
    }
  };

  const handleToggleVisibility = async (id: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/materials/${id}/visibility`, {
        method: "PATCH",
      });

      if (response.ok) {
        setMaterials(prev => prev.map(m => m.id === id ? { ...m, is_visible: !m.is_visible } : m));
      }
    } catch (error) {
      console.error("Toggle visibility error:", error);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material? This will also remove it from AI memory.")) return;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/materials/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMaterials(prev => prev.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files) {
      Array.from(files).forEach(file => processFileUpload(file));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F0F23] font-['Open_Sans']">
      <LecturerHeader />

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white leading-tight">
              {courseName ? `${courseName} ` : "Course "}
              <span className="text-blue-600 dark:text-blue-400">Knowledge Base</span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-white/60 font-medium max-w-2xl">
              Feed your AI teaching assistant with official documents, lecture notes, and media files to improve accuracy.
            </p>
          </div>
          <Button
            className="h-16 px-10 text-lg shadow-xl shadow-blue-500/20"
            onClick={handleUploadClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <PlusCircle className="w-6 h-6" />
                Add Document
              </span>
            )}
          </Button>
        </header>

        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.docx,.pptx,.txt,.md,.mp3,.mp4,.wav,.m4a,.flac"
          multiple
        />

        {/* Upload Zone */}
        <div
          className={`p-20 border-4 border-dashed rounded-[3rem] bg-white dark:bg-[#1A1A3A] flex flex-col items-center justify-center text-center space-y-6 transition-all duration-500 cursor-pointer ${isDragging
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 scale-[1.02] shadow-2xl"
            : "border-slate-100 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-slate-50/50 dark:hover:bg-white/5 shadow-sm"
            }`}
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="h-24 w-24 rounded-[2rem] bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200">
            <UploadCloud className="h-12 w-12" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-slate-900">
              {isUploading ? "Injecting Knowledge..." : "Drop files here or click to browse"}
            </p>
            <p className="text-base text-slate-400 font-medium max-w-md mx-auto">
              Smart ingestion supports PDF, Office, Markdown, and Audio/Video transcription.
            </p>
          </div>
        </div>

        {/* Materials Table */}
        <Card className="overflow-hidden border-none shadow-2xl rounded-[2rem]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC] dark:bg-[#0F0F23] border-b border-slate-100 dark:border-white/5">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-white/60 uppercase tracking-[0.2em]">Document Identity</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-white/60 uppercase tracking-[0.2em]">Linked Workspace</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-white/60 uppercase tracking-[0.2em]">Format</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-white/60 uppercase tracking-[0.2em]">AI Readiness</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-white/60 uppercase tracking-[0.2em] text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5 bg-white dark:bg-[#1A1A3A]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-14 w-14 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Optimizing Data Vectors...</p>
                      </div>
                    </td>
                  </tr>
                ) : materials.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-300">
                        <Database className="w-16 h-16" />
                        <p className="text-xl font-bold text-slate-400">Knowledge Base Empty</p>
                        <p className="text-sm font-medium text-slate-400">Upload your first document to begin.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  materials.map((m) => (
                    <tr key={m.id} className={`hover:bg-blue-50/30 dark:hover:bg-white/5 transition-all duration-300 group ${!m.is_visible ? "bg-slate-50/50 dark:bg-white/[0.02]" : ""}`}>
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-5">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${m.is_visible ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"
                            }`}>
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <span className={`text-base font-bold transition-colors ${m.is_visible ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-white/30"}`}>{m.name}</span>
                            <div className="flex items-center gap-2 mt-1 opacity-50">
                              <Clock className="w-3 h-3 text-slate-400 dark:text-white" />
                              <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 dark:text-white">Uploaded Recently</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-3 py-1.5 rounded-full uppercase tracking-tighter">
                          {m.course_name}
                        </span>
                      </td>
                      <td className="px-8 py-7">
                        <span className="text-xs font-bold text-slate-400 dark:text-white/50 uppercase tracking-widest">{m.type}</span>
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex flex-wrap gap-3">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            m.status.toLowerCase() === "indexed" ? "bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" :
                            m.status.toLowerCase() === "processing" ? "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 animate-pulse" :
                            "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                            }`}>
                            {m.status.toLowerCase() === "indexed" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {m.status}
                          </div>
                          {!m.is_visible && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 border-slate-200 dark:border-white/10 border">
                              <EyeOff className="w-3 h-3" />
                              Shadow Mode
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-7 text-right">
                        <div className="flex justify-end items-center gap-3 transition-all duration-300">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleVisibility(m.id)}
                            className={`h-10 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${m.is_visible
                              ? "text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10"
                              : "text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/20 dark:hover:text-blue-400 dark:hover:bg-blue-500/30"
                              }`}
                          >
                            {m.is_visible ? <><Eye className="w-4 h-4 mr-2" /> Hide</> : <><EyeOff className="w-4 h-4 mr-2" /> Show</>}
                          </Button>
                          <button
                            className="p-2.5 text-slate-300 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                            onClick={() => handleDeleteMaterial(m.id)}
                            title="Purge Document"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
