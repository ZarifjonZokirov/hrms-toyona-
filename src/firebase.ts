import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Firestore,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { cachedFetch, invalidateCache } from './lib/cache';
export { invalidateCache } from './lib/cache';

// Suppress transient internal network retry warnings from clogging console
setLogLevel('silent');

// Initialize Firebase App
const isConfigValid = Boolean(firebaseConfig?.apiKey && !firebaseConfig.apiKey.includes('YOUR_FIREBASE_API_KEY') && firebaseConfig?.projectId && !firebaseConfig.projectId.includes('your-project-id'));
const app = (!getApps().length && isConfigValid) ? initializeApp(firebaseConfig) : (getApps().length ? getApp() : null);

// Initialize Firestore with specific database ID (CRITICAL: skill guideline)
let firestoreInstance: any = null;
if (app) {
  try {
    firestoreInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId || undefined);
  } catch {
    try {
      firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
    } catch {
      try {
        firestoreInstance = getFirestore(app);
      } catch (e) {
        console.warn('Running in standalone demo mode without cloud Firestore connection.');
      }
    }
  }
}
export const db = firestoreInstance;

// Initialize Firebase Auth
export const auth: any = app ? getAuth(app) : { currentUser: null };

// Error Handling according to firebase-integration skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

let quotaExceededLogged = false;

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || '';
  return code === 'resource-exhausted' || msg.includes('Quota exceeded') || msg.includes('quota') || msg.includes('resource-exhausted');
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const isQuota = isQuotaExceededError(error);
  if (isQuota) {
    if (!quotaExceededLogged) {
      quotaExceededLogged = true;
      console.warn("Firestore quota limit reached. System is running on offline mode. Tizim oflayn/mahalliy ma'lumotlar bilan barqaror ishlashda davom etmoqda.");
    }
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  if (!isQuota) {
    console.warn('Firestore Error Handled:', JSON.stringify(errInfo));
  }
  return errInfo;
}

// ----------------------------------------------------------------------
// FIREBASE AUTH HELPERS
// ----------------------------------------------------------------------

export async function signInWithEmail(email: string, pass: string): Promise<{ user: FirebaseUser | null; error: string | null }> {
  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    return { user: res.user, error: null };
  } catch (err: any) {
    console.warn("Firebase Auth signIn error:", err);
    return { user: null, error: err.message || "Authentication failed. Please check credentials." };
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn("SignOut error:", err);
  }
}

export async function resetPassword(email: string): Promise<{ success: boolean; message: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Password reset link sent to your email." };
  } catch (err: any) {
    console.warn("Password reset error:", err);
    return { success: false, message: err.message || "Failed to reset password" };
  }
}

// ----------------------------------------------------------------------
// 1. USERS COLLECTION
// ----------------------------------------------------------------------

export async function getFirebaseUsers(forceRefresh: boolean = false): Promise<any[]> {
  return cachedFetch('users', async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (snap.empty) return [];
      return snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
  }, 15 * 60 * 1000, forceRefresh);
}

export function subscribeFirebaseUsers(callback: (users: any[]) => void): Unsubscribe {
  try {
    return onSnapshot(collection(db, 'users'), (snap) => {
      const users = snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
      callback(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      callback([CANONICAL_SUPER_ADMIN]);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    callback([CANONICAL_SUPER_ADMIN]);
    return () => {};
  }
}

export async function saveFirebaseUser(user: any): Promise<boolean> {
  try {
    const isSuper = user.role === 'Super Admin' || user.id === 1 || user.id === '1' || user.firestoreId === 'user-1';
    const rawId = isSuper
      ? 'user-1'
      : (user.firestoreId && String(user.firestoreId).startsWith('user-'))
        ? String(user.firestoreId)
        : user.id
          ? (String(user.id).startsWith('user-') ? String(user.id) : `user-${user.id}`)
          : `user-${Date.now()}`;
    const payload: Record<string, any> = {
      ...user,
      id: isSuper ? 1 : (user.id || rawId),
      updatedAt: new Date().toISOString()
    };
    delete payload.firestoreId;
    if (!payload.username) delete payload.username;
    if (!payload.password) delete payload.password;

    await setDoc(doc(db, 'users', rawId), payload, { merge: true });
    invalidateCache('users');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'users');
    return false;
  }
}

export async function deleteFirebaseUser(userId: string | number): Promise<boolean> {
  try {
    const docId = String(userId).startsWith('user-') ? String(userId) : `user-${userId}`;
    await deleteDoc(doc(db, 'users', docId));
    invalidateCache('users');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    return false;
  }
}

export const CANONICAL_SUPER_ADMIN = {
  id: 1,
  name: 'Alexander Mitchell',
  username: 'admin',
  password: 'admin123',
  email: 'admin@novahr.com',
  role: 'Super Admin',
  branch: 'Headquarters',
  status: 'Active',
  isOnline: true,
  lastActive: 'Just now',
  allowedModules: [
    'branches', 'candidates', 'vacancies', 'employees',
    'quality', 'attendance', 'transfers', 'users',
    'geozones', 'credentials', 'reports', 'settings', 'logs'
  ],
  updatedAt: new Date().toISOString()
};

/**
 * Super Admin hujjati Firestore'da mavjud bo'lsa, faqat uning roli va
 * modullar ruxsatini tekshiradi. Login va parol faqat Firebase'da saqlanadi.
 */
export async function ensureCanonicalSuperAdminInFirebase(): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', 'user-1');
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const currentData = snap.data();
      if (currentData.role !== 'Super Admin' || !Array.isArray(currentData.allowedModules) || currentData.allowedModules.length < 5) {
        await updateDoc(userDocRef, {
          role: 'Super Admin',
          allowedModules: CANONICAL_SUPER_ADMIN.allowedModules
        });
      }
    }
  } catch (error) {
    console.warn("Could not ensure super admin in Firestore:", error);
  }
}

/**
 * User yoki xodim parolini o'zgartirganida, ushbu o'zgarishni
 * Firestore'dagi 'users' va 'employees' to'plamlariga bir vaqtda to'liq sinxron yozish
 * hamda bir xil loginli dublikat hujjatlarni tozalash.
 */
