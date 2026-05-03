"use client";

import Link from "next/link";
import { Card } from "@/components/ui/FormElements";
import { Button } from "@/components/ui/Button";
import { StudentHeader } from "@/components/StudentHeader";

export default function StudentRevisionPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F23]">
      <StudentHeader />

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <header className="space-y-2">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Revision Roadmap</h2>
          <p className="text-slate-600 dark:text-white/60">Based on your chat history, we've identified topics you should review.</p>
        </header>

        <section className="space-y-6">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Priority Review</h3>
          <div className="space-y-4">
            <RevisionItem 
              topic="A* Search Heuristics" 
              reason="You asked 3 questions about this topic yesterday."
              difficulty="High"
            />
            <RevisionItem 
              topic="Bayesian Networks" 
              reason="Identified as a knowledge gap in your recent quiz."
              difficulty="Medium"
            />
            <RevisionItem 
              topic="Depth-First Search" 
              reason="Suggested for foundation reinforcement."
              difficulty="Low"
            />
          </div>
        </section>

        <Card className="p-8 bg-brand-600 dark:bg-brand-500/20 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative border-none">
          <div className="space-y-2 relative z-10">
            <h3 className="text-2xl font-bold dark:text-white">Ready for a quick test?</h3>
            <p className="text-brand-100 dark:text-white/60">Take a 5-minute quiz on 'Informed Search' to track your progress.</p>
          </div>
          <Button variant="secondary" className="relative z-10 dark:bg-white dark:text-slate-900">Start Revision Quiz</Button>
          <div className="absolute top-0 right-0 h-32 w-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
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
        <p className="text-sm text-slate-500 dark:text-white/40">{reason}</p>
      </div>
      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
        difficulty === "High" ? "bg-red-50 text-red-600" :
        difficulty === "Medium" ? "bg-amber-50 text-amber-600" :
        "bg-emerald-50 text-emerald-600"
      }`}>
        {difficulty} Difficulty
      </span>
    </Card>
  );
}
