import React from 'react';

export const ToyonaSvg = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510 531" className={className}>
    <path d="M 211.00,529.00 L 211.00,239.00 L 214.00,236.00 L 281.00,236.00 L 256.00,189.00 L 95.00,189.00 L 96.00,236.00 L 155.00,236.00 L 158.00,239.00 L 157.00,469.00 L 140.10,460.91 L 122.41,449.99 L 106.55,437.55 L 92.49,423.74 L 80.22,408.72 L 69.72,392.65 L 60.98,375.67 L 53.97,357.95 L 48.68,339.64 L 45.09,320.90 L 43.18,301.88 L 42.93,282.73 L 44.33,263.62 L 47.35,244.70 L 51.98,226.13 L 58.20,208.05 L 66.00,190.63 L 75.35,174.03 L 86.23,158.39 L 98.56,143.83 L 112.21,130.44 L 127.03,118.30 L 142.90,107.49 L 159.67,98.10 L 177.21,90.21 L 195.38,83.90 L 214.04,79.26 L 233.05,76.37 L 252.29,75.31 L 271.60,76.17 L 290.86,79.02 L 309.93,83.96 L 328.66,91.07 L 346.93,100.42 L 364.59,112.11 L 382.00,80.00 L 381.00,74.00 L 363.88,64.61 L 344.48,54.23 L 324.69,46.11 L 304.62,40.16 L 284.37,36.30 L 264.04,34.44 L 243.74,34.50 L 223.58,36.39 L 203.65,40.04 L 184.06,45.34 L 164.91,52.22 L 146.32,60.59 L 128.37,70.37 L 111.18,81.48 L 94.85,93.82 L 79.49,107.31 L 65.19,121.87 L 52.06,137.41 L 40.21,153.84 L 29.74,171.09 L 20.75,189.07 L 13.34,207.68 L 7.63,226.85 L 3.71,246.49 L 1.60,266.49 L 1.25,286.71 L 2.61,307.00 L 5.62,327.23 L 10.23,347.26 L 16.38,366.95 L 24.03,386.16 L 33.11,404.75 L 43.57,422.59 L 55.36,439.52 L 68.42,455.42 L 82.71,470.13 L 98.15,483.53 L 114.71,495.48 L 132.33,505.83 L 150.94,514.44 L 170.51,521.18 L 190.96,525.90 L 212.26,528.47 Z" fill="#00A651"/>
    <path d="M 406.00,92.00 L 403.00,92.00 L 301.00,263.00 L 297.00,262.00 L 291.00,251.00 L 230.00,251.00 L 271.00,315.00 L 271.00,491.00 L 237.00,492.00 L 237.00,530.00 L 255.11,531.14 L 275.31,531.14 L 294.94,529.31 L 313.95,525.76 L 332.30,520.57 L 349.93,513.83 L 366.81,505.64 L 382.89,496.09 L 398.12,485.27 L 412.45,473.28 L 425.84,460.22 L 438.24,446.16 L 449.61,431.21 L 459.90,415.45 L 469.06,398.99 L 477.05,381.92 L 483.82,364.31 L 489.33,346.29 L 493.56,327.93 L 496.48,309.34 L 498.06,290.62 L 498.28,271.86 L 497.11,253.17 L 494.52,234.64 L 485.00,198.47 L 478.01,181.02 L 469.49,164.14 L 459.44,147.90 L 447.81,132.43 L 434.58,117.81 L 419.72,104.14 L 403.22,91.52 Z M 420.00,166.00 L 430.23,180.72 L 439.15,196.48 L 446.34,212.89 L 451.86,229.83 L 455.74,247.18 L 458.02,264.80 L 458.73,282.58 L 457.93,300.39 L 455.64,318.10 L 451.91,335.58 L 446.77,352.71 L 440.26,369.37 L 432.42,385.42 L 423.30,400.75 L 412.92,415.22 L 401.33,428.71 L 388.57,441.10 L 374.67,452.25 L 359.68,462.04 L 343.63,470.36 L 326.56,477.06 L 326.00,316.00 L 416.00,168.00 L 420.00,166.00 Z" fill="#ED1C24" fillRule="evenodd"/>
  </svg>
);

export const ToyonaBrand = ({ size = "md", dark = false }: { size?: "sm" | "md" | "lg"; dark?: boolean }) => {
  const iconSizes = { sm: "h-6 w-6", md: "h-8 w-8", lg: "h-10 w-10" };
  const textSizes = { sm: "text-xs", md: "text-sm", lg: "text-base" };
  const subSizes = { sm: "text-[9px]", md: "text-[10px]", lg: "text-xs" };

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative shrink-0 flex items-center justify-center">
        <ToyonaSvg className={iconSizes[size]} />
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-black tracking-tight ${textSizes[size]} ${dark ? 'text-white' : 'text-slate-800'}`}>
          TOYONA<span className="text-[#00A651]">SAVDO</span>
        </span>
        <span className={`font-bold tracking-widest uppercase ${subSizes[size]} ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          HRMS PORTAL
        </span>
      </div>
    </div>
  );
};

export const ModuleHeaderLogo = ({ title, icon: Icon }: { title: string; subtitle?: string; icon?: any }) => {
  return (
    <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200/80">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
          <ToyonaSvg className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
      </div>
      {Icon && (
        <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-400">
          <Icon className="w-4 h-4 text-[#00A651]" />
        </div>
      )}
    </div>
  );
};
