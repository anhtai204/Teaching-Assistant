import React from "react";

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
  <div className={`rounded-xl border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1A1A3A] shadow-md transition-all duration-200 ${className}`} {...props}>
    {children}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = "", ...props }) => (
  <div className="space-y-2">
    {label && <label className="block text-sm font-bold text-slate-700 dark:text-white/60 ml-1">{label}</label>}
    <input
      className={`w-full h-14 px-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${className}`}
      {...props}
    />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, options: { value: string, label: string }[] }> = ({ label, options, className = "", ...props }) => (
  <div className="space-y-2">
    {label && <label className="block text-sm font-bold text-slate-700 dark:text-white/60 ml-1">{label}</label>}
    <select
      className={`w-full h-14 px-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1A3A] text-slate-900 dark:text-white transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 appearance-none bg-no-repeat bg-[right_1.25rem_center] bg-[length:1em_1em] ${className}`}
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")` }}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} className="dark:bg-[#1A1A3A]">{opt.label}</option>
      ))}
    </select>
  </div>
);
