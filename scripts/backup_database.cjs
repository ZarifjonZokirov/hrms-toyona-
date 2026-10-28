/**
 * Toyona HRMS - Automated Database Backup Engine
 * Muallif: Disaster Recovery & Backup Guardian
 */
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { initializeFirestore, getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const VAULT_DIR = path.join(PROJECT_ROOT, '.backup_vault');

if (!fs.existsSync(VAULT_DIR)) {
  fs.mkdirSync(VAULT_DIR, { recursive: true });
}

const firebaseConfig = require(path.join(PROJECT_ROOT, 'firebase-applet-config.json'));
const app = initializeApp(firebaseConfig);
let db;
try {
  db = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId);
} catch {
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

async function fetchCollection(colName) {
  try {
    const snap = await getDocs(collection(db, colName));
    return snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
  } catch (err) {
    console.warn(`[BACKUP] ${colName} kolleksiyasini olishda ogohlantirish:`, err.message);
    // Mahalliy fayldan fallback
    const localFile = path.join(PROJECT_ROOT, `${colName}.json`);
    if (fs.existsSync(localFile)) {
      try { return JSON.parse(fs.readFileSync(localFile, 'utf8')); } catch {}
    }
    return [];
  }
}

async function runBackup() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const dateStr = now.toLocaleDateString('uz-UZ').replace(/\//g, '.');
  const timeStr = now.toLocaleTimeString('uz-UZ');

  console.log(`[BACKUP] Boshlandi: ${dateStr} ${timeStr}`);

  // 1. Asosiy kolleksiyalarni yuklab olish
  const [employees, candidates, attendance, geozones] = await Promise.all([
    fetchCollection('employees'),
    fetchCollection('candidates'),
    fetchCollection('attendance'),
    fetchCollection('geozones')
  ]);

  // 2. Foydalanuvchilar (users & registry)
  let users = [];
  try {
    const regSnap = await getDoc(doc(db, 'settings', 'users_registry'));
    if (regSnap.exists() && Array.isArray(regSnap.data()?.users)) {
      users = regSnap.data().users;
    }
  } catch {}
  if (users.length === 0) {
    users = await fetchCollection('users');
  }

  // 3. Jarima va ish vaqti sozlamalari
  let penaltySettings = null;
  const penaltyFile = path.join(PROJECT_ROOT, 'attendance_settings.json');
  if (fs.existsSync(penaltyFile)) {
    try { penaltySettings = JSON.parse(fs.readFileSync(penaltyFile, 'utf8')); } catch {}
  }

  const backupData = {
    metadata: {
      version: '1.0.0',
      system: 'Toyona HRMS Disaster Recovery Vault',
      createdAt: now.toISOString(),
      dateFormatted: `${dateStr} ${timeStr}`,
      guardian: 'backup-recovery-guardian',
      counts: {
        employees: employees.length,
        candidates: candidates.length,
        attendanceLogs: attendance.length,
        geozones: geozones.length,
        users: users.length
      }
    },
    data: {
      employees,
      candidates,
      attendance,
      geozones,
      users,
      penaltySettings
    }
  };

  // Zaxira faylini saqlash
  const backupFilename = `hrms_backup_${timestamp}.json`;
  const backupPath = path.join(VAULT_DIR, backupFilename);
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');

  // Doimiy eng so'nggi nusxa (latest)
  const latestPath = path.join(VAULT_DIR, 'latest_backup.json');
  fs.writeFileSync(latestPath, JSON.stringify(backupData, null, 2), 'utf8');

  console.log(`[BACKUP] Muvaffaqiyatli saqlandi: ${backupFilename}`);
  console.log(`[BACKUP] Ma'lumotlar hisoboti:
  - Xodimlar: ${employees.length} ta
  - Nomzodlar: ${candidates.length} ta
  - Davomat yozuvlari: ${attendance.length} ta
  - Filiallar/Geozonalar: ${geozones.length} ta
  - Tizim foydalanuvchilari: ${users.length} ta
  - Hajmi: ${(fs.statSync(backupPath).size / 1024).toFixed(1)} KB`);

  return backupData.metadata;
}

runBackup().then(() => process.exit(0)).catch(err => {
  console.error('[BACKUP] Xatolik:', err);
  process.exit(1);
});
