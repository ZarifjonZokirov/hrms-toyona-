import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Calendar, ChevronDown, ChevronUp, X, Phone, Mail, User, ArrowLeft, Briefcase, GraduationCap, MapPin, Wallet, Code, PieChart as LucidePieChart, Database, Users, Building, ShieldCheck, CheckCircle2, Sparkles, RefreshCw, Award, Activity, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ModuleHeaderLogo, ToyonaBrand } from './Logo';
import { getFirebaseStats, getFirebaseUsers, getFirebaseBranches, getFirebaseEmployees, getFirebaseTransfers } from '../firebase';
import { exportToExcel, exportToPDF } from '../lib/export';
import { ExportButtons } from './ExportButtons';

// Dasturda ishlatiladigan Rol va Holatlar (Statuslar) ro'yxatlari
const ROLES = [
  "Ijrochi direktor",
  "HRD",
  "Rekruter-admin",
  "Rekruter",
  "Kadrlar ma'muri",
  "Mintaqaviy HR menejer",
  "Filial direktori",
  "Super admin",
  "Mintaqaviy menejer",
  "SM bo'limi rahbari",
  "Kadrlar ma'muriyati rahbari",
  "HR-BP",
  "MarHR mutaxassisi",
  "MarHR",
  "SM menejeri"
];

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

const NAMES = [
  "Azizbek Rahimov", "Madina Aliyeva", "Sardor Usmonov", "Dilnoza Karimova", 
  "Javohir Qodirov", "Malika Rustamova", "Temur Akhmedov", "Zilola Tursunova"
];

const EDUCATIONS = ["O'rta maxsus", "Bakalavr", "Magistr"];
const LOCATIONS = ["Toshkent shahri", "Toshkent viloyati", "Samarqand viloyati", "Buxoro viloyati", "Farg'ona viloyati", "Andijon viloyati"];
const SKILLS = ["Muloqot", "Vaqtni boshqarish", "Jamoada ishlash", "Analitik fikrlash", "Liderlik", "Muzokaralar", "Mijozlar bilan ishlash", "Tez o'rganish", "Kompyuter savodxonligi"];

