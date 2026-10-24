import React from 'react';

export const NovaHrSvg = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className} fill="none">
    <defs>
      <linearGradient id="novahr-grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00A651" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="novahr-grad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="128" fill="url(#novahr-grad1)" />
    <path d="M140 372V140H196L316 292V140H372V372H316L196 220V372H140Z" fill="white" />
    <circle cx="372" cy="140" r="28" fill="#F59E0B" />
  </svg>
);

// Backward-compatible alias
export const ToyonaSvg = NovaHrSvg;

export const NovaHrBrand = ({ size = "md", dark = false }: { size?: "sm" | "md" | "lg"; dark?: boolean }) => {
  const iconSizes = { sm: "h-6 w-6", md: "h-8 w-8", lg: "h-10 w-10" };
  const textSizes = { sm: "text-xs", md: "text-sm", lg: "text-base" };
  const subSizes = { sm: "text-[9px]", md: "text-[10px]", lg: "text-xs" };

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative shrink-0 flex items-center justify-center">
        <NovaHrSvg className={iconSizes[size]} />
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-black tracking-tight ${textSizes[size]} ${dark ? 'text-white' : 'text-slate-800'}`}>
          NOVA<span className="text-[#00A651]">HR</span>
        </span>
        <span className={`font-bold tracking-widest uppercase ${subSizes[size]} ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          ENTERPRISE HRMS
        </span>
      </div>
    </div>
  );
};

// Backward-compatible alias
export const ToyonaBrand = NovaHrBrand;

export const ModuleHeaderLogo = ({ title, icon: Icon }: { title: string; subtitle?: string; icon?: any }) => {
  return (
    <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200/80 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center shrink-0">
          <NovaHrSvg className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{title}</h2>
      </div>
      {Icon && (
        <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-400">
          <Icon className="w-4 h-4 text-[#00A651]" />
        </div>
      )}
    </div>
  );
};