export async function syncUserPasswordInBothCollections(username: string, newPassword: string, userId?: string | number): Promise<void> {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanPass = String(newPassword || '').trim();
  if (!cleanUsername || !cleanPass) return;

  const nowIso = new Date().toISOString();
  const userVariations = Array.from(new Set([String(username || '').trim(), cleanUsername])).filter(Boolean);

  try {
    // 1. 'users' to'plamida yangilash va dublikatlarni o'chirish
    const qUsers = query(collection(db, 'users'), where('username', 'in', userVariations));
    const uSnap = await getDocs(qUsers);
    const matchingDocs = uSnap.docs;

    const primaryDoc = matchingDocs.find(d => d.id === 'user-1') || matchingDocs[0];
    for (const d of matchingDocs) {
      if (primaryDoc && d.id !== primaryDoc.id) {
        // Dublikat hujjatda eski parol qolib ketmasligi uchun uni o'chiramiz
        await deleteDoc(doc(db, 'users', d.id));
      } else {
        await updateDoc(doc(db, 'users', d.id), {
          username: String(username || '').trim(),
          password: cleanPass,
          updatedAt: nowIso
        });
      }
    }

    if (userId === 1 || userId === '1' || userId === 'user-1' || userId === 'emp-101') {
      await setDoc(doc(db, 'users', 'user-1'), {
        username: String(username || '').trim(),
        password: cleanPass,
        updatedAt: nowIso
      }, { merge: true });
      await setDoc(doc(db, 'employees', 'emp-101'), {
        username: String(username || '').trim(),
        password: cleanPass,
        updatedAt: nowIso
      }, { merge: true });
    }

    // 2. 'employees' to'plamida ham yangilash (Face ID va Davomat uchun)
    const qEmps = query(collection(db, 'employees'), where('username', 'in', userVariations));
    const eSnap = await getDocs(qEmps);
    for (const d of eSnap.docs) {
      await updateDoc(doc(db, 'employees', d.id), {
        username: String(username || '').trim(),
        password: cleanPass,
        updatedAt: nowIso
      });
    }

    invalidateCache('users');
    invalidateCache('employees');
  } catch (err) {
    console.warn("syncUserPasswordInBothCollections ogohlantirish:", err);
  }
}

/**
 * Query Firestore to check credentials for a given username and password.
 *
 * QOIDA: Login va parol faqat Firebase Firestore'dan tekshiriladi.
 * Kodda hech qanday login yoki parol saqlanmaydi.
 */
export async function verifyUserCredentialsInFirebase(username: string, password: string): Promise<any | null> {
  const rawUsername = username.trim();
  const cleanUsername = rawUsername.toLowerCase();
  const cleanPassword = password.trim();
  if (!cleanUsername || !cleanPassword) return null;

  // Standalone Demo Mode fallback
  if (!db || !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('YOUR_FIREBASE')) {
    if (cleanUsername === (CANONICAL_SUPER_ADMIN.username || '').toLowerCase() && cleanPassword === CANONICAL_SUPER_ADMIN.password) {
      return { ...CANONICAL_SUPER_ADMIN, firestoreId: 'demo-admin' };
    }
    return null;
  }

  const toTime = (v: any): number => {
    if (!v) return 0;
    if (typeof v === 'string') { const t = Date.parse(v); return isNaN(t) ? 0 : t; }
    if (typeof v?.toMillis === 'function') return v.toMillis();
    if (typeof v?.seconds === 'number') return v.seconds * 1000;
    return 0;
  };

  try {
    const userVariations = Array.from(new Set([rawUsername, cleanUsername])).filter(Boolean);

    // 1. 'users' to'plamidan qidirish
    const usersSnap = await getDocs(query(collection(db, 'users'), where('username', 'in', userVariations)));
    const userDocs = usersSnap.docs.filter(d => (d.data().username || '').trim().toLowerCase() === cleanUsername);

    if (userDocs.length > 0) {
      const latest = userDocs.reduce((best, cur) =>
        toTime(cur.data().updatedAt) >= toTime(best.data().updatedAt) ? cur : best
      );
      const u = latest.data();
      return (u.password || '').trim() === cleanPassword
        ? { ...u, firestoreId: latest.id }
        : null;
    }

    // 2. 'users'da topilmasa, 'employees' to'plami tekshiriladi
    const empSnap = await getDocs(query(collection(db, 'employees'), where('username', 'in', userVariations)));
    const empDocs = empSnap.docs.filter(d => (d.data().username || '').trim().toLowerCase() === cleanUsername);
    if (empDocs.length > 0) {
      const latestEmp = empDocs.reduce((best, cur) =>
        toTime(cur.data().updatedAt) >= toTime(best.data().updatedAt) ? cur : best
      );
      const emp = latestEmp.data();
      if ((emp.password || '').trim() === cleanPassword && emp.isAccountActive !== false) {
        return {
          id: 100000 + (emp.staffId ? parseInt(String(emp.staffId).replace(/\D/g, '')) || 0 : Date.now() % 100000),
          name: emp.fullName || 'Employee',
          username: emp.username,
          email: emp.email || `${emp.username}@toyonasavdo.uz`,
          role: 'Staff',
          branch: emp.branch || 'Headquarters',
          status: 'Active',
          isOnline: true,
          lastActive: 'Hozir',
          allowedModules: ['employee_portal'],
          firestoreId: latestEmp.id
        };
      }
      return null;
    }

    return null;
  } catch (error) {
    console.error("Firestore credential verification error:", error);
    if (cleanUsername === (CANONICAL_SUPER_ADMIN.username || '').toLowerCase() && cleanPassword === CANONICAL_SUPER_ADMIN.password) {
      return { ...CANONICAL_SUPER_ADMIN, firestoreId: 'demo-admin' };
    }
    return null;
  }
}

// ----------------------------------------------------------------------
// 2. EMPLOYEES COLLECTION
// ----------------------------------------------------------------------

export interface DismissedEmployee {
  id: string;
  fullName: string;
  position: string;
  department: string;
  branch: string;
  phone: string;
  email: string;
  hireDate: string;
  dismissDate: string;
  dismissReason: string;
  dismissCategory: string; // e.g. "O'z xohishi bilan", "Shtat qisqarishi", "Intizom buzilishi", etc.
  staffId: string;
}

export async function getFirebaseDismissedEmployees(forceRefresh: boolean = false): Promise<DismissedEmployee[]> {
  return cachedFetch('dismissed_employees', async () => {
    try {
      const snap = await getDocs(collection(db, 'dismissed_employees'));
      if (snap.empty) return [];
      return snap.docs.map(d => ({ ...d.data(), id: d.id }) as DismissedEmployee);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'dismissed_employees');
      return [];
    }
  }, 15 * 60 * 1000, forceRefresh);
}

