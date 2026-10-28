import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Ma'lumotlarni Excel (XLSX) formatida to'g'ri va xatosiz yuklab olish
 * (Browserda xitoycha belgilar yoki buzilgan fayl chiqishining oldi olingan)
 */
export const exportToExcel = (data: any[], fileName: string) => {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn("Excelga eksport qilish uchun ma'lumotlar mavjud emas");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Ustun kengliklarini matnga qarab chiroyli va qulay qilish
  const colWidths = Object.keys(data[0] || {}).map(key => {
    const maxValLen = Math.max(
      key.length,
      ...data.map(row => String(row[key] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxValLen + 3, 12), 40) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hisobot");

  const cleanName = (fileName || 'Toyona_Savdo_Hisobot')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .trim();

  // 1. SheetJS rasmiy writeFile metodi (Windows Excelda xitoycha ieroglif chiqishini butunlay oldini oladi)
  if (typeof window !== 'undefined' && typeof XLSX.writeFile === 'function') {
    try {
      XLSX.writeFile(workbook, `${cleanName}.xlsx`, { bookType: 'xlsx', compression: true });
      return;
    } catch (e) {
      console.warn("XLSX.writeFile fallback to binary blob:", e);
    }
  }

  // 2. Binary string -> Uint8Array ArrayBuffer (100% toza OpenXML XLSX binary struktura)
  const excelBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary', compression: true });
  const buffer = new ArrayBuffer(excelBinary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < excelBinary.length; i++) {
    view[i] = excelBinary.charCodeAt(i) & 0xff;
  }

  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${cleanName}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  const cleanName = (fileName || 'Toyona_Savdo_Hisobot')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .trim();

  doc.save(`${cleanName}.pdf`);
};
