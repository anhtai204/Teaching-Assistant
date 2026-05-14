"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/FormElements";
import { UserMenu } from "@/components/UserMenu";
import { Send, Info, MessageSquare, History, ArrowLeft, Download, ExternalLink, Flag, ThumbsUp, ThumbsDown, Sparkles, X, FileText, CheckCircle2, PlusCircle, Clock, BookOpen, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  chunks?: any[];
  is_flagged?: boolean;
  feedback_rating?: number;
  manual_answer?: string;
}

interface RoadmapItem {
  id: string;
  course_id?: string;
  topic: string;
  description: string;
  status: string;
  priority: "High" | "Medium" | "Low";
  progress: number;
}

interface ChatSessionInfo {
  id: string;
  title: string;
  course_id: string;
  created_at: string;
}

function ChatContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = searchParams.get("course_id");
  const initialSessionId = searchParams.get("session_id");

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId);
  const [chatSessions, setChatSessions] = useState<ChatSessionInfo[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewSource, setPreviewSource] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [roadmapTab, setRoadmapTab] = useState<"course" | "global">("course");

  const fetchRoadmap = async () => {
    try {
      const studentId = (session?.user as any)?.id || "default";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      // Fetch ALL roadmap items (frontend handles filtering via Tabs)
      const res = await fetch(`${baseUrl}/api/roadmap?user_id=${studentId}&all=true`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        setRoadmapItems(items);
        
        // Auto-switch to global if no course items found
        const hasCourseItems = items.some((it: any) => it.course_id === courseId);
        if (!hasCourseItems && roadmapTab === "course") {
          setRoadmapTab("global");
        }
      }
    } catch (error) {
      console.error("Failed to fetch roadmap:", error);
    }
  };

  const handleUpdateProgress = async (itemId: string, newProgress: number) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/roadmap/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: newProgress })
      });
      if (res.ok) {
        const data = await res.json();
        setRoadmapItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, progress: data.progress, status: data.status } : item
        ));
      }
    } catch (error) {
      console.error("Failed to update progress:", error);
    }
  };

  const renderRoadmapList = (items: RoadmapItem[], title: string, icon: React.ReactNode) => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.2em] flex items-center gap-2 font-['Lexend']">
          {icon}
          {title}
        </h3>
        {roadmapTab === "course" && (
           <button 
             onClick={async () => {
               try {
                 const studentId = (session?.user as any)?.id || "default";
                 const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                 let url = `${baseUrl}/api/roadmap/refresh?user_id=${studentId}`;
                 if (courseId) url += `&course_id=${courseId}`;
                 const res = await fetch(url, { method: 'POST' });
                 if (res.ok) {
                   fetchRoadmap();
                 }
               } catch (e) {
                 console.error("Refresh failed", e);
               }
             }}
             className="text-[10px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors uppercase tracking-widest"
           >
             Cập nhật
           </button>
        )}
      </div>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id || idx} className={`p-4 bg-white dark:bg-[#1A1A3A] rounded-2xl border ${item.status === 'done' ? 'border-green-100 dark:border-green-900/30 bg-green-50/30 dark:bg-green-900/10' : 'border-slate-50 dark:border-white/5'} shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]`}>
            <div className="flex justify-between items-center mb-2">
              <p className={`text-xs font-bold truncate max-w-[140px] ${item.status === 'done' ? 'text-green-700 dark:text-green-400 line-through opacity-70' : 'text-slate-700 dark:text-white'}`}>{item.topic}</p>
              {item.status !== 'done' && (
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                  item.priority?.toLowerCase() === 'high' ? '!text-rose-600 !bg-rose-50 dark:!bg-rose-500/20 dark:!text-rose-400' :
                  item.priority?.toLowerCase() === 'medium' ? '!text-amber-600 !bg-amber-50 dark:!bg-amber-500/20 dark:!text-amber-400' :
                  '!text-blue-600 !bg-blue-50 dark:!bg-blue-500/20 dark:!text-blue-400'
                }`}>{item.priority}</span>
              )}
            </div>
            <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-2">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  item.status === 'done' ? "bg-green-500" : item.priority?.toLowerCase() === "high" ? "bg-red-500" : item.priority?.toLowerCase() === "medium" ? "bg-amber-500" : "bg-blue-500"
                }`}
                style={{ width: `${item.progress}%` }}
              />
            </div>
            <div className="flex justify-end">
              {item.status !== 'done' ? (
                <button 
                  onClick={() => handleUpdateProgress(item.id, 100)}
                  className="text-[9px] flex items-center gap-1 font-black uppercase tracking-widest text-slate-400 hover:text-green-600 transition-colors"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" /> Hoàn thành
                </button>
              ) : (
                <span className="text-[9px] flex items-center gap-1 font-black uppercase tracking-widest text-green-600">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Đã xong
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const currentCourseRoadmap = roadmapItems.filter(item => item.course_id === courseId);
  const generalRoadmap = roadmapItems.filter(item => !item.course_id);

  useEffect(() => {
    if (session?.user) {
      fetchRoadmap();
    }
  }, [session, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (courseId && session?.user) {
      fetchCourseDetails();
      fetchSessions();
    }
  }, [courseId, session]);

  const isAutoSelectDone = useRef(false);

  useEffect(() => {
    // If we have sessions but no current session selected, auto-select the latest one ONLY on initial load
    if (chatSessions.length > 0 && !currentSessionId && !initialSessionId && !isAutoSelectDone.current) {
      setCurrentSessionId(chatSessions[0].id);
      isAutoSelectDone.current = true;
    }
  }, [chatSessions, currentSessionId, initialSessionId]);

  useEffect(() => {
    if (currentSessionId) {
      // Chỉ fetch lại nếu KHÔNG ĐANG TRONG QUÁ TRÌNH STREAM
      // Nhưng nếu đổi session_id khác, chúng ta phải hủy stream cũ và fetch mới.
      setIsLoading(false);
      fetchSessionMessages(currentSessionId);
    } else if (course) {
      const greeting = course.greeting_message || `Hello ${session?.user?.name || "Student"}! I'm your AI Teaching Assistant for **${course.name}**. How can I help you today?`;
      setMessages([{ role: "assistant", content: greeting }]);
    }
    // Sử dụng course?.id và session?.user?.name thay vì toàn bộ object để tránh re-render khi NextAuth tự động refetch session (chuyển tab)
  }, [currentSessionId, course?.id, session?.user?.name]);

  const fetchCourseDetails = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/courses`);
      if (res.ok) {
        const all = await res.json();
        const found = all.find((c: any) => c.id === courseId);
        if (found) setCourse(found);
      }
    } catch (error) {
      console.error("Failed to fetch course details:", error);
    }
  };

  const fetchSessions = async () => {
    try {
      const studentId = (session?.user as any)?.id || "default";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/chat/sessions?student_id=${studentId}&course_id=${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setChatSessions(data);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  const fetchSessionMessages = async (sessionId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/chat/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  // Thêm AbortController để hủy stream khi cần
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // 1. Hủy request cũ nếu đang stream dở (tránh lỗi đè tin nhắn hoặc leak memory)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const currentInput = input;
    const userMsg: Message = { role: "user", content: currentInput };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const studentId = (session?.user as any)?.id || "default";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const streamUrl = `${baseUrl}/api/chat/stream?message=${encodeURIComponent(currentInput)}&course_id=${courseId}&user_id=${studentId}&session_id=${currentSessionId || ""}`;

      const response = await fetch(streamUrl, {
        signal: abortControllerRef.current.signal // Gắn signal để có thể hủy fetch
      });

      if (!response.ok) throw new Error("Stream connection failed");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      // Khởi tạo tin nhắn chờ của AI
      let assistantMsg: Message = { role: "assistant", content: "" };
      setMessages(prev => [...prev, assistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 2. Dùng { stream: true } để tránh lỗi font khi 1 ký tự Unicode (tiếng Việt) bị cắt làm đôi ở 2 chunk khác nhau
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();

            if (dataStr === "[DONE]") {
              setIsLoading(false);
              fetchSessions(); // Cập nhật lại lịch sử chat
              continue;
            }

            try {
              const data = JSON.parse(dataStr);

              // 3. Gom logic cập nhật biến assistantMsg lại cho gọn
              if (data.type === "token") {
                assistantMsg.content += data.content;
              } else if (data.type === "metadata") {
                assistantMsg.sources = data.sources;
                assistantMsg.chunks = data.chunks;
              } else if (data.type === "message_id") {
                assistantMsg.id = data.id;
              } else if (data.type === "error") {
                assistantMsg.content = `Error: ${data.message}`;
                setIsLoading(false);
              }

              // 4. Chỉ gọi setMessages 1 lần duy nhất cho mỗi chunk hợp lệ
              setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1] = { ...assistantMsg };
                return newMsgs;
              });

            } catch (e) {
              // Bỏ qua lỗi parse JSON tĩnh lặng vì một số chunk có thể bị cắt ngang dòng
              // Không log ra để tránh spam console
            }
          }
        }
      }
    } catch (error: any) {
      // 5. Nếu lỗi là do user chủ động hủy (AbortError) thì không hiển thị lỗi
      if (error.name === 'AbortError') {
        console.log("Stream aborted by user");
        return;
      }

      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting to the server."
      }]);
    } finally {
      // 6. Đảm bảo UI thoát trạng thái loading dù code có chạy thành công hay bị lỗi/crash
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, rating: number | null, isReport = false) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(`${baseUrl}/api/chat/messages/${messageId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, is_report: isReport }),
      });

      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          ...(rating !== null ? { feedback_rating: rating } : {}),
          is_flagged: isReport || m.is_flagged
        };
      }));
    } catch (error) {
      console.error("Feedback error:", error);
    }
  };

  const renderContent = (content: string, role: "user" | "assistant") => {
    const isUser = role === "user";
    
    // Tin nhắn của sinh viên chỉ cần hiển thị văn bản thuần túy (Plain Text)
    if (isUser) {
      return <div className="whitespace-pre-wrap break-words text-white font-medium">{content}</div>;
    }

    // Tin nhắn của AI sẽ được render bằng Markdown
    return (
      <div className="prose max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:p-0 prose-pre:rounded-2xl prose-slate dark:prose-invert prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-table:border prose-table:border-slate-100 prose-th:bg-slate-50 prose-th:p-4 prose-td:p-4 font-normal">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            code({node, className, children, ...props}) {

              const match = /language-(\w+)/.exec(className || '');
              const isBlock = !!match;
              return isBlock ? (
                <div className="relative group/code my-6 font-mono">
                  <div className="absolute right-4 top-4 z-20">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                      }}
                      className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white opacity-0 group-hover/code:opacity-100 transition-all shadow-lg border border-white/10"
                      title="Copy code"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto p-6 rounded-2xl bg-slate-900 shadow-inner ring-1 ring-white/10">
                    <code className={`${className} text-sm leading-relaxed`} {...props}>
                      {children}
                    </code>
                  </div>
                </div>
              ) : (
                <code className="bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded-md font-bold text-blue-600 dark:text-blue-400" {...props}>
                  {children}
                </code>
              )
            },
            a: ({ node, ...props }) => {
              const isCitation = props.href?.includes('/student/materials/viewer/');
              // Hậu kiểm: Nếu là link trích dẫn, mặc định là hiện trừ khi có visible=false
              const isExplicitlyHidden = props.href?.toLowerCase().includes('visible=false');
              const isVisible = isCitation && !isExplicitlyHidden;

              if (isCitation) {
                if (isVisible) {
                  return (
                    <span className="inline-flex items-center text-slate-500 font-bold text-[10px] mx-1 not-prose uppercase tracking-tighter">
                      [Nguồn:
                      <Link
                        href={props.href || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline mx-1 decoration-blue-300 underline-offset-4"
                      >
                        {props.children}
                      </Link>
                      ]
                    </span>
                  );
                } else {
                  return (
                    <span className="inline-flex items-center text-slate-400 font-bold text-[10px] mx-1 not-prose uppercase tracking-tighter">
                      [Nguồn: {props.children}]
                    </span>
                  );
                }
              }
              return <a {...props} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" />;
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const ThinkingDots = () => (
    <div className="flex gap-1.5 items-center py-2 px-1">
      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-white dark:bg-[#0F0F23] relative overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0F0F23] flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#1A1A3A]">
          <Link href="/student/dashboard" className="text-[10px] font-black text-slate-400 hover:text-blue-600 flex items-center gap-2 mb-6 uppercase tracking-[0.2em] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Về Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white truncate leading-tight" title={course?.name}>
              {course?.name || "Đang tải..."}
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <Button
            variant="outline"
            className="w-full justify-center gap-2 border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1A3A] hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all py-6 rounded-2xl shadow-sm dark:text-white font-bold text-sm"
            onClick={() => {
              isAutoSelectDone.current = true; // Ngăn không cho auto-select lại phiên cũ
              setCurrentSessionId(null);
              const greeting = course?.greeting_message || `Xin chào ${session?.user?.name || "bạn"}! Tôi là Trợ lý AI cho khóa học **${course?.name || "này"}**. Hôm nay tôi có thể giúp gì cho bạn?`;
              setMessages([{ role: "assistant", content: greeting }]);
            }}
          >
            <PlusCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Cuộc hội thoại mới
          </Button>

          <div className="space-y-4">
            <h3 className="px-3 text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
              <History className="w-3 h-3" />
              Lịch sử thảo luận
            </h3>
            <div className="space-y-1">
              {chatSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSessionId(s.id)}
                  className={`w-full text-left p-4 rounded-2xl text-sm transition-all group relative border ${currentSessionId === s.id ? "bg-white dark:bg-[#1A1A3A] shadow-md border-blue-100 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 dark:text-white/40 border-transparent hover:bg-white dark:hover:bg-white/5 hover:shadow-sm"
                    }`}
                >
                  <p className="truncate pr-4 font-bold dark:text-white">{s.title || "Chưa có tiêu đề"}</p>
                  <div className="flex items-center gap-2 mt-1.5 opacity-60">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-bold">{new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                  {currentSessionId === s.id && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Roadmap Section with Tabs */}
          <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-white/5">
            {/* Tab Header */}
            <div className="px-1">
              <div className="bg-slate-100/50 dark:bg-white/5 p-1 rounded-xl flex gap-1 relative overflow-hidden">
                <button 
                  onClick={() => setRoadmapTab("course")}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all relative z-10 ${roadmapTab === "course" ? "text-blue-600 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
                >
                  Môn học này
                </button>
                <button 
                  onClick={() => setRoadmapTab("global")}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all relative z-10 ${roadmapTab === "global" ? "text-blue-600 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
                >
                  Lộ trình chung
                </button>
                {/* Sliding Highlight */}
                <div 
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-blue-600 rounded-lg shadow-sm transition-all duration-300 ease-out ${roadmapTab === "global" ? "translate-x-full" : "translate-x-0"}`}
                />
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[200px]">
              {roadmapTab === "course" ? (
                currentCourseRoadmap.length > 0 ? (
                  renderRoadmapList(currentCourseRoadmap, "Trọng tâm môn học", <Sparkles className="w-3 h-3" />)
                ) : (
                  <div className="py-10 px-4 text-center space-y-3 animate-in fade-in duration-500">
                    <div className="h-12 w-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold italic leading-relaxed">
                      Môn học này chưa có lộ trình riêng. Nhấn "Cập nhật" để AI phân tích.
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-[9px] h-8 rounded-lg"
                      onClick={async () => {
                         const studentId = (session?.user as any)?.id || "default";
                         const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                         await fetch(`${baseUrl}/api/roadmap/refresh?user_id=${studentId}&course_id=${courseId}`, { method: 'POST' });
                         fetchRoadmap();
                      }}
                    >
                      Tạo lộ trình môn học
                    </Button>
                  </div>
                )
              ) : (
                generalRoadmap.length > 0 ? (
                  renderRoadmapList(generalRoadmap, "Mục tiêu học tập chung", <BookOpen className="w-3 h-3" />)
                ) : (
                  <div className="py-10 px-4 text-center space-y-2 animate-in fade-in duration-500">
                     <BookOpen className="w-8 h-8 text-slate-200 mx-auto" />
                     <p className="text-[10px] text-slate-400 font-bold italic">Chưa có mục tiêu chung.</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-[#0F0F23]">
        {/* Chat Header */}
        <div className="h-20 border-b border-slate-100 dark:border-white/5 bg-white/80 dark:bg-[#0F0F23]/80 backdrop-blur-md px-8 flex items-center justify-between z-20 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md font-['Lexend']">AI</div>
              <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-blue-600 font-black text-xs shadow-sm font-['Lexend']">TA</div>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white leading-none font-['Lexend']">Smart Assistant</p>
              <p className="text-[10px] font-black text-green-500 uppercase mt-1 flex items-center gap-1 tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Trực tuyến
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">Phiên hiện tại</p>
              <p className="text-xs font-bold text-slate-600 dark:text-white/60 truncate max-w-[150px]">
                {chatSessions.find(s => s.id === currentSessionId)?.title || "Cuộc thảo luận mới"}
              </p>
            </div>
            <div className="h-8 w-[1px] bg-slate-100 dark:bg-white/5 hidden sm:block mx-2" />
            <UserMenu />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-10">
          <div className="max-w-4xl mx-auto space-y-12 pb-24">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-6 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center font-black text-xs shadow-md transition-transform duration-300 font-['Lexend'] ${msg.role === "assistant" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-100"
                  }`}>
                  {msg.role === "assistant" ? "AI" : (session?.user?.name?.substring(0, 2).toUpperCase() || "ME")}
                </div>
                <div className={`max-w-[85%] space-y-4 ${msg.role === "user" ? "text-left" : ""}`}>
                  <div className={`p-7 rounded-[2rem] text-slate-800 dark:text-slate-200 leading-relaxed text-[15px] shadow-sm relative transition-all ${msg.role === "assistant"
                    ? "bg-white dark:bg-[#1A1A3A] border border-slate-100 dark:border-white/5 rounded-tl-lg"
                    : "bg-blue-600 text-white rounded-tr-lg shadow-blue-200"
                    }`}>
                    {msg.role === "assistant" && !msg.content && isLoading && i === messages.length - 1 ? (
                      <ThinkingDots />
                    ) : (
                      <>
                        {renderContent(msg.content || "", msg.role as "user" | "assistant")}
                        {msg.manual_answer && (
                          <div className="mt-6 pt-4 border-t border-amber-200 dark:border-amber-700/30">
                            <div className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-400 font-black text-[10px] uppercase tracking-widest">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Hiệu chỉnh từ Giảng viên</span>
                            </div>
                            <div className="text-slate-800 dark:text-slate-200">
                              {renderContent(msg.manual_answer, "assistant")}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {msg.role === "assistant" && msg.content && (
                    <div className="flex items-center gap-6 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => msg.id && handleFeedback(msg.id, 1)}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${msg.feedback_rating === 1 ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"}`}
                          title="Hữu ích"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => msg.id && handleFeedback(msg.id, -1)}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${msg.feedback_rating === -1 && !msg.is_flagged ? "text-orange-500 bg-orange-50 dark:bg-orange-900/30" : "text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30"}`}
                          title="Không rõ ràng"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => msg.id && handleFeedback(msg.id, null, true)}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${msg.is_flagged ? "text-red-500 bg-red-50 dark:bg-red-900/30" : "text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"}`}
                          title="Báo cáo lỗi"
                        >
                          <Flag className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="p-8 bg-white dark:bg-[#0F0F23] border-t border-slate-100 dark:border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.02)] z-30">
          <div className="max-w-4xl mx-auto relative group">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder={`Nhập câu hỏi về ${course?.name || 'khóa học'}...`}
              className="w-full rounded-2xl border-2 border-slate-100 dark:border-white/10 bg-[#F8FAFC] dark:bg-white/5 px-8 py-5 pr-20 text-slate-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-8 focus:ring-blue-500/5 transition-all resize-none shadow-inner min-h-[68px] font-medium text-base placeholder:text-slate-400"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="h-6 w-6" />
              )}
            </button>
          </div>
          <p className="text-center text-[9px] font-black text-slate-400 uppercase mt-4 tracking-[0.2em] opacity-60 font-['Lexend']">
            AI Assistant có thể đưa ra câu trả lời chưa chính xác. Hãy luôn đối chiếu với giáo trình.
          </p>
        </div>
      </main>

      {/* Source Preview Pane */}
      {previewSource && (
        <div className="absolute inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300" onClick={() => setPreviewSource(null)} />
          <aside className="w-[450px] h-full bg-white dark:bg-[#0F0F23] shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-100 dark:border-white/5">
            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-[#F8FAFC] dark:bg-white/5">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-100 dark:bg-indigo-500/20 p-3 rounded-2xl">
                  <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-[0.2em] leading-none mb-1.5 font-['Lexend']">Ngữ cảnh AI</h4>
                  <p className="text-xs text-slate-500 dark:text-white/50 font-bold truncate max-w-[250px]">{previewSource?.metadata?.source}</p>
                </div>
              </div>
              <button onClick={() => setPreviewSource(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl transition-all text-slate-400 cursor-pointer">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10">
              <div className="space-y-6">
                <h5 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest flex items-center gap-2 font-['Lexend']">
                  <FileText className="w-3 h-3" />
                  Trích dẫn xác thực
                </h5>
                <div className="p-10 bg-[#F8FAFC] dark:bg-white/5 rounded-[2.5rem] border-2 border-blue-50 dark:border-blue-500/20 text-slate-800 dark:text-slate-200 leading-relaxed text-[16px] whitespace-pre-wrap font-medium shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
                  <mark className="bg-blue-50 dark:bg-blue-500/20 text-slate-900 dark:text-white p-0 rounded-sm">
                    {previewSource?.content}
                  </mark>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Card className="p-6 border-none bg-blue-50/50 dark:bg-blue-500/5 shadow-sm ring-1 ring-blue-100 dark:ring-blue-500/20">
                  <h5 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest mb-4 font-['Lexend']">Phân tích Metadata</h5>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Định dạng</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-white flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        {previewSource?.metadata?.format?.toUpperCase() || "TÀI LIỆU PDF"}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Độ tin cậy</p>
                      <p className="text-xs font-bold text-green-600 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        {(previewSource?.score * 100)?.toFixed(1)}% Chính xác
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="p-6 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border-2 border-indigo-50 dark:border-indigo-500/10 flex gap-4 shadow-sm">
                  <Info className="h-5 w-5 text-indigo-500 shrink-0" />
                  <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed font-bold">
                    Thông tin này được trích xuất trực tiếp từ kho học liệu của khóa học. Hãy dùng nó để đối chiếu với bài giảng của bạn.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-10 bg-[#F8FAFC] dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
              <Button
                className="w-full h-16 text-base font-black uppercase tracking-widest shadow-xl shadow-blue-100 dark:shadow-none"
                variant="primary"
                onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/data/documents/${previewSource?.metadata?.source}`, '_blank')}
              >
                Xem toàn bộ tài liệu <ExternalLink className="ml-3 w-5 h-5" />
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function StudentChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC] dark:bg-[#0F0F23] text-slate-400">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-blue-100 dark:border-white/5 border-t-blue-600 rounded-full animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <div className="text-center font-['Lexend']">
            <p className="text-xl font-black text-slate-900 dark:text-white mb-1">Đang khởi tạo Trợ lý</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Tối ưu hóa ngữ cảnh học tập...</p>
          </div>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