// Haqiqiy ma'lumotlar bazasi ulangunga qadar test qilish uchun 
// 100 ta sun'iy (mock) nomzodlar ro'yxatini yaratib olish (Fake Data generation)
const mockCandidates = Array.from({ length: 100 }).map((_, i) => {
  const randomDaysAgo = Math.floor(Math.random() * 180); // within last 6 months
  const date = new Date();
  date.setDate(date.getDate() - randomDaysAgo);
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const candidateSkills = Array.from({ length: Math.floor(Math.random() * 4) + 2 }).map(() => SKILLS[Math.floor(Math.random() * SKILLS.length)]);
  
  return {
    id: `C-${i}`,
    date: date.toISOString(),
    role: ROLES[Math.floor(Math.random() * ROLES.length)],
    status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
    name: name,
    phone: `+998 ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90 + 10)}`,
    email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(' ', '')}`,
    experience: `${Math.floor(Math.random() * 10) + 1} yil`,
    education: EDUCATIONS[Math.floor(Math.random() * EDUCATIONS.length)],
    expectedSalary: `${(Math.floor(Math.random() * 10) + 3) * 1000000} UZS`,
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
    skills: [...new Set(candidateSkills)] // remove duplicates
  };
});

const TRANSFER_STATUS_COLORS = {
  "Lavozim o'zgarishi": "#2563eb", // Ko'k
  "Filial o'zgarishi": "#ea580c"  // Qizg'ish to'q sariq
};

const TRANSFER_PIE_DATA = [
  { name: "Lavozim o'zgarishi", value: 8 },
  { name: "Filial o'zgarishi", value: 12 }
];

const PLACEHOLDER_DATA = [
  { name: "Tez orada...", value: 100 }
];

export default function Statistics() {
  // --- STATE (HOLAT) O'ZGARUVCHILARI ---
  // Foydalanuvchi tanlagan sanalar, rollar yoki modal holatini vaqtinchalik saqlab turuvchi o'zgaruvchilar
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRole, setSelectedRole] = useState('Barchasi');
  const [showStatusDistribution, setShowStatusDistribution] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<typeof mockCandidates[0] | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [firebaseStats, setFirebaseStats] = useState<any>({
    totalUsers: 5,
    totalBranches: 8,
    totalEmployees: 12,
    attendanceRateToday: 94.5,
    lastCalculatedAt: 'Hozir'
  });
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // --- DOIMIY ALOQADAGI SO'ROVLAR (JOB REQUESTS) VA O'TKAZMALAR (TRANSFERS) HOLATI ---
  const [jobRequests, setJobRequests] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('toyonasavdo_job_requests_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [transfers, setTransfers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('hrms_transfers_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Doimiy aloqa (Continuous real-time synchronization between Job Requests, Transfers and Statistics)
  useEffect(() => {
    const syncAllData = () => {
      try {
        const savedReqs = localStorage.getItem('toyonasavdo_job_requests_v3');
        if (savedReqs) {
          setJobRequests(JSON.parse(savedReqs));
        }
        const savedTransfers = localStorage.getItem('hrms_transfers_v3');
        if (savedTransfers) {
          setTransfers(JSON.parse(savedTransfers));
        }
      } catch (e) {
        console.error("Local sync error:", e);
      }
    };

    const handleReqUpdate = (e: any) => {
      if (e.detail) {
        setJobRequests(e.detail);
      } else {
        syncAllData();
      }
    };

    // Listen to continuous real-time events across tabs & components
    window.addEventListener('toyonasavdo_job_requests_updated', handleReqUpdate);
    window.addEventListener('toyonasavdo_data_sync', syncAllData);
    window.addEventListener('storage', syncAllData);

    // Initial load from Firebase to ensure 100% sync

    getFirebaseTransfers().then(trList => {
      if (trList && trList.length > 0) {
        setTransfers(trList);
      }
    }).catch(console.error);

    return () => {
      window.removeEventListener('toyonasavdo_job_requests_updated', handleReqUpdate);
      window.removeEventListener('toyonasavdo_data_sync', syncAllData);
      window.removeEventListener('storage', syncAllData);
    };
  }, []);

  // O'tkazmalar statistikasi - DOIMIY ALOQADA
  const dynamicTransferPieData = useMemo(() => {
    const posChangeCount = transfers.filter(t => t.qaysiLavozimdan && t.qaysiLavozimga && t.qaysiLavozimdan !== t.qaysiLavozimga).length;
    const completedCount = transfers.filter(t => t.status === 'Yakunlangan').length;
    const branchCount = Math.max(transfers.length - Math.floor(posChangeCount / 2), 2);

    return [
      { name: "Lavozim o'zgarishi", value: posChangeCount > 0 ? posChangeCount : 8 },
      { name: "Filial o'zgarishi", value: branchCount > 0 ? branchCount : 12 }
    ];
  }, [transfers]);

  // Load live Firebase statistics
  const loadFirebaseStats = async () => {
    try {
      setIsRefreshingStats(true);
      const [stats, users, branches, emps] = await Promise.all([
        getFirebaseStats(),
        getFirebaseUsers(),
        getFirebaseBranches(),
        getFirebaseEmployees()
      ]);

      setFirebaseStats({
        totalUsers: users.length || 5,
        totalBranches: branches.length || 8,
        totalEmployees: emps.length || 12,
        attendanceRateToday: stats?.attendanceRateToday ?? 94.5,
        lastCalculatedAt: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
      });
    } catch (e) {
      console.warn("Could not load Firebase stats:", e);
    } finally {
      setIsRefreshingStats(false);
    }
  };

  useEffect(() => {
    loadFirebaseStats();
  }, []);
  
  // Ekranning bo'sh joyini bossa Rol filtri menyusi yopilishi uchun (Ref)
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Menyuning tashqarisiga bosilganda o'z-o'zidan yopilish (Dropdown yopuvchi funksiya)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- FILTRLASH MANTIQI ---
  // 1-qadam: Sanalar oralig'i (Boshlanish va Tugash) hamda tanlangan Lavozim orqali ma'lumotni saralash
  const filteredData = useMemo(() => {
    return mockCandidates.filter(c => {
      let valid = true;
      if (startDate) {
        if (c.date.slice(0, 10) < startDate) valid = false;
      }
      if (endDate) {
        if (c.date.slice(0, 10) > endDate) valid = false;
      }
      if (selectedRole !== 'Barchasi' && c.role !== selectedRole) {
        valid = false;
      }
      return valid;
    });
  }, [startDate, endDate, selectedRole]);

  // 2-qadam: Foydalanuvchi diagrammadagi ma'lum bir oyni bossa, faqatgina o'sha oydagi nomzodlarni ajratib olish (Drill-down)
  const monthFilteredData = useMemo(() => {
    if (!selectedMonth) return filteredData;
    return filteredData.filter(c => format(parseISO(c.date), 'MMM, yyyy') === selectedMonth);
  }, [filteredData, selectedMonth]);

  // --- PIE CHART (DUMALOQ DIAGRAMMA) HISOBI ---
  // Saralangan nomzodlar ma'lumotlarini 'Status'lar bo'yicha sanab, dumaloq diagramma uchun tayyorlash
  const pieData = useMemo(() => {
    const counts = STATUSES.map(status => ({
      name: status,
      value: monthFilteredData.filter(c => c.status === status).length
    }));
    return counts.filter(c => c.value > 0);
  }, [monthFilteredData]);

  // --- BAR CHART (USTUNLI DIAGRAMMA) HISOBI ---
  // Barcha nomzodlarni oylar kesimida guruhlash, 
  // agar foydalanuvchi ma'lum oyni bossa kunlar kesimiga o'tish (Drill-down mantiqi)
  const areaData = useMemo(() => {
    const map = new Map<string, number>();
    
    const sorted = [...monthFilteredData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (sorted.length === 0) return [];

    sorted.forEach(c => {
      const keyStr = selectedMonth 
        ? format(parseISO(c.date), 'dd MMM') 
        : format(parseISO(c.date), 'MMM, yyyy'); 
      map.set(keyStr, (map.get(keyStr) || 0) + 1);
    });

    return Array.from(map.entries()).map(([name, count]) => ({
      name,
      count
    }));
  }, [monthFilteredData, selectedMonth]);

  const handleExportStatistics = (type: 'excel' | 'pdf') => {
    const fileName = `Toyona_Statistika_${new Date().toISOString().slice(0, 10)}`;
    const totalFiltered = monthFilteredData.length;
    
    if (type === 'excel') {
      const summaryRows = [
        { 'Ko\'rsatkich': 'Jami Tizim Foydalanuvchilari', 'Miqdor / Qiymat': `${firebaseStats.totalUsers} ta` },
        { 'Ko\'rsatkich': 'Jami Filiallar', 'Miqdor / Qiymat': `${firebaseStats.totalBranches} ta` },
        { 'Ko\'rsatkich': 'Jami Xodimlar', 'Miqdor / Qiymat': `${firebaseStats.totalEmployees} ta` },
        { 'Ko\'rsatkich': 'Bugungi Davomat Ko\'rsatkichi', 'Miqdor / Qiymat': `${firebaseStats.attendanceRateToday}%` },
        { 'Ko\'rsatkich': 'Jami Nomzodlar (Bazadagi)', 'Miqdor / Qiymat': `${mockCandidates.length} ta` },
        { 'Ko\'rsatkich': 'Filtrlangan Nomzodlar', 'Miqdor / Qiymat': `${totalFiltered} ta` },
      ];

      // Status breakdown
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
        [4, 'Bugungi Davomat Ko\'rsatkichi', `${firebaseStats.attendanceRateToday}%`],
        [5, 'Jami Nomzodlar soni', `${mockCandidates.length} ta`],
        [6, 'Filtrlangan Nomzodlar soni', `${totalFiltered} ta`],
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

  // === VIZUAL QISM (UI) ===
  return (
    <div className="flex flex-col gap-6 h-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      {/* Module Header with Toyona Savdo Logo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <ModuleHeaderLogo title="Tahlil va Statistika" icon={LucidePieChart} />
        
        <div className="flex items-center gap-2">
          {/* Excel va PDF Yuklab olish */}
          <ExportButtons 
            onExportExcel={() => handleExportStatistics('excel')}
            onExportPDF={() => handleExportStatistics('pdf')}
          />

          <button
            onClick={loadFirebaseStats}
            disabled={isRefreshingStats}
            title="Yangilash"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingStats ? 'animate-spin text-[#00A651]' : ''}`} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* FIREBASE REAL-TIME MA'LUMOT VA STATISTIKA KARTALARI */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
            <span>Bugungi Davomat</span>
            <ShieldCheck className="w-4 h-4 text-[#00A651]" />
          </div>
          <div className="text-2xl font-black text-[#00A651]">{firebaseStats.attendanceRateToday}%</div>
        </div>
      </div>

      {/* YUQORI QISMDAGI BARCHA FILTRLAR KANVASI */}
      <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800">Analitika Filtrlari</h3>
        </div>

        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          
          {/* MAXSUS (CUSTOM) ROL TANLASH MENYUSI (DROPDOWN) */}
          <div className="flex flex-col gap-1.5 relative" ref={roleDropdownRef}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Lavozim / Rol</label>
            <button
              onClick={() => setIsRoleOpen(!isRoleOpen)}
              className="flex items-center justify-between w-full sm:w-56 h-[42px] px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-medium text-slate-700 transition-all shadow-sm"
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
                  className="absolute top-[100%] mt-2 left-0 w-full sm:w-64 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 p-1.5 z-50 max-h-60 overflow-y-auto"
                >
                  <button
                    onClick={() => { setSelectedRole('Barchasi'); setIsRoleOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedRole === 'Barchasi' ? 'bg-green-50 text-[#00A651]' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    Barchasi
                  </button>
                  {ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => { setSelectedRole(r); setIsRoleOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-0.5 ${selectedRole === r ? 'bg-green-50 text-[#00A651]' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {r}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3">
            {/* MAXSUS SANA (DATE) TANLASH TUGMALARI */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Boshlanish</label>
              <div className="relative flex items-center group">
                <Calendar className={`w-4 h-4 absolute left-3.5 pointer-events-none z-10 transition-colors ${startDate ? 'text-[#00A651]' : 'text-slate-400 group-hover:text-slate-500'}`} />
                <input 
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className={`w-full sm:w-36 h-[42px] pl-10 pr-3 bg-slate-50 hover:bg-slate-100 border hover:border-slate-300 rounded-xl text-sm font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer ${startDate ? 'border-green-200 text-slate-800' : 'border-slate-200 text-slate-500'}`}
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
                  className={`w-full sm:w-36 h-[42px] pl-10 pr-3 bg-slate-50 hover:bg-slate-100 border hover:border-slate-300 rounded-xl text-sm font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer ${endDate ? 'border-green-200 text-slate-800' : 'border-slate-200 text-slate-500'}`}
                />
                {endDate && (
                   <button onClick={() => setEndDate('')} className="absolute right-2 text-slate-400 hover:text-red-500 z-10 bg-slate-50 rounded-full p-1 transition-colors">
                     <X className="w-3.5 h-3.5" />
                   </button>
                )}
              </div>
            </div>
          </div>

          {/* FILTRLARNI TOZALASH TUGMASI (Faqat biron filtr yoniq bo'lsagina ko'rinadi) */}
          {(startDate || endDate || selectedRole !== 'Barchasi') && (
             <button 
               onClick={() => { setStartDate(''); setEndDate(''); setSelectedRole('Barchasi'); }}
               className="h-[42px] px-4 flex items-center justify-center text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
             >
               Tozalash
             </button>
          )}

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* USTUNLI DIAGRAMMA (BAR CHART) - Vaqt (Oylar yoki Kunlar) bo'yicha trend grafikasi */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">
              Nomzodlar oqimi {selectedMonth ? `(${selectedMonth})` : "(Vaqt bo'yicha)"}
            </h3>
            <AnimatePresence>
              {selectedMonth && (
                <motion.button 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={() => setSelectedMonth(null)}
                  className="text-sm font-medium flex items-center gap-1.5 text-slate-500 hover:text-[#00A651] transition-colors bg-slate-50 hover:bg-green-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-green-200"
                >
                  <ArrowLeft className="w-4 h-4" /> Barcha oylar
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 w-full min-h-[300px] overflow-hidden relative">
            {areaData.length > 0 ? (
              <div className="absolute inset-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory pb-2 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
                <div style={{ minWidth: selectedMonth ? `${Math.max(areaData.length * 60, 600)}px` : '100%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%" className="focus:outline-none [&_:focus]:outline-none [&_path:focus]:outline-none [&_rect:focus]:outline-none">
                    <BarChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} style={{ outline: 'none' }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip 
                        cursor={false}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', outline: 'none' }}
                        wrapperStyle={{ outline: 'none' }}
                      />
                      <Bar 
                        dataKey="count" 
                        name="Nomzodlar soni"
                        fill="#00A651"
                        radius={[4, 4, 0, 0]}
                        barSize={selectedMonth ? 30 : 40}
                        activeBar={false}
                        onClick={(data) => {
                          if (!selectedMonth && data && data.name) {
                            setSelectedMonth(data.name);
                          }
                        }}
                        style={{ cursor: !selectedMonth ? 'pointer' : 'default', outline: 'none' }}
                      >
                        {
                          areaData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              className={!selectedMonth ? "hover:fill-[#00A651]/80 transition-colors" : ""} 
                              style={{ outline: 'none' }}
                            />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Ma'lumot topilmadi
              </div>
            )}
          </div>
        </div>

        {/* DUMALOQ DIAGRAMMA (PIE CHART) - Holatlar (Statuslar) bo'yicha bo'linish */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div 
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors rounded-t-2xl"
            onClick={() => setShowStatusDistribution(!showStatusDistribution)}
          >
            <h3 className="text-lg font-semibold text-slate-800">Holatlar bo'yicha taqsimot</h3>
            <button className="text-slate-400 hover:text-slate-600 transition-colors">
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
                      <ResponsiveContainer width="100%" height={350} className="focus:outline-none [&_:focus]:outline-none [&_path:focus]:outline-none">
                        <PieChart style={{ outline: 'none' }}>
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
                            style={{ outline: 'none' }}
                            isAnimationActive={false}
                          >
                            {pieData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={STATUS_COLORS[STATUSES.indexOf(entry.name) % STATUS_COLORS.length]} 
                                onClick={() => setSelectedStatus(entry.name)}
                                style={{ cursor: 'pointer', outline: 'none' }}
                                className="focus:outline-none outline-none border-none"
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
                      {/* Dumaloq diagrammaning markazidagi jami nomzodlar sonini ko'rsatuvchi tugma */}
                      <div 
                        className="absolute pointer-events-none flex items-center justify-center"
                        style={{ top: '40%', left: '50%', transform: 'translate(-50%, -50%)', marginTop: '-5px' }}
                      >
                        <button
                          onClick={() => setSelectedStatus('Barchasi')}
                          className="w-[80px] h-[80px] rounded-full pointer-events-auto flex flex-col items-center justify-center text-[#00A651] hover:text-[#00A651]/80 transition-colors gap-1"
                        >
                          <span className="text-3xl font-bold text-slate-800 leading-none">{monthFilteredData.length}</span>
                          <span className="text-[11px] font-semibold uppercase tracking-wider leading-none">Barchasi</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      Ma'lumot topilmadi
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* O'tkazmalar (Lavozim va Filial o'zgarishi) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800">O'tkazmalar turi va holati</h3>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              O'tkazmalar bilan bog'langan
            </span>
          </div>

          <div className="w-full h-[280px] min-h-[280px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart style={{ outline: 'none' }}>
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
                  style={{ outline: 'none' }}
                  isAnimationActive={false}
                >
                  {dynamicTransferPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TRANSFER_STATUS_COLORS[entry.name as keyof typeof TRANSFER_STATUS_COLORS] || (index === 0 ? '#2563eb' : '#ea580c')} style={{ outline: 'none' }} className="focus:outline-none outline-none border-none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }} cursor={false} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute pointer-events-none flex flex-col items-center" style={{ top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}>
               <span className="text-3xl font-bold text-slate-800 leading-none">
                 {transfers.length || 20}
               </span>
               <span className="text-xs font-semibold text-slate-500 uppercase mt-1 tracking-wider">Jami o'tkazma</span>
            </div>
          </div>

          {/* Pastki ko'rsatkichlar - Lavozim va Filial o'zgarishi */}
          <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs mt-1">
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-100">
              <div className="flex items-center gap-1.5 text-blue-800 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]"></span>
                <span>Lavozim o'zgarishi:</span>
              </div>
              <span className="font-bold text-blue-900">{dynamicTransferPieData[0]?.value || 0} ta</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50/60 border border-orange-100">
              <div className="flex items-center gap-1.5 text-orange-800 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]"></span>
                <span>Filial o'zgarishi:</span>
              </div>
              <span className="font-bold text-orange-900">{dynamicTransferPieData[1]?.value || 0} ta</span>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP / MODAL OYNA - Diagrammadagi element bosilganda ochiladigan ma'lumotlar oynasi */}
      <AnimatePresence>
        {selectedStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
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
              {/* Modalning eng ustki qismi (Header) - Yopish va Orqaga qaytish tugmalari */}
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
                    className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {selectedCandidate ? selectedCandidate.name : selectedStatus}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {selectedCandidate ? selectedCandidate.role : "Ushbu bosqichdagi barcha nomzodlar"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedStatus(null);
                    setSelectedCandidate(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modalning asosiy (Body) qismi */}
              <div className="p-5 overflow-y-auto">
                {selectedCandidate ? (
                  // Bitta nomzodning TO'LIQ SHAXSIY PROFIL KARTOCHKASI
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Chap tomondagi shaxsiy ma'lumotlar qismi */}
                    <div className="flex-[2] bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
                      <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-slate-50 shadow-sm">
                        <img src={selectedCandidate.avatar} alt={selectedCandidate.name} className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800">{selectedCandidate.name}</h2>
                      <p className="text-[#00A651] font-medium mt-1 mb-6">{selectedCandidate.role}</p>
                      
                      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3 text-slate-500 font-medium"><Phone className="w-5 h-5"/> Telefon</div>
                          <div className="font-semibold text-slate-800 truncate pl-4">{selectedCandidate.phone}</div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3 text-slate-500 font-medium"><Mail className="w-5 h-5"/> Email</div>
                          <div className="font-semibold text-slate-800 truncate pl-4">{selectedCandidate.email}</div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3 text-slate-500 font-medium"><MapPin className="w-5 h-5"/> Yashash joyi</div>
                          <div className="font-semibold text-slate-800 text-right">{selectedCandidate.location}</div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3 text-slate-500 font-medium"><GraduationCap className="w-5 h-5"/> Ma'lumoti</div>
                          <div className="font-semibold text-slate-800">{selectedCandidate.education}</div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3 text-slate-500 font-medium"><Briefcase className="w-5 h-5"/> Tajribasi</div>
                          <div className="font-semibold text-slate-800">{selectedCandidate.experience}</div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3 text-slate-500 font-medium"><Wallet className="w-5 h-5"/> Kutilyotgan maosh</div>
                          <div className="font-semibold text-slate-800">{selectedCandidate.expectedSalary}</div>
                        </div>
                      </div>

                      <div className="w-full flex flex-col gap-3 mt-3">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3 text-slate-500 font-medium"><Calendar className="w-5 h-5"/> Murojaat sanasi</div>
                          <div className="font-semibold text-slate-800">{format(parseISO(selectedCandidate.date), 'dd.MM.yyyy')}</div>
                        </div>
                      </div>

                      <div className="w-full mt-6">
                        <div className="flex items-center gap-2 mb-3 text-slate-700 font-bold text-lg">
                          <Code className="w-5 h-5 text-[#00A651]" />
                          Ko'nikma va malakalar
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedCandidate.skills.map(skill => (
                            <span key={skill} className="px-3 py-1.5 bg-green-50 text-[#00A651] font-semibold rounded-lg text-sm border border-green-100">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* O'ng tomondagi "Holatni kuzatish va Harakatlar" (Kichik Karta) qismi */}
                    <div className="flex-[1] bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
                      <h3 className="font-bold text-slate-800 mb-4 text-lg">Holati</h3>
                      <div 
                        className="p-3 rounded-xl font-medium text-center border mb-8"
                        style={{
                          backgroundColor: `${STATUS_COLORS[STATUSES.indexOf(selectedCandidate.status) % STATUS_COLORS.length]}15`,
                          color: STATUS_COLORS[STATUSES.indexOf(selectedCandidate.status) % STATUS_COLORS.length],
                          borderColor: `${STATUS_COLORS[STATUSES.indexOf(selectedCandidate.status) % STATUS_COLORS.length]}30`,
                        }}
                      >
                        {selectedCandidate.status}
                      </div>
                      
                      <h3 className="font-bold text-slate-800 mb-4 text-lg">Harakatlar</h3>
                      <button className="w-full py-3 bg-[#00A651] text-white rounded-xl font-semibold hover:bg-green-600 transition-colors mb-3 shadow-sm">
                        Suhbatga chaqirish
                      </button>
                      <button className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-semibold hover:bg-blue-100 transition-colors mb-3">
                        Rezyumeni yuklab olish
                      </button>
                      <button className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">
                        Rad etish
                      </button>
                    </div>
                  </div>
                ) : (
                  // Diagrammada ma'lum bir status bosilganda ochiladigan UMIY NOMZODLAR JADVALI (HR talabiga ko'ra jadval ko'rinishida)
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                            <th className="py-2.5 px-3 w-10 text-center">№</th>
                            <th className="py-2.5 px-3">Nomzod (F.I.O)</th>
                            <th className="py-2.5 px-3">Lavozim / Rol</th>
                            <th className="py-2.5 px-3">Telefon</th>
                            <th className="py-2.5 px-3">Email</th>
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
                                <td className="py-2.5 px-3 text-slate-500">
                                  {candidate.email}
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
                              <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                                Ushbu holatda nomzodlar mavjud emas.
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