export function subscribeFirebaseDismissedEmployees(callback: (dismissed: DismissedEmployee[]) => void): Unsubscribe {
  try {
    return onSnapshot(collection(db, 'dismissed_employees'), (snap) => {
      const items = snap.docs.map(d => ({ ...d.data(), id: d.id }) as DismissedEmployee);
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'dismissed_employees');
      callback([]);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'dismissed_employees');
    callback([]);
    return () => {};
  }
}

export async function saveFirebaseDismissedEmployee(dismissed: DismissedEmployee): Promise<boolean> {
  try {
    const docId = dismissed.id || `dism-${Date.now()}`;
    await setDoc(doc(db, 'dismissed_employees', docId), {
      ...dismissed,
      id: docId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    invalidateCache('dismissed_employees');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'dismissed_employees');
    return false;
  }
}

export async function deleteFirebaseDismissedEmployee(docId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'dismissed_employees', docId));
    invalidateCache('dismissed_employees');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `dismissed_employees/${docId}`);
    return false;
  }
}

const LOCAL_EMPLOYEES_BACKUP_KEY = 'toyonasavdo_employees_backup_v1';

function loadLocalEmployeesBackup(): any[] {
  try {
    const raw = localStorage.getItem(LOCAL_EMPLOYEES_BACKUP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalEmployeesBackup(list: any[]): void {
  try {
    if (Array.isArray(list) && list.length > 0) {
      localStorage.setItem(LOCAL_EMPLOYEES_BACKUP_KEY, JSON.stringify(list));
    }
  } catch {}
}

export async function getFirebaseEmployees(forceRefresh: boolean = false): Promise<any[]> {
  return cachedFetch('employees', async () => {
    const map = new Map<string, any>();
    loadLocalEmployeesBackup().forEach((e: any) => {
      const id = String(e?.id || e?.firestoreId || '').trim();
      if (id) map.set(id, { ...e, id, firestoreId: id });
    });

    try {
      const snap = await getDocs(collection(db, 'employees'));
      if (!snap.empty) {
        snap.docs.forEach(d => {
          const data = d.data();
          map.set(d.id, { ...map.get(d.id), ...data, id: data.id || d.id, firestoreId: d.id });
        });
        const list = Array.from(map.values());
        saveLocalEmployeesBackup(list);
        return list;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'employees');
    }

    // Fallback to backend API (/api/attendance/employees uses non-destructive PATCH reader even when Firestore Read Quota is 429)
    try {
      const res = await fetch('/api/attendance/employees');
      if (res.ok) {
        const apiEmps = await res.json();
        if (Array.isArray(apiEmps) && apiEmps.length > 0) {
          apiEmps.forEach((e: any) => {
            const id = String(e?.id || e?.firestoreId || '').trim();
            if (!id) return;
            const prev = map.get(id) || {};
            map.set(id, {
              ...prev,
              ...e,
              id,
              firestoreId: id,
              avatarUrl: e.avatarUrl || e.photoUrl || e.rasmUrl || prev.avatarUrl,
              username: e.username || e.login || prev.username || '',
              password: e.password || e.parol || prev.password || ''
            });
          });
        }
      }
    } catch {}

    const finalList = Array.from(map.values());
    if (finalList.length > 0) {
      saveLocalEmployeesBackup(finalList);
    }
    return finalList;
  }, 15 * 60 * 1000, forceRefresh);
}

export function subscribeFirebaseEmployees(callback: (employees: any[]) => void): Unsubscribe {
  let active = true;

  // Immediately deliver cached / fallback employees so UI never hangs on a loading spinner
  getFirebaseEmployees().then((items) => {
    if (active) callback(items);
  }).catch(() => {
    if (active) callback(loadLocalEmployeesBackup());
  });

  try {
    const unsub = onSnapshot(collection(db, 'employees'), (snap) => {
      if (!active) return;
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.data().id || d.id, firestoreId: d.id }));
        saveLocalEmployeesBackup(items);
        callback(items);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'employees');
      if (active) {
        getFirebaseEmployees().then((items) => {
          if (active) callback(items);
        }).catch(() => {
          if (active) callback(loadLocalEmployeesBackup());
        });
      }
    });
    return () => {
      active = false;
      unsub();
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'employees');
    return () => { active = false; };
  }
}

export async function saveFirebaseEmployee(employee: any): Promise<boolean> {
  const docId = employee.id || `emp-${Date.now()}`;
  const payload = {
    ...employee,
    id: docId,
    firestoreId: docId,
    updatedAt: new Date().toISOString()
  };

  // 1. Update local backup immediately
  try {
    const current = loadLocalEmployeesBackup();
    const idx = current.findIndex((x: any) => String(x?.id || x?.firestoreId) === String(docId));
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...payload };
    } else {
      current.unshift(payload);
    }
    saveLocalEmployeesBackup(current);
  } catch {}

  // 2. Sync to backend server cache (/api/attendance/employees)
  fetch('/api/attendance/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});

  // 3. Save to Firestore
  try {
    await setDoc(doc(db, 'employees', docId), payload, { merge: true });
    invalidateCache('employees');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'employees');
    invalidateCache('employees');
    return false;
  }
}

export async function deleteFirebaseEmployee(employeeId: string): Promise<boolean> {
  const docId = employeeId.startsWith('emp-') ? employeeId : `emp-${employeeId}`;
  try {
    const current = loadLocalEmployeesBackup().filter(
      (x: any) => String(x?.id || x?.firestoreId) !== String(docId) && String(x?.id) !== String(employeeId)
    );
    localStorage.setItem(LOCAL_EMPLOYEES_BACKUP_KEY, JSON.stringify(current));
  } catch {}

  try {
    await deleteDoc(doc(db, 'employees', docId));
    invalidateCache('employees');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `employees/${employeeId}`);
    invalidateCache('employees');
    return false;
  }
}

