"use client";

import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { StudentHeader } from "@/components/StudentHeader";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  AlertTriangle,
  ChevronRight,
  Target,
  Loader2,
  TrendingUp,
  Zap,
} from "lucide-react";

interface RoadmapItem {
  id: string;
  topic: string;
  description: string;
  priority: "high" | "medium" | "low";
  progress: number;
  status: "todo" | "in_progress" | "done";
  sources: string[];
  actions: { text: string; done: boolean }[];
}

const PRIORITY_CONFIG = {
  high: {
    label: "Ưu tiên cao",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
    glow: "shadow-rose-500/20",
  },
  medium: {
    label: "Trung bình",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    glow: "shadow-amber-500/20",
  },
  low: {
    label: "Thấp",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
    glow: "shadow-emerald-500/20",
  },
};

const STATUS_CONFIG = {
  todo: { label: "Chưa bắt đầu", icon: Circle, color: "text-slate-400" },
  in_progress: { label: "Đang học", icon: Clock, color: "text-indigo-400" },
  done: { label: "Hoàn thành", icon: CheckCircle2, color: "text-emerald-400" },
};

export default function StudentRoadmapPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const studentId = (session?.user as any)?.id;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchRoadmap = useCallback(async () => {
    if (!studentId) return;
    try {
      const res = await fetch(`${baseUrl}/api/roadmap?user_id=${studentId}`);
      if (!res.ok) throw new Error("Không thể tải lộ trình học tập.");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [studentId, baseUrl]);

  const handleRefresh = async () => {
    if (!studentId) return;
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(
        `${baseUrl}/api/roadmap/refresh?user_id=${studentId}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Không thể tạo lại lộ trình.");
      const data = await res.json();
      setItems(data.items || []);
      toast.success("Đã làm mới lộ trình học tập từ AI!");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleProgressUpdate = async (itemId: string, newProgress: number) => {
    const item = items.find(i => i.id === itemId);
    const topicName = item?.topic || "chủ đề";
    
    setUpdatingId(itemId);
    try {
      const res = await fetch(`${baseUrl}/api/roadmap/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: newProgress }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  progress: newProgress,
                  status:
                    newProgress === 100
                      ? "done"
                      : newProgress > 0
                      ? "in_progress"
                      : "todo",
                }
              : item
          )
        );
        
        if (newProgress === 100) {
          toast.success(`Chúc mừng! Bạn đã hoàn thành: ${topicName}`);
        } else if (newProgress === 0) {
          toast.info(`Đã đặt lại trạng thái cho: ${topicName}`);
        } else {
          toast.success(`Tiến độ cho ${topicName}: ${newProgress}%`);
        }
      } else {
        toast.error("Không thể cập nhật tiến độ.");
      }
    } catch (err) {
      console.error("Lỗi cập nhật tiến độ:", err);
      toast.error("Lỗi kết nối khi cập nhật tiến độ.");
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleAction = async (itemId: string, actionIndex: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Chuyển đổi dữ liệu cũ sang cấu trúc mới nếu cần
    const newActions = item.actions.map((act) => {
      if (typeof act === "string") return { text: act, done: false };
      return { ...act };
    });

    newActions[actionIndex].done = !newActions[actionIndex].done;

    setUpdatingId(itemId);
    try {
      const res = await fetch(`${baseUrl}/api/roadmap/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: newActions }),
      });

      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  actions: data.actions,
                  progress: data.progress,
                  status: data.status,
                }
              : i
          )
        );
        if (newActions[actionIndex].done) {
          toast.success(`Đã hoàn thành: ${newActions[actionIndex].text}`);
        }
      } else {
        toast.error("Không thể cập nhật trạng thái nhiệm vụ.");
      }
    } catch (err) {
      toast.error("Lỗi kết nối.");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  const doneCount = items.filter((i) => i.status === "done").length;
  const overallProgress =
    items.length > 0
      ? Math.round(
          items.reduce((acc, item) => acc + item.progress, 0) / items.length
        )
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F23] text-slate-900 dark:text-[#E2E8F0] transition-colors duration-300">
      <StudentHeader />

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Cá nhân hóa</span>
            </div>
            <h1 className="text-4xl font-bold font-['Lexend'] text-slate-900 dark:text-white tracking-tight">
              Lộ trình học tập
            </h1>
            <p className="text-slate-500 dark:text-white/70 max-w-md">
              Được tạo dựa trên phân tích hành vi và lịch sử hỏi đáp của bạn với AI trợ giảng.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-sm text-white shadow-lg shadow-indigo-500/20"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Đang phân tích..." : "Tạo lại lộ trình"}
          </button>
        </div>

        {/* Overall Progress */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 flex items-center gap-6 shadow-sm">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-white/5" />
                  <circle
                    cx="40" cy="40" r="32" fill="none"
                    stroke="url(#progressGrad)" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - overallProgress / 100)}`}
                    className="transition-all duration-700"
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-slate-900 dark:text-white">
                  {overallProgress}%
                </span>
              </div>
              <div>
                <p className="text-slate-400 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Tiến độ tổng thể</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {doneCount}/{items.length}{" "}
                  <span className="text-slate-400 dark:text-white/60 text-base font-normal">mục hoàn thành</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-100 dark:border-indigo-500/20 p-6 flex flex-col justify-between shadow-sm">
              <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="text-slate-500 dark:text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Trạng thái</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {doneCount === items.length ? "🎉 Hoàn thành!" : `${items.filter(i => i.status === "in_progress").length} đang học`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-slate-400 dark:text-white/60 text-sm font-bold uppercase tracking-widest">
              AI đang phân tích hành vi học tập...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-8 flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-rose-500 dark:text-rose-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Có lỗi xảy ra</p>
              <p className="text-slate-500 dark:text-white/40 text-sm">{error}</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <Target className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-bold text-slate-900 dark:text-white">Chưa có lộ trình</p>
              <p className="text-slate-500 dark:text-white/40 max-w-sm">
                Hãy bắt đầu hỏi trợ lý AI về bài học. Sau đó nhấn "Tạo lại lộ trình" để AI phân tích và xây dựng kế hoạch học tập riêng cho bạn.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all"
            >
              <Zap className="inline w-4 h-4 mr-2" />
              Tạo lộ trình ngay
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => {
              const priorityConf = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.medium;
              const statusConf = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.todo;
              const StatusIcon = statusConf.icon;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border bg-white dark:bg-[#1A1A3A] p-6 transition-all hover:shadow-md dark:hover:bg-[#23234F] border-slate-200 dark:border-white/10 shadow-sm`}
                >
                  <div className="flex items-start gap-5">
                    {/* Index */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-white/30 font-black text-sm">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="flex-1 min-w-0 space-y-4">
                      {/* Topic + Badges */}
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                          {item.topic}
                        </h2>
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${priorityConf.bg} ${priorityConf.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityConf.dot}`} />
                          {priorityConf.label}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-50 dark:bg-white/5 ${statusConf.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConf.label}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-slate-500 dark:text-white/70 text-sm leading-relaxed">
                        {item.description}
                      </p>

                      {/* Sources & Actions */}
                      {(item.sources?.length > 0 || item.actions?.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                          {item.sources?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/50 flex items-center gap-1.5">
                                <BookOpen className="w-3 h-3" /> Tài liệu tham khảo
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {item.sources.map((src, i) => (
                                  <span key={i} className="px-2 py-1 rounded bg-slate-50 dark:bg-white/5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-white/5">
                                    {src}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.actions?.length > 0 && (
                            <div className="space-y-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 flex items-center gap-1.5">
                                <Zap className="w-3 h-3 text-amber-500" /> Nhiệm vụ cụ thể
                              </p>
                              <ul className="space-y-2">
                                {item.actions.map((act, i) => {
                                  // Hỗ trợ cả dữ liệu cũ (string) và mới (object)
                                  const isObject = typeof act === 'object' && act !== null;
                                  const text = isObject ? (act as any).text : act;
                                  const done = isObject ? (act as any).done : false;

                                  return (
                                    <li 
                                      key={i} 
                                      onClick={() => toggleAction(item.id, i)}
                                      className={`flex items-start gap-3 text-xs cursor-pointer group transition-all p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 ${done ? 'opacity-60' : ''}`}
                                    >
                                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                        done 
                                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                                          : 'border-slate-300 dark:border-white/20 group-hover:border-indigo-500'
                                      }`}>
                                        {done && <CheckCircle2 className="w-3 h-3" />}
                                      </div>
                                      <span className={`leading-relaxed ${done ? 'line-through text-slate-400 dark:text-white/20' : 'text-slate-600 dark:text-white/80'}`}>
                                        {text}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/50">
                            Tiến độ thực tế
                          </span>
                          <span className="text-xs font-bold text-slate-500 dark:text-white/70">
                            {item.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Progress Buttons */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[0, 25, 50, 75, 100].map((val) => (
                          <button
                            key={val}
                            disabled={updatingId === item.id}
                            onClick={() => handleProgressUpdate(item.id, val)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              item.progress === val
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                : "bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-white"
                            }`}
                          >
                            {val === 0 ? "Đặt lại" : val === 100 ? "✓ Xong" : `${val}%`}
                          </button>
                        ))}
                        {item.progress === 0 && (
                          <button
                            disabled={updatingId === item.id}
                            onClick={() => handleProgressUpdate(item.id, 10)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all"
                          >
                            🚀 Bắt đầu ngay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
