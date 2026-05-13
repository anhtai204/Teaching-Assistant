"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/FormElements";
import { Button } from "@/components/ui/Button";
import { StudentHeader } from "@/components/StudentHeader";
import { BookOpen, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface RevisionSuggestion {
  topic: string;
  reason: string;
  difficulty: "High" | "Medium" | "Low";
}

export default function StudentRevisionPage() {
  const { data: session } = useSession();
  const studentId = (session?.user as any)?.id;
  const [suggestions, setSuggestions] = useState<RevisionSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevisionData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/student/revision?user_id=${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch revision data");
      const data = await res.json();
      setSuggestions(data.suggestions);
    } catch (err: any) {
      setError(err.message);
      toast.error("Không thể tải dữ liệu ôn tập.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      fetchRevisionData();
    }
  }, [studentId, fetchRevisionData]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F23]">
      <StudentHeader />

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <header className="space-y-3 relative">
          <div className="absolute -top-6 -left-6 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Lộ trình Ôn tập</h2>
          </div>
          <p className="text-slate-500 dark:text-white/70 max-w-2xl leading-relaxed">
            Dựa trên lịch sử hội thoại và tiến độ học tập, AI đã xác định các chủ đề bạn cần củng cố để đạt kết quả tốt nhất.
          </p>
        </header>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nội dung ưu tiên</h3>
            {loading && <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />}
          </div>

          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-12 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500/50" />
              <p className="text-slate-500 dark:text-white/40">{error}</p>
              <Button onClick={fetchRevisionData} variant="outline">Thử lại</Button>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-12 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center text-center space-y-4">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-white/20" />
              <p className="text-slate-500 dark:text-white/60">Bạn đang làm rất tốt! Chưa có lỗ hổng kiến thức nào được phát hiện.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {suggestions.map((item, idx) => (
                <RevisionItem 
                  key={idx}
                  topic={item.topic} 
                  reason={item.reason}
                  difficulty={item.difficulty}
                />
              ))}
            </div>
          )}
        </section>

        <Card className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-900/40 dark:to-purple-900/40 text-white flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative border-none shadow-2xl shadow-indigo-500/20">
          <div className="space-y-3 relative z-10 text-center md:text-left">
            <h3 className="text-2xl font-bold dark:text-white">Sẵn sàng cho một bài kiểm tra nhanh?</h3>
            <p className="text-indigo-100 dark:text-white/60 max-w-md">
              Làm bài kiểm tra 5 phút về những chủ đề này để đánh giá lại mức độ hiểu bài của bạn.
            </p>
          </div>
          <Button size="lg" className="relative z-10 bg-white !text-indigo-600 hover:bg-indigo-50 font-bold px-8 h-14 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95">
            Bắt đầu ôn luyện
          </Button>
          <div className="absolute top-0 right-0 h-64 w-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 bg-purple-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
        </Card>
      </main>
    </div>
  );
}

function RevisionItem({ topic, reason, difficulty }: { topic: string, reason: string, difficulty: "High" | "Medium" | "Low" }) {
  return (
    <Card className="p-6 flex items-start justify-between gap-4 border-none shadow-sm dark:bg-[#1A1A3A]">
      <div className="space-y-1">
        <h4 className="font-bold text-slate-900 dark:text-white">{topic}</h4>
        <p className="text-sm text-slate-500 dark:text-white/70">{reason}</p>
      </div>
      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
        difficulty === "High" ? "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400" :
        difficulty === "Medium" ? "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" :
        "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      }`}>
        {difficulty} Difficulty
      </span>
    </Card>
  );
}
