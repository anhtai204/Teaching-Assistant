"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/FormElements";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { LecturerHeader } from "@/components/LecturerHeader";

interface FlaggedMessage {
  id: string;
  content: string;
  student_question: string;
  is_flagged: boolean;
  was_unanswered: boolean;
  created_at: string;
}

export default function ModerationPage() {
  return (
    <Suspense fallback={<div>Loading moderation...</div>}>
      <ModerationContent />
    </Suspense>
  );
}

function ModerationContent() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("course_id");

  const [messages, setMessages] = useState<FlaggedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/moderation/pending?course_id=${courseId}`);
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F23]">
      <LecturerHeader />

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <header>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Moderation Inbox</h2>
          <p className="text-slate-500 dark:text-white/60">Correct AI mistakes or provide missing answers for your students.</p>
        </header>

        {isLoading ? (
          <div className="py-20 text-center text-slate-400">Loading pending questions...</div>
        ) : messages.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2 border-slate-200 dark:border-white/10 text-slate-400 bg-transparent">
            All clear! No pending questions at the moment.
          </Card>
        ) : (
          <div className="space-y-6">
            {messages.map(msg => (
              <Card key={msg.id} className="p-6 space-y-6 border-none shadow-premium overflow-hidden dark:bg-[#1A1A3A]">
                <div className="flex items-start justify-between">
                  <div className="flex gap-2">
                    {msg.is_flagged && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-red-50 text-red-600 border border-red-100">
                        Student Flagged
                      </span>
                    )}
                    {msg.was_unanswered && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-amber-50 text-amber-600 border border-amber-100">
                        AI Unanswered
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{new Date(msg.created_at).toLocaleString()}</span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest block mb-2">Student Question</label>
                      <p className="text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">{msg.student_question}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest block mb-2">AI Response</label>
                      <p className="text-sm text-slate-600 dark:text-white/60 p-4 border border-slate-100 dark:border-white/10 rounded-2xl">{msg.content}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest block">Manual Correction</label>
                    <textarea 
                      className="w-full h-32 p-4 bg-white dark:bg-[#0F0F23] border border-slate-200 dark:border-white/10 rounded-2xl text-sm dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all outline-none"
                      placeholder="Type the correct answer here..."
                      value={answers[msg.id] || ""}
                      onChange={(e) => {
                        setAnswers(prev => ({ ...prev, [msg.id]: e.target.value }));
                      }}
                      disabled={isSubmitting}
                    />
                    <Button 
                      className="w-full" 
                      onClick={() => handleResolve(msg.id)}
                      disabled={isSubmitting || !answers[msg.id]?.trim()}
                      isLoading={isSubmitting && resolvingId === msg.id}
                    >
                      {isSubmitting && resolvingId === msg.id ? "Submitting..." : "Send to Student & Save to FAQ"}
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
