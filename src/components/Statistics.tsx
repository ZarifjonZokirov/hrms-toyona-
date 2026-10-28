import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { 
  Calendar, ChevronDown, ChevronUp, X, Phone, Mail, User, ArrowLeft, 
  Briefcase, GraduationCap, MapPin, Wallet, Code, PieChart as LucidePieChart, 
  Database, Users, Building, ShieldCheck, CheckCircle2, Sparkles, RefreshCw, 
  Award, Activity, Radio, FileText, CheckCircle, Clock 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ModuleHeaderLogo, ToyonaBrand } from './Logo';
import { 
  getFirebaseStats, 
  saveFirebaseStats, 
  getFirebaseUsers, 
  getFirebaseBranches, 
  getFirebaseEmployees, 
  getFirebaseTransfers,
  getFirebaseCandidates,
  getFirebaseVacancies,
  getFirebaseAttendance
} from '../firebase';
import { POSITIONS_LIST } from './Candidates';
import { exportToExcel, exportToPDF } from '../lib/export';
import { ExportButtons } from './ExportButtons';

// Dasturda ishlatiladigan rasmiy Statuslar ro'yxati
const STATUSES = [
  "Yangi nomzod",
  "Dastlabki saralash",
  "Suhbatga chaqirilgan",
  "Ishga taklif qilingan",
  "Hujjat yig'ish",
  "Trening",
  "Hujjatlashtirishda",
  "Ishga qabul qilingan"
];

const STATUS_COLORS = [
  '#3b82f6', // Yangi nomzod - blue
  '#8b5cf6', // Dastlabki saralash - purple
  '#f59e0b', // Suhbat - orange
  '#10b981', // Ishga taklif - emerald
  '#6366f1', // Hujjat yig'ish - indigo
  '#ec4899', // Trening - pink
  '#14b8a6', // Hujjatlashtirish - teal
  '#00A651', // Qabul qilingan - our brand green
];

const TRANSFER_STATUS_COLORS = {
  "Lavozim o'zgarishi": "#2563eb", // Ko'k
  "Filial o'zgarishi": "#ea580c"  // Qizg'ish to'q sariq
};

export interface CandidateItem {
  id: string;
  name: string;
  fullName?: string;
  role: string;
  jobPosition?: string;
  position?: string;
  status: string;
  date: string;
  submittedAt?: string;
  phone: string;
  email: string;
  avatar: string;
  photoUrl?: string;
  location: string;
  region?: string;
  targetBranch?: string;
  education: string;
  experience: string;
  expectedSalary: string;
  skills: string[];
}

// Xavfsiz sana konvertori (nuqtali va ISO sanalarni to'g'ri o'qish)
const safeParseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      const iso = `${year}-${month}-${day}`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return d;
    }
  }
  try {
    const isoDate = parseISO(s);
    if (!isNaN(isoDate.getTime())) return isoDate;
  } catch {}
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

