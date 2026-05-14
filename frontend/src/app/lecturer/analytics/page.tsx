"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/FormElements";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { LecturerHeader } from "@/components/LecturerHeader";

interface Stats {
  total_chats: number;
  total_questions: number;
  resolution_rate: number;
  hours_saved: number;
}

interface KnowledgeGap {
  topic: string;
  frequency: number;
  gap_score: number;
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div>Loading analytics...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}

function AnalyticsContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("course_id");

  const [stats, setStats] = useState<Stats | null>(null);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      console.log(`[ANALYTICS] Fetching data. Course: ${courseId || "All"}, Lecturer: ${(session.user as any).id}`);
      fetchData();
    }
  }, [courseId, session]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const lecturerId = (session?.user as any).id;
      
      const [statsRes, gapsRes, roadmapRes] = await Promise.all([
        fetch(`${baseUrl}/api/analytics/overview?course_id=${courseId || ""}&lecturer_id=${lecturerId}`),
        fetch(`${baseUrl}/api/analytics/knowledge-gaps?course_id=${courseId || ""}&lecturer_id=${lecturerId}`),
        fetch(`${baseUrl}/api/analytics/roadmap?course_id=${courseId || ""}`)
      ]);
 
      if (statsRes.ok && gapsRes.ok && roadmapRes.ok) {
        setStats(await statsRes.json());
        setGaps(await gapsRes.json());
        setRoadmapItems(await roadmapRes.json());
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F23]">
      <LecturerHeader />

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="flex justify-between items-end">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Performance & Insights</h2>
            <p className="text-slate-500 dark:text-white/60">Understand how AI is assisting your students and where they need more help.</p>
          </div>
          {!courseId && (
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-sm font-bold border border-blue-100 dark:border-blue-500/20">
              Showing Global Overview
            </div>
          )}
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 border-none shadow-premium bg-white dark:bg-[#1A1A3A]">
            <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">Total Chats</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats?.total_chats || 0}</p>
          </Card>
          <Card className="p-6 border-none shadow-premium bg-white dark:bg-[#1A1A3A]">
            <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">AI Questions Solved</p>
            <p className="text-3xl font-black text-brand-600 dark:text-brand-400">{stats?.total_questions || 0}</p>
          </Card>
          <Card className="p-6 border-none shadow-premium bg-white dark:bg-[#1A1A3A]">
            <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">AI Resolution Rate</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats?.resolution_rate || 0}%</p>
          </Card>
          <Card className="p-6 border-none shadow-premium bg-white dark:bg-[#1A1A3A] border-l-4 border-l-brand-500">
            <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">Est. Lecturer Hours Saved</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats?.hours_saved || 0}h</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Knowledge Gap Map */}
          <Card className="p-8 border-none shadow-premium bg-white dark:bg-[#1A1A3A] space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Knowledge Gap Map</h3>
              <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase">Top 10 Thắc mắc</span>
            </div>

            <div className="space-y-4">
              {gaps.length === 0 ? (
                <div className="py-20 text-center text-slate-400">No data available yet. Start more chats to see insights.</div>
              ) : (
                gaps.map((gap, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-slate-700 dark:text-white/70">{gap.topic}</span>
                      <span className="text-brand-600 dark:text-brand-400">{gap.frequency} questions</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 transition-all duration-1000"
                        style={{ width: `${Math.min(100, (gap.frequency / (gaps[0]?.frequency || 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* AI Insights Card */}
          <Card className="p-8 border-none shadow-premium bg-white dark:bg-indigo-950 text-slate-900 dark:text-white space-y-6 border-l-4 border-l-amber-500">
            <h3 className="text-xl font-bold">Proactive AI Recommendation</h3>
            <div className="space-y-4">
              {gaps.length > 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 space-y-2">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Priority 1</p>
                  <p className="text-sm text-slate-600 dark:text-slate-200">
                    Many students are struggling with <b>{gaps[0].topic}</b>. Consider spending 15 minutes reviewing this in the next lecture.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 space-y-2">
                  <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">Waiting for Data</p>
                  <p className="text-sm text-slate-400 dark:text-white/30">AI will suggest priority topics once more student interactions are recorded.</p>
                </div>
              )}
 
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 space-y-2">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Insight</p>
                <p className="text-sm text-slate-600 dark:text-slate-200">
                  AI is successfully resolving <b>{stats?.resolution_rate || 0}%</b> of questions. {stats?.hours_saved && stats.hours_saved > 0 ? `You've saved about ${stats.hours_saved} hours of manual support time.` : "Your materials are being indexed to support student learning."}
                </p>
              </div>
            </div>
            <Button className="w-full bg-brand-600 dark:bg-white text-white dark:!text-slate-900 hover:bg-brand-700 dark:hover:bg-slate-100 shadow-lg">Download Detailed Report</Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
