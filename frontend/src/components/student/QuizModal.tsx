"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, AlertCircle, Loader2, Award, ArrowRight, BrainCircuit } from "lucide-react";
import { toast } from "sonner";

interface Question {
  question: string;
  options: string[];
  correct_index: number;
  topic: string;
  explanation?: string;
}

interface QuizModalProps {
  attemptId?: string;
  courseId?: string;
  courseIds?: string[];
  courseName?: string;
  userId: string;
  count?: number;
  topics?: string[];
  skipRoadmap?: boolean;
  onClose: () => void;
  onComplete: (roadmapItems: any[]) => void;
}

export default function QuizModal({ 
  attemptId: initialAttemptId, 
  courseId, 
  courseIds, 
  courseName, 
  userId, 
  count = 5, 
  topics, 
  skipRoadmap = false, 
  onClose, 
  onComplete 
}: QuizModalProps) {
  const [step, setStep] = useState<"loading" | "quiz" | "evaluating" | "result" | "review">("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [feedback, setFeedback] = useState<Record<number, "up" | "down">>({});
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(initialAttemptId || null);
  const [mounted, setMounted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const hasGenerated = useRef(false);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (currentAttemptId) {
      fetchAttempt(currentAttemptId);
    } else {
      if (!hasGenerated.current) {
        hasGenerated.current = true;
        generateQuiz();
      }
    }
  }, [mounted, currentAttemptId]);

  const fetchAttempt = async (id: string) => {
    try {
      const res = await fetch(`${baseUrl}/api/quiz/${id}`);
      if (!res.ok) throw new Error("Không thể tải bài ôn tập.");
      const data = await res.json();
      setQuestions(data.questions);
      setAnswers(data.answers || []);
      setEvaluation({
        score: data.score,
        total: data.total,
        percentage: Math.round((data.score / data.total) * 100) || 0,
        gaps: []
      });
      setStep(data.status === "completed" ? "result" : "quiz");
    } catch (err: any) {
      toast.error(err.message);
      onClose();
    }
  };

  const generateQuiz = async () => {
    try {
      const timeString = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const baseTitle = skipRoadmap ? courseName : `Đánh giá: ${courseName || "Khóa học"}`;
      const finalTitle = `${baseTitle} (${timeString})`;

      const res = await fetch(`${baseUrl}/api/quiz/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          course_id: courseId,
          course_ids: courseIds,
          count: count,
          topics: topics,
          title: finalTitle
        })
      });
      if (!res.ok) throw new Error("Không thể khởi tạo bài kiểm tra.");
      const data = await res.json();

      if (!data.questions || data.questions.length === 0) {
        throw new Error("AI không thể tạo câu hỏi từ tài liệu này. Vui lòng thử lại sau.");
      }

      setQuestions(data.questions);
      setCurrentAttemptId(data.attempt_id);
      setStep("quiz");
      
      // Auto-restore if was minimized
      if (isMinimized) {
        toast.success("AI đã soạn xong đề bài! Sẵn sàng bắt đầu.");
        setIsMinimized(false);
      }
    } catch (err: any) {
      toast.error(err.message);
      onClose();
    }
  };

  const handleAnswer = (optionIdx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = optionIdx;
    setAnswers(newAnswers);
  };

  const prevQuestion = () => {
    setCurrentIdx(prev => Math.max(0, prev - 1));
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      submitQuiz();
    }
  };

  const retakeQuiz = () => {
    setAnswers([]);
    setCurrentIdx(0);
    setEvaluation(null);
    setStep("quiz");
    toast.success("Bắt đầu làm lại bài tập!");
  };

  const submitQuiz = async () => {
    setStep("evaluating");
    try {
      const res = await fetch(`${baseUrl}/api/quiz/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          attempt_id: currentAttemptId,
          answers: answers,
          skip_roadmap: skipRoadmap
        }),
      });

      if (!res.ok) throw new Error("Đánh giá thất bại.");
      const data = await res.json();
      setEvaluation(data.result || data.evaluation);
      setStep("result");
      onComplete(data.items || []);
      
      // Auto-restore if was minimized
      if (isMinimized) {
        toast.success("AI đã chấm điểm xong!");
        setIsMinimized(false);
      }
    } catch (err: any) {
      toast.error(err.message);
      setStep("quiz");
    }
  };

  const handleFeedback = (idx: number, type: "up" | "down") => {
    setFeedback(prev => ({ ...prev, [idx]: type }));
    toast.success("Cảm ơn phản hồi của bạn!");
  };

  const handleClose = () => {
    if (step === "quiz") {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  if (!mounted) return null;

  if (isMinimized) {
    return createPortal(
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-8 right-8 z-[10000] group cursor-pointer animate-in slide-in-from-bottom-10 duration-500"
      >
        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 animate-pulse transition-opacity" />
        <div className="relative bg-white dark:bg-[#1A1A3A] border-2 border-indigo-500 rounded-3xl p-4 shadow-2xl flex items-center gap-4 hover:-translate-y-2 transition-all duration-300">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BrainCircuit className="w-7 h-7 text-white animate-pulse" />
          </div>
          <div className="pr-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-0.5">AI đang xử lý</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">Bấm để mở lại</p>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#1A1A3A] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden relative animate-in zoom-in-95 duration-300">
        
        {/* Close Confirmation Overlay */}
        {showConfirmClose && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#1A1A3A] w-full max-w-sm rounded-[2.5rem] p-8 border border-indigo-500/20 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10 animate-bounce">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white font-['Lexend'] tracking-tight">Rời khỏi bài làm?</h3>
                <p className="text-sm text-slate-500 dark:text-white/60 leading-relaxed font-medium">
                  Kết quả bài làm hiện tại của bạn sẽ bị mất và không được lưu lại. Bạn có chắc chắn muốn thoát?
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirmClose(false)}
                  className="flex-1 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/5 font-black text-xs uppercase tracking-widest transition-all"
                >
                  Quay lại làm
                </button>
                <button
                  onClick={() => {
                    setShowConfirmClose(false);
                    onClose();
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-rose-500/20 active:scale-95"
                >
                  Xác nhận thoát
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header Actions */}
        <div className="absolute top-8 right-8 flex items-center gap-3 z-10">
          {(step === "loading" || step === "evaluating") && (
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors group/min"
              title="Chạy dưới nền"
            >
              <div className="w-6 h-6 flex items-center justify-center border-2 border-current rounded-md group-hover/min:scale-90 transition-transform" />
            </button>
          )}
          <button
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-10 max-h-[90vh] overflow-y-auto">
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-indigo-100 dark:border-white/5 border-t-indigo-600 rounded-full animate-spin" />
                <BrainCircuit className="absolute inset-0 m-auto w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-black text-slate-900 dark:text-white font-['Lexend'] tracking-tight">AI đang soạn đề bài...</p>
                <p className="text-sm text-slate-400 dark:text-white/40 font-bold uppercase tracking-widest">
                  {courseName ? `Môn học: ${courseName}` : "Phân tích tài liệu khóa học"}
                </p>
              </div>
            </div>
          )}

          {step === "quiz" && questions[currentIdx] && (
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">
                    <Award className="w-3.5 h-3.5" />
                    <span>Đánh giá năng lực AI</span>
                  </div>
                  {courseName && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                      {courseName}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white font-['Lexend']">
                  Câu hỏi {currentIdx + 1}/{questions.length}
                </h2>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-lg font-bold text-slate-800 dark:text-white leading-relaxed">
                  {questions[currentIdx].question}
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {questions[currentIdx].options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      className={`p-5 rounded-2xl border-2 text-left transition-all font-bold ${answers[currentIdx] === idx
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          : "border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:border-indigo-200 dark:hover:border-indigo-500/30"
                        }`}
                    >
                      <span className="inline-block w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-inherit flex-shrink-0 text-center leading-8 mr-4">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  onClick={prevQuestion}
                  disabled={currentIdx === 0}
                  className="px-6 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
                >
                  Câu trước
                </button>
                <button
                  onClick={nextQuestion}
                  disabled={answers[currentIdx] === undefined}
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm transition-all shadow-xl shadow-indigo-500/20"
                >
                  {currentIdx === questions.length - 1 ? "Hoàn thành & Phân tích" : "Câu tiếp theo"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === "evaluating" && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
              <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 animate-bounce">
                <BrainCircuit className="w-12 h-12 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white font-['Lexend'] tracking-tight">
                  {skipRoadmap ? "AI đang chấm điểm và ghi nhận..." : "AI đang chấm điểm và lập lộ trình..."}
                </h3>
                <p className="text-slate-500 dark:text-white/40 font-medium">
                  {skipRoadmap ? "Chúng tôi đang đánh giá mức độ củng cố kiến thức của bạn." : "Chúng tôi đang xác định những phần bạn cần cải thiện nhất."}
                </p>
              </div>
            </div>
          )}

          {step === "result" && (
            <div className="space-y-8 text-center py-6">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 mb-4 animate-in zoom-in duration-500">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white font-['Lexend']">Hoàn tất đánh giá!</h2>
                <p className="text-slate-500 dark:text-white/60 font-bold uppercase tracking-widest text-sm">
                  Điểm số: {evaluation?.score}/{evaluation?.total} ({evaluation?.percentage}%)
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setCurrentIdx(0);
                    setStep("review");
                  }}
                  className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
                >
                  Xem lại bài làm & Giải thích
                </button>
                <button
                  onClick={retakeQuiz}
                  className="w-full py-4 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 font-black hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-all"
                >
                  Làm lại bài này
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 font-black hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}

          {step === "review" && questions[currentIdx] && (
            <div className="space-y-8 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 dark:text-white font-['Lexend']">
                  Câu {currentIdx + 1}/{questions.length}
                </h3>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${answers[currentIdx] === questions[currentIdx].correct_index
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                  }`}>
                  {answers[currentIdx] === questions[currentIdx].correct_index ? "Đúng" : "Sai"}
                </span>
              </div>

              <div className="space-y-6">
                <p className="text-lg font-bold text-slate-800 dark:text-white leading-relaxed">
                  {questions[currentIdx].question}
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {questions[currentIdx].options.map((option, idx) => {
                    const isUserAnswer = answers[currentIdx] === idx;
                    const isCorrect = questions[currentIdx].correct_index === idx;

                    let borderClass = "border-slate-100 dark:border-white/5";
                    let bgClass = "bg-slate-50 dark:bg-white/5";
                    let textClass = "text-slate-600 dark:text-white/60";

                    if (isCorrect) {
                      borderClass = "border-emerald-500";
                      bgClass = "bg-emerald-50 dark:bg-emerald-500/10";
                      textClass = "text-emerald-600 dark:text-emerald-400";
                    } else if (isUserAnswer && !isCorrect) {
                      borderClass = "border-rose-500";
                      bgClass = "bg-rose-50 dark:bg-rose-500/10";
                      textClass = "text-rose-600 dark:text-rose-400";
                    }

                    return (
                      <div
                        key={idx}
                        className={`p-5 rounded-2xl border-2 text-left font-bold relative ${borderClass} ${bgClass} ${textClass}`}
                      >
                        <span className="inline-block w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-inherit flex-shrink-0 text-center leading-8 mr-4">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {option}
                        {isCorrect && <CheckCircle2 className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500" />}
                        {isUserAnswer && !isCorrect && <X className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-rose-500" />}
                      </div>
                    );
                  })}
                </div>

                {questions[currentIdx].explanation && (
                  <div className="p-8 bg-gradient-to-r from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-[2rem] border-2 border-indigo-100/50 dark:border-indigo-500/10 border-l-8 border-l-indigo-600 dark:border-l-indigo-500 space-y-4 shadow-sm relative overflow-hidden group/exp">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/exp:scale-110 transition-transform">
                      <BrainCircuit className="w-16 h-16 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                        <BrainCircuit className="w-4 h-4 animate-pulse" />
                      </span>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-['Lexend']">
                        Giải thích khoa học của AI
                      </span>
                    </div>
                    <p className="text-base md:text-[17px] text-slate-800 dark:text-indigo-50/90 leading-relaxed font-semibold">
                      {questions[currentIdx].explanation}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  className="px-6 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
                >
                  Câu trước
                </button>
                <div className="flex gap-2">
                  {currentIdx < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentIdx(prev => prev + 1)}
                      className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all shadow-xl shadow-indigo-500/20"
                    >
                      Tiếp theo
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={onClose}
                      className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all shadow-xl shadow-indigo-500/20"
                    >
                      Hoàn thành xem lại
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}