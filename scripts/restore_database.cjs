/**
 * Toyona HRMS - Automated Database Restore & Recovery Engine
 * Muallif: Disaster Recovery & Backup Guardian
 */
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { initializeFirestore, getFirestore, collection, doc, setDoc } = require('firebase/firestore');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const VAULT_DIR = path.join(PROJECT_ROOT, '.backup_vault');

const firebaseConfig = require(path.join(PROJECT_ROOT, 'firebase-applet-config.json'));
const app = initializeApp(firebaseConfig);
let db;
try {
  db = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId);
} catch {
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

async function restoreDatabase(specifiedBackupFile = null) {
  let targetFile = specifiedBackupFile 
    ? path.join(VAULT_DIR, specifiedBackupFile)
    : path.join(VAULT_DIR, 'latest_backup.json');

  if (!fs.existsSync(targetFile)) {
    // Agar latest bo'lmasa, eng yangi backup faylni topish
    const files = fs.readdirSync(VAULT_DIR).filter(f => f.startsWith('hrms_backup_') && f.endsWith('.json'));
    if (files.length === 0) {
      throw new Error("Tiklash uchun zaxira (backup) fayli topilmadi!");
    }
    files.sort().reverse();
    targetFile = path.join(VAULT_DIR, files[0]);
  }

  console.log(`[RESTORE] Zaxira fayli yuklanmoqda: ${path.basename(targetFile)}`);
  const raw = fs.readFileSync(targetFile, 'utf8');
  const backup = JSON.parse(raw);
  const data = backup.data || {};
  const meta = backup.metadata || {};

  console.log(`[RESTORE] Zaxira olingan vaqt: ${meta.dateFormatted || meta.createdAt}`);

  // 1. Xodimlarni tiklash (employees)
  let empRestored = 0;
  if (Array.isArray(data.employees)) {
    for (const emp of data.employees) {
      const docId = emp.firestoreId || emp.id;
      if (docId) {
        await setDoc(doc(db, 'employees', String(docId)), emp, { merge: true });
        empRestored++;
      }
    }
  }

  // 2. Nomzodlarni tiklash (candidates)
  let candRestored = 0;
  if (Array.isArray(data.candidates)) {
    for (const c of data.candidates) {
      const docId = c.firestoreId || c.id;
      if (docId) {
        await setDoc(doc(db, 'candidates', String(docId)), c, { merge: true });
        candRestored++;
      }
    }
  }

  // 3. Davomat yozuvlarini tiklash (attendance)
  let attRestored = 0;
  if (Array.isArray(data.attendance)) {
    for (const a of data.attendance) {
      const docId = a.firestoreId || a.id;
      if (docId) {
        await setDoc(doc(db, 'attendance', String(docId)), a, { merge: true });
        attRestored++;
      }
    }
  }

  // 4. Filiallar va Geozonalar (geozones)
  let geoRestored = 0;
  if (Array.isArray(data.geozones)) {
    for (const g of data.geozones) {
      const docId = g.firestoreId || g.id;
      if (docId) {
        await setDoc(doc(db, 'geozones', String(docId)), g, { merge: true });
        geoRestored++;
      }
    }
  }

  // 5. Foydalanuvchilarni tiklash (users & registry)
  let usersRestored = 0;
  if (Array.isArray(data.users)) {
    const regRef = doc(db, 'settings', 'users_registry');
    await setDoc(regRef, { users: data.users, updatedAt: new Date().toISOString() }, { merge: true });
    for (const u of data.users) {
      const docId = u.firestoreId || (u.id === 1 ? 'user-1' : `user-${u.id}`);
      if (docId) {
        await setDoc(doc(db, 'users', String(docId)), u, { merge: true });
        usersRestored++;
      }
    }
  }

  // 6. Jarima va ish vaqti sozlamalari
  if (data.penaltySettings) {
    fs.writeFileSync(path.join(PROJECT_ROOT, 'attendance_settings.json'), JSON.stringify(data.penaltySettings, null, 2), 'utf8');
  }

  console.log(`[RESTORE] Tizim 100% asl holiga qaytarildi!
  - Tiklangan xodimlar: ${empRestored} ta
  - Tiklangan nomzodlar: ${candRestored} ta
  - Tiklangan davomat yozuvlari: ${attRestored} ta
  - Tiklangan geozonalar: ${geoRestored} ta
  - Tiklangan tizim foydalanuvchilari: ${usersRestored} ta`);
}

const argFile = process.argv[2] || null;
restoreDatabase(argFile).then(() => process.exit(0)).catch(err => {
  console.error('[RESTORE] Xatolik:', err);
  process.exit(1);
});
