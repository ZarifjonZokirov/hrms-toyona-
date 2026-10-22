import { exportToExcel } from '../lib/export';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, ArrowLeft, Search, Filter, Calendar, User, 
  Clock, Download, Trash2, Plus, CheckCircle2, AlertTriangle, 
  Shield, Activity, FileText, RefreshCw, Layers, Lock, 
  UserCheck, UserX, Briefcase, Building2, MapPin, Eye, Info, Loader2
} from 'lucide-react';

export interface HistoryLogItem {
  id: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  action: string;
  module: 'Xodimlar' | 'Nomzodlar' | 'Davomat' | 'Rotatsiya' | 'Vakansiyalar' | 'Foydalanuvchilar' | 'Filiallar' | 'Xavfsizlik';
  type: 'create' | 'update' | 'delete' | 'status_change' | 'login' | 'export';
  performedBy: string;
  role: string;
  details: string;
  ipAddress?: string;
  device?: string;
}

export const STORAGE_KEY_SYSTEM_HISTORY = 'toyonasavdo_system_history_v1';

// Initial realistic audit history entries
const SEED_HISTORY_DATA: HistoryLogItem[] = [
  {
    id: 'log-101',
    timestamp: '2026-09-18 17:15:22',
    action: "Davomat jurnali yangilandi",
    module: 'Davomat',
    type: 'update',
    performedBy: 'Zarifjon Zokirov',
    role: 'Super Admin',
    details: "Mingtut va Unduruv filiallari xodimlarining 18-sentyabr sanasi bo'yicha kirish/chiqish davomati tasdiqlandi",
    ipAddress: '192.168.1.45',
    device: 'Chrome / macOS (Toshkent)'
  },
  {
    id: 'log-102',
    timestamp: '2026-09-18 16:40:10',
    action: "Nomzod arizasi qabul qilindi",
    module: 'Nomzodlar',
    type: 'create',
    performedBy: 'Tizim (Telegram / Anketa)',
    role: 'Tizim Bot',
    details: "Yangi nomzod: Otabek Ergashev 'Kassir-operator' lavozimiga ariza topshirdi va bazaga qo'shildi",
    ipAddress: '84.54.120.18',
    device: 'Mobile Safari / iOS'
  },
  {
    id: 'log-103',
    timestamp: '2026-09-18 15:20:05',
    action: "Xodim rotatsiyasi tasdiqlandi",
    module: 'Rotatsiya',
    type: 'status_change',
    performedBy: 'Zarifjon Zokirov',
    role: 'Super Admin',
    details: "Xodim Jasur Xakimov 'Unduruv' filialidan 'Mingtut' filialiga vaqtincha biriktirildi",
    ipAddress: '192.168.1.45',
    device: 'Chrome / macOS (Toshkent)'
  },
  {
    id: 'log-104',
    timestamp: '2026-09-18 14:05:40',
    action: "Tizimga muvaffaqiyatli kirildi",
    module: 'Xavfsizlik',
    type: 'login',
    performedBy: 'Jamshid Rahmonov',
    role: 'Filial Admin',
    details: "Foydalanuvchi Mingtut filiali boshqaruv paneliga kirdi",
    ipAddress: '192.168.1.52',
    device: 'Firefox / Windows 11'
  },
  {
    id: 'log-105',
    timestamp: '2026-09-18 12:30:15',
    action: "Yangi xodim qo'shildi",
    module: 'Xodimlar',
    type: 'create',
    performedBy: 'Zarifjon Zokirov',
    role: 'Super Admin',
    details: "Xodim Shahzoda Umarova 'Bosh ofis' Marketing bo'limiga 'SMM mutaxassis' lavozimiga qabul qilindi",
    ipAddress: '192.168.1.45',
    device: 'Chrome / macOS (Toshkent)'
  },
  {
    id: 'log-106',
    timestamp: '2026-09-18 11:10:00',
    action: "Filial geozonasi sozlandi",
    module: 'Filiallar',
    type: 'update',
    performedBy: 'Zarifjon Zokirov',
    role: 'Super Admin',
    details: "'Turkiston' filiali davomat geozonasi radiusi 150 metrdan 200 metrga kengaytirildi",
    ipAddress: '192.168.1.45',
    device: 'Chrome / macOS (Toshkent)'
  },
  {
    id: 'log-107',
    timestamp: '2026-09-18 09:45:18',
    action: "Vakansiya talabnomasi ochildi",
    module: 'Vakansiyalar',
    type: 'create',
    performedBy: 'Aziza Qodirova',
    role: 'HR Manager',
    details: "'Unduruv' filiali uchun 2 nafar 'Omborchi' o'rni bo'yicha yangi vakansiya e'lon qilindi",
    ipAddress: '192.168.1.33',
    device: 'Chrome / Windows 11'
  },
  {
    id: 'log-108',
    timestamp: '2026-09-17 18:00:22',
    action: "Kunlik davomat hisoboti eksport qilindi",
    module: 'Davomat',
    type: 'export',
    performedBy: 'Zarifjon Zokirov',
    role: 'Super Admin',
    details: "17-sentyabr sanasi bo'yicha barcha filiallar davomat jurnali CSV (Excel) formatida yuklab olindi",
    ipAddress: '192.168.1.45',
    device: 'Chrome / macOS'
  },
  {
    id: 'log-109',
    timestamp: '2026-09-17 14:15:30',
    action: "Nomzod holati o'zgartirildi",
    module: 'Nomzodlar',
    type: 'status_change',
    performedBy: 'Aziza Qodirova',
    role: 'HR Manager',
    details: "Nomzod Feruza Karimova suhbat bosqichidan o'tdi va 'Taklif yuborildi' holatiga o'tkazildi",
    ipAddress: '192.168.1.33',
    device: 'Chrome / Windows 11'
  },
  {
    id: 'log-110',
    timestamp: '2026-09-17 09:02:11',
    action: "Tizimga kirish",
    module: 'Xavfsizlik',
    type: 'login',
    performedBy: 'Zarifjon Zokirov',
    role: 'Super Admin',
    details: "Super Admin to'liq boshqaruv rejimida tizimga muvaffaqiyatli kirdi",
    ipAddress: '192.168.1.45',
    device: 'Chrome / macOS'
  }
];