export default function Statistics() {
  // --- REAL STATE O'ZGARUVCHILARI ---
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRole, setSelectedRole] = useState('Barchasi');
  const [showStatusDistribution, setShowStatusDistribution] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  const [firebaseStats, setFirebaseStats] = useState<any>({
    totalUsers: 0,
    totalBranches: 0,
    totalEmployees: 0,
    totalVacancies: 0,
    totalCandidates: 0,
    totalTransfers: 0,
    attendanceRateToday: 100,
    lastCalculatedAt: 'Hozir'
  });

  // Nomzodlarni real Firebase va API dan yuklash
  const loadCandidatesData = async () => {
    try {
      let rawList: any[] = [];

      // 1. Backend API orqali olish
      try {
        const res = await fetch('/api/candidates');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            rawList = data;
          }
        }
      } catch (err) {
        // fallback to Firestore
      }

      // 2. Firebase dan olish
      if (!rawList.length) {
        try {
          const fbCandidates = await getFirebaseCandidates(true);
          if (Array.isArray(fbCandidates) && fbCandidates.length > 0) {
            rawList = fbCandidates;
          }
        } catch (err) {
          console.warn("Firebase candidates load warning:", err);
        }
      }

      // 3. LocalStorage dan tekshirish
      if (!rawList.length) {
        try {
          const saved = localStorage.getItem('toyonasavdo_candidates_v2');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) rawList = parsed;
          }
        } catch {}
      }

      // Normalizatsiya
      const normalized: CandidateItem[] = rawList.map((c, i) => {
        const fullName = c.fullName || c.fio || c.name || `Nomzod #${i + 1}`;
        const role = c.jobPosition || c.position || c.lavozim || c.role || 'Sotuvchi maslahatchi';
        const rawDate = c.submittedAt || c.date || c.createdAt || new Date().toISOString();
        let safeDate = rawDate;
        try {
          if (rawDate && typeof rawDate === 'string' && rawDate.includes('.')) {
            const parts = rawDate.split('.');
            if (parts.length === 3) {
              safeDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toISOString();
            }
          }
        } catch {}

        return {
          id: c.id || c.firestoreId || `cand-${i}`,
          name: fullName,
          fullName,
          role,
          jobPosition: role,
          position: role,
          status: c.status || 'Yangi nomzod',
          date: safeDate,
          submittedAt: safeDate,
          phone: c.phone1 || c.phone || c.telefon1 || '+998 -- --- -- --',
          email: c.email || `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@toyona.uz`,
          avatar: c.photoUrl || c.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=00A651&color=fff`,
          location: c.region || c.targetBranch || c.exactAddress || c.address || 'Bosh ofis',
          region: c.region,
          targetBranch: c.targetBranch,
          education: c.educationLevel || c.education || c.malumoti || 'O\'rta maxsus',
          experience: c.pastExperience || c.candidateMessage || c.experience || 'Mavjud emas',
          expectedSalary: c.expectedSalary || 'Kelishilgan holda',
          skills: Array.isArray(c.skills) && c.skills.length > 0 
            ? c.skills 
            : ['Muloqot madaniyati', 'Mijozlar bilan ishlash', 'Mas\'uliyatlilik']
        };
      });

      setCandidates(normalized);
    } catch (e) {
      console.warn("Could not load real candidates:", e);
    }
  };

  // O'tkazmalarni yuklash
  const loadTransfersData = async () => {
    try {
      let list: any[] = [];
      try {
        const res = await fetch('/api/transfers');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) list = data;
        }
      } catch {}

      if (!list.length) {
        const fbTransfers = await getFirebaseTransfers(true);
        if (Array.isArray(fbTransfers)) list = fbTransfers;
      }

      if (!list.length) {
        try {
          const saved = localStorage.getItem('hrms_transfers_v3');
          if (saved) list = JSON.parse(saved);
        } catch {}
      }

      setTransfers(list);
    } catch (e) {
      console.warn("Could not load transfers:", e);
    }
  };

  // Real Firebase statistikasini hisoblash va yangilash
  const loadFirebaseStats = async () => {
    try {
      setIsRefreshingStats(true);
      const todayIso = new Date().toISOString().slice(0, 10);

      const [users, branches, emps, vacs, trs, candList, todayAtt] = await Promise.all([
        getFirebaseUsers(true),
        getFirebaseBranches(true),
        getFirebaseEmployees(true),
        getFirebaseVacancies(true),
        getFirebaseTransfers(true),
        getFirebaseCandidates(true),
        getFirebaseAttendance(todayIso)
      ]);

      const totalUsers = users.length;
      const totalBranches = branches.length;
      const totalEmployees = emps.length;
      const totalVacancies = vacs.length;
      const totalCandidates = candList.length;
      const totalTransfers = trs.length;

      // Real davomat foizi: bugungi kelgan xodimlar soni / jami xodimlar
      const attendedCount = todayAtt.filter(a => a.status && !a.status.includes('Kelmadi')).length;
      const calculatedRate = totalEmployees > 0 
        ? Math.min(100, Math.round(((attendedCount > 0 ? attendedCount : totalEmployees) / totalEmployees) * 100 * 10) / 10) 
        : 100;

      const liveStats = {
        totalUsers,
        totalBranches,
        totalEmployees,
        totalVacancies,
        totalCandidates,
        totalTransfers,
        attendanceRateToday: calculatedRate,
        lastCalculatedAt: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
      };

      setFirebaseStats(liveStats);
      setVacancies(vacs);
      if (candList.length > 0) {
        loadCandidatesData();
      }
      if (trs.length > 0) {
        setTransfers(trs);
      }

      // Firestore overview hujjatini ham real yangi ma'lumotlar bilan sinxron saqlash
      saveFirebaseStats({
        ...liveStats,
        activeEmployees: totalEmployees
      }).catch(() => {});

    } catch (e) {
      console.warn("Could not calculate real Firebase stats:", e);
    } finally {
      setIsRefreshingStats(false);
    }
  };

  useEffect(() => {
    loadFirebaseStats();
    loadCandidatesData();
    loadTransfersData();

    const handleDataSync = () => {
      loadFirebaseStats();
      loadCandidatesData();
      loadTransfersData();
    };

    window.addEventListener('toyonasavdo_candidates_updated', handleDataSync);
    window.addEventListener('toyonasavdo_job_requests_updated', handleDataSync);
    window.addEventListener('toyonasavdo_data_sync', handleDataSync);
    window.addEventListener('hrms_transfers_updated', handleDataSync);
    window.addEventListener('hrms_employees_updated', handleDataSync);
    window.addEventListener('hrms_branches_updated', handleDataSync);
    window.addEventListener('hrms_vacancies_updated', handleDataSync);
    window.addEventListener('storage', handleDataSync);

    return () => {
      window.removeEventListener('toyonasavdo_candidates_updated', handleDataSync);
      window.removeEventListener('toyonasavdo_job_requests_updated', handleDataSync);
      window.removeEventListener('toyonasavdo_data_sync', handleDataSync);
      window.removeEventListener('hrms_transfers_updated', handleDataSync);
      window.removeEventListener('hrms_employees_updated', handleDataSync);
      window.removeEventListener('hrms_branches_updated', handleDataSync);
      window.removeEventListener('hrms_vacancies_updated', handleDataSync);
      window.removeEventListener('storage', handleDataSync);
    };
  }, []);

  // Dinamik lavozimlar ro'yxati (Nomzodlar, Vakansiyalar va Rasmiy lavozimlar birlashmasi)
  const availableRoles = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => {
      if (c.role) set.add(c.role);
    });
    vacancies.forEach(v => {
      if (v.title) set.add(v.title);
      if (v.position) set.add(v.position);
    });
    POSITIONS_LIST.forEach(p => set.add(p));
    return Array.from(set).filter(Boolean).sort();
  }, [candidates, vacancies]);

  // O'tkazmalar statistikasi - REAL MA'LUMOTLAR BILAN
  const dynamicTransferPieData = useMemo(() => {
    const posChangeCount = transfers.filter(t => 
      t.type === 'position' || 
      (t.qaysiLavozimdan && t.qaysiLavozimga && t.qaysiLavozimdan !== t.qaysiLavozimga)
    ).length;

    const branchChangeCount = transfers.filter(t => 
      t.type === 'branch' || 
      (t.qaysiFilialdan && t.qaysiFilialga && t.qaysiFilialdan !== t.qaysiFilialga)
    ).length;

    // Agar o'tkazmalar hali bo'lmasa, 0 qiymat qaytaramiz (demo soxta 8 va 12 yo'q)
    const result = [];
    if (posChangeCount > 0) {
      result.push({ name: "Lavozim o'zgarishi", value: posChangeCount });
    }
    if (branchChangeCount > 0) {
      result.push({ name: "Filial o'zgarishi", value: branchChangeCount });
    }

    if (result.length === 0 && transfers.length > 0) {
      result.push({ name: "Boshqa o'tkazmalar", value: transfers.length });
    }

    return result;
  }, [transfers]);

  // Dropdown yopilishi uchun
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- FILTRLASH MANTIQI (REAL NOMZODLAR KESIMIDA) ---
  const filteredData = useMemo(() => {
    return candidates.filter(c => {
      let valid = true;
      const cDate = String(c.date || '').slice(0, 10);
      if (startDate && cDate && cDate < startDate) valid = false;
      if (endDate && cDate && cDate > endDate) valid = false;
      if (selectedRole !== 'Barchasi' && c.role !== selectedRole) {
        valid = false;
      }
      return valid;
    });
  }, [candidates, startDate, endDate, selectedRole]);

  // Oy bo'yicha saralash
  const monthFilteredData = useMemo(() => {
    if (!selectedMonth) return filteredData;
    return filteredData.filter(c => {
      try {
        const d = safeParseDate(c.date);
        return d ? format(d, 'MMM, yyyy') === selectedMonth : false;
      } catch {
        return false;
      }
    });
  }, [filteredData, selectedMonth]);

  // --- PIE CHART (HOLATLAR TAQSIMOTI) ---
  const pieData = useMemo(() => {
    const counts = STATUSES.map(status => ({
      name: status,
      value: monthFilteredData.filter(c => c.status === status).length
    }));
    return counts.filter(c => c.value > 0);
  }, [monthFilteredData]);

  // --- BAR CHART (VAQT KESIMIDA TREND) ---
  const areaData = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...monthFilteredData].sort((a, b) => {
      const tA = new Date(a.date).getTime() || 0;
      const tB = new Date(b.date).getTime() || 0;
      return tA - tB;
    });

    if (sorted.length === 0) return [];

    sorted.forEach(c => {
      try {
        const d = safeParseDate(c.date);
        if (!d) return;
        const keyStr = selectedMonth 
          ? format(d, 'dd MMM') 
          : format(d, 'MMM, yyyy'); 
        map.set(keyStr, (map.get(keyStr) || 0) + 1);
      } catch {}
    });

    return Array.from(map.entries()).map(([name, count]) => ({
      name,
      count
    }));
  }, [monthFilteredData, selectedMonth]);

  // EXCEL & PDF EKSPORT (REAL KO'RSATKICHLAR BILAN)
  const handleExportStatistics = (type: 'excel' | 'pdf') => {
    const fileName = `Toyona_Statistika_${new Date().toISOString().slice(0, 10)}`;
    const totalFiltered = monthFilteredData.length;

    if (type === 'excel') {
      const summaryRows = [
        { 'Ko\'rsatkich': 'Jami Tizim Foydalanuvchilari', 'Miqdor / Qiymat': `${firebaseStats.totalUsers} ta` },
        { 'Ko\'rsatkich': 'Jami Filiallar', 'Miqdor / Qiymat': `${firebaseStats.totalBranches} ta` },
        { 'Ko\'rsatkich': 'Jami Xodimlar', 'Miqdor / Qiymat': `${firebaseStats.totalEmployees} ta` },
        { 'Ko\'rsatkich': 'Jami Vakansiyalar', 'Miqdor / Qiymat': `${firebaseStats.totalVacancies} ta` },
        { 'Ko\'rsatkich': 'Bugungi Davomat Ko\'rsatkichi', 'Miqdor / Qiymat': `${firebaseStats.attendanceRateToday}%` },
        { 'Ko\'rsatkich': 'Jami Nomzodlar (Bazadagi)', 'Miqdor / Qiymat': `${candidates.length} ta` },
        { 'Ko\'rsatkich': 'Filtrlangan Nomzodlar', 'Miqdor / Qiymat': `${totalFiltered} ta` },
        { 'Ko\'rsatkich': 'Jami O\'tkazmalar', 'Miqdor / Qiymat': `${transfers.length} ta` }
      ];

      pieData.forEach(s => {
        const pct = totalFiltered > 0 ? Math.round((s.value / totalFiltered) * 100) : 0;
        summaryRows.push({
          'Ko\'rsatkich': `Nomzodlar holati: ${s.name}`,
          'Miqdor / Qiymat': `${s.value} ta (${pct}%)`
        });
      });

      exportToExcel(summaryRows, fileName);
    } else {
      const headers = ['№', 'Ko\'rsatkich / Holat', 'Miqdor / Foiz'];
      const data: (string | number)[][] = [
        [1, 'Jami Tizim Foydalanuvchilari', `${firebaseStats.totalUsers} ta`],
        [2, 'Jami Filiallar', `${firebaseStats.totalBranches} ta`],
        [3, 'Jami Xodimlar', `${firebaseStats.totalEmployees} ta`],
        [4, 'Jami Vakansiyalar', `${firebaseStats.totalVacancies} ta`],
        [5, 'Bugungi Davomat Ko\'rsatkichi', `${firebaseStats.attendanceRateToday}%`],
        [6, 'Jami Nomzodlar soni', `${candidates.length} ta`],
        [7, 'Filtrlangan Nomzodlar soni', `${totalFiltered} ta`],
        [8, 'Jami O\'tkazmalar soni', `${transfers.length} ta`]
      ];

      pieData.forEach(s => {
        const pct = totalFiltered > 0 ? Math.round((s.value / totalFiltered) * 100) : 0;
        data.push([
          data.length + 1,
          `Holat: ${s.name}`,
          `${s.value} ta (${pct}%)`
        ]);
      });

      exportToPDF(headers, data, fileName, "Toyona Savdo - HR Tahlil va Statistika Hisoboti");
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <ModuleHeaderLogo title="Tahlil va Statistika" icon={LucidePieChart} />
        
        <div className="flex items-center gap-2">
          <ExportButtons 
            onExportExcel={() => handleExportStatistics('excel')}
            onExportPDF={() => handleExportStatistics('pdf')}
          />

          <button
            onClick={loadFirebaseStats}
            disabled={isRefreshingStats}
            title="Real ma'lumotlarni yangilash"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingStats ? 'animate-spin text-[#00A651]' : ''}`} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* REAL-TIME KARTALAR (FIREBASE ASOSIDA) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Foydalanuvchilar</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">{firebaseStats.totalUsers} ta</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Filiallar</span>
            <Building className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">{firebaseStats.totalBranches} ta</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Xodimlar</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">{firebaseStats.totalEmployees} ta</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Vakansiyalar</span>
            <Briefcase className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">{firebaseStats.totalVacancies} ta</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Bugungi Davomat</span>
            <ShieldCheck className="w-4 h-4 text-[#00A651]" />
          </div>
          <div className="text-2xl font-black text-[#00A651]">{firebaseStats.attendanceRateToday}%</div>
        </div>
      </div>

      {/* ANALITIKA FILTRLARI */}
      <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800">Analitika Filtrlari</h3>
          <p className="text-xs text-slate-500 mt-0.5">Real vaqt rejimida arizalar va ko'rsatkichlarni saralash</p>
        </div>

        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          {/* DINAMIK LAVOZIM / ROL MENYUSI */}
          <div className="flex flex-col gap-1.5 relative" ref={roleDropdownRef}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Lavozim / Vakansiya</label>
            <button
              onClick={() => setIsRoleOpen(!isRoleOpen)}
              className="flex items-center justify-between w-full sm:w-56 h-[42px] px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-medium text-slate-700 transition-all shadow-xs"
            >
              <span className="truncate pr-2">{selectedRole}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isRoleOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {isRoleOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-[100%] mt-2 left-0 w-full sm:w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 max-h-60 overflow-y-auto"
                >
                  <button
                    onClick={() => { setSelectedRole('Barchasi'); setIsRoleOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedRole === 'Barchasi' ? 'bg-green-50 text-[#00A651]' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    Barchasi ({candidates.length})
                  </button>
                  {availableRoles.map(r => {
                    const count = candidates.filter(c => c.role === r).length;
                    return (
                      <button
                        key={r}
                        onClick={() => { setSelectedRole(r); setIsRoleOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors mt-0.5 flex items-center justify-between ${selectedRole === r ? 'bg-green-50 text-[#00A651]' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <span className="truncate pr-2">{r}</span>
                        {count > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SANA TANLASH */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Boshlanish</label>
              <div className="relative flex items-center group">
                <Calendar className={`w-4 h-4 absolute left-3.5 pointer-events-none z-10 transition-colors ${startDate ? 'text-[#00A651]' : 'text-slate-400 group-hover:text-slate-500'}`} />
                <input 
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className={`w-full sm:w-36 h-[42px] pl-10 pr-3 bg-white hover:bg-slate-50 border rounded-xl text-sm font-medium transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] ${startDate ? 'border-green-300 text-slate-800' : 'border-slate-200 text-slate-500'}`}
                />
                {startDate && (
                   <button onClick={() => setStartDate('')} className="absolute right-2 text-slate-400 hover:text-red-500 z-10 bg-slate-50 rounded-full p-1 transition-colors">
                     <X className="w-3.5 h-3.5" />
                   </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Tugash</label>
              <div className="relative flex items-center group">
                <Calendar className={`w-4 h-4 absolute left-3.5 pointer-events-none z-10 transition-colors ${endDate ? 'text-[#00A651]' : 'text-slate-400 group-hover:text-slate-500'}`} />
                <input 
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className={`w-full sm:w-36 h-[42px] pl-10 pr-3 bg-white hover:bg-slate-50 border rounded-xl text-sm font-medium transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] ${endDate ? 'border-green-300 text-slate-800' : 'border-slate-200 text-slate-500'}`}
                />
                {endDate && (
                   <button onClick={() => setEndDate('')} className="absolute right-2 text-slate-400 hover:text-red-500 z-10 bg-slate-50 rounded-full p-1 transition-colors">
                     <X className="w-3.5 h-3.5" />
                   </button>
                )}
              </div>
            </div>
          </div>

          {(startDate || endDate || selectedRole !== 'Barchasi') && (
             <button 
               onClick={() => { setStartDate(''); setEndDate(''); setSelectedRole('Barchasi'); }}
               className="h-[42px] px-4 flex items-center justify-center text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
             >
               Tozalash
             </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* USTUNLI DIAGRAMMA (BAR CHART) - Real nomzodlar oqimi */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Nomzodlar oqimi {selectedMonth ? `(${selectedMonth})` : "(Vaqt bo'yicha)"}
              </h3>
              <p className="text-xs text-slate-500">Ariza berilgan sanalar bo'yicha dinamik tahlil</p>
            </div>
            <AnimatePresence>
              {selectedMonth && (
                <motion.button 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={() => setSelectedMonth(null)}
                  className="text-sm font-medium flex items-center gap-1.5 text-slate-500 hover:text-[#00A651] transition-colors bg-slate-50 hover:bg-green-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-green-200 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Barcha oylar
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 w-full min-h-[300px] overflow-hidden relative">
            {areaData.length > 0 ? (
              <div className="absolute inset-0 overflow-x-auto overflow-y-hidden pb-2" style={{ scrollbarWidth: 'thin' }}>
                <div style={{ minWidth: selectedMonth ? `${Math.max(areaData.length * 60, 400)}px` : '100%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar 
                        dataKey="count" 
                        name="Nomzodlar soni"
                        fill="#00A651"
                        radius={[6, 6, 0, 0]}
                        barSize={selectedMonth ? 30 : 40}
                        onClick={(data) => {
                          if (!selectedMonth && data && data.name) {
                            setSelectedMonth(data.name);
                          }
                        }}
                        style={{ cursor: !selectedMonth ? 'pointer' : 'default' }}
                      >
                        {areaData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            className={!selectedMonth ? "hover:fill-[#008d44] transition-colors" : ""} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-6 text-center">
                <FileText className="w-10 h-10 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Hozircha ariza tushgan nomzodlar mavjud emas</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Yangi arizalar qabul qilinganda oylar va kunlar kesimidagi grafiklar avtomatik aks etadi.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* DUMALOQ DIAGRAMMA (PIE CHART) - Holatlar bo'yicha taqsimot */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col">
          <div 
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors rounded-t-2xl"
            onClick={() => setShowStatusDistribution(!showStatusDistribution)}
          >
            <div>
              <h3 className="text-lg font-bold text-slate-800">Holatlar taqsimoti</h3>
              <p className="text-xs text-slate-500">Nomzodlarning saralash bosqichlari</p>
            </div>
            <button className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              {showStatusDistribution ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
          
          <AnimatePresence>
            {showStatusDistribution && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-5 pt-0 flex-1 w-full min-h-[350px] flex items-center justify-center relative">
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="45%"
                            innerRadius={65}
                            outerRadius={100}
                            paddingAngle={3}
                            cornerRadius={4}
                            dataKey="value"
                            stroke="#ffffff"
                            strokeWidth={3}
                            isAnimationActive={false}
                          >
                            {pieData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={STATUS_COLORS[STATUSES.indexOf(entry.name) % STATUS_COLORS.length]} 
                                onClick={() => setSelectedStatus(entry.name)}
                                style={{ cursor: 'pointer' }}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend 
                            layout="horizontal" 
                            verticalAlign="bottom" 
                            align="center"
                            wrapperStyle={{ fontSize: '11px', paddingTop: '10px', cursor: 'pointer' }}
                            onClick={(e) => {
                              if (e && e.value) setSelectedStatus(String(e.value));
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div 
                        className="absolute pointer-events-none flex items-center justify-center"
                        style={{ top: '40%', left: '50%', transform: 'translate(-50%, -50%)', marginTop: '-5px' }}
                      >
                        <button
                          onClick={() => setSelectedStatus('Barchasi')}
                          className="w-[80px] h-[80px] rounded-full pointer-events-auto flex flex-col items-center justify-center text-[#00A651] hover:text-[#008d44] transition-colors gap-1 cursor-pointer"
                        >
                          <span className="text-3xl font-black text-slate-800 leading-none">{monthFilteredData.length}</span>
                          <span className="text-[11px] font-bold uppercase tracking-wider leading-none">Jami</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-6 text-center">
                      <LucidePieChart className="w-10 h-10 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">Nomzodlar ma'lumotlari mavjud emas</p>
                      <p className="text-xs text-slate-400">
                        Ariza topshirilganda statuslar bo'yicha doira diagrammasi hosil bo'ladi.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* O'TKAZMALAR (TRANSFERS) GRAFIKASI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">O'tkazmalar turi va holati</h3>
              <p className="text-xs text-slate-500">Filiallar va lavozimlar bo'yicha xodimlar o'tkazmalari</p>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Real o'tkazmalar
            </span>
          </div>

          <div className="w-full h-[280px] min-h-[280px] relative flex items-center justify-center">
            {dynamicTransferPieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={dynamicTransferPieData}
                      cx="50%" 
                      cy="45%" 
                      innerRadius={65} 
                      outerRadius={100} 
                      paddingAngle={4} 
                      cornerRadius={4} 
                      dataKey="value" 
                      stroke="#ffffff" 
                      strokeWidth={3}
                      isAnimationActive={false}
                    >
                      {dynamicTransferPieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={TRANSFER_STATUS_COLORS[entry.name as keyof typeof TRANSFER_STATUS_COLORS] || (index === 0 ? '#2563eb' : '#ea580c')} 
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }} cursor={false} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute pointer-events-none flex flex-col items-center" style={{ top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                   <span className="text-3xl font-black text-slate-800 leading-none">
                     {transfers.length}
                   </span>
                   <span className="text-xs font-bold text-slate-500 uppercase mt-1 tracking-wider">Jami o'tkazma</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 text-center p-6">
                <CheckCircle2 className="w-10 h-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">Hozircha o'tkazmalar mavjud emas ({transfers.length} ta)</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Xodimlar lavozimi yoki filiali o'zgartirilganda o'tkazmalar grafigi real shakllanadi.
                </p>
              </div>
            )}
          </div>

          <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs mt-1">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
              <div className="flex items-center gap-1.5 text-blue-800 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]"></span>
                <span>Lavozim o'zgarishi:</span>
              </div>
              <span className="font-black text-blue-900">
                {transfers.filter(t => t.type === 'position' || (t.qaysiLavozimdan && t.qaysiLavozimga && t.qaysiLavozimdan !== t.qaysiLavozimga)).length} ta
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-50/60 border border-orange-100">
              <div className="flex items-center gap-1.5 text-orange-800 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]"></span>
                <span>Filial o'zgarishi:</span>
              </div>
              <span className="font-black text-orange-900">
                {transfers.filter(t => t.type === 'branch' || (t.qaysiFilialdan && t.qaysiFilialga && t.qaysiFilialdan !== t.qaysiFilialga)).length} ta
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP / MODAL OYNA */}
      <AnimatePresence>
        {selectedStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => {
                setSelectedStatus(null);
                setSelectedCandidate(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-slate-50 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="bg-white border-b border-slate-100 p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      if (selectedCandidate) {
                        setSelectedCandidate(null);
                      } else {
                        setSelectedStatus(null);
                      }
                    }}
                    className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {selectedCandidate ? selectedCandidate.name : selectedStatus}
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {selectedCandidate ? selectedCandidate.role : "Ushbu bosqichdagi barcha nomzodlar"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedStatus(null);
                    setSelectedCandidate(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto">
                {selectedCandidate ? (
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-[2] bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col items-center">
                      <div className="w-28 h-28 rounded-full overflow-hidden mb-4 border-4 border-slate-50 shadow-sm">
                        <img src={selectedCandidate.avatar} alt={selectedCandidate.name} className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800">{selectedCandidate.name}</h2>
                      <p className="text-[#00A651] font-semibold mt-1 mb-6">{selectedCandidate.role}</p>
                      
                      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2.5 text-slate-500 font-medium"><Phone className="w-4 h-4"/> Telefon</div>
                          <div className="font-semibold text-slate-800 truncate pl-4 text-xs font-mono">{selectedCandidate.phone}</div>
                        </div>
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2.5 text-slate-500 font-medium"><Mail className="w-4 h-4"/> Email</div>
                          <div className="font-semibold text-slate-800 truncate pl-4 text-xs">{selectedCandidate.email}</div>
                        </div>
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2.5 text-slate-500 font-medium"><MapPin className="w-4 h-4"/> Manzil / Filial</div>
                          <div className="font-semibold text-slate-800 text-right text-xs">{selectedCandidate.location}</div>
                        </div>
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2.5 text-slate-500 font-medium"><GraduationCap className="w-4 h-4"/> Ma'lumoti</div>
                          <div className="font-semibold text-slate-800 text-xs">{selectedCandidate.education}</div>
                        </div>
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2.5 text-slate-500 font-medium"><Briefcase className="w-4 h-4"/> Tajribasi</div>
                          <div className="font-semibold text-slate-800 text-xs">{selectedCandidate.experience}</div>
                        </div>
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2.5 text-slate-500 font-medium"><Wallet className="w-4 h-4"/> Maosh</div>
                          <div className="font-semibold text-slate-800 text-xs">{selectedCandidate.expectedSalary}</div>
                        </div>
                      </div>

                      <div className="w-full flex flex-col gap-3 mt-3">
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2.5 text-slate-500 font-medium"><Calendar className="w-4 h-4"/> Ariza sanasi</div>
                          <div className="font-semibold text-slate-800 text-xs">
                            {(() => {
                              try {
                                return format(parseISO(selectedCandidate.date), 'dd.MM.yyyy');
                              } catch {
                                return String(selectedCandidate.date).slice(0, 10);
                              }
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="w-full mt-6">
                        <div className="flex items-center gap-2 mb-3 text-slate-700 font-bold text-sm">
                          <Code className="w-4 h-4 text-[#00A651]" />
                          Ko'nikma va ma'lumotlar
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedCandidate.skills.map(skill => (
                            <span key={skill} className="px-3 py-1 bg-green-50 text-[#00A651] font-semibold rounded-lg text-xs border border-green-100">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex-[1] bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col">
                      <h3 className="font-bold text-slate-800 mb-3 text-sm">Arizachi holati</h3>
                      <div 
                        className="p-3 rounded-xl font-bold text-center border mb-6 text-xs"
                        style={{
                          backgroundColor: `${STATUS_COLORS[STATUSES.indexOf(selectedCandidate.status) % STATUS_COLORS.length]}15`,
                          color: STATUS_COLORS[STATUSES.indexOf(selectedCandidate.status) % STATUS_COLORS.length],
                          borderColor: `${STATUS_COLORS[STATUSES.indexOf(selectedCandidate.status) % STATUS_COLORS.length]}30`,
                        }}
                      >
                        {selectedCandidate.status}
                      </div>
                      
                      <h3 className="font-bold text-slate-800 mb-3 text-sm">Tezkor harakatlar</h3>
                      <a 
                        href={`tel:${selectedCandidate.phone.replace(/[^0-9+]/g, '')}`}
                        className="w-full py-2.5 bg-[#00A651] hover:bg-[#008d44] text-white rounded-xl font-bold text-xs transition-colors mb-2 text-center flex items-center justify-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        Qo'ng'iroq qilish
                      </a>
                      <a 
                        href={`mailto:${selectedCandidate.email}`}
                        className="w-full py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold text-xs transition-colors mb-2 text-center flex items-center justify-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Xabar yuborish
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                            <th className="py-2.5 px-3 w-10 text-center">№</th>
                            <th className="py-2.5 px-3">Nomzod (F.I.O)</th>
                            <th className="py-2.5 px-3">Lavozim</th>
                            <th className="py-2.5 px-3">Telefon</th>
                            <th className="py-2.5 px-3">Holati</th>
                            <th className="py-2.5 px-3 text-right">Amal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {monthFilteredData
                            .filter((c) => selectedStatus === 'Barchasi' ? true : c.status === selectedStatus)
                            .map((candidate, cIdx) => (
                              <tr 
                                key={`${candidate.id || cIdx}-${cIdx}`}
                                onClick={() => setSelectedCandidate(candidate)}
                                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                              >
                                <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                                  #{cIdx + 1}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <img 
                                      src={candidate.avatar} 
                                      alt={candidate.name} 
                                      className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                    />
                                    <span className="font-bold text-slate-900 group-hover:text-[#00A651] transition-colors">
                                      {candidate.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                  {candidate.role}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">
                                  {candidate.phone}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {candidate.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCandidate(candidate);
                                    }}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-[#00A651]/10 text-slate-700 hover:text-[#00A651] font-bold rounded-lg text-xs transition-colors cursor-pointer"
                                  >
                                    Ko'rish
                                  </button>
                                </td>
                              </tr>
                            ))}
                          {monthFilteredData.filter((c) => selectedStatus === 'Barchasi' ? true : c.status === selectedStatus).length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                                Ushbu holatda nomzodlar arizalari mavjud emas.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}