import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Filter, Plus, Calendar, Clock, Download, 
  ArrowLeft, ArrowRight, Archive, Edit, Settings, Bell, X, CheckCircle2,
  AlertTriangle, UserCheck, UserX, User, Building2, Briefcase,
  TrendingUp, FileSpreadsheet, ChevronLeft, ChevronRight, HelpCircle,
  Key, MapPin, Plane, Leaf, Navigation, ScanFace, Camera, Radio, Check,
  Sparkles, ShieldCheck, Code, Copy, ExternalLink, RefreshCw,
  Upload, Image as ImageIcon, VideoOff, Eye, Trash2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { exportToExcel, exportToPDF } from '../lib/export';
import { ExportButtons } from './ExportButtons';
import { BRANCHES_LIST } from './Candidates';
import { INITIAL_EMPLOYEES, Employee } from './Employees';
import { 
  getFirebaseEmployees, 
  saveFirebaseEmployee, 
  getFirebaseAttendance, 
  saveFirebaseAttendance,
  saveFirebaseAttendanceLog,
  recordCheckIn,
  recordCheckOut,
  getFirebaseGeozones
} from '../firebase';
import { DEFAULT_GEOZONES, BranchGeozone } from './BranchGeozones';
import { ToyonaBrand } from './Logo';

// Haversine formula: Masofani metrda hisoblash (xodim va filial koordinatalari o'rtasida)
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Yer radiusi (metr)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Xodim filiali bo'yicha geozona qidirish (aniq va moslashuvchan)
export function getBranchGeozone(branchName: string, geozones: BranchGeozone[] = DEFAULT_GEOZONES): BranchGeozone {
  if (!branchName) return geozones[0] || DEFAULT_GEOZONES[0];
  
  const clean = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanTarget = clean(branchName);

  // 1. Exact or normalized matching
  const exact = geozones.find(g => clean(g.name) === cleanTarget);
  if (exact) return exact;

  // 2. Substring matching (e.g. 'Turkiston' in 'Turkiston filiali')
  const partial = geozones.find(g => {
    const cleanG = clean(g.name);
    return cleanG.includes(cleanTarget) || cleanTarget.includes(cleanG);
  });
  if (partial) return partial;

  // 3. Keyword matching (first word)
  const firstWord = branchName.trim().split(/\s+/)[0]?.toLowerCase();
  if (firstWord && firstWord.length > 2) {
    const keywordMatch = geozones.find(g => g.name.toLowerCase().includes(firstWord));
    if (keywordMatch) return keywordMatch;
  }

  return geozones[0] || DEFAULT_GEOZONES[0];
}

export function formatDelayText(delayMinutes: number): string {
  const d = Math.max(0, Number(delayMinutes) || 0);
  if (d <= 0) return "Kechikish yo'q";
  if (d < 60) return `${d} daqiqa`;
  const hours = Math.floor(d / 60);
  const remaining = d % 60;
  if (remaining === 0) return `${hours} soat`;
  return `${hours} soat ${remaining} daqiqa`;
}

export function formatDelayShort(delayMinutes: number): string {
  const d = Math.max(0, Number(delayMinutes) || 0);
  if (d <= 0) return "";
  if (d < 60) return `${d} daq`;
  const hours = Math.floor(d / 60);
  const remaining = d % 60;
  if (remaining === 0) return `${hours} soat`;
  return `${hours} soat ${remaining} daq`;
}

export interface EmployeeData {
  id: string;
  fullName: string;
  branch: string;
  department: string;
  position: string;
  avatarUrl?: string;
  schedule: string; // e.g., '09:00 - 18:00'
  phone?: string;
  dailyRate?: number; // kunlik stavka (so'm)
  login?: string;
  password?: string;
}

