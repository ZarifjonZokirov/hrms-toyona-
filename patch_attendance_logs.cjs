const fs = require('fs');
let code = fs.readFileSync('src/components/AttendanceJournal.tsx', 'utf8');

const replacement = `
      // Vercel uchun LocalStorage-dan olish
      try {
        const savedLogs = JSON.parse(localStorage.getItem('toyonasavdo_attendance_logs') || '[]');
        setLogs(savedLogs);
      } catch(e) {}
`;

code = code.replace(/const res = await fetch\('\/api\/attendance\/logs'\);[\s\S]*?\}\);/g, replacement.trim());
fs.writeFileSync('src/components/AttendanceJournal.tsx', code);
