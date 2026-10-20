import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Ma'lumotlarni Excel (XLSX) formatida yuklab olish
 */
export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Ma'lumotlarni PDF formatida yuklab olish
 */
export const exportToPDF = (
  headers: string[], 
  data: any[][], 
  fileName: string,
  title?: string,
  orientation?: 'portrait' | 'landscape'
) => {
  const isLandscape = orientation === 'landscape' || (!orientation && headers.length > 5);
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  if (title) {
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(title, 14, 15);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Toyona Savdo HRMS • Sana: ${new Date().toLocaleDateString('uz-UZ')}`, 14, 20);
  }

  (doc as any).autoTable({
    startY: title ? 23 : 14,
    head: [headers],
    body: data,
    styles: { 
      fontSize: 8, 
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1
    },
    headStyles: { 
      fillColor: [0, 166, 81], 
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });
  doc.save(`${fileName}.pdf`);
};
