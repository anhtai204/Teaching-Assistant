"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, Input } from "@/components/ui/FormElements";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { StudentHeader } from "@/components/StudentHeader";
import { toast } from "sonner";

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
  const [isRequesting, setIsRequesting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  // Form state
  const [reqTopic, setReqTopic] = useState("");
  const [reqCourse, setReqCourse] = useState("");
  const [reqDesc, setReqDesc] = useState("");

  useEffect(() => {
    if (session?.user) {
      fetchMaterials();
      fetchRequests();
    }
  }, [session?.user?.email]);

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

        // Extract unique individual courses from comma-separated strings
        const allCourseNames = formattedData.flatMap((m: any) =>
          m.course_name && m.course_name !== "Unassigned" ? m.course_name.split(", ") : []
        );
        const uniqueCourses = Array.from(new Set(allCourseNames)).sort() as string[];
        setCourses(uniqueCourses);
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const studentId = (session?.user as any)?.id;
      if (!studentId) return;

      const response = await fetch(`${baseUrl}/api/materials/requests?student_id=${studentId}`);
      if (response.ok) {
        setRequests(await response.json());
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTopic || !reqCourse) {
      toast.error("Vui lòng điền tên chủ đề và chọn khóa học.");
      return;
    }

    setIsRequesting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const studentId = (session?.user as any)?.id;

      const coursesRes = await fetch(`${baseUrl}/api/student/${studentId}/courses`);
      const studentCourses = await coursesRes.json();
      const courseObj = studentCourses.find((c: any) => c.name === reqCourse);

      if (!courseObj) {
        toast.error("Không tìm thấy khóa học hợp lệ.");
        return;
      }

      const response = await fetch(`${baseUrl}/api/materials/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          course_id: courseObj.id,
          topic_name: reqTopic,
          description: reqDesc
        }),
      });

      if (response.ok) {
        toast.success("Yêu cầu của bạn đã được gửi thành công!");
        setIsModalOpen(false);
        setReqTopic("");
        setReqDesc("");
        fetchRequests();
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Lỗi khi gửi yêu cầu.");
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    if (selectedCourse === "All") {
      setFilteredMaterials(materials);
    } else {
      // Use .includes to support many-to-many links
      setFilteredMaterials(materials.filter(m =>
        m.course_name && m.course_name.split(", ").includes(selectedCourse)
      ));
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

          <div className="flex items-center gap-4">
            <Button onClick={() => setIsModalOpen(true)} variant="outline" className="text-brand-600 border-brand-200 hover:bg-brand-50">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Request New Material
            </Button>

            {/* Filter */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Filter:</label>
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
          </div>
        </header>

        {requests.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Your Material Requests</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requests.map((req) => (
                <div key={req.id} className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 p-5 rounded-2xl shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-slate-800 dark:text-white line-clamp-1">{req.topic_name}</p>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                      req.status === 'pending' ? 'bg-amber-100 text-amber-600 animate-pulse' : 
                      req.status === 'fulfilled' ? 'bg-green-100 text-green-600' : 
                      'bg-red-100 text-red-600'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  
                  {req.lecturer_comment && (
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Lecturer Response:</p>
                      <p className="text-xs text-slate-600 dark:text-white/70 italic">"{req.lecturer_comment}"</p>
                    </div>
                  )}
                  
                  <p className="text-[9px] text-slate-400">Requested on {new Date(req.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </section>
        )}

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
                    <div className="flex flex-wrap gap-1 items-center">
                      {m.course_name && m.course_name !== "Unassigned" ? (
                        m.course_name.split(", ").map((name, idx) => (
                          <span key={idx} className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-100/50 dark:border-brand-500/20">
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Library</span>
                      )}
                      <span className="text-[10px] font-bold text-slate-300 dark:text-white/20 uppercase ml-1">
                        • {m.type}
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

      {/* Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0F0F23] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-white/10">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Request Material</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Topic Name</label>
                  <Input
                    placeholder="e.g. Backpropagation in Neural Networks"
                    value={reqTopic}
                    onChange={(e) => setReqTopic(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Course</label>
                  <select
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    value={reqCourse}
                    onChange={(e) => setReqCourse(e.target.value)}
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Additional Details (Optional)</label>
                  <textarea
                    className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-slate-900 dark:text-white transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                    rows={3}
                    placeholder="Tell the lecturer what exactly you are looking for..."
                    value={reqDesc}
                    onChange={(e) => setReqDesc(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" variant="primary" className="flex-1" isLoading={isRequesting}>Submit Request</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
