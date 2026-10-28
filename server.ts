import crypto from "crypto";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import fs from "fs";
import os from "os";

// Load firebase config (embedded for Vercel Serverless + file fallback)
const DEFAULT_FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0391742872",
  appId: "1:811535018031:web:b3dc918af92284f02abeda",
  apiKey: "AIzaSyB6DEX7gW5Z9grIcZJrkNwTeUsiRl2N568",
  authDomain: "gen-lang-client-0391742872.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-toyonasavdo-a87699da-8d38-4976-8749-f4100631b191",
  storageBucket: "gen-lang-client-0391742872.firebasestorage.app",
  messagingSenderId: "811535018031",
};

let firebaseConfig: any = DEFAULT_FIREBASE_CONFIG;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = { ...DEFAULT_FIREBASE_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  }
} catch (e) {
  firebaseConfig = DEFAULT_FIREBASE_CONFIG;
}

async function getFirestoreCandidates(): Promise<any[]> {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return [];
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s timeout prevents 502 Bad Gateway

  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
    const response = await fetch(firestoreUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'candidates' }]
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) return [];
    const fData = await response.json();
    if (!Array.isArray(fData)) return [];
    return fData
      .filter((item: any) => item.document && item.document.fields)
      .map((item: any) => {
        const f = item.document.fields;
        const docId = item.document.name.split('/').pop() || '';
        return {
          id: docId,
          fullName: f.fullName?.stringValue || f.fio?.stringValue || 'Noma\'lum',
          fatherName: f.fatherName?.stringValue || f.middleName?.stringValue || f.otasiningIsmi?.stringValue || '',
          jobPosition: f.jobPosition?.stringValue || f.position?.stringValue || f.lavozim?.stringValue || 'Noma\'lum',
          position: f.jobPosition?.stringValue || f.position?.stringValue || f.lavozim?.stringValue || 'Noma\'lum',
          targetBranch: f.targetBranch?.stringValue || f.branch?.stringValue || f.filial?.stringValue || '',
          region: f.region?.stringValue || f.viloyat?.stringValue || 'Noma\'lum',
          address: f.exactAddress?.stringValue || f.address?.stringValue || f.manzil?.stringValue || '',
          exactAddress: f.exactAddress?.stringValue || f.address?.stringValue || f.manzil?.stringValue || '',
          phone1: f.phone1?.stringValue || f.phone?.stringValue || f.telefon1?.stringValue || '',
          phone2: f.phone2?.stringValue || f.telefon2?.stringValue || '',
          gender: f.gender?.stringValue || f.jinsi?.stringValue || 'Erkak',
          dob: f.dob?.stringValue || f.birthYear?.stringValue || f.tugilganYili?.stringValue || '',
          maritalStatus: f.maritalStatus?.stringValue || f.oilaviyHolati?.stringValue || f.turmushHolati?.stringValue || '',
          educationLevel: f.educationLevel?.stringValue || f.degree?.stringValue || f.education?.stringValue || f.malumoti?.stringValue || '',
          graduationYear: f.graduationYear?.stringValue || f.gradYear?.stringValue || f.tugatganYili?.stringValue || '',
          pastExperience: f.pastExperience?.stringValue || f.candidateMessage?.stringValue || f.tajriba?.stringValue || '',
          candidateMessage: f.pastExperience?.stringValue || f.candidateMessage?.stringValue || f.tajriba?.stringValue || '',
          status: f.status?.stringValue || 'Yangi nomzod',
          submittedAt: f.submittedAt?.stringValue || f.date?.stringValue || new Date().toISOString(),
          date: f.date?.stringValue || new Date().toLocaleDateString('uz-UZ'),
          photoUrl: f.photoUrl?.stringValue || f.photo_url?.stringValue || f.avatarUrl?.stringValue || f.photo?.stringValue || '',
          passportFrontUrl: f.passportFrontUrl?.stringValue || f.passport_front_url?.stringValue || f.passport_front?.stringValue || f.passportFront?.stringValue || f.passFront?.stringValue || f.passportImage?.stringValue || f.passport_image?.stringValue || f.passportPhoto?.stringValue || f.passport1?.stringValue || '',
          passportBackUrl: f.passportBackUrl?.stringValue || f.passport_back_url?.stringValue || f.passport_back?.stringValue || f.passportBack?.stringValue || f.passBack?.stringValue || f.passport2?.stringValue || ''
        };
      });
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn("Server Firestore candidates fetch notice:", err?.name === 'AbortError' ? 'Timeout (4.5s)' : err?.message);
    return [];
  }
}

async function saveFirestoreCandidate(candidate: any): Promise<boolean> {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    console.warn("Firestore config missing in server.ts");
    return false;
  }
  const docId = candidate.id || `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const writeUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/candidates/${docId}?key=${firebaseConfig.apiKey}`;

  const fields: Record<string, any> = {
    id: { stringValue: String(docId) },
    fullName: { stringValue: String(candidate.fullName || candidate.fio || 'Noma\'lum') },
    fatherName: { stringValue: String(candidate.fatherName || candidate.middleName || '') },
    jobPosition: { stringValue: String(candidate.jobPosition || candidate.position || 'Noma\'lum') },
    position: { stringValue: String(candidate.jobPosition || candidate.position || 'Noma\'lum') },
    targetBranch: { stringValue: String(candidate.targetBranch || candidate.branch || candidate.filial || '') },
    region: { stringValue: String(candidate.region || candidate.viloyat || 'Noma\'lum') },
    address: { stringValue: String(candidate.address || candidate.exactAddress || '') },
    exactAddress: { stringValue: String(candidate.exactAddress || candidate.address || '') },
    phone1: { stringValue: String(candidate.phone1 || candidate.phone || '') },
    phone2: { stringValue: String(candidate.phone2 || '') },
    gender: { stringValue: String(candidate.gender || 'Erkak') },
    dob: { stringValue: String(candidate.dob || candidate.birthYear || '') },
    maritalStatus: { stringValue: String(candidate.maritalStatus || '') },
    educationLevel: { stringValue: String(candidate.educationLevel || candidate.education || '') },
    graduationYear: { stringValue: String(candidate.graduationYear || '') },
    pastExperience: { stringValue: String(candidate.pastExperience || candidate.candidateMessage || candidate.tajriba || '') },
    candidateMessage: { stringValue: String(candidate.pastExperience || candidate.candidateMessage || candidate.tajriba || '') },
    status: { stringValue: String(candidate.status || 'Yangi nomzod') },
    submittedAt: { stringValue: String(candidate.submittedAt || new Date().toISOString()) },
    date: { stringValue: String(candidate.date || new Date().toLocaleDateString('uz-UZ')) }
  };

  if (candidate.photoUrl) fields.photoUrl = { stringValue: String(candidate.photoUrl) };
  if (candidate.passportFrontUrl) fields.passportFrontUrl = { stringValue: String(candidate.passportFrontUrl) };
  if (candidate.passportBackUrl) fields.passportBackUrl = { stringValue: String(candidate.passportBackUrl) };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s max timeout

  try {
    const res = await fetch(writeUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errText = await res.text();
      console.warn("Firestore candidate write warning (status " + res.status + "):", errText.slice(0, 200));
      return false;
    }
    console.log("Candidate successfully saved into Firestore, ID:", docId);
    return true;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn("Firestore save candidate network/timeout notice:", err?.name === 'AbortError' ? 'Timeout (6s)' : err?.message);
    return false;
  }
}

