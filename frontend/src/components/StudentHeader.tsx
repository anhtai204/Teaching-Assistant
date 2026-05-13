"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LayoutDashboard, BookOpen, Clock, Map } from "lucide-react";
import { UserMenu } from "./UserMenu";

export const StudentHeader = () => {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { name: "Materials", href: "/student/materials", icon: BookOpen },
    { name: "Roadmaps", href: "/student/roadmap", icon: Map },
    { name: "Revision", href: "/student/revision", icon: Clock },
  ];

  return (
    <nav className="bg-white dark:bg-[#0F0F23]/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5 sticky top-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-10">
          <Link href="/student/dashboard" className="flex items-center gap-2 group">
            <div className="bg-indigo-600 p-2 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden sm:block tracking-tight">AI Assistant</h1>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-bold">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 transition-all ${isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-500 dark:text-white/60 hover:text-indigo-600 dark:hover:text-indigo-400"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <UserMenu />
        </div>
      </div>
    </nav>
  );
};
