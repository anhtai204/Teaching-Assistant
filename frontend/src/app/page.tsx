import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Sparkles, GraduationCap, BarChart3, ArrowRight, CheckCircle2, UserCircle, ShieldCheck, Zap, BookOpen, Target, Search } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 selection:bg-indigo-200 selection:text-indigo-900 font-['Inter'] overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-20 lg:px-8 overflow-hidden bg-white">
        {/* Animated Background blobs */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem] animate-pulse"></div>
        </div>

        <div className="mx-auto max-w-4xl py-24 sm:py-32 animate-reveal">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold leading-6 text-indigo-600 ring-1 ring-inset ring-indigo-600/20 mb-8 bg-indigo-50/50 shadow-sm animate-float">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Hệ thống Trợ giảng AI Thế hệ mới</span>
            </div>

            <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-7xl mb-8 leading-[1.1] font-['Lexend']">
              Cá nhân hóa học tập với <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 animate-gradient-x">Trí tuệ nhân tạo</span>
            </h1>

            <p className="text-xl leading-relaxed text-slate-600 mb-10 max-w-2xl mx-auto font-medium">
              Giải pháp toàn diện giúp Giảng viên tối ưu khối lượng công việc và hỗ trợ Sinh viên làm chủ kiến thức thông qua phản hồi tức thì và lộ trình cá nhân hóa.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="w-full sm:w-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <Button size="lg" className="relative w-full sm:w-auto h-16 px-10 text-xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 rounded-2xl transition-all hover:scale-105 active:scale-95 font-bold">
                  Bắt đầu ngay <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-16 px-10 text-xl border-slate-200 hover:bg-slate-50 shadow-sm rounded-2xl transition-all font-bold">
                  Đăng nhập
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#6366F1] to-[#818CF8] opacity-10 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
        </div>
      </div>

      {/* Goal Section */}
      <div className="py-24 bg-white relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-20 animate-reveal">
            <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-[0.3em] mb-4 font-['Inter']">Mục tiêu</h2>
            <p className="text-4xl font-black text-slate-900 sm:text-5xl tracking-tight font-['Lexend']">Sứ mệnh của chúng tôi</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <GoalCard 
              icon={<Zap className="w-7 h-7 text-amber-500" />}
              title="Tốc độ & Chính xác"
              description="Cung cấp câu trả lời tức thì dựa trên giáo trình nội bộ, trích dẫn nguồn cụ thể (Slide, Video, Tài liệu)."
              delay="0s"
            />
            <GoalCard 
              icon={<Target className="w-7 h-7 text-rose-500" />}
              title="Cá nhân hóa"
              description="Phát hiện lỗ hổng kiến thức của từng sinh viên để đề xuất lộ trình ôn tập và luyện tập phù hợp nhất."
              delay="0.1s"
            />
            <GoalCard 
              icon={<BarChart3 className="w-7 h-7 text-emerald-500" />}
              title="Tối ưu giảng dạy"
              description="Giúp giảng viên hiểu sâu về khó khăn của lớp học thông qua dữ liệu phân tích thời gian thực."
              delay="0.2s"
            />
          </div>
        </div>
      </div>

      {/* Target Audience Section */}
      <div className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20 animate-reveal">
            <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-[0.3em] mb-4 font-['Inter']">Đối tượng</h2>
            <p className="text-4xl font-black text-slate-900 sm:text-5xl tracking-tight font-['Lexend']">Được thiết kế cho mọi vai trò</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <AudienceCard 
              type="Sinh viên"
              icon={<GraduationCap className="w-14 h-14" />}
              benefits={[
                "Hỏi đáp AI 24/7 về môn học",
                "Xem lộ trình ôn tập cá nhân",
                "Truy cập kho học liệu thông minh",
                "Luyện tập với Quiz tự động"
              ]}
              color="indigo"
              delay="0s"
            />
            <AudienceCard 
              type="Giảng viên"
              icon={<UserCircle className="w-14 h-14" />}
              benefits={[
                "Tự động trả lời câu hỏi lặp lại",
                "Theo dõi mức độ hiểu bài của lớp",
                "Quản lý tài liệu đa phương tiện",
                "Phát hiện sớm sinh viên yếu"
              ]}
              color="blue"
              delay="0.1s"
            />
            <AudienceCard 
              type="Quản trị viên"
              icon={<ShieldCheck className="w-14 h-14" />}
              benefits={[
                "Quản lý người dùng & phân quyền",
                "Giám sát an toàn nội dung AI",
                "Cấu hình hệ thống & API",
                "Báo cáo hiệu quả toàn hệ thống"
              ]}
              color="slate"
              delay="0.2s"
            />
          </div>
        </div>
      </div>

      {/* How to Use Section */}
      <div className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-20 animate-reveal">
            <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-[0.3em] mb-4 font-['Inter']">Cách sử dụng</h2>
            <p className="text-4xl font-black text-slate-900 sm:text-5xl tracking-tight font-['Lexend']">3 bước để bắt đầu</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-10 animate-reveal">
              <StepItem 
                number="01"
                title="Đăng ký & Chọn vai trò"
                description="Tạo tài khoản và chọn vai trò Sinh viên hoặc Giảng viên để trải nghiệm các tính năng dành riêng cho bạn."
              />
              <StepItem 
                number="02"
                title="Kết nối với Khóa học"
                description="Giảng viên tải lên giáo trình; Sinh viên nhập mã lớp học để bắt đầu tương tác với trợ lý AI."
              />
              <StepItem 
                number="03"
                title="Học tập & Phân tích"
                description="Tương tác, hỏi đáp và theo dõi tiến độ. Hệ thống sẽ tự động tổng hợp dữ liệu để tối ưu hóa việc học."
              />
            </div>
            <div className="relative animate-reveal" style={{ animationDelay: '0.3s' }}>
              <div className="aspect-square rounded-[3rem] bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-100 flex items-center justify-center p-12 overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 left-0 w-full h-full animate-pulse bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1),transparent_70%)]"></div>
                <div className="bg-white p-10 rounded-3xl shadow-2xl w-full rotate-3 transform hover:rotate-0 transition-all duration-700 hover:scale-105 relative z-10 border border-slate-100">
                  <div className="flex items-center gap-4 mb-8 border-b border-slate-50 pb-6">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200">AI</div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-slate-100 rounded-full"></div>
                      <div className="h-3 w-20 bg-slate-50 rounded-full"></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 w-full bg-slate-50 rounded-full"></div>
                    <div className="h-4 w-5/6 bg-slate-50 rounded-full"></div>
                    <div className="h-4 w-4/6 bg-indigo-50 rounded-full"></div>
                  </div>
                  <div className="mt-10 flex justify-end">
                    <div className="h-10 w-28 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 animate-glow"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-slate-900 py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl font-black text-white mb-10 tracking-tight font-['Lexend']">Sẵn sàng nâng tầm trải nghiệm giáo dục?</h2>
          <Link href="/signup">
            <Button size="lg" className="bg-white !text-indigo-600 hover:bg-indigo-50 px-12 h-16 text-xl rounded-2xl shadow-2xl shadow-white/10 transition-all hover:scale-110 font-bold">
              Tham gia ngay miễn phí <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-20 bg-white text-center text-slate-500 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tighter font-['Lexend']">AI Assistant</span>
          </div>
          <p className="mb-6 font-semibold max-w-md mx-auto">Kiến tạo tương lai cho nền giáo dục hiện đại bằng sức mạnh của AI.</p>
          <div className="flex justify-center gap-10 text-sm font-bold uppercase tracking-widest font-['Inter']">
            <a href="#" className="hover:text-indigo-600 transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Bảo mật</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Liên hệ</a>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-50 text-xs font-medium">
            &copy; 2026 AI Teaching Assistant Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}

function GoalCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: string }) {
  return (
    <div 
      className="p-10 rounded-[2.5rem] bg-white border border-slate-100 hover-glow transition-all duration-500 animate-reveal"
      style={{ animationDelay: delay }}
    >
      <div className="mb-8 p-5 rounded-2xl bg-slate-50 w-fit shadow-inner group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight font-['Lexend']">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-base font-medium">{description}</p>
    </div>
  );
}

function AudienceCard({ type, icon, benefits, color, delay }: { type: string, icon: React.ReactNode, benefits: string[], color: string, delay: string }) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-600 text-white shadow-indigo-200",
    blue: "bg-blue-600 text-white shadow-blue-200",
    slate: "bg-slate-800 text-white shadow-slate-200"
  };

  const iconBgs: Record<string, string> = {
    indigo: "bg-indigo-500/20",
    blue: "bg-blue-500/20",
    slate: "bg-slate-700/20"
  };

  const checkColors: Record<string, string> = {
    indigo: "text-indigo-500",
    blue: "text-blue-500",
    slate: "text-slate-600"
  };

  return (
    <div 
        className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-700 flex flex-col group animate-reveal"
        style={{ animationDelay: delay }}
    >
      <div className={`p-10 ${colors[color]} flex flex-col items-center text-center gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.4),transparent)]"></div>
        <div className={`p-6 ${iconBgs[color]} rounded-[2rem] backdrop-blur-xl relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-500`}>
          {icon}
        </div>
        <h3 className="text-3xl font-black tracking-tight relative z-10 font-['Lexend']">{type}</h3>
      </div>
      <div className="p-10 space-y-5 flex-1 bg-white">
        {benefits.map((benefit, i) => (
          <div key={i} className="flex items-center gap-4 text-slate-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center ${checkColors[color]}`}>
                <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-base">{benefit}</span>
          </div>
        ))}
      </div>
      <div className="p-10 pt-0 mt-auto">
        <Link href="/signup">
          <Button variant="outline" className="w-full h-14 rounded-2xl font-bold group-hover:bg-slate-50 group-hover:border-indigo-200 transition-all font-bold">Lợi ích cho {type}</Button>
        </Link>
      </div>
    </div>
  );
}

function StepItem({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="flex gap-8 group">
      <div className="flex-shrink-0 w-16 h-16 rounded-[1.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm font-['Lexend']">
        {number}
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight font-['Lexend']">{title}</h3>
        <p className="text-slate-500 text-base font-medium leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
