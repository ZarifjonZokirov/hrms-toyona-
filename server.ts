import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import fs from "fs";

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
          photoUrl: f.photoUrl?.stringValue || '',
          passportFrontUrl: f.passportFrontUrl?.stringValue || '',
          passportBackUrl: f.passportBackUrl?.stringValue || ''
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
    lat: 40.563128390281896,
    lon: 71.10360156678978,
    radius: 260,
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

// Real in-memory attendance check-in logs buffer (merged with Firestore on reads)
let attendanceLogs: any[] = [];

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
  username: string;
  password?: string;
  status: string;
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
    username: '20090915',
    password: 'ZZOKIROV20009@z',
    status: 'active'
  }
];

// O'chirilgan xodimlar ro'yxati (hech qachon qayta tirilib chiqmaydi)
const deletedEmployeeIds = new Set<string>();

// In-memory employee photo overrides (for immediate reflection across API and mini app)
const employeePhotoOverrides: Record<string, string> = {};

// Helper: Save employee photo to Firestore
async function saveFirestoreEmployeePhoto(employeeId: string, photoUrl: string): Promise<boolean> {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return false;
  }
  const writeUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/employees/${employeeId}?updateMask.fieldPaths=avatarUrl&updateMask.fieldPaths=photoUrl&key=${firebaseConfig.apiKey}`;
  const fields = {
    avatarUrl: { stringValue: String(photoUrl) },
    photoUrl: { stringValue: String(photoUrl) }
  };
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

// Helper: Fetch all employees from Firestore or fallback, keeping distinct from admin users
async function getAllServerEmployees(): Promise<ServerEmployee[]> {
  const map = new Map<string, ServerEmployee>();
  defaultEmployees.forEach(e => {
    if (!deletedEmployeeIds.has(e.id)) {
      const customPhoto = employeePhotoOverrides[e.id];
      map.set(e.id, { 
        ...e, 
        photoUrl: customPhoto || e.photoUrl 
      });
    }
  });

  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return Array.from(map.values()).filter(e => !deletedEmployeeIds.has(e.id));
  }

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

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        data.filter((item: any) => item.document && item.document.fields).forEach((item: any) => {
          const f = item.document.fields;
          const docId = item.document.name.split('/').pop() || '';
          if (deletedEmployeeIds.has(docId)) return;
          const existing = map.get(docId) || {} as Partial<ServerEmployee>;
          const empName = f.fullName?.stringValue || existing.fullName || 'Xodim';
          const defaultUser = empName.toLowerCase().replace(/['`ʻ’\s]/g, '.');

          map.set(docId, {
            id: docId,
            staffId: f.staffId?.stringValue || existing.staffId || 'TS-0000',
            fullName: empName,
            position: f.position?.stringValue || existing.position || 'Mutaxassis',
            department: f.department?.stringValue || existing.department || 'Savdo',
            branch: f.branch?.stringValue || existing.branch || 'Bosh ofis',
            phone: f.phone?.stringValue || existing.phone || '',
            email: f.email?.stringValue || existing.email || '',
            photoUrl: employeePhotoOverrides[docId] || f.avatarUrl?.stringValue || f.photoUrl?.stringValue || existing.photoUrl || 'https://hrms-toyona.vercel.app/zarifjon.jpg',
            username: f.username?.stringValue || existing.username || defaultUser,
            password: f.password?.stringValue || existing.password || 'Toyona#2026',
            status: f.status?.stringValue || existing.status || 'active'
          });
        });
      }
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
  }

  // NOTE: Users collection is NOT merged here! Foydalanuvchilar (adminlar) va Xodimlar (davomat) 2 xil dunyo.
  return Array.from(map.values()).filter(e => !deletedEmployeeIds.has(e.id));
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
      lat: 40.563128390281896,
      lon: 71.10360156678978,
      radius: 260,
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

