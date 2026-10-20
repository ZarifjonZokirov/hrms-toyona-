const fs = require('fs');
let code = fs.readFileSync('src/components/BranchGeozones.tsx', 'utf8');

const replacement = `
      // Vercel uchun LocalStorage-ga saqlash
      let saved = [];
      try {
        saved = JSON.parse(localStorage.getItem('toyonasavdo_branch_geozones') || '[]');
      } catch(e) {}
      
      const newGeozone = {
        ...editingGeozone,
        id: editingGeozone.id || \`branch-\${Date.now()}\`,
        updatedAt: new Date().toISOString()
      };
      
      const index = saved.findIndex(b => b.id === newGeozone.id);
      if (index >= 0) saved[index] = newGeozone;
      else saved.push(newGeozone);
      
      localStorage.setItem('toyonasavdo_branch_geozones', JSON.stringify(saved));
      setGeozones(saved);
      setIsModalOpen(false);
      
      try {
        // Eski API call (Vercel'da ishlamaydi, shuning uchun olib tashlaymiz)
        // await fetch('/api/branch-geozones', {...});
      } catch (err) {}
`;

code = code.replace(/await fetch\('\/api\/branch-geozones', \{[\s\S]*?\}\);/g, replacement.trim());
fs.writeFileSync('src/components/BranchGeozones.tsx', code);
