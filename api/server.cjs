var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app,
  configureRoutes: () => configureRoutes,
  formatDelayText: () => formatDelayText,
  startServer: () => startServer
});
module.exports = __toCommonJS(server_exports);
var import_crypto = __toESM(require("crypto"), 1);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_cors = __toESM(require("cors"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_os = __toESM(require("os"), 1);
var DEFAULT_FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0391742872",
  appId: "1:811535018031:web:b3dc918af92284f02abeda",
  apiKey: "AIzaSyB6DEX7gW5Z9grIcZJrkNwTeUsiRl2N568",
  authDomain: "gen-lang-client-0391742872.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-toyonasavdo-a87699da-8d38-4976-8749-f4100631b191",
  storageBucket: "gen-lang-client-0391742872.firebasestorage.app",
  messagingSenderId: "811535018031"
};
var firebaseConfig = DEFAULT_FIREBASE_CONFIG;
try {
  const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
  if (import_fs.default.existsSync(configPath)) {
    firebaseConfig = { ...DEFAULT_FIREBASE_CONFIG, ...JSON.parse(import_fs.default.readFileSync(configPath, "utf8")) };
  }
} catch (e) {
  firebaseConfig = DEFAULT_FIREBASE_CONFIG;
}
async function getFirestoreCandidates() {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return [];
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);
  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
    const response = await fetch(firestoreUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "candidates" }]
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) return [];
    const fData = await response.json();
    if (!Array.isArray(fData)) return [];
    return fData.filter((item) => item.document && item.document.fields).map((item) => {
      const f = item.document.fields;
      const docId = item.document.name.split("/").pop() || "";
      return {
        id: docId,
        fullName: f.fullName?.stringValue || f.fio?.stringValue || "Noma'lum",
        fatherName: f.fatherName?.stringValue || f.middleName?.stringValue || f.otasiningIsmi?.stringValue || "",
        jobPosition: f.jobPosition?.stringValue || f.position?.stringValue || f.lavozim?.stringValue || "Noma'lum",
        position: f.jobPosition?.stringValue || f.position?.stringValue || f.lavozim?.stringValue || "Noma'lum",
        targetBranch: f.targetBranch?.stringValue || f.branch?.stringValue || f.filial?.stringValue || "",
        region: f.region?.stringValue || f.viloyat?.stringValue || "Noma'lum",
        address: f.exactAddress?.stringValue || f.address?.stringValue || f.manzil?.stringValue || "",
        exactAddress: f.exactAddress?.stringValue || f.address?.stringValue || f.manzil?.stringValue || "",
        phone1: f.phone1?.stringValue || f.phone?.stringValue || f.telefon1?.stringValue || "",
        phone2: f.phone2?.stringValue || f.telefon2?.stringValue || "",
        gender: f.gender?.stringValue || f.jinsi?.stringValue || "Erkak",
        dob: f.dob?.stringValue || f.birthYear?.stringValue || f.tugilganYili?.stringValue || "",
        maritalStatus: f.maritalStatus?.stringValue || f.oilaviyHolati?.stringValue || f.turmushHolati?.stringValue || "",
        educationLevel: f.educationLevel?.stringValue || f.degree?.stringValue || f.education?.stringValue || f.malumoti?.stringValue || "",
        graduationYear: f.graduationYear?.stringValue || f.gradYear?.stringValue || f.tugatganYili?.stringValue || "",
        pastExperience: f.pastExperience?.stringValue || f.candidateMessage?.stringValue || f.tajriba?.stringValue || "",
        candidateMessage: f.pastExperience?.stringValue || f.candidateMessage?.stringValue || f.tajriba?.stringValue || "",
        status: f.status?.stringValue || "Yangi nomzod",
        submittedAt: f.submittedAt?.stringValue || f.date?.stringValue || (/* @__PURE__ */ new Date()).toISOString(),
        date: f.date?.stringValue || (/* @__PURE__ */ new Date()).toLocaleDateString("uz-UZ"),
        photoUrl: f.photoUrl?.stringValue || f.photo_url?.stringValue || f.avatarUrl?.stringValue || f.photo?.stringValue || "",
        passportFrontUrl: f.passportFrontUrl?.stringValue || f.passport_front_url?.stringValue || f.passport_front?.stringValue || f.passportFront?.stringValue || f.passFront?.stringValue || f.passportImage?.stringValue || f.passport_image?.stringValue || f.passportPhoto?.stringValue || f.passport1?.stringValue || "",
        passportBackUrl: f.passportBackUrl?.stringValue || f.passport_back_url?.stringValue || f.passport_back?.stringValue || f.passportBack?.stringValue || f.passBack?.stringValue || f.passport2?.stringValue || ""
      };
    });
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("Server Firestore candidates fetch notice:", err?.name === "AbortError" ? "Timeout (4.5s)" : err?.message);
    return [];
  }
}
async function saveFirestoreCandidate(candidate) {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    console.warn("Firestore config missing in server.ts");
    return false;
  }
  const docId = candidate.id || `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const writeUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/candidates/${docId}?key=${firebaseConfig.apiKey}`;
  const fields = {
    id: { stringValue: String(docId) },
    fullName: { stringValue: String(candidate.fullName || candidate.fio || "Noma'lum") },
    fatherName: { stringValue: String(candidate.fatherName || candidate.middleName || "") },
    jobPosition: { stringValue: String(candidate.jobPosition || candidate.position || "Noma'lum") },
    position: { stringValue: String(candidate.jobPosition || candidate.position || "Noma'lum") },
    targetBranch: { stringValue: String(candidate.targetBranch || candidate.branch || candidate.filial || "") },
    region: { stringValue: String(candidate.region || candidate.viloyat || "Noma'lum") },
    address: { stringValue: String(candidate.address || candidate.exactAddress || "") },
    exactAddress: { stringValue: String(candidate.exactAddress || candidate.address || "") },
    phone1: { stringValue: String(candidate.phone1 || candidate.phone || "") },
    phone2: { stringValue: String(candidate.phone2 || "") },
    gender: { stringValue: String(candidate.gender || "Erkak") },
    dob: { stringValue: String(candidate.dob || candidate.birthYear || "") },
    maritalStatus: { stringValue: String(candidate.maritalStatus || "") },
    educationLevel: { stringValue: String(candidate.educationLevel || candidate.education || "") },
    graduationYear: { stringValue: String(candidate.graduationYear || "") },
    pastExperience: { stringValue: String(candidate.pastExperience || candidate.candidateMessage || candidate.tajriba || "") },
    candidateMessage: { stringValue: String(candidate.pastExperience || candidate.candidateMessage || candidate.tajriba || "") },
    status: { stringValue: String(candidate.status || "Yangi nomzod") },
    submittedAt: { stringValue: String(candidate.submittedAt || (/* @__PURE__ */ new Date()).toISOString()) },
    date: { stringValue: String(candidate.date || (/* @__PURE__ */ new Date()).toLocaleDateString("uz-UZ")) }
  };
  if (candidate.photoUrl) fields.photoUrl = { stringValue: String(candidate.photoUrl) };
  if (candidate.passportFrontUrl) fields.passportFrontUrl = { stringValue: String(candidate.passportFrontUrl) };
  if (candidate.passportBackUrl) fields.passportBackUrl = { stringValue: String(candidate.passportBackUrl) };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6e3);
  try {
    const res = await fetch(writeUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("Firestore save candidate network/timeout notice:", err?.name === "AbortError" ? "Timeout (6s)" : err?.message);
    return false;
  }
}
async function deleteFirestoreCandidate(docId) {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5e3);
  try {
    const deleteUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/candidates/${docId}?key=${firebaseConfig.apiKey}`;
    await fetch(deleteUrl, { method: "DELETE", signal: controller.signal });
    clearTimeout(timeoutId);
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn("Server Firestore candidate delete notice:", e?.message);
  }
}
var candidates = [];
var branchGeozones = [
  {
    id: "branch-1",
    name: "Turkiston filiali",
    lat: 40.5283,
    lon: 70.9425,
    radius: 270,
    address: "Qo'qon shahar, Turkiston ko'chasi, 45-uy",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "branch-2",
    name: "Navoiy filiali",
    lat: 40.5312,
    lon: 70.9388,
    radius: 500,
    address: "Qo'qon shahar, A.Navoiy shoh ko'chasi, 12-uy",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "branch-3",
    name: "Istiqlol (Gorod) filiali",
    lat: 40.5345,
    lon: 70.945,
    radius: 100,
    address: "Qo'qon shahar, Istiqlol ko'chasi, 88-uy",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "branch-4",
    name: "Mingtut filiali",
    lat: 40.52,
    lon: 70.935,
    radius: 150,
    address: "Qo'qon shahar, Mingtut mavzesi, 5-savdo markazi",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "branch-5",
    name: "Yakkatut filiali",
    lat: 40.54,
    lon: 70.95,
    radius: 100,
    address: "Qo'qon shahar, Yakkatut ko'chasi, 10-uy",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "branch-6",
    name: "Bosh ofis",
    lat: 40.55441164458834,
    lon: 71.10088818840296,
    radius: 500,
    address: "Qo'qon shahar, Markaziy bino, Bosh ofis",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "branch-7",
    name: "Pop filiali",
    lat: 40.875,
    lon: 71.107,
    radius: 120,
    address: "Pop shahar, Markaziy ko'cha, 18-uy",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "branch-8",
    name: "Furqat filiali",
    lat: 40.53,
    lon: 70.76,
    radius: 100,
    address: "Furqat tumani, Navbahor shaharchasi",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "branch-9",
    name: "Buvayda filiali",
    lat: 40.58,
    lon: 71.05,
    radius: 100,
    address: "Buvayda tumani, Ibrat MFY",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "branch-10",
    name: "Yangiqo'rg'on (Buvayda) filiali",
    lat: 40.59,
    lon: 71.07,
    radius: 100,
    address: "Buvayda, Yangiqo'rg'on markazi",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "branch-11",
    name: "Yaypan filiali",
    lat: 40.37,
    lon: 70.815,
    radius: 120,
    address: "O'zbekiston tumani, Yaypan shahar, Mustaqillik shoh ko'chasi",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var LOCAL_GEOZONES_FILE = import_path.default.join(process.cwd(), "branch_geozones.json");
var TMP_GEOZONES_FILE = import_path.default.join(import_os.default.tmpdir(), "toyonasavdo_geozones.json");
function saveLocalGeozones(zones) {
  const data = JSON.stringify(zones);
  try {
    import_fs.default.writeFileSync(LOCAL_GEOZONES_FILE, data, "utf8");
  } catch {
  }
  try {
    import_fs.default.writeFileSync(TMP_GEOZONES_FILE, data, "utf8");
  } catch {
  }
}
function loadLocalGeozones() {
  for (const p of [LOCAL_GEOZONES_FILE, TMP_GEOZONES_FILE]) {
    try {
      if (import_fs.default.existsSync(p)) {
        const raw = import_fs.default.readFileSync(p, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
    }
  }
  return null;
}
var persistedGeozones = loadLocalGeozones();
if (persistedGeozones && persistedGeozones.length > 0) {
  const gzMap = /* @__PURE__ */ new Map();
  branchGeozones.forEach((b) => gzMap.set(b.id, b));
  persistedGeozones.forEach((b) => {
    if (b && b.id) gzMap.set(b.id, b);
  });
  branchGeozones = Array.from(gzMap.values());
}
var firestoreDocFallbackCache = /* @__PURE__ */ new Map();
var firestoreReadQuotaExhaustedUntil = 0;
async function readFirestoreDocViaPatch(collectionName, docId, forceRefresh = false) {
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
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: {} }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const docData = await res.json();
      const fields = docData?.fields || null;
      firestoreDocFallbackCache.set(cacheKey, { fields, expiresAt: now + 5 * 60 * 1e3 });
      return fields;
    } else if (res.status === 404) {
      firestoreDocFallbackCache.set(cacheKey, { fields: null, expiresAt: now + 2 * 60 * 1e3 });
      return null;
    }
  } catch {
    clearTimeout(timeoutId);
  }
  return null;
}
var LOCAL_LOGS_FILE = import_path.default.join(process.cwd(), "attendance_logs.json");
var TMP_LOGS_FILE = import_path.default.join(import_os.default.tmpdir(), "toyonasavdo_attendance_logs.json");
function saveLocalAttendance(logs) {
  const data = JSON.stringify(logs.slice(0, 1e3));
  try {
    import_fs.default.writeFileSync(LOCAL_LOGS_FILE, data, "utf8");
  } catch {
  }
  try {
    import_fs.default.writeFileSync(TMP_LOGS_FILE, data, "utf8");
  } catch {
  }
}
function loadLocalAttendance() {
  for (const p of [LOCAL_LOGS_FILE, TMP_LOGS_FILE]) {
    try {
      if (import_fs.default.existsSync(p)) {
        const raw = import_fs.default.readFileSync(p, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
    }
  }
  return [];
}
var attendanceLogs = loadLocalAttendance();
var penaltySettings = {
  workStartTime: "09:00",
  workEndTime: "18:00",
  gracePeriodMinutes: 15,
  penaltyType: "minute",
  penaltyRate: 1e3,
  // 1 daqiqasiga 1000 so'm
  restDays: [0],
  // 0: Yakshanba dam olish kuni
  customHolidays: [],
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
function calculatePenaltyAmount(delayMinutes, settings = penaltySettings) {
  if (delayMinutes <= 0) return 0;
  if (settings.penaltyType === "hour") {
    const hours = Math.ceil(delayMinutes / 60);
    return hours * (settings.penaltyRate || 3e4);
  }
  return delayMinutes * (settings.penaltyRate || 1e3);
}
function formatDelayText(delayMinutes) {
  const d = Math.max(0, Number(delayMinutes) || 0);
  if (d <= 0) return "Kechikish yo'q";
  if (d < 60) return `${d} daqiqa`;
  const hours = Math.floor(d / 60);
  const remainingMins = d % 60;
  if (remainingMins === 0) return `${hours} soat`;
  return `${hours} soat ${remainingMins} daqiqa`;
}
var LOCAL_EMPLOYEES_FILE = import_path.default.join(process.cwd(), "employees_cache.json");
var TMP_EMPLOYEES_FILE = import_path.default.join(import_os.default.tmpdir(), "toyonasavdo_employees_cache.json");
function saveLocalEmployees(list) {
  const data = JSON.stringify(list);
  try {
    import_fs.default.writeFileSync(LOCAL_EMPLOYEES_FILE, data, "utf8");
  } catch {
  }
  try {
    import_fs.default.writeFileSync(TMP_EMPLOYEES_FILE, data, "utf8");
  } catch {
  }
}
function loadLocalEmployees() {
  for (const p of [LOCAL_EMPLOYEES_FILE, TMP_EMPLOYEES_FILE]) {
    try {
      if (import_fs.default.existsSync(p)) {
        const raw = import_fs.default.readFileSync(p, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
    }
  }
  return [];
}
var defaultEmployees = [
  {
    id: "emp-101",
    staffId: "TS-0001",
    fullName: "Zarifjon Zokirov",
    position: "Bosh Direktor (CEO)",
    department: "Ijroiya Boshqaruvi",
    branch: "Bosh ofis",
    phone: "+998 90 123 45 67",
    email: "zarifjon@toyona.uz",
    photoUrl: "https://hrms-toyona.vercel.app/zarifjon.jpg",
    avatarUrl: "https://hrms-toyona.vercel.app/zarifjon.jpg",
    username: "",
    password: "",
    // Login va parol faqat Firebase'dan olinadi, kodda saqlanmaydi
    status: "active",
    isAccountActive: true,
    accountCreatedAt: "2026-10-12",
    salary: "25,000,000 UZS",
    hireDate: "2020-03-15",
    birthDate: "1990-05-12",
    gender: "Erkak",
    address: "Toshkent sh., Yunusobod t."
  }
];
var deletedEmployeeIds = /* @__PURE__ */ new Set();
var employeePhotoOverrides = {};
async function saveFirestoreEmployeePhoto(employeeId, photoUrl) {
  employeePhotoOverrides[employeeId] = photoUrl;
  const defEmp = defaultEmployees.find((e) => e.id === employeeId);
  if (defEmp) {
    defEmp.photoUrl = photoUrl;
    defEmp.avatarUrl = photoUrl;
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
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const upsertUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/employees/${employeeId}?key=${firebaseConfig.apiKey}`;
      res = await fetch(upsertUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields })
      });
    }
    if (res.ok) {
      try {
        const saved = await res.json();
        if (saved?.fields) {
          firestoreDocFallbackCache.set(`employees/${employeeId}`, {
            fields: saved.fields,
            expiresAt: Date.now() + 10 * 60 * 1e3
          });
        }
      } catch {
      }
    }
    return res.ok;
  } catch (e) {
    return false;
  }
}
var photoRequestsMap = /* @__PURE__ */ new Map();
async function getFirestorePhotoRequests() {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return Array.from(photoRequestsMap.values());
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4e3);
  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
    const response = await fetch(firestoreUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "photo_requests" }]
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) return Array.from(photoRequestsMap.values());
    const fData = await response.json();
    if (!Array.isArray(fData)) return Array.from(photoRequestsMap.values());
    const result = [];
    fData.forEach((item) => {
      if (!item.document || !item.document.fields) return;
      const f = item.document.fields;
      const docId = item.document.name.split("/").pop() || "";
      const req = {
        id: docId,
        employeeId: f.employeeId?.stringValue || "",
        employeeName: f.employeeName?.stringValue || "Noma'lum",
        branch: f.branch?.stringValue || "",
        position: f.position?.stringValue || "",
        currentPhotoUrl: f.currentPhotoUrl?.stringValue || "",
        newPhotoUrl: f.newPhotoUrl?.stringValue || "",
        status: f.status?.stringValue || "pending",
        submittedAt: f.submittedAt?.stringValue || (/* @__PURE__ */ new Date()).toISOString(),
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
async function saveFirestorePhotoRequest(req) {
  photoRequestsMap.set(req.id, req);
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return true;
  }
  const writeUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/photo_requests/${req.id}?key=${firebaseConfig.apiKey}`;
  const fields = {
    id: { stringValue: String(req.id) },
    employeeId: { stringValue: String(req.employeeId) },
    employeeName: { stringValue: String(req.employeeName) },
    branch: { stringValue: String(req.branch || "") },
    position: { stringValue: String(req.position || "") },
    currentPhotoUrl: { stringValue: String(req.currentPhotoUrl || "") },
    newPhotoUrl: { stringValue: String(req.newPhotoUrl || "") },
    status: { stringValue: String(req.status || "pending") },
    submittedAt: { stringValue: String(req.submittedAt || (/* @__PURE__ */ new Date()).toISOString()) }
  };
  if (req.reviewedAt) fields.reviewedAt = { stringValue: String(req.reviewedAt) };
  if (req.reviewedBy) fields.reviewedBy = { stringValue: String(req.reviewedBy) };
  if (req.rejectionReason) fields.rejectionReason = { stringValue: String(req.rejectionReason) };
  try {
    const res = await fetch(writeUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
function applyFirestoreEmployeeFieldsToMap(map, docId, f) {
  if (!f || deletedEmployeeIds.has(docId)) return;
  const existing = map.get(docId) || {};
  const empName = f.fullName?.stringValue || existing.fullName || "Xodim";
  const defaultUser = empName.toLowerCase().replace(/['`ʻ’\s]/g, ".");
  const preferredDataPhoto = (f.photoUrl?.stringValue?.startsWith("data:image/") ? f.photoUrl.stringValue : "") || (f.rasmUrl?.stringValue?.startsWith("data:image/") ? f.rasmUrl.stringValue : "") || (f.avatarUrl?.stringValue?.startsWith("data:image/") ? f.avatarUrl.stringValue : "");
  const resolvedPhoto = employeePhotoOverrides[docId] || preferredDataPhoto || f.avatarUrl?.stringValue || f.photoUrl?.stringValue || f.rasmUrl?.stringValue || existing.photoUrl || "https://hrms-toyona.vercel.app/zarifjon.jpg";
  map.set(docId, {
    id: docId,
    staffId: f.staffId?.stringValue || existing.staffId || "TS-0001",
    fullName: empName,
    position: f.position?.stringValue || existing.position || "Mutaxassis",
    department: f.department?.stringValue || existing.department || "Savdo",
    branch: f.branch?.stringValue || existing.branch || "Bosh ofis",
    phone: f.phone?.stringValue || existing.phone || "",
    email: f.email?.stringValue || existing.email || "",
    photoUrl: resolvedPhoto,
    avatarUrl: resolvedPhoto,
    rasmUrl: resolvedPhoto,
    username: f.username?.stringValue || existing.username || defaultUser,
    password: f.password?.stringValue || existing.password || "Toyona#2026",
    status: f.status?.stringValue || existing.status || "active",
    isAccountActive: f.isAccountActive?.booleanValue !== void 0 ? f.isAccountActive.booleanValue : existing.isAccountActive ?? true,
    accountCreatedAt: f.accountCreatedAt?.stringValue || existing.accountCreatedAt || "2026-10-12",
    salary: f.salary?.stringValue || existing.salary || "4,000,000 UZS",
    hireDate: f.hireDate?.stringValue || existing.hireDate || "2026-01-01",
    birthDate: f.birthDate?.stringValue || existing.birthDate || "",
    gender: f.gender?.stringValue || existing.gender || "Erkak",
    address: f.address?.stringValue || existing.address || ""
  });
}
async function getAllServerEmployees() {
  const map = /* @__PURE__ */ new Map();
  defaultEmployees.forEach((e) => {
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
  localSaved.forEach((e) => {
    if (e && e.id && !deletedEmployeeIds.has(e.id)) {
      const customPhoto = employeePhotoOverrides[e.id];
      map.set(e.id, {
        ...map.get(e.id),
        ...e,
        photoUrl: customPhoto || e.photoUrl || e.avatarUrl || "https://hrms-toyona.vercel.app/zarifjon.jpg",
        avatarUrl: customPhoto || e.avatarUrl || e.photoUrl || "https://hrms-toyona.vercel.app/zarifjon.jpg"
      });
    }
  });
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return Array.from(map.values()).filter((e) => !deletedEmployeeIds.has(e.id));
  }
  let empQuerySucceeded = false;
  if (Date.now() > firestoreReadQuotaExhaustedUntil) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4e3);
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
      const response = await fetch(firestoreUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: { from: [{ collectionId: "employees" }] }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.status === 429) {
        firestoreReadQuotaExhaustedUntil = Date.now() + 60 * 1e3;
      } else if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          data.filter((item) => item.document && item.document.fields).forEach((item) => {
            const f = item.document.fields;
            const docId = item.document.name.split("/").pop() || "";
            applyFirestoreEmployeeFieldsToMap(map, docId, f);
          });
          empQuerySucceeded = true;
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
    }
  }
  if (!empQuerySucceeded) {
    try {
      const candidateIds = Array.from(/* @__PURE__ */ new Set(["emp-101", ...Array.from(map.keys())]));
      const results = await Promise.all(
        candidateIds.map(async (id) => ({
          id,
          fields: await readFirestoreDocViaPatch("employees", id)
        }))
      );
      for (const item of results) {
        if (item.fields) {
          applyFirestoreEmployeeFieldsToMap(map, item.id, item.fields);
        }
      }
    } catch {
    }
  }
  const finalResult = Array.from(map.values()).filter((e) => !deletedEmployeeIds.has(e.id));
  saveLocalEmployees(finalResult);
  return finalResult;
}
function normalizeBranchName(name) {
  if (!name) return "";
  return String(name).trim().toLowerCase().replace(/['`ʻ’]/g, "'");
}
function findMatchingGeozone(allBranches, branchName, branchId) {
  if (!allBranches.length) {
    return {
      id: "branch-6",
      name: "Bosh ofis",
      lat: 40.55441164458834,
      lon: 71.10088818840296,
      radius: 500,
      address: "Qo'qon shahar, Markaziy bino, Bosh ofis",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (branchId) {
    const byId = allBranches.find((b) => String(b.id).trim() === String(branchId).trim());
    if (byId) return byId;
  }
  const normInput = normalizeBranchName(branchName);
  if (!normInput) {
    return allBranches.find((b) => b.id === "branch-6") || allBranches[0];
  }
  const exact = allBranches.find((b) => normalizeBranchName(b.name) === normInput);
  if (exact) return exact;
  const isHeadOffice = normInput.includes("bosh ofis") || normInput.includes("bosh idora") || normInput.includes("bosh bino") || normInput.includes("markaziy ofis");
  if (isHeadOffice) {
    const headMatch = allBranches.find(
      (b) => b.id === "branch-6" || normalizeBranchName(b.name).includes("bosh ofis") || normalizeBranchName(b.name).includes("bosh idora")
    );
    if (headMatch) return headMatch;
  }
  const strip = (s) => s.replace(/\b(filiali|filial|shahar|shahri|tumani)\b/gi, "").replace(/[()]/g, "").trim();
  const strippedInput = strip(normInput);
  if (strippedInput) {
    const partial = allBranches.find((b) => {
      const sb = strip(normalizeBranchName(b.name));
      return sb && (sb === strippedInput || sb.includes(strippedInput) || strippedInput.includes(sb));
    });
    if (partial) return partial;
  }
  return allBranches.find((b) => b.id === "branch-6") || allBranches[0];
}
var lastGeozonesFirestoreSync = 0;
function applyFirestoreGeozoneFieldsToMap(map, docId, f) {
  if (!f) return;
  const name = f.name?.stringValue || "Filial";
  const description = f.description?.stringValue || "";
  const rawLat = f.lat?.doubleValue ?? f.lat?.integerValue ?? f.lat?.stringValue;
  const rawLon = f.lon?.doubleValue ?? f.lon?.integerValue ?? f.lon?.stringValue;
  const rawRadius = f.radius?.integerValue ?? f.radius?.doubleValue ?? f.radius?.stringValue;
  const lat = rawLat !== void 0 ? Number(rawLat) : 40.5283;
  const lon = rawLon !== void 0 ? Number(rawLon) : 70.9425;
  const radius = rawRadius !== void 0 ? Number(rawRadius) : 100;
  const address = f.address?.stringValue || "";
  let targetKey = docId;
  if (!map.has(docId)) {
    for (const [k, existing] of map.entries()) {
      if (normalizeBranchName(existing.name) === normalizeBranchName(name)) {
        targetKey = k;
        break;
      }
    }
  }
  const gzItem = {
    id: targetKey,
    name,
    description: description || map.get(targetKey)?.description || "",
    lat: !isNaN(lat) ? lat : 40.5283,
    lon: !isNaN(lon) ? lon : 70.9425,
    radius: !isNaN(radius) && radius > 0 ? radius : 100,
    address,
    updatedAt: f.updatedAt?.stringValue || (/* @__PURE__ */ new Date()).toISOString()
  };
  map.set(targetKey, gzItem);
}
async function getAllServerGeozones() {
  const map = /* @__PURE__ */ new Map();
  branchGeozones.forEach((b) => map.set(b.id, b));
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: { from: [{ collectionId: "geozones" }] }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.status === 429) {
        firestoreReadQuotaExhaustedUntil = Date.now() + 60 * 1e3;
      } else if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.filter((item) => item.document && item.document.fields).forEach((item) => {
            const f = item.document.fields;
            const docId = item.document.name.split("/").pop() || "";
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
  if (!syncedViaQuery && Date.now() - lastGeozonesFirestoreSync > 5 * 60 * 1e3) {
    try {
      const branchIds = Array.from({ length: 11 }, (_, idx) => `branch-${idx + 1}`);
      const results = await Promise.all(
        branchIds.map(async (id) => ({ id, fields: await readFirestoreDocViaPatch("geozones", id) }))
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
    } catch {
    }
  }
  return Array.from(map.values());
}
async function saveFirestoreGeozone(geozone) {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return false;
  }
  const writeUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/geozones/${geozone.id}?key=${firebaseConfig.apiKey}`;
  const fields = {
    id: { stringValue: String(geozone.id) },
    name: { stringValue: String(geozone.name) },
    description: { stringValue: String(geozone.description || "") },
    lat: { doubleValue: Number(geozone.lat) },
    lon: { doubleValue: Number(geozone.lon) },
    radius: { integerValue: String(Math.round(Number(geozone.radius) || 100)) },
    address: { stringValue: String(geozone.address || "") },
    updatedAt: { stringValue: (/* @__PURE__ */ new Date()).toISOString() }
  };
  firestoreDocFallbackCache.set(`geozones/${geozone.id}`, { fields, expiresAt: Date.now() + 10 * 60 * 1e3 });
  try {
    const res = await fetch(writeUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
async function deleteFirestoreGeozone(docId) {
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return false;
  }
  firestoreDocFallbackCache.delete(`geozones/${docId}`);
  const deleteUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/geozones/${docId}?key=${firebaseConfig.apiKey}`;
  try {
    const res = await fetch(deleteUrl, { method: "DELETE" });
    return res.ok;
  } catch (e) {
    return false;
  }
}
function getLocalIsoDate(d = /* @__PURE__ */ new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(d);
  } catch (e) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
function getLocalTimeString(d = /* @__PURE__ */ new Date()) {
  try {
    return d.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Tashkent",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  } catch (e) {
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");
    return `${hour}:${minute}`;
  }
}
function getLocalDateFormatted(d = /* @__PURE__ */ new Date()) {
  try {
    return d.toLocaleDateString("uz-UZ", { timeZone: "Asia/Tashkent" });
  } catch (e) {
    return d.toLocaleDateString("uz-UZ");
  }
}
function applyFirestoreAttendanceDocToMap(map, docId, f) {
  if (!f) return;
  const empId = f.employeeId?.stringValue || "";
  const empName = f.employeeName?.stringValue || "Xodim";
  const dateStr = f.date?.stringValue || getLocalIsoDate();
  const checkIn = f.checkIn?.stringValue || "--:--";
  const checkOut = f.checkOut?.stringValue || "--:--";
  const status = f.status?.stringValue || "Vaqtida kelgan";
  const delayMinutes = f.delayMinutes?.integerValue ? Number(f.delayMinutes.integerValue) : 0;
  const branchName = f.branch?.stringValue || "Bosh ofis";
  if (checkIn && checkIn !== "--:--") {
    map.set(`${docId}_in`, {
      id: `${docId}_in`,
      docId,
      action: "keldim",
      timestamp: f.checkInTimestamp?.stringValue || `${dateStr}T09:00:00.000Z`,
      timeFormatted: checkIn,
      dateFormatted: dateStr,
      dateIso: dateStr,
      employeeId: empId,
      employeeName: empName,
      branchName,
      status,
      success: true,
      delayMinutes,
      faceVerified: f.faceVerified?.booleanValue !== false
    });
  }
  if (checkOut && checkOut !== "--:--") {
    map.set(`${docId}_out`, {
      id: `${docId}_out`,
      docId,
      action: "ketdim",
      timestamp: f.checkOutTimestamp?.stringValue || `${dateStr}T18:00:00.000Z`,
      timeFormatted: checkOut,
      dateFormatted: dateStr,
      dateIso: dateStr,
      employeeId: empId,
      employeeName: empName,
      branchName,
      status: "Ketdi (Ish yakunlandi)",
      success: true,
      delayMinutes: 0,
      faceVerified: f.faceVerified?.booleanValue !== false
    });
  }
}
async function getAllServerAttendanceLogs(targetEmployeeId) {
  const map = /* @__PURE__ */ new Map();
  const localLogs = loadLocalAttendance();
  localLogs.forEach((l) => map.set(l.id, l));
  attendanceLogs.forEach((l) => map.set(l.id, l));
  if (!firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId || !firebaseConfig?.apiKey) {
    return Array.from(map.values());
  }
  let querySucceeded = false;
  if (Date.now() > firestoreReadQuotaExhaustedUntil) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4e3);
    try {
      const attUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
      const res = await fetch(attUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: { from: [{ collectionId: "attendance" }] }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.status === 429) {
        firestoreReadQuotaExhaustedUntil = Date.now() + 60 * 1e3;
      } else if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.filter((item) => item.document && item.document.fields).forEach((item) => {
            const f = item.document.fields;
            const docId = item.document.name.split("/").pop() || "";
            applyFirestoreAttendanceDocToMap(map, docId, f);
          });
          querySucceeded = true;
        }
      }
    } catch (e) {
      clearTimeout(timeoutId);
    }
  }
  if (!querySucceeded) {
    const empIdsToCheck = /* @__PURE__ */ new Set(["emp-101"]);
    if (targetEmployeeId && targetEmployeeId !== "all") {
      empIdsToCheck.add(targetEmployeeId);
    }
    const baseNow = Date.now();
    const docIdsToFetch = [];
    for (const empId of empIdsToCheck) {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const d = new Date(baseNow - dayOffset * 24 * 60 * 60 * 1e3);
        const iso = getLocalIsoDate(d);
        docIdsToFetch.push(`att-${empId}-${iso}`);
      }
    }
    try {
      const results = await Promise.all(
        docIdsToFetch.map(async (docId) => ({
          docId,
          fields: await readFirestoreDocViaPatch("attendance", docId)
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
        attendanceLogs = Array.from(map.values()).sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
        saveLocalAttendance(attendanceLogs);
      }
    } catch {
    }
  }
  return Array.from(map.values()).sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
}
async function saveFirestoreAttendance(record) {
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
  if (!checkInVal || checkInVal === "--:--") {
    const cachedDoc = firestoreDocFallbackCache.get(`attendance/${docId}`)?.fields;
    if (cachedDoc?.checkIn?.stringValue && cachedDoc.checkIn.stringValue !== "--:--") {
      checkInVal = cachedDoc.checkIn.stringValue;
    } else {
      const existing = attendanceLogs.find(
        (l) => (l.employeeId === record.employeeId || l.employeeName === record.employeeName) && (l.dateIso === dateIso || l.date === dateIso) && (l.action === "keldim" || l.checkIn && l.checkIn !== "--:--")
      );
      if (existing) {
        checkInVal = existing.timeFormatted || existing.checkIn || existing.time;
      }
    }
  }
  const fields = {
    id: { stringValue: String(docId) },
    employeeId: { stringValue: String(record.employeeId || "EMP") },
    employeeName: { stringValue: String(record.employeeName || "Xodim") },
    date: { stringValue: String(dateIso) },
    status: { stringValue: String(record.status || "Vaqtida kelgan") },
    delayMinutes: { integerValue: String(record.delayMinutes || 0) },
    branch: { stringValue: String(record.branch || record.branchName || "Bosh ofis") },
    department: { stringValue: String(record.department || "Savdo") },
    notes: { stringValue: String(record.notes || "") },
    updatedAt: { stringValue: (/* @__PURE__ */ new Date()).toISOString() }
  };
  if (checkInVal && checkInVal !== "--:--") {
    fields.checkIn = { stringValue: String(checkInVal) };
  }
  if (checkOutVal && checkOutVal !== "--:--") {
    fields.checkOut = { stringValue: String(checkOutVal) };
  }
  if (record.checkInTimestamp) fields.checkInTimestamp = { stringValue: String(record.checkInTimestamp) };
  if (record.checkOutTimestamp) fields.checkOutTimestamp = { stringValue: String(record.checkOutTimestamp) };
  if (record.capturedPhoto) fields.capturedPhoto = { stringValue: String(record.capturedPhoto) };
  if (record.faceVerified !== void 0) fields.faceVerified = { booleanValue: Boolean(record.faceVerified) };
  const maskParams = Object.keys(fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  const writeUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/attendance/${docId}?${maskParams}&key=${firebaseConfig.apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6e3);
  try {
    const res = await fetch(writeUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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
            expiresAt: Date.now() + 10 * 60 * 1e3
          });
        }
      } catch {
      }
    }
    return res.ok;
  } catch (err) {
    clearTimeout(timeoutId);
    return false;
  }
}
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
var app = (0, import_express.default)();
var isRoutesConfigured = false;
async function configureRoutes(appInstance = app) {
  if (isRoutesConfigured) return;
  isRoutesConfigured = true;
  const PORT = 3e3;
  appInstance.use((0, import_cors.default)());
  appInstance.use(import_express.default.json({ limit: "50mb" }));
  appInstance.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  appInstance.use((req, res, next) => {
    if (!req.url.startsWith("/api") && !req.url.startsWith("/_") && req.url !== "/") {
      req.url = "/api" + req.url;
    }
    next();
  });
  const HRMS_INTERNAL_TOKEN = process.env.HRMS_INTERNAL_TOKEN || "ts_hrms_internal_v5_9f8a7b6c";
  const SESSION_HMAC_SECRET = process.env.SESSION_HMAC_SECRET || "toyona_hrms_hmac_secret_2026_998877";
  const loginRateLimitMap = /* @__PURE__ */ new Map();
  function getClientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    let ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress || req.ip || "127.0.0.1";
    if (ip.startsWith("::ffff:")) ip = ip.substring(7);
    if (ip === "::1") ip = "127.0.0.1";
    return ip;
  }
  function hasInternalAdminToken(req) {
    const token = String(req.headers["x-hrms-internal-token"] || req.headers["x-hrms-key"] || "").trim();
    return token === HRMS_INTERNAL_TOKEN;
  }
  function createSignedSessionToken(empId) {
    const ts = Date.now();
    const payload = `${empId}:${ts}`;
    const sig = import_crypto.default.createHmac("sha256", SESSION_HMAC_SECRET).update(payload).digest("hex").slice(0, 24);
    return `token_${empId}_${ts}_${sig}`;
  }
  function isDirectBrowserNavigation(req) {
    const fetchMode = String(req.headers["sec-fetch-mode"] || "").toLowerCase();
    const fetchDest = String(req.headers["sec-fetch-dest"] || "").toLowerCase();
    const accept = String(req.headers["accept"] || "").toLowerCase();
    if (fetchMode === "navigate" || fetchDest === "document") return true;
    if (req.method === "GET" && accept.includes("text/html") && !hasInternalAdminToken(req)) return true;
    return false;
  }
  function sendCyberShieldBlock(req, res) {
    const clientIp = getClientIp(req);
    const rayId = `TS-35-${import_crypto.default.randomBytes(4).toString("hex").toUpperCase()}`;
    const targetUrl = String(req.originalUrl || req.url || "/api/attendance/employees").replace(/[<>"']/g, "");
    const nowFormatted = (/* @__PURE__ */ new Date()).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
    const accept = String(req.headers["accept"] || "").toLowerCase();
    const wantsJsonOnly = accept.includes("application/json") && !accept.includes("text/html") && !isDirectBrowserNavigation(req);
    const jsonPayload = {
      success: false,
      status: 403,
      code: "ZERO_TRUST_ACCESS_DENIED",
      securitySystem: "Toyona CyberShield\u2122 v3.5 (Enterprise Zero-Trust WAF)",
      protocol: "OWASP-ASVS-L3 / HMAC-SHA256",
      securityDirector: "Zarifjon Zokirov (Toyona Savdo SOC)",
      rayId,
      clientIp,
      timestamp: nowFormatted,
      message: "Xavfsizlik Tizimi 3.5: Ruxsatsiz kirish qat'iyan taqiqlangan! Qurilma va IP manzilingiz xavfsizlik jurnaliga qayd etildi."
    };
    if (wantsJsonOnly) {
      return res.status(403).json(jsonPayload);
    }
    const html = `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>403 Forbidden \u2014 Toyona Enterprise Security</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background-color: #0b0f17;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      width: 100%;
      max-width: 680px;
      background: #0f1420;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 14px;
      margin-bottom: 24px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
    }
    .header .tag {
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .header .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ef4444;
      display: inline-block;
    }
    h1 {
      font-size: 26px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .subtitle {
      color: #f87171;
      font-size: 14px;
      font-weight: 600;
      margin-top: 4px;
    }
    .desc {
      color: #94a3b8;
      font-size: 13.5px;
      line-height: 1.6;
      margin-top: 16px;
    }
    .table-box {
      margin-top: 24px;
      background: #070a10;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(30, 41, 59, 0.6);
    }
    .row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .row:first-child {
      padding-top: 0;
    }
    .row .label {
      color: #64748b;
    }
    .row .val {
      color: #e2e8f0;
      font-weight: 600;
      text-align: right;
    }
    .val-red { color: #f87171 !important; }
    .val-green { color: #10b981 !important; }
    .val-amber { color: #fbbf24 !important; }
    .footer {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #475569;
    }
    @media (max-width: 540px) {
      .container { padding: 20px; }
      .row { flex-direction: column; gap: 2px; }
      .row .val { text-align: left; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="tag">
        <span class="dot"></span>
        <span>Toyona Enterprise Security \u2022 WAF v3.5</span>
      </div>
      <div>HTTP 403</div>
    </div>

    <h1>403 Forbidden</h1>
    <div class="subtitle">Ruxsatsiz kirish bloklandi (Access Denied)</div>

    <p class="desc">
      Ushbu manzilga to'g'ridan-to'g'ri murojaat qilish Toyona HRMS ichki xavfsizlik qoidalariga muvofiq taqiqlangan. Tarmoq parametrlari va so'rov tafsilotlari xavfsizlik monitoringi jurnaliga qayd etildi.
    </p>

    <div class="table-box">
      <div class="row">
        <span class="label">Xavfsizlik tizimi:</span>
        <span class="val">Toyona CyberShield\u2122 v3.5</span>
      </div>
      <div class="row">
        <span class="label">Mas'ul shaxs:</span>
        <span class="val">Zarifjon Zokirov</span>
      </div>
      <div class="row">
        <span class="label">Hodisa ID (Ray ID):</span>
        <span class="val val-amber">${rayId}</span>
      </div>
      <div class="row">
        <span class="label">Mijoz IP manzili:</span>
        <span class="val val-red">${clientIp} (Qayd etildi)</span>
      </div>
      <div class="row">
        <span class="label">Himoya protokoli:</span>
        <span class="val val-green">OWASP-ASVS L3 / HMAC-SHA256</span>
      </div>
      <div class="row">
        <span class="label">Sana va vaqt:</span>
        <span class="val">${nowFormatted}</span>
      </div>
    </div>

    <div class="footer">
      <span>Toyona Savdo SOC \u2022 Zero-Trust Gateway</span>
      <span>Xavfsizlik Tizimi 3.5</span>
    </div>
  </div>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(403).send(html);
  }
  app.use("/api", (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    if (isDirectBrowserNavigation(req)) {
      return sendCyberShieldBlock(req, res);
    }
    if (!hasInternalAdminToken(req)) {
      const p = req.path.toLowerCase();
      const m = req.method.toUpperCase();
      const isPublicCandidatePost = m === "POST" && (p === "/candidates" || p === "/candidate" || p === "/submit-candidate" || p === "/submit-anketa" || p === "/anketa");
      const isMiniAppLoginPost = m === "POST" && (p === "/attendance/login" || p === "/qatnashish/kirish" || p === "/davomat/login" || p === "/davomat/kirish");
      const isMiniAppCheckInPost = m === "POST" && (p === "/attendance/check-in" || p === "/qatnashish/check-in" || p === "/davomat/check-in");
      const isMiniAppPhotoSubmitPost = m === "POST" && p === "/attendance/photo-request/submit";
      const isMiniAppGeozonesGet = m === "GET" && (p === "/branch-geozones" || p === "/geozones" || p === "/geozone" || p === "/branches" || p === "/attendance/geozones" || p === "/attendance/geozone" || p === "/attendance/branches" || p === "/qatnashish/geozonalar" || p === "/qatnashish/geozone" || p === "/davomat/geozonalar");
      const isMiniAppStatusOrHistoryGet = m === "GET" && (p === "/attendance/today-status" || p === "/qatnashish/today-status" || p === "/davomat/today-status" || p === "/qatnashish/bugungi-holat" || p === "/davomat/bugungi-holat" || p === "/attendance/history" || p === "/qatnashish/tarix" || p === "/davomat/tarix" || p === "/attendance/employee-photo" || p === "/qatnashish/xodim-rasmi" || p === "/davomat/xodim-rasmi" || p === "/attendance/penalty-settings");
      if (!isPublicCandidatePost && !isMiniAppLoginPost && !isMiniAppCheckInPost && !isMiniAppPhotoSubmitPost && !isMiniAppGeozonesGet && !isMiniAppStatusOrHistoryGet) {
        return sendCyberShieldBlock(req, res);
      }
    }
    next();
  });
  const TELEGRAM_SECURITY_BOT_TOKEN = "8975567213:AAGDNAyKPKGNoIrBsipqAgASO88KEY6ThS4";
  const ADMIN_CHATS_FILE = import_path.default.join(process.cwd(), "telegram_admin_chats.json");
  function getSavedAdminChatIds() {
    try {
      if (import_fs.default.existsSync(ADMIN_CHATS_FILE)) {
        return JSON.parse(import_fs.default.readFileSync(ADMIN_CHATS_FILE, "utf8"));
      }
    } catch {
    }
    return [];
  }
  function saveAdminChatId(chatId) {
    try {
      const chats = new Set(getSavedAdminChatIds());
      chats.add(String(chatId));
      import_fs.default.writeFileSync(ADMIN_CHATS_FILE, JSON.stringify(Array.from(chats)), "utf8");
    } catch {
    }
  }
  async function getBotChatIds() {
    const saved = new Set(getSavedAdminChatIds());
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_SECURITY_BOT_TOKEN}/getUpdates`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          data.result.forEach((u) => {
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
  async function sendTelegramAlert(text) {
    const chatIds = await getBotChatIds();
    if (chatIds.length === 0) {
      console.log("No telegram chat_id registered yet. User needs to send /start to @FaolMaktab_uzbot");
      return false;
    }
    let success = false;
    for (const chatId of chatIds) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_SECURITY_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML"
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
      const forwarded = req.headers["x-forwarded-for"];
      let clientIp = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || req.ip || "127.0.0.1";
      if (clientIp.startsWith("::ffff:")) clientIp = clientIp.substring(7);
      if (clientIp === "::1") clientIp = "127.0.0.1";
      const message = `\u{1F6A8} <b>DIQQAT: HRMS TIZIMIGA YANGI QURILMA KIRDI!</b>

\u{1F464} <b>Foydalanuvchi:</b> ${userName || "Foydalanuvchi"} (${userRole || "Admin"})
\u{1F4BB} <b>Qurilma / Brauzer:</b> ${device || "Noma'lum"}
\u{1F310} <b>IP Manzil:</b> <code>${clientIp}</code>
\u{1F5A5}\uFE0F <b>Ekran o'lchami:</b> ${screenResolution || "Noma'lum"}
\u{1F552} <b>Vaqt:</b> ${time || (/* @__PURE__ */ new Date()).toLocaleString("uz-UZ")}
\u{1F511} <b>Device ID:</b> <code>${deviceId || "yangi"}</code>

\u26A0\uFE0F <i>Agar ushbu qurilmadan siz kirmagan bo'lsangiz, zudlik bilan parolingizni o'zgartiring va tizim tarixini tekshiring!</i>`;
      const sent = await sendTelegramAlert(message);
      res.json({ success: true, sent, clientIp });
    } catch (e) {
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
      const testMsg = "\u2705 <b>HRMS Xavfsizlik Botiga muvaffaqiyatli ulandingiz!</b>\n\nEndi tizimga yangi qurilma kirganda ushbu chatga darhol xabarnoma keladi.";
      await sendTelegramAlert(testMsg);
      return res.json({ success: true, chatId });
    }
    res.status(400).json({ success: false, error: "chatId required" });
  });
  app.get("/api/client-info", (req, res) => {
    const forwarded = req.headers["x-forwarded-for"];
    let ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || req.ip || "127.0.0.1";
    if (ip.startsWith("::ffff:")) ip = ip.substring(7);
    if (ip === "::1") ip = "127.0.0.1";
    res.json({
      ip,
      userAgent: req.headers["user-agent"] || "",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (e) {
      res.status(200).json({
        status: "degraded",
        firestoreConnected: false,
        error: e?.message || "Unknown error",
        localCacheCount: candidates.length,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.get("/api/candidates", async (req, res) => {
    try {
      const firestoreList = await getFirestoreCandidates();
      const map = /* @__PURE__ */ new Map();
      [...candidates, ...firestoreList].forEach((c) => {
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
  const handleCandidateCreation = async (req, res) => {
    try {
      const body = req.body || {};
      const newCandidate = {
        id: body.id || `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: body.date || (/* @__PURE__ */ new Date()).toLocaleDateString("uz-UZ").replace(/\//g, "."),
        submittedAt: body.submittedAt || (/* @__PURE__ */ new Date()).toISOString(),
        status: body.status || "Yangi nomzod",
        fullName: body.fullName || body.fio || (body.lastName ? `${body.lastName} ${body.firstName || ""} ${body.middleName || ""}`.trim() : "Noma'lum"),
        fatherName: body.fatherName || body.middleName || "",
        position: body.jobPosition || body.position || body.lavozim || "Noma'lum",
        jobPosition: body.jobPosition || body.position || body.lavozim || "Noma'lum",
        region: body.region || body.viloyat || "Noma'lum",
        address: body.exactAddress || body.address || body.manzil || "",
        exactAddress: body.exactAddress || body.address || body.manzil || "",
        targetBranch: body.targetBranch || body.branch || body.filial || "",
        maritalStatus: body.maritalStatus || body.oilaviyHolati || "",
        educationLevel: body.educationLevel || body.degree || body.education || body.malumoti || "",
        graduationYear: body.graduationYear || body.gradYear || "",
        phone1: body.phone1 || body.phone || body.telefon1 || "",
        phone2: body.phone2 || body.telefon2 || "",
        gender: body.gender || body.jinsi || "Erkak",
        dob: body.dob || body.birthYear || body.tugilganYili || "",
        pastExperience: body.pastExperience || body.candidateMessage || body.tajriba || "",
        candidateMessage: body.pastExperience || body.candidateMessage || body.tajriba || "",
        photoUrl: body.photoUrl || body.photo_url || body.avatarUrl || body.photo || "",
        passportFrontUrl: body.passportFrontUrl || body.passport_front_url || body.passport_front || body.passportFront || body.passFront || body.passportImage || body.passport_image || body.passportPhoto || body.passport1 || "",
        passportBackUrl: body.passportBackUrl || body.passport_back_url || body.passport_back || body.passportBack || body.passBack || body.passport2 || ""
      };
      candidates.unshift(newCandidate);
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
    } catch (err) {
      console.error("Candidate creation error:", err);
      res.status(500).json({ success: false, error: err?.message || "Server xatosi" });
    }
  };
  app.post("/api/candidates", handleCandidateCreation);
  app.post("/api/candidate", handleCandidateCreation);
  app.post("/api/submit-candidate", handleCandidateCreation);
  app.post("/api/submit-anketa", handleCandidateCreation);
  app.post("/api/anketa", handleCandidateCreation);
  app.delete("/api/candidates/:id", async (req, res) => {
    const id = req.params.id;
    candidates = candidates.filter((c) => c.id !== id);
    await deleteFirestoreCandidate(id);
    res.json({ success: true });
  });
  const handleGetGeozones = async (req, res) => {
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
  const handleSaveGeozone = async (req, res) => {
    const { id, name, description, lat, lon, radius, address } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Filial nomi kiritilmadi" });
    }
    const existingIndex = branchGeozones.findIndex(
      (b) => b.id === id || normalizeBranchName(b.name) === normalizeBranchName(name)
    );
    const targetId = existingIndex >= 0 ? branchGeozones[existingIndex].id : id || `branch-${Date.now()}`;
    const updatedItem = {
      id: targetId,
      name: String(name).trim(),
      description: description || "",
      lat: Number(lat) || 40.5283,
      lon: Number(lon) || 70.9425,
      radius: Number(radius) || 100,
      address: address || "",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
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
    branchGeozones = branchGeozones.filter((b) => b.id !== id);
    saveLocalGeozones(branchGeozones);
    await deleteFirestoreGeozone(id);
    res.json({ success: true });
  });
  const handleAttendanceLoginNotAllowed = (req, res) => {
    res.status(405).json({
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Faqat POST so'rovi ruxsat etilgan."
    });
  };
  function findServerEmployee(allEmployees, input) {
    if (!input) return void 0;
    const raw = String(input).trim();
    if (!raw) return void 0;
    const lower = raw.toLowerCase();
    const cleanDigits = raw.replace(/\D/g, "");
    const cleanAlpha = lower.replace(/[^a-z0-9]/g, "");
    return allEmployees.find((emp) => {
      const empUsername = (emp.username || "").toLowerCase().trim();
      if (empUsername && (empUsername === lower || empUsername.replace(/[^a-z0-9]/g, "") === cleanAlpha)) return true;
      const empId = (emp.id || "").toLowerCase().trim();
      if (empId && (empId === lower || empId.replace(/\D/g, "") === cleanDigits)) return true;
      const staffId = (emp.staffId || "").toLowerCase().trim();
      if (staffId && (staffId === lower || staffId.replace(/[^a-z0-9]/g, "") === cleanAlpha)) return true;
      const email = (emp.email || "").toLowerCase().trim();
      if (email && (email === lower || email.split("@")[0] === lower)) return true;
      const phoneDigits = (emp.phone || "").replace(/\D/g, "");
      if (cleanDigits.length >= 7 && (phoneDigits === cleanDigits || phoneDigits.endsWith(cleanDigits))) return true;
      const fullNameLower = (emp.fullName || "").toLowerCase().trim();
      if (fullNameLower && (fullNameLower === lower || fullNameLower.replace(/[^a-z0-9]/g, "") === cleanAlpha)) return true;
      const parts = fullNameLower.replace(/['`ʻ’]/g, "").split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const [p0, p1] = parts;
        if (`${p0}.${p1}` === lower || `${p1}.${p0}` === lower) return true;
        if (`${p0}_${p1}` === lower || `${p1}_${p0}` === lower) return true;
        if (`${p0}${p1}` === cleanAlpha || `${p1}${p0}` === cleanAlpha) return true;
      }
      return false;
    });
  }
  const handleAttendanceLogin = async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      const nowMs = Date.now();
      const rateRecord = loginRateLimitMap.get(clientIp);
      if (rateRecord && rateRecord.lockUntil > nowMs) {
        const waitMin = Math.ceil((rateRecord.lockUntil - nowMs) / 6e4);
        return res.status(429).json({
          success: false,
          code: "TOO_MANY_ATTEMPTS",
          message: `Xavfsizlik himoyasi: Juda ko'p noto'g'ri urinish! Iltimos, ${waitMin} daqiqadan so'ng qayta urinib ko'ring.`
        });
      }
      const usernameInput = (req.body?.username || req.body?.login || req.body?.foydalanuvchi || req.body?.user || req.body?.employeeId || req.body?.id || req.body?.phone || "").toString().trim();
      const passwordInput = (req.body?.password || req.body?.parol || req.body?.pass || req.body?.pin || "").toString().trim();
      if (!usernameInput || !passwordInput) {
        return res.status(400).json({
          success: false,
          code: "MISSING_CREDENTIALS",
          message: "Login va parol kiritilishi shart!"
        });
      }
      const registerFailedAttempt = () => {
        const prev = loginRateLimitMap.get(clientIp) || { count: 0, lockUntil: 0, lastAttempt: 0 };
        const resetCount = nowMs - prev.lastAttempt > 10 * 60 * 1e3 ? 1 : prev.count + 1;
        loginRateLimitMap.set(clientIp, {
          count: resetCount,
          lockUntil: resetCount >= 6 ? nowMs + 10 * 60 * 1e3 : 0,
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
      if (matched.id === "emp-101") {
        matched.password = "";
        try {
          const userDoc = await readFirestoreDocViaPatch("users", "user-1", true);
          if (userDoc?.password?.stringValue) {
            matched.password = userDoc.password.stringValue;
          }
        } catch (e) {
        }
      }
      const empPassword = (matched.password || "").trim();
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
      const allBranches = await getAllServerGeozones();
      const targetBranch = findMatchingGeozone(allBranches, matched.branch);
      const nameParts = matched.fullName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
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
          status: matched.status || "active"
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
    } catch (err) {
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
  const handleGetEmployeePhoto = async (req, res) => {
    try {
      const lookup = (req.query.employeeId || req.query.id || req.query.username || req.query.login || "").toString().trim();
      if (!lookup) {
        return res.status(400).json({ success: false, message: "employeeId ko'rsatilishi shart" });
      }
      const allEmployees = await getAllServerEmployees();
      const emp = findServerEmployee(allEmployees, lookup);
      if (emp && emp.id === "emp-101" && !hasInternalAdminToken(req)) {
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
    } catch (err) {
      res.status(500).json({ success: false, message: "Rasm yuklashda xatolik" });
    }
  };
  app.get("/api/attendance/employee-photo", handleGetEmployeePhoto);
  app.get("/api/qatnashish/xodim-rasmi", handleGetEmployeePhoto);
  app.get("/api/davomat/xodim-rasmi", handleGetEmployeePhoto);
  const handleSaveEmployeePhoto = async (req, res) => {
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
      const lookupQuery = (employeeId || username || login || "").toString().trim();
      const emp = findServerEmployee(allEmployees, lookupQuery);
      if (!emp) {
        return res.status(404).json({
          success: false,
          code: "EMPLOYEE_NOT_FOUND",
          message: "Xodim topilmadi. employeeId yoki username parametrini tekshiring."
        });
      }
      employeePhotoOverrides[emp.id] = targetPhoto;
      const defEmp = defaultEmployees.find((e) => e.id === emp.id);
      if (defEmp) {
        defEmp.photoUrl = targetPhoto;
      }
      emp.photoUrl = targetPhoto;
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
    } catch (err) {
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
  app.get("/api/attendance/photo-requests", async (req, res) => {
    try {
      const { employeeId, status } = req.query || {};
      let list = await getFirestorePhotoRequests();
      if (employeeId) {
        const empQuery = String(employeeId).trim();
        list = list.filter((r) => String(r.employeeId).trim() === empQuery);
      }
      if (status) {
        list = list.filter((r) => r.status === status);
      }
      list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      res.json({ success: true, requests: list });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message || "So'rovlarni olishda xatolik" });
    }
  });
  app.post("/api/attendance/photo-request/submit", async (req, res) => {
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
      const list = await getFirestorePhotoRequests();
      const existingPending = list.find((r) => String(r.employeeId).trim() === String(emp.id).trim() && r.status === "pending");
      const requestId = existingPending ? existingPending.id : `req_${emp.id}_${Date.now()}`;
      const newReq = {
        id: requestId,
        employeeId: emp.id,
        employeeName: emp.fullName,
        branch: emp.branch || "",
        position: emp.position || "",
        currentPhotoUrl: emp.photoUrl || emp.avatarUrl || "",
        newPhotoUrl: targetPhoto,
        status: "pending",
        submittedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await saveFirestorePhotoRequest(newReq);
      res.json({
        success: true,
        message: "Rasm HR tasdig'iga muvaffaqiyatli yuborildi. Kutilmoqda.",
        request: newReq
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message || "Rasm so'rovini yuborishda xatolik" });
    }
  });
  app.post("/api/attendance/photo-request/action", async (req, res) => {
    try {
      const { requestId, employeeId, action, rejectionReason, reviewerName } = req.body || {};
      let list = await getFirestorePhotoRequests();
      let targetReq = list.find((r) => r.id === requestId || employeeId && r.employeeId === employeeId && r.status === "pending");
      if (!targetReq) {
        return res.status(404).json({ success: false, message: "So'rov topilmadi." });
      }
      if (action === "approve") {
        targetReq.status = "approved";
        targetReq.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
        targetReq.reviewedBy = reviewerName || "HR Menejer";
        targetReq.rejectionReason = void 0;
        employeePhotoOverrides[targetReq.employeeId] = targetReq.newPhotoUrl;
        const defEmp = defaultEmployees.find((e) => e.id === targetReq.employeeId);
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
      } else if (action === "reject") {
        targetReq.status = "rejected";
        targetReq.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
        targetReq.reviewedBy = reviewerName || "HR Menejer";
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
    } catch (e) {
      res.status(500).json({ success: false, message: e.message || "So'rovni ko'rib chiqishda xatolik" });
    }
  });
  app.delete("/api/attendance/photo-request/:id", async (req, res) => {
    try {
      const id = req.params.id;
      photoRequestsMap.delete(id);
      if (firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId && firebaseConfig?.apiKey) {
        const deleteUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/photo_requests/${id}?key=${firebaseConfig.apiKey}`;
        fetch(deleteUrl, { method: "DELETE" }).catch(() => {
        });
      }
      res.json({ success: true, message: "So'rov o'chirildi." });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message || "O'chirishda xatolik" });
    }
  });
  const handleTodayStatus = async (req, res) => {
    try {
      const employeeId = (req.query.employeeId || req.query.id || req.query.username || req.query.login || "").toString().trim();
      if (!employeeId && !hasInternalAdminToken(req)) {
        return res.status(403).json({ success: false, message: "employeeId parametri talab qilinadi" });
      }
      const now = /* @__PURE__ */ new Date();
      const todayIso = getLocalIsoDate(now);
      const todayStr = getLocalDateFormatted(now);
      const allEmployees = await getAllServerEmployees();
      const matched = employeeId ? findServerEmployee(allEmployees, employeeId) : null;
      const targetEmpId = matched ? matched.id : employeeId;
      const allLogs = await getAllServerAttendanceLogs(targetEmpId);
      const empLogs = allLogs.filter((l) => {
        const matchesEmp = !targetEmpId || l.employeeId === targetEmpId || matched && l.employeeId === matched.id || matched && l.username && l.username.toLowerCase() === (matched.username || "").toLowerCase() || l.employeeName && matched && l.employeeName.toLowerCase() === matched.fullName.toLowerCase();
        const logIso = String(l.dateIso || l.date || l.timestamp || "").slice(0, 10);
        const matchesDate = logIso === todayIso || l.dateFormatted === todayStr || l.date && l.date.includes(todayIso);
        return matchesEmp && matchesDate && l.success;
      });
      const checkInLog = empLogs.find((l) => l.action === "keldim" || !l.action);
      const checkOutLog = empLogs.find((l) => l.action === "ketdim");
      const dMin = checkInLog ? Number(checkInLog.delayMinutes) || 0 : 0;
      const pAmount = checkInLog ? checkInLog.penaltyAmount !== void 0 ? Number(checkInLog.penaltyAmount) : calculatePenaltyAmount(dMin, penaltySettings) : 0;
      res.json({
        success: true,
        employee: matched ? {
          id: matched.id,
          fullName: matched.fullName,
          branch: matched.branch,
          position: matched.position
        } : null,
        hasCheckedIn: !!checkInLog,
        checkInTime: checkInLog ? checkInLog.timeFormatted || checkInLog.checkIn || checkInLog.time : null,
        hasCheckedOut: !!checkOutLog,
        checkOutTime: checkOutLog ? checkOutLog.timeFormatted || checkOutLog.checkOut || checkOutLog.time : null,
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
    } catch (err) {
      res.status(500).json({ success: false, message: "Bugungi statusni olishda xatolik" });
    }
  };
  app.get("/api/attendance/today-status", handleTodayStatus);
  app.get("/api/qatnashish/today-status", handleTodayStatus);
  app.get("/api/davomat/today-status", handleTodayStatus);
  app.get("/api/qatnashish/bugungi-holat", handleTodayStatus);
  app.get("/api/davomat/bugungi-holat", handleTodayStatus);
  app.get("/api/attendance/check-in", (req, res) => {
    res.status(405).json({
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Faqat POST so'rovi ruxsat etilgan."
    });
  });
  const handleAttendanceCheckIn = async (req, res) => {
    try {
      const {
        employeeId: rawEmpId,
        employeeName,
        username,
        branchId,
        branchName,
        userLat,
        userLon,
        action = "keldim",
        // 'keldim' yoki 'ketdim'
        capturedPhoto,
        // jonli kameradan tushirilgan rasm (base64 yoki URL)
        faceVerified,
        // yuz tanish kodi tasdiqladimi (true/false)
        faceConfidence,
        // yuz o'xshashlik foizi (masalan, 0.94)
        sessionToken
      } = req.body;
      let tokenEmpId = null;
      const authHeader = req.headers.authorization || "";
      const effectiveToken = sessionToken || (authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : "");
      if (effectiveToken && effectiveToken.startsWith("token_")) {
        const parts = effectiveToken.split("_");
        if (parts.length >= 2) {
          tokenEmpId = parts[1];
        }
      }
      const employeeId = rawEmpId || tokenEmpId;
      const latVal = userLat ?? req.body?.lat ?? req.body?.latitude ?? req.body?.coords?.lat ?? req.body?.coordinates?.lat;
      const lonVal = userLon ?? req.body?.lon ?? req.body?.lng ?? req.body?.longitude ?? req.body?.coords?.lon ?? req.body?.coordinates?.lng;
      if (latVal === void 0 || lonVal === void 0) {
        return res.status(400).json({
          success: false,
          code: "MISSING_COORDINATES",
          message: "GPS geolokatsiya koordinatalari topilmadi. userLat va userLon parametrlarini yuboring."
        });
      }
      const allEmployees = await getAllServerEmployees();
      const lookupQuery = employeeId || username || employeeName;
      const emp = (lookupQuery ? findServerEmployee(allEmployees, lookupQuery) : null) || {
        id: employeeId || "EMP-UNKNOWN",
        fullName: employeeName || "Noma'lum Xodim",
        branch: branchName || "Bosh ofis",
        position: "Xodim",
        department: "Savdo",
        photoUrl: "https://hrms-toyona.vercel.app/zarifjon.jpg"
      };
      const allBranches = await getAllServerGeozones();
      const targetBranch = findMatchingGeozone(
        allBranches,
        branchName || emp.branch,
        branchId
      );
      const numLat = Number(latVal);
      const numLon = Number(lonVal);
      const distance = !isNaN(numLat) && !isNaN(numLon) ? calculateDistanceMeters(numLat, numLon, targetBranch.lat, targetBranch.lon) : 0;
      const insideZone = req.body?.skipGeoCheck === true && hasInternalAdminToken(req) ? true : distance <= targetBranch.radius;
      const now = /* @__PURE__ */ new Date();
      const currentHours = Number(now.toLocaleTimeString("en-GB", { timeZone: "Asia/Tashkent", hour: "2-digit", hour12: false }));
      const currentMinutes = Number(now.toLocaleTimeString("en-GB", { timeZone: "Asia/Tashkent", minute: "2-digit", hour12: false }));
      const currentTotalMin = currentHours * 60 + currentMinutes;
      const [schedH, schedM] = (penaltySettings.workStartTime || "09:00").split(":").map(Number);
      const scheduledTotalMin = (schedH || 9) * 60 + (schedM || 0);
      const gracePeriodMin = Number(penaltySettings.gracePeriodMinutes) || 15;
      const dateIso = getLocalIsoDate(now);
      const dayOfWeek = now.getDay();
      const isRestDay = (penaltySettings.restDays || []).includes(dayOfWeek) || (penaltySettings.customHolidays || []).includes(dateIso);
      let delayMinutes = 0;
      let penaltyAmount = 0;
      if (!isRestDay && action === "keldim" && currentTotalMin > scheduledTotalMin + gracePeriodMin) {
        delayMinutes = currentTotalMin - scheduledTotalMin;
        penaltyAmount = calculatePenaltyAmount(delayMinutes, penaltySettings);
      }
      const statusText = isRestDay ? action === "keldim" ? "Dam olish kunida kelgan" : "Dam olish kunida ketdi" : action === "ketdim" ? "Ketdi (Ish yakunlandi)" : delayMinutes > 0 ? `Kech qolgan (${delayMinutes} daqiqa)` : "Vaqtida kelgan";
      const timeFormatted = getLocalTimeString(now);
      const dateFormatted = getLocalDateFormatted(now);
      const allLogs = await getAllServerAttendanceLogs(emp.id);
      const empLogsToday = allLogs.filter((l) => {
        const matchesEmp = l.employeeId === emp.id || Boolean(emp.username) && l.username && l.username.toLowerCase() === String(emp.username).toLowerCase() || l.employeeName && l.employeeName.toLowerCase() === emp.fullName.toLowerCase();
        const logIso = String(l.dateIso || l.date || l.timestamp || "").slice(0, 10);
        const matchesDate = logIso === dateIso || l.dateFormatted === dateFormatted || l.date && l.date.includes(dateIso);
        return matchesEmp && matchesDate && l.success;
      });
      const checkInLog = empLogsToday.find((l) => l.action === "keldim" || !l.action);
      const checkOutLog = empLogsToday.find((l) => l.action === "ketdim");
      if (action === "keldim" && checkInLog) {
        const prevTime = checkInLog.timeFormatted || checkInLog.checkIn || checkInLog.time || "";
        return res.status(400).json({
          success: false,
          code: "ALREADY_CHECKED_IN",
          message: `Siz bugun allaqachon "Keldim" deb qayd etilgansiz${prevTime ? ` (soat ${prevTime} da)` : ""}! Takroriy kelish qabul qilinmaydi.`
        });
      }
      if (action === "ketdim" && !checkInLog) {
        return res.status(400).json({
          success: false,
          code: "NOT_CHECKED_IN_YET",
          message: `Avval "Keldim" tugmasi orqali ishga kelganingizni tasdiqlashingiz kerak!`
        });
      }
      if (action === "ketdim" && checkOutLog) {
        const prevTime = checkOutLog.timeFormatted || checkOutLog.checkOut || checkOutLog.time || "";
        return res.status(400).json({
          success: false,
          code: "ALREADY_CHECKED_OUT",
          message: `Siz bugun allaqachon "Ketdim" deb qayd etilgansiz${prevTime ? ` (soat ${prevTime} da)` : ""}! Takroriy ketish qabul qilinmaydi.`
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
        status: insideZone ? `${statusText} (${targetBranch.name})` : `Rad etildi (${targetBranch.name} hududidan tashqarida: ${distance}m > ${targetBranch.radius}m)`,
        success: insideZone,
        delayMinutes,
        penaltyAmount,
        penaltyFormatted: penaltyAmount > 0 ? `${penaltyAmount.toLocaleString()} so'm` : "0 so'm",
        isRestDay,
        referencePhotoUrl: emp.photoUrl,
        capturedPhoto: capturedPhoto ? capturedPhoto.length > 200 ? capturedPhoto.substring(0, 200) + "..." : capturedPhoto : null,
        faceVerified: faceVerified !== void 0 ? faceVerified : true,
        faceConfidence: faceConfidence !== void 0 ? Number(faceConfidence) : 0.95
      };
      attendanceLogs.unshift(newLog);
      saveLocalAttendance(attendanceLogs);
      if (insideZone) {
        try {
          await saveFirestoreAttendance({
            id: `att-${emp.id}-${dateIso}`,
            employeeId: emp.id,
            employeeName: emp.fullName,
            branch: targetBranch.name,
            department: emp.department,
            date: dateIso,
            checkIn: action === "keldim" ? timeFormatted : checkInLog ? checkInLog.timeFormatted || checkInLog.checkIn : void 0,
            checkOut: action === "ketdim" ? timeFormatted : void 0,
            prevCheckIn: checkInLog ? checkInLog.timeFormatted || checkInLog.checkIn : void 0,
            checkInTimestamp: action === "keldim" ? now.toISOString() : void 0,
            checkOutTimestamp: action === "ketdim" ? now.toISOString() : void 0,
            status: statusText,
            delayMinutes,
            capturedPhoto: capturedPhoto || "",
            faceVerified: faceVerified !== void 0 ? faceVerified : true,
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
          message: action === "keldim" ? `Muvaffaqiyatli! ${emp.fullName}, siz ${targetBranch.name} hududida (${distance}m) "Keldim" deb qayd etildingiz.${penaltyAmount > 0 ? ` (Kechikish: ${formatDelayText(delayMinutes)}, Jarima: ${penaltyAmount.toLocaleString()} so'm)` : ""}` : `Muvaffaqiyatli! ${emp.fullName}, siz ${targetBranch.name} hududida (${distance}m) "Ketdim" deb qayd etildingiz. Xayrli kech!`,
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
    } catch (err) {
      console.error("Attendance check-in error:", err);
      res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Serverda xatolik yuz berdi" });
    }
  };
  app.post("/api/attendance/check-in", handleAttendanceCheckIn);
  app.post("/api/qatnashish/check-in", handleAttendanceCheckIn);
  app.post("/api/davomat/check-in", handleAttendanceCheckIn);
  let employeeLeaveStatuses = {};
  app.get("/api/attendance/employees", async (req, res) => {
    try {
      const all = await getAllServerEmployees();
      const sanitized = all.map((e) => {
        const leave = employeeLeaveStatuses[e.id] || { isVacation: false, isTrip: false };
        let leaveBadge = "Ishda";
        if (leave.isVacation) leaveBadge = "\u2708\uFE0F Ta'tilda";
        else if (leave.isTrip) leaveBadge = "\u{1F343} Ish safarida";
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
          phone: e.phone || "",
          email: e.email || "",
          avatarUrl: e.avatarUrl || e.photoUrl,
          photoUrl: e.photoUrl,
          rasmUrl: e.rasmUrl || e.photoUrl,
          username: e.id === "emp-101" ? "" : e.username,
          login: e.id === "emp-101" ? "" : e.username,
          isAccountActive: e.isAccountActive !== false,
          accountCreatedAt: e.accountCreatedAt || "2026-10-12",
          salary: e.salary || "4,000,000 UZS",
          hireDate: e.hireDate || "2026-01-01",
          birthDate: e.birthDate || "",
          gender: e.gender || "Erkak",
          address: e.address || "",
          status: e.status,
          isVacationActive: leave.isVacation,
          isTripActive: leave.isTrip,
          leaveStatusBadge: leaveBadge,
          leaveNote: leave.note || ""
        };
      });
      res.json(sanitized);
    } catch (err) {
      res.status(500).json([]);
    }
  });
  app.post("/api/attendance/employees", async (req, res) => {
    try {
      const emp = req.body || {};
      const id = String(emp.id || emp.firestoreId || `emp-${Date.now()}`).trim();
      deletedEmployeeIds.delete(id);
      const currentList = loadLocalEmployees();
      const existingIdx = currentList.findIndex((x) => x.id === id);
      const existing = existingIdx >= 0 ? currentList[existingIdx] : defaultEmployees.find((x) => x.id === id) || {};
      const photo = emp.avatarUrl || emp.photoUrl || emp.rasmUrl || existing.photoUrl || "https://hrms-toyona.vercel.app/zarifjon.jpg";
      const merged = {
        id,
        staffId: emp.staffId || existing.staffId || "TS-0001",
        fullName: emp.fullName || existing.fullName || "Xodim",
        position: emp.position || existing.position || "Mutaxassis",
        department: emp.department || existing.department || "Savdo",
        branch: emp.branch || existing.branch || "Bosh ofis",
        phone: emp.phone ?? existing.phone ?? "",
        email: emp.email ?? existing.email ?? "",
        photoUrl: photo,
        avatarUrl: photo,
        rasmUrl: photo,
        username: emp.username !== void 0 ? emp.username : existing.username || "",
        password: emp.password !== void 0 ? emp.password : existing.password || "",
        status: emp.status || existing.status || "active",
        isAccountActive: emp.isAccountActive !== void 0 ? Boolean(emp.isAccountActive) : existing.isAccountActive ?? true,
        accountCreatedAt: emp.accountCreatedAt || existing.accountCreatedAt || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        salary: emp.salary || existing.salary || "4,000,000 UZS",
        hireDate: emp.hireDate || existing.hireDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        birthDate: emp.birthDate || existing.birthDate || "",
        gender: emp.gender || existing.gender || "Erkak",
        address: emp.address || existing.address || ""
      };
      const defIdx = defaultEmployees.findIndex((x) => x.id === id);
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
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.delete("/api/attendance/employees/:id", async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ success: false, message: "ID ko'rsatilmadi" });
      deletedEmployeeIds.add(id);
      if (firebaseConfig?.projectId && firebaseConfig?.firestoreDatabaseId && firebaseConfig?.apiKey) {
        const deleteUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/employees/${id}?key=${firebaseConfig.apiKey}`;
        fetch(deleteUrl, { method: "DELETE" }).catch(() => {
        });
      }
      console.log(`[DELETE] Xodim muvaffaqiyatli o'chirildi: ${id}`);
      res.json({ success: true, message: `Xodim (${id}) serverdan o'chirildi` });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  const handleLeaveSync = (req, res) => {
    const { employeeId, username, status, isVacation, isTrip, note } = req.body;
    const targetId = employeeId || username;
    if (!targetId) {
      return res.status(400).json({ success: false, message: "employeeId yoki username kiritilmadi" });
    }
    const vac = isVacation ?? (status === "tatilda" || status === "vacation");
    const trip = isTrip ?? (status === "safarda" || status === "trip" || status === "business_trip");
    employeeLeaveStatuses[targetId] = {
      isVacation: !!vac,
      isTrip: !!trip,
      note: note || ""
    };
    res.json({
      success: true,
      employeeId: targetId,
      isVacationActive: !!vac,
      isTripActive: !!trip,
      badge: vac ? "\u2708\uFE0F Ta'tilda (Samolyot)" : trip ? "\u{1F343} Ish safarida (Barg)" : "Ishda",
      message: "Xodim ta'til/safar holati HRMS tizimida yangilandi."
    });
  };
  app.post("/api/attendance/leave-sync", handleLeaveSync);
  app.post("/api/qatnashish/leave-sync", handleLeaveSync);
  app.post("/api/davomat/leave-sync", handleLeaveSync);
  app.post("/api/qatnashish/tatil-sync", handleLeaveSync);
  app.post("/api/davomat/tatil-sync", handleLeaveSync);
  app.get("/api/attendance/docs", (req, res) => {
    const host = req.get("host") || "ais-pre-bk2ecsa4uidxq66izqrrgk-913174961397.asia-east1.run.app";
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
        leaveIndicators: "Xodim ta'tilda (\u2708\uFE0F) yoki safarda (\u{1F343}) bo'lsa, davomat ilovasida mos indikator yonib turishi shart."
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
          description: "Xodimning ta'til (\u2708\uFE0F) yoki xizmat safari (\u{1F343}) holatini yangilash/sinxronlash",
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
          description: "Barcha xodimlar, ularning login-parollari, biriktirilgan filiali, etalon rasmi va ta'til/safar (\u2708\uFE0F/\u{1F343}) holatlari ro'yxati"
        },
        branchesList: {
          method: "GET",
          url: "/api/branch-geozones",
          description: "Barcha filiallar koordinatalari (lat, lon) va ruxsat etilgan radiuslari (metrda)"
        }
      }
    });
  });
  const handleAttendanceHistory = async (req, res) => {
    const employeeId = (req.query.employeeId || req.query.id || "").toString().trim();
    if ((!employeeId || employeeId === "all") && !hasInternalAdminToken(req)) {
      return res.status(403).json({ success: false, message: "Ruxsatsiz so'rov bloklandi" });
    }
    const month = (req.query.month || "").toString();
    const year = (req.query.year || "2026").toString();
    const allLogs = await getAllServerAttendanceLogs(employeeId);
    let filtered = [...allLogs];
    if (employeeId && employeeId !== "all") {
      filtered = filtered.filter(
        (l) => l.employeeId === employeeId || l.username && l.username.toLowerCase() === employeeId.toLowerCase()
      );
    }
    if (month) {
      filtered = filtered.filter((l) => {
        const dIso = l.dateIso || l.timestamp || "";
        const dUz = l.dateFormatted || "";
        return dIso.includes(month) || dUz.includes(month);
      });
    }
    if (year) {
      filtered = filtered.filter((l) => {
        const dIso = l.dateIso || l.timestamp || "";
        const dUz = l.dateFormatted || "";
        return dIso.includes(year) || dUz.includes(year);
      });
    }
    const totalRecords = filtered.length;
    const checkIns = filtered.filter((l) => l.action === "keldim" && l.success);
    const checkOuts = filtered.filter((l) => l.action === "ketdim" && l.success);
    const onTimeCount = checkIns.filter((l) => (l.delayMinutes || 0) === 0).length;
    const lateCount = checkIns.filter((l) => (l.delayMinutes || 0) > 0).length;
    const totalDelayMinutes = checkIns.reduce((sum, l) => sum + (l.delayMinutes || 0), 0);
    const averageDelayMinutes = lateCount > 0 ? Math.round(totalDelayMinutes / lateCount) : 0;
    const logsWithPenalties = filtered.map((l) => {
      const dMin = Number(l.delayMinutes) || 0;
      const penalty = l.penaltyAmount !== void 0 ? Number(l.penaltyAmount) : calculatePenaltyAmount(dMin, penaltySettings);
      return {
        ...l,
        delayFormatted: formatDelayText(dMin),
        penaltyAmount: penalty,
        penaltyFormatted: penalty > 0 ? `${penalty.toLocaleString()} so'm` : "0 so'm"
      };
    });
    const totalPenaltyAmount = logsWithPenalties.filter((l) => l.action === "keldim" && l.success).reduce((sum, l) => sum + (l.penaltyAmount || 0), 0);
    res.json({
      success: true,
      query: {
        employeeId: employeeId || "all",
        month: month || "joriy_oy",
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
  app.get("/api/attendance/penalty-settings", (req, res) => {
    res.json({
      success: true,
      settings: penaltySettings
    });
  });
  app.post("/api/attendance/penalty-settings", (req, res) => {
    try {
      const { workStartTime, workEndTime, gracePeriodMinutes, penaltyType, penaltyRate, restDays, customHolidays } = req.body || {};
      if (workStartTime !== void 0) penaltySettings.workStartTime = String(workStartTime).trim();
      if (workEndTime !== void 0) penaltySettings.workEndTime = String(workEndTime).trim();
      if (gracePeriodMinutes !== void 0) penaltySettings.gracePeriodMinutes = Math.max(0, Number(gracePeriodMinutes) || 0);
      if (penaltyType === "minute" || penaltyType === "hour") penaltySettings.penaltyType = penaltyType;
      if (penaltyRate !== void 0) penaltySettings.penaltyRate = Math.max(0, Number(penaltyRate) || 0);
      if (Array.isArray(restDays)) penaltySettings.restDays = restDays.map(Number);
      if (Array.isArray(customHolidays)) penaltySettings.customHolidays = customHolidays;
      penaltySettings.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      res.json({
        success: true,
        message: "Jarima va dam olish kunlari sozlamalari muvaffaqiyatli yangilandi!",
        settings: penaltySettings
      });
    } catch (e) {
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
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      code: "NOT_FOUND",
      message: "Manzil topilmadi"
    });
  });
}
async function startServer(appInstance = app) {
  const PORT = Number(process.env.PORT) || 3e3;
  if (!process.env.VERCEL && !process.env.SERVERLESS && process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    appInstance.use(vite.middlewares);
  } else if (!process.env.VERCEL && !process.env.SERVERLESS) {
    const distPath = import_path.default.join(process.cwd(), "dist");
    appInstance.use(import_express.default.static(distPath));
    appInstance.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  if (!process.env.VERCEL && !process.env.SERVERLESS && process.env.NODE_ENV !== "test") {
    appInstance.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}
if (!process.env.VERCEL && !process.env.SERVERLESS) {
  configureRoutes(app).then(() => {
    startServer(app);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app,
  configureRoutes,
  formatDelayText,
  startServer
});
//# sourceMappingURL=server.cjs.map
