import React from 'react';
import { Download } from 'lucide-react';

interface ExportButtonsProps {
  onExportExcel: () => void;
  onExportPDF: () => void;
  excelLabel?: string;
  pdfLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  onExportExcel,
  onExportPDF,
  excelLabel = "Excel",
  pdfLabel = "PDF",
  size = 'md',
  className = ''
}) => {
  const isSm = size === 'sm';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onExportExcel}
        className={`flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:bg-emerald-200 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl transition-all border border-emerald-200 dark:border-emerald-800/60 shadow-2xs cursor-pointer ${
          isSm ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        }`}
        title="Excel (XLSX) formatida yuklab olish"
      >
        <Download className={isSm ? "w-3 h-3 text-emerald-600 dark:text-emerald-400" : "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"} />
        <span>{excelLabel}</span>
      </button>

      <button
        type="button"
        onClick={onExportPDF}
        className={`flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:bg-rose-200 text-rose-700 dark:text-rose-300 font-bold rounded-xl transition-all border border-rose-200 dark:border-rose-800/60 shadow-2xs cursor-pointer ${
          isSm ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        }`}
        title="PDF formatida yuklab olish"
      >
        <Download className={isSm ? "w-3 h-3 text-rose-600 dark:text-rose-400" : "w-3.5 h-3.5 text-rose-600 dark:text-rose-400"} />
        <span>{pdfLabel}</span>
      </button>
    </div>
  );
};

export default ExportButtons;
