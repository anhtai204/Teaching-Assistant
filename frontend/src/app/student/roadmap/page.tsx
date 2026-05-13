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
  RotateCcw,
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

// Helper for dynamic colors
const getProgressTheme = (progress: number) => {
  if (progress >= 100) return { start: "#10b981", end: "#34d399", label: "Done" }; // Emerald
  if (progress > 70) return { start: "#0ea5e9", end: "#38bdf8", label: "Advanced" }; // Sky/Blue
  if (progress > 30) return { start: "#6366f1", end: "#818cf8", label: "In Progress" }; // Indigo
  if (progress > 0) return { start: "#f59e0b", end: "#fbbf24", label: "Started" }; // Amber
  return { start: "#94a3b8", end: "#cbd5e1", label: "Todo" }; // Slate/Gray
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

  const updateItemOnServer = async (itemId: string, updates: Partial<RoadmapItem>) => {
    setUpdatingId(itemId);
    try {
      const res = await fetch(`${baseUrl}/api/roadmap/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  ...data,
                }
              : i
          )
        );
        return true;
      } else {
        toast.error("Không thể cập nhật trạng thái.");
        return false;
      }
    } catch (err) {
      toast.error("Lỗi kết nối.");
      return false;
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResetItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const resetActions = item.actions.map(act => ({ ...act, done: false }));
    const success = await updateItemOnServer(itemId, { 
      actions: resetActions,
      progress: 0,
      status: "todo"
    });

    if (success) {
      toast.info(`Đã đặt lại trạng thái cho: ${item.topic}`);
    }
  };

  const handleMarkAsDone = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const doneActions = item.actions.map(act => ({ ...act, done: true }));
    const success = await updateItemOnServer(itemId, { 
      actions: doneActions,
      progress: 100,
      status: "done"
    });

    if (success) {
      toast.success(`Chúc mừng! Bạn đã hoàn thành: ${item.topic}`);
    }
  };

  const toggleAction = async (itemId: string, actionIndex: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newActions = item.actions.map((act, i) => 
      i === actionIndex ? { ...act, done: !act.done } : { ...act }
    );

    const doneCount = newActions.filter(a => a.done).length;
    const totalCount = newActions.length;
    const newProgress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const newStatus = newProgress === 100 ? "done" : newProgress > 0 ? "in_progress" : "todo";

    const success = await updateItemOnServer(itemId, { 
      actions: newActions,
      progress: newProgress,
      status: newStatus
    });

    if (success && newActions[actionIndex].done) {
      toast.success(`Đã hoàn thành: ${newActions[actionIndex].text}`);
      if (newProgress === 100) {
        toast.success(`🎉 Tuyệt vời! Bạn đã hoàn thành toàn bộ chủ đề này.`);
      }
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

  const overallTheme = getProgressTheme(overallProgress);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F23] text-slate-900 dark:text-[#E2E8F0] transition-colors duration-300 font-['Inter']">
      <StudentHeader />

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 animate-reveal">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Cá nhân hóa</span>
            </div>
            <h1 className="text-4xl font-black font-['Lexend'] text-slate-900 dark:text-white tracking-tight">
              Lộ trình học tập
            </h1>
            <p className="text-slate-500 dark:text-white/70 max-w-md font-medium">
              Được tạo dựa trên phân tích hành vi và lịch sử hỏi đáp của bạn với AI trợ giảng.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-sm text-white shadow-lg shadow-indigo-500/20 group"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
            {refreshing ? "Đang phân tích..." : "Tạo lại lộ trình"}
          </button>
        </div>

        {/* Overall Progress */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-reveal" style={{ animationDelay: '0.1s' }}>
            <div className="md:col-span-2 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 flex items-center gap-6 shadow-sm group hover:border-indigo-500/30 transition-colors">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-white/5" />
                  <circle
                    cx="40" cy="40" r="32" fill="none"
                    stroke={overallTheme.start} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - overallProgress / 100)}`}
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0 0 8px ${overallTheme.start}44)` }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-slate-900 dark:text-white font-['Lexend']" style={{ color: overallTheme.start }}>
                  {overallProgress}%
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 dark:text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Tiến độ tổng thể</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {doneCount}/{items.length}{" "}
                  <span className="text-slate-400 dark:text-white/60 text-base font-medium">chủ đề hoàn tất</span>
                </p>
                <div className="flex gap-2 items-center">
                   <div className="h-1.5 w-32 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-1000" style={{ width: `${overallProgress}%`, backgroundColor: overallTheme.start }} />
                   </div>
                   <span className="text-[10px] font-bold" style={{ color: overallTheme.start }}>Mục tiêu: 100%</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-100 dark:border-indigo-500/20 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                 <TrendingUp className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
              </div>
              <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400 relative z-10" />
              <div className="relative z-10">
                <p className="text-slate-500 dark:text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Trạng thái học tập</p>
                <p className="text-xl font-black text-slate-900 dark:text-white font-['Lexend']">
                  {doneCount === items.length ? "🎉 Đã về đích!" : `${items.filter(i => i.status === "in_progress").length} mục đang học`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
              <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <p className="text-slate-400 dark:text-white/60 text-xs font-black uppercase tracking-[0.3em] animate-pulse">
              AI đang phân tích dữ liệu...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-8 flex items-center gap-6 animate-reveal">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
               <AlertTriangle className="w-8 h-8 text-rose-500 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-lg font-black text-slate-900 dark:text-white">Hệ thống bận</p>
              <p className="text-slate-500 dark:text-white/40 font-medium">{error}</p>
              <button onClick={fetchRoadmap} className="mt-4 text-xs font-black text-rose-500 uppercase tracking-widest hover:underline">Thử lại ngay</button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-8 text-center animate-reveal">
            <div className="relative">
              <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center animate-float">
                <Target className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center">
                 <Zap className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-2xl font-black text-slate-900 dark:text-white font-['Lexend']">Sẵn sàng bứt phá?</p>
              <p className="text-slate-500 dark:text-white/40 max-w-sm font-medium mx-auto">
                Hãy bắt đầu tương tác với trợ lý AI. Hệ thống sẽ tự động tổng hợp các lỗ hổng kiến thức để xây dựng lộ trình này.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-10 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
            >
              Tạo lộ trình học tập <ChevronRight className="inline w-4 h-4 ml-2" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((item, index) => {
              const priorityConf = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.medium;
              const statusConf = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.todo;
              const StatusIcon = statusConf.icon;
              const theme = getProgressTheme(item.progress);

              return (
                <div
                  key={item.id}
                  className="rounded-3xl border bg-white dark:bg-white/[0.02] p-8 transition-all hover:shadow-2xl hover:border-indigo-500/30 border-slate-200 dark:border-white/10 group animate-reveal"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex flex-col md:flex-row items-start gap-8">
                    {/* Index & Badge */}
                    <div className="flex flex-row md:flex-col items-center gap-4 flex-shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-white/20 font-black text-xl border border-slate-100 dark:border-white/5 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className={`hidden md:flex w-0.5 h-12 bg-gradient-to-b from-slate-100 to-transparent dark:from-white/10 dark:to-transparent`} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-6">
                      {/* Header Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                           <div className="flex flex-wrap items-center gap-3">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${priorityConf.bg} ${priorityConf.color} border ${priorityConf.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${priorityConf.dot} animate-pulse`} />
                                {priorityConf.label}
                              </span>
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-50 dark:bg-white/5 ${statusConf.color} border border-slate-100 dark:border-white/5`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConf.label}
                              </span>
                           </div>
                           <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight font-['Lexend'] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {item.topic}
                          </h2>
                        </div>
                        
                        {/* Action Buttons (Reset/Done) */}
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => handleResetItem(item.id)}
                             disabled={updatingId === item.id}
                             className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                             title="Đặt lại tất cả nhiệm vụ"
                           >
                             <RotateCcw className={`w-4 h-4 ${updatingId === item.id ? 'animate-spin' : ''}`} />
                           </button>
                           <button 
                             onClick={() => handleMarkAsDone(item.id)}
                             disabled={updatingId === item.id || item.status === 'done'}
                             className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                               item.status === 'done'
                               ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                               : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                             }`}
                           >
                             {item.status === 'done' ? 'Đã xong' : 'Hoàn thành'}
                           </button>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-slate-500 dark:text-white/60 text-base leading-relaxed font-medium">
                        {item.description}
                      </p>

                      {/* Specific Actions (The Filtered Progress Source) */}
                      {item.actions?.length > 0 && (
                        <div className="space-y-4 pt-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-amber-500" /> Nhiệm vụ cần thực hiện
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {item.actions.map((act, i) => (
                              <div 
                                key={i} 
                                onClick={() => !updatingId && toggleAction(item.id, i)}
                                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group/task ${
                                  act.done 
                                    ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20' 
                                    : 'bg-slate-50/50 dark:bg-white/5 border-slate-100 dark:border-white/10 hover:border-indigo-500/50'
                                }`}
                              >
                                <div className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                                  act.done 
                                    ? 'bg-emerald-500 border-emerald-500 text-white rotate-0' 
                                    : 'border-slate-300 dark:border-white/20 group-hover/task:border-indigo-500 rotate-45 group-hover/task:rotate-0'
                                }`}>
                                  {act.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </div>
                                <span className={`text-sm font-bold leading-relaxed transition-all ${
                                  act.done ? 'text-emerald-700/60 dark:text-emerald-400/40 line-through' : 'text-slate-600 dark:text-white/80'
                                }`}>
                                  {act.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sources */}
                      {item.sources?.length > 0 && (
                        <div className="space-y-3 pt-2">
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Tài liệu nghiên cứu
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {item.sources.map((src, i) => (
                              <span key={i} className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-white/5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-white/5 hover:scale-105 transition-transform cursor-default">
                                {src}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Progress Visualizer */}
                      <div className="pt-4 space-y-4">
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30">Tiến độ thực tế</p>
                             <p className="text-sm font-black text-slate-900 dark:text-white" style={{ color: theme.start }}>{item.progress}% Hoàn tất</p>
                          </div>
                          <div className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase">Dựa trên {item.actions.length} nhiệm vụ</div>
                        </div>
                        <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-white/5 relative">
                           <div
                            className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                            style={{ width: `${item.progress}%`, backgroundColor: theme.start, backgroundImage: `linear-gradient(to right, ${theme.start}, ${theme.end})` }}
                          >
                            {item.progress > 0 && (
                              <div className="absolute inset-0 opacity-30 animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent)', backgroundSize: '200% 100%' }} />
                            )}
                          </div>
                        </div>
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
