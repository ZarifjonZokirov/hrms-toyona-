const fs = require('fs');

let code = fs.readFileSync('src/components/Candidates.tsx', 'utf8');

const replacement = `
    let apiList: Candidate[] = [];
    try {
      const firestoreUrl = "https://firestore.googleapis.com/v1/projects/gen-lang-client-0391742872/databases/ai-studio-toyonasavdo-a87699da-8d38-4976-8749-f4100631b191/documents:runQuery?key=AIzaSyB6DEX7gW5Z9grIcZJrkNwTeUsiRl2N568";
      const res = await fetch(firestoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'candidates' }] } })
      });
      if (res.ok) {
        const fData = await res.json();
        if (Array.isArray(fData)) {
          apiList = fData
            .filter((item: any) => item.document && item.document.fields)
            .map((item: any) => {
              const f = item.document.fields;
              const docId = item.document.name.split('/').pop() || '';
              return {
                id: docId,
                fullName: f.fullName?.stringValue || f.fio?.stringValue || "Noma'lum",
                position: f.position?.stringValue || f.jobPosition?.stringValue || "Noma'lum",
                region: f.region?.stringValue || "Noma'lum",
                status: f.status?.stringValue || 'Yangi nomzod',
                date: f.date?.stringValue || new Date().toLocaleDateString('uz-UZ'),
                phone1: f.phone1?.stringValue || f.phone?.stringValue || '',
                phone2: f.phone2?.stringValue || '',
                targetBranch: f.targetBranch?.stringValue || '',
                fatherName: f.fatherName?.stringValue || '',
                exactAddress: f.exactAddress?.stringValue || '',
                maritalStatus: f.maritalStatus?.stringValue || '',
                educationLevel: f.educationLevel?.stringValue || '',
                graduationYear: f.graduationYear?.stringValue || '',
                gender: f.gender?.stringValue || '',
                dob: f.dob?.stringValue || '',
                candidateMessage: f.candidateMessage?.stringValue || '',
                isViewed: false
              };
            });
        }
      }
    } catch (err) {
      console.warn("Fetch candidates notice:", err);
    }
`;

code = code.replace(/let apiList: Candidate\[\] = \[\];[\s\S]*?console\.warn\("Fetch candidates notice:", err\);\n\s*\}/, replacement.trim());

fs.writeFileSync('src/components/Candidates.tsx', code);
