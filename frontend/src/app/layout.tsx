import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Teaching Assistant",
  description:
    "Student and lecturer interface for personalized review and Q&A.",
};

import AuthProvider from "@/components/providers/SessionProvider";
import { QuizProvider } from "@/components/providers/QuizProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <QuizProvider>
              {children}
              <Toaster richColors position="top-right" />
            </QuizProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