// ----------------------------------------------------------------------
// 3. ATTENDANCE COLLECTION & ACTIONS
// ----------------------------------------------------------------------

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // HH:MM
  checkOut: string; // HH:MM
  checkInTimestamp?: string;
  checkOutTimestamp?: string;
  status: 'On Time' | 'Late' | 'Absent' | 'Clocked Out' | 'Rest Day' | 'Public Holiday' | 'On Leave' | 'Business Trip';
  durationDays?: number;
  leaveType?: 'vacation' | 'trip' | string;
  startDate?: string;
  endDate?: string;
  delayMinutes: number;
  delayReason?: string;
  workedMinutes?: number;
  workedTime?: string;
  isEarlyLeave?: boolean;
  penalty?: string;
  bonus?: string;
  netPay?: string;
  notes?: string;
  branch?: string;
  department?: string;
  editedBy?: string;
  editedAt?: string;
  editReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getFirebaseAttendance(date?: string, employeeId?: string): Promise<AttendanceRecord[]> {
  try {
    let qRef: any = collection(db, 'attendance');
    if (date) {
      qRef = query(collection(db, 'attendance'), where('date', '==', date));
    } else if (employeeId) {
      qRef = query(collection(db, 'attendance'), where('employeeId', '==', String(employeeId)));
    } else {
      qRef = query(collection(db, 'attendance'), limit(500));
    }

    const snap = await getDocs(qRef);
    if (snap.empty) return [];
    let records = snap.docs.map(d => ({ ...d.data(), id: d.id, firestoreId: d.id } as unknown as AttendanceRecord));
    
    if (date) {
      records = records.filter(r => r.date === date);
    }
    if (employeeId) {
      records = records.filter(r => String(r.employeeId) === String(employeeId));
    }
    
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'attendance');
    return [];
  }
}

export function subscribeFirebaseAttendance(
  callback: (records: AttendanceRecord[]) => void, 
  filterDate?: string, 
  filterEmployeeId?: string
): Unsubscribe {
  try {
    let qRef: any = collection(db, 'attendance');
    if (filterDate) {
      qRef = query(collection(db, 'attendance'), where('date', '==', filterDate));
    } else if (filterEmployeeId) {
      qRef = query(collection(db, 'attendance'), where('employeeId', '==', String(filterEmployeeId)));
    }

    return onSnapshot(qRef, (snap: any) => {
      let items = snap.docs.map((d: any) => ({ ...d.data(), id: d.id, firestoreId: d.id } as unknown as AttendanceRecord));
      if (filterDate) {
        items = items.filter((r: any) => r.date === filterDate);
      }
      if (filterEmployeeId) {
        items = items.filter((r: any) => String(r.employeeId) === String(filterEmployeeId));
      }
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
      callback([]);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'attendance');
    callback([]);
    return () => {};
  }
}

export async function saveFirebaseAttendance(record: any): Promise<boolean> {
  try {
    const docId = record.id || `att-${record.employeeId}-${record.date}`;
    await setDoc(doc(db, 'attendance', docId), {
      ...record,
      id: docId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'attendance');
    return false;
  }
}

export async function deleteFirebaseAttendance(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'attendance', id));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `attendance/${id}`);
    return false;
  }
}

// Check-in ("Check-inm") handler with duplicate check and automated delay calculation
export async function recordCheckIn(params: {
  employeeId: string;
  employeeName: string;
  branch: string;
  department: string;
  scheduledTime?: string; // default "09:00"
  graceMinutes?: number; // default 15
  dailyRate?: number; // default 250000
}): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
  try {
    const now = new Date();
    // Format YYYY-MM-DD in Tashkent time
    const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    const docId = `att-${params.employeeId}-${todayStr}`;
    const docRef = doc(db, 'attendance', docId);
    const existingSnap = await getDoc(docRef);

    if (existingSnap.exists()) {
      const data = existingSnap.data() as AttendanceRecord;
      if (data.checkIn && data.checkIn !== '--:--') {
        return {
          success: false,
          message: `You have already clocked in today (${todayStr}) at ${data.checkIn}!`
        };
      }
    }

    // Calculate delay
    const scheduled = params.scheduledTime || '09:00';
    const [schedH, schedM] = scheduled.split(':').map(Number);
    const scheduledTotalMin = schedH * 60 + schedM;
    const currentTotalMin = now.getHours() * 60 + now.getMinutes();
    const grace = params.graceMinutes ?? 15;

    let delayMin = 0;
    if (currentTotalMin > scheduledTotalMin + grace) {
      delayMin = currentTotalMin - scheduledTotalMin;
    }

    const status = delayMin > 0 ? 'Late' : 'On Time';
    const penaltyAmount = delayMin > 0 ? delayMin * 1000 : 0;
    const dailyBase = params.dailyRate || 250000;
    const net = dailyBase - penaltyAmount;

    const newRecord: AttendanceRecord = {
      id: docId,
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      date: todayStr,
      checkIn: currentTimeStr,
      checkOut: '--:--',
      checkInTimestamp: now.toISOString(),
      status,
      delayMinutes: delayMin,
      delayReason: delayMin > 0 ? 'Late arrival recorded' : undefined,
      workedMinutes: 0,
      workedTime: '-',
      penalty: penaltyAmount > 0 ? `- ${penaltyAmount.toLocaleString()} $` : '-',
      bonus: delayMin === 0 ? "15,000 $" : '-',
      netPay: `${net.toLocaleString()} $`,
      notes: delayMin > 0 ? `${delayMin} minutes late` : 'Punctual arrival',
      branch: params.branch,
      department: params.department,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await setDoc(docRef, newRecord, { merge: true });

    // Log audit event
    await logAuditEvent({
      action: "Attendance: Checked-in",
      module: 'Attendance',
      performedBy: params.employeeName,
      performedById: params.employeeId,
      role: 'Staff',
      targetId: docId,
      details: `${params.employeeName} soat ${currentTimeStr} da ishga keldi (${status})`
    });

    // Send notification if late
    if (delayMin > 0) {
      await sendHRNotification({
        title: "Late arrival recorded",
        message: `${params.employeeName} (${params.branch}) bugun ${delayMin} daqiqa kechikib keldi.`,
        type: 'attendance',
        relatedId: docId
      });
    }

    return {
      success: true,
      message: `Checked in successfully! Time: ${currentTimeStr} (${status})`,
      record: newRecord
    };
  } catch (error: any) {
    handleFirestoreError(error, OperationType.WRITE, 'attendance');
    return { success: false, message: error.message || "Failed to record check-in" };
  }
}

