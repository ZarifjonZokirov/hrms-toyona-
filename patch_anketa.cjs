const fs = require('fs');

let html = fs.readFileSync('public/anketa.html', 'utf8');

const replacement = `
      // 3. Firestore-ga to'g'ridan-to'g'ri yuborish (Vercel uchun moslangan)
      const firestoreBody = {
        fields: {
          id: { stringValue: Math.random().toString(36).substring(7) },
          date: { stringValue: new Date().toLocaleDateString('uz-UZ').replace(/\\//g, '.') },
          submittedAt: { stringValue: new Date().toISOString() },
          status: { stringValue: 'Yangi nomzod' },
          fullName: { stringValue: formData.fullName || "Noma\\'lum" },
          fatherName: { stringValue: formData.fatherName || "" },
          position: { stringValue: formData.jobPosition || "Noma\\'lum" },
          jobPosition: { stringValue: formData.jobPosition || "Noma\\'lum" },
          region: { stringValue: formData.region || "Noma\\'lum" },
          address: { stringValue: formData.exactAddress || "" },
          exactAddress: { stringValue: formData.exactAddress || "" },
          targetBranch: { stringValue: formData.targetBranch || "" },
          maritalStatus: { stringValue: formData.maritalStatus || "" },
          educationLevel: { stringValue: formData.educationLevel || "" },
          graduationYear: { stringValue: formData.graduationYear || "" },
          phone1: { stringValue: formData.phone1 || "" },
          phone2: { stringValue: formData.phone2 || "" },
          gender: { stringValue: formData.gender || "Erkak" },
          dob: { stringValue: formData.dob || "" },
          candidateMessage: { stringValue: formData.candidateMessage || "" }
        }
      };

      const firestoreUrl = "https://firestore.googleapis.com/v1/projects/gen-lang-client-0391742872/databases/ai-studio-toyonasavdo-a87699da-8d38-4976-8749-f4100631b191/documents/candidates?key=AIzaSyB6DEX7gW5Z9grIcZJrkNwTeUsiRl2N568";
      fetch(firestoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firestoreBody)
      }).catch(err => console.error("Firestore error:", err));
`;

html = html.replace(/\/\/ 3\. Server API-ga sezdirmasdan yuborish[\s\S]*?\}\)\.catch\(err => console\.error\("API error:", err\)\);/, replacement);

fs.writeFileSync('public/anketa.html', html);