// Helper to record history from any component
export async function recordSystemHistory(item: Omit<HistoryLogItem, 'id' | 'timestamp'>) {
  try {
    const now = new Date();
    const pad = (n: number) => n < 10 ? `0${n}` : n;
    const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    const newEntry: HistoryLogItem = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: formatted,
      ...item
    };

    const { saveFirebaseHistory } = await import('../firebase');
    await saveFirebaseHistory(newEntry);
  } catch (err) {
    console.error('Failed to record system history:', err);
  }
}

interface SystemHistoryProps {
  onBack: () => void;
  currentUser?: any;
}

export default function SystemHistory({ onBack, currentUser }: SystemHistoryProps) {
  const [logs, setLogs] = useState<HistoryLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New log modal
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [newAction, setNewAction] = useState('');
  const [newModule, setNewModule] = useState<HistoryLogItem['module']>('Xodimlar');
  const [newType, setNewType] = useState<HistoryLogItem['type']>('update');
  const [newDetails, setNewDetails] = useState('');

  // Load from Firebase
  useEffect(() => {
    let active = true;
    async function syncLogs() {
      setIsLoading(true);
      try {
        const { getFirebaseHistory, saveFirebaseHistory } = await import('../firebase');
        const fbLogs = await getFirebaseHistory();
        if (!active) return;
        
        if (fbLogs && fbLogs.length > 0) {
          const sorted = fbLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setLogs(sorted);
        } else {
          // If Firestore is empty, seed it with SEED_HISTORY_DATA
          setLogs(SEED_HISTORY_DATA);
          for (const log of SEED_HISTORY_DATA) {
            await saveFirebaseHistory(log);
          }
        }
      } catch (error) {
        console.error("History sync error:", error);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    syncLogs();
    return () => { active = false; };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddCustomLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAction || !newDetails) return;

    const { saveFirebaseHistory } = await import('../firebase');
    const now = new Date();
    const pad = (n: number) => n < 10 ? `0${n}` : n;
    const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newLog: HistoryLogItem = {
      id: `log-${Date.now()}`,
      timestamp: formatted,
      action: newAction,
      module: newModule,
      type: newType,
      performedBy: currentUser?.fullName || currentUser?.name || 'Admin',
      role: currentUser?.role || 'User',
      details: newDetails
    };

    setLogs(prev => [newLog, ...prev]);
    await saveFirebaseHistory(newLog);
    setShowAddLogModal(false);
    setNewAction('');
    setNewDetails('');
    showToast('Yangi tizim qaydi muvaffaqiyatli qo\'shildi!');
  };

  const handleDeleteLog = async (id: string) => {
    const { deleteFirebaseHistory } = await import('../firebase');
    setLogs(prev => prev.filter(l => l.id !== id));
    await deleteFirebaseHistory(id);
    showToast('Tizim qaydi o\'chirildi');
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesModule = selectedModule === 'all' || log.module === selectedModule;
      const matchesType = selectedType === 'all' || log.type === selectedType;
      const matchesDate = !selectedDate || log.timestamp.startsWith(selectedDate);
      
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        log.action.toLowerCase().includes(q) ||
        log.performedBy.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        (log.ipAddress && log.ipAddress.toLowerCase().includes(q));

      return matchesModule && matchesType && matchesDate && matchesSearch;
    });
  }, [logs, selectedModule, selectedType, selectedDate, searchQuery]);

  // Key stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = logs.filter(l => l.timestamp.startsWith(today)).length;
    const uniqueUsers = new Set(logs.map(l => l.performedBy)).size;
    const lastActivity = logs[0]?.timestamp || 'Mavjud emas';

    return {
      total: logs.length,
      todayCount,
      uniqueUsers,
      lastActivity
    };
  }, [logs]);

  // Export to Excel (XLSX)
  const handleExportCSV = () => {
    const excelData = filteredLogs.map((l, idx) => ({
      '№': idx + 1,
      'ID': l.id,
      'Vaqt': l.timestamp,
      'Amal': l.action,
      'Modul': l.module,
      'Turi': l.type,
      'Bajardi': l.performedBy,
      'Roli': l.role,
      'Batafsil': l.details,
      'IP Manzil': l.ipAddress || '-',
      'Qurilma': l.device || '-'
    }));

    exportToExcel(excelData, `Toyona_Savdo_Tizim_Tarixi_${new Date().toISOString().slice(0, 10)}`);
    showToast(`Tizim tarixi Excel formatida muvaffaqiyatli yuklandi (${filteredLogs.length} ta yozuv)`);
  };

  // Clear history
  const handleClearHistory = () => {
    if (window.confirm("Barcha tizim tarixini tozalashni xohlaysizmi? Bu amalni orqaga qaytarib bo'lmaydi.")) {
      const resetLogs = [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          action: "Tizim tarixi tozalandi",
          module: 'Xavfsizlik' as const,
          type: 'delete' as const,
          performedBy: currentUser?.name || 'Zarifjon Zokirov',
          role: currentUser?.role || 'Super Admin',
          details: "Administrator tomonidan barcha eski audit yozuvlari tozalandi",
          ipAddress: '192.168.1.1',
          device: navigator.userAgent.slice(0, 30)
        }
      ];
      setLogs(resetLogs);
      localStorage.setItem(STORAGE_KEY_SYSTEM_HISTORY, JSON.stringify(resetLogs));
      showToast("Tizim tarixi tozalandi!");
    }
  };


  const getModuleBadge = (mod: string) => {
    switch (mod) {
      case 'Xodimlar': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Nomzodlar': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Davomat': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Rotatsiya': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Vakansiyalar': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Filiallar': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Xavfsizlik': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'create': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800"><Plus className="w-3 h-3" /> Yaratildi</span>;
      case 'update': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3" /> O'zgartirildi</span>;
      case 'delete': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800"><Trash2 className="w-3 h-3" /> O'chirildi</span>;
      case 'status_change': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800"><Activity className="w-3 h-3" /> Status</span>;
      case 'login': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-100 text-cyan-800"><Lock className="w-3 h-3" /> Kirish</span>;
      case 'export': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800"><Download className="w-3 h-3" /> Eksport</span>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 font-sans p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold border border-emerald-400 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Top Header Bar */}
      <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-5 mb-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-sm font-bold text-white transition-all shadow cursor-pointer group shrink-0"
            title="HRMS ga qaytish"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>HRMS ga qaytish</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-white tracking-tight">
                  Tizim Tarixi & Yashirin Audit Jurnali
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Maxfiy Rejim (tarix)
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Barcha modullarda yuz bergan o'zgarishlar, operatsiyalar va foydalanuvchilar amallarining to'liq arxivi
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowAddLogModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Qayd qo'shish</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Eksport (Excel)</span>
          </button>

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Tarixni tozalash"
          >
            <Trash2 className="w-4 h-4" />
            <span>Tozalash</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Jami amallar</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-white">{stats.total} ta</span>
          <span className="text-[11px] text-slate-400 mt-1">To'liq xronologik ro'yxat</span>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Bugungi amallar</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-2xl font-black text-blue-400">{stats.todayCount} ta</span>
          <span className="text-[11px] text-slate-400 mt-1">Bugun bajarilgan amallar</span>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Faol ishtirokchilar</span>
            <User className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-2xl font-black text-purple-400">{stats.uniqueUsers} nafar</span>
          <span className="text-[11px] text-slate-400 mt-1">Admin va operatorlar</span>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Oxirgi amal vaqti</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-sm font-black text-amber-400 truncate">{stats.lastActivity}</span>
          <span className="text-[11px] text-slate-400 mt-1">Tizim holati: Faol</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Amal, admin, tavsif yoki IP qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          {/* Module Filter */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300">
            <Layers className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-transparent outline-none cursor-pointer font-bold text-slate-200"
            >
              <option value="all" className="bg-slate-800">Barcha modullar</option>
              <option value="Xodimlar" className="bg-slate-800">Xodimlar</option>
              <option value="Nomzodlar" className="bg-slate-800">Nomzodlar</option>
              <option value="Davomat" className="bg-slate-800">Davomat</option>
              <option value="Rotatsiya" className="bg-slate-800">Rotatsiya</option>
              <option value="Vakansiyalar" className="bg-slate-800">Vakansiyalar</option>
              <option value="Filiallar" className="bg-slate-800">Filiallar</option>
              <option value="Xavfsizlik" className="bg-slate-800">Xavfsizlik</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent outline-none cursor-pointer font-bold text-slate-200"
            >
              <option value="all" className="bg-slate-800">Barcha turlar</option>
              <option value="create" className="bg-slate-800">Yaratildi</option>
              <option value="update" className="bg-slate-800">O'zgartirildi</option>
              <option value="delete" className="bg-slate-800">O'chirildi</option>
              <option value="status_change" className="bg-slate-800">Status o'zgarishi</option>
              <option value="login" className="bg-slate-800">Tizimga kirish</option>
              <option value="export" className="bg-slate-800">Eksport</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent outline-none cursor-pointer font-bold text-slate-200"
            />
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate('')}
                className="text-slate-500 hover:text-slate-300 text-xs ml-1"
                title="Sanani bekor qilish"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-bold whitespace-nowrap">
          Topildi: <span className="text-amber-400">{filteredLogs.length}</span> ta yozuv
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4 w-44">Sana & Vaqt</th>
                <th className="py-3.5 px-4 w-32">Modul</th>
                <th className="py-3.5 px-4 w-28 text-center">Turi</th>
                <th className="py-3.5 px-4 w-52">Bajaruvchi</th>
                <th className="py-3.5 px-4">Amal & Batafsil Tafsilot</th>
                <th className="py-3.5 px-4 w-36">IP & Qurilma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                      <span className="text-xs font-semibold text-slate-400">
                        Audit va tizim tarixi yuklanmoqda...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 font-medium">
                    <History className="w-12 h-12 mx-auto text-slate-600 mb-3 opacity-60" />
                    <p className="text-base font-bold text-slate-400">Hech qanday audit yozuvi topilmadi</p>
                    <p className="text-xs text-slate-500 mt-1">Filtr parametrlarini tozalab qaytadan ko'ring</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((item, idx) => (
                <tr 
                  key={`${item.id || idx}-${idx}`} 
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  <td className="py-3.5 px-4 text-xs font-mono text-slate-500 text-center">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-slate-300 whitespace-nowrap">
                    <div className="font-bold text-slate-200">{item.timestamp.split(' ')[0]}</div>
                    <div className="text-[11px] text-slate-400">{item.timestamp.split(' ')[1]}</div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold border ${getModuleBadge(item.module)}`}>
                      {item.module}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {getTypeBadge(item.type)}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold shrink-0">
                        {item.performedBy.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 leading-tight">{item.performedBy}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{item.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-sm font-bold text-white mb-0.5">
                      {item.action}
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed font-normal">
                      {item.details}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="text-xs font-mono text-slate-300 font-semibold">{item.ipAddress || '127.0.0.1'}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]" title={item.device}>
                      {item.device || 'Noma\'lum'}
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400" />
            <span>Yashirin joydan chiqish uchun yuqoridagi <b>"HRMS ga qaytish"</b> tugmasini yoki klaviaturadagi <b>ESC</b> tugmasini bosing.</span>
          </div>
          <span className="font-semibold text-slate-300">
            Jami: {logs.length} ta yozuv saqlanmoqda
          </span>
        </div>
      </div>

      {/* Add Custom Log Modal */}
      {showAddLogModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Yangi Tizim Audit Qaydini Kiritish
              </h3>
              <button 
                onClick={() => setShowAddLogModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddCustomLog} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Amal nomi / Sarlovha *</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Maxsus xavfsizlik tekshiruvi o'tkazildi"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Modul</label>
                  <select
                    value={newModule}
                    onChange={(e) => setNewModule(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Xodimlar">Xodimlar</option>
                    <option value="Nomzodlar">Nomzodlar</option>
                    <option value="Davomat">Davomat</option>
                    <option value="Rotatsiya">Rotatsiya</option>
                    <option value="Vakansiyalar">Vakansiyalar</option>
                    <option value="Filiallar">Filiallar</option>
                    <option value="Xavfsizlik">Xavfsizlik</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Amal turi</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="create">Yaratildi (Create)</option>
                    <option value="update">O'zgartirildi (Update)</option>
                    <option value="delete">O'chirildi (Delete)</option>
                    <option value="status_change">Status o'zgardi</option>
                    <option value="login">Tizimga kirish</option>
                    <option value="export">Eksport</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Batafsil tafsilot / Izoh *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Nima sodir bo'lganligi haqida batafsil ma'lumot kiriting..."
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer shadow-lg"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