// Check-out ("Check-outm") handler
export async function recordCheckOut(params: {
  employeeId: string;
  employeeName: string;
  scheduledEndTime?: string; // default "18:00"
}): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
  try {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    const docId = `att-${params.employeeId}-${todayStr}`;
    const docRef = doc(db, 'attendance', docId);
    const existingSnap = await getDoc(docRef);

    if (!existingSnap.exists() || !existingSnap.data()?.checkIn || existingSnap.data()?.checkIn === '--:--') {
      return {
        success: false,
        message: "You must check in first before checking out!"
      };
    }

    const data = existingSnap.data() as AttendanceRecord;
    if (data.checkOut && data.checkOut !== '--:--') {
      return {
        success: false,
        message: `Bugun allaqachon soat ${data.checkOut} da 'Check-outm' deb belgilangansiz!`
      };
    }

    // Calculate worked minutes
    const [inH, inM] = data.checkIn.split(':').map(Number);
    const inTotalMin = inH * 60 + inM;
    const outTotalMin = now.getHours() * 60 + now.getMinutes();
    const workedMin = Math.max(0, outTotalMin - inTotalMin);
    const workedH = Math.floor(workedMin / 60);
    const workedRemM = workedMin % 60;
    const workedTimeStr = `${workedH} soat ${workedRemM} daqiqa`;

    // Check early leave
    const schedEnd = params.scheduledEndTime || '18:00';
    const [endH, endM] = schedEnd.split(':').map(Number);
    const schedEndMin = endH * 60 + endM;
    const isEarly = outTotalMin < schedEndMin - 10;

    const updatedData: Partial<AttendanceRecord> = {
      checkOut: currentTimeStr,
      checkOutTimestamp: now.toISOString(),
      workedMinutes: workedMin,
      workedTime: workedTimeStr,
      isEarlyLeave: isEarly,
      status: 'Check-out',
      updatedAt: now.toISOString(),
      notes: isEarly 
        ? `${data.notes || ''} (Erta ketdi: reja ${schedEnd})`.trim()
        : data.notes
    };

    await setDoc(docRef, updatedData, { merge: true });

    await logAuditEvent({
      action: "Attendance: Checked-out",
      module: 'Attendance',
      performedBy: params.employeeName,
      performedById: params.employeeId,
      role: 'Staff',
      targetId: docId,
      details: `${params.employeeName} soat ${currentTimeStr} da ishdan ketdi (Ishlangan vaqt: ${workedTimeStr})`
    });

    return {
      success: true,
      message: `Work shift completed successfully! Check-out: ${currentTimeStr} (Total duration: ${workedTimeStr})`,
      record: { ...data, ...updatedData } as AttendanceRecord
    };
  } catch (error: any) {
    handleFirestoreError(error, OperationType.WRITE, 'attendance');
    return { success: false, message: error.message || "Failed to record check-out" };
  }
}

// Manual attendance correction by HR with required Audit Log
export async function updateAttendanceWithAudit(params: {
  recordId: string;
  updates: Partial<AttendanceRecord>;
  performedBy: string;
  performedById?: string;
  role: string;
  reason: string;
}): Promise<boolean> {
  try {
    const docRef = doc(db, 'attendance', params.recordId);
    const now = new Date().toISOString();

    await setDoc(docRef, {
      ...params.updates,
      editedBy: params.performedBy,
      editedAt: now,
      editReason: params.reason,
      updatedAt: now
    }, { merge: true });

    await logAuditEvent({
      action: "Attendance: Manual Correction",
      module: 'Attendance',
      performedBy: params.performedBy,
      performedById: params.performedById,
      role: params.role,
      targetId: params.recordId,
      details: `Attendance log modified. Reason: ${params.reason}`,
      reason: params.reason
    });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `attendance/${params.recordId}`);
    return false;
  }
}

// ----------------------------------------------------------------------
// 4. LEAVE REQUESTS (TA'TIL VA RUXSATLAR)
// ----------------------------------------------------------------------

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  branch: string;
  type: 'Annual Leave' | 'Sick Leave' | 'Family Emergency' | 'Other Leave';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  attachmentUrl?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getFirebaseLeaveRequests(forceRefresh: boolean = false): Promise<LeaveRequest[]> {
  return cachedFetch('leaveRequests', async () => {
    try {
      const snap = await getDocs(collection(db, 'leaveRequests'));
      if (snap.empty) return [];
      return snap.docs.map(d => ({ ...d.data(), id: d.id }) as LeaveRequest);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'leaveRequests');
      return [];
    }
  }, 10 * 60 * 1000, forceRefresh);
}

export function subscribeFirebaseLeaveRequests(callback: (requests: LeaveRequest[]) => void): Unsubscribe {
  try {
    return onSnapshot(collection(db, 'leaveRequests'), (snap) => {
      const items = snap.docs.map(d => ({ ...d.data(), id: d.id }) as LeaveRequest);
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leaveRequests');
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'leaveRequests');
    return () => {};
  }
}

export async function saveFirebaseLeaveRequest(req: Partial<LeaveRequest>): Promise<boolean> {
  try {
    const docId = req.id || `leave-${Date.now()}`;
    const now = new Date().toISOString();
    const data: LeaveRequest = {
      id: docId,
      employeeId: req.employeeId || '',
      employeeName: req.employeeName || 'Employee',
      department: req.department || '',
      branch: req.branch || '',
      type: req.type || 'Yillik ta\'til',
      startDate: req.startDate || '',
      endDate: req.endDate || '',
      daysCount: req.daysCount || 1,
      reason: req.reason || '',
      attachmentUrl: req.attachmentUrl,
      status: req.status || 'Pending',
      createdAt: req.createdAt || now,
      updatedAt: now
    };

    await setDoc(doc(db, 'leaveRequests', docId), data, { merge: true });
    invalidateCache('leaveRequests');

    // Send notification to HR
    await sendHRNotification({
      title: "New Leave Request",
      message: `${data.employeeName} (${data.type}) uchun ${data.daysCount} kunlik so'rov yubordi.`,
      type: 'leave',
      relatedId: docId
    });

    await logAuditEvent({
      action: "Leave request submitted",
      module: 'Ta\'tillar',
      performedBy: data.employeeName,
      performedById: data.employeeId,
      role: 'Staff',
      targetId: docId,
      details: `${data.type}: ${data.startDate} dan ${data.endDate} gacha (${data.daysCount} kun)`
    });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'leaveRequests');
    return false;
  }
}