async function deleteFirestoreCandidate(docId: string): Promise<void> {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const deleteUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/candidates/${docId}?key=${firebaseConfig.apiKey}`;
    await fetch(deleteUrl, { method: 'DELETE', signal: controller.signal });
    clearTimeout(timeoutId);
  } catch (e: any) {
    clearTimeout(timeoutId);
    console.warn("Server Firestore candidate delete notice:", e?.message);
  }
}

// Real candidates storage synced with Firestore
let candidates: any[] = [];

// Branch Geozones for Attendance Check-in with Yandex Maps
interface BranchGeozone {
  id: string;
  name: string;
  description?: string;
  lat: number;
  lon: number;
  radius: number; // meters
  address: string;
  updatedAt: string;
}

let branchGeozones: BranchGeozone[] = [
  {
    id: 'branch-1',
    name: 'Turkiston filiali',
    lat: 40.5283,
    lon: 70.9425,
    radius: 270,
    address: 'Qo\'qon shahar, Turkiston ko\'chasi, 45-uy',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'branch-2',
    name: 'Navoiy filiali',
    lat: 40.5312,
    lon: 70.9388,
    radius: 500,
    address: 'Qo\'qon shahar, A.Navoiy shoh ko\'chasi, 12-uy',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'branch-3',
    name: 'Istiqlol (Gorod) filiali',
    lat: 40.5345,
    lon: 70.9450,
    radius: 100,
    address: 'Qo\'qon shahar, Istiqlol ko\'chasi, 88-uy',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'branch-4',
    name: 'Mingtut filiali',
    lat: 40.5200,
    lon: 70.9350,
    radius: 150,
    address: 'Qo\'qon shahar, Mingtut mavzesi, 5-savdo markazi',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'branch-5',
    name: 'Yakkatut filiali',
    lat: 40.5400,
    lon: 70.9500,
    radius: 100,
    address: 'Qo\'qon shahar, Yakkatut ko\'chasi, 10-uy',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'branch-6',
    name: 'Bosh ofis',
    lat: 40.55441164458834,
    lon: 71.10088818840296,
    radius: 500,
    address: 'Qo\'qon shahar, Markaziy bino, Bosh ofis',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'branch-7',
    name: 'Pop filiali',
    lat: 40.8750,
    lon: 71.1070,
    radius: 120,
    address: 'Pop shahar, Markaziy ko\'cha, 18-uy',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'branch-8',
    name: 'Furqat filiali',
    lat: 40.5300,
    lon: 70.7600,
    radius: 100,
    address: 'Furqat tumani, Navbahor shaharchasi',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'branch-9',
    name: 'Buvayda filiali',
    lat: 40.5800,
    lon: 71.0500,
    radius: 100,
    address: 'Buvayda tumani, Ibrat MFY',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'branch-10',
    name: 'Yangiqo\'rg\'on (Buvayda) filiali',
    lat: 40.5900,
    lon: 71.0700,
    radius: 100,
    address: 'Buvayda, Yangiqo\'rg\'on markazi',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'branch-11',
    name: 'Yaypan filiali',
    lat: 40.3700,
    lon: 70.8150,
    radius: 120,
    address: 'O\'zbekiston tumani, Yaypan shahar, Mustaqillik shoh ko\'chasi',
    updatedAt: new Date().toISOString()
  }
];

const LOCAL_GEOZONES_FILE = path.join(process.cwd(), 'branch_geozones.json');
const TMP_GEOZONES_FILE = path.join(os.tmpdir(), 'toyonasavdo_geozones.json');

function saveLocalGeozones(zones: BranchGeozone[]) {
  const data = JSON.stringify(zones);
  try { fs.writeFileSync(LOCAL_GEOZONES_FILE, data, 'utf8'); } catch {}
  try { fs.writeFileSync(TMP_GEOZONES_FILE, data, 'utf8'); } catch {}
}

function loadLocalGeozones(): BranchGeozone[] | null {
  for (const p of [LOCAL_GEOZONES_FILE, TMP_GEOZONES_FILE]) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return null;
}

const persistedGeozones = loadLocalGeozones();
if (persistedGeozones && persistedGeozones.length > 0) {
  const gzMap = new Map<string, BranchGeozone>();
  branchGeozones.forEach(b => gzMap.set(b.id, b));
  persistedGeozones.forEach(b => {
    if (b && b.id) gzMap.set(b.id, b);
  });
  branchGeozones = Array.from(gzMap.values());
}

// Non-destructive Firestore document reader via PATCH no-op (works even when Free Tier Read Quota is 429)
const firestoreDocFallbackCache = new Map<string, { fields: any | null; expiresAt: number }>();
let firestoreReadQuotaExhaustedUntil = 0;

async function readFirestoreDocViaPatch(collectionName: string, docId: string, forceRefresh = false): Promise<any | null> {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return null;
  }
  const cacheKey = `${collectionName}/${docId}`;
  const now = Date.now();
  if (!forceRefresh) {
    const cached = firestoreDocFallbackCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.fields;
    }
  }

  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/${collectionName}/${encodeURIComponent(docId)}?updateMask.fieldPaths=_ping&currentDocument.exists=true&key=${firebaseConfig.apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {} }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const docData = await res.json();
      const fields = docData?.fields || null;
      firestoreDocFallbackCache.set(cacheKey, { fields, expiresAt: now + 5 * 60 * 1000 });
      return fields;
    } else if (res.status === 404) {
      firestoreDocFallbackCache.set(cacheKey, { fields: null, expiresAt: now + 2 * 60 * 1000 });
      return null;
    }
  } catch {
    clearTimeout(timeoutId);
  }
  return null;
}

// Persistent attendance check-in logs (disk + memory + Firestore sync)
const LOCAL_LOGS_FILE = path.join(process.cwd(), 'attendance_logs.json');
const TMP_LOGS_FILE = path.join(os.tmpdir(), 'toyonasavdo_attendance_logs.json');

function saveLocalAttendance(logs: any[]) {
  const data = JSON.stringify(logs.slice(0, 1000));
  try {
    fs.writeFileSync(LOCAL_LOGS_FILE, data, 'utf8');
  } catch {}
  try {
    fs.writeFileSync(TMP_LOGS_FILE, data, 'utf8');
  } catch {}
}

function loadLocalAttendance(): any[] {
  for (const p of [LOCAL_LOGS_FILE, TMP_LOGS_FILE]) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return [];
}

let attendanceLogs: any[] = loadLocalAttendance();

// Penalty and Work Schedule Configuration
export interface PenaltySettings {
  workStartTime: string; // e.g. "09:00"
  workEndTime: string; // e.g. "18:00"
  gracePeriodMinutes: number; // e.g. 15
  penaltyType: 'minute' | 'hour'; // daqiqasiga yoki soatiga
  penaltyRate: number; // so'm miqdori (masalan: daqiqasiga 1000 so'm yoki soatiga 30000 so'm)
  restDays: number[]; // 0: Yakshanba, 1: Dushanba, ..., 6: Shanba (default: [0] - faqat Yakshanba)
  customHolidays: string[]; // "YYYY-MM-DD" maxsus bayram / dam olish kunlari
  updatedAt: string;
}

let penaltySettings: PenaltySettings = {
  workStartTime: "09:00",
  workEndTime: "18:00",
  gracePeriodMinutes: 15,
  penaltyType: "minute",
  penaltyRate: 1000, // 1 daqiqasiga 1000 so'm
  restDays: [0], // 0: Yakshanba dam olish kuni
  customHolidays: [],
  updatedAt: new Date().toISOString()
};

function calculatePenaltyAmount(delayMinutes: number, settings: PenaltySettings = penaltySettings): number {
  if (delayMinutes <= 0) return 0;
  if (settings.penaltyType === 'hour') {
    const hours = Math.ceil(delayMinutes / 60);
    return hours * (settings.penaltyRate || 30000);
  }
  return delayMinutes * (settings.penaltyRate || 1000);
}

export function formatDelayText(delayMinutes: number): string {
  const d = Math.max(0, Number(delayMinutes) || 0);
  if (d <= 0) return "Kechikish yo'q";
  if (d < 60) return `${d} daqiqa`;
  const hours = Math.floor(d / 60);
  const remainingMins = d % 60;
  if (remainingMins === 0) return `${hours} soat`;
  return `${hours} soat ${remainingMins} daqiqa`;
}

// Default Employees with credentials for instant offline & high-speed access
interface ServerEmployee {
  id: string;
  staffId: string;
  fullName: string;
  position: string;
  department: string;
  branch: string;
  phone: string;
  email: string;
  photoUrl: string;
  avatarUrl?: string;
  rasmUrl?: string;
  username: string;
  password?: string;
  status: string;
  isAccountActive?: boolean;
  accountCreatedAt?: string;
  salary?: string;
  hireDate?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
}

const LOCAL_EMPLOYEES_FILE = path.join(process.cwd(), 'employees_cache.json');
const TMP_EMPLOYEES_FILE = path.join(os.tmpdir(), 'toyonasavdo_employees_cache.json');

function saveLocalEmployees(list: ServerEmployee[]) {
  const data = JSON.stringify(list);
  try { fs.writeFileSync(LOCAL_EMPLOYEES_FILE, data, 'utf8'); } catch {}
  try { fs.writeFileSync(TMP_EMPLOYEES_FILE, data, 'utf8'); } catch {}
}

function loadLocalEmployees(): ServerEmployee[] {
  for (const p of [LOCAL_EMPLOYEES_FILE, TMP_EMPLOYEES_FILE]) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return [];
}

const defaultEmployees: ServerEmployee[] = [
  {
    id: 'emp-101',
    staffId: 'TS-0001',
    fullName: 'Zarifjon Zokirov',
    position: 'Bosh Direktor (CEO)',
    department: 'Ijroiya Boshqaruvi',
    branch: 'Bosh ofis',
    phone: '+998 90 123 45 67',
    email: 'zarifjon@toyona.uz',
    photoUrl: 'https://hrms-toyona.vercel.app/zarifjon.jpg',
    avatarUrl: 'https://hrms-toyona.vercel.app/zarifjon.jpg',
    username: '',
    password: '', // Login va parol faqat Firebase'dan olinadi, kodda saqlanmaydi
    status: 'active',
    isAccountActive: true,
    accountCreatedAt: '2026-10-12',
    salary: '25,000,000 UZS',
    hireDate: '2020-03-15',
    birthDate: '1990-05-12',
    gender: 'Erkak',
    address: 'Toshkent sh., Yunusobod t.'
  }
];

// O'chirilgan xodimlar ro'yxati (hech qachon qayta tirilib chiqmaydi)
const deletedEmployeeIds = new Set<string>();

// In-memory employee photo overrides (for immediate reflection across API and mini app)
const employeePhotoOverrides: Record<string, string> = {};

// Helper: Save employee photo to Firestore
async function saveFirestoreEmployeePhoto(employeeId: string, photoUrl: string): Promise<boolean> {
  employeePhotoOverrides[employeeId] = photoUrl;
  const defEmp = defaultEmployees.find(e => e.id === employeeId);
  if (defEmp) {
    defEmp.photoUrl = photoUrl;
    (defEmp as any).avatarUrl = photoUrl;
  }
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return true;
  }
  const writeUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/employees/${employeeId}?updateMask.fieldPaths=avatarUrl&updateMask.fieldPaths=photoUrl&updateMask.fieldPaths=rasmUrl&key=${firebaseConfig.apiKey}`;
  const fields = {
    avatarUrl: { stringValue: String(photoUrl) },
    photoUrl: { stringValue: String(photoUrl) },
    rasmUrl: { stringValue: String(photoUrl) }
  };
  try {
    let res = await fetch(writeUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const upsertUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/employees/${employeeId}?key=${firebaseConfig.apiKey}`;
      res = await fetch(upsertUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
    }
    if (res.ok) {
      try {
        const saved = await res.json();
        if (saved?.fields) {
          firestoreDocFallbackCache.set(`employees/${employeeId}`, {
            fields: saved.fields,
            expiresAt: Date.now() + 10 * 60 * 1000
          });
        }
      } catch {}
    }
    return res.ok;
  } catch (e) {
    return false;
  }
}

// ------------------- PHOTO UPDATE REQUESTS (Xodim rasm yangilash so'rovlari) -------------------
interface PhotoUpdateRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  position: string;
  currentPhotoUrl: string;
  newPhotoUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

const photoRequestsMap = new Map<string, PhotoUpdateRequest>();

async function getFirestorePhotoRequests(): Promise<PhotoUpdateRequest[]> {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return Array.from(photoRequestsMap.values());
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
    const response = await fetch(firestoreUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'photo_requests' }]
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) return Array.from(photoRequestsMap.values());
    const fData = await response.json();
    if (!Array.isArray(fData)) return Array.from(photoRequestsMap.values());

    const result: PhotoUpdateRequest[] = [];
    fData.forEach((item: any) => {
      if (!item.document || !item.document.fields) return;
      const f = item.document.fields;
      const docId = item.document.name.split('/').pop() || '';
      const req: PhotoUpdateRequest = {
        id: docId,
        employeeId: f.employeeId?.stringValue || '',
        employeeName: f.employeeName?.stringValue || 'Noma\'lum',
        branch: f.branch?.stringValue || '',
        position: f.position?.stringValue || '',
        currentPhotoUrl: f.currentPhotoUrl?.stringValue || '',
        newPhotoUrl: f.newPhotoUrl?.stringValue || '',
        status: (f.status?.stringValue as any) || 'pending',
        submittedAt: f.submittedAt?.stringValue || new Date().toISOString(),
        reviewedAt: f.reviewedAt?.stringValue,
        reviewedBy: f.reviewedBy?.stringValue,
        rejectionReason: f.rejectionReason?.stringValue
      };
      photoRequestsMap.set(req.id, req);
      result.push(req);
    });
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    return Array.from(photoRequestsMap.values());
  }
}

async function saveFirestorePhotoRequest(req: PhotoUpdateRequest): Promise<boolean> {
  photoRequestsMap.set(req.id, req);
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return true;
  }
  const writeUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/photo_requests/${req.id}?key=${firebaseConfig.apiKey}`;
  const fields: Record<string, any> = {
    id: { stringValue: String(req.id) },
    employeeId: { stringValue: String(req.employeeId) },
    employeeName: { stringValue: String(req.employeeName) },
    branch: { stringValue: String(req.branch || '') },
    position: { stringValue: String(req.position || '') },
    currentPhotoUrl: { stringValue: String(req.currentPhotoUrl || '') },
    newPhotoUrl: { stringValue: String(req.newPhotoUrl || '') },
    status: { stringValue: String(req.status || 'pending') },
    submittedAt: { stringValue: String(req.submittedAt || new Date().toISOString()) }
  };
  if (req.reviewedAt) fields.reviewedAt = { stringValue: String(req.reviewedAt) };
  if (req.reviewedBy) fields.reviewedBy = { stringValue: String(req.reviewedBy) };
  if (req.rejectionReason) fields.rejectionReason = { stringValue: String(req.rejectionReason) };

  try {
    const res = await fetch(writeUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

function applyFirestoreEmployeeFieldsToMap(map: Map<string, ServerEmployee>, docId: string, f: any) {
  if (!f || deletedEmployeeIds.has(docId)) return;
  const existing = map.get(docId) || {} as Partial<ServerEmployee>;
  const empName = f.fullName?.stringValue || existing.fullName || 'Xodim';
  const defaultUser = empName.toLowerCase().replace(/['`ʻ’\s]/g, '.');
  const preferredDataPhoto =
    (f.photoUrl?.stringValue?.startsWith('data:image/') ? f.photoUrl.stringValue : '') ||
    (f.rasmUrl?.stringValue?.startsWith('data:image/') ? f.rasmUrl.stringValue : '') ||
    (f.avatarUrl?.stringValue?.startsWith('data:image/') ? f.avatarUrl.stringValue : '');
  const resolvedPhoto =
    employeePhotoOverrides[docId] ||
    preferredDataPhoto ||
    f.avatarUrl?.stringValue ||
    f.photoUrl?.stringValue ||
    f.rasmUrl?.stringValue ||
    existing.photoUrl ||
    'https://hrms-toyona.vercel.app/zarifjon.jpg';

  map.set(docId, {
    id: docId,
    staffId: f.staffId?.stringValue || existing.staffId || 'TS-0001',
    fullName: empName,
    position: f.position?.stringValue || existing.position || 'Mutaxassis',
    department: f.department?.stringValue || existing.department || 'Savdo',
    branch: f.branch?.stringValue || existing.branch || 'Bosh ofis',
    phone: f.phone?.stringValue || existing.phone || '',
    email: f.email?.stringValue || existing.email || '',
    photoUrl: resolvedPhoto,
    avatarUrl: resolvedPhoto,
    rasmUrl: resolvedPhoto,
    username: f.username?.stringValue || existing.username || defaultUser,
    password: f.password?.stringValue || existing.password || 'Toyona#2026',
    status: f.status?.stringValue || existing.status || 'active',
    isAccountActive: f.isAccountActive?.booleanValue !== undefined ? f.isAccountActive.booleanValue : (existing.isAccountActive ?? true),
    accountCreatedAt: f.accountCreatedAt?.stringValue || existing.accountCreatedAt || '2026-10-12',
    salary: f.salary?.stringValue || existing.salary || '4,000,000 UZS',
    hireDate: f.hireDate?.stringValue || existing.hireDate || '2026-01-01',
    birthDate: f.birthDate?.stringValue || existing.birthDate || '',
    gender: f.gender?.stringValue || existing.gender || 'Erkak',
    address: f.address?.stringValue || existing.address || ''
  });
}

// Helper: Fetch all employees from Firestore or fallback, keeping distinct from admin users
async function getAllServerEmployees(): Promise<ServerEmployee[]> {
  const map = new Map<string, ServerEmployee>();
  defaultEmployees.forEach(e => {
    if (!deletedEmployeeIds.has(e.id)) {
      const customPhoto = employeePhotoOverrides[e.id];
      map.set(e.id, { 
        ...e, 
        photoUrl: customPhoto || e.photoUrl,
        avatarUrl: customPhoto || e.avatarUrl || e.photoUrl
      });
    }
  });
  const localSaved = loadLocalEmployees();
  localSaved.forEach(e => {
    if (e && e.id && !deletedEmployeeIds.has(e.id)) {
      const customPhoto = employeePhotoOverrides[e.id];
      map.set(e.id, {
        ...map.get(e.id),
        ...e,
        photoUrl: customPhoto || e.photoUrl || e.avatarUrl || 'https://hrms-toyona.vercel.app/zarifjon.jpg',
        avatarUrl: customPhoto || e.avatarUrl || e.photoUrl || 'https://hrms-toyona.vercel.app/zarifjon.jpg'
      });
    }
  });

  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return Array.from(map.values()).filter(e => !deletedEmployeeIds.has(e.id));
  }

  let empQuerySucceeded = false;
  if (Date.now() > firestoreReadQuotaExhaustedUntil) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
      const response = await fetch(firestoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: { from: [{ collectionId: 'employees' }] }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        firestoreReadQuotaExhaustedUntil = Date.now() + 60 * 1000;
      } else if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          data.filter((item: any) => item.document && item.document.fields).forEach((item: any) => {
            const f = item.document.fields;
            const docId = item.document.name.split('/').pop() || '';
            applyFirestoreEmployeeFieldsToMap(map, docId, f);
          });
          empQuerySucceeded = true;
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
    }
  }

  if (!empQuerySucceeded) {
    try {
      const candidateIds = Array.from(new Set(['emp-101', ...Array.from(map.keys())]));
      const results = await Promise.all(
        candidateIds.map(async (id) => ({
          id,
          fields: await readFirestoreDocViaPatch('employees', id)
        }))
      );
      for (const item of results) {
        if (item.fields) {
          applyFirestoreEmployeeFieldsToMap(map, item.id, item.fields);
        }
      }
    } catch {}
  }

  const finalResult = Array.from(map.values()).filter(e => !deletedEmployeeIds.has(e.id));
  saveLocalEmployees(finalResult);
  return finalResult;
}

// Helper: Normalize branch name for comparison
function normalizeBranchName(name?: string): string {
  if (!name) return '';
  return String(name).trim().toLowerCase().replace(/['`ʻ’]/g, "'");
}

// Helper: Smart match a branch geozone by ID, exact name, head-office synonyms, or stripped name
function findMatchingGeozone(
  allBranches: BranchGeozone[],
  branchName?: string,
  branchId?: string
): BranchGeozone {
  if (!allBranches.length) {
    return {
      id: 'branch-6',
      name: 'Bosh ofis',
      lat: 40.55441164458834,
      lon: 71.10088818840296,
      radius: 500,
      address: "Qo'qon shahar, Markaziy bino, Bosh ofis",
      updatedAt: new Date().toISOString()
    };
  }

  // 1. Exact ID match
  if (branchId) {
    const byId = allBranches.find(b => String(b.id).trim() === String(branchId).trim());
    if (byId) return byId;
  }

  const normInput = normalizeBranchName(branchName);
  if (!normInput) {
    return allBranches.find(b => b.id === 'branch-6') || allBranches[0];
  }

  // 2. Exact name match
  const exact = allBranches.find(b => normalizeBranchName(b.name) === normInput);
  if (exact) return exact;

  // 3. Head office synonyms ("bosh ofis", "bosh idora", "bosh bino", "markaziy ofis")
  const isHeadOffice =
    normInput.includes('bosh ofis') ||
    normInput.includes('bosh idora') ||
    normInput.includes('bosh bino') ||
    normInput.includes('markaziy ofis');
  if (isHeadOffice) {
    const headMatch = allBranches.find(
      b =>
        b.id === 'branch-6' ||
        normalizeBranchName(b.name).includes('bosh ofis') ||
        normalizeBranchName(b.name).includes('bosh idora')
    );
    if (headMatch) return headMatch;
  }

  // 4. Stripped name match (ignoring "filiali", "filial", parentheses)
  const strip = (s: string) =>
    s.replace(/\b(filiali|filial|shahar|shahri|tumani)\b/gi, '').replace(/[()]/g, '').trim();
  const strippedInput = strip(normInput);
  if (strippedInput) {
    const partial = allBranches.find(b => {
      const sb = strip(normalizeBranchName(b.name));
      return sb && (sb === strippedInput || sb.includes(strippedInput) || strippedInput.includes(sb));
    });
    if (partial) return partial;
  }

  return allBranches.find(b => b.id === 'branch-6') || allBranches[0];
}

let lastGeozonesFirestoreSync = 0;

function applyFirestoreGeozoneFieldsToMap(map: Map<string, BranchGeozone>, docId: string, f: any) {
  if (!f) return;
  const name = f.name?.stringValue || 'Filial';
  const description = f.description?.stringValue || '';
  const rawLat = f.lat?.doubleValue ?? f.lat?.integerValue ?? f.lat?.stringValue;
  const rawLon = f.lon?.doubleValue ?? f.lon?.integerValue ?? f.lon?.stringValue;
  const rawRadius = f.radius?.integerValue ?? f.radius?.doubleValue ?? f.radius?.stringValue;
  const lat = rawLat !== undefined ? Number(rawLat) : 40.5283;
  const lon = rawLon !== undefined ? Number(rawLon) : 70.9425;
  const radius = rawRadius !== undefined ? Number(rawRadius) : 100;
  const address = f.address?.stringValue || '';

  let targetKey = docId;
  if (!map.has(docId)) {
    for (const [k, existing] of map.entries()) {
      if (normalizeBranchName(existing.name) === normalizeBranchName(name)) {
        targetKey = k;
        break;
      }
    }
  }

  const gzItem: BranchGeozone = {
    id: targetKey,
    name,
    description: description || map.get(targetKey)?.description || '',
    lat: !isNaN(lat) ? lat : 40.5283,
    lon: !isNaN(lon) ? lon : 70.9425,
    radius: !isNaN(radius) && radius > 0 ? radius : 100,
    address,
    updatedAt: f.updatedAt?.stringValue || new Date().toISOString()
  };

  map.set(targetKey, gzItem);
}

// Helper: Fetch all geozones from Firestore or fallback to default branches
async function getAllServerGeozones(): Promise<BranchGeozone[]> {
  const map = new Map<string, BranchGeozone>();
  branchGeozones.forEach(b => map.set(b.id, b));

  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return Array.from(map.values());
  }

  let syncedViaQuery = false;
  if (Date.now() > firestoreReadQuotaExhaustedUntil) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    try {
      const gzUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
      const res = await fetch(gzUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: { from: [{ collectionId: 'geozones' }] }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.status === 429) {
        firestoreReadQuotaExhaustedUntil = Date.now() + 60 * 1000;
      } else if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.filter((item: any) => item.document && item.document.fields).forEach((item: any) => {
            const f = item.document.fields;
            const docId = item.document.name.split('/').pop() || '';
            applyFirestoreGeozoneFieldsToMap(map, docId, f);
          });
          branchGeozones = Array.from(map.values());
          saveLocalGeozones(branchGeozones);
          lastGeozonesFirestoreSync = Date.now();
          syncedViaQuery = true;
        }
      }
    } catch (e) {
      clearTimeout(timeoutId);
    }
  }

  // Fallback when Read Quota is 429: read branch-1..branch-11 via non-destructive PATCH (cached 5 min)
  if (!syncedViaQuery && (Date.now() - lastGeozonesFirestoreSync > 5 * 60 * 1000)) {
    try {
      const branchIds = Array.from({ length: 11 }, (_, idx) => `branch-${idx + 1}`);
      const results = await Promise.all(
        branchIds.map(async (id) => ({ id, fields: await readFirestoreDocViaPatch('geozones', id) }))
      );
      let anyUpdated = false;
      for (const item of results) {
        if (item.fields) {
          applyFirestoreGeozoneFieldsToMap(map, item.id, item.fields);
          anyUpdated = true;
        }
      }
      if (anyUpdated) {
        branchGeozones = Array.from(map.values());
        saveLocalGeozones(branchGeozones);
        lastGeozonesFirestoreSync = Date.now();
      }
    } catch {}
  }

  return Array.from(map.values());
}

async function saveFirestoreGeozone(geozone: BranchGeozone): Promise<boolean> {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return false;
  }
  const writeUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/geozones/${geozone.id}?key=${firebaseConfig.apiKey}`;
  const fields: Record<string, any> = {
    id: { stringValue: String(geozone.id) },
    name: { stringValue: String(geozone.name) },
    description: { stringValue: String(geozone.description || '') },
    lat: { doubleValue: Number(geozone.lat) },
    lon: { doubleValue: Number(geozone.lon) },
    radius: { integerValue: String(Math.round(Number(geozone.radius) || 100)) },
    address: { stringValue: String(geozone.address || '') },
    updatedAt: { stringValue: new Date().toISOString() }
  };
  firestoreDocFallbackCache.set(`geozones/${geozone.id}`, { fields, expiresAt: Date.now() + 10 * 60 * 1000 });
  try {
    const res = await fetch(writeUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function deleteFirestoreGeozone(docId: string): Promise<boolean> {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return false;
  }
  firestoreDocFallbackCache.delete(`geozones/${docId}`);
  const deleteUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/geozones/${docId}?key=${firebaseConfig.apiKey}`;
  try {
    const res = await fetch(deleteUrl, { method: 'DELETE' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// Helper: Toshkent (Asia/Tashkent, UTC+5) vaqti bilan to'g'ri ISO sana (YYYY-MM-DD) olish (Vercel/server UTC bo'lganda ham xato bo'lmaydi)
function getLocalIsoDate(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch (e) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

function getLocalTimeString(d: Date = new Date()): string {
  try {
    return d.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Tashkent',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  }
}

function getLocalDateFormatted(d: Date = new Date()): string {
  try {
    return d.toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' });
  } catch (e) {
    return d.toLocaleDateString('uz-UZ');
  }
}

function applyFirestoreAttendanceDocToMap(map: Map<string, any>, docId: string, f: any) {
  if (!f) return;
  const empId = f.employeeId?.stringValue || '';
  const empName = f.employeeName?.stringValue || 'Xodim';
  const dateStr = f.date?.stringValue || getLocalIsoDate();
  const checkIn = f.checkIn?.stringValue || '--:--';
  const checkOut = f.checkOut?.stringValue || '--:--';
  const status = f.status?.stringValue || 'Vaqtida kelgan';
  const delayMinutes = f.delayMinutes?.integerValue ? Number(f.delayMinutes.integerValue) : 0;
  const branchName = f.branch?.stringValue || 'Bosh ofis';

  if (checkIn && checkIn !== '--:--') {
    map.set(`${docId}_in`, {
      id: `${docId}_in`,
      docId,
      action: 'keldim',
      timestamp: f.checkInTimestamp?.stringValue || `${dateStr}T09:00:00.000Z`,
      timeFormatted: checkIn,
      dateFormatted: dateStr,
      dateIso: dateStr,
      employeeId: empId,
      employeeName: empName,
      branchName: branchName,
      status,
      success: true,
      delayMinutes,
      faceVerified: f.faceVerified?.booleanValue !== false
    });
  }

  if (checkOut && checkOut !== '--:--') {
    map.set(`${docId}_out`, {
      id: `${docId}_out`,
      docId,
      action: 'ketdim',
      timestamp: f.checkOutTimestamp?.stringValue || `${dateStr}T18:00:00.000Z`,
      timeFormatted: checkOut,
      dateFormatted: dateStr,
      dateIso: dateStr,
      employeeId: empId,
      employeeName: empName,
      branchName: branchName,
      status: 'Ketdi (Ish yakunlandi)',
      success: true,
      delayMinutes: 0,
      faceVerified: f.faceVerified?.booleanValue !== false
    });
  }
}

// Helper: Fetch all attendance logs from local storage and Firestore
async function getAllServerAttendanceLogs(targetEmployeeId?: string): Promise<any[]> {
  const map = new Map<string, any>();
  
  // 1. Avval mahalliy fayl va xotiradagi davomat yozuvlarini yuklaymiz
  const localLogs = loadLocalAttendance();
  localLogs.forEach(l => map.set(l.id, l));
  attendanceLogs.forEach(l => map.set(l.id, l));

  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return Array.from(map.values());
  }

  let querySucceeded = false;
  if (Date.now() > firestoreReadQuotaExhaustedUntil) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const attUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
      const res = await fetch(attUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: { from: [{ collectionId: 'attendance' }] }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.status === 429) {
        firestoreReadQuotaExhaustedUntil = Date.now() + 60 * 1000;
      } else if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.filter((item: any) => item.document && item.document.fields).forEach((item: any) => {
            const f = item.document.fields;
            const docId = item.document.name.split('/').pop() || '';
            applyFirestoreAttendanceDocToMap(map, docId, f);
          });
          querySucceeded = true;
        }
      }
    } catch (e) {
      clearTimeout(timeoutId);
    }
  }

  // 2. Agar Firestore Read Quota (429) tugagan bo'lsa, oxirgi 7 kunlik davomat hujjatlarini
  // bevosita ID bo'yicha (att-<empId>-<YYYY-MM-DD>) o'qiymiz va keshlaymiz!
  if (!querySucceeded) {
    const empIdsToCheck = new Set<string>(['emp-101']);
    if (targetEmployeeId && targetEmployeeId !== 'all') {
      empIdsToCheck.add(targetEmployeeId);
    }
    const baseNow = Date.now();
    const docIdsToFetch: string[] = [];
    for (const empId of empIdsToCheck) {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const d = new Date(baseNow - dayOffset * 24 * 60 * 60 * 1000);
        const iso = getLocalIsoDate(d);
        docIdsToFetch.push(`att-${empId}-${iso}`);
      }
    }
    try {
      const results = await Promise.all(
        docIdsToFetch.map(async (docId) => ({
          docId,
          fields: await readFirestoreDocViaPatch('attendance', docId)
        }))
      );
      let anyRecovered = false;
      for (const r of results) {
        if (r.fields) {
          applyFirestoreAttendanceDocToMap(map, r.docId, r.fields);
          anyRecovered = true;
        }
      }
      if (anyRecovered) {
        attendanceLogs = Array.from(map.values()).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        saveLocalAttendance(attendanceLogs);
      }
    } catch {}
  }

  return Array.from(map.values()).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

// Helper: Save attendance check-in record directly to Firestore attendance collection
async function saveFirestoreAttendance(record: any): Promise<boolean> {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return false;
  }
  const dateIso = record.date || getLocalIsoDate();
  const docId = record.id || `att-${record.employeeId}-${dateIso}`;

  let checkInVal = record.checkIn || record.checkInTime;
  let checkOutVal = record.checkOut || record.checkOutTime;
  if (!checkInVal && record.prevCheckIn) {
    checkInVal = record.prevCheckIn;
  }
  if (!checkOutVal && record.prevCheckOut) {
    checkOutVal = record.prevCheckOut;
  }

  // Agar checkIn hali bo'lmasa, mavjud xotiradan yoki keshdan to'ldiramiz
  if (!checkInVal || checkInVal === '--:--') {
    const cachedDoc = firestoreDocFallbackCache.get(`attendance/${docId}`)?.fields;
    if (cachedDoc?.checkIn?.stringValue && cachedDoc.checkIn.stringValue !== '--:--') {
      checkInVal = cachedDoc.checkIn.stringValue;
    } else {
      const existing = attendanceLogs.find(l => 
        (l.employeeId === record.employeeId || l.employeeName === record.employeeName) &&
        (l.dateIso === dateIso || l.date === dateIso) &&
        (l.action === 'keldim' || (l.checkIn && l.checkIn !== '--:--'))
      );
      if (existing) {
        checkInVal = existing.timeFormatted || existing.checkIn || existing.time;
      }
    }
  }

  const fields: Record<string, any> = {
    id: { stringValue: String(docId) },
    employeeId: { stringValue: String(record.employeeId || 'EMP') },
    employeeName: { stringValue: String(record.employeeName || 'Xodim') },
    date: { stringValue: String(dateIso) },
    status: { stringValue: String(record.status || 'Vaqtida kelgan') },
    delayMinutes: { integerValue: String(record.delayMinutes || 0) },
    branch: { stringValue: String(record.branch || record.branchName || 'Bosh ofis') },
    department: { stringValue: String(record.department || 'Savdo') },
    notes: { stringValue: String(record.notes || '') },
    updatedAt: { stringValue: new Date().toISOString() }
  };

  if (checkInVal && checkInVal !== '--:--') {
    fields.checkIn = { stringValue: String(checkInVal) };
  }
  if (checkOutVal && checkOutVal !== '--:--') {
    fields.checkOut = { stringValue: String(checkOutVal) };
  }
  if (record.checkInTimestamp) fields.checkInTimestamp = { stringValue: String(record.checkInTimestamp) };
  if (record.checkOutTimestamp) fields.checkOutTimestamp = { stringValue: String(record.checkOutTimestamp) };
  if (record.capturedPhoto) fields.capturedPhoto = { stringValue: String(record.capturedPhoto) };
  if (record.faceVerified !== undefined) fields.faceVerified = { booleanValue: Boolean(record.faceVerified) };

  // Faqat yuborilayotgan maydonlarni yangilaymiz (updateMask), shunda 'ketdim' bosilganda avvalgi 'checkIn' hech qachon o'chib ketmaydi!
  const maskParams = Object.keys(fields)
    .map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&');
  const writeUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/attendance/${docId}?${maskParams}&key=${firebaseConfig.apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(writeUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      try {
        const savedDoc = await res.json();
        if (savedDoc?.fields) {
          firestoreDocFallbackCache.set(`attendance/${docId}`, {
            fields: savedDoc.fields,
            expiresAt: Date.now() + 10 * 60 * 1000
          });
        }
      } catch {}
    }
    return res.ok;
  } catch (err) {
    clearTimeout(timeoutId);
    return false;
  }
}

// Haversine distance calculator in meters
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const app = express();

let isRoutesConfigured = false;
export async function configureRoutes(appInstance: express.Express = app) {
  if (isRoutesConfigured) return;
  isRoutesConfigured = true;
  const PORT = 3000;

  // Allow cross-origin requests from the HTML form
  appInstance.use(cors());
  appInstance.use(express.json({ limit: '50mb' }));
  appInstance.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Support both /api/... and /... in serverless environments
  appInstance.use((req, res, next) => {
    if (!req.url.startsWith('/api') && !req.url.startsWith('/_') && req.url !== '/') {
      req.url = '/api' + req.url;
    }
    next();
  });

  // ============================================================================
  // QATTIQ XAVFSIZLIK TIZIMI (STRICT API SECURITY GUARD & BRUTE-FORCE SHIELD)
  // ============================================================================
  const HRMS_INTERNAL_TOKEN = process.env.HRMS_INTERNAL_TOKEN || "ts_hrms_internal_v5_9f8a7b6c";
  const SESSION_HMAC_SECRET = process.env.SESSION_HMAC_SECRET || "toyona_hrms_hmac_secret_2026_998877";
  const loginRateLimitMap = new Map<string, { count: number; lockUntil: number; lastAttempt: number }>();

  function getClientIp(req: any): string {
    const forwarded = req.headers['x-forwarded-for'];
    let ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || req.ip || '127.0.0.1');
    if (ip.startsWith('::ffff:')) ip = ip.substring(7);
    if (ip === '::1') ip = '127.0.0.1';
    return ip;
  }

  function hasInternalAdminToken(req: any): boolean {
    const token = String(req.headers['x-hrms-internal-token'] || req.headers['x-hrms-key'] || '').trim();
    return token === HRMS_INTERNAL_TOKEN;
  }

  function createSignedSessionToken(empId: string): string {
    const ts = Date.now();
    const payload = `${empId}:${ts}`;
    const sig = crypto.createHmac('sha256', SESSION_HMAC_SECRET).update(payload).digest('hex').slice(0, 24);
    return `token_${empId}_${ts}_${sig}`;
  }

  function isDirectBrowserNavigation(req: any): boolean {
    const fetchMode = String(req.headers['sec-fetch-mode'] || '').toLowerCase();
    const fetchDest = String(req.headers['sec-fetch-dest'] || '').toLowerCase();
    const accept = String(req.headers['accept'] || '').toLowerCase();
    if (fetchMode === 'navigate' || fetchDest === 'document') return true;
    if (req.method === 'GET' && accept.includes('text/html') && !hasInternalAdminToken(req)) return true;
    return false;
  }

  app.use('/api', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    // 1. Brauzer manzil qatoridan (/api/...) to'g'ridan-to'g'ri kirishni 100% bloklash
    if (isDirectBrowserNavigation(req)) {
      return res.status(403).json({
        success: false,
        code: "ACCESS_DENIED",
        message: "Xavfsizlik tizimi: API manzillarini brauzer orqali to'g'ridan-to'g'ri ochish qat'iyan taqiqlangan!"
      });
    }

    // 2. Ichki token bo'lmasa, faqat ruxsat etilgan tashqi Mini App / Anketa so'rovlarigagina ruxsat berish
    if (!hasInternalAdminToken(req)) {
      const p = req.path.toLowerCase();
      const m = req.method.toUpperCase();

      const isPublicCandidatePost = m === 'POST' && (
        p === '/candidates' || p === '/candidate' || p === '/submit-candidate' || p === '/submit-anketa' || p === '/anketa'
      );
      const isMiniAppLoginPost = m === 'POST' && (
        p === '/attendance/login' || p === '/qatnashish/kirish' || p === '/davomat/login' || p === '/davomat/kirish'
      );
      const isMiniAppCheckInPost = m === 'POST' && (
        p === '/attendance/check-in' || p === '/qatnashish/check-in' || p === '/davomat/check-in'
      );
      const isMiniAppPhotoSubmitPost = m === 'POST' && p === '/attendance/photo-request/submit';
      const isMiniAppGeozonesGet = m === 'GET' && (
        p === '/branch-geozones' || p === '/geozones' || p === '/geozone' || p === '/branches' ||
        p === '/attendance/geozones' || p === '/attendance/geozone' || p === '/attendance/branches' ||
        p === '/qatnashish/geozonalar' || p === '/qatnashish/geozone' || p === '/davomat/geozonalar'
      );
      const isMiniAppStatusOrHistoryGet = m === 'GET' && (
        p === '/attendance/today-status' || p === '/qatnashish/today-status' || p === '/davomat/today-status' ||
        p === '/qatnashish/bugungi-holat' || p === '/davomat/bugungi-holat' ||
        p === '/attendance/history' || p === '/qatnashish/tarix' || p === '/davomat/tarix' ||
        p === '/attendance/employee-photo' || p === '/qatnashish/xodim-rasmi' || p === '/davomat/xodim-rasmi' ||
        p === '/attendance/penalty-settings'
      );

      if (
        !isPublicCandidatePost &&
        !isMiniAppLoginPost &&
        !isMiniAppCheckInPost &&
        !isMiniAppPhotoSubmitPost &&
        !isMiniAppGeozonesGet &&
        !isMiniAppStatusOrHistoryGet
      ) {
        return res.status(403).json({
          success: false,
          code: "ACCESS_DENIED",
          message: "Xavfsizlik tizimi: Ruxsatsiz kirish qat'iyan taqiqlangan!"
        });
      }
    }

    next();
  });

  // Telegram Bot Yangi Qurilma Xabarnomasi (@FaolMaktab_uzbot)
  const TELEGRAM_SECURITY_BOT_TOKEN = "8975567213:AAGDNAyKPKGNoIrBsipqAgASO88KEY6ThS4";
  const ADMIN_CHATS_FILE = path.join(process.cwd(), 'telegram_admin_chats.json');

  function getSavedAdminChatIds(): string[] {
    try {
      if (fs.existsSync(ADMIN_CHATS_FILE)) {
        return JSON.parse(fs.readFileSync(ADMIN_CHATS_FILE, 'utf8'));
      }
    } catch {}
    return [];
  }

  function saveAdminChatId(chatId: string | number) {
    try {
      const chats = new Set(getSavedAdminChatIds());
      chats.add(String(chatId));
      fs.writeFileSync(ADMIN_CHATS_FILE, JSON.stringify(Array.from(chats)), 'utf8');
    } catch {}
  }

  async function getBotChatIds(): Promise<string[]> {
    const saved = new Set(getSavedAdminChatIds());
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_SECURITY_BOT_TOKEN}/getUpdates`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          data.result.forEach((u: any) => {
            const chatId = (u.message || u.channel_post || u.callback_query?.message)?.chat?.id;
            if (chatId) {
              saved.add(String(chatId));
              saveAdminChatId(chatId);
            }
          });
        }
      }
    } catch (err) {
      console.warn("Telegram getUpdates notice:", err);
    }
    return Array.from(saved);
  }

  async function sendTelegramAlert(text: string): Promise<boolean> {
    const chatIds = await getBotChatIds();
    if (chatIds.length === 0) {
      console.log("No telegram chat_id registered yet. User needs to send /start to @FaolMaktab_uzbot");
      return false;
    }
    let success = false;
    for (const chatId of chatIds) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_SECURITY_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML'
          })
        });
        if (res.ok) success = true;
      } catch (err) {
        console.warn(`Failed to send to chatId ${chatId}:`, err);
      }
    }
    return success;
  }

  app.post("/api/security/notify-device", async (req, res) => {
    try {
      const { deviceId, userName, userRole, device, screenResolution, time } = req.body || {};
      const forwarded = req.headers['x-forwarded-for'];
      let clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || req.ip || '127.0.0.1');
      if (clientIp.startsWith('::ffff:')) clientIp = clientIp.substring(7);
      if (clientIp === '::1') clientIp = '127.0.0.1';

      const message = `🚨 <b>DIQQAT: HRMS TIZIMIGA YANGI QURILMA KIRDI!</b>\n\n` +
        `👤 <b>Foydalanuvchi:</b> ${userName || 'Foydalanuvchi'} (${userRole || 'Admin'})\n` +
        `💻 <b>Qurilma / Brauzer:</b> ${device || 'Noma\'lum'}\n` +
        `🌐 <b>IP Manzil:</b> <code>${clientIp}</code>\n` +
        `🖥️ <b>Ekran o'lchami:</b> ${screenResolution || 'Noma\'lum'}\n` +
        `🕒 <b>Vaqt:</b> ${time || new Date().toLocaleString('uz-UZ')}\n` +
        `🔑 <b>Device ID:</b> <code>${deviceId || 'yangi'}</code>\n\n` +
        `⚠️ <i>Agar ushbu qurilmadan siz kirmagan bo'lsangiz, zudlik bilan parolingizni o'zgartiring va tizim tarixini tekshiring!</i>`;

      const sent = await sendTelegramAlert(message);
      res.json({ success: true, sent, clientIp });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/security/telegram-status", async (req, res) => {
    const chatIds = await getBotChatIds();
    res.json({
      success: true,
      bot: "@FaolMaktab_uzbot",
      registeredChatIds: chatIds,
      ready: chatIds.length > 0
    });
  });

  app.post("/api/security/register-chat", async (req, res) => {
    const { chatId } = req.body || {};
    if (chatId) {
      saveAdminChatId(chatId);
      const testMsg = "✅ <b>HRMS Xavfsizlik Botiga muvaffaqiyatli ulandingiz!</b>\n\nEndi tizimga yangi qurilma kirganda ushbu chatga darhol xabarnoma keladi.";
      await sendTelegramAlert(testMsg);
      return res.json({ success: true, chatId });
    }
    res.status(400).json({ success: false, error: "chatId required" });
  });

  // API Routes
  app.get("/api/client-info", (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    let ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || req.ip || '127.0.0.1');
    if (ip.startsWith('::ffff:')) ip = ip.substring(7);
    if (ip === '::1') ip = '127.0.0.1';
    res.json({
      ip,
      userAgent: req.headers['user-agent'] || '',
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/candidates/health", async (req, res) => {
    try {
      const list = await getFirestoreCandidates();
      res.json({
        status: "ok",
        firestoreConnected: true,
        firestoreCount: list.length,
        localCacheCount: candidates.length,
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
      res.status(200).json({
        status: "degraded",
        firestoreConnected: false,
        error: e?.message || "Unknown error",
        localCacheCount: candidates.length,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get("/api/candidates", async (req, res) => {
    try {
      const firestoreList = await getFirestoreCandidates();
      const map = new Map<string, any>();
      [...candidates, ...firestoreList].forEach(c => {
        const key = c.id || `${c.fullName}_${c.phone1}`;
        if (!map.has(key)) {
          map.set(key, c);
        }
      });
      res.json(Array.from(map.values()));
    } catch (err) {
      res.json(candidates);
    }
  });

  const handleCandidateCreation = async (req: express.Request, res: express.Response) => {
    try {
      const body = req.body || {};
      const newCandidate = {
        id: body.id || `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: body.date || new Date().toLocaleDateString('uz-UZ').replace(/\//g, '.'),
        submittedAt: body.submittedAt || new Date().toISOString(),
        status: body.status || 'Yangi nomzod',
        fullName: body.fullName || body.fio || (body.lastName ? `${body.lastName} ${body.firstName || ''} ${body.middleName || ''}`.trim() : 'Noma\'lum'),
        fatherName: body.fatherName || body.middleName || '',
        position: body.jobPosition || body.position || body.lavozim || 'Noma\'lum',
        jobPosition: body.jobPosition || body.position || body.lavozim || 'Noma\'lum',
        region: body.region || body.viloyat || 'Noma\'lum',
        address: body.exactAddress || body.address || body.manzil || '',
        exactAddress: body.exactAddress || body.address || body.manzil || '',
        targetBranch: body.targetBranch || body.branch || body.filial || '',
        maritalStatus: body.maritalStatus || body.oilaviyHolati || '',
        educationLevel: body.educationLevel || body.degree || body.education || body.malumoti || '',
        graduationYear: body.graduationYear || body.gradYear || '',
        phone1: body.phone1 || body.phone || body.telefon1 || '',
        phone2: body.phone2 || body.telefon2 || '',
        gender: body.gender || body.jinsi || 'Erkak',
        dob: body.dob || body.birthYear || body.tugilganYili || '',
        pastExperience: body.pastExperience || body.candidateMessage || body.tajriba || '',
        candidateMessage: body.pastExperience || body.candidateMessage || body.tajriba || '',
        photoUrl: body.photoUrl || body.photo_url || body.avatarUrl || body.photo || '',
        passportFrontUrl: body.passportFrontUrl || body.passport_front_url || body.passport_front || body.passportFront || body.passFront || body.passportImage || body.passport_image || body.passportPhoto || body.passport1 || '',
        passportBackUrl: body.passportBackUrl || body.passport_back_url || body.passport_back || body.passportBack || body.passBack || body.passport2 || ''
      };

      // 1. Instant local persistence to guarantee 0-failure response
      candidates.unshift(newCandidate);

      // 2. Persistent save to Firestore
      let savedToFirestore = false;
      try {
        savedToFirestore = await saveFirestoreCandidate(newCandidate);
      } catch (fErr) {
        console.warn("Background Firestore save notice:", fErr);
      }

      res.status(201).json({
        success: true,
        message: "Nomzod arizasi muvaffaqiyatli qabul qilindi!",
        savedToFirestore,
        candidate: newCandidate
      });
    } catch (err: any) {
      console.error("Candidate creation error:", err);
      res.status(500).json({ success: false, error: err?.message || "Server xatosi" });
    }
  };

  // Support multiple standard endpoint names so external bots / webhooks / forms never fail
  app.post("/api/candidates", handleCandidateCreation);
  app.post("/api/candidate", handleCandidateCreation);
  app.post("/api/submit-candidate", handleCandidateCreation);
  app.post("/api/submit-anketa", handleCandidateCreation);
  app.post("/api/anketa", handleCandidateCreation);

  app.delete("/api/candidates/:id", async (req, res) => {
    const id = req.params.id;
    candidates = candidates.filter(c => c.id !== id);
    await deleteFirestoreCandidate(id);
    res.json({ success: true });
  });

  // --- Branch Geozones API (with aliases for /api/geozones, /api/geozone, /api/attendance/geozones) ---
  const handleGetGeozones = async (req: any, res: any) => {
    const list = await getAllServerGeozones();
    res.json(list);
  };

  app.get("/api/branch-geozones", handleGetGeozones);
  app.get("/api/geozones", handleGetGeozones);
  app.get("/api/geozone", handleGetGeozones);
  app.get("/api/branches", handleGetGeozones);
  app.get("/api/attendance/geozones", handleGetGeozones);
  app.get("/api/attendance/geozone", handleGetGeozones);
  app.get("/api/attendance/branches", handleGetGeozones);
  app.get("/api/qatnashish/geozonalar", handleGetGeozones);
  app.get("/api/qatnashish/geozone", handleGetGeozones);
  app.get("/api/davomat/geozonalar", handleGetGeozones);

  const handleSaveGeozone = async (req: any, res: any) => {
    const { id, name, description, lat, lon, radius, address } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Filial nomi kiritilmadi" });
    }

    const existingIndex = branchGeozones.findIndex(
      b => b.id === id || normalizeBranchName(b.name) === normalizeBranchName(name)
    );

    const targetId = existingIndex >= 0 ? branchGeozones[existingIndex].id : (id || `branch-${Date.now()}`);

    const updatedItem: BranchGeozone = {
      id: targetId,
      name: String(name).trim(),
      description: description || '',
      lat: Number(lat) || 40.5283,
      lon: Number(lon) || 70.9425,
      radius: Number(radius) || 100,
      address: address || '',
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      branchGeozones[existingIndex] = updatedItem;
    } else {
      branchGeozones.push(updatedItem);
    }

    saveLocalGeozones(branchGeozones);
    const saved = await saveFirestoreGeozone(updatedItem);

    res.json({ success: true, savedToFirestore: saved, geozone: updatedItem });
  };

  app.post("/api/branch-geozones", handleSaveGeozone);
  app.post("/api/geozones", handleSaveGeozone);
  app.post("/api/attendance/geozones", handleSaveGeozone);

  app.delete("/api/branch-geozones/:id", async (req, res) => {
    const id = req.params.id;
    branchGeozones = branchGeozones.filter(b => b.id !== id);
    saveLocalGeozones(branchGeozones);
    await deleteFirestoreGeozone(id);
    res.json({ success: true });
  });

  // --- Attendance API for Employee "Keldim/Ketdim" Mini App & Face Recognition ---

  // 1. Employee Login: faqat o'sha xodimning ma'lumotlarini (ism, familiya, filial, lavozim, login, saqlangan rasm) qaytaradi
  const handleAttendanceLoginNotAllowed = (req: any, res: any) => {
    res.status(405).json({
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Faqat POST so'rovi ruxsat etilgan."
    });
  };