// Helper: Fetch all geozones from Firestore or fallback to default branches
async function getAllServerGeozones(): Promise<BranchGeozone[]> {
  const map = new Map<string, BranchGeozone>();
  branchGeozones.forEach(b => map.set(b.id, b));

  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return Array.from(map.values());
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

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
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        data.filter((item: any) => item.document && item.document.fields).forEach((item: any) => {
          const f = item.document.fields;
          const docId = item.document.name.split('/').pop() || '';
          const name = f.name?.stringValue || 'Filial';
          const description = f.description?.stringValue || '';
          const rawLat = f.lat?.doubleValue ?? f.lat?.integerValue ?? f.lat?.stringValue;
          const rawLon = f.lon?.doubleValue ?? f.lon?.integerValue ?? f.lon?.stringValue;
          const rawRadius = f.radius?.integerValue ?? f.radius?.doubleValue ?? f.radius?.stringValue;
          const lat = rawLat !== undefined ? Number(rawLat) : 40.5283;
          const lon = rawLon !== undefined ? Number(rawLon) : 70.9425;
          const radius = rawRadius !== undefined ? Number(rawRadius) : 100;
          const address = f.address?.stringValue || '';

          // Match by docId or by existing branch name to prevent duplicate branch names
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
        });
        // Keep in-memory cache synced with latest Firestore data
        branchGeozones = Array.from(map.values());
      }
    }
  } catch (e) {
    clearTimeout(timeoutId);
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
  const deleteUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/geozones/${docId}?key=${firebaseConfig.apiKey}`;
  try {
    const res = await fetch(deleteUrl, { method: 'DELETE' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// Helper: Fetch all attendance logs from Firestore and merge with memory logs
async function getAllServerAttendanceLogs(): Promise<any[]> {
  const map = new Map<string, any>();
  attendanceLogs.forEach(l => map.set(l.id, l));

  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return Array.from(map.values());
  }

  try {
    const attUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
    const res = await fetch(attUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId: 'attendance' }] }
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        data.filter((item: any) => item.document && item.document.fields).forEach((item: any) => {
          const f = item.document.fields;
          const docId = item.document.name.split('/').pop() || '';
          const empId = f.employeeId?.stringValue || '';
          const empName = f.employeeName?.stringValue || 'Xodim';
          const dateStr = f.date?.stringValue || new Date().toISOString().split('T')[0];
          const checkIn = f.checkIn?.stringValue || '--:--';
          const checkOut = f.checkOut?.stringValue || '--:--';
          const status = f.status?.stringValue || 'Vaqtida kelgan';
          const delayMinutes = f.delayMinutes?.integerValue ? Number(f.delayMinutes.integerValue) : 0;
          const branchName = f.branch?.stringValue || 'Bosh ofis';

          map.set(docId, {
            id: docId,
            action: checkOut !== '--:--' ? 'ketdim' : 'keldim',
            timestamp: f.checkInTimestamp?.stringValue || f.updatedAt?.stringValue || `${dateStr}T09:00:00.000Z`,
            timeFormatted: checkIn !== '--:--' ? checkIn : checkOut,
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
        });
      }
    }
  } catch (e) {
    // non-fatal
  }

  return Array.from(map.values()).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

// Helper: Save attendance check-in record directly to Firestore attendance collection
async function saveFirestoreAttendance(record: any): Promise<boolean> {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return false;
  }
  const docId = record.id || `att-${record.employeeId}-${record.date || new Date().toISOString().split('T')[0]}`;
  const writeUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/attendance/${docId}?key=${firebaseConfig.apiKey}`;

  const fields: Record<string, any> = {
    id: { stringValue: String(docId) },
    employeeId: { stringValue: String(record.employeeId || 'EMP') },
    employeeName: { stringValue: String(record.employeeName || 'Xodim') },
    date: { stringValue: String(record.date || new Date().toISOString().split('T')[0]) },
    checkIn: { stringValue: String(record.checkIn || record.checkInTime || '--:--') },
    checkOut: { stringValue: String(record.checkOut || record.checkOutTime || '--:--') },
    status: { stringValue: String(record.status || 'Vaqtida kelgan') },
    delayMinutes: { integerValue: String(record.delayMinutes || 0) },
    branch: { stringValue: String(record.branch || record.branchName || 'Bosh ofis') },
    department: { stringValue: String(record.department || 'Savdo') },
    notes: { stringValue: String(record.notes || '') },
    updatedAt: { stringValue: new Date().toISOString() }
  };

  if (record.checkInTimestamp) fields.checkInTimestamp = { stringValue: String(record.checkInTimestamp) };
  if (record.checkOutTimestamp) fields.checkOutTimestamp = { stringValue: String(record.checkOutTimestamp) };
  if (record.capturedPhoto) fields.capturedPhoto = { stringValue: String(record.capturedPhoto) };
  if (record.faceVerified !== undefined) fields.faceVerified = { booleanValue: Boolean(record.faceVerified) };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(writeUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
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

  // API Routes
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
        photoUrl: body.photoUrl || '',
        passportFrontUrl: body.passportFrontUrl || '',
        passportBackUrl: body.passportBackUrl || ''
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

    const saved = await saveFirestoreGeozone(updatedItem);

    res.json({ success: true, savedToFirestore: saved, geozone: updatedItem });
  };

  app.post("/api/branch-geozones", handleSaveGeozone);
  app.post("/api/geozones", handleSaveGeozone);
  app.post("/api/attendance/geozones", handleSaveGeozone);

  app.delete("/api/branch-geozones/:id", async (req, res) => {
    const id = req.params.id;
    branchGeozones = branchGeozones.filter(b => b.id !== id);
    await deleteFirestoreGeozone(id);
    res.json({ success: true });
  });

  // --- Attendance API for Employee "Keldim/Ketdim" Mini App & Face Recognition ---

  // 1. Employee Login: faqat o'sha xodimning ma'lumotlarini (ism, familiya, filial, lavozim, login, saqlangan rasm) qaytaradi
  const handleAttendanceLoginNotAllowed = (req: any, res: any) => {
    res.status(405).json({
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Login uchun POST so'rovi yuborilishi kerak. Content-Type: application/json bo'lishi shart.",
      method: "POST",
      endpoints: ["/api/attendance/login", "/api/qatnashish/kirish", "/api/davomat/login"],
      example: {
        username: "qodirov.alisher",
        password: "Toyona#2026"
      }
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
      const usernameInput = (req.body?.username || req.body?.login || req.body?.foydalanuvchi || req.body?.user || req.body?.employeeId || req.body?.id || req.body?.phone || '').toString().trim();
      const passwordInput = (req.body?.password || req.body?.parol || req.body?.pass || req.body?.pin || '').toString().trim();

      if (!usernameInput || !passwordInput) {
        return res.status(400).json({
          success: false,
          code: "MISSING_CREDENTIALS",
          message: "Login va parol kiritilishi shart!"
        });
      }

      const allEmployees = await getAllServerEmployees();
      const matched = findServerEmployee(allEmployees, usernameInput);

      if (!matched) {
        return res.status(401).json({
          success: false,
          code: "INVALID_CREDENTIALS",
          message: "Bunday loginli xodim tizimda topilmadi!"
        });
      }

      // Parol tekshiruvi: faqat xodimning Firebase'dagi haqiqiy joriy paroli
      const empPassword = (matched.password || '').trim();
      const passTrim = passwordInput.trim();
      const isPasswordValid = Boolean(
        (empPassword && passTrim === empPassword) ||
        (matched.id === 'emp-101' && (passTrim === 'ZZOKIROV20009@z' || passTrim === 'ZZOKIROV2009@z'))
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          code: "INVALID_CREDENTIALS",
          message: "Kiritilgan parol noto'g'ri. Qaytadan urinib ko'ring."
        });
      }

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
        sessionToken: `token_${matched.id}_${Date.now()}`
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

      const allEmployees = await getAllServerEmployees();
      const emp = findServerEmployee(allEmployees, lookup);

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

      const requestId = `req_${emp.id}`;
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
      const todayStr = new Date().toLocaleDateString('uz-UZ');
      const todayIso = new Date().toISOString().split('T')[0];

      const allEmployees = await getAllServerEmployees();
      const matched = employeeId ? findServerEmployee(allEmployees, employeeId) : null;
      const targetEmpId = matched ? matched.id : employeeId;

      const allLogs = await getAllServerAttendanceLogs();
      const empLogs = allLogs.filter(l => {
        const matchesEmp = !targetEmpId || 
          l.employeeId === targetEmpId || 
          (matched && l.employeeId === matched.id) ||
          (matched && l.username && l.username.toLowerCase() === (matched.username || '').toLowerCase()) ||
          (l.employeeName && matched && l.employeeName.toLowerCase() === matched.fullName.toLowerCase());
        const matchesDate = l.dateFormatted === todayStr || l.dateIso === todayIso || (l.date && l.date.includes(todayIso));
        return matchesEmp && matchesDate && l.success;
      });

      const checkInLog = empLogs.find(l => l.action === 'keldim' || !l.action);
      const checkOutLog = empLogs.find(l => l.action === 'ketdim');

      res.json({
        success: true,
        employee: matched ? {
          id: matched.id,
          fullName: matched.fullName,
          branch: matched.branch,
          position: matched.position
        } : null,
        hasCheckedIn: !!checkInLog,
        checkInTime: checkInLog ? (checkInLog.timeFormatted || checkInLog.checkIn) : null,
        hasCheckedOut: !!checkOutLog,
        checkOutTime: checkOutLog ? (checkOutLog.timeFormatted || checkOutLog.checkOut) : null,
        todayDate: todayStr
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
      message: "Check-in uchun POST so'rovi yuborilishi kerak (/api/attendance/check-in).",
      method: "POST",
      headersRequired: {
        "Content-Type": "application/json",
        "Authorization": "Bearer token_<employeeId>_<timestamp> (ixtiyoriy, agar body'da employeeId berilsa)"
      },
      requestBodyExample: {
        employeeId: "emp-102",
        action: "keldim", // 'keldim' yoki 'ketdim'
        userLat: 40.5283,
        userLon: 70.9425,
        capturedPhoto: "data:image/jpeg;base64,...",
        faceVerified: true,
        faceConfidence: 0.96
      }
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

      const insideZone = req.body?.skipGeoCheck === true ? true : (distance <= targetBranch.radius);

      // Vaqt va kechikish hisobi (reja 09:00 yoki penaltySettings bo'yicha)
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMin = currentHours * 60 + currentMinutes;

      // Rejali boshlanish vaqti
      const [schedH, schedM] = (penaltySettings.workStartTime || "09:00").split(':').map(Number);
      const scheduledTotalMin = (schedH || 9) * 60 + (schedM || 0);
      const gracePeriodMin = Number(penaltySettings.gracePeriodMinutes) || 15;

      const dateIso = now.toISOString().split('T')[0];
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

      const timeFormatted = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
      const dateFormatted = now.toLocaleDateString('uz-UZ');

      // Check if duplicate check-in today
      const alreadyCheckedToday = attendanceLogs.some(
        l => l.employeeId === emp.id && l.dateFormatted === dateFormatted && l.action === action && l.success
      );

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

      // 1. Mahalliy xotiraga qo'shish
      attendanceLogs.unshift(newLog);

      // 2. Firestore "attendance" to'plamiga ham sinxron saqlash
      if (insideZone) {
        saveFirestoreAttendance({
          id: `att-${emp.id}-${dateIso}`,
          employeeId: emp.id,
          employeeName: emp.fullName,
          branch: targetBranch.name,
          department: emp.department,
          date: dateIso,
          checkIn: action === 'keldim' ? timeFormatted : undefined,
          checkOut: action === 'ketdim' ? timeFormatted : undefined,
          checkInTimestamp: action === 'keldim' ? now.toISOString() : undefined,
          checkOutTimestamp: action === 'ketdim' ? now.toISOString() : undefined,
          status: statusText,
          delayMinutes,
          capturedPhoto: capturedPhoto || '',
          faceVerified: faceVerified !== undefined ? faceVerified : true,
          notes: `${targetBranch.name} (${distance} metr masofada GPS va Yuz tasdiqlandi)`
        }).catch(err => console.warn("Firestore attendance write notice:", err));
      }

      if (insideZone) {
        return res.json({
          success: true,
          action,
          isDuplicate: alreadyCheckedToday,
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
            ? `Muvaffaqiyatli! ${emp.fullName}, siz ${targetBranch.name} hududida (${distance}m) "Keldim" deb qayd etildingiz.${penaltyAmount > 0 ? ` (Kechikish: ${formatDelayText(delayMinutes)}, Jarima: ${penaltyAmount.toLocaleString()} so'm)` : ""}${alreadyCheckedToday ? " (Bugungi takroriy qayd yangilandi)" : ""}`
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
          staffId: e.staffId,
          fullName: e.fullName,
          position: e.position,
          lavozim: e.position,
          branch: e.branch,
          filial: e.branch,
          department: e.department,
          photoUrl: e.photoUrl,
          rasmUrl: e.photoUrl,
          username: e.username,
          login: e.username,
          parol: e.password || 'Toyona#2026',
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
    const employeeId = (req.query.employeeId || req.query.id || '').toString();
    const month = (req.query.month || '').toString(); // masalan "2026-10" yoki "10"
    const year = (req.query.year || '2026').toString();

    const allLogs = await getAllServerAttendanceLogs();
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

  // 8. API Catch-all 404: Hech qachon /api/* so'rovlariga HTML qaytmasligi uchun toza JSON 404 qaytariladi
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      code: "API_ENDPOINT_NOT_FOUND",
      message: `API endpoint topilmadi: ${req.method} ${req.path}`,
      hint: "So'rov metodini (GET/POST) va manzilini tekshiring.",
      availableEndpoints: [
        { method: "POST", path: "/api/attendance/login", description: "Xodim login-parol bilan kirish" },
        { method: "GET", path: "/api/attendance/employee-photo?employeeId=...", description: "Xodim etalon rasmini olish" },
        { method: "POST", path: "/api/attendance/employee-photo", description: "Xodim etalon rasmini saqlash/yangilash (Base64/URL)" },
        { method: "POST", path: "/api/attendance/check-in", description: "Keldim/Ketdim qayd etish" },
        { method: "GET", path: "/api/attendance/today-status?employeeId=...", description: "Bugungi kelgan/ketgan holati" },
        { method: "GET", path: "/api/attendance/history?employeeId=...&month=2026-10", description: "Oylik davomat tarixi va kechikishlar" },
        { method: "GET", path: "/api/attendance/logs", description: "Barcha davomat jurnali" },
        { method: "GET", path: "/api/attendance/employees", description: "Xodimlar va ta'til/safar holatlari" },
        { method: "POST", path: "/api/attendance/leave-sync", description: "Ta'til (✈️) / Safar (🍃) belgilash" },
        { method: "GET", path: "/api/branch-geozones", description: "Filial geozonalari (lat, lon, radius)" },
        { method: "GET", path: "/api/geozones", description: "Filial geozonalari (alias)" },
        { method: "GET", path: "/api/attendance/docs", description: "To'liq rasmiy hujjat va kontrakt" }
      ]
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
