import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Sparkles, GraduationCap, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 selection:bg-indigo-200 selection:text-indigo-900">
      {/* Hero Section - Minimal Single Column Pattern */}
      <div className="relative isolate px-6 pt-20 lg:px-8">
        {/* Background blobs for vibrancy */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>

        <div className="mx-auto max-w-4xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold leading-6 text-blue-600 ring-1 ring-inset ring-blue-600/10 mb-10 bg-blue-50/50 animate-float">
              <Sparkles className="w-4 h-4" />
              <span>Next-Gen AI Teaching Assistant</span>
            </div>

            <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-7xl mb-10 leading-[1.1]">
              Empower Learning with <span className="text-blue-600">Smart AI</span>
            </h1>

            <p className="text-xl leading-relaxed text-slate-600 mb-12 max-w-2xl mx-auto font-medium">
              Reduce lecturer workload and help students master their courses with instant, cited answers and personalized learning roadmaps.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto h-16 text-xl px-10">
                  Get Started for Free <ArrowRight className="ml-3 w-6 h-6" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-16 text-xl px-10">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Trust Badges / Benefits (3 max as per pattern) */}
            <div className="mt-20 flex flex-wrap justify-center gap-x-12 gap-y-6 text-slate-500 font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                <span>Instant Cited Answers</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                <span>Personalized Roadmap</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                <span>Lecture Analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom blob */}
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#6366F1] to-[#818CF8] opacity-10 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Instant Q&A"
              description="Get answers cited directly from slides and video transcripts with exact timestamps."
              icon={<Sparkles className="w-10 h-10 text-indigo-500" />}
            />
            <FeatureCard
              title="Personalized Revision"
              description="Identify your knowledge gaps and get a custom study path tailored to your learning pace."
              icon={<GraduationCap className="w-10 h-10 text-blue-500" />}
            />
            <FeatureCard
              title="Lecturer Insights"
              description="Understand class misconceptions at a glance with advanced analytics and heatmaps."
              icon={<BarChart3 className="w-10 h-10 text-emerald-500" />}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 text-center text-slate-400 font-medium">
        <p>&copy; 2026 AI Teaching Assistant. Built for the future of education.</p>
      </footer>
    </main>
  );
}

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) {
  return (
    <div className="card group">
      <div className="mb-6 p-3 rounded-2xl bg-slate-50 w-fit group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-4">{title}</h3>
      <p className="text-slate-600 leading-relaxed font-medium">{description}</p>
    </div>
  );
}
