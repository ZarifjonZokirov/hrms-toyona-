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

  // 1. Toza varaq va kitob yaratish
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Ustun kengliklarini matnga qarab optimal moslash
  const colWidths = Object.keys(data[0] || {}).map(key => {
    const maxValLen = Math.max(
      String(key).length,
      ...data.map(row => String(row[key] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxValLen + 3, 12), 45) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hisobot");

  // Fayl nomidagi xavfli yoki noaniq belgilarni tozalash (Windows fayl tizimi va Excel uchun xavfsiz)
  const safeName = (fileName || 'Toyona_Savdo_Hisobot')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'Toyona_Savdo_Hisobot';

  // 2. XLSX binar oqimini ArrayBuffer ko'rinishida hosil qilish
  const excelBuffer = XLSX.write(workbook, { 
    bookType: 'xlsx', 
    type: 'array' 
  });

  // 3. Uint8Array orqali 100% haqiqiy OpenXML (ZIP) binar Blob yaratish
  const byteArray = new Uint8Array(excelBuffer);
  const blob = new Blob([byteArray], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });

  // 4. Brauzerda avtomatik yuklab olishni ishga tushirish
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.xlsx`;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
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
