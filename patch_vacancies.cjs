const fs = require('fs');

let code = fs.readFileSync('src/components/Vacancies.tsx', 'utf8');

const replacement = `
      const firestoreUrl = "https://firestore.googleapis.com/v1/projects/gen-lang-client-0391742872/databases/ai-studio-toyonasavdo-a87699da-8d38-4976-8749-f4100631b191/documents:runQuery?key=AIzaSyB6DEX7gW5Z9grIcZJrkNwTeUsiRl2N568";
      const res = await fetch(firestoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'candidates' }] } })
      });
      if (res.ok) {
        const fData = await res.json();
        if (Array.isArray(fData)) {
          const apiList = fData
            .filter((item: any) => item.document && item.document.fields)
            .map((item: any) => {
              const f = item.document.fields;
              const docId = item.document.name.split('/').pop() || '';
              return {
                id: docId,
                fullName: f.fullName?.stringValue || f.fio?.stringValue || "Noma'lum",
                position: f.position?.stringValue || f.jobPosition?.stringValue || "Noma'lum",
                region: f.region?.stringValue || "Noma'lum",
                status: f.status?.stringValue || 'Yangi nomzod'
              };
            });
            
          const map = new Map<string, any>();
          [...localList, ...apiList].forEach((c: any) => {
            const uniqueKey = c.id || c.fullName;
            if (!map.has(uniqueKey)) {
              map.set(uniqueKey, c);
            }
          });
          setCandidates(Array.from(map.values()));
          return;
        }
      }
`;

// we need to replace:
// const res = await fetch('/api/candidates');
// if (res.ok) {
//   apiList = await res.json();
// }

code = code.replace(/const res = await fetch\('\/api\/candidates'\);\s*if \(res\.ok\) \{\s*apiList = await res\.json\(\);\s*\}/, replacement.trim());

fs.writeFileSync('src/components/Vacancies.tsx', code);