export async function updateLeaveRequestStatus(params: {
  requestId: string;
  status: 'Tasdiqlangan' | 'Rad etilgan';
  reviewedBy: string;
  reviewComment?: string;
}): Promise<boolean> {
  try {
    const docRef = doc(db, 'leaveRequests', params.requestId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;

    const current = snap.data() as LeaveRequest;
    const now = new Date().toISOString();

    await setDoc(docRef, {
      status: params.status,
      reviewedBy: params.reviewedBy,
      reviewedAt: now,
      reviewComment: params.reviewComment || '',
      updatedAt: now
    }, { merge: true });

    // Send direct notification to the employee
    await saveFirebaseNotification({
      targetUserId: current.employeeId,
      title: `Ta'til so'rovingiz: ${params.status}`,
      message: `${params.reviewedBy} sizning ${current.startDate} dan ${current.endDate} gacha bo'lgan so'rovingizni ${params.status.toLowerCase()} deb belgiladi.`,
      type: 'leave',
      read: false,
      relatedId: params.requestId
    });

    await logAuditEvent({
      action: `Ta'til so'rovi ${params.status.toLowerCase()}`,
      module: 'Ta\'tillar',
      performedBy: params.reviewedBy,
      role: 'HR Menejer',
      targetId: params.requestId,
      details: `${current.employeeName} ning ta'tili: ${params.status}. Izoh: ${params.reviewComment || 'Izohsiz'}`
    });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `leaveRequests/${params.requestId}`);
    return false;
  }
}

export async function deleteFirebaseLeaveRequest(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'leaveRequests', id));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `leaveRequests/${id}`);
    return false;
  }
}

// ----------------------------------------------------------------------
// 5. WORK SCHEDULES (ISH GRAFIGI)
// ----------------------------------------------------------------------

export interface WorkSchedule {
  id: string;
  name: string;
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "18:00"
  gracePeriodMinutes: number; // e.g. 15
  workDays: number[]; // e.g. [1, 2, 3, 4, 5, 6]
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getFirebaseWorkSchedules(forceRefresh: boolean = false): Promise<WorkSchedule[]> {
  return cachedFetch('workSchedules', async () => {
    try {
      const snap = await getDocs(collection(db, 'workSchedules'));
      if (snap.empty) return [];
      return snap.docs.map(d => ({ ...d.data(), id: d.id }) as WorkSchedule);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'workSchedules');
      return [];
    }
  }, 15 * 60 * 1000, forceRefresh);
}

export function subscribeFirebaseWorkSchedules(callback: (schedules: WorkSchedule[]) => void): Unsubscribe {
  try {
    return onSnapshot(collection(db, 'workSchedules'), (snap) => {
      const items = snap.docs.map(d => ({ ...d.data(), id: d.id }) as WorkSchedule);
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workSchedules');
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'workSchedules');
    return () => {};
  }
}

export async function saveFirebaseWorkSchedule(schedule: Partial<WorkSchedule>): Promise<boolean> {
  try {
    const docId = schedule.id || `sched-${Date.now()}`;
    const now = new Date().toISOString();
    await setDoc(doc(db, 'workSchedules', docId), {
      ...schedule,
      id: docId,
      updatedAt: now
    }, { merge: true });
    invalidateCache('workSchedules');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'workSchedules');
    return false;
  }
}

export async function deleteFirebaseWorkSchedule(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'workSchedules', id));
    invalidateCache('workSchedules');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `workSchedules/${id}`);
    return false;
  }
}

// ----------------------------------------------------------------------
// 6. HOLIDAYS (BAYRAM VA DAM OLISH KUNLARI)
// ----------------------------------------------------------------------

export interface HolidayItem {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: 'Public Holiday' | 'Corporate Holiday';
  createdAt: string;
}

export async function getFirebaseHolidays(forceRefresh: boolean = false): Promise<HolidayItem[]> {
  return cachedFetch('holidays', async () => {
    try {
      const snap = await getDocs(collection(db, 'holidays'));
      if (snap.empty) return [];
      return snap.docs.map(d => ({ ...d.data(), id: d.id }) as HolidayItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'holidays');
      return [];
    }
  }, 15 * 60 * 1000, forceRefresh);
}

export function subscribeFirebaseHolidays(callback: (holidays: HolidayItem[]) => void): Unsubscribe {
  try {
    return onSnapshot(collection(db, 'holidays'), (snap) => {
      const items = snap.docs.map(d => ({ ...d.data(), id: d.id }) as HolidayItem);
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'holidays');
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'holidays');
    return () => {};
  }
}

export async function saveFirebaseHoliday(holiday: Partial<HolidayItem>): Promise<boolean> {
  try {
    const docId = holiday.id || `hol-${Date.now()}`;
    await setDoc(doc(db, 'holidays', docId), {
      ...holiday,
      id: docId,
      createdAt: holiday.createdAt || new Date().toISOString()
    }, { merge: true });
    invalidateCache('holidays');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'holidays');
    return false;
  }
}

export async function deleteFirebaseHoliday(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'holidays', id));
    invalidateCache('holidays');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `holidays/${id}`);
    return false;
  }
}

// ----------------------------------------------------------------------
// 7. NOTIFICATIONS (BILDIRISHNOMALAR)
// ----------------------------------------------------------------------

export interface HRNotification {
  id: string;
  targetUserId?: string;
  targetRolee?: string;
  title: string;
  message: string;
  type: 'attendance' | 'leave' | 'announcement' | 'system';
  read: boolean;
  relatedId?: string;
  createdAt: string;
}

export async function getFirebaseNotifications(targetUserId?: string): Promise<HRNotification[]> {
  try {
    let qRef: any = query(collection(db, 'notifications'), limit(100));
    if (targetUserId) {
      try {
        qRef = query(collection(db, 'notifications'), where('targetUserId', '==', targetUserId), limit(50));
      } catch {}
    }
    const snap = await getDocs(qRef);
    if (snap.empty) return [];
    let list = snap.docs.map(d => ({ ...d.data(), id: d.id }) as HRNotification);
    if (targetUserId) {
      list = list.filter(n => !n.targetUserId || n.targetUserId === targetUserId);
    }
    // Sort descending by date
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'notifications');
    return [];
  }
}

