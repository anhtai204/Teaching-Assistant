"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/FormElements";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { LecturerHeader } from "@/components/LecturerHeader";
import { CheckCircle2, MessageSquare, Filter, Clock, AlertCircle, HelpCircle } from "lucide-react";

interface FlaggedMessage {
  id: string;
  content: string;
  student_question: string;
  is_flagged: boolean;
  was_unanswered: boolean;
  created_at: string;
  course_name: string;
  course_id: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
}

export default function ModerationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F23] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400">Loading moderation dashboard...</p>
        </div>
      </div>
    }>
      <ModerationContent />
    </Suspense>
  );
}

function ModerationContent() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get("course_id");

  const [messages, setMessages] = useState<FlaggedMessage[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourseId || "all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchPending();
  }, [selectedCourse, initialCourseId]);

  const fetchCourses = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/courses`);
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchPending = async () => {
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const courseToFetch = selectedCourse === "all" ? "" : selectedCourse;
      const response = await fetch(`${baseUrl}/api/moderation/pending?course_id=${courseToFetch}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching moderation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    const manualAnswer = answers[id];
    if (!manualAnswer || !manualAnswer.trim()) return;
    
    setIsSubmitting(true);
    setResolvingId(id);
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/moderation/resolve/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual_answer: manualAnswer }),
      });

      if (response.ok) {
        setMessages(prev => prev.filter(m => m.id !== id));
        setAnswers(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } catch (error) {
      console.error("Resolve error:", error);
    } finally {
      setIsSubmitting(false);
      setResolvingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F0F23]">
      <LecturerHeader />

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <header className="space-y-1">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Moderation Inbox</h2>
            <p className="text-slate-500 dark:text-white/60 font-medium text-sm">Fine-tune AI responses and bridge knowledge gaps across your courses.</p>
          </header>

          <div className="flex items-center gap-3 bg-white dark:bg-[#1A1A3A] p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 self-start">
            <div className="flex items-center gap-2 pl-3 border-r border-slate-100 dark:border-white/10 pr-3">
              <Filter className="w-3.5 h-3.5 text-brand-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course</span>
            </div>
            <select 
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none pr-8 cursor-pointer min-w-[150px]"
            >
              <option value="all">All Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-32 flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-400 animate-pulse tracking-wide">Syncing moderation data...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-4 bg-white dark:bg-[#1A1A3A] rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm">
             <div className="h-20 w-20 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
             </div>
             <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Inbox Zero!</h3>
                <p className="text-sm text-slate-500 dark:text-white/60 max-w-xs mx-auto">All student inquiries have been addressed. Your AI is performing optimally.</p>
             </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {messages.map(msg => (
              <Card key={msg.id} className="p-5 border-none shadow-premium dark:bg-[#1A1A3A] hover:shadow-lg transition-all duration-300 rounded-[1.5rem]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-slate-50 dark:border-white/5 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[9px] font-black text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      {msg.course_name}
                    </div>
                    {msg.is_flagged && (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-100 dark:border-red-500/20">
                        <AlertCircle className="w-2.5 h-2.5" /> Flagged
                      </span>
                    )}
                    {msg.was_unanswered && (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 border border-amber-100 dark:border-amber-500/20">
                        <HelpCircle className="w-2.5 h-2.5" /> Unanswered
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 dark:text-white/30 uppercase">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(msg.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-6">
                  {/* Left Column: Context */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <MessageSquare className="w-2.5 h-2.5" /> Question
                        </label>
                        <div className="text-xs font-bold leading-relaxed text-slate-700 dark:text-white bg-slate-50/80 dark:bg-white/5 p-4 rounded-2xl border border-slate-100/50 dark:border-white/5 italic">
                          "{msg.student_question}"
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 flex items-center justify-center text-[5px] text-white font-black">AI</div> Response
                        </label>
                        <div className="text-xs leading-relaxed text-slate-500 dark:text-white/50 p-4 border border-slate-100 dark:border-white/10 rounded-2xl bg-white/30 dark:bg-transparent">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Action */}
                  <div className="lg:col-span-5 flex flex-col gap-3">
                    <div className="relative flex-1">
                      <textarea 
                        className="w-full h-full min-h-[100px] p-4 bg-white dark:bg-[#0F0F23] border border-slate-200 dark:border-white/10 rounded-2xl text-xs dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none resize-none shadow-sm leading-relaxed"
                        placeholder="Type the definitive correction..."
                        value={answers[msg.id] || ""}
                        onChange={(e) => {
                          setAnswers(prev => ({ ...prev, [msg.id]: e.target.value }));
                        }}
                        disabled={isSubmitting}
                      />
                    </div>
                    <Button 
                      className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-brand-500/10 hover:shadow-lg transition-all" 
                      onClick={() => handleResolve(msg.id)}
                      disabled={isSubmitting || !answers[msg.id]?.trim()}
                      isLoading={isSubmitting && resolvingId === msg.id}
                    >
                      Resolve Issue
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
