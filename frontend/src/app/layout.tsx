import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Teaching Assistant",
  description:
    "Student and lecturer interface for personalized review and Q&A.",
};

import AuthProvider from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