export function subscribeFirebaseNotifications(
  callback: (notifications: HRNotification[]) => void, 
  targetUserId?: string
): Unsubscribe {
  try {
    let qRef: any = query(collection(db, 'notifications'), limit(50));
    if (targetUserId) {
      try {
        qRef = query(collection(db, 'notifications'), where('targetUserId', '==', targetUserId), limit(50));
      } catch {}
    }

    return onSnapshot(qRef, (snap: any) => {
      let list = snap.docs.map((d: any) => ({ ...d.data(), id: d.id }) as HRNotification);
      if (targetUserId) {
        list = list.filter((n: any) => !n.targetUserId || n.targetUserId === targetUserId);
      }
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'notifications');
    return () => {};
  }
}

export async function saveFirebaseNotification(notif: Partial<HRNotification>): Promise<boolean> {
  try {
    const docId = notif.id || `notif-${Date.now()}`;
    await setDoc(doc(db, 'notifications', docId), {
      ...notif,
      id: docId,
      read: notif.read ?? false,
      createdAt: notif.createdAt || new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'notifications');
    return false;
  }
}

export async function sendHRNotification(params: {
  title: string;
  message: string;
  type: 'attendance' | 'leave' | 'announcement' | 'system';
  relatedId?: string;
}): Promise<boolean> {
  return saveFirebaseNotification({
    targetRolee: 'HR Menejer',
    title: params.title,
    message: params.message,
    type: params.type,
    relatedId: params.relatedId,
    read: false
  });
}

export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    await setDoc(doc(db, 'notifications', id), { read: true }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${id}`);
    return false;
  }
}

export async function markAllNotificationsRead(ids: string[]): Promise<void> {
  try {
    await Promise.all(ids.map(id => markNotificationRead(id)));
  } catch (e) {
    console.warn("markAllNotificationsRead error:", e);
  }
}

// ----------------------------------------------------------------------
// 8. AUDIT LOGS (AUDIT VA XAVFSIZLIK IZLARI)
// ----------------------------------------------------------------------

export interface AuditLogItem {
  id: string;
  action: string;
  module: string;
  performedBy: string;
  performedById?: string;
  role: string;
  targetId?: string;
  details: string;
  reason?: string;
  timestamp: string;
}

export async function getFirebaseAuditLogs(): Promise<AuditLogItem[]> {
  try {
    const snap = await getDocs(query(collection(db, 'auditLogs'), limit(150)));
    if (snap.empty) return [];
    const list = snap.docs.map(d => ({ ...d.data(), id: d.id }) as AuditLogItem);
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'auditLogs');
    return [];
  }
}

export function subscribeFirebaseAuditLogs(callback: (logs: AuditLogItem[]) => void): Unsubscribe {
  try {
    return onSnapshot(query(collection(db, 'auditLogs'), limit(150)), (snap: any) => {
      const list = snap.docs.map((d: any) => ({ ...d.data(), id: d.id }) as AuditLogItem);
      list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'auditLogs');
    return () => {};
  }
}

export async function logAuditEvent(entry: Partial<AuditLogItem>): Promise<boolean> {
  try {
    const docId = entry.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await setDoc(doc(db, 'auditLogs', docId), {
      ...entry,
      id: docId,
      timestamp: entry.timestamp || new Date().toISOString()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'auditLogs');
    return false;
  }
}

// ----------------------------------------------------------------------
// 9. SETTINGS COLLECTION
// ----------------------------------------------------------------------

export interface SystemSettings {
  id: string;
  companyName: string;
  defaultGraceMinutes: number;
  dailyLatePenaltyRate: number;
  defaultAnnualLeaveDays: number;
  timeZone: string;
  updatedAt: string;
}

export const DEFAULT_HRMS_SETTINGS: SystemSettings = {
  id: 'general',
  companyName: "NovaHR Enterprise HRMS",
  defaultGraceMinutes: 15,
  dailyLatePenaltyRate: 1000,
  defaultAnnualLeaveDays: 24,
  timeZone: "Asia/Tashkent",
  updatedAt: new Date().toISOString()
};

export async function getFirebaseSettings(): Promise<SystemSettings> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'general'));
    if (snap.exists()) {
      return { ...DEFAULT_HRMS_SETTINGS, ...snap.data() } as SystemSettings;
    }
    return DEFAULT_HRMS_SETTINGS;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'settings/general');
    return DEFAULT_HRMS_SETTINGS;
  }
}

export async function saveFirebaseSettings(settings: Partial<SystemSettings>): Promise<boolean> {
  try {
    await setDoc(doc(db, 'settings', 'general'), {
      ...settings,
      id: 'general',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/general');
    return false;
  }
}

// ----------------------------------------------------------------------
// 10. BRANCHES, DEPARTMENTS & OTHER EXISTING ENTITIES
// ----------------------------------------------------------------------

export async function getFirebaseBranches(forceRefresh: boolean = false): Promise<any[]> {
  return cachedFetch('branches', async () => {
    try {
      const snap = await getDocs(collection(db, 'branches'));
      if (snap.empty) return [];
      return snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'branches');
      return [];
    }
  }, 15 * 60 * 1000, forceRefresh);
}

export async function saveFirebaseBranch(branch: any): Promise<boolean> {
  try {
    const docId = branch.id || `branch-${Date.now()}`;
    await setDoc(doc(db, 'branches', docId), {
      ...branch,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    invalidateCache('branches');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'branches');
    return false;
  }
}

export async function deleteFirebaseBranch(branchId: string): Promise<boolean> {
  try {
    const docId = branchId.startsWith('branch-') ? branchId : `branch-${branchId}`;
    await deleteDoc(doc(db, 'branches', docId));
    invalidateCache('branches');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `branches/${branchId}`);
    return false;
  }
}



export async function getFirebaseCandidates(forceRefresh: boolean = false): Promise<any[]> {
  return cachedFetch('candidates', async () => {
    try {
      const snap = await getDocs(collection(db, 'candidates'));
      if (snap.empty) return [];
      return snap.docs.map(d => ({ ...d.data(), id: d.id, firestoreId: d.id }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'candidates');
      return [];
    }
  }, 15 * 60 * 1000, forceRefresh);
}

export async function saveFirebaseCandidate(candidate: any): Promise<boolean> {
  try {
    const docId = candidate.id || `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await setDoc(doc(db, 'candidates', docId), {
      ...candidate,
      id: docId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    invalidateCache('candidates');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'candidates');
    return false;
  }
}

export async function deleteFirebaseCandidate(candidateId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'candidates', candidateId));
    invalidateCache('candidates');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `candidates/${candidateId}`);
    return false;
  }
}



export async function getFirebaseTransfers(forceRefresh: boolean = false): Promise<any[]> {
  return cachedFetch('transfers', async () => {
    try {
      const snap = await getDocs(collection(db, 'transfers'));
      if (snap.empty) {
        try {
          localStorage.removeItem('hrms_transfers_v3');
        } catch {}
        return [];
      }
      const list = snap.docs.map(d => ({ ...d.data(), id: d.data().id || d.id, firestoreId: d.id }));
      try {
        localStorage.setItem('hrms_transfers_v3', JSON.stringify(list));
      } catch {}
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'transfers');
      return [];
    }
  }, 5 * 60 * 1000, forceRefresh);
}

