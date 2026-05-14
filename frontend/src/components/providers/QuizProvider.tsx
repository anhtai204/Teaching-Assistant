"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import QuizModal from "../student/QuizModal";

interface QuizTask {
  courseId: string;
  courseName: string;
  userId: string;
  skipRoadmap?: boolean;
}

interface QuizContextType {
  activeTask: QuizTask | null;
  isOpen: boolean;
  startQuiz: (task: QuizTask) => void;
  closeQuiz: () => void;
  setIsOpen: (open: boolean) => void;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [activeTask, setActiveTask] = useState<QuizTask | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const startQuiz = (task: QuizTask) => {
    setActiveTask(task);
    setIsOpen(true);
  };

  const closeQuiz = () => {
    setActiveTask(null);
    setIsOpen(false);
  };

  return (
    <QuizContext.Provider value={{ activeTask, isOpen, startQuiz, closeQuiz, setIsOpen }}>
      {children}
      {activeTask && (
        <QuizModal
          courseId={activeTask.courseId}
          courseName={activeTask.courseName}
          userId={activeTask.userId}
          skipRoadmap={activeTask.skipRoadmap}
          onClose={closeQuiz}
          onComplete={() => {
            // Success logic is handled inside QuizModal (toast/roadmap update)
            // But we might want to refresh the roadmap page if the user is currently on it.
            // For now, just letting QuizModal handle its own closing if needed,
            // or we can close it here.
          }}
        />
      )}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error("useQuiz must be used within a QuizProvider");
  }
  return context;
}