export function getEmployeeCredentials(emp: EmployeeData) {
  const cleanName = (emp.fullName || '').toLowerCase()
    .replace(/['’`ʻ]/g, '')
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.+/g, '.');
  const login = emp.login || cleanName || `user.${emp.id}`;
  const numId = (emp.id || '1').replace(/\D/g, '') || '1';
  const password = emp.password || `Toyona${numId}*2026`;
  return { login, password };
}

export interface DailyAttendance {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // '--:--' if absent
  checkOut: string; // '--:--' if absent
  status: 'Vaqtida kelgan' | 'Kech qolgan' | 'Kelmagan' | 'Dam olish kuni' | 'Ketdi' | 'Ta\'tilda' | 'Ish yuzasidan safarda';
  delayMinutes: number;
  delayReason?: string; // e.g., 'Transport tirbandligi', 'Shaxsiy sabab', 'Boshqa'
  workedTime: string;
  penalty: string;
  bonus: string;
  netPay: string;
  notes?: string;
  durationDays?: number;
  leaveType?: 'vacation' | 'trip' | string;
  startDate?: string;
  endDate?: string;
}

// Seed initial realistic attendance logs for September and October 2026
function generateSeedAttendance(employees: EmployeeData[]): DailyAttendance[] {
  const records: DailyAttendance[] = [];

  employees.forEach((emp, empIdx) => {
    const dailyBase = emp.dailyRate || 250000;

    // Helper to generate a single day's record
    const generateDayRecord = (year: number, monthIndex: number, day: number, monthStr: string) => {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      const dateObj = new Date(year, monthIndex, day);
      const isSunday = dateObj.getDay() === 0;

      if (isSunday) {
        return {
          id: `att-${emp.id}-${dateStr}`,
          employeeId: emp.id,
          date: dateStr,
          checkIn: '--:--',
          checkOut: '--:--',
          status: 'Dam olish kuni' as const,
          delayMinutes: 0,
          workedTime: '-',
          penalty: '-',
          bonus: '-',
          netPay: "0 so'm",
          notes: 'Yakshanba dam olish kuni'
        };
      }

      // Seed 1: Employee index 2 is on Vacation (✈️ Ta'tilda - Samolyot, 14 kun)
      if (empIdx === 2 && monthIndex === 9 && day >= 1 && day <= 14) {
        return {
          id: `att-${emp.id}-${dateStr}`,
          employeeId: emp.id,
          date: dateStr,
          checkIn: '--:--',
          checkOut: '--:--',
          status: 'Ta\'tilda' as const,
          delayMinutes: 0,
          workedTime: 'Ta\'tilda',
          penalty: '-',
          bonus: '-',
          netPay: `${dailyBase.toLocaleString()} so'm`,
          notes: '✈️ Yillik mehnat ta\'tili (14 kun: 01.10.2026 - 14.10.2026)',
          durationDays: 14,
          leaveType: 'vacation',
          startDate: '2026-10-01',
          endDate: '2026-10-14'
        };
      }

      // Seed 2: Employee index 4 is on Business trip (🍃 Ish yuzasidan safarda - Barg, 5 kun)
      if (empIdx === 4 && monthIndex === 9 && day >= 5 && day <= 9) {
        return {
          id: `att-${emp.id}-${dateStr}`,
          employeeId: emp.id,
          date: dateStr,
          checkIn: '--:--',
          checkOut: '--:--',
          status: 'Ish yuzasidan safarda' as const,
          delayMinutes: 0,
          workedTime: 'Safarda',
          penalty: '-',
          bonus: '-',
          netPay: `${dailyBase.toLocaleString()} so'm`,
          notes: '🍃 Ish yuzasidan xizmat safari (5 kun: 05.10.2026 - 09.10.2026) — Samarqand filiali taftishi',
          durationDays: 5,
          leaveType: 'trip',
          startDate: '2026-10-05',
          endDate: '2026-10-09'
        };
      }

      const patternMod = (empIdx * 3 + day) % 10;

      if (patternMod === 9) {
        // Absent (Kelmagan)
        return {
          id: `att-${emp.id}-${dateStr}`,
          employeeId: emp.id,
          date: dateStr,
          checkIn: '--:--',
          checkOut: '--:--',
          status: 'Kelmagan' as const,
          delayMinutes: 0,
          workedTime: '-',
          penalty: '-',
          bonus: '-',
          netPay: "0 so'm",
          notes: 'Sababsiz kelmadi'
        };
      } else if (patternMod === 4 || patternMod === 7) {
        // Late (Kech qolgan)
        const lateMin = (patternMod === 4 ? 14 : 28);
        const inHour = 9;
        const inMinStr = lateMin < 10 ? `0${lateMin}` : `${lateMin}`;
        const penaltyAmount = lateMin * 1000;
        const net = dailyBase - penaltyAmount;
        const reasons = ['Transport tirbandligi', 'Shaxsiy sabab', 'Ob-havo / Transport kechikishi'];
        const chosenReason = reasons[(day + empIdx) % reasons.length];

        return {
          id: `att-${emp.id}-${dateStr}`,
          employeeId: emp.id,
          date: dateStr,
          checkIn: `0${inHour}:${inMinStr}`,
          checkOut: '18:15',
          status: 'Kech qolgan' as const,
          delayMinutes: lateMin,
          delayReason: chosenReason,
          workedTime: '8 soat 45 daqiqa',
          penalty: `- ${penaltyAmount.toLocaleString()} so'm`,
          bonus: '-',
          netPay: `${net.toLocaleString()} so'm`,
          notes: `${chosenReason} tufayli ${formatDelayText(lateMin)} kechikkan`
        };
      } else {
        // On time (Vaqtida kelgan)
        const earlyMin = ((day + empIdx) % 15);
        const inMin = 60 - earlyMin;
        const inHour = inMin >= 50 ? '08' : '09';
        const inMinStr = inMin >= 50 ? `${inMin}` : `0${earlyMin % 5}`;
        const bonusAmount = 15000;
        const net = dailyBase + bonusAmount;

        return {
          id: `att-${emp.id}-${dateStr}`,
          employeeId: emp.id,
          date: dateStr,
          checkIn: `${inHour}:${inMinStr}`,
          checkOut: '18:20',
          status: (monthIndex === 9 && day === 7) ? 'Vaqtida kelgan' as const : 'Ketdi' as const,
          delayMinutes: 0,
          workedTime: '9 soat 10 daqiqa',
          penalty: '-',
          bonus: `${bonusAmount.toLocaleString()} so'm`,
          netPay: `${net.toLocaleString()} so'm`,
          notes: 'O\'z vaqtida kelib ish vaqtini to\'liq o\'tagan'
        };
      }
    };

    // September days (up to 30)
    for (let day = 1; day <= 30; day++) {
      records.push(generateDayRecord(2026, 8, day, '09'));
    }

    // October days (up to 7 - today)
    for (let day = 1; day <= 10; day++) {
      records.push(generateDayRecord(2026, 9, day, '10'));
    }
  });

  return records;
}

interface AttendanceJournalProps {
  currentUser?: any;
  isSuperAdmin?: boolean;
  onNavigateToCredentials?: () => void;
  onNavigateToBranches?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToPhotoRequests?: () => void;
}

export default function AttendanceJournal({ 
  currentUser, 
  isSuperAdmin,
  onNavigateToCredentials,
  onNavigateToBranches,
  onNavigateToSettings,
  onNavigateToPhotoRequests
}: AttendanceJournalProps) {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Modals
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [gpsTargetEmployee, setGpsTargetEmployee] = useState<EmployeeData | null>(null);
  const [showFaceIdModal, setShowFaceIdModal] = useState(false);
  const [faceIdTargetEmployee, setFaceIdTargetEmployee] = useState<EmployeeData | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_time' | 'late' | 'absent' | 'leave' | 'trip' | 'rest'>('all');
  const [geozones, setGeozones] = useState<BranchGeozone[]>(DEFAULT_GEOZONES);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPenaltySettingsModal, setShowPenaltySettingsModal] = useState(false);
  const [showLeaveTripModal, setShowLeaveTripModal] = useState(false);
  const [leaveTripTargetEmployee, setLeaveTripTargetEmployee] = useState<EmployeeData | null>(null);
  const [leaveTripInitialType, setLeaveTripInitialType] = useState<'leave' | 'trip'>('leave');
  const [activeTab, setActiveTab] = useState('Davomat');
  const [selectedMonth, setSelectedMonth] = useState('Sentyabr, 2026');
  const [editingRecord, setEditingRecord] = useState<DailyAttendance | null>(null);

  const [faceIdInitialTab, setFaceIdInitialTab] = useState<'photos' | 'accounts' | 'simulator' | 'requests'>('photos');
  const [pendingPhotoRequestsCount, setPendingPhotoRequestsCount] = useState<number>(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await fetch('/api/attendance/photo-requests?status=pending');
        const data = await res.json();
        if (data.success && Array.isArray(data.requests)) {
          setPendingPhotoRequestsCount(data.requests.length);
        }
      } catch {}
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 15000);
    return () => clearInterval(interval);
  }, [showFaceIdModal]);

  const handleOpenGpsModal = (emp?: EmployeeData | null) => {
    setGpsTargetEmployee(emp || null);
    setShowGpsModal(true);
  };

  const handleOpenFaceIdModal = (emp?: EmployeeData | null, tab: 'photos' | 'accounts' | 'simulator' | 'requests' = 'photos') => {
    setFaceIdTargetEmployee(emp || null);
    setFaceIdInitialTab(tab);
    setShowFaceIdModal(true);
  };

  const handleUpdateEmployeePhoto = (empId: string, newPhotoUrl: string) => {
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, avatarUrl: newPhotoUrl } : e));
  };

  const handleOpenLeaveModal = (emp?: EmployeeData | null, type: 'leave' | 'trip' = 'leave') => {
    setLeaveTripTargetEmployee(emp || null);
    setLeaveTripInitialType(type);
    setShowLeaveTripModal(true);
  };

  const handleSaveLeaveTrip = async (config: {
    employeeId: string;
    type: 'leave' | 'trip';
    startDate: string;
    durationDays: number;
    endDate: string;
    reason: string;
    isPaid: boolean;
  }) => {
    const emp = employees.find(e => e.id === config.employeeId);
    if (!emp) return;

    const isLeave = config.type === 'leave';
    const startParts = config.startDate.split('-').map(Number);
    const updatedRecords: DailyAttendance[] = [];

    for (let i = 0; i < config.durationDays; i++) {
      const d = new Date(startParts[0], startParts[1] - 1, startParts[2] + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const recId = `att-${emp.id}-${dateStr}`;

      const rec: DailyAttendance = {
        id: recId,
        employeeId: emp.id,
        date: dateStr,
        checkIn: '--:--',
        checkOut: '--:--',
        status: isLeave ? 'Ta\'tilda' : 'Ish yuzasidan safarda',
        delayMinutes: 0,
        workedTime: isLeave ? 'Ta\'tilda' : 'Xizmat safari',
        penalty: '-',
        bonus: '-',
        netPay: config.isPaid ? `${(emp.dailyRate || 280000).toLocaleString()} so'm` : "0 so'm",
        notes: `${isLeave ? "✈️ Ta'tilda" : "🍃 Ish yuzasidan safarda"} (${config.durationDays} kun: ${config.startDate} - ${config.endDate}) — ${config.reason}`,
        durationDays: config.durationDays,
        leaveType: config.type,
        startDate: config.startDate,
        endDate: config.endDate
      };
      updatedRecords.push(rec);
    }

    setAttendanceRecords(prev => {
      const newIdSet = new Set(updatedRecords.map(r => r.id));
      const retained = prev.filter(r => !newIdSet.has(r.id));
      return [...updatedRecords, ...retained];
    });

    for (const r of updatedRecords) {
      await saveFirebaseAttendance(r);
    }

    setShowLeaveTripModal(false);
    showToast(`${emp.fullName} uchun ${config.durationDays} kunlik ${isLeave ? "ta'til (Samolyot ✈️)" : "xizmat safari (Barg 🍃)"} muvaffaqiyatli saqlandi!`);
  };

  // Sync with Firebase on mount
  useEffect(() => {
    let active = true;
    async function initData() {
      try {
        const [fbEmployees, fbAttendance, fbGeozones] = await Promise.all([
          getFirebaseEmployees(),
          getFirebaseAttendance(),
          getFirebaseGeozones()
        ]);
        if (!active) return;

        if (fbGeozones && fbGeozones.length > 0) {
          setGeozones(fbGeozones);
        }

        let finalEmployees: EmployeeData[] = [];
        if (fbEmployees && fbEmployees.length > 0) {
          finalEmployees = fbEmployees.map((e: any) => ({
            id: e.id || e.firestoreId,
            fullName: e.fullName || 'Noma\'lum',
            branch: e.branch || 'Bosh ofis',
            department: e.department || 'Boshqaruv',
            position: e.position || 'Mutaxassis',
            avatarUrl: e.avatarUrl,
            schedule: e.schedule || '09:00 - 18:00',
            phone: e.phone,
            dailyRate: e.dailyRate || 280000
          }));
        } else {
          finalEmployees = INITIAL_EMPLOYEES.map(e => ({
            ...e,
            schedule: '09:00 - 18:00',
            dailyRate: 280000
          })) as EmployeeData[];
        }
        setEmployees(finalEmployees);

        if (fbAttendance && fbAttendance.length > 0) {
          setAttendanceRecords(fbAttendance as DailyAttendance[]);
        } else {
          const seeds = generateSeedAttendance(finalEmployees);
          setAttendanceRecords(seeds);
        }
      } catch (error) {
        console.error("Firebase sync error:", error);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    initData();
    return () => { active = false; };
  }, []);

  const handleRecordAttendance = async (record: DailyAttendance) => {
    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => r.id !== record.id);
      return [record, ...filtered];
    });
    await saveFirebaseAttendance(record);
    const emp = employees.find(e => e.id === record.employeeId);
    await saveFirebaseAttendanceLog({
      id: `attlog-${Date.now()}`,
      employeeId: record.employeeId,
      employeeName: emp?.fullName || 'Xodim',
      branchName: emp?.branch || 'Bosh ofis',
      timeFormatted: record.checkIn || '--:--',
      dateFormatted: record.date,
      status: record.status,
      delayMinutes: record.delayMinutes || 0,
      notes: record.notes || '',
      success: record.status !== 'Kelmagan'
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Branches list including from records & constants
  const availableBranches = useMemo(() => {
    const list = new Set<string>();
    BRANCHES_LIST.forEach(b => list.add(b));
    employees.forEach(e => { if (e.branch) list.add(e.branch); });
    return Array.from(list).sort();
  }, [employees]);

  // Base employees matching branch and search query
  const baseEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesBranch = selectedBranch === 'all' || (emp.branch || '') === selectedBranch;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        (emp.fullName || '').toLowerCase().includes(q) || 
        (emp.position || '').toLowerCase().includes(q) ||
        (emp.branch || '').toLowerCase().includes(q) ||
        (emp.department || '').toLowerCase().includes(q);
      return matchesBranch && matchesSearch;
    });
  }, [employees, selectedBranch, searchQuery]);

  // Daily attendance for selected date
  const dateAttendanceMap = useMemo(() => {
    const map = new Map<string, DailyAttendance>();
    attendanceRecords.filter(r => r.date === selectedDate).forEach(r => {
      map.set(r.employeeId, r);
    });
    return map;
  }, [attendanceRecords, selectedDate]);

  // Real calculation of stats for selected date across baseEmployees
  const stats = useMemo(() => {
    const total = baseEmployees.length;
    let onTimeCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let leftCount = 0;
    let restCount = 0;
    let leaveCount = 0;
    let tripCount = 0;

    const parts = (selectedDate || '').split('-');
    const isSunday = parts.length === 3 ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getDay() === 0 : false;

    baseEmployees.forEach(emp => {
      const record = dateAttendanceMap.get(emp.id);
      if (record) {
        if (record.status === 'Vaqtida kelgan') onTimeCount++;
        else if (record.status === 'Kech qolgan') lateCount++;
        else if (record.status === 'Kelmagan') absentCount++;
        else if (record.status === 'Ketdi') leftCount++;
        else if (record.status === 'Dam olish kuni') restCount++;
        else if (record.status === 'Ta\'tilda') leaveCount++;
        else if (record.status === 'Ish yuzasidan safarda') tripCount++;
      } else {
        if (isSunday) {
          restCount++;
        } else {
          absentCount++;
        }
      }
    });

    const activeWorking = onTimeCount + lateCount + leftCount;
    const notPresent = absentCount;

    return {
      total,
      onTimeCount,
      lateCount,
      absentCount,
      leftCount,
      restCount,
      leaveCount,
      tripCount,
      activeWorking,
      notPresent
    };
  }, [baseEmployees, dateAttendanceMap, selectedDate]);

  // Filtered employees according to active statusFilter
  const filteredEmployees = useMemo(() => {
    return baseEmployees.filter(emp => {
      if (statusFilter === 'all') return true;
      const record = dateAttendanceMap.get(emp.id);
      const isSunday = selectedDate ? new Date(selectedDate).getDay() === 0 : false;
      const effectiveStatus = record?.status || (isSunday ? 'Dam olish kuni' : 'Kelmagan');

      if (statusFilter === 'on_time') return effectiveStatus === 'Vaqtida kelgan' || effectiveStatus === 'Ketdi';
      if (statusFilter === 'late') return effectiveStatus === 'Kech qolgan';
      if (statusFilter === 'absent') return effectiveStatus === 'Kelmagan';
      if (statusFilter === 'leave') return effectiveStatus === 'Ta\'tilda';
      if (statusFilter === 'trip') return effectiveStatus === 'Ish yuzasidan safarda';
      if (statusFilter === 'rest') return effectiveStatus === 'Dam olish kuni';
      return true;
    });
  }, [baseEmployees, statusFilter, dateAttendanceMap, selectedDate]);

  // Dynamic Doughnut Chart Data
  const chartData = useMemo(() => {
    if (stats.total === 0) {
      return [{ name: 'Mavjud emas', value: 1, fill: '#e2e8f0' }];
    }

    const data = [];
    if (stats.onTimeCount > 0) data.push({ name: 'Vaqtida kelgan', value: stats.onTimeCount, fill: '#10b981' });
    if (stats.leftCount > 0) data.push({ name: 'Ishdan ketgan', value: stats.leftCount, fill: '#059669' });
    if (stats.lateCount > 0) data.push({ name: 'Kech qolgan', value: stats.lateCount, fill: '#f59e0b' });
    if (stats.leaveCount > 0) data.push({ name: 'Ta\'tilda (Samolyot)', value: stats.leaveCount, fill: '#0284c7' });
    if (stats.tripCount > 0) data.push({ name: 'Safarda (Barg)', value: stats.tripCount, fill: '#10b981' });
    if (stats.restCount > 0) data.push({ name: 'Dam olish', value: stats.restCount, fill: '#3b82f6' });
    if (stats.absentCount > 0) data.push({ name: 'Ishga kelmagan', value: stats.absentCount, fill: '#f43f5e' });

    if (data.length === 0) {
      data.push({ name: 'Kelmagan', value: stats.total, fill: '#f43f5e' });
    }

    return data;
  }, [stats]);

  // Export report (Excel and PDF)
  const handleExportAttendance = (format: 'excel' | 'pdf') => {
    const fileName = `Toyona_Davomat_${selectedDate}`;
    const headers = ['№', 'F.I.Sh', 'Filial', 'Bo\'lim', 'Lavozim', 'Keldi', 'Ketdi', 'Status', 'Jami ishlagan', 'Qo\'lga tegadi'];
    const data = filteredEmployees.map((emp, idx) => {
      const record = dateAttendanceMap.get(emp.id);
      return [
        idx + 1,
        emp.fullName,
        emp.branch,
        emp.department,
        emp.position,
        record?.checkIn || '--:--',
        record?.checkOut || '--:--',
        record?.status || 'Ishga kelmagan',
        record?.workedTime || '-',
        record?.netPay || '0 so\'m'
      ];
    });

    if (format === 'excel') {
      const excelData = filteredEmployees.map((emp, idx) => {
        const record = dateAttendanceMap.get(emp.id);
        return {
          '№': idx + 1,
          'F.I.Sh': emp.fullName,
          'Filial': emp.branch,
          'Bo\'lim': emp.department,
          'Lavozim': emp.position,
          'Sana': selectedDate,
          'Ish jadvali': emp.schedule,
          'Kelish vaqti': record?.checkIn || '--:--',
          'Ketish vaqti': record?.checkOut || '--:--',
          'Holati': record?.status || 'Ishga kelmagan',
          'Jami ishlagan': record?.workedTime || '-',
          'Kechikish (daqiqa)': record?.delayMinutes || 0,
          'Jarima': record?.penalty || '-',
          'Bonus': record?.bonus || '-',
          'Qo\'lga tegadi': record?.netPay || '0 so\'m',
          'Izoh': record?.notes || '-'
        };
      });
      exportToExcel(excelData, fileName);
    } else {
      exportToPDF(headers, data, fileName, `Toyona Savdo - Davomat Jurnali (${selectedDate})`, 'landscape');
    }
    showToast(`Hisobot muvaffaqiyatli yuklab olindi! (${filteredEmployees.length} xodim)`);
  };

  // Export report to CSV
  const handleExportCSV = () => {
    const headers = [
      'T/r', 'Ism va familiya', 'Filial', 'Bo\'lim', 'Lavozim', 
      'Sana', 'Ish vaqti', 'Keldi', 'Ketdi', 'Status', 'Jami ishlagan', 'Jarimasi', 'Bonusi', 'Qo\'lga tegadi'
    ];

    const rows = filteredEmployees.map((emp, idx) => {
      const record = dateAttendanceMap.get(emp.id);
      return [
        idx + 1,
        `"${emp.fullName}"`,
        `"${emp.branch}"`,
        `"${emp.department}"`,
        `"${emp.position}"`,
        selectedDate,
        emp.schedule,
        record?.checkIn || '--:--',
        record?.checkOut || '--:--',
        `"${record?.status || 'Ishga kelmagan'}"`,
        `"${record?.workedTime || '-'}"`,
        `"${record?.penalty || '-'}"`,
        `"${record?.bonus || '-'}"`,
        `"${record?.netPay || '0 so\'m'}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Toyona_Savdo_Davomat_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Hisobot muvaffaqiyatli yuklab olindi! (${filteredEmployees.length} xodim)`);
  };

  // Add a new employee
  const handleSaveNewEmployee = async (newEmp: any) => {
    const fullEmp: EmployeeData = {
      id: `emp-${Date.now()}`,
      fullName: newEmp.fullName,
      branch: newEmp.branch,
      department: newEmp.department,
      position: newEmp.position,
      schedule: newEmp.schedule || '09:00 - 18:00',
      phone: newEmp.phone || '',
      dailyRate: Number(newEmp.dailyRate) || 280000
    };

    setEmployees(prev => [fullEmp, ...prev]);

    // Save to Firebase
    await saveFirebaseEmployee(fullEmp);

    // Seed default record for today
    const newRecord: DailyAttendance = {
      id: `att-${fullEmp.id}-${selectedDate}`,
      employeeId: fullEmp.id,
      date: selectedDate,
      checkIn: '08:50',
      checkOut: '--:--',
      status: 'Vaqtida kelgan',
      delayMinutes: 0,
      workedTime: 'Boshlangan',
      penalty: '-',
      bonus: "15 000 so'm",
      netPay: "295 000 so'm",
      notes: 'Tizimga yangi qo\'shildi'
    };

    setAttendanceRecords(prev => [newRecord, ...prev]);
    await saveFirebaseAttendance(newRecord);

    setShowAddEmployeeModal(false);
    showToast(`${fullEmp.fullName} xodimlar ro'yxatiga muvaffaqiyatli qo'shildi!`);
  };

  // Active employee for detail view
  const activeEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  if (selectedEmployeeId && activeEmployee) {
    return (
      <>
        <EmployeeDetailView 
          employee={activeEmployee} 
          onBack={() => setSelectedEmployeeId(null)}
          records={attendanceRecords.filter(r => r.employeeId === activeEmployee.id)}
          onOpenLeaveModal={(emp, type) => handleOpenLeaveModal(emp, type)}
          onOpenGpsModal={(emp) => handleOpenGpsModal(emp)}
          onOpenFaceIdModal={(emp) => handleOpenFaceIdModal(emp)}
          onUpdateRecord={async (updatedRecord) => {
            setAttendanceRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
            await saveFirebaseAttendance(updatedRecord);
            showToast(`Davomat yozuvi muvaffaqiyatli tahrirlandi!`);
          }}
          onArchiveEmployee={() => {
            setEmployees(prev => prev.filter(e => e.id !== activeEmployee.id));
            setSelectedEmployeeId(null);
            showToast(`${activeEmployee.fullName} xodimi arxivlandi.`);
          }}
        />
        {showLeaveTripModal && (
          <LeaveTripModal 
            employee={leaveTripTargetEmployee || activeEmployee}
            employees={employees}
            initialType={leaveTripInitialType}
            initialDate={selectedDate}
            onClose={() => setShowLeaveTripModal(false)}
            onSave={handleSaveLeaveTrip}
          />
        )}
        {showGpsModal && (
          <GpsCheckInModal 
            employee={gpsTargetEmployee || activeEmployee}
            employees={employees}
            geozones={geozones}
            selectedDate={selectedDate}
            onClose={() => {
              setShowGpsModal(false);
              setGpsTargetEmployee(null);
            }}
            onRecord={handleRecordAttendance}
            showToast={showToast}
          />
        )}
        {showFaceIdModal && (
          <FaceIdIntegrationModal 
            employee={faceIdTargetEmployee || activeEmployee}
            employees={employees}
            geozones={geozones}
            attendanceMap={dateAttendanceMap}
            selectedDate={selectedDate}
            initialTab={faceIdInitialTab}
            onUpdateEmployeePhoto={handleUpdateEmployeePhoto}
            onClose={() => {
              setShowFaceIdModal(false);
              setFaceIdTargetEmployee(null);
            }}
            onRecord={handleRecordAttendance}
            showToast={showToast}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Xodimlar statistikasi</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            To'yona savdo tizimi bo'yicha filiallar va xodimlarning real davomat jurnali
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onNavigateToCredentials && (
            <button
              onClick={onNavigateToCredentials}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#00A651] border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Xodimlar Login/Parol</span>
            </button>
          )}

          {onNavigateToBranches && (
            <button
              onClick={onNavigateToBranches}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>Filial Geozonalar</span>
            </button>
          )}

          <button
            onClick={() => {
              if (onNavigateToSettings) {
                onNavigateToSettings();
              } else {
                setShowPenaltySettingsModal(true);
              }
            }}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Kechikish jarimasi miqdori, daqiqa/soat hisobi va dam olish kunlarini sozlash"
          >
            <Clock className="w-3.5 h-3.5 text-rose-600" />
            <span>Jarima & Dam Kunlari</span>
          </button>

          <button
            onClick={() => {
              if (onNavigateToPhotoRequests) {
                onNavigateToPhotoRequests();
              } else {
                handleOpenFaceIdModal(null, 'requests');
              }
            }}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Xodimlar yuborgan yangi Face ID rasm so'rovlarini ko'rish va tasdiqlash"
          >
            <Camera className="w-3.5 h-3.5 text-purple-600" />
            <span>Rasm So'rovlari</span>
            {pendingPhotoRequestsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {pendingPhotoRequestsCount}
              </span>
            )}
          </button>

          <ExportButtons 
            onExportExcel={() => handleExportAttendance('excel')}
            onExportPDF={() => handleExportAttendance('pdf')}
          />
        </div>
      </div>

      {/* Prominent notification banner for pending photo requests */}
      {pendingPhotoRequestsCount > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-purple-600 text-white rounded-xl shadow-xs shrink-0">
              <Camera className="w-5 h-5" />
            </span>
            <div className="text-xs">
              <p className="font-extrabold text-sm text-purple-950 flex items-center gap-2">
                <span>Yangi Face ID surat so'rovlari keldi!</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {pendingPhotoRequestsCount} ta kutilmoqda
                </span>
              </p>
              <p className="text-slate-600 font-medium mt-0.5">
                Xodimlar profilidan yangi surat yuklagan. Tasdiqlasangiz, Face ID etalon bazasi zudlik bilan yangilanadi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onNavigateToPhotoRequests) {
                onNavigateToPhotoRequests();
              } else {
                handleOpenFaceIdModal(null, 'requests');
              }
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Ko'rib chiqish & Tasdiqlash</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Overview Charts & Cards */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 mb-6">
        {/* Doughnut Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center relative shadow-sm">
          <div className="w-full h-[180px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={82}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any, name: any) => [`${val} nafar`, name]} 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  position={{ x: 100, y: 0 }}
                  allowEscapeViewBox={{ x: true, y: true }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-bold text-slate-500 tracking-tight leading-none mb-1">Barcha xodimlar</span>
              <span className="text-3xl font-black text-slate-900 leading-none">{stats.total}</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 text-[11px] font-semibold text-slate-500 mt-2 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Vaqtida: {stats.onTimeCount + stats.leftCount}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Kech: {stats.lateCount}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Kelmadi: {stats.absentCount}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500"></span>Ta'tilda: {stats.leaveCount}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500"></span>Safarda: {stats.tripCount}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard 
            icon={<div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><UserCheck className="w-4 h-4 text-emerald-600" /></div>} 
            title="Vaqtida kelgan" 
            value={stats.onTimeCount.toString()} 
            onClick={() => setStatusFilter(statusFilter === 'on_time' ? 'all' : 'on_time')}
            isActive={statusFilter === 'on_time'}
          />
          <StatCard 
            icon={<div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><Clock className="w-4 h-4 text-amber-600" /></div>} 
            title="Kech qolgan" 
            value={stats.lateCount.toString()} 
            onClick={() => setStatusFilter(statusFilter === 'late' ? 'all' : 'late')}
            isActive={statusFilter === 'late'}
          />
          <StatCard 
            icon={<div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center"><UserX className="w-4 h-4 text-rose-600" /></div>} 
            title="Kelmagan" 
            value={stats.absentCount.toString()} 
            onClick={() => setStatusFilter(statusFilter === 'absent' ? 'all' : 'absent')}
            isActive={statusFilter === 'absent'}
          />
          <StatCard 
            icon={<div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center"><Plane className="w-4 h-4 text-sky-600" /></div>} 
            title="Ta'tilda (Samolyot)" 
            value={stats.leaveCount.toString()} 
            onClick={() => setStatusFilter(statusFilter === 'leave' ? 'all' : 'leave')}
            isActive={statusFilter === 'leave'}
          />
          <StatCard 
            icon={<div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><Leaf className="w-4 h-4 text-emerald-600" /></div>} 
            title="Safarda (Barg)" 
            value={stats.tripCount.toString()} 
            onClick={() => setStatusFilter(statusFilter === 'trip' ? 'all' : 'trip')}
            isActive={statusFilter === 'trip'}
          />
          <StatCard 
            icon={<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><Calendar className="w-4 h-4 text-blue-600" /></div>} 
            title="Dam olish kuni" 
            value={stats.restCount.toString()} 
            onClick={() => setStatusFilter(statusFilter === 'rest' ? 'all' : 'rest')}
            isActive={statusFilter === 'rest'}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 mb-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Xodim, lavozim qidirish..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-64 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-600">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select 
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-sm font-semibold text-slate-700"
            >
              <option value="all">Barcha filiallar ({employees.length})</option>
              {availableBranches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              className="bg-transparent outline-none cursor-pointer text-sm font-semibold text-slate-700" 
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button 
            type="button"
            onClick={() => handleOpenLeaveModal(null, 'leave')}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap"
            title="Ta'tilga chiqarish"
          >
            <Plane className="w-4 h-4 text-sky-600" />
            <span>Ta'tilda</span>
          </button>

          <button 
            type="button"
            onClick={() => handleOpenLeaveModal(null, 'trip')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap"
            title="Xizmat safariga yuborish"
          >
            <Leaf className="w-4 h-4 text-emerald-600" />
            <span>Safarda</span>
          </button>

          <button 
            onClick={() => setShowAddEmployeeModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Xodim qo'shish
          </button>
        </div>
      </div>

      {/* QUICK STATUS FILTER PILLS */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            statusFilter === 'all'
              ? 'bg-slate-800 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Barchasi</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{stats.total}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('on_time')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            statusFilter === 'on_time'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Vaqtida kelganlar</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'on_time' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>{stats.onTimeCount + stats.leftCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('late')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            statusFilter === 'late'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Kechikishlar (Kech qolganlar)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'late' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>{stats.lateCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('absent')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            statusFilter === 'absent'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
          }`}
        >
          <UserX className="w-3.5 h-3.5" />
          <span>Kelmaganlar</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'absent' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'}`}>{stats.absentCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('leave')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            statusFilter === 'leave'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'bg-white text-sky-700 hover:bg-sky-50 border border-sky-200'
          }`}
        >
          <Plane className="w-3.5 h-3.5" />
          <span>Ta'tilda (Samolyot)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'leave' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-800'}`}>{stats.leaveCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('trip')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            statusFilter === 'trip'
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'bg-white text-teal-700 hover:bg-teal-50 border border-teal-200'
          }`}
        >
          <Leaf className="w-3.5 h-3.5" />
          <span>Safarda (Barg)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'trip' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'}`}>{stats.tripCount}</span>
        </button>
      </div>

      {/* LATE TARDINESS NOTICE BANNER */}
      {statusFilter === 'late' && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <b>Kechikishlar nazorati faol:</b> Bugun jami <b>{stats.lateCount} nafar</b> xodim kechikib kelgan. Xodim ustiga bosib batafsil sabab va jarimani ko'rishingiz mumkin.
            </span>
          </div>
          <button 
            type="button" 
            onClick={() => setStatusFilter('all')} 
            className="text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer shrink-0 ml-2"
          >
            Filtrni tozalash
          </button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 w-14">T/r</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500">Ism va familiya</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500">Filial</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500">Bo'lim</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500">Lavozim</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500">Ish vaqti</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500">Keldi</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500">Ketdi</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 text-center">Davomat</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 text-center">Ta'til / Safar</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp, idx) => {
                const record = dateAttendanceMap.get(emp.id);
                const isRest = record?.status === 'Dam olish kuni';
                const parts = (selectedDate || '').split('-');
                const dayOfWeek = parts.length === 3 ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getDay() : 1;
                const status = record?.status || (dayOfWeek === 0 ? 'Dam olish kuni' : 'Kelmagan');

                return (
                  <tr 
                    key={`${emp.id || idx}-${idx}`} 
                    className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => setSelectedEmployeeId(emp.id)}
                  >
                    <td className="py-3.5 px-5 text-xs text-slate-500 font-semibold">{idx + 1}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200 hover:ring-2 hover:ring-purple-400 transition-all cursor-pointer relative group/avatar"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFaceIdModal(emp, 'photos');
                          }}
                          title="📸 Face ID etalon rasmini joylash / almashtirish"
                        >
                          {emp.avatarUrl ? (
                            <img src={emp.avatarUrl} alt={emp.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${emp.fullName}&backgroundColor=f1f5f9`} alt="avatar" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors block leading-tight">
                            {emp.fullName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">ID: {emp.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-sm text-slate-600 font-medium">{emp.branch}</td>
                    <td className="py-3.5 px-5 text-sm text-slate-600 font-medium">{emp.department}</td>
                    <td className="py-3.5 px-5 text-sm text-slate-600 font-medium">{emp.position}</td>
                    <td className="py-3.5 px-5 text-sm text-slate-600 font-medium">{isRest ? 'Dam olish' : emp.schedule}</td>
                    <td className="py-3.5 px-5 text-sm font-mono font-medium">
                      {record?.checkIn && record?.checkIn !== '--:--' ? (
                        status === 'Kech qolgan' ? (
                          <div className="flex flex-col">
                            <span className="text-amber-700 font-bold font-mono">{record.checkIn}</span>
                            <span className="text-[10px] text-amber-600 font-black whitespace-nowrap">
                              +{formatDelayShort(record.delayMinutes || 0)} kech qoldi
                            </span>
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-bold font-mono">{record.checkIn}</span>
                        )
                      ) : (
                        <span className="text-slate-400">--:--</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-sm text-slate-700 font-mono font-medium">
                      {record?.checkOut || '--:--'}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        status === 'Vaqtida kelgan' || status === 'Ketdi' ? 'bg-emerald-100 text-emerald-700' :
                        status === 'Kech qolgan' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                        status === 'Dam olish kuni' ? 'bg-blue-100 text-blue-700' :
                        status === 'Ta\'tilda' ? 'bg-sky-100 text-sky-800 border border-sky-300' :
                        status === 'Ish yuzasidan safarda' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {status === 'Ta\'tilda' ? (
                          <>
                            <Plane className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span>Ta'tilda {record?.durationDays ? `(${record.durationDays} kun)` : ''}</span>
                          </>
                        ) : status === 'Ish yuzasidan safarda' ? (
                          <>
                            <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Safarda {record?.durationDays ? `(${record.durationDays} kun)` : ''}</span>
                          </>
                        ) : status === 'Ketdi' ? (
                          'Ishdan ketgan'
                        ) : (
                          status
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {/* Samolyot (Ta'tilda) */}
                        <button
                          type="button"
                          onClick={() => handleOpenLeaveModal(emp, 'leave')}
                          title="✈️ Ta'tilga chiqarish (Samolyot)"
                          className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 hover:border-sky-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
                        >
                          <Plane className="w-4 h-4 text-sky-600" />
                          <span className="hidden md:inline text-[11px]">Ta'til</span>
                        </button>

                        {/* Barg (Ish safari) */}
                        <button
                          type="button"
                          onClick={() => handleOpenLeaveModal(emp, 'trip')}
                          title="🍃 Ish safariga yuborish (Barg)"
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
                        >
                          <Leaf className="w-4 h-4 text-emerald-600" />
                          <span className="hidden md:inline text-[11px]">Safar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    Tanlangan parametrlar bo'yicha xodimlar topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Jami {filteredEmployees.length} nafar xodim ko'rsatilmoqda</span>
          <span>Batafsil ma'lumot olish uchun xodim qatoriga bosing &rarr;</span>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <AddEmployeeModal 
          availableBranches={availableBranches}
          onClose={() => setShowAddEmployeeModal(false)}
          onSave={handleSaveNewEmployee}
        />
      )}

      {/* Leave or Trip Modal (Samolyot ✈️ yoki Barg 🍃, necha kunligini sozlash) */}
      {showLeaveTripModal && (
        <LeaveTripModal 
          employee={leaveTripTargetEmployee}
          employees={employees}
          initialType={leaveTripInitialType}
          initialDate={selectedDate}
          onClose={() => setShowLeaveTripModal(false)}
          onSave={handleSaveLeaveTrip}
        />
      )}

      {/* GPS & Radius Check-in Modal */}
      {showGpsModal && (
        <GpsCheckInModal 
          employee={gpsTargetEmployee}
          employees={employees}
          geozones={geozones}
          selectedDate={selectedDate}
          onClose={() => {
            setShowGpsModal(false);
            setGpsTargetEmployee(null);
          }}
          onRecord={handleRecordAttendance}
          showToast={showToast}
        />
      )}

      {/* Face ID & AI Integration Modal */}
      {showFaceIdModal && (
        <FaceIdIntegrationModal 
          employee={faceIdTargetEmployee}
          employees={employees}
          geozones={geozones}
          attendanceMap={dateAttendanceMap}
          selectedDate={selectedDate}
          initialTab={faceIdInitialTab}
          onUpdateEmployeePhoto={handleUpdateEmployeePhoto}
          onClose={() => {
            setShowFaceIdModal(false);
            setFaceIdTargetEmployee(null);
          }}
          onRecord={handleRecordAttendance}
          showToast={showToast}
        />
      )}

      {/* Jarima va Dam Olish Kunlari Sozlamalari Modali */}
      {showPenaltySettingsModal && (
        <PenaltySettingsModal
          onClose={() => setShowPenaltySettingsModal(false)}
          showToast={showToast}
          onSettingsSaved={() => {
            // Refresh
          }}
        />
      )}
    </div>
  );
}

function StatCard({ 
  icon, 
  title, 
  value, 
  onClick, 
  isActive 
}: { 
  icon: React.ReactNode, 
  title: string, 
  value: string, 
  onClick?: () => void, 
  isActive?: boolean 
}) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-4 rounded-2xl border flex flex-col justify-between shadow-sm min-h-[140px] transition-all select-none ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''
      } ${
        isActive ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/20' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between">
        {icon}
        {onClick && (
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filtr</span>
        )}
      </div>
      <div className="flex flex-col mt-auto">
        <span className="text-[11px] font-bold text-slate-500 leading-tight mb-1">{title}</span>
        <span className="text-3xl font-black text-slate-900 leading-none">{value}</span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// EMPLOYEE DETAIL VIEW (2-RASMDA HODIM TANLANGANDAGI HOLATI)
// -------------------------------------------------------------------------------------------------
interface EmployeeDetailViewProps {
  employee: EmployeeData;
  onBack: () => void;
  records: DailyAttendance[];
  onOpenLeaveModal?: (emp: EmployeeData, type: 'leave' | 'trip') => void;
  onOpenGpsModal?: (emp: EmployeeData) => void;
  onOpenFaceIdModal?: (emp: EmployeeData) => void;
  onUpdateRecord: (record: DailyAttendance) => void;
  onArchiveEmployee: () => void;
}

function EmployeeDetailView({ 
  employee, 
  onBack, 
  records, 
  onOpenLeaveModal,
  onOpenGpsModal,
  onOpenFaceIdModal,
  onUpdateRecord, 
  onArchiveEmployee 
}: EmployeeDetailViewProps) {
  const [activeTab, setActiveTab] = useState('Davomat');
  const [selectedMonth, setSelectedMonth] = useState('Sentyabr, 2026');
  const [editingRecord, setEditingRecord] = useState<DailyAttendance | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const tabs = ['Davomat', 'Kechikishlar va Statistika', 'Hisobotlar', 'Tarix', 'Xodim fayllari'];

  // Calculate real metrics for this specific employee across the records
  const metrics = useMemo(() => {
    const totalDays = records.length;
    const workDays = records.filter(r => r.status !== 'Dam olish kuni').length;
    const onTimeDays = records.filter(r => r.status === 'Vaqtida kelgan' || r.status === 'Ketdi').length;
    const lateDays = records.filter(r => r.status === 'Kech qolgan').length;
    const absentDays = records.filter(r => r.status === 'Kelmagan').length;
    const restDays = records.filter(r => r.status === 'Dam olish kuni').length;

    const onTimePct = workDays > 0 ? Math.round((onTimeDays / workDays) * 100) : 0;
    const latePct = workDays > 0 ? Math.round((lateDays / workDays) * 100) : 0;
    const absentPct = workDays > 0 ? Math.round((absentDays / workDays) * 100) : 0;

    const totalDelayMinutes = records.reduce((acc, curr) => acc + (curr.delayMinutes || 0), 0);
    const delayHours = Math.floor(totalDelayMinutes / 60);
    const delayMins = totalDelayMinutes % 60;

    // Kechikish sabablari
    const reasonCounts: Record<string, number> = {
      'Transport': 0,
      'Tirbandlik': 0,
      'Shaxsiy': 0,
      'Boshqa': 0
    };

    records.filter(r => r.status === 'Kech qolgan').forEach(r => {
      const reason = r.delayReason || 'Transport';
      if (reason.includes('Transport')) reasonCounts['Transport']++;
      else if (reason.includes('Tirband')) reasonCounts['Tirbandlik']++;
      else if (reason.includes('Shaxsiy')) reasonCounts['Shaxsiy']++;
      else reasonCounts['Boshqa']++;
    });

    const totalLate = lateDays || 1;
    const reasonData = [
      { name: 'Transport', value: Math.max(1, Math.round((reasonCounts['Transport'] / totalLate) * 100)), fill: '#3b82f6' },
      { name: 'Tirbandlik', value: Math.max(1, Math.round((reasonCounts['Tirbandlik'] / totalLate) * 100)), fill: '#8b5cf6' },
      { name: 'Shaxsiy', value: Math.max(1, Math.round((reasonCounts['Shaxsiy'] / totalLate) * 100)), fill: '#ec4899' },
      { name: 'Boshqa', value: Math.max(1, Math.round((reasonCounts['Boshqa'] / totalLate) * 100)), fill: '#64748b' }
    ];

    return {
      totalDays,
      workDays,
      onTimeDays,
      lateDays,
      absentDays,
      restDays,
      onTimePct,
      latePct,
      absentPct,
      totalDelayMinutes,
      delayHours,
      delayMins,
      reasonData
    };
  }, [records]);

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Ketdi':
      case 'Vaqtida kelgan': return 'bg-emerald-100 text-emerald-700';
      case 'Kech qolgan': return 'bg-amber-100 text-amber-700';
      case 'Kelmagan':
      case 'Kelmadi': return 'bg-rose-100 text-rose-700';
      case 'Dam olish kuni':
      case 'Dam olish': return 'bg-blue-100 text-blue-700';
      case 'Ta\'tilda': return 'bg-sky-100 text-sky-800 border border-sky-200';
      case 'Ish yuzasidan safarda': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getRowBorder = (status: string) => {
    switch(status) {
      case 'Ketdi':
      case 'Vaqtida kelgan': return 'border-l-[4px] border-l-emerald-500';
      case 'Kech qolgan': return 'border-l-[4px] border-l-amber-500';
      case 'Kelmagan':
      case 'Kelmadi': return 'border-l-[4px] border-l-rose-500';
      case 'Dam olish kuni':
      case 'Dam olish': return 'border-l-[4px] border-l-blue-500';
      case 'Ta\'tilda': return 'border-l-[4px] border-l-sky-500';
      case 'Ish yuzasidan safarda': return 'border-l-[4px] border-l-emerald-600';
      default: return 'border-l-[4px] border-l-slate-200';
    }
  };

  // Export single employee attendance to CSV
  const handleExportEmployee = (format: 'excel' | 'pdf') => {
    const headers = [
      'Sana', 'Ish vaqti', 'Kirish', 'Chiqish', 'Status', 
      'Jami ishlagan', 'Kechikish (daqiqa)', 'Kechikish sababi', 'Kunlik jarimasi', 'Kunlik bonusi', 'Qo\'lga tegadi', 'Izoh'
    ];

    const data = records.map(r => [
      r.date,
      employee.schedule,
      r.checkIn,
      r.checkOut,
      r.status,
      r.workedTime,
      r.delayMinutes || 0,
      r.delayReason || '-',
      r.penalty,
      r.bonus,
      r.netPay,
      r.notes || '-'
    ]);

    const fileName = `Davomat_${employee.fullName}_${selectedMonth}`;

    if (format === 'excel') {
      const excelData = records.map(r => ({
        Sana: r.date,
        'Ish vaqti': employee.schedule,
        Kirish: r.checkIn,
        Chiqish: r.checkOut,
        Status: r.status,
        'Jami ishlagan': r.workedTime,
        'Kechikish (daqiqa)': r.delayMinutes || 0,
        'Kechikish sababi': r.delayReason || '-',
        'Kunlik jarimasi': r.penalty,
        'Kunlik bonusi': r.bonus,
        'Qo\'lga tegadi': r.netPay,
        Izoh: r.notes || '-'
      }));
      exportToExcel(excelData, fileName);
    } else {
      exportToPDF(headers, data, fileName);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer text-slate-600"
            title="Ortga qaytish"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
              {employee.avatarUrl ? (
                <img src={employee.avatarUrl} alt={employee.fullName} className="w-full h-full object-cover" />
              ) : (
                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${employee.fullName}&backgroundColor=f1f5f9`} alt="avatar" className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 leading-tight">{employee.fullName}</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                  {employee.branch}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{employee.position} &bull; {employee.department}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenGpsModal && (
            <button 
              type="button"
              onClick={() => onOpenGpsModal(employee)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-[#00A651] hover:from-emerald-700 hover:to-[#009247] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="GPS Davomat: Filial radiusi ichida kelganini tekshirish"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>📍 GPS Keldim</span>
            </button>
          )}

          {onOpenFaceIdModal && (
            <button 
              type="button"
              onClick={() => onOpenFaceIdModal(employee)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="Face ID sinovi: AI orqali yuz tanish va davomat yozish"
            >
              <ScanFace className="w-3.5 h-3.5 text-indigo-600" />
              <span>🤖 Face ID</span>
            </button>
          )}

          {onOpenLeaveModal && (
            <>
              <button 
                type="button"
                onClick={() => onOpenLeaveModal(employee, 'leave')}
                className="flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Samolyot: Ta'tilda (Necha kunligini sozlash)"
              >
                <Plane className="w-4 h-4 text-sky-600" />
                <span>Ta'tilda</span>
              </button>

              <button 
                type="button"
                onClick={() => onOpenLeaveModal(employee, 'trip')}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Barg: Ish yuzasidan safarda (Necha kunligini sozlash)"
              >
                <Leaf className="w-4 h-4 text-emerald-600" />
                <span>Safarda</span>
              </button>
            </>
          )}

          <button 
            onClick={() => handleExportEmployee('excel')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-50 cursor-pointer transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Excel
          </button>
          <button 
            onClick={() => handleExportEmployee('pdf')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-rose-600" />
            PDF
          </button>
          <button 
            onClick={() => {
              if (window.confirm(`${employee.fullName} xodimini arxivlashni xohlaysizmi?`)) {
                onArchiveEmployee();
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 cursor-pointer transition-colors shadow-sm"
          >
            <Archive className="w-4 h-4" />
            Arxivlash
          </button>
          <button 
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 cursor-pointer transition-colors shadow-sm"
          >
            <Edit className="w-4 h-4" />
            Tahrirlash
          </button>
        </div>
      </div>

      {/* Tabs & Month Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-6 overflow-x-auto w-full sm:w-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`py-3.5 text-sm font-bold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === t 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 py-2">
          <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-slate-50">
            {selectedMonth}
          </div>
          <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend & Settings */}
      <div className="px-6 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50/70 border-b border-slate-200">
        <h3 className="font-bold text-slate-800 text-sm">Kunlik tafsilot jurnali</h3>
        <div className="flex flex-wrap items-center gap-5">
          <LegendItem color="bg-emerald-500" label="Vaqtida yoki erta kelgan" />
          <LegendItem color="bg-amber-500" label="Kech kelgan / erta ketgan" />
          <LegendItem color="bg-rose-500" label="Kelmagan" />
          <LegendItem color="bg-blue-500" label="Dam olish kuni" />
        </div>
        <button 
          onClick={() => setShowConfigModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-slate-500" />
          Sozlash
        </button>
      </div>

      {/* Detail Content */}
      <div className="flex-1 overflow-auto bg-slate-50/30">
        {activeTab === 'Davomat' ? (
          <table className="w-full text-left border-collapse bg-white">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500">
                <th className="py-3 px-6">Sana</th>
                <th className="py-3 px-6">Ish vaqti</th>
                <th className="py-3 px-6">Kirish</th>
                <th className="py-3 px-6">Chiqish</th>
                <th className="py-3 px-6 text-center">Status</th>
                <th className="py-3 px-6 text-center">Jami ishlagan</th>
                <th className="py-3 px-6 text-center">Kunlik jarimasi</th>
                <th className="py-3 px-6 text-center">Kunlik bonusi</th>
                <th className="py-3 px-6 text-right">Qo'lga tegadi</th>
                <th className="py-3 px-6 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {records.map((att, attIdx) => {
                const statusDisplay = att.status === 'Kelmagan' ? 'Kelmadi' : att.status === 'Dam olish kuni' ? 'Dam olish' : att.status;
                const isRest = att.status === 'Dam olish kuni';
                
                return (
                  <tr key={`${att.id || attIdx}-${attIdx}`} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${getRowBorder(att.status)}`}>
                    <td className="py-3.5 px-6 text-sm font-bold text-slate-700">
                      {att.date.split('-').reverse().join('.').substring(0, 5)}
                    </td>
                    <td className="py-3.5 px-6 text-sm text-slate-600 font-medium">
                      {isRest ? 'Dam olish' : employee.schedule}
                    </td>
                    <td className="py-3.5 px-6 text-sm text-slate-700 font-mono font-medium">{att.checkIn}</td>
                    <td className="py-3.5 px-6 text-sm text-slate-700 font-mono font-medium">{att.checkOut}</td>
                    <td className="py-3.5 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusStyle(statusDisplay)}`}>
                        {statusDisplay === 'Ta\'tilda' ? (
                          <>
                            <Plane className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span>Ta'tilda {att.durationDays ? `(${att.durationDays} kun)` : ''}</span>
                          </>
                        ) : statusDisplay === 'Ish yuzasidan safarda' ? (
                          <>
                            <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Safarda {att.durationDays ? `(${att.durationDays} kun)` : ''}</span>
                          </>
                        ) : statusDisplay === 'Ketdi' ? (
                          'Ishdan ketgan'
                        ) : (
                          statusDisplay
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      {att.workedTime === '-' ? (
                        <span className="inline-flex w-6 h-6 rounded-full border border-dashed border-slate-300 items-center justify-center text-slate-400 text-xs">-</span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold">
                          {att.workedTime}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-center text-sm font-semibold text-rose-600">{att.penalty}</td>
                    <td className="py-3.5 px-6 text-center text-sm font-semibold text-emerald-600">{att.bonus}</td>
                    <td className="py-3.5 px-6 text-right text-sm font-bold text-emerald-600">{att.netPay}</td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center justify-center gap-1.5 text-slate-400">
                        {onOpenLeaveModal && (
                          <>
                            <button 
                              type="button"
                              onClick={() => onOpenLeaveModal(employee, 'leave')}
                              className="p-1 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors cursor-pointer text-slate-400"
                              title="Samolyot: Ta'tilda (Necha kunligini sozlash)"
                            >
                              <Plane className="w-3.5 h-3.5 text-sky-600" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => onOpenLeaveModal(employee, 'trip')}
                              className="p-1 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer text-slate-400"
                              title="Barg: Ish yuzasidan safarda (Necha kunligini sozlash)"
                            >
                              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => setEditingRecord(att)}
                          className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Tahrirlash"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : activeTab === 'Statistika' ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-800 text-lg">
                Joriy oy statistikasi va kechikishlar tahlili
              </h3>
              <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                Jami ish kunlari: {metrics.workDays} kun
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {/* Doughnut 1: Davomat ko'rsatkichi */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                <h4 className="font-bold text-slate-700 mb-2 text-sm">Davomat ko'rsatkichi</h4>
                <div className="w-[180px] h-[180px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Vaqtida', value: metrics.onTimePct, fill: '#10b981' },
                          { name: 'Kech qolgan', value: metrics.latePct, fill: '#f59e0b' },
                          { name: 'Kelmagan', value: metrics.absentPct, fill: '#f43f5e' },
                        ]}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} startAngle={90} endAngle={-270} dataKey="value" stroke="none"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#f43f5e" />
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val}%`, 'Foiz']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-emerald-500">{metrics.onTimePct}%</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Vaqtida</span>
                  </div>
                </div>
                <div className="flex gap-4 mt-4 text-xs font-semibold text-slate-600 w-full justify-center">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Vaqtida ({metrics.onTimeDays} k)</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Kech ({metrics.lateDays} k)</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Kelmadi ({metrics.absentDays} k)</div>
                </div>
              </div>
              
              {/* Doughnut 2: Kechikish sabablari */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                <h4 className="font-bold text-slate-700 mb-2 text-sm">Kechikish sabablari</h4>
                <div className="w-[180px] h-[180px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.reasonData}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} startAngle={90} endAngle={-270} dataKey="value" stroke="none"
                      >
                        {metrics.reasonData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val}%`, 'Ulash']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                    <span className="text-xs font-black text-slate-800">
                      {metrics.delayHours > 0 ? `${metrics.delayHours} soat ` : ''}{metrics.delayMins} daq
                    </span>
                    <span className="text-slate-400 text-[10px] font-semibold">Jami kechikish</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-semibold text-slate-600 w-full">
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Transport</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span>Tirbandlik</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-500"></span>Shaxsiy</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500"></span>Boshqa</div>
                </div>
              </div>

              {/* Card 3: Xulosa va jarimalar */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-700 mb-3 text-sm">Moliyaviy intizom</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <span className="text-xs font-semibold text-emerald-800">Rag'batlantirish (Bonus):</span>
                      <span className="text-sm font-black text-emerald-700">
                        {records.filter(r => r.bonus && r.bonus !== '-').length * 15000} so'm
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                      <span className="text-xs font-semibold text-rose-800">Kechikish jarimalari:</span>
                      <span className="text-sm font-black text-rose-700">
                        {metrics.lateDays * 15000} so'm
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-semibold text-slate-600">O'rtacha kechikish:</span>
                      <span className="text-sm font-bold text-slate-800">
                        {metrics.lateDays > 0 ? `${formatDelayShort(Math.round(metrics.totalDelayMinutes / metrics.lateDays))}/kun` : "0 daq/kun"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                  Intizom darajasi: <span className="font-bold text-emerald-600">{metrics.onTimePct >= 80 ? 'A\'lo' : metrics.onTimePct >= 65 ? 'Qoniqarli' : 'Past'}</span>
                </div>
              </div>
            </div>

            {/* Exact List: Kim qachon kech qolyapti (Qaysi kuni va necha daqiqa) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Kechikilgan kunlar ro'yxati (Batafsil)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Xodim aynan qaysi kunlari kech qolgan, necha daqiqa va qanday sabab bilan</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg">
                  {metrics.lateDays} ta kechikish holati
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-200 text-xs font-bold text-slate-500">
                      <th className="py-3 px-6">Sana</th>
                      <th className="py-3 px-6">Rejadagi vaqt</th>
                      <th className="py-3 px-6">Haqiqiy kelgan vaqti</th>
                      <th className="py-3 px-6">Kechikish miqdori</th>
                      <th className="py-3 px-6">Kechikish sababi</th>
                      <th className="py-3 px-6 text-right">Ushlab qolingan jarima</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.filter(r => r.status === 'Kech qolgan').map((lateRecord, lateIdx) => (
                      <tr key={`${lateRecord.id || lateIdx}-${lateIdx}`} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <td className="py-3 px-6 text-sm font-bold text-slate-800">
                          {lateRecord.date.split('-').reverse().join('.')}
                        </td>
                        <td className="py-3 px-6 text-sm text-slate-600 font-mono">09:00</td>
                        <td className="py-3 px-6 text-sm text-amber-700 font-mono font-bold">{lateRecord.checkIn}</td>
                        <td className="py-3 px-6">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-bold">
                            +{formatDelayText(lateRecord.delayMinutes)} kech qoldi
                          </span>
                        </td>
                        <td className="py-3 px-6 text-sm text-slate-700 font-medium">{lateRecord.delayReason || 'Transport tirbandligi'}</td>
                        <td className="py-3 px-6 text-right text-sm font-bold text-rose-600">{lateRecord.penalty}</td>
                      </tr>
                    ))}
                    {metrics.lateDays === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-emerald-600 font-medium">
                          🎉 Ushbu oyda xodim biror marta ham kech qolmagan!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'Hisobotlar' ? (
          <div className="p-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h4 className="font-black text-slate-800 text-lg">Oylik hisobot ({selectedMonth})</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{employee.fullName} &bull; {employee.branch}</p>
                </div>
                <ExportButtons 
                  onExportExcel={() => handleExportEmployee('excel')}
                  onExportPDF={() => handleExportEmployee('pdf')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500">Jami hisoblangan kunlar</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">{metrics.totalDays} kun</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500">Ishga qatnashgan kunlar</span>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.onTimeDays + metrics.lateDays} kun</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500">O'rtacha kunlik stavka</span>
                  <p className="text-xl font-bold text-slate-800 mt-1">{(employee.dailyRate || 280000).toLocaleString()} so'm</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-xs font-semibold text-emerald-700">Sof hisoblangan oylik</span>
                  <p className="text-xl font-black text-emerald-700 mt-1">
                    {((metrics.onTimeDays + metrics.lateDays) * (employee.dailyRate || 280000)).toLocaleString()} so'm
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 font-medium">
            Ushbu bo'lim faol xizmatda
          </div>
        )}
      </div>

      {/* Edit Daily Record Modal */}
      {editingRecord && (
        <EditRecordModal 
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={(updated) => {
            onUpdateRecord(updated);
            setEditingRecord(null);
          }}
        />
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Xodim davomatini sozlash</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Belgilangan ish tartibi</label>
                <input 
                  type="text" 
                  defaultValue={employee.schedule} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Kunlik stavka (so'm)</label>
                <input 
                  type="number" 
                  defaultValue={employee.dailyRate || 280000} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Ruxsat etilgan kechikish (daqiqa)</label>
                <input 
                  type="number" 
                  defaultValue={10} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Bekor qilish
              </button>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3.5 h-3.5 rounded-full ${color}`}></span>
      <span className="text-xs font-semibold text-slate-600">{label}</span>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// MODALS
// -------------------------------------------------------------------------------------------------

interface LeaveTripModalProps {
  employee?: EmployeeData | null;
  employees: EmployeeData[];
  initialType?: 'leave' | 'trip';
  initialDate?: string;
  onClose: () => void;
  onSave: (config: {
    employeeId: string;
    type: 'leave' | 'trip';
    startDate: string;
    durationDays: number;
    endDate: string;
    reason: string;
    isPaid: boolean;
  }) => void;
}

function LeaveTripModal({
  employee,
  employees,
  initialType = 'leave',
  initialDate,
  onClose,
  onSave
}: LeaveTripModalProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employee?.id || employees[0]?.id || '');
  const [type, setType] = useState<'leave' | 'trip'>(initialType);
  const [startDate, setStartDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
  const [durationDays, setDurationDays] = useState<number>(initialType === 'leave' ? 7 : 3);
  const [reason, setReason] = useState<string>(
    initialType === 'leave' ? "Yillik mehnat ta'tili" : "Filial faoliyatini tekshirish va audit"
  );
  const [isPaid, setIsPaid] = useState<boolean>(true);

  // Calculate end date based on startDate and durationDays
  const endDate = useMemo(() => {
    try {
      const parts = startDate.split('-').map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2] + Math.max(1, durationDays) - 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    } catch {
      // fallback
    }
    return startDate;
  }, [startDate, durationDays]);

  const leavePresets = [3, 5, 7, 10, 14, 21, 24, 30];
  const tripPresets = [1, 2, 3, 5, 7, 10, 14];

  const leaveReasons = [
    "Yillik mehnat ta'tili",
    "Ish haqi saqlanmaydigan ta'til",
    "O'quv ta'tili (Sessiya)",
    "Sog'liqni tiklash / Sanatoriy",
    "Oilaviy sharoit tufayli"
  ];

  const tripReasons = [
    "Samarqand filiali taftishi va audit",
    "Navoiy filiali bilan muzokaralar",
    "Mijozlar bilan biznes uchrashuv",
    "Malaka oshirish seminari",
    "Hududiy savdo nazorati va monitoring",
    "Texnik jihozlarni sozlash safari"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    onSave({
      employeeId: selectedEmpId,
      type,
      startDate,
      durationDays: Math.max(1, durationDays),
      endDate,
      reason: reason.trim() || (type === 'leave' ? "Mehnat ta'tili" : "Xizmat safari"),
      isPaid
    });
  };

  const isLeave = type === 'leave';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
        
        {/* Header with visual badge */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs transition-colors ${
              isLeave ? 'bg-sky-100 text-sky-600' : 'bg-emerald-100 text-emerald-600'
            }`}>
              {isLeave ? <Plane className="w-6 h-6" /> : <Leaf className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                {isLeave ? "Ta'tilni sozlash (Samolyot ✈️)" : "Xizmat safarini sozlash (Barg 🍃)"}
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                {isLeave ? "Xodim uchun mehnat ta'tili kunlarini belgilash" : "Ish yuzasidan xizmat safari muddatini sozlash"}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode switcher tabs (Samolyot vs Barg) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl my-4 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setType('leave');
              if (reason === "Filial faoliyatini tekshirish va audit") setReason("Yillik mehnat ta'tili");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
              isLeave 
                ? 'bg-white text-sky-700 shadow-sm border border-sky-100' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plane className="w-4 h-4 text-sky-600" />
            <span>Ta'tilda (Samolyot)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('trip');
              if (reason === "Yillik mehnat ta'tili") setReason("Filial faoliyatini tekshirish va audit");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
              !isLeave 
                ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Leaf className="w-4 h-4 text-emerald-600" />
            <span>Safarda (Barg)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Employee Selector or Display Card */}
          {employee ? (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                {employee.avatarUrl ? (
                  <img src={employee.avatarUrl} alt={employee.fullName} className="w-full h-full object-cover" />
                ) : (
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${employee.fullName}&backgroundColor=f1f5f9`} alt="avatar" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-extrabold text-slate-800 truncate">{employee.fullName}</div>
                <div className="text-[11px] text-slate-500 font-medium truncate">{employee.position} &bull; {employee.branch}</div>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                isLeave ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {isLeave ? "✈️ Ta'til" : "🍃 Safar"}
              </span>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Xodimni tanlang *</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
              >
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} — {e.position} ({e.branch})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date & Duration Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Boshlanish sanasi</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                Davomiyligi (Necha kun?)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDurationDays(prev => Math.max(1, prev - 1))}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
                >
                  -
                </button>
                <div className="flex-1 relative">
                  <input 
                    type="number"
                    min="1"
                    max="90"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full text-center px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                    kun
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDurationDays(prev => Math.min(90, prev + 1))}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Quick Duration Preset Chips */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 mb-1.5">Tezkor muddatlar (Kunlar soni):</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(isLeave ? leavePresets : tripPresets).map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDurationDays(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                    durationDays === preset 
                      ? (isLeave ? 'bg-sky-600 text-white border-sky-600 shadow-xs' : 'bg-emerald-600 text-white border-emerald-600 shadow-xs')
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {preset} kun
                </button>
              ))}
            </div>
          </div>

          {/* Calculated Date Range Banner */}
          <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-bold transition-colors ${
            isLeave 
              ? 'bg-sky-50/70 border-sky-200 text-sky-900' 
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0 text-slate-500" />
              <span>Sanalar oralig'i:</span>
            </div>
            <span className="font-mono text-xs font-extrabold">
              {startDate.split('-').reverse().join('.')} &rarr; {endDate.split('-').reverse().join('.')} ({durationDays} kun)
            </span>
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">
              {isLeave ? "Ta'til sababi yoki turi" : "Xizmat safari maqsadi"}
            </label>
            <input 
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Sabab yoki maqsadni kiriting..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-500"
            />
            {/* Reason Suggestion Chips */}
            <div className="flex items-center gap-1 flex-wrap mt-2">
              {(isLeave ? leaveReasons : tripReasons).slice(0, 3).map(sug => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setReason(sug)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Payment option */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-800">Ish haqi saqlanishi</div>
              <div className="text-[11px] text-slate-500">Ta'til/safar davrida kunlik maosh hisoblanadimi?</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#00A651]"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                isLeave 
                  ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20' 
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              {isLeave ? <Plane className="w-4 h-4" /> : <Leaf className="w-4 h-4" />}
              <span>{durationDays} kunlik {isLeave ? "ta'tilni" : "safarni"} saqlash</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

function AddEmployeeModal({ 
  availableBranches, 
  onClose, 
  onSave 
}: { 
  availableBranches: string[], 
  onClose: () => void, 
  onSave: (emp: any) => void 
}) {
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState(availableBranches[0] || 'Turkiston filiali');
  const [department, setDepartment] = useState('Savdo');
  const [position, setPosition] = useState('Sotuvchi maslahatchi');
  const [schedule, setSchedule] = useState('09:00 - 18:00');
  const [phone, setPhone] = useState('+998 ');
  const [dailyRate, setDailyRate] = useState('280000');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    onSave({ fullName, branch, department, position, schedule, phone, dailyRate });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-black text-slate-800">Yangi xodim qo'shish</h3>
            <p className="text-xs text-slate-500">Tizimga va davomat jurnaliga yangi xodimni kiritish</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">To'liq ismi va familiyasi *</label>
            <input 
              type="text" 
              required
              placeholder="Masalan: Azizbek Karimov"
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Filial *</label>
              <select 
                value={branch} 
                onChange={(e) => setBranch(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none"
              >
                {availableBranches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Bo'lim</label>
              <input 
                type="text" 
                value={department} 
                onChange={(e) => setDepartment(e.target.value)} 
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Lavozim *</label>
              <input 
                type="text" 
                required
                value={position} 
                onChange={(e) => setPosition(e.target.value)} 
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Ish vaqti</label>
              <input 
                type="text" 
                value={schedule} 
                onChange={(e) => setSchedule(e.target.value)} 
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Telefon raqam</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Kunlik stavka (so'm)</label>
              <input 
                type="number" 
                value={dailyRate} 
                onChange={(e) => setDailyRate(e.target.value)} 
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Bekor qilish
            </button>
            <button 
              type="submit"
              className="px-5 py-2 bg-[#00A651] hover:bg-[#009247] text-white rounded-lg text-xs font-bold shadow cursor-pointer transition-colors"
            >
              Saqlash va qo'shish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRecordModal({ 
  record, 
  onClose, 
  onSave 
}: { 
  record: DailyAttendance, 
  onClose: () => void, 
  onSave: (record: DailyAttendance) => void 
}) {
  const [checkIn, setCheckIn] = useState(record.checkIn);
  const [checkOut, setCheckOut] = useState(record.checkOut);
  const [status, setStatus] = useState<DailyAttendance['status']>(record.status);
  const [durationDays, setDurationDays] = useState<number>(record.durationDays || (record.status === 'Ish yuzasidan safarda' ? 3 : 7));
  const [delayReason, setDelayReason] = useState(record.delayReason || '');
  const [penalty, setPenalty] = useState(record.penalty);
  const [bonus, setBonus] = useState(record.bonus);
  const [notes, setNotes] = useState(record.notes || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...record,
      checkIn: (status === 'Ta\'tilda' || status === 'Ish yuzasidan safarda') ? '--:--' : checkIn,
      checkOut: (status === 'Ta\'tilda' || status === 'Ish yuzasidan safarda') ? '--:--' : checkOut,
      status,
      delayReason,
      penalty,
      bonus,
      notes,
      durationDays: (status === 'Ta\'tilda' || status === 'Ish yuzasidan safarda') ? durationDays : record.durationDays
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-800">Kunlik davomatni tahrirlash</h3>
            <p className="text-xs text-slate-500">Sana: {record.date}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Kirish vaqti</label>
              <input 
                type="text" 
                value={checkIn} 
                onChange={(e) => setCheckIn(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Chiqish vaqti</label>
              <input 
                type="text" 
                value={checkOut} 
                onChange={(e) => setCheckOut(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Status</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value as any)} 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white cursor-pointer"
            >
              <option value="Vaqtida kelgan">Vaqtida kelgan</option>
              <option value="Kech qolgan">Kech qolgan</option>
              <option value="Ketdi">Ishdan ketgan</option>
              <option value="Kelmagan">Kelmagan</option>
              <option value="Dam olish kuni">Dam olish kuni</option>
              <option value="Ta'tilda">✈️ Ta'tilda (Mehnat ta'tili - Samolyot)</option>
              <option value="Ish yuzasidan safarda">🍃 Ish yuzasidan safarda (Xizmat safari - Barg)</option>
            </select>
          </div>

          {(status === 'Ta\'tilda' || status === 'Ish yuzasidan safarda') && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Davomiyligi (Necha kun?):
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  min="1"
                  max="90"
                  value={durationDays} 
                  onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value, 10) || 1))} 
                  className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-black text-center bg-white"
                />
                <span className="text-xs font-bold text-slate-600">
                  kun ({status === 'Ta\'tilda' ? 'Samolyot ✈️' : 'Barg 🍃'})
                </span>
              </div>
            </div>
          )}

          {status === 'Kech qolgan' && (
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Kechikish sababi</label>
              <input 
                type="text" 
                value={delayReason} 
                onChange={(e) => setDelayReason(e.target.value)} 
                placeholder="Masalan: Yo'l tirbandligi"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Jarima</label>
              <input 
                type="text" 
                value={penalty} 
                onChange={(e) => setPenalty(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Bonus</label>
              <input 
                type="text" 
                value={bonus} 
                onChange={(e) => setBonus(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Izoh</label>
            <input 
              type="text" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
            >
              Bekor qilish
            </button>
            <button 
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow"
            >
              Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// JARIMA VA DAM OLISH KUNLARI SOZLAMALARI MODALI
// -------------------------------------------------------------------------------------------------
interface PenaltySettingsModalProps {
  onClose: () => void;
  showToast: (msg: string) => void;
  onSettingsSaved?: () => void;
}

function PenaltySettingsModal({ onClose, showToast, onSettingsSaved }: PenaltySettingsModalProps) {
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number | string>(15);
  const [penaltyType, setPenaltyType] = useState<'minute' | 'hour'>('minute');
  const [penaltyRate, setPenaltyRate] = useState<number | string>(1000);
  const [restDays, setRestDays] = useState<number[]>([0]); // 0: Yakshanba
  const [customHolidays, setCustomHolidays] = useState<string[]>([]);
  const [newHolidayInput, setNewHolidayInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const daysOfWeek = [
    { id: 1, label: 'Dushanba' },
    { id: 2, label: 'Seshanba' },
    { id: 3, label: 'Chorshanba' },
    { id: 4, label: 'Payshanba' },
    { id: 5, label: 'Juma' },
    { id: 6, label: 'Shanba' },
    { id: 0, label: 'Yakshanba' },
  ];

  useEffect(() => {
    fetch('/api/attendance/penalty-settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          const s = data.settings;
          if (s.workStartTime) setWorkStartTime(s.workStartTime);
          if (s.gracePeriodMinutes !== undefined) setGracePeriodMinutes(s.gracePeriodMinutes);
          if (s.penaltyType) setPenaltyType(s.penaltyType);
          if (s.penaltyRate !== undefined) setPenaltyRate(s.penaltyRate);
          if (Array.isArray(s.restDays)) setRestDays(s.restDays);
          if (Array.isArray(s.customHolidays)) setCustomHolidays(s.customHolidays);
        }
      })
      .catch(err => console.warn('Could not load penalty settings:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleRestDay = (dayId: number) => {
    setRestDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const handleAddHoliday = () => {
    if (!newHolidayInput) return;
    if (!customHolidays.includes(newHolidayInput)) {
      setCustomHolidays(prev => [...prev, newHolidayInput].sort());
    }
    setNewHolidayInput('');
  };

  const handleRemoveHoliday = (h: string) => {
    setCustomHolidays(prev => prev.filter(x => x !== h));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedGrace = typeof gracePeriodMinutes === 'string' ? (parseInt(gracePeriodMinutes, 10) || 0) : gracePeriodMinutes;
      const parsedRate = typeof penaltyRate === 'string' ? (parseInt(penaltyRate, 10) || 0) : penaltyRate;

      const res = await fetch('/api/attendance/penalty-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workStartTime,
          gracePeriodMinutes: parsedGrace,
          penaltyType,
          penaltyRate: parsedRate,
          restDays,
          customHolidays
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Jarima va dam olish kunlari sozlamalari muvaffaqiyatli saqlandi!');
        if (onSettingsSaved) onSettingsSaved();
        onClose();
      } else {
        showToast(data.message || 'Xatolik yuz berdi');
      }
    } catch (e: any) {
      showToast('Server bilan bog\'lanishda xatolik');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 via-amber-50 to-emerald-50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-800">
                Jarima va Dam Olish Kunlari Sozlamalari
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Kechikishlar uchun jarima turi, stavkasi va dam olish kunlarini boshqarish
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {isLoading ? (
          <div className="p-10 text-center text-xs text-slate-500">Sozlamalar yuklanmoqda...</div>
        ) : (
          <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
            {/* Ish boshlanish vaqti & Ruxsat etilgan kechikish */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  Ish boshlanish vaqti:
                </label>
                <input 
                  type="time" 
                  required
                  value={workStartTime} 
                  onChange={(e) => setWorkStartTime(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  Ruxsat etilgan kechikish (daqiqa):
                </label>
                <input 
                  type="number" 
                  min="0"
                  max="60"
                  value={gracePeriodMinutes} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setGracePeriodMinutes(val === '' ? '' : Number(val));
                  }} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Jarima hisoblash usuli: Daqiqasiga yoki Soatiga */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <label className="text-xs font-black text-slate-800 block">
                Jarima hisoblash usuli:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPenaltyType('minute')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    penaltyType === 'minute'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Daqiqasiga (Har 1 min)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPenaltyType('hour')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    penaltyType === 'hour'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Soatiga (Har 1 soat)</span>
                </button>
              </div>

              {/* Jarima summasi stavkasi */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  {penaltyType === 'minute' ? '1 daqiqa kechikish uchun jarima miqdori (so\'m):' : '1 soat kechikish uchun jarima miqdori (so\'m):'}
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0"
                    step="500"
                    placeholder="Masalan: 1000"
                    value={penaltyRate} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setPenaltyRate('');
                      } else {
                        const cleaned = val.replace(/^0+(?=\d)/, '');
                        setPenaltyRate(cleaned === '' ? '' : Number(cleaned));
                      }
                    }} 
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-black text-slate-800 outline-none pr-14"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    so'm
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Masalan: agar xodim 25 daqiqa kech kelsa va 1 daqiqasiga {(Number(penaltyRate) || 0).toLocaleString()} so'm bo'lsa, jami jarima: <b>{(25 * (Number(penaltyRate) || 0)).toLocaleString()} so'm</b> bo'ladi.
                </p>
              </div>
            </div>

            {/* Dam olish kunlari (Hafta kunlari) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="text-xs font-black text-slate-800 block">
                Haftaning dam olish kunlari:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {daysOfWeek.map(d => {
                  const isChecked = restDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleRestDay(d.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center border cursor-pointer ${
                        isChecked 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d.label} {isChecked ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">
                Tanlangan dam olish kunlarida kelgan xodimlardan kechikish jarimasi <b>olinmaydi</b> va statusi "Dam olish kunida kelgan" deb belgilanadi.
              </p>
            </div>

            {/* Maxsus sana / Bayram kunlari */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="text-xs font-black text-slate-800 block">
                Maxsus bayram yoki rasmiy dam olish sanalari (YYYY-MM-DD):
              </label>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={newHolidayInput}
                  onChange={(e) => setNewHolidayInput(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none flex-1 font-bold"
                />
                <button
                  type="button"
                  onClick={handleAddHoliday}
                  className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 cursor-pointer"
                >
                  Qo'shish
                </button>
              </div>

              {customHolidays.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customHolidays.map(h => (
                    <span 
                      key={h} 
                      className="px-2 py-0.5 rounded-md text-xs font-bold bg-white border border-slate-200 text-slate-700 flex items-center gap-1 shadow-2xs"
                    >
                      <span>{h}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveHoliday(h)} 
                        className="text-rose-500 hover:text-rose-700 ml-1 font-black cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Bekor qilish
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
              >
                {isSaving ? "Saqlanmoqda..." : "Sozlamalarni saqlash"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// GPS & FILIAL GEORADIUS DAVOMAT MODAL (KELDI / KETDI)
// -------------------------------------------------------------------------------------------------
interface GpsCheckInModalProps {
  employee: EmployeeData | null;
  employees: EmployeeData[];
  geozones: BranchGeozone[];
  selectedDate: string;
  onClose: () => void;
  onRecord: (record: DailyAttendance) => void;
  showToast: (msg: string) => void;
}

function GpsCheckInModal({
  employee,
  employees,
  geozones,
  selectedDate,
  onClose,
  onRecord,
  showToast
}: GpsCheckInModalProps) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employee?.id || employees[0]?.id || '');
  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || employee || employees[0];
  }, [employees, selectedEmpId, employee]);

  const branchZone = useMemo(() => {
    return getBranchGeozone(selectedEmp?.branch || '', geozones);
  }, [selectedEmp, geozones]);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Time & delay calculation
  const [checkInTime, setCheckInTime] = useState<string>(() => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  });
  const [delayReason, setDelayReason] = useState<string>("Yo'l tirbandligi");

  // Scheduled time parsed
  const scheduleStartTime = useMemo(() => {
    if (!selectedEmp?.schedule) return '09:00';
    const parts = selectedEmp.schedule.split('-');
    return parts[0]?.trim() || '09:00';
  }, [selectedEmp]);

  const delayCalculation = useMemo(() => {
    const [schedH, schedM] = scheduleStartTime.split(':').map(Number);
    const schedTotal = (schedH || 9) * 60 + (schedM || 0);

    const [curH, curM] = checkInTime.split(':').map(Number);
    const curTotal = (curH || 0) * 60 + (curM || 0);

    const delay = Math.max(0, curTotal - schedTotal);
    const isLate = delay > 0;
    const penaltyAmount = delay > 0 ? delay * 1000 : 0;
    const dailyBase = selectedEmp?.dailyRate || 280000;
    const net = isLate ? dailyBase - penaltyAmount : dailyBase + 15000;

    return {
      delayMinutes: delay,
      isLate,
      penaltyStr: isLate ? `- ${penaltyAmount.toLocaleString()} so'm` : '-',
      bonusStr: !isLate ? "15,000 so'm" : '-',
      netPayStr: `${net.toLocaleString()} so'm`
    };
  }, [scheduleStartTime, checkInTime, selectedEmp]);

  const isInsideRadius = useMemo(() => {
    if (distanceMeters === null) return false;
    return distanceMeters <= (branchZone?.radius || 100);
  }, [distanceMeters, branchZone]);

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Brauzeringizda geolokatsiya qo'llab-quvvatlanmaydi");
      return;
    }
    setLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCurrentCoords({ lat, lng });
        const dist = calculateDistanceMeters(lat, lng, branchZone.lat, branchZone.lon);
        setDistanceMeters(dist);
        setIsSimulated(false);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setGpsError("GPS koordinatani aniqlab bo'lmadi. Sinov rejimidan (Filial markaziga joylashish) foydalanishingiz mumkin.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSimulateInsideBranch = () => {
    setCurrentCoords({ lat: branchZone.lat, lng: branchZone.lon });
    setDistanceMeters(18); // 18m from store entrance
    setIsSimulated(true);
    setGpsError(null);
  };

  const handleConfirmCheckIn = () => {
    if (!selectedEmp) return;
    if (!isInsideRadius) {
      alert(`Xodim biriktirilgan filial (${branchZone.name}) radiusidan tashqarida! Masofa: ${distanceMeters} metr, ruxsat etilgan radius: ${branchZone.radius} metr. Filial hududiga yaqinlashing yoki 'Sinov: Filial markaziga joylashish' tugmasidan foydalaning.`);
      return;
    }

    const dateStr = selectedDate || new Date().toISOString().split('T')[0];
    const recId = `att-${selectedEmp.id}-${dateStr}`;

    const newRec: DailyAttendance = {
      id: recId,
      employeeId: selectedEmp.id,
      date: dateStr,
      checkIn: checkInTime,
      checkOut: '--:--',
      status: delayCalculation.isLate ? 'Kech qolgan' : 'Vaqtida kelgan',
      delayMinutes: delayCalculation.delayMinutes,
      delayReason: delayCalculation.isLate ? delayReason : undefined,
      workedTime: '-',
      penalty: delayCalculation.penaltyStr,
      bonus: delayCalculation.bonusStr,
      netPay: delayCalculation.netPayStr,
      notes: `GPS orqali tasdiqlandi (${branchZone.name}, ${distanceMeters}m masofadan). ${delayCalculation.isLate ? `${formatDelayText(delayCalculation.delayMinutes)} kech qoldi` : "O'z vaqtida keldi"}`
    };

    onRecord(newRec);
    showToast(`${selectedEmp.fullName} filial (${branchZone.name}) radiusi ichida 'Keldim' (${delayCalculation.isLate ? 'Kech qolgan' : 'Vaqtida kelgan'}) deb muvaffaqiyatli qayd etildi!`);
    onClose();
  };

  const handleConfirmCheckOut = () => {
    if (!selectedEmp) return;
    if (!isInsideRadius) {
      alert(`Xodim filial radiusidan tashqarida! Masofa: ${distanceMeters} metr, ruxsat etilgan radius: ${branchZone.radius} metr.`);
      return;
    }

    const dateStr = selectedDate || new Date().toISOString().split('T')[0];
    const recId = `att-${selectedEmp.id}-${dateStr}`;

    const newRec: DailyAttendance = {
      id: recId,
      employeeId: selectedEmp.id,
      date: dateStr,
      checkIn: '08:52',
      checkOut: checkInTime,
      status: 'Ketdi',
      delayMinutes: 0,
      workedTime: '8 soat 35 daqiqa',
      penalty: '-',
      bonus: '15,000 so\'m',
      netPay: `${((selectedEmp.dailyRate || 280000) + 15000).toLocaleString()} so'm`,
      notes: `GPS orqali ish yakunlandi (${branchZone.name}, chiqish vaqti: ${checkInTime})`
    };

    onRecord(newRec);
    showToast(`${selectedEmp.fullName} uchun 'Ketdim' (Chiqish vaqti: ${checkInTime}) muvaffaqiyatli saqlandi!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Navigation className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-800">
                GPS Filial Georadiusi va Davomat
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Xodim biriktirilgan filial radiusi ichida bo'lsa "Kelgan" deb tasdiqlash
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Employee Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">
              Davomat qilinayotgan xodim:
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => {
                setSelectedEmpId(e.target.value);
                setDistanceMeters(null);
                setCurrentCoords(null);
              }}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-white shadow-2xs cursor-pointer outline-none focus:border-emerald-500"
            >
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.fullName} — {e.branch} ({e.position})
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Branch Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Biriktirilgan filial:
              </span>
              <span className="text-xs font-black text-slate-800 px-2.5 py-0.5 rounded-md bg-white border border-slate-200">
                {branchZone.name}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Filial radiusi:</span>
              <span className="font-bold text-emerald-700">{branchZone.radius} metr</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Filial koordinatalari:</span>
              <span className="font-mono text-[11px] font-semibold text-slate-700">
                Lat: {branchZone.lat.toFixed(4)}, Lon: {branchZone.lon.toFixed(4)}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/80">
              📍 Manzil: {branchZone.address}
            </div>
          </div>

          {/* GPS Location Check Section */}
          <div className="p-4 rounded-2xl border transition-all space-y-3 bg-white border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                Hozirgi GPS holati:
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={locating}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                  <span>{locating ? "Aniqlanmoqda..." : "GPS aniqlash"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateInsideBranch}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  title="Test maqsadida filial hududiga joylashish"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Filialga joylashish (Sinov)</span>
                </button>
              </div>
            </div>

            {gpsError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{gpsError}</span>
              </div>
            )}

            {/* Radius Status Banner */}
            {distanceMeters !== null ? (
              isInsideRadius ? (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-emerald-800 block">
                        Filial radiusi ichidasiz! ({distanceMeters} metr &le; {branchZone.radius} metr)
                      </span>
                      <span className="text-[11px] text-emerald-700 font-medium">
                        Xodim o'z filialida turibdi. Davomat qabul qilinadi. {isSimulated ? "(Sinov rejimi)" : ""}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold px-2.5 py-1 bg-emerald-600 text-white rounded-lg">
                    Ruxsat berildi ✅
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-rose-800 block">
                        Filial radiusidan tashqarida ({distanceMeters} metr &gt; {branchZone.radius} metr)
                      </span>
                      <span className="text-[11px] text-rose-700 font-medium">
                        Haqiqiy davomat faqat biriktirilgan filial hududida qabul qilinadi.
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold px-2.5 py-1 bg-rose-600 text-white rounded-lg">
                    Tashqarida ❌
                  </span>
                </div>
              )
            ) : (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500 font-medium">
                Joylashuvni tekshirish uchun yuqoridagi <b>"GPS aniqlash"</b> yoki <b>"Filialga joylashish (Sinov)"</b> tugmasini bosing
              </div>
            )}
          </div>

          {/* Time & Tardiness Configuration */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Rejadagi ish boshlanishi:</span>
              <span className="text-xs font-black text-slate-800 font-mono px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                {scheduleStartTime}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-bold text-slate-700">Hozirgi kirish vaqti:</label>
              <input 
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold font-mono bg-white outline-none cursor-pointer"
              />
            </div>

            {/* Live Tardiness Feedback */}
            {delayCalculation.isLate ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Kechikish holati:
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono">
                    +{formatDelayText(delayCalculation.delayMinutes)} kech qoldi
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-amber-800">
                  <span>Ushlab qolinadigan jarima:</span>
                  <span className="font-bold text-rose-600">{delayCalculation.penaltyStr}</span>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Kechikish sababi:</label>
                  <input 
                    type="text"
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg text-xs bg-white text-slate-800 outline-none"
                    placeholder="Masalan: Yo'l tirbandligi"
                  />
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  O'z vaqtida kelgan (Kechikish yo'q)
                </span>
                <span className="font-bold text-emerald-700">+15,000 so'm bonus</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-all"
          >
            Bekor qilish
          </button>

          <button
            type="button"
            onClick={handleConfirmCheckOut}
            disabled={!isInsideRadius}
            className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isInsideRadius 
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' 
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            }`}
          >
            <span>🚪 "Ketdim" deb yozish</span>
          </button>

          <button
            type="button"
            onClick={handleConfirmCheckIn}
            disabled={!isInsideRadius}
            className={`px-5 py-2 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
              isInsideRadius 
                ? 'bg-[#00A651] hover:bg-[#009247] text-white shadow-emerald-500/20' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>✅ "Keldim" deb tasdiqlash</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// FACE ID & AI INTEGRATSIYASI VA SINOVI MODAL
// -------------------------------------------------------------------------------------------------
interface FaceIdIntegrationModalProps {
  employee: EmployeeData | null;
  employees: EmployeeData[];
  geozones?: BranchGeozone[];
  attendanceMap?: Map<string, DailyAttendance>;
  selectedDate: string;
  initialTab?: 'photos' | 'accounts' | 'simulator' | 'requests';
  onUpdateEmployeePhoto?: (employeeId: string, newPhotoUrl: string) => void;
  onClose: () => void;
  onRecord: (record: DailyAttendance) => void;
  showToast: (msg: string) => void;
}

function FaceIdIntegrationModal({
  employee,
  employees,
  geozones = DEFAULT_GEOZONES,
  attendanceMap,
  selectedDate,
  initialTab = 'photos',
  onUpdateEmployeePhoto,
  onClose,
  onRecord,
  showToast
}: FaceIdIntegrationModalProps) {
  const [activeTab, setActiveTab] = useState<'photos' | 'accounts' | 'simulator' | 'requests'>(initialTab);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employee?.id || employees[0]?.id || '');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanAction, setScanAction] = useState<'check_in' | 'check_out'>('check_in');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [aiSyncLog, setAiSyncLog] = useState<{ empId: string; type: 'vacation' | 'trip' | 'all'; time: string } | null>(null);

  // Photo request approval states
  const [photoRequests, setPhotoRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('');

  const fetchPhotoRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const res = await fetch('/api/attendance/photo-requests');
      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) {
        setPhotoRequests(data.requests);
      }
    } catch (err) {
      console.error("fetchPhotoRequests error:", err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchPhotoRequests();
  }, []);

  const pendingRequestsCount = useMemo(() => {
    return photoRequests.filter(r => r.status === 'pending').length;
  }, [photoRequests]);

  const filteredPhotoRequests = useMemo(() => {
    if (requestStatusFilter === 'all') return photoRequests;
    return photoRequests.filter(r => r.status === requestStatusFilter);
  }, [photoRequests, requestStatusFilter]);

  const handleApproveRequest = async (req: any) => {
    setProcessingReqId(req.id);
    try {
      const res = await fetch('/api/attendance/photo-request/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: req.id,
          action: 'approve',
          reviewerName: 'HR Menejer'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${req.employeeName} uchun yangi rasm tasdiqlandi va Face ID etaloniga saqlandi! ✅`);
        if (onUpdateEmployeePhoto) {
          onUpdateEmployeePhoto(req.employeeId, req.newPhotoUrl);
        }
        await fetchPhotoRequests();
      } else {
        showToast(data.message || "Tasdiqlashda xatolik yuz berdi");
      }
    } catch (err: any) {
      showToast(err.message || "Xatolik yuz berdi");
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleRejectRequest = async (req: any) => {
    setProcessingReqId(req.id);
    try {
      const res = await fetch('/api/attendance/photo-request/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: req.id,
          action: 'reject',
          reviewerName: 'HR Menejer',
          rejectionReason: rejectReasonText.trim() || "Yuz aniq ko'rinmagan yoki sifat talabga javob bermaydi"
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${req.employeeName} so'rovi rad etildi. ❌`);
        setActiveRejectId(null);
        setRejectReasonText('');
        await fetchPhotoRequests();
      } else {
        showToast(data.message || "Rad etishda xatolik yuz berdi");
      }
    } catch (err: any) {
      showToast(err.message || "Xatolik yuz berdi");
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleDeleteRequest = async (reqId: string) => {
    if (!confirm("Ushbu so'rov tarixini o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`/api/attendance/photo-request/${reqId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast("So'rov o'chirildi.");
        await fetchPhotoRequests();
      }
    } catch (err) {
      showToast("O'chirishda xatolik");
    }
  };

  // Photo studio states
  const [selectedPhotoEmpId, setSelectedPhotoEmpId] = useState<string>(employee?.id || employees[0]?.id || '');
  const [photoSearch, setPhotoSearch] = useState('');
  const [photoBranch, setPhotoBranch] = useState('all');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<any | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || employee || employees[0];
  }, [employees, selectedEmpId, employee]);

  const selectedBranchZone = useMemo(() => {
    return getBranchGeozone(selectedEmp?.branch || '', geozones);
  }, [selectedEmp, geozones]);

  const [scanTime, setScanTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const handleCopy = (text: string, label: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      showToast(`${label} nusxalandi!`);
      setTimeout(() => setCopiedText(null), 2500);
    }
  };

  // Camera and photo handlers
  const startCamera = async () => {
    try {
      setPhotoPreview(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      showToast("Kamera ochilmadi yoki ruxsat berilmadi. Fayldan rasm tanlashingiz mumkin.");
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setPhotoPreview(dataUrl);
      stopCamera();
      showToast("📸 Fotosurat suratga olindi! Quyidagi 'Saqlash' tugmasini bosing.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        stopCamera();
        showToast("📁 Fayldan rasm yuklandi! Quyidagi 'Saqlash' tugmasini bosing.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setPhotoPreview(urlInput.trim());
    setUrlInput('');
    stopCamera();
    showToast("🌐 Rasm havolasi kiritildi! 'Saqlash' tugmasini bosing.");
  };

  const handleSavePhotoToEmployee = async (targetEmp: EmployeeData) => {
    const finalPhoto = photoPreview;
    if (!finalPhoto) {
      showToast("Surat tanlanmagan yoki olinmagan!");
      return;
    }
    setIsSavingPhoto(true);
    try {
      // 1. Send to /api/attendance/employee-photo
      const res = await fetch('/api/attendance/employee-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: targetEmp.id,
          username: (targetEmp as any).username || getEmployeeCredentials(targetEmp).login,
          photoUrl: finalPhoto
        })
      });
      const data = await res.json();

      // 2. Persist to Firebase
      await saveFirebaseEmployee({
        ...targetEmp,
        avatarUrl: finalPhoto
      } as any);

      // 3. Update in parent state
      if (onUpdateEmployeePhoto) {
        onUpdateEmployeePhoto(targetEmp.id, finalPhoto);
      }

      showToast(`✅ ${targetEmp.fullName} uchun Face ID etalon rasmi muvaffaqiyatli saqlandi! Narigi AI 'Keldim' vaqtida ushbu rasmni oladi.`);
      setApiTestResult(data);
    } catch (err) {
      console.error("Save photo error:", err);
      showToast("Rasm saqlashda server xatoligi yuz berdi");
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleTestApi = async (targetEmp: EmployeeData) => {
    setIsTestingApi(true);
    try {
      const res = await fetch(`/api/attendance/employee-photo?employeeId=${targetEmp.id}`);
      const data = await res.json();
      setApiTestResult(data);
      showToast(`✅ Narigi AI oladigan rasm API orqali olindi!`);
    } catch (err) {
      setApiTestResult({ success: false, message: "API bilan bog'lanishda xatolik" });
    } finally {
      setIsTestingApi(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Filtered employees for photo studio
  const filteredPhotoEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesBranch = photoBranch === 'all' || (emp.branch || '') === photoBranch;
      const q = photoSearch.trim().toLowerCase();
      const matchesQ = !q || 
        (emp.fullName || '').toLowerCase().includes(q) || 
        (emp.position || '').toLowerCase().includes(q) ||
        (emp.branch || '').toLowerCase().includes(q) ||
        (getEmployeeCredentials(emp).login || '').toLowerCase().includes(q);
      return matchesBranch && matchesQ;
    });
  }, [employees, photoBranch, photoSearch]);

  const handleSendLeaveStatusToAi = (emp: EmployeeData, leaveType: 'vacation' | 'trip') => {
    const now = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    setAiSyncLog({ empId: emp.id, type: leaveType, time: now });
    const label = leaveType === 'vacation' ? "Ta'tilda (✈️ Samolyot)" : "Ish safarida (🍃 Barg)";
    showToast(`Narigi AI ga yuborildi: ${emp.fullName} hozirda ${label}. Narigi tizimda ushbu belgi YONIB QOLDI! ✅`);
  };

  const handleRunSimulatorScan = () => {
    if (!selectedEmp) return;
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setIsScanning(false);
      const [curH, curM] = scanTime.split(':').map(Number);
      const curTotal = (curH || 0) * 60 + (curM || 0);
      const delay = Math.max(0, curTotal - 540); // 09:00 = 540 min
      const isLate = scanAction === 'check_in' && delay > 0;

      setScanResult({
        employee: selectedEmp,
        matchConfidence: 0.988,
        action: scanAction,
        time: scanTime,
        delayMinutes: isLate ? delay : 0,
        isLate,
        status: scanAction === 'check_out' ? 'Ketdi' : (isLate ? 'Kech qolgan' : 'Vaqtida kelgan')
      });
    }, 1300);
  };

  const handleApplyFaceIdRecord = () => {
    if (!scanResult || !selectedEmp) return;
    const dateStr = selectedDate || new Date().toISOString().split('T')[0];
    const recId = `att-${selectedEmp.id}-${dateStr}`;

    const delayAmount = scanResult.delayMinutes * 1000;
    const dailyBase = selectedEmp.dailyRate || 280000;

    const newRec: DailyAttendance = {
      id: recId,
      employeeId: selectedEmp.id,
      date: dateStr,
      checkIn: scanResult.action === 'check_in' ? scanResult.time : '08:52',
      checkOut: scanResult.action === 'check_out' ? scanResult.time : '--:--',
      status: scanResult.status,
      delayMinutes: scanResult.delayMinutes,
      delayReason: scanResult.isLate ? "Face ID & Kamera: Ishga kechikib keldi" : undefined,
      workedTime: scanResult.action === 'check_out' ? '8 soat 40 daqiqa' : '-',
      penalty: scanResult.isLate ? `- ${delayAmount.toLocaleString()} so'm` : '-',
      bonus: !scanResult.isLate && scanResult.action === 'check_in' ? "15,000 so'm" : '-',
      netPay: scanResult.isLate ? `${(dailyBase - delayAmount).toLocaleString()} so'm` : `${(dailyBase + 15000).toLocaleString()} so'm`,
      notes: `Face ID & AI terminali orqali tasdiqlandi (Moslik: 98.8%, ${selectedEmp.branch}). ${scanResult.isLate ? `${formatDelayText(scanResult.delayMinutes)} kech qoldi` : "O'z vaqtida kelgan"}`
    };

    onRecord(newRec);
    showToast(`Face ID orqali ${selectedEmp.fullName} davomati (${scanResult.status}, ${scanResult.time}) muvaffaqiyatli qabul qilindi!`);
    onClose();
  };

  // Generate complete JSON sync packet for external AI
  const externalAiPayload = useMemo(() => {
    return {
      appName: "Toyona HR & Davomat",
      timestamp: new Date().toISOString(),
      employees: employees.map(emp => {
        const creds = getEmployeeCredentials(emp);
        const record = attendanceMap?.get(emp.id);
        const isVacation = record?.status === "Ta'tilda";
        const isTrip = record?.status === "Ish yuzasidan safarda";

        return {
          id: emp.id,
          fullName: emp.fullName,
          login: creds.login,
          password: creds.password,
          branch: emp.branch,
          department: emp.department,
          position: emp.position,
          schedule: emp.schedule,
          avatarUrl: emp.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${emp.fullName}&backgroundColor=f1f5f9`,
          leaveStatus: {
            isVacationActive: isVacation,
            isTripActive: isTrip,
            badge: isVacation ? "✈️ Ta'tilda (Samolyot)" : (isTrip ? "🍃 Ish safarida (Barg)" : "Ishda")
          }
        };
      })
    };
  }, [employees, attendanceMap]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-purple-600 text-white rounded-xl shadow-xs">
              <Camera className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                Face ID & Davomat Rasm Studiyasi
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                  Etalon Rasm Bazasi
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Xodimlarning yuz fotosuratini yuklash, jonli kameradan rasmga olish va Narigi AI ga uzatish
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => {
              stopCamera();
              onClose();
            }} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center px-4 border-b border-slate-200 bg-slate-50/80 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'photos'
                ? 'border-purple-600 text-purple-700 bg-white/70 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-purple-600" />
            <span>📸 Face ID Rasm Joylash Joyi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'accounts'
                ? 'border-indigo-600 text-indigo-700 bg-white/70'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>🔑 Login, Parol & AI ga Uzatish</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'border-indigo-600 text-indigo-700 bg-white/70'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ScanFace className="w-3.5 h-3.5" />
            <span>🧪 Yuz Skaneri Sinovi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('requests');
              fetchPhotoRequests();
            }}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'border-emerald-600 text-emerald-700 bg-white/70 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>⏳ Xodimlar Rasm So'rovlari</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 0: FACE ID FOTOSURAT YUKLASH VA JOYLASH JOYI (STUDIYA) */}
          {activeTab === 'photos' ? (
            <div className="space-y-4">
              {/* Yo'riqnoma banner */}
              <div className="p-3.5 bg-purple-50/90 border border-purple-200 rounded-2xl flex items-start gap-3">
                <Camera className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-950 leading-relaxed">
                  <p className="font-bold mb-1 flex items-center gap-1.5 text-sm text-purple-900">
                    <span>Xodimlarning Face ID Etalon Rasmini Joylash Joyi</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-200 text-purple-800">
                      POST /api/attendance/employee-photo
                    </span>
                  </p>
                  <p className="text-purple-800 font-medium">
                    Xodim "Keldim" deb kameraga qaraganda, Narigi AI / skaner moduli serverdan shu rasmni oladi va jonli yuz bilan solishtiradi. 
                    Quyida xodimni tanlang, <b>jonli kameradan suratga oling</b> yoki kompyuter/telefondan <b>fayl yuklang</b> va saqlang!
                  </p>
                </div>
              </div>

              {/* Filter and Search bar */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Xodim ismi, lavozimi, login bo'yicha qidirish..."
                      value={photoSearch}
                      onChange={(e) => setPhotoSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-purple-500 font-medium"
                    />
                  </div>

                  <select
                    value={photoBranch}
                    onChange={(e) => setPhotoBranch(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="all">Barcha filiallar</option>
                    {Array.from(new Set(employees.map(e => e.branch))).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="text-[11px] font-bold text-slate-500">
                  {filteredPhotoEmployees.length} nafar xodim topildi
                </div>
              </div>

              {/* Two Column Layout: Left List, Right Studio */}
              {(() => {
                const currentPhotoEmp = employees.find(e => e.id === selectedPhotoEmpId) || filteredPhotoEmployees[0] || employees[0];
                const empCurrentPhoto = currentPhotoEmp?.avatarUrl || (currentPhotoEmp as any)?.photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(currentPhotoEmp?.fullName || 'Xodim')}&backgroundColor=f1f5f9`;
                const empCreds = currentPhotoEmp ? getEmployeeCredentials(currentPhotoEmp) : { login: '', password: '' };

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
                    {/* Left: Employee Selection List */}
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                      <div className="text-[11px] font-bold text-slate-500 px-2 py-1 flex items-center justify-between">
                        <span>XODIMNI TANLANG</span>
                        <span>{filteredPhotoEmployees.length} ta</span>
                      </div>

                      {filteredPhotoEmployees.map((emp, index) => {
                        const isSelected = emp.id === currentPhotoEmp?.id;
                        const hasCustomPhoto = !!emp.avatarUrl;
                        const creds = getEmployeeCredentials(emp);

                        return (
                          <div
                            key={`${emp.id || index}-${index}`}
                            onClick={() => {
                              setSelectedPhotoEmpId(emp.id);
                              setPhotoPreview(null);
                              stopCamera();
                              setApiTestResult(null);
                            }}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                              isSelected
                                ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-200 shadow-xs'
                                : 'bg-white border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                              <img
                                src={emp.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(emp.fullName)}&backgroundColor=f1f5f9`}
                                alt={emp.fullName}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-xs font-black truncate block ${isSelected ? 'text-purple-950' : 'text-slate-800'}`}>
                                  {emp.fullName}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {emp.branch} &bull; {emp.position}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-mono text-slate-500 font-semibold truncate">
                                  login: {creds.login}
                                </span>
                                {hasCustomPhoto ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 shrink-0">
                                    🟢 Etalon bor
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-700 shrink-0">
                                    ⚠️ Rasmsiz
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {filteredPhotoEmployees.length === 0 && (
                        <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                          Xodim topilmadi
                        </div>
                      )}
                    </div>

                    {/* Right: Studio for Selected Employee */}
                    {currentPhotoEmp ? (
                      <div className="space-y-4 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
                        {/* Header for Employee */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm sm:text-base font-black text-slate-800">
                                {currentPhotoEmp.fullName}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 font-mono">
                                {currentPhotoEmp.id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {currentPhotoEmp.branch} &bull; {currentPhotoEmp.position} &bull; Login: <span className="font-mono font-bold text-purple-700">{empCreds.login}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleTestApi(currentPhotoEmp)}
                              disabled={isTestingApi}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-200"
                              title="GET /api/attendance/employee-photo orqali Narigi AI nima olishini sinash"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                              <span>{isTestingApi ? "Tekshirilmoqda..." : "Narigi AI API Tekshiruvi"}</span>
                            </button>
                          </div>
                        </div>

                        {/* Interactive Photo Area */}
                        <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[280px]">
                          {/* Live Video Camera Mode */}
                          {isCameraActive ? (
                            <div className="relative w-full max-w-md flex flex-col items-center">
                              <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-black border-2 border-purple-400 shadow-xl">
                                <video
                                  ref={videoRef}
                                  autoPlay
                                  playsInline
                                  muted
                                  className="w-full h-full object-cover scale-x-[-1]"
                                />

                                {/* Face Outline Overlay */}
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                  <div className="w-44 h-56 rounded-[50%] border-2 border-dashed border-purple-400/80 animate-pulse flex flex-col items-center justify-between p-3">
                                    <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">
                                      Yuzni shu yerga joylang
                                    </span>
                                    <div className="w-full h-0.5 bg-purple-400 shadow-[0_0_8px_#c084fc] animate-bounce" />
                                    <span className="text-[9px] text-purple-200">
                                      To'g'riga qarang
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Camera Action Buttons */}
                              <div className="flex items-center gap-3 mt-4">
                                <button
                                  type="button"
                                  onClick={capturePhoto}
                                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-[#00A651] hover:from-emerald-600 hover:to-[#009247] text-white rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                                >
                                  <Camera className="w-4 h-4" />
                                  <span>📸 Suratga Olish (Tayyor)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={stopCamera}
                                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <VideoOff className="w-3.5 h-3.5" />
                                  <span>Kamerani o'chirish</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Preview Mode (Current Photo or Captured Photo) */
                            <div className="flex flex-col items-center text-center">
                              <div className="relative group">
                                <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl bg-slate-800">
                                  <img
                                    src={photoPreview || empCurrentPhoto}
                                    alt={currentPhotoEmp.fullName}
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                {photoPreview && (
                                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-md flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Yangi kadr
                                  </span>
                                )}
                              </div>

                              <div className="mt-3 text-white">
                                <span className="text-xs font-bold block">
                                  {photoPreview ? "Yangi olingan surat tayyor! Quyidagi 'Saqlash' tugmasini bosing" : "Joriy Face ID etalon surati"}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  Narigi AI "Keldim" bosilganda yuzni tekshirish uchun ushbu rasmni yuklaydi
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Hidden Inputs for File & Canvas */}
                        <canvas ref={canvasRef} className="hidden" />
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />

                        {/* 3 Upload Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                          >
                            <Camera className="w-4 h-4 text-purple-600" />
                            <span>1. Kameradan surat olish</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                          >
                            <Upload className="w-4 h-4 text-indigo-600" />
                            <span>2. Fayldan yuklash</span>
                          </button>

                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                            <input
                              type="text"
                              placeholder="URL havola..."
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              className="w-full px-2 py-1 text-xs bg-transparent outline-none font-medium text-slate-700"
                            />
                            <button
                              type="button"
                              onClick={handleApplyUrl}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                            >
                              O'rnatish
                            </button>
                          </div>
                        </div>

                        {/* Save Action Button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleSavePhotoToEmployee(currentPhotoEmp)}
                            disabled={!photoPreview || isSavingPhoto}
                            className={`w-full py-3 rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 ${
                              photoPreview && !isSavingPhoto
                                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 text-white cursor-pointer active:scale-98 animate-pulse hover:animate-none'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            }`}
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>
                              {isSavingPhoto
                                ? "Saqlanmoqda..."
                                : photoPreview
                                ? `💾 Ushbu Etalon Rasmni Saqlash (${currentPhotoEmp.fullName})`
                                : "Suratni saqlash uchun yuqoridagi 1 yoki 2-usul bilan rasm tanlang"}
                            </span>
                          </button>
                        </div>

                        {/* API Test Result Card (If tested) */}
                        {apiTestResult && (
                          <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs space-y-2 border border-slate-800">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                Narigi AI oladigan API natijasi (GET /api/attendance/employee-photo):
                              </span>
                              <button
                                type="button"
                                onClick={() => setApiTestResult(null)}
                                className="text-slate-400 hover:text-white text-xs cursor-pointer"
                              >
                                &times; Yopish
                              </button>
                            </div>
                            <div className="bg-black/60 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto max-h-[140px] text-emerald-300">
                              {JSON.stringify(apiTestResult, null, 2)}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              ✅ Narigi AI "Keldim" bosilganda yuzni tekshirish uchun ushbu <b>photoUrl</b> rasmidan foydalanadi.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          ) : activeTab === 'accounts' ? (
            <div className="space-y-4">
              {/* Top Banner explaining the flow */}
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950 leading-relaxed">
                  <p className="font-bold mb-1">
                    Narigi AI ga xodimlarning hisob ma'lumotlari uzatiladi:
                  </p>
                  <p className="text-indigo-800">
                    Siz davomat uchun narigi AI ga xodimning <b>loginini</b>, <b>parolini</b>, <b>filialini</b> va <b>lavozimini</b> yuborasiz. 
                    Agar xodim <b>Ta'tilda</b> (✈️ Samolyot) yoki <b>Ish safarida</b> (🍃 Barg) bo'lsa, ushbu signal narigi AI ga yuborilib, uning tizimida o'sha ikkitadan keraklisi <b>yonib turadi</b>!
                  </p>
                </div>
              </div>

              {/* Sync Actions Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs text-slate-500 font-semibold">
                  Jami <b>{employees.length} nafar</b> xodim hisobi mavjud
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(externalAiPayload, null, 2), "Barcha xodimlar JSON paketi")}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedText === "Barcha xodimlar JSON paketi" ? "Nusxalandi! ✅" : "AI ga JSON nusxalash"}</span>
                  </button>
                </div>
              </div>

              {/* Employees Credentials List */}
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {employees.map((emp, index) => {
                  const creds = getEmployeeCredentials(emp);
                  const isPasswordShown = showPasswords[emp.id] || false;
                  const record = attendanceMap?.get(emp.id);
                  const isVacation = record?.status === "Ta'tilda";
                  const isTrip = record?.status === "Ish yuzasidan safarda";
                  const isSynced = aiSyncLog?.empId === emp.id;

                  return (
                    <div 
                      key={`${emp.id || index}-${index}`} 
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isVacation 
                          ? 'bg-sky-50/70 border-sky-300 shadow-2xs' 
                          : (isTrip 
                            ? 'bg-teal-50/70 border-teal-300 shadow-2xs' 
                            : 'bg-white border-slate-200 hover:border-slate-300')
                      }`}
                    >
                      {/* Left: Employee info & Avatar */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                          {emp.avatarUrl ? (
                            <img src={emp.avatarUrl} alt={emp.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${emp.fullName}&backgroundColor=f1f5f9`} alt="avatar" className="w-full h-full object-cover" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800">
                              {emp.fullName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {emp.id}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            <span className="text-indigo-700 font-bold">{emp.branch}</span> &bull; <span>{emp.position}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Login & Password credentials */}
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <div className="text-[11px]">
                          <span className="text-slate-400 font-bold block text-[9px] uppercase">Login:</span>
                          <span className="font-mono font-bold text-slate-800">{creds.login}</span>
                        </div>
                        <div className="h-6 w-[1px] bg-slate-200 mx-1" />
                        <div className="text-[11px]">
                          <span className="text-slate-400 font-bold block text-[9px] uppercase">Parol:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {isPasswordShown ? creds.password : '••••••••'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold ml-1 cursor-pointer"
                        >
                          {isPasswordShown ? "Yashirish" : "Ko'rish"}
                        </button>
                      </div>

                      {/* Right: Leave Status & AI Signal Indicator */}
                      <div className="flex items-center gap-2">
                        {isVacation ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-sky-600 text-white flex items-center gap-1 shadow-2xs animate-pulse">
                              <Plane className="w-3.5 h-3.5" />
                              <span>✈️ Ta'tilda (YONIQ)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSendLeaveStatusToAi(emp, 'vacation')}
                              className="p-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                              title="Narigi AI ga signal yuborish"
                            >
                              AI ga jo'natish
                            </button>
                          </div>
                        ) : isTrip ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-teal-600 text-white flex items-center gap-1 shadow-2xs animate-pulse">
                              <Leaf className="w-3.5 h-3.5" />
                              <span>🍃 Safarda (YONIQ)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSendLeaveStatusToAi(emp, 'trip')}
                              className="p-1.5 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                              title="Narigi AI ga signal yuborish"
                            >
                              AI ga jo'natish
                            </button>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Ishda</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'simulator' ? (
            /* TAB 2: SIMULATOR - LOGIN + "KELDIM" -> SENDS PHOTO TO AI -> AI RETURNS CHECKIN/CHECKOUT */
            <div className="space-y-4">
              {/* Instructions banner */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center gap-2">
                <ScanFace className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <b>Integratsiya jarayoni:</b> Xodim login va paroli bilan kirib <b>"Keldim"</b> tugmasini bosganida kamera yuzni skanerlashni boshlaydi. Toyona narigi AI kodiga rasm yuboradi: <i>"Men o'sha xodimning rasmini yuboraman, sen skaner qilasan"</i>. Narigi AI esa xodim kelgan vaqtini qaytaradi!
                </span>
              </div>

              {/* Login Simulator Box */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Xodimni tanlang:</label>
                    <select
                      value={selectedEmpId}
                      onChange={(e) => {
                        setSelectedEmpId(e.target.value);
                        setScanResult(null);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                    >
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.fullName} — {e.branch} ({e.position})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Harakat turi:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setScanAction('check_in'); setScanResult(null); }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          scanAction === 'check_in'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>"Keldim" (Kirish)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setScanAction('check_out'); setScanResult(null); }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          scanAction === 'check_out'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>"Ketdim" (Chiqish)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Selected Employee Credential Card & Geozone Verification */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600">Kirish hisobi:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-800">
                      {getEmployeeCredentials(selectedEmp).login}
                    </span>
                    <span className="text-slate-400 font-mono">&bull;</span>
                    <span className="text-slate-600 font-medium">Filial: <b>{selectedEmp.branch}</b></span>
                  </div>

                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Filial radiusi ichida ({selectedBranchZone.radius}m ruxsat) ✅</span>
                  </div>
                </div>
              </div>

              {/* Biometric Camera Reticle & Live Scan Animation */}
              <div className="relative rounded-2xl bg-slate-900 overflow-hidden p-6 flex flex-col items-center justify-center min-h-[240px] text-center border-2 border-slate-800">
                {/* Face Scanning Overlay Frame */}
                <div className="relative w-36 h-36 rounded-2xl border-2 border-indigo-400/90 flex items-center justify-center overflow-hidden mb-3 shadow-lg">
                  {selectedEmp?.avatarUrl ? (
                    <img src={selectedEmp.avatarUrl} alt={selectedEmp.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${selectedEmp?.fullName}&backgroundColor=f1f5f9`} alt="avatar" className="w-full h-full object-cover" />
                  )}

                  {isScanning && (
                    <div className="absolute inset-0 bg-indigo-500/25 flex items-center justify-center">
                      <div className="w-full h-1 bg-indigo-400 absolute animate-pulse shadow-xl" style={{ top: '50%' }} />
                    </div>
                  )}

                  <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-indigo-400" />
                  <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-indigo-400" />
                  <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-indigo-400" />
                  <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-indigo-400" />
                </div>

                <div className="text-white text-xs font-bold max-w-md">
                  {isScanning ? (
                    <div className="space-y-1">
                      <span className="text-indigo-400 flex items-center gap-1.5 justify-center">
                        <Camera className="w-4 h-4 animate-spin" />
                        Kameradan rasm olindi va narigi AI ga yuborildi...
                      </span>
                      <p className="text-[11px] text-slate-400 font-mono">
                        POST /api/face-id/verify-photo: "Men o'sha xodimning rasmini yuboraman, sen skaner qilasan"
                      </p>
                    </div>
                  ) : scanResult ? (
                    <span className="text-emerald-400 flex items-center gap-1.5 justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                      Narigi AI javob qaytardi: Xodim yuzi 98.8% aniqlikda tasdiqlandi!
                    </span>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-slate-200">
                        Xodim login/parol bilan kirib <b>"{scanAction === 'check_in' ? 'Keldim' : 'Ketdim'}"</b> tugmasini bosadi
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Kamera yuzni skanerlab narigi AI ga rasm uzatadi va kelgan/ketgan vaqti qaytib keladi
                      </p>
                    </div>
                  )}
                </div>

                {/* Scan Time Selector & Trigger Button */}
                <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
                  <div className="flex items-center gap-1.5 bg-slate-800 text-white px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Skaner vaqti:</span>
                    <input 
                      type="time" 
                      value={scanTime} 
                      onChange={(e) => { setScanTime(e.target.value); setScanResult(null); }}
                      className="bg-transparent text-white font-mono font-bold outline-none cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRunSimulatorScan}
                    disabled={isScanning}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <ScanFace className="w-4 h-4" />
                    <span>{isScanning ? "Skaner qilinmoqda..." : `${scanAction === 'check_in' ? 'Keldim' : 'Ketdim'} & AI ga Rasm Yuborish`}</span>
                  </button>
                </div>
              </div>

              {/* Scan Result Card from External AI */}
              {scanResult && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-700">Narigi AI qaytargan xodim:</span>
                    <span className="text-xs font-black text-slate-800">{selectedEmp?.fullName} (ID: {selectedEmp?.id})</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-700">Filial & Manzil:</span>
                    <span className="text-xs font-bold text-emerald-700">{selectedEmp?.branch} (Radius ichida ✅)</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-700">
                      {scanResult.action === 'check_in' ? "Kelgan vaqti (checkIn):" : "Ketgan vaqti (checkOut):"}
                    </span>
                    <span className="text-xs font-black font-mono text-slate-800">{scanResult.time}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Davomat va Kechikish holati:</span>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                      scanResult.isLate 
                        ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {scanResult.isLate 
                        ? `Kech qolgan (+${formatDelayShort(scanResult.delayMinutes)} kech qoldi)` 
                        : (scanResult.action === 'check_out' ? "Ishdan ketdi ✅" : "O'z vaqtida kelgan ✅")}
                    </span>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleApplyFaceIdRecord}
                      className="px-5 py-2.5 bg-[#00A651] hover:bg-[#009247] text-white rounded-xl text-xs font-black shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Davomat Jurnaliga Yozish</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'requests' ? (
            /* TAB 3: XODIMLAR RASM SO'ROVLARI (HR TASDIG'I) */
            <div className="space-y-4">
              {/* Banner */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-purple-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs mt-0.5">
                    <UserCheck className="w-5 h-5" />
                  </span>
                  <div className="text-xs text-slate-800 leading-relaxed">
                    <p className="font-bold text-sm text-emerald-950 mb-0.5 flex items-center gap-2">
                      <span>Xodimlar Yuborgan Yangi Face ID Surat So'rovlari</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900">
                        HR Tasdiqlash Markazi
                      </span>
                    </p>
                    <p className="text-slate-600 font-medium">
                      Xodimlar o'z profilidan yuborgan yangi fotosuratlarni ko'rib chiqing. <b>"Tasdiqlash"</b> tugmasi bosilganda xodimning Face ID etalon rasmi yangilanadi va u yangi rasm orqali bemalol davomat qila oladi.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchPhotoRequests}
                  disabled={isLoadingRequests}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRequests ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
                  <span>Yangilash</span>
                </button>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(['pending', 'all', 'approved', 'rejected'] as const).map((st) => {
                    const count = st === 'all' 
                      ? photoRequests.length 
                      : photoRequests.filter(r => r.status === st).length;
                    const labels: Record<string, string> = {
                      pending: '⏳ Kutilmoqda',
                      all: 'Barchasi',
                      approved: '✓ Tasdiqlangan',
                      rejected: '✕ Rad etilgan'
                    };
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setRequestStatusFilter(st)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          requestStatusFilter === st
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>{labels[st]}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          st === 'pending' && count > 0 
                            ? 'bg-rose-500 text-white' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs text-slate-500 font-bold">
                  Jami: {filteredPhotoRequests.length} ta so'rov
                </div>
              </div>

              {/* Requests List */}
              {isLoadingRequests && photoRequests.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  So'rovlar yuklanmoqda...
                </div>
              ) : filteredPhotoRequests.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl">
                    📸
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">Hozircha so'rovlar mavjud emas</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Xodimlar o'z profilidan yangi surat yuklaganida so'rovlar shu yerda paydo bo'ladi.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPhotoRequests.map((req) => {
                    const isPending = req.status === 'pending';
                    const isApproved = req.status === 'approved';
                    const isRejected = req.status === 'rejected';
                    const isProcessing = processingReqId === req.id;
                    const isRejecting = activeRejectId === req.id;

                    return (
                      <div
                        key={req.id}
                        className={`p-4 rounded-2xl border transition-all bg-white shadow-2xs ${
                          isPending
                            ? 'border-amber-300 ring-1 ring-amber-100'
                            : isApproved
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : 'border-slate-200 bg-slate-50/40'
                        }`}
                      >
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                              <img
                                src={req.currentPhotoUrl || req.newPhotoUrl}
                                alt={req.employeeName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                {req.employeeName}
                                <span className="text-[11px] font-semibold text-slate-500">
                                  (ID: {req.employeeId})
                                </span>
                              </h4>
                              <p className="text-xs text-slate-500 font-medium">
                                {req.branch} &bull; {req.position}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <span className="text-[11px] text-slate-400 font-medium">
                              {new Date(req.submittedAt).toLocaleString('uz-UZ', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>

                            {isPending && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-700" />
                                Kutilmoqda
                              </span>
                            )}
                            {isApproved && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                Tasdiqlangan
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                <X className="w-3 h-3 text-rose-700" />
                                Rad etilgan
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteRequest(req.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Tarixdan o'chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Visual comparison */}
                        <div className="py-3 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 bg-slate-50/70 rounded-xl my-3 p-3 border border-slate-100">
                          {/* Old / Current */}
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                              Joriy etalon rasm
                            </span>
                            <div className="w-24 h-28 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-2xs relative">
                              {req.currentPhotoUrl ? (
                                <img
                                  src={req.currentPhotoUrl}
                                  alt="Joriy rasm"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                                  Rasm yo'q
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">Amaldagi</span>
                          </div>

                          {/* Arrow */}
                          <div className="text-slate-400 font-black text-xl hidden sm:block">
                            ➔
                          </div>

                          {/* New Request */}
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wide flex items-center gap-1">
                              <span>Yangi yuborilgan rasm</span>
                              <Sparkles className="w-3 h-3 text-purple-600" />
                            </span>
                            <div className="w-24 h-28 rounded-xl overflow-hidden bg-white border-2 border-purple-500 shadow-md ring-4 ring-purple-100 relative">
                              <img
                                src={req.newPhotoUrl}
                                alt="Yangi rasm"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="text-[10px] text-purple-700 font-bold">Kutilayotgan yangi</span>
                          </div>
                        </div>

                        {/* Status details or review notes */}
                        {isApproved && (
                          <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between">
                            <span>✓ Ushbu rasm <strong>Face ID etalon bazasiga biriktirildi</strong>. Xodim endi shu rasm orqali taniydi.</span>
                            {req.reviewedBy && (
                              <span className="text-[11px] text-emerald-700 font-bold">
                                {req.reviewedBy} ({req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString('uz-UZ') : ''})
                              </span>
                            )}
                          </div>
                        )}

                        {isRejected && (
                          <div className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                            <span className="font-bold">Rad etildi: </span>
                            <span>{req.rejectionReason || "Talabga mos kelmagani sababli rad etildi."}</span>
                          </div>
                        )}

                        {/* Action buttons (Only for pending requests) */}
                        {isPending && (
                          <div className="pt-2">
                            {isRejecting ? (
                              <div className="bg-rose-50/70 border border-rose-200 p-3 rounded-xl space-y-2">
                                <label className="text-xs font-bold text-rose-900 block">
                                  Rad etish sababini kiriting (Xodimga ko'rinadi):
                                </label>
                                <input
                                  type="text"
                                  placeholder="Masalan: Yuz qorong'i tushgan, iltimos yaxshi yorug'likda oling..."
                                  value={rejectReasonText}
                                  onChange={(e) => setRejectReasonText(e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-200"
                                />
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveRejectId(null);
                                      setRejectReasonText('');
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                  >
                                    Bekor qilish
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectRequest(req)}
                                    disabled={isProcessing}
                                    className="px-4 py-1.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer shadow-xs"
                                  >
                                    {isProcessing ? "Rad etilmoqda..." : "✕ Rad etishni tasdiqlash"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRejectId(req.id);
                                    setRejectReasonText('');
                                  }}
                                  disabled={isProcessing}
                                  className="px-4 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Rad etish</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleApproveRequest(req)}
                                  disabled={isProcessing}
                                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
                                >
                                  {isProcessing ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Saqlanmoqda...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4" />
                                      <span>✓ Tasdiqlash va etalon qilish</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