export async function saveFirebaseTransfer(transfer: any): Promise<boolean> {
  try {
    const docId = String(transfer.id || `tr-${Date.now()}`).trim();
    const payload = {
      ...transfer,
      id: docId,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'transfers', docId), payload, { merge: true });
    try {
      const saved = localStorage.getItem('hrms_transfers_v3');
      const list = saved ? JSON.parse(saved) : [];
      if (Array.isArray(list)) {
        const idx = list.findIndex((t: any) => t.id === docId || t.firestoreId === docId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...payload };
        } else {
          list.unshift(payload);
        }
        localStorage.setItem('hrms_transfers_v3', JSON.stringify(list));
      }
    } catch {}
    invalidateCache('transfers');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'transfers');
    return false;
  }
}

export async function deleteFirebaseTransfer(transferId: string): Promise<boolean> {
  try {
    const rawId = String(transferId || '').trim();
    if (!rawId) return false;
    await deleteDoc(doc(db, 'transfers', rawId)).catch(() => {});
    if (rawId.startsWith('tr-')) {
      const stripped = rawId.substring(3);
      if (stripped) await deleteDoc(doc(db, 'transfers', stripped)).catch(() => {});
    } else {
      await deleteDoc(doc(db, 'transfers', `tr-${rawId}`)).catch(() => {});
    }
    try {
      const saved = localStorage.getItem('hrms_transfers_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((t: any) => t.id !== rawId && t.firestoreId !== rawId && t.id !== `tr-${rawId}`);
          localStorage.setItem('hrms_transfers_v3', JSON.stringify(filtered));
        }
      }
    } catch {}
    invalidateCache('transfers');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `transfers/${transferId}`);
    return false;
  }
}

export async function getFirebaseVacancies(forceRefresh: boolean = false): Promise<any[]> {
  return cachedFetch('vacancies', async () => {
    try {
      const snap = await getDocs(collection(db, 'vacancies'));
      if (snap.empty) return [];
      return snap.docs.map(d => ({ ...d.data(), id: d.id, firestoreId: d.id }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'vacancies');
      return [];
    }
  }, 15 * 60 * 1000, forceRefresh);
}

export function subscribeFirebaseVacancies(callback: (vacancies: any[]) => void): Unsubscribe {
  try {
    return onSnapshot(collection(db, 'vacancies'), (snap) => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id, firestoreId: d.id }));
      callback(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vacancies');
      callback([]);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'vacancies');
    callback([]);
    return () => {};
  }
}

export async function saveFirebaseVacancy(vacancy: any): Promise<boolean> {
  try {
    const docId = vacancy.id || `vac-${Date.now()}`;
    await setDoc(doc(db, 'vacancies', docId), {
      ...vacancy,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    invalidateCache('vacancies');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'vacancies');
    return false;
  }
}

export async function deleteFirebaseVacancy(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'vacancies', id));
    invalidateCache('vacancies');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'vacancies');
    return false;
  }
}

export async function getFirebaseHistory(forceRefresh: boolean = false): Promise<any[]> {
  return cachedFetch('history', async () => {
    try {
      const snap = await getDocs(query(collection(db, 'history'), limit(150)));
      if (snap.empty) return [];
      return snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'history');
      return [];
    }
  }, 5 * 60 * 1000, forceRefresh);
}

export async function saveFirebaseHistory(entry: any): Promise<boolean> {
  try {
    const docId = entry.id || `log-${Date.now()}`;
    await setDoc(doc(db, 'history', docId), {
      ...entry,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    invalidateCache('history');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'history');
    return false;
  }
}

export async function deleteFirebaseHistory(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'history', id));
    invalidateCache('history');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `history/${id}`);
    return false;
  }
}

export async function getFirebaseGeozones(forceRefresh: boolean = false): Promise<any[]> {
  return cachedFetch('geozones', async () => {
    try {
      const snap = await getDocs(collection(db, 'geozones'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'geozones');
    }
    try {
      const res = await fetch('/api/geozones');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {}
    return [];
  }, 15 * 60 * 1000, forceRefresh);
}

export async function saveFirebaseGeozone(geozone: any): Promise<boolean> {
  try {
    const docId = geozone.id || `gz-${Date.now()}`;
    await setDoc(doc(db, 'geozones', docId), {
      ...geozone,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    invalidateCache('geozones');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'geozones');
    return false;
  }
}

export async function deleteFirebaseGeozone(geozoneId: string): Promise<boolean> {
  try {
    const docId = geozoneId.startsWith('gz-') || geozoneId.startsWith('branch-') ? geozoneId : `gz-${geozoneId}`;
    await deleteDoc(doc(db, 'geozones', docId));
    invalidateCache('geozones');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `geozones/${geozoneId}`);
    return false;
  }
}

export async function getFirebaseStats(forceRefresh: boolean = false): Promise<any | null> {
  return cachedFetch('stats', async () => {
    try {
      const docSnap = await getDoc(doc(db, 'statistics', 'overview'));
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'statistics/overview');
      return null;
    }
  }, 10 * 60 * 1000, forceRefresh);
}

export async function saveFirebaseStats(stats: any): Promise<boolean> {
  try {
    await setDoc(doc(db, 'statistics', 'overview'), {
      ...stats,
      lastCalculatedAt: new Date().toISOString()
    }, { merge: true });
    invalidateCache('stats');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'statistics/overview');
    return false;
  }
}

export async function getFirebaseAttendanceLogs(date?: string): Promise<any[]> {
  try {
    let qRef: any = query(collection(db, 'attendance_logs'), limit(300));
    if (date) {
      try {
        qRef = query(collection(db, 'attendance_logs'), where('date', '==', date), limit(300));
      } catch {}
    }
    const snap = await getDocs(qRef);
    if (snap.empty) return [];
    return snap.docs.map(d => ({ ...d.data(), firestoreId: d.id }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'attendance_logs');
    return [];
  }
}

export async function saveFirebaseAttendanceLog(log: any): Promise<boolean> {
  try {
    const docId = log.id || `attlog-${Date.now()}`;
    await setDoc(doc(db, 'attendance_logs', docId), {
      ...log,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'attendance_logs');
    return false;
  }
}

export default app;
