"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/FormElements";
import { UserMenu } from "@/components/UserMenu";
import { Send, Info, MessageSquare, History, ArrowLeft, Download, ExternalLink, Flag, ThumbsUp, ThumbsDown, Sparkles, X, FileText, CheckCircle2, PlusCircle, Clock, BookOpen, AlertTriangle, Paperclip, Loader2 } from "lucide-react";
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
  attached_files?: any[];
}

interface RoadmapItem {
  id: string;
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
  const [aiStatus, setAiStatus] = useState<string>("");
  const [previewSource, setPreviewSource] = useState<any>(null);
  
  // File Attachment States
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  const fetchRoadmap = async () => {
    try {
      const studentId = (session?.user as any)?.id || "default";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/roadmap?user_id=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setRoadmapItems(data.items || []);
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
    if (session?.user) {
      fetchCourseDetails();
      fetchSessions();
      fetchAvailableFiles();
    }
  }, [courseId, session]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setShowFileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const fetchAvailableFiles = async () => {
    if (!session?.user) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const studentId = (session.user as any).id;
      // Fetch both personal materials and course materials
      const url = courseId 
        ? `${baseUrl}/api/materials?user_id=${studentId}&course_id=${courseId}&mode=all`
        : `${baseUrl}/api/materials?user_id=${studentId}&mode=all`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAvailableFiles(data);
      }
    } catch (error) {
      console.error("Failed to fetch available files:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", (session.user as any).id);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/api/materials/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        fetchAvailableFiles();
        if (data.id) {
          setSelectedFileIds(prev => [...prev, data.id]);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    const userMsg: Message = { 
      role: "user", 
      content: currentInput,
      attached_files: selectedFileIds.map(id => availableFiles.find(f => f.id === id)).filter(Boolean)
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSelectedFileIds([]); // Clear selection after sending
    setIsLoading(true);
    setAiStatus("Connecting...");

    try {
      const studentId = (session?.user as any)?.id || "default";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const fileIdsParam = selectedFileIds.length > 0 ? `&file_ids=${encodeURIComponent(JSON.stringify(selectedFileIds))}` : "";
      const streamUrl = `${baseUrl}/api/chat/stream?message=${encodeURIComponent(currentInput)}&course_id=${courseId || "default"}&user_id=${studentId}&session_id=${currentSessionId || ""}${fileIdsParam}`;

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
              } else if (data.type === "status") {
                setAiStatus(data.content);
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
      return <div className="whitespace-pre-wrap break-words text-white">{content}</div>;
    }

    // Tin nhắn của AI sẽ được render bằng Markdown
    return (
      <div className="prose max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:p-0 prose-pre:rounded-2xl prose-slate dark:prose-invert prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-table:border prose-table:border-slate-100 prose-th:bg-slate-50 prose-th:p-4 prose-td:p-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, className, children, ...props }) {

              const match = /language-(\w+)/.exec(className || '');
              const isBlock = !!match;
              return isBlock ? (
                <div className="relative group/code my-6">
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
                    <span className="inline-flex items-center text-slate-500 font-bold text-xs mx-1 not-prose">
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
                    <span className="inline-flex items-center text-slate-400 font-bold text-xs mx-1 not-prose">
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
    <div className="flex flex-col gap-3 py-2 px-1 animate-pulse">
      <div className="flex gap-1.5 items-center">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
      </div>
      <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] animate-pulse">
        {aiStatus || "AI is analyzing your request..."}
      </p>
    </div>
  );

  return (
    <div className="flex h-screen bg-white dark:bg-[#0F0F23] relative overflow-hidden font-['Open_Sans']">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#0F0F23] flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#1A1A3A]">
          <Link href="/student/dashboard" className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-2 mb-6 uppercase tracking-widest transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate leading-tight" title={course?.name}>
              {course?.name || "Loading..."}
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <Button
            variant="outline"
            className="w-full justify-center gap-2 border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1A3A] hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all py-6 rounded-2xl shadow-sm dark:text-white"
            onClick={() => {
              isAutoSelectDone.current = true; // Ngăn không cho auto-select lại phiên cũ
              setCurrentSessionId(null);
              const greeting = course?.greeting_message || `Hello ${session?.user?.name || "Student"}! I'm your AI Teaching Assistant for **${course?.name || "this course"}**. How can I help you today?`;
              setMessages([{ role: "assistant", content: greeting }]);
            }}
          >
            <PlusCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            New Discussion
          </Button>

          <div className="space-y-4">
            <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <History className="w-3 h-3" />
              Chat History
            </h3>
            <div className="space-y-1">
              {chatSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSessionId(s.id)}
                  className={`w-full text-left p-4 rounded-2xl text-sm transition-all group relative border ${currentSessionId === s.id ? "bg-white dark:bg-[#1A1A3A] shadow-md border-blue-100 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 dark:text-white/40 border-transparent hover:bg-white dark:hover:bg-white/5 hover:shadow-sm"
                    }`}
                >
                  <p className="truncate pr-4 font-bold dark:text-white">{s.title || "Untitled Chat"}</p>
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

          {/* New Roadmap Section */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center justify-between px-3">
              <h3 className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Learning Focus
              </h3>
              <button
                onClick={async () => {
                  try {
                    const studentId = (session?.user as any)?.id || "default";
                    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                    const res = await fetch(`${baseUrl}/api/roadmap/refresh?user_id=${studentId}`, { method: 'POST' });
                    if (res.ok) {
                      const data = await res.json();
                      setRoadmapItems(data.items || []);
                    }
                  } catch (e) {
                    console.error("Refresh failed", e);
                  }
                }}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-3">
              {roadmapItems.map((item, idx) => (
                <div key={item.id || idx} className={`p-4 bg-white dark:bg-[#1A1A3A] rounded-2xl border ${item.status === 'done' ? 'border-green-100 dark:border-green-900/30 bg-green-50/30 dark:bg-green-900/10' : 'border-slate-50 dark:border-white/5'} shadow-sm transition-all`}>
                  <div className="flex justify-between items-center mb-2">
                    <p className={`text-xs font-bold truncate max-w-[140px] ${item.status === 'done' ? 'text-green-700 dark:text-green-400 line-through opacity-70' : 'text-slate-700 dark:text-white'}`}>{item.topic}</p>
                    {item.status !== 'done' && (
                      <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{item.priority}</span>
                    )}
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${item.status === 'done' ? "bg-green-500" : item.priority === "High" ? "bg-red-500" : item.priority === "Medium" ? "bg-amber-500" : "bg-blue-500"
                        }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-end">
                    {item.status !== 'done' ? (
                      <button
                        onClick={() => handleUpdateProgress(item.id, 100)}
                        className="text-[10px] flex items-center gap-1 font-bold text-slate-400 hover:text-green-600 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Mark as Done
                      </button>
                    ) : (
                      <span className="text-[10px] flex items-center gap-1 font-bold text-green-600">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {roadmapItems.length === 0 && (
                <p className="px-4 text-[10px] text-slate-400 font-medium italic">Keep chatting or click Refresh to generate your personalized roadmap!</p>
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
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md">AI</div>
              <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-blue-600 font-black text-xs shadow-sm">TA</div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">Smart Assistant</p>
              <p className="text-[10px] font-bold text-green-500 uppercase mt-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Active now
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase">Current Session</p>
              <p className="text-xs font-bold text-slate-600 dark:text-white/60 truncate max-w-[150px]">
                {chatSessions.find(s => s.id === currentSessionId)?.title || "Fresh Chat"}
              </p>
            </div>
            <div className="h-8 w-[1px] bg-slate-100 hidden sm:block mx-2" />
            <UserMenu />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-10">
          <div className="max-w-4xl mx-auto space-y-12 pb-24">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-6 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center font-bold text-xs shadow-md transition-transform duration-300 ${msg.role === "assistant" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-100"
                  }`}>
                  {msg.role === "assistant" ? "AI" : (session?.user?.name?.substring(0, 2).toUpperCase() || "ME")}
                </div>
                <div className={`max-w-[85%] space-y-4 ${msg.role === "user" ? "text-left" : ""}`}>
                  <div className={`p-7 rounded-[2rem] text-slate-800 dark:text-slate-200 leading-relaxed text-[16px] shadow-sm relative transition-all ${msg.role === "assistant"
                    ? "bg-white dark:bg-[#1A1A3A] border border-slate-100 dark:border-white/5 rounded-tl-lg font-medium"
                    : "bg-blue-600 text-white rounded-tr-lg font-semibold shadow-blue-200"
                    }`}>
                    {msg.role === "assistant" && !msg.content && isLoading && i === messages.length - 1 ? (
                      <ThinkingDots />
                    ) : (
                      <div className="space-y-4">
                        {msg.attached_files && msg.attached_files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2 pb-3 border-b border-white/20">
                            {msg.attached_files.map((file, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold">
                                <FileText className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">{file.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {renderContent(msg.content || "", msg.role as "user" | "assistant")}
                        {msg.manual_answer && (
                          <div className="mt-6 pt-4 border-t border-amber-200 dark:border-amber-700/30">
                            <div className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-400 font-bold text-sm">
                              <AlertTriangle className="h-4 w-4" />
                              <span>Lecturer Correction</span>
                            </div>
                            <div className="text-slate-800 dark:text-slate-200">
                              {renderContent(msg.manual_answer, "assistant")}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {msg.role === "assistant" && msg.content && (
                    <div className="flex items-center gap-6 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => msg.id && handleFeedback(msg.id, 1)}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${msg.feedback_rating === 1 ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"}`}
                          title="Good answer"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => msg.id && handleFeedback(msg.id, -1)}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${msg.feedback_rating === -1 && !msg.is_flagged ? "text-orange-500 bg-orange-50 dark:bg-orange-900/30" : "text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30"}`}
                          title="Bad answer"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => msg.id && handleFeedback(msg.id, null, true)}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${msg.is_flagged ? "text-red-500 bg-red-50 dark:bg-red-900/30" : "text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"}`}
                          title="Report inaccurate answer"
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

        <div className="p-8 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.02)] z-30">
          <div className="max-w-4xl mx-auto space-y-4">
            {selectedFileIds.length > 0 && (
              <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest self-center mr-2">Context:</span>
                {selectedFileIds.map(id => {
                  const file = availableFiles.find(f => f.id === id);
                  return (
                    <div key={id} className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 border border-blue-100 dark:border-blue-500/20">
                      <FileText className="w-3 h-3" />
                      <span className="max-w-[120px] truncate">{file?.name || id}</span>
                      <button onClick={() => setSelectedFileIds(prev => prev.filter(fid => fid !== id))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative flex items-center gap-3">
              <div className="relative" ref={fileMenuRef}>
                <button 
                  onClick={() => setShowFileMenu(!showFileMenu)} 
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${selectedFileIds.length > 0 ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-[#F8FAFC] text-slate-400 hover:bg-slate-100 border-2 border-slate-100"}`}
                >
                  <Paperclip className="w-6 h-6" />
                </button>
                
                {showFileMenu && (
                  <div className="absolute bottom-full left-0 mb-4 w-80 bg-white dark:bg-[#1A1A3A] border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-bottom-left">
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Files</h4>
                      <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                        <PlusCircle className="w-3 h-3" /> Upload
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {availableFiles.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-xs font-bold">No files available</p>
                        </div>
                      ) : (
                        availableFiles.map(file => {
                          const isSelected = selectedFileIds.includes(file.id);
                          return (
                            <button 
                              key={file.id} 
                              onClick={() => setSelectedFileIds(prev => isSelected ? prev.filter(id => id !== file.id) : [...prev, file.id])}
                              className={`w-full text-left p-3 rounded-2xl transition-all flex items-center gap-3 ${isSelected ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-white/40 hover:bg-slate-50"}`}
                            >
                              <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100"}`}>
                                {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{file.name}</p>
                                <p className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">{file.course_name || "Personal"}</p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

              <div className="flex-1 relative group">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder={`Type your question about ${course?.name || 'this course'}...`}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-[#F8FAFC] px-8 py-5 pr-20 text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-8 focus:ring-blue-500/5 transition-all resize-none shadow-inner min-h-[68px] font-medium text-lg placeholder:text-slate-300"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading || isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Send className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase mt-4 tracking-widest">
            AI Assistant may provide inaccurate information. Always verify with course materials.
          </p>
        </div>
      </main>

      {/* Source Preview Pane */}
      {previewSource && (
        <div className="absolute inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300" onClick={() => setPreviewSource(null)} />
          <aside className="w-[450px] h-full bg-white shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-500 border-l border-slate-100">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-[#F8FAFC]">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-100 p-3 rounded-2xl">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-indigo-600 tracking-widest leading-none mb-1.5">Context Intelligence</h4>
                  <p className="text-xs text-slate-500 font-bold truncate max-w-[250px]">{previewSource?.metadata?.source}</p>
                </div>
              </div>
              <button onClick={() => setPreviewSource(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400 cursor-pointer">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10">
              <div className="space-y-6">
                <h5 className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  Verified Excerpt
                </h5>
                <div className="p-10 bg-[#F8FAFC] rounded-[2.5rem] border-2 border-blue-50 text-slate-800 leading-relaxed text-[17px] whitespace-pre-wrap font-medium shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
                  <mark className="bg-blue-50 text-slate-900 p-0 rounded-sm">
                    {previewSource?.content}
                  </mark>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Card className="p-6 border-none bg-blue-50/50 shadow-sm ring-1 ring-blue-100">
                  <h5 className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-4">Metadata Analysis</h5>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Document Format</p>
                      <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        {previewSource?.metadata?.format?.toUpperCase() || "PDF DOCUMENT"}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Retriever Confidence</p>
                      <p className="text-sm font-bold text-green-600 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        {(previewSource?.score * 100)?.toFixed(1)}% Accurate
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="p-6 bg-indigo-50/50 rounded-2xl border-2 border-indigo-50 flex gap-4 shadow-sm">
                  <Info className="h-6 w-6 text-indigo-500 shrink-0" />
                  <p className="text-xs text-indigo-800 leading-relaxed font-semibold">
                    This information was extracted directly from the course repository. Use it to cross-reference with your lecture notes.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-10 bg-[#F8FAFC] border-t border-slate-100">
              <Button
                className="w-full h-16 text-lg font-bold shadow-xl shadow-blue-100"
                variant="primary"
                onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/data/documents/${previewSource?.metadata?.source}`, '_blank')}
              >
                View Full Document <ExternalLink className="ml-3 w-5 h-5" />
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
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC] text-slate-400">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-slate-900 mb-1">Initializing Assistant</p>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Optimizing learning context...</p>
          </div>
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
