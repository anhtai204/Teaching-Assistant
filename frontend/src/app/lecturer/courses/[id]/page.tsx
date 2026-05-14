"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
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

  const [activeTab, setActiveTab] = useState<"settings" | "students" | "analytics" | "requests">("settings");
  const [requests, setRequests] = useState<any[]>([]);
  const [responseNotes, setResponseNotes] = useState<{[key: string]: string}>({});
  const [overview, setOverview] = useState<any>(null);
  const [knowledgeGaps, setKnowledgeGaps] = useState<any[]>([]);
  const [roadmapProgress, setRoadmapProgress] = useState<any[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
      if (activeTab === "analytics") {
        fetchAnalytics();
      }
    }
  }, [id, activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Fetch course details
      const courseRes = await fetch(`${baseUrl}/api/courses/${id}`);
      if (courseRes.ok) {
        const data = await courseRes.json();
        setCourse(data);
        setGreeting(data.greeting_message || "");
      }

      // Fetch students
      const studentsRes = await fetch(`${baseUrl}/api/courses/${id}/students`);
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data);
      }

      // Fetch requests
      const requestsRes = await fetch(`${baseUrl}/api/materials/requests?course_id=${id}`);
      if (requestsRes.ok) {
        setRequests(await requestsRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const [overviewRes, gapsRes, roadmapRes, pendingRes] = await Promise.all([
        fetch(`${baseUrl}/api/analytics/overview?course_id=${id}`),
        fetch(`${baseUrl}/api/analytics/knowledge-gaps?course_id=${id}`),
        fetch(`${baseUrl}/api/analytics/roadmap?course_id=${id}`),
        fetch(`${baseUrl}/api/moderation/pending?course_id=${id}`)
      ]);

      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (gapsRes.ok) setKnowledgeGaps(await gapsRes.json());
      if (roadmapRes.ok) setRoadmapProgress(await roadmapRes.json());
      if (pendingRes.ok) setPendingQuestions(await pendingRes.json());
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  };

  const handleAnalyzeInsights = async () => {
    setIsAnalyzing(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/analytics/analyze?course_id=${id}`, {
        method: "POST"
      });
      if (response.ok) {
        const result = await response.json();
        toast.success(`Phân tích hoàn tất! Đã tìm thấy ${result.gaps_found} lỗ hổng kiến thức mới.`);
        fetchAnalytics(); // Refresh data
      }
    } catch (error) {
      console.error("Failed to analyze insights:", error);
    } finally {
      setIsAnalyzing(false);
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
        toast.success("Cài đặt đã được lưu thành công!");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    toast("Xác nhận xóa sinh viên khỏi khóa học?", {
      action: {
        label: "Xóa ngay",
        onClick: async () => {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${baseUrl}/api/courses/${id}/students/${studentId}`, {
              method: "DELETE",
            });

            if (response.ok) {
              setStudents(students.filter(s => s.id !== studentId));
              toast.success("Đã xóa sinh viên thành công.");
            }
          } catch (error) {
            console.error("Failed to remove student:", error);
            toast.error("Lỗi khi xóa sinh viên.");
          }
        }
      }
    });
  };

  const handleUpdateRequestStatus = async (requestId: string, newStatus: string) => {
    const comment = responseNotes[requestId] || "";
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/materials/requests/${requestId}/status?status=${newStatus}&comment=${encodeURIComponent(comment)}`, {
        method: "PATCH"
      });
      if (response.ok) {
        toast.success(`Yêu cầu đã được cập nhật thành ${newStatus}`);
        setRequests(requests.map(r => r.id === requestId ? { ...r, status: newStatus, lecturer_comment: comment } : r));
      }
    } catch (error) {
      console.error("Failed to update request status:", error);
    }
  };

  if (isLoading && !course) return <div className="p-20 text-center">Loading...</div>;
  if (!course) return <div className="p-20 text-center text-red-500">Course not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F23]">
    <nav className="bg-white dark:bg-[#0F0F23] border-b border-slate-200 dark:border-white/5 px-6 py-4 sticky top-0 z-80">
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

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-[#0F0F23] border-b border-slate-200 dark:border-white/5 px-6">
        <div className="max-w-7xl mx-auto flex gap-8">
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-4 font-bold text-sm border-b-2 transition-colors ${activeTab === "settings" ? "border-brand-500 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-900"}`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`py-4 font-bold text-sm border-b-2 transition-colors ${activeTab === "students" ? "border-brand-500 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-900"}`}
          >
            Students ({students.length})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`py-4 font-bold text-sm border-b-2 transition-colors ${activeTab === "analytics" ? "border-brand-500 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-900"}`}
          >
            Analytics & Insights
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`py-4 font-bold text-sm border-b-2 transition-colors ${activeTab === "requests" ? "border-brand-500 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-900"}`}
          >
            Material Requests ({requests.filter(r => r.status === 'pending').length})
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">General Info</h2>
              <Card className="p-6 space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Enrollment Code</p>
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                    <span className="text-2xl font-mono font-bold text-brand-600 tracking-wider">{course.enrollment_code}</span>
                    <Button variant="ghost" size="sm" onClick={() => {
                      navigator.clipboard.writeText(course.enrollment_code);
                      toast.success("Đã sao chép mã đăng ký!");
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
        )}

        {activeTab === "students" && (
          <div className="space-y-4">
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
        )}

        {activeTab === "analytics" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-6 border-l-4 border-l-blue-500">
                <h3 className="text-sm font-bold text-slate-500 uppercase">Total Chats</h3>
                <p className="text-4xl font-black text-slate-900 mt-2">{overview?.total_chats || 0}</p>
              </Card>
              <Card className="p-6 border-l-4 border-l-brand-500">
                <h3 className="text-sm font-bold text-slate-500 uppercase">Questions Answered</h3>
                <p className="text-4xl font-black text-slate-900 mt-2">{overview?.total_questions || 0}</p>
              </Card>
              <Card className="p-6 border-l-4 border-l-green-500">
                <h3 className="text-sm font-bold text-slate-500 uppercase">Resolution Rate</h3>
                <p className="text-4xl font-black text-slate-900 mt-2">{overview?.resolution_rate || 0}%</p>
              </Card>
              <Card className="p-6 border-l-4 border-l-purple-500">
                <h3 className="text-sm font-bold text-slate-500 uppercase">Hours Saved</h3>
                <p className="text-4xl font-black text-slate-900 mt-2">{overview?.hours_saved || 0}h</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Knowledge Gaps */}
              <section className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Knowledge Gaps</h2>
                    <p className="text-sm text-slate-500 font-medium">Topics students struggle with most, identified by AI.</p>
                  </div>
                  <Button size="sm" onClick={handleAnalyzeInsights} isLoading={isAnalyzing} className="shadow-md">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Insights
                  </Button>
                </div>
                
                <Card className="overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Struggling Topic</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Frequency</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Severity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {knowledgeGaps.map((gap, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{gap.topic}</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-600">{gap.frequency}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${gap.gap_score >= 8 ? 'bg-red-100 text-red-700' : gap.gap_score >= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                              {gap.gap_score}/10
                            </span>
                          </td>
                        </tr>
                      ))}
                      {knowledgeGaps.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className="text-slate-500 font-medium">No knowledge gaps detected.</p>
                            <p className="text-sm text-slate-400 mt-1">Click "Generate Insights" to let AI analyze recent chats.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Card>
              </section>

              {/* Class Roadmap Progress */}
              <section className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Class Roadmap Progress</h2>
                    <p className="text-sm text-slate-500 font-medium">Aggregated progress across all enrolled students.</p>
                  </div>
                </div>
                
                <Card className="overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Learning Topic</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Students</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right w-1/3">Avg. Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roadmapProgress.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800 truncate max-w-[200px]" title={item.topic}>{item.topic}</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-600">{item.student_count}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center gap-3 justify-end">
                              <div className="w-full bg-slate-100 rounded-full h-2">
                                <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${item.avg_progress}%` }}></div>
                              </div>
                              <span className="text-xs font-bold text-slate-500 w-8">{item.avg_progress}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {roadmapProgress.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-medium">
                            No roadmap data available yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Card>
              </section>
            </div>

            {/* Flagged & Unresolved Questions (Raw Data) */}
            <section className="space-y-4 pt-4">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Pending Moderation</h2>
                  <p className="text-sm text-slate-500 font-medium">Raw list of questions students rated as 'Bad' or explicitly reported.</p>
                </div>
                {pendingQuestions.length > 0 && (
                  <Link href={`/lecturer/moderation?course_id=${id}`}>
                    <Button size="sm" variant="outline">
                      Go to Moderation Dashboard &rarr;
                    </Button>
                  </Link>
                )}
              </div>
              
              <Card className="overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Student Question</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-1/2">AI Response</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingQuestions.slice(0, 5).map((msg, i) => (
                      <tr key={msg.id || i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 text-sm">{msg.student_question || "Unknown Question"}</div>
                          <div className="mt-2 flex gap-2">
                            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-red-50 text-red-600 border border-red-100">Negative Feedback</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          <div className="line-clamp-3">{msg.ai_answer || msg.content}</div>
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-slate-500 whitespace-nowrap">
                          {new Date(msg.flagged_at || msg.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {pendingQuestions.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-medium">
                          No pending questions. AI is performing well!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </section>
          </div>
        )}

        {activeTab === "requests" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Student Material Requests</h2>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Topic</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Description</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Student</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Lecturer Response</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{req.topic_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 italic">{req.description || "No description"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{req.student_name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : req.status === 'fulfilled' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {req.status === 'pending' ? (
                            <input 
                              type="text"
                              placeholder="Lời nhắn cho sinh viên..."
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-brand-500"
                              value={responseNotes[req.id] || ""}
                              onChange={(e) => setResponseNotes({...responseNotes, [req.id]: e.target.value})}
                            />
                          ) : (
                            <span className="text-xs text-slate-500 italic">{req.lecturer_comment || "Không có phản hồi"}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {req.status === 'pending' && (
                              <>
                                <Button size="sm" onClick={() => handleUpdateRequestStatus(req.id, "fulfilled")}>Fulfill</Button>
                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleUpdateRequestStatus(req.id, "rejected")}>Reject</Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {requests.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-slate-500">No requests yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