// Helper: Find employee by any identifier (username, staffId, id, phone, email, full name, first.last)
function findServerEmployee(allEmployees: ServerEmployee[], input: string): ServerEmployee | undefined {
  if (!input) return undefined;
  const raw = String(input).trim();
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  const cleanDigits = raw.replace(/\D/g, '');
  const cleanAlpha = lower.replace(/[^a-z0-9]/g, '');

  return allEmployees.find(emp => {
    const empUsername = (emp.username || '').toLowerCase().trim();
    if (empUsername && (empUsername === lower || empUsername.replace(/[^a-z0-9]/g, '') === cleanAlpha)) return true;

    const empId = (emp.id || '').toLowerCase().trim();
    if (empId && (empId === lower || empId.replace(/\D/g, '') === cleanDigits)) return true;

    const staffId = (emp.staffId || '').toLowerCase().trim();
    if (staffId && (staffId === lower || staffId.replace(/[^a-z0-9]/g, '') === cleanAlpha)) return true;

    const email = (emp.email || '').toLowerCase().trim();
    if (email && (email === lower || email.split('@')[0] === lower)) return true;

    const phoneDigits = (emp.phone || '').replace(/\D/g, '');
    if (cleanDigits.length >= 7 && (phoneDigits === cleanDigits || phoneDigits.endsWith(cleanDigits))) return true;

    const fullNameLower = (emp.fullName || '').toLowerCase().trim();
    if (fullNameLower && (fullNameLower === lower || fullNameLower.replace(/[^a-z0-9]/g, '') === cleanAlpha)) return true;

    // First and last name checks (e.g. Alisher Qodirov -> qodirov.alisher, alisher.qodirov)
    const parts = fullNameLower.replace(/['`ʻ’]/g, '').split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const [p0, p1] = parts;
      if (`${p0}.${p1}` === lower || `${p1}.${p0}` === lower) return true;
      if (`${p0}_${p1}` === lower || `${p1}_${p0}` === lower) return true;
      if (`${p0}${p1}` === cleanAlpha || `${p1}${p0}` === cleanAlpha) return true;
    }

    return false;
  });
}

  const handleAttendanceLogin = async (req: any, res: any) => {
    try {
      const clientIp = getClientIp(req);
      const nowMs = Date.now();
      const rateRecord = loginRateLimitMap.get(clientIp);
      if (rateRecord && rateRecord.lockUntil > nowMs) {
        const waitMin = Math.ceil((rateRecord.lockUntil - nowMs) / 60000);
        return res.status(429).json({
          success: false,
          code: "TOO_MANY_ATTEMPTS",
          message: `Xavfsizlik himoyasi: Juda ko'p noto'g'ri urinish! Iltimos, ${waitMin} daqiqadan so'ng qayta urinib ko'ring.`
        });
      }

      const usernameInput = (req.body?.username || req.body?.login || req.body?.foydalanuvchi || req.body?.user || req.body?.employeeId || req.body?.id || req.body?.phone || '').toString().trim();
      const passwordInput = (req.body?.password || req.body?.parol || req.body?.pass || req.body?.pin || '').toString().trim();

      if (!usernameInput || !passwordInput) {
        return res.status(400).json({
          success: false,
          code: "MISSING_CREDENTIALS",
          message: "Login va parol kiritilishi shart!"
        });
      }

      const registerFailedAttempt = () => {
        const prev = loginRateLimitMap.get(clientIp) || { count: 0, lockUntil: 0, lastAttempt: 0 };
        const resetCount = (nowMs - prev.lastAttempt > 10 * 60 * 1000) ? 1 : prev.count + 1;
        loginRateLimitMap.set(clientIp, {
          count: resetCount,
          lockUntil: resetCount >= 6 ? nowMs + 10 * 60 * 1000 : 0,
          lastAttempt: nowMs
        });
      };

      const allEmployees = await getAllServerEmployees();
      const matched = findServerEmployee(allEmployees, usernameInput);

      if (!matched) {
        registerFailedAttempt();
        return res.status(401).json({
          success: false,
          code: "INVALID_CREDENTIALS",
          message: "Login yoki parol noto'g'ri!"
        });
      }

      // Agar xodim yoki super admin Firebase'da parolini yangilagan bo'lsa, uni to'g'ridan-to'g'ri Firebase hujjatidan yangilab olamiz:
      if (matched.id === 'emp-101') {
        matched.password = '';
        try {
          const userDoc = await readFirestoreDocViaPatch('users', 'user-1', true);
          if (userDoc?.password?.stringValue) {
            matched.password = userDoc.password.stringValue;
          }
        } catch (e) {}
      }

      // Parol tekshiruvi: faqat xodimning Firebase'dagi haqiqiy joriy paroli
      const empPassword = (matched.password || '').trim();
      const passTrim = passwordInput.trim();
      const isPasswordValid = Boolean(empPassword && passTrim === empPassword);

      if (!isPasswordValid) {
        registerFailedAttempt();
        return res.status(401).json({
          success: false,
          code: "INVALID_CREDENTIALS",
          message: "Login yoki parol noto'g'ri!"
        });
      }

      loginRateLimitMap.delete(clientIp);

      // Xodimning biriktirilgan filiali geozonasi
      const allBranches = await getAllServerGeozones();
      const targetBranch = findMatchingGeozone(allBranches, matched.branch);

      // Ism va familiyani ajratish
      const nameParts = matched.fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Faqat o'sha xodimning shaxsiy ma'lumotlari qaytariladi
      res.json({
        success: true,
        message: `Xush kelibsiz, ${matched.fullName}!`,
        employee: {
          id: matched.id,
          staffId: matched.staffId,
          fullName: matched.fullName,
          firstName,
          lastName,
          position: matched.position,
          lavozim: matched.position,
          branch: matched.branch,
          filial: matched.branch,
          department: matched.department,
          phone: matched.phone,
          email: matched.email,
          photoUrl: matched.photoUrl,
          rasmUrl: matched.photoUrl,
          username: matched.username,
          login: matched.username,
          status: matched.status || 'active'
        },
        branchGeozone: {
          id: targetBranch.id,
          name: targetBranch.name,
          lat: targetBranch.lat,
          lon: targetBranch.lon,
          radius: targetBranch.radius,
          address: targetBranch.address
        },
        sessionToken: createSignedSessionToken(matched.id)
      });
    } catch (err: any) {
      console.error("Attendance login error:", err);
      res.status(500).json({ success: false, message: "Serverda xatolik yuz berdi" });
    }
  };

  app.get("/api/attendance/login", handleAttendanceLoginNotAllowed);
  app.post("/api/attendance/login", handleAttendanceLogin);
  app.get("/api/qatnashish/kirish", handleAttendanceLoginNotAllowed);
  app.post("/api/qatnashish/kirish", handleAttendanceLogin);
  app.get("/api/davomat/login", handleAttendanceLoginNotAllowed);
  app.post("/api/davomat/login", handleAttendanceLogin);
  app.get("/api/davomat/kirish", handleAttendanceLoginNotAllowed);
  app.post("/api/davomat/kirish", handleAttendanceLogin);

  // 2. Hodimning saqlangan rasmini olish (Keldim bosilganda yuzni tekshirish uchun)
  const handleGetEmployeePhoto = async (req: any, res: any) => {
    try {
      const lookup = (req.query.employeeId || req.query.id || req.query.username || req.query.login || '').toString().trim();
      if (!lookup) {
        return res.status(400).json({ success: false, message: "employeeId ko'rsatilishi shart" });
      }

      const allEmployees = await getAllServerEmployees();
      const emp = findServerEmployee(allEmployees, lookup);
      if (emp && emp.id === 'emp-101' && !hasInternalAdminToken(req)) {
        return res.status(403).json({ success: false, message: "Ruxsat taqiqlangan" });
      }

      if (!emp) {
        return res.status(404).json({
          success: false,
          message: "Xodim topilmadi"
        });
      }

      res.json({
        success: true,
        employeeId: emp.id,
        fullName: emp.fullName,
        position: emp.position,
        branch: emp.branch,
        photoUrl: emp.photoUrl,
        message: "Xodimning tizimda saqlangan rasmi muvaffaqiyatli yuborildi. Mini app kodi uni jonli kameradagi yuz bilan solishtirishi mumkin."
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: "Rasm yuklashda xatolik" });
    }
  };

  app.get("/api/attendance/employee-photo", handleGetEmployeePhoto);
  app.get("/api/qatnashish/xodim-rasmi", handleGetEmployeePhoto);
  app.get("/api/davomat/xodim-rasmi", handleGetEmployeePhoto);

  // 2.1 Hodimning yangi etalon yuz rasmini yuklash / saqlash (Face ID skaneri uchun)
  const handleSaveEmployeePhoto = async (req: any, res: any) => {
    try {
      const { employeeId, username, login, photoUrl, imagePhoto } = req.body || {};
      const targetPhoto = photoUrl || imagePhoto;

      if (!targetPhoto) {
        return res.status(400).json({
          success: false,
          code: "MISSING_PHOTO",
          message: "photoUrl yoki imagePhoto (Base64 rasm yoki rasm URL havolasi) kiritilishi shart!"
        });
      }

      const allEmployees = await getAllServerEmployees();
      const lookupQuery = (employeeId || username || login || '').toString().trim();
      const emp = findServerEmployee(allEmployees, lookupQuery);

      if (!emp) {
        return res.status(404).json({
          success: false,
          code: "EMPLOYEE_NOT_FOUND",
          message: "Xodim topilmadi. employeeId yoki username parametrini tekshiring."
        });
      }

      // 1. In-memory overrides
      employeePhotoOverrides[emp.id] = targetPhoto;
      const defEmp = defaultEmployees.find(e => e.id === emp.id);
      if (defEmp) {
        defEmp.photoUrl = targetPhoto;
      }
      emp.photoUrl = targetPhoto;

      // 2. Persist to Firestore if available
      await saveFirestoreEmployeePhoto(emp.id, targetPhoto);

      console.log(`[Face ID] Xodim uchun yangi etalon rasm saqlandi: ${emp.fullName} (${emp.id})`);

      res.json({
        success: true,
        message: "Xodimning yuz etalon rasmi muvaffaqiyatli saqlandi! Narigi AI 'Keldim' vaqtida yuzni skaner qilish uchun ushbu rasmni oladi.",
        employeeId: emp.id,
        fullName: emp.fullName,
        position: emp.position,
        branch: emp.branch,
        photoUrl: targetPhoto
      });
    } catch (err: any) {
      console.error("Employee photo save error:", err);
      res.status(500).json({
        success: false,
        message: "Rasm saqlashda server xatoligi yuz berdi"
      });
    }
  };

  app.post("/api/attendance/employee-photo", handleSaveEmployeePhoto);
  app.post("/api/attendance/update-photo", handleSaveEmployeePhoto);
  app.post("/api/attendance/upload-photo", handleSaveEmployeePhoto);
  app.post("/api/qatnashish/xodim-rasmi", handleSaveEmployeePhoto);
  app.post("/api/davomat/xodim-rasmi", handleSaveEmployeePhoto);

  // 2.2 Hodimning yangi rasm yuklash so'rovlari (HR tasdig'i uchun)
  app.get("/api/attendance/photo-requests", async (req: any, res: any) => {
    try {
      const { employeeId, status } = req.query || {};
      let list = await getFirestorePhotoRequests();
      if (employeeId) {
        const empQuery = String(employeeId).trim();
        list = list.filter(r => String(r.employeeId).trim() === empQuery);
      }
      if (status) {
        list = list.filter(r => r.status === status);
      }
      list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      res.json({ success: true, requests: list });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message || "So'rovlarni olishda xatolik" });
    }
  });

  app.post("/api/attendance/photo-request/submit", async (req: any, res: any) => {
    try {
      const { employeeId, photoUrl, newPhotoUrl } = req.body || {};
      const targetPhoto = newPhotoUrl || photoUrl;
      if (!targetPhoto) {
        return res.status(400).json({ success: false, message: "Yangi rasm kiritilishi shart." });
      }

      const allEmployees = await getAllServerEmployees();
      const emp = findServerEmployee(allEmployees, employeeId);
      if (!emp) {
        return res.status(404).json({ success: false, message: "Xodim topilmadi." });
      }

      // Agar ushbu xodimda hali kutilayotgan (pending) so'rov bo'lsa, o'shani yangilaymiz. Aks holda tarixda qolishi uchun yangi ID olamiz.
      const list = await getFirestorePhotoRequests();
      const existingPending = list.find(r => String(r.employeeId).trim() === String(emp.id).trim() && r.status === 'pending');
      const requestId = existingPending ? existingPending.id : `req_${emp.id}_${Date.now()}`;
      const newReq: PhotoUpdateRequest = {
        id: requestId,
        employeeId: emp.id,
        employeeName: emp.fullName,
        branch: emp.branch || '',
        position: emp.position || '',
        currentPhotoUrl: emp.photoUrl || (emp as any).avatarUrl || '',
        newPhotoUrl: targetPhoto,
        status: 'pending',
        submittedAt: new Date().toISOString()
      };

      await saveFirestorePhotoRequest(newReq);
      res.json({
        success: true,
        message: "Rasm HR tasdig'iga muvaffaqiyatli yuborildi. Kutilmoqda.",
        request: newReq
      });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message || "Rasm so'rovini yuborishda xatolik" });
    }
  });

  app.post("/api/attendance/photo-request/action", async (req: any, res: any) => {
    try {
      const { requestId, employeeId, action, rejectionReason, reviewerName } = req.body || {};
      let list = await getFirestorePhotoRequests();
      let targetReq = list.find(r => r.id === requestId || (employeeId && r.employeeId === employeeId && r.status === 'pending'));

      if (!targetReq) {
        return res.status(404).json({ success: false, message: "So'rov topilmadi." });
      }

      if (action === 'approve') {
        targetReq.status = 'approved';
        targetReq.reviewedAt = new Date().toISOString();
        targetReq.reviewedBy = reviewerName || 'HR Menejer';
        targetReq.rejectionReason = undefined;

        // Xodimning etalon rasmini darhol yangilash!
        employeePhotoOverrides[targetReq.employeeId] = targetReq.newPhotoUrl;
        const defEmp = defaultEmployees.find(e => e.id === targetReq!.employeeId);
        if (defEmp) {
          defEmp.photoUrl = targetReq.newPhotoUrl;
        }
        await saveFirestoreEmployeePhoto(targetReq.employeeId, targetReq.newPhotoUrl);
        await saveFirestorePhotoRequest(targetReq);

        return res.json({
          success: true,
          message: "Xodim rasmi muvaffaqiyatli tasdiqlandi va Face ID uchun yangilandi!",
          request: targetReq
        });
      } else if (action === 'reject') {
        targetReq.status = 'rejected';
        targetReq.reviewedAt = new Date().toISOString();
        targetReq.reviewedBy = reviewerName || 'HR Menejer';
        targetReq.rejectionReason = rejectionReason || "HR tomonidan rad etildi";

        await saveFirestorePhotoRequest(targetReq);
        return res.json({
          success: true,
          message: "Rasm so'rovi rad etildi.",
          request: targetReq
        });
      } else {
        return res.status(400).json({ success: false, message: "Noto'g'ri amal (action: approve yoki reject)." });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message || "So'rovni ko'rib chiqishda xatolik" });
    }
  });

  app.delete("/api/attendance/photo-request/:id", async (req: any, res: any) => {
    try {
      const id = req.params.id;
      photoRequestsMap.delete(id);
      if (firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId && firebaseConfig?.apiKey) {
        const deleteUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/photo_requests/${id}?key=${firebaseConfig.apiKey}`;
        fetch(deleteUrl, { method: 'DELETE' }).catch(() => {});
      }
      res.json({ success: true, message: "So'rov o'chirildi." });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message || "O'chirishda xatolik" });
    }
  });

  // 3. Hodimning bugungi davomat holati
  const handleTodayStatus = async (req: any, res: any) => {
    try {
      const employeeId = (req.query.employeeId || req.query.id || req.query.username || req.query.login || '').toString().trim();
      if (!employeeId && !hasInternalAdminToken(req)) {
        return res.status(403).json({ success: false, message: "employeeId parametri talab qilinadi" });
      }
      const now = new Date();
      const todayIso = getLocalIsoDate(now);
      const todayStr = getLocalDateFormatted(now);

      const allEmployees = await getAllServerEmployees();
      const matched = employeeId ? findServerEmployee(allEmployees, employeeId) : null;
      const targetEmpId = matched ? matched.id : employeeId;

      const allLogs = await getAllServerAttendanceLogs(targetEmpId);
      const empLogs = allLogs.filter(l => {
        const matchesEmp = !targetEmpId || 
          l.employeeId === targetEmpId || 
          (matched && l.employeeId === matched.id) ||
          (matched && l.username && l.username.toLowerCase() === (matched.username || '').toLowerCase()) ||
          (l.employeeName && matched && l.employeeName.toLowerCase() === matched.fullName.toLowerCase());
        const logIso = String(l.dateIso || l.date || l.timestamp || '').slice(0, 10);
        const matchesDate = logIso === todayIso || l.dateFormatted === todayStr || (l.date && l.date.includes(todayIso));
        return matchesEmp && matchesDate && l.success;
      });

      const checkInLog = empLogs.find(l => l.action === 'keldim' || !l.action);
      const checkOutLog = empLogs.find(l => l.action === 'ketdim');
      const dMin = checkInLog ? Number(checkInLog.delayMinutes) || 0 : 0;
      const pAmount = checkInLog ? (checkInLog.penaltyAmount !== undefined ? Number(checkInLog.penaltyAmount) : calculatePenaltyAmount(dMin, penaltySettings)) : 0;

      res.json({
        success: true,
        employee: matched ? {
          id: matched.id,
          fullName: matched.fullName,
          branch: matched.branch,
          position: matched.position
        } : null,
        hasCheckedIn: !!checkInLog,
        checkInTime: checkInLog ? (checkInLog.timeFormatted || checkInLog.checkIn || checkInLog.time) : null,
        hasCheckedOut: !!checkOutLog,
        checkOutTime: checkOutLog ? (checkOutLog.timeFormatted || checkOutLog.checkOut || checkOutLog.time) : null,
        delayMinutes: dMin,
        delayFormatted: formatDelayText(dMin),
        penaltyAmount: pAmount,
        penaltyFormatted: pAmount > 0 ? `${pAmount.toLocaleString()} so'm` : "0 so'm",
        penaltySettings: {
          penaltyRate: penaltySettings.penaltyRate,
          gracePeriodMinutes: penaltySettings.gracePeriodMinutes,
          workStartTime: penaltySettings.workStartTime,
          workEndTime: penaltySettings.workEndTime,
          penaltyType: penaltySettings.penaltyType,
          restDays: penaltySettings.restDays
        },
        todayDate: todayStr,
        todayIso
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: "Bugungi statusni olishda xatolik" });
    }
  };

  app.get("/api/attendance/today-status", handleTodayStatus);
  app.get("/api/qatnashish/today-status", handleTodayStatus);
  app.get("/api/davomat/today-status", handleTodayStatus);
  app.get("/api/qatnashish/bugungi-holat", handleTodayStatus);
  app.get("/api/davomat/bugungi-holat", handleTodayStatus);

  // 4. Davomat Check-in / Check-out ("Keldim" va "Ketdim" tugmasi)
  app.get("/api/attendance/check-in", (req, res) => {
    res.status(405).json({
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Faqat POST so'rovi ruxsat etilgan."
    });
  });

  const handleAttendanceCheckIn = async (req: any, res: any) => {
    try {
      const { 
        employeeId: rawEmpId, 
        employeeName, 
        username,
        branchId, 
        branchName, 
        userLat, 
        userLon,
        action = 'keldim', // 'keldim' yoki 'ketdim'
        capturedPhoto, // jonli kameradan tushirilgan rasm (base64 yoki URL)
        faceVerified,  // yuz tanish kodi tasdiqladimi (true/false)
        faceConfidence, // yuz o'xshashlik foizi (masalan, 0.94)
        sessionToken
      } = req.body;

      // Extract employeeId from Authorization: Bearer token_<empId>_<timestamp> if not in body
      let tokenEmpId: string | null = null;
      const authHeader = req.headers.authorization || '';
      const effectiveToken = sessionToken || (authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '');
      if (effectiveToken && effectiveToken.startsWith('token_')) {
        const parts = effectiveToken.split('_');
        if (parts.length >= 2) {
          tokenEmpId = parts[1];
        }
      }

      const employeeId = rawEmpId || tokenEmpId;

      const latVal = userLat ?? req.body?.lat ?? req.body?.latitude ?? req.body?.coords?.lat ?? req.body?.coordinates?.lat;
      const lonVal = userLon ?? req.body?.lon ?? req.body?.lng ?? req.body?.longitude ?? req.body?.coords?.lon ?? req.body?.coordinates?.lng;

      if (latVal === undefined || lonVal === undefined) {
        return res.status(400).json({
          success: false,
          code: "MISSING_COORDINATES",
          message: "GPS geolokatsiya koordinatalari topilmadi. userLat va userLon parametrlarini yuboring."
        });
      }

      // Xodim ma'lumotlarini bazadan topish
      const allEmployees = await getAllServerEmployees();
      const lookupQuery = employeeId || username || employeeName;
      const emp = (lookupQuery ? findServerEmployee(allEmployees, lookupQuery) : null) || {
        id: employeeId || 'EMP-UNKNOWN',
        fullName: employeeName || 'Noma\'lum Xodim',
        branch: branchName || 'Bosh ofis',
        position: 'Xodim',
        department: 'Savdo',
        photoUrl: 'https://hrms-toyona.vercel.app/zarifjon.jpg'
      };

      // Filialni aniqlash
      const allBranches = await getAllServerGeozones();
      const targetBranch = findMatchingGeozone(
        allBranches,
        branchName || emp.branch,
        branchId
      );

      // Geozonagacha masofani hisoblash
      const numLat = Number(latVal);
      const numLon = Number(lonVal);
      const distance = (!isNaN(numLat) && !isNaN(numLon))
        ? calculateDistanceMeters(numLat, numLon, targetBranch.lat, targetBranch.lon)
        : 0;

      const insideZone = (req.body?.skipGeoCheck === true && hasInternalAdminToken(req)) ? true : (distance <= targetBranch.radius);

      // Vaqt va kechikish hisobi (reja 09:00 yoki penaltySettings bo'yicha)
      const now = new Date();
      const currentHours = Number(now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', hour12: false }));
      const currentMinutes = Number(now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Tashkent', minute: '2-digit', hour12: false }));
      const currentTotalMin = currentHours * 60 + currentMinutes;

      // Rejali boshlanish vaqti
      const [schedH, schedM] = (penaltySettings.workStartTime || "09:00").split(':').map(Number);
      const scheduledTotalMin = (schedH || 9) * 60 + (schedM || 0);
      const gracePeriodMin = Number(penaltySettings.gracePeriodMinutes) || 15;

      const dateIso = getLocalIsoDate(now);
      const dayOfWeek = now.getDay(); // 0: Yakshanba, 1: Dushanba, ...
      const isRestDay = (penaltySettings.restDays || []).includes(dayOfWeek) || (penaltySettings.customHolidays || []).includes(dateIso);

      let delayMinutes = 0;
      let penaltyAmount = 0;

      if (!isRestDay && action === 'keldim' && currentTotalMin > (scheduledTotalMin + gracePeriodMin)) {
        delayMinutes = currentTotalMin - scheduledTotalMin;
        penaltyAmount = calculatePenaltyAmount(delayMinutes, penaltySettings);
      }

      const statusText = isRestDay
        ? (action === 'keldim' ? 'Dam olish kunida kelgan' : 'Dam olish kunida ketdi')
        : (action === 'ketdim' 
            ? 'Ketdi (Ish yakunlandi)' 
            : (delayMinutes > 0 ? `Kech qolgan (${delayMinutes} daqiqa)` : 'Vaqtida kelgan'));

      const timeFormatted = getLocalTimeString(now);
      const dateFormatted = getLocalDateFormatted(now);

      // Bugungi mavjud yozuvlarni tekshiramiz (memory va Firestore)
      const allLogs = await getAllServerAttendanceLogs(emp.id);
      const empLogsToday = allLogs.filter(l => {
        const matchesEmp = l.employeeId === emp.id || 
          (Boolean((emp as any).username) && l.username && l.username.toLowerCase() === String((emp as any).username).toLowerCase()) ||
          (l.employeeName && l.employeeName.toLowerCase() === emp.fullName.toLowerCase());
        const logIso = String(l.dateIso || l.date || l.timestamp || '').slice(0, 10);
        const matchesDate = logIso === dateIso || l.dateFormatted === dateFormatted || (l.date && l.date.includes(dateIso));
        return matchesEmp && matchesDate && l.success;
      });

      const checkInLog = empLogsToday.find(l => l.action === 'keldim' || !l.action);
      const checkOutLog = empLogsToday.find(l => l.action === 'ketdim');

      // Xodim bugun kelgan bo'lsa va yana keldimni bossa - ISHLAMASIN!
      if (action === 'keldim' && checkInLog) {
        const prevTime = checkInLog.timeFormatted || checkInLog.checkIn || checkInLog.time || '';
        return res.status(400).json({
          success: false,
          code: "ALREADY_CHECKED_IN",
          message: `Siz bugun allaqachon "Keldim" deb qayd etilgansiz${prevTime ? ` (soat ${prevTime} da)` : ''}! Takroriy kelish qabul qilinmaydi.`
        });
      }

      // Xodim hali kelmagan bo'lsa - ketdim tugmasi ISHLAMASIN!
      if (action === 'ketdim' && !checkInLog) {
        return res.status(400).json({
          success: false,
          code: "NOT_CHECKED_IN_YET",
          message: `Avval "Keldim" tugmasi orqali ishga kelganingizni tasdiqlashingiz kerak!`
        });
      }

      // Xodim bugun ketgan bo'lsa va yana ketdimni bossa - ISHLAMASIN!
      if (action === 'ketdim' && checkOutLog) {
        const prevTime = checkOutLog.timeFormatted || checkOutLog.checkOut || checkOutLog.time || '';
        return res.status(400).json({
          success: false,
          code: "ALREADY_CHECKED_OUT",
          message: `Siz bugun allaqachon "Ketdim" deb qayd etilgansiz${prevTime ? ` (soat ${prevTime} da)` : ''}! Takroriy ketish qabul qilinmaydi.`
        });
      }

      const newLog = {
        id: `log-${Date.now()}`,
        action,
        timestamp: now.toISOString(),
        timeFormatted,
        dateFormatted,
        dateIso,
        employeeId: emp.id,
        employeeName: emp.fullName,
        position: emp.position,
        branchName: targetBranch.name,
        branchCoords: { lat: targetBranch.lat, lon: targetBranch.lon },
        userCoords: { lat: Number(userLat), lon: Number(userLon) },
        distanceMeters: distance,
        allowedRadiusMeters: targetBranch.radius,
        insideZone,
        status: insideZone 
          ? `${statusText} (${targetBranch.name})` 
          : `Rad etildi (${targetBranch.name} hududidan tashqarida: ${distance}m > ${targetBranch.radius}m)`,
        success: insideZone,
        delayMinutes,
        penaltyAmount,
        penaltyFormatted: penaltyAmount > 0 ? `${penaltyAmount.toLocaleString()} so'm` : "0 so'm",
        isRestDay,
        referencePhotoUrl: emp.photoUrl,
        capturedPhoto: capturedPhoto ? (capturedPhoto.length > 200 ? capturedPhoto.substring(0, 200) + '...' : capturedPhoto) : null,
        faceVerified: faceVerified !== undefined ? faceVerified : true,
        faceConfidence: faceConfidence !== undefined ? Number(faceConfidence) : 0.95
      };

      // 1. Mahalliy xotiraga va faylga qo'shish
      attendanceLogs.unshift(newLog);
      saveLocalAttendance(attendanceLogs);

      // 2. Firestore "attendance" to'plamiga ham sinxron saqlash
      if (insideZone) {
        try {
          await saveFirestoreAttendance({
            id: `att-${emp.id}-${dateIso}`,
            employeeId: emp.id,
            employeeName: emp.fullName,
            branch: targetBranch.name,
            department: emp.department,
            date: dateIso,
            checkIn: action === 'keldim' ? timeFormatted : (checkInLog ? (checkInLog.timeFormatted || checkInLog.checkIn) : undefined),
            checkOut: action === 'ketdim' ? timeFormatted : undefined,
            prevCheckIn: checkInLog ? (checkInLog.timeFormatted || checkInLog.checkIn) : undefined,
            checkInTimestamp: action === 'keldim' ? now.toISOString() : undefined,
            checkOutTimestamp: action === 'ketdim' ? now.toISOString() : undefined,
            status: statusText,
            delayMinutes,
            capturedPhoto: capturedPhoto || '',
            faceVerified: faceVerified !== undefined ? faceVerified : true,
            notes: `${targetBranch.name} (${distance} metr masofada GPS va Yuz tasdiqlandi)`
          });
        } catch (err) {
          console.warn("Firestore attendance write error:", err);
        }
      }

      if (insideZone) {
        return res.json({
          success: true,
          action,
          insideZone: true,
          distance,
          radius: targetBranch.radius,
          time: timeFormatted,
          date: dateFormatted,
          dateIso,
          delayMinutes,
          delayFormatted: formatDelayText(delayMinutes),
          penaltyAmount,
          penaltyFormatted: penaltyAmount > 0 ? `${penaltyAmount.toLocaleString()} so'm` : "0 so'm",
          isRestDay,
          message: action === 'keldim' 
            ? `Muvaffaqiyatli! ${emp.fullName}, siz ${targetBranch.name} hududida (${distance}m) "Keldim" deb qayd etildingiz.${penaltyAmount > 0 ? ` (Kechikish: ${formatDelayText(delayMinutes)}, Jarima: ${penaltyAmount.toLocaleString()} so'm)` : ""}`
            : `Muvaffaqiyatli! ${emp.fullName}, siz ${targetBranch.name} hududida (${distance}m) "Ketdim" deb qayd etildingiz. Xayrli kech!`,
          employee: {
            id: emp.id,
            fullName: emp.fullName,
            branch: targetBranch.name,
            position: emp.position,
            photoUrl: emp.photoUrl
          },
          log: newLog
        });
      } else {
        return res.status(400).json({
          success: false,
          code: "OUTSIDE_GEOFENCE",
          action,
          insideZone: false,
          distance,
          radius: targetBranch.radius,
          message: `Rad etildi! Siz ${targetBranch.name} hududidan tashqaridasiz. Filialgacha masofa: ${distance} metr (Ruxsat etilgan radius: ${targetBranch.radius} metr). Iltimos, filial ichiga kirib qaytadan bosing.`,
          log: newLog
        });
      }
    } catch (err: any) {
      console.error("Attendance check-in error:", err);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Serverda xatolik yuz berdi" });
    }
  };

  app.post("/api/attendance/check-in", handleAttendanceCheckIn);
  app.post("/api/qatnashish/check-in", handleAttendanceCheckIn);
  app.post("/api/davomat/check-in", handleAttendanceCheckIn);

  // Leave status in-memory state for vacation (✈️) and business trip (🍃)
  let employeeLeaveStatuses: Record<string, { isVacation: boolean; isTrip: boolean; note?: string }> = {};

  // 5. Mini app yoki xodimlar uchun rasmiy xodimlar va loginlar ro'yxati (Ta'tilda / Safarda holatlari bilan)
  app.get("/api/attendance/employees", async (req, res) => {
    try {
      const all = await getAllServerEmployees();
      const sanitized = all.map(e => {
        const leave = employeeLeaveStatuses[e.id] || { isVacation: false, isTrip: false };
        let leaveBadge = "Ishda";
        if (leave.isVacation) leaveBadge = "✈️ Ta'tilda";
        else if (leave.isTrip) leaveBadge = "🍃 Ish safarida";

        return {
          id: e.id,
          firestoreId: e.id,
          staffId: e.staffId,
          fullName: e.fullName,
          position: e.position,
          lavozim: e.position,
          branch: e.branch,
          filial: e.branch,
          department: e.department,
          phone: e.phone || '',
          email: e.email || '',
          avatarUrl: e.avatarUrl || e.photoUrl,
          photoUrl: e.photoUrl,
          rasmUrl: e.rasmUrl || e.photoUrl,
          username: e.id === 'emp-101' ? '' : e.username,
          login: e.id === 'emp-101' ? '' : e.username,
          isAccountActive: e.isAccountActive !== false,
          accountCreatedAt: e.accountCreatedAt || '2026-10-12',
          salary: e.salary || '4,000,000 UZS',
          hireDate: e.hireDate || '2026-01-01',
          birthDate: e.birthDate || '',
          gender: e.gender || 'Erkak',
          address: e.address || '',
          status: e.status,
          isVacationActive: leave.isVacation,
          isTripActive: leave.isTrip,
          leaveStatusBadge: leaveBadge,
          leaveNote: leave.note || ''
        };
      });
      res.json(sanitized);
    } catch (err: any) {
      res.status(500).json([]);
    }
  });

  app.post("/api/attendance/employees", async (req, res) => {
    try {
      const emp = req.body || {};
      const id = String(emp.id || emp.firestoreId || `emp-${Date.now()}`).trim();
      deletedEmployeeIds.delete(id);

      const currentList = loadLocalEmployees();
      const existingIdx = currentList.findIndex(x => x.id === id);
      const existing = existingIdx >= 0 ? currentList[existingIdx] : (defaultEmployees.find(x => x.id === id) || {} as Partial<ServerEmployee>);
      const photo = emp.avatarUrl || emp.photoUrl || emp.rasmUrl || existing.photoUrl || 'https://hrms-toyona.vercel.app/zarifjon.jpg';

      const merged: ServerEmployee = {
        id,
        staffId: emp.staffId || existing.staffId || 'TS-0001',
        fullName: emp.fullName || existing.fullName || 'Xodim',
        position: emp.position || existing.position || 'Mutaxassis',
        department: emp.department || existing.department || 'Savdo',
        branch: emp.branch || existing.branch || 'Bosh ofis',
        phone: emp.phone ?? existing.phone ?? '',
        email: emp.email ?? existing.email ?? '',
        photoUrl: photo,
        avatarUrl: photo,
        rasmUrl: photo,
        username: emp.username !== undefined ? emp.username : (existing.username || ''),
        password: emp.password !== undefined ? emp.password : (existing.password || ''),
        status: emp.status || existing.status || 'active',
        isAccountActive: emp.isAccountActive !== undefined ? Boolean(emp.isAccountActive) : (existing.isAccountActive ?? true),
        accountCreatedAt: emp.accountCreatedAt || existing.accountCreatedAt || new Date().toISOString().split('T')[0],
        salary: emp.salary || existing.salary || '4,000,000 UZS',
        hireDate: emp.hireDate || existing.hireDate || new Date().toISOString().split('T')[0],
        birthDate: emp.birthDate || existing.birthDate || '',
        gender: emp.gender || existing.gender || 'Erkak',
        address: emp.address || existing.address || ''
      };

      const defIdx = defaultEmployees.findIndex(x => x.id === id);
      if (defIdx >= 0) {
        defaultEmployees[defIdx] = merged;
      } else {
        defaultEmployees.push(merged);
      }

      if (existingIdx >= 0) {
        currentList[existingIdx] = merged;
      } else {
        currentList.push(merged);
      }
      saveLocalEmployees(currentList);
      firestoreDocFallbackCache.delete(`employees/${id}`);

      const { password: _p, ...safeEmp } = merged;
      res.json({ success: true, employee: safeEmp });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 5a. Xodim yoki uning davomat hisobini serverdan to'liq o'chirish (hech qachon qayta tirilmaydi)
  app.delete("/api/attendance/employees/:id", async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      if (!id) return res.status(400).json({ success: false, message: "ID ko'rsatilmadi" });

      deletedEmployeeIds.add(id);

      // Agar Firestore sozlangan bo'lsa, employees to'plamidan ham to'g'ridan-to'g'ri o'chiramiz
      if (firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId && firebaseConfig?.apiKey) {
        const deleteUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/employees/${id}?key=${firebaseConfig.apiKey}`;
        fetch(deleteUrl, { method: 'DELETE' }).catch(() => {});
      }

      console.log(`[DELETE] Xodim muvaffaqiyatli o'chirildi: ${id}`);
      res.json({ success: true, message: `Xodim (${id}) serverdan o'chirildi` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 5b. Xodimning ta'til (✈️) yoki safar (🍃) holatini sinxronlash (Narigi AI yoki HR tizimi chaqirishi mumkin)
  const handleLeaveSync = (req: any, res: any) => {
    const { employeeId, username, status, isVacation, isTrip, note } = req.body;
    const targetId = employeeId || username;
    if (!targetId) {
      return res.status(400).json({ success: false, message: "employeeId yoki username kiritilmadi" });
    }

    const vac = isVacation ?? (status === 'tatilda' || status === 'vacation');
    const trip = isTrip ?? (status === 'safarda' || status === 'trip' || status === 'business_trip');

    employeeLeaveStatuses[targetId] = {
      isVacation: !!vac,
      isTrip: !!trip,
      note: note || ''
    };

    res.json({
      success: true,
      employeeId: targetId,
      isVacationActive: !!vac,
      isTripActive: !!trip,
      badge: vac ? "✈️ Ta'tilda (Samolyot)" : (trip ? "🍃 Ish safarida (Barg)" : "Ishda"),
      message: "Xodim ta'til/safar holati HRMS tizimida yangilandi."
    });
  };

  app.post("/api/attendance/leave-sync", handleLeaveSync);
  app.post("/api/qatnashish/leave-sync", handleLeaveSync);
  app.post("/api/davomat/leave-sync", handleLeaveSync);
  app.post("/api/qatnashish/tatil-sync", handleLeaveSync);
  app.post("/api/davomat/tatil-sync", handleLeaveSync);

  // 6. Mini app AI uchun to'liq API qo'llanmasi (JSON formatida)
  app.get("/api/attendance/docs", (req, res) => {
    const host = req.get('host') || 'ais-pre-bk2ecsa4uidxq66izqrrgk-913174961397.asia-east1.run.app';
    const baseUrl = `${req.protocol}://${host}`;
    res.json({
      title: "Toyona HRMS - Davomat, Face ID va Geolokatsiya Integratsiya Shartnomasi (Xat & Protokol)",
      version: "2.1.0",
      baseUrl,
      overview: "Ushbu API Toyona HRMS asosiy tizimi bilan tashqi Face ID va 'Keldim/Ketdim' davomat mini app kodi o'rtasida to'liq sinxronizatsiyani ta'minlaydi.",
      rules: {
        workStartTime: "09:00",
        gracePeriodMinutes: 15,
        lateCalculation: "09:15 dan keyingi har bir daqiqa kechikish hisoblanadi (delayMinutes = currentMinutes - 09:00Minutes)",
        geolocationCheck: "Haversine formulasi bo'yicha masofa (distance) hisoblanadi. distance <= branch.radius bo'lsa qabul qilinadi, aks holda 400 qaytariladi.",
        leaveIndicators: "Xodim ta'tilda (✈️) yoki safarda (🍃) bo'lsa, davomat ilovasida mos indikator yonib turishi shart."
      },
      endpoints: {
        login: {
          method: "POST",
          url: "/api/attendance/login",
          description: "Xodim login va paroli bilan kirishi. Faqat shu xodimning ism-familiyasi, filiali, lavozimi, login-paroli, saqlangan etalon rasmi va filial geozonasi (lat, lon, radius) qaytadi.",
          requestBody: {
            username: "qodirov.alisher (yoki login)",
            password: "Toyona#2026 (yoki parol)"
          },
          responseExample: {
            success: true,
            employee: {
              id: "emp-102",
              fullName: "Alisher Qodirov",
              position: "HR Menejer",
              branch: "Turkiston filiali",
              photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
              username: "qodirov.alisher"
            },
            branchGeozone: {
              name: "Turkiston filiali",
              lat: 40.5283,
              lon: 70.9425,
              radius: 100
            }
          }
        },
        getPhoto: {
          method: "GET",
          url: "/api/attendance/employee-photo?employeeId=emp-102",
          description: "Keldim bosilganda xodimning saqlangan etalon rasmini olish (yuz tanish kodi solishtirishi uchun).",
          responseExample: {
            success: true,
            employeeId: "emp-102",
            fullName: "Alisher Qodirov",
            photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"
          }
        },
        checkIn: {
          method: "POST",
          url: "/api/attendance/check-in",
          description: "Keldim yoki Ketdim tugmasi bosilganda GPS va yuz tasdiqlash natijasini yuborish. HRMS geozonani va kechikishni avtomatik hisoblab saqlaydi.",
          requestBody: {
            employeeId: "emp-102",
            action: "keldim (yoki ketdim)",
            userLat: 40.5283,
            userLon: 70.9425,
            capturedPhoto: "data:image/jpeg;base64,...",
            faceVerified: true,
            faceConfidence: 0.96
          },
          responseExampleSuccess: {
            success: true,
            action: "keldim",
            insideZone: true,
            distance: 18,
            radius: 100,
            time: "08:52",
            date: "08.10.2026",
            delayMinutes: 0,
            message: "Muvaffaqiyatli! Alisher Qodirov, siz Turkiston filiali hududida (18m) 'Keldim' deb qayd etildingiz."
          },
          responseExampleOutsideGeofence: {
            success: false,
            action: "keldim",
            insideZone: false,
            distance: 450,
            radius: 100,
            message: "Rad etildi! Siz Turkiston filiali hududidan tashqaridasiz. Filialgacha masofa: 450 metr (Ruxsat: 100 metr)."
          }
        },
        leaveSync: {
          method: "POST",
          url: "/api/attendance/leave-sync",
          description: "Xodimning ta'til (✈️) yoki xizmat safari (🍃) holatini yangilash/sinxronlash",
          requestBody: {
            employeeId: "emp-102",
            status: "tatilda (yoki safarda / ishda)",
            note: "Yillik mehnat ta'tili"
          }
        },
        todayStatus: {
          method: "GET",
          url: "/api/attendance/today-status?employeeId=emp-102",
          description: "Xodimning bugungi kelgan/ketgan vaqtlari"
        },
        employeesList: {
          method: "GET",
          url: "/api/attendance/employees",
          description: "Barcha xodimlar, ularning login-parollari, biriktirilgan filiali, etalon rasmi va ta'til/safar (✈️/🍃) holatlari ro'yxati"
        },
        branchesList: {
          method: "GET",
          url: "/api/branch-geozones",
          description: "Barcha filiallar koordinatalari (lat, lon) va ruxsat etilgan radiuslari (metrda)"
        }
      }
    });
  });

  // 7. Davomat tarixi va kechikishlar hisoboti (oy bo'yicha filter va statistika)
  const handleAttendanceHistory = async (req: any, res: any) => {
    const employeeId = (req.query.employeeId || req.query.id || '').toString().trim();
    if ((!employeeId || employeeId === 'all') && !hasInternalAdminToken(req)) {
      return res.status(403).json({ success: false, message: "Ruxsatsiz so'rov bloklandi" });
    }
    const month = (req.query.month || '').toString(); // masalan "2026-10" yoki "10"
    const year = (req.query.year || '2026').toString();

    const allLogs = await getAllServerAttendanceLogs(employeeId);
    let filtered = [...allLogs];

    if (employeeId && employeeId !== 'all') {
      filtered = filtered.filter(l => 
        l.employeeId === employeeId || 
        (l.username && l.username.toLowerCase() === employeeId.toLowerCase())
      );
    }

    if (month) {
      filtered = filtered.filter(l => {
        const dIso = l.dateIso || l.timestamp || '';
        const dUz = l.dateFormatted || '';
        return dIso.includes(month) || dUz.includes(month);
      });
    }

    if (year) {
      filtered = filtered.filter(l => {
        const dIso = l.dateIso || l.timestamp || '';
        const dUz = l.dateFormatted || '';
        return dIso.includes(year) || dUz.includes(year);
      });
    }

    // Statistika va Jarimalar hisobi
    const totalRecords = filtered.length;
    const checkIns = filtered.filter(l => l.action === 'keldim' && l.success);
    const checkOuts = filtered.filter(l => l.action === 'ketdim' && l.success);
    const onTimeCount = checkIns.filter(l => (l.delayMinutes || 0) === 0).length;
    const lateCount = checkIns.filter(l => (l.delayMinutes || 0) > 0).length;
    const totalDelayMinutes = checkIns.reduce((sum, l) => sum + (l.delayMinutes || 0), 0);
    const averageDelayMinutes = lateCount > 0 ? Math.round(totalDelayMinutes / lateCount) : 0;

    // Har bir log uchun joriy penaltySettings bo'yicha jarimani aniqlash
    const logsWithPenalties = filtered.map(l => {
      const dMin = Number(l.delayMinutes) || 0;
      const penalty = l.penaltyAmount !== undefined ? Number(l.penaltyAmount) : calculatePenaltyAmount(dMin, penaltySettings);
      return {
        ...l,
        delayFormatted: formatDelayText(dMin),
        penaltyAmount: penalty,
        penaltyFormatted: penalty > 0 ? `${penalty.toLocaleString()} so'm` : "0 so'm"
      };
    });

    const totalPenaltyAmount = logsWithPenalties
      .filter(l => l.action === 'keldim' && l.success)
      .reduce((sum, l) => sum + (l.penaltyAmount || 0), 0);

    res.json({
      success: true,
      query: {
        employeeId: employeeId || 'all',
        month: month || 'joriy_oy',
        year
      },
      summary: {
        totalRecords,
        totalCheckIns: checkIns.length,
        totalCheckOuts: checkOuts.length,
        onTimeCount,
        lateCount,
        totalDelayMinutes,
        totalDelayFormatted: formatDelayText(totalDelayMinutes),
        averageDelayMinutes,
        averageDelayFormatted: formatDelayText(averageDelayMinutes),
        totalPenaltyAmount,
        totalPenaltyFormatted: `${totalPenaltyAmount.toLocaleString()} so'm`,
        workStartTime: penaltySettings.workStartTime,
        gracePeriodMinutes: penaltySettings.gracePeriodMinutes,
        penaltyType: penaltySettings.penaltyType,
        penaltyRate: penaltySettings.penaltyRate,
        restDays: penaltySettings.restDays
      },
      penaltySettings,
      logs: logsWithPenalties
    });
  };

  // Penalty and Holiday settings API (GET & POST)
  app.get("/api/attendance/penalty-settings", (req, res) => {
    res.json({
      success: true,
      settings: penaltySettings
    });
  });

  app.post("/api/attendance/penalty-settings", (req, res) => {
    try {
      const { workStartTime, workEndTime, gracePeriodMinutes, penaltyType, penaltyRate, restDays, customHolidays } = req.body || {};
      if (workStartTime !== undefined) penaltySettings.workStartTime = String(workStartTime).trim();
      if (workEndTime !== undefined) penaltySettings.workEndTime = String(workEndTime).trim();
      if (gracePeriodMinutes !== undefined) penaltySettings.gracePeriodMinutes = Math.max(0, Number(gracePeriodMinutes) || 0);
      if (penaltyType === 'minute' || penaltyType === 'hour') penaltySettings.penaltyType = penaltyType;
      if (penaltyRate !== undefined) penaltySettings.penaltyRate = Math.max(0, Number(penaltyRate) || 0);
      if (Array.isArray(restDays)) penaltySettings.restDays = restDays.map(Number);
      if (Array.isArray(customHolidays)) penaltySettings.customHolidays = customHolidays;
      penaltySettings.updatedAt = new Date().toISOString();

      res.json({
        success: true,
        message: "Jarima va dam olish kunlari sozlamalari muvaffaqiyatli yangilandi!",
        settings: penaltySettings
      });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e?.message || "Sozlamalarni saqlashda xatolik" });
    }
  });

  app.get("/api/attendance/history", handleAttendanceHistory);
  app.get("/api/qatnashish/tarix", handleAttendanceHistory);
  app.get("/api/davomat/tarix", handleAttendanceHistory);

  app.get("/api/attendance/logs", async (req, res) => {
    const logs = await getAllServerAttendanceLogs();
    res.json(logs);
  });

  // 8. API Catch-all 404: Hech qanday ichki endpoint xaritasi oshkor qilinmaydi
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      code: "NOT_FOUND",
      message: "Manzil topilmadi"
    });
  });
}

export async function startServer(appInstance: express.Express = app) {
  const PORT = Number(process.env.PORT) || 3000;

  // Vite middleware for development (ONLY in local development, NEVER in Serverless/Vercel)
  if (!process.env.VERCEL && !process.env.SERVERLESS && process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    appInstance.use(vite.middlewares);
  } else if (!process.env.VERCEL && !process.env.SERVERLESS) {
    const distPath = path.join(process.cwd(), 'dist');
    appInstance.use(express.static(distPath));
    appInstance.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL && !process.env.SERVERLESS && process.env.NODE_ENV !== 'test') {
    appInstance.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

function calculateAge(dobStr: string) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  const diff_ms = Date.now() - dob.getTime();
  const age_dt = new Date(diff_ms); 
  return Math.abs(age_dt.getUTCFullYear() - 1970);
}

if (!process.env.VERCEL && !process.env.SERVERLESS) {
  configureRoutes(app).then(() => {
    startServer(app);
  });
}
