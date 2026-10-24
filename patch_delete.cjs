const fs = require('fs');

let code = fs.readFileSync('src/components/Candidates.tsx', 'utf8');

const replacement = `
        try {
          const deleteUrl = \`https://firestore.googleapis.com/v1/projects/gen-lang-client-0391742872/databases/ai-studio-toyonasavdo-a87699da-8d38-4976-8749-f4100631b191/documents/candidates/\${targetId}?key=AIzaSyB6DEX7gW5Z9grIcZJrkNwTeUsiRl2N568\`;
          await fetch(deleteUrl, { method: 'DELETE' });
        } catch (e) {
          console.warn("Delete firestore candidate error:", e);
        }
`;

code = code.replace(/await fetch\(`\/api\/candidates\/\$\{targetId\}`\, \{ method\: 'DELETE' \}\);/, replacement.trim());

fs.writeFileSync('src/components/Candidates.tsx', code);
