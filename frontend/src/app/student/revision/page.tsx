"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/FormElements";
import { Button } from "@/components/ui/Button";
import { StudentHeader } from "@/components/StudentHeader";
import { BookOpen, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import QuizModal from "@/components/student/QuizModal";

interface RevisionSuggestion {
  course_id?: string;
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
  
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

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

  const fetchQuizHistory = useCallback(async () => {
    if (!studentId) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/quiz/history?user_id=${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistory(data.attempts);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      fetchRevisionData();
      fetchQuizHistory();
    }
  }, [studentId, fetchRevisionData, fetchQuizHistory]);

  const startQuickQuiz = async () => {
    const ids = Array.from(new Set(suggestions.map(s => s.course_id).filter(Boolean))) as string[];
    if (ids.length === 0) {
      toast.info("Hiện chưa có bài kiểm tra phù hợp cho các chủ đề này.");
      return;
    }

    setIsGenerating(true);
    toast.promise(
      (async () => {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${baseUrl}/api/quiz/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: studentId,
            course_ids: ids,
            count: 15,
            topics: suggestions.map(s => s.topic)
          })
        });
        if (!res.ok) throw new Error("Failed to generate quiz");
        const data = await res.json();
        await fetchQuizHistory();
        return data;
      })(),
      {
        loading: 'AI đang soạn đề ôn tập cho bạn...',
        success: (data) => {
          setIsGenerating(false);
          setSelectedAttemptId(data.attempt_id);
          setShowQuiz(true);
          return "Đề thi đã sẵn sàng!";
        },
        error: (err) => {
          setIsGenerating(false);
          return "Không thể soạn đề lúc này. Vui lòng thử lại sau.";
        }
      }
    );
  };

  const resumeAttempt = (id: string) => {
    setSelectedAttemptId(id);
    setShowQuiz(true);
  };

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
            <h3 className="text-2xl font-bold dark:text-white">Củng cố kiến thức ngay</h3>
            <p className="text-indigo-100 dark:text-white/60 max-w-md">
              Làm bài kiểm tra 15 câu hỏi tập trung vào các nội dung ưu tiên của tất cả các môn học.
            </p>
          </div>
          <Button 
            size="lg" 
            onClick={startQuickQuiz}
            disabled={isGenerating}
            className="relative z-10 bg-white !text-indigo-600 hover:bg-indigo-50 font-bold px-8 h-14 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Bắt đầu ôn luyện"}
          </Button>
          <div className="absolute top-0 right-0 h-64 w-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 bg-purple-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
        </Card>

        {/* Quiz History Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Lịch sử ôn tập</h3>
          </div>

          <div className="grid gap-4">
            {history.length === 0 ? (
              <div className="p-10 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center text-slate-400">
                Chưa có lịch sử làm bài.
              </div>
            ) : (
              history.map((attempt) => (
                <Card key={attempt.id} className="p-5 flex items-center justify-between gap-4 border-none shadow-sm dark:bg-[#1A1A3A] transition-hover hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                      attempt.status === 'completed' 
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" 
                        : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"
                    }`}>
                      {attempt.status === 'completed' ? `${attempt.percentage}%` : "..."}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white">
                          {attempt.title || `Ôn luyện ${attempt.total} câu`}
                        </h4>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          attempt.status === 'completed' 
                            ? "bg-emerald-100 text-emerald-600" 
                            : "bg-amber-100 text-amber-600"
                        }`}>
                          {attempt.status === 'completed' ? "Hoàn thành" : "Đang chờ"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-white/40">
                        {new Date(attempt.created_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant={attempt.status === 'completed' ? "outline" : "primary"}
                    size="sm"
                    onClick={() => resumeAttempt(attempt.id)}
                    className="rounded-xl font-bold"
                  >
                    {attempt.status === 'completed' ? "Xem lại" : "Làm bài ngay"}
                  </Button>
                </Card>
              ))
            )}
          </div>
        </section>

        {showQuiz && studentId && (
          <QuizModal 
            attemptId={selectedAttemptId || undefined}
            courseName="Ôn tập tổng hợp"
            userId={studentId}
            skipRoadmap={true}
            onClose={() => {
              setShowQuiz(false);
              fetchQuizHistory();
            }}
            onComplete={() => {
              setShowQuiz(false);
              toast.success("Đã hoàn tất bài ôn tập!");
              fetchQuizHistory();
              fetchRevisionData();
            }}
          />
        )}
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
