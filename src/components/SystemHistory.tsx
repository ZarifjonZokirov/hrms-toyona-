import { exportToExcel } from '../lib/export';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, ArrowLeft, Search, Filter, Calendar, User, 
  Clock, Download, Trash2, Plus, CheckCircle2, AlertTriangle, 
  Shield, Activity, RefreshCw, Layers, Lock, 
  Building2, Info, Loader2, Monitor, Smartphone, Globe, Laptop, 
  ChevronRight, X, Radio, Check, Users
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

// Cache client network and device info
let cachedClientIp = '';
let cachedClientDevice = '';

export async function getClientNetworkInfo(): Promise<{ ip: string; device: string }> {
  if (cachedClientIp && cachedClientDevice) {
    return { ip: cachedClientIp, device: cachedClientDevice };
  }

  // Detect device
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let dev = 'Windows PC';
  if (/Android/i.test(ua)) dev = 'Android Telefon';
  else if (/iPhone/i.test(ua)) dev = 'iPhone';
  else if (/iPad/i.test(ua)) dev = 'iPad';
  else if (/Windows/i.test(ua)) dev = 'Windows PC';
  else if (/Macintosh|Mac OS/i.test(ua)) dev = 'macOS Mac';
  else if (/Linux/i.test(ua)) dev = 'Linux PC';

  let browser = 'Chrome';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  cachedClientDevice = `${browser} / ${dev}`;

  // Detect real IP
  let ip = '127.0.0.1';
  try {
    const res = await fetch('/api/client-info');
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) ip = data.ip;
    }
  } catch {}

  if (!ip || ip === '127.0.0.1' || ip === 'localhost') {
    try {
      const extRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(1800) });
      if (extRes.ok) {
        const extData = await extRes.json();
        if (extData?.ip) ip = extData.ip;
      }
    } catch {}
  }

  cachedClientIp = ip || '127.0.0.1';
  return { ip: cachedClientIp, device: cachedClientDevice };
}

// Helper to record history from any component
export async function recordSystemHistory(item: Omit<HistoryLogItem, 'id' | 'timestamp'>) {
  try {
    const now = new Date();
    const pad = (n: number) => n < 10 ? `0${n}` : n;
    const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    // Auto-attach IP and Device if not provided
    let ip = item.ipAddress;
    let device = item.device;
    if (!ip || !device) {
      const netInfo = await getClientNetworkInfo();
      ip = ip || netInfo.ip;
      device = device || netInfo.device;
    }

    const newEntry: HistoryLogItem = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: formatted,
      ...item,
      ipAddress: ip || '127.0.0.1',
      device: device || 'Noma\'lum Qurilma'
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
  
  // Navigation Tabs: 'ip_categories' | 'devices_hr' | 'all_logs'
  const [activeTab, setActiveTab] = useState<'ip_categories' | 'devices_hr' | 'all_logs'>('ip_categories');
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected IP for detail view modal/drawer
  const [selectedIpForDetail, setSelectedIpForDetail] = useState<string | null>(null);

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
        const { getFirebaseHistory } = await import('../firebase');
        const fbLogs = await getFirebaseHistory();
        if (!active) return;
        
        if (fbLogs && fbLogs.length > 0) {
          const sorted = fbLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setLogs(sorted);
        } else {
          setLogs([]);
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

    const netInfo = await getClientNetworkInfo();
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
      role: currentUser?.role || 'Super Admin',
      details: newDetails,
      ipAddress: netInfo.ip,
      device: netInfo.device
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

  // Filtered raw logs
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
        (log.ipAddress && log.ipAddress.toLowerCase().includes(q)) ||
        (log.device && log.device.toLowerCase().includes(q));

      return matchesModule && matchesType && matchesDate && matchesSearch;
    });
  }, [logs, selectedModule, selectedType, selectedDate, searchQuery]);

  // Group by IP Address
  const ipGroups = useMemo(() => {
    const map = new Map<string, {
      ip: string;
      usersMap: Map<string, string>; // name -> role
      devicesSet: Set<string>;
      logs: HistoryLogItem[];
      firstSeen: string;
      lastActive: string;
      hasHR: boolean;
    }>();

    filteredLogs.forEach(log => {
      const ip = (log.ipAddress || '127.0.0.1').trim();
      let grp = map.get(ip);
      if (!grp) {
        grp = {
          ip,
          usersMap: new Map(),
          devicesSet: new Set(),
          logs: [],
          firstSeen: log.timestamp,
          lastActive: log.timestamp,
          hasHR: false
        };
        map.set(ip, grp);
      }

      grp.logs.push(log);
      if (log.performedBy) {
        grp.usersMap.set(log.performedBy, log.role || 'Xodim');
      }
      if (log.device) {
        grp.devicesSet.add(log.device);
      }
      if (log.role && /hr|kadr/i.test(log.role)) {
        grp.hasHR = true;
      }
      if (new Date(log.timestamp) > new Date(grp.lastActive)) {
        grp.lastActive = log.timestamp;
      }
      if (new Date(log.timestamp) < new Date(grp.firstSeen)) {
        grp.firstSeen = log.timestamp;
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
  }, [filteredLogs]);

  // Group by User Account (Multi-Device & HR Tracking)
  const userAccountGroups = useMemo(() => {
    const map = new Map<string, {
      userName: string;
      role: string;
      devicesMap: Map<string, { ip: string; lastSeen: string }>;
      logs: HistoryLogItem[];
      lastLogin: string;
      isHR: boolean;
      isOnlineToday: boolean;
    }>();

    const todayStr = new Date().toISOString().slice(0, 10);

    logs.forEach(log => {
      const user = (log.performedBy || 'Noma\'lum').trim();
      let grp = map.get(user);
      if (!grp) {
        const isHR = /hr|kadr/i.test(log.role || '');
        grp = {
          userName: user,
          role: log.role || 'Foydalanuvchi',
          devicesMap: new Map(),
          logs: [],
          lastLogin: log.timestamp,
          isHR,
          isOnlineToday: false
        };
        map.set(user, grp);
      }

      grp.logs.push(log);
      const dev = log.device || 'Standart Kompyuter';
      const existingDev = grp.devicesMap.get(dev);
      if (!existingDev || new Date(log.timestamp) > new Date(existingDev.lastSeen)) {
        grp.devicesMap.set(dev, {
          ip: log.ipAddress || '127.0.0.1',
          lastSeen: log.timestamp
        });
      }

      if (new Date(log.timestamp) > new Date(grp.lastLogin)) {
        grp.lastLogin = log.timestamp;
      }

      if (log.timestamp.startsWith(todayStr)) {
        grp.isOnlineToday = true;
      }
    });

    return Array.from(map.values()).map(g => ({
      ...g,
      uniqueDevicesCount: g.devicesMap.size,
      isMultiDevice: g.devicesMap.size > 1,
      devicesList: Array.from(g.devicesMap.entries()).map(([device, info]) => ({
        device,
        ip: info.ip,
        lastSeen: info.lastSeen
      }))
    })).sort((a, b) => new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime());
  }, [logs]);

  // Key stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = logs.filter(l => l.timestamp.startsWith(today)).length;
    const uniqueIps = new Set(logs.map(l => l.ipAddress || '127.0.0.1')).size;
    const uniqueUsers = new Set(logs.map(l => l.performedBy)).size;
    
    // Total unique devices
    const uniqueDevices = new Set(logs.map(l => l.device || 'Kompyuter')).size;

    // HR today status
    const hrLogsToday = logs.filter(l => l.timestamp.startsWith(today) && /hr|kadr/i.test(l.role || ''));
    const isHrActiveToday = hrLogsToday.length > 0;
    const lastHrLog = logs.find(l => /hr|kadr/i.test(l.role || ''));

    // Multi-device accounts count
    const multiDeviceUsersCount = userAccountGroups.filter(u => u.isMultiDevice).length;

    return {
      total: logs.length,
      todayCount,
      uniqueIps,
      uniqueUsers,
      uniqueDevices,
      isHrActiveToday,
      lastHrTime: lastHrLog?.timestamp || 'Hali kirmagan',
      lastHrAction: lastHrLog ? `${lastHrLog.performedBy}: ${lastHrLog.action}` : 'Mavjud emas',
      multiDeviceUsersCount,
      lastActivity: logs[0]?.timestamp || 'Mavjud emas'
    };
  }, [logs, userAccountGroups]);

  // Selected IP logs for the detailed drawer
  const selectedIpGroup = useMemo(() => {
    if (!selectedIpForDetail) return null;
    return ipGroups.find(g => g.ip === selectedIpForDetail) || null;
  }, [ipGroups, selectedIpForDetail]);

  // Export to Excel (XLSX)
  const handleExportExcel = () => {
    const excelData = filteredLogs.map((l, idx) => ({
      '№': idx + 1,
      'ID': l.id,
      'Vaqt': l.timestamp,
      'IP Manzili': l.ipAddress || '127.0.0.1',
      'Qurilma': l.device || '-',
      'Foydalanuvchi': l.performedBy,
      'Roli': l.role,
      'Modul': l.module,
      'Amal Turi': l.type,
      'Amal': l.action,
      'Batafsil Tafsilot': l.details
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
          ipAddress: '127.0.0.1',
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
      case 'Xodimlar': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Nomzodlar': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Davomat': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Rotatsiya': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Vakansiyalar': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'Filiallar': return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      case 'Xavfsizlik': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default: return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'create': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><Plus className="w-3 h-3" /> Yaratildi</span>;
      case 'update': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30"><RefreshCw className="w-3 h-3" /> O'zgartirildi</span>;
      case 'delete': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30"><Trash2 className="w-3 h-3" /> O'chirildi</span>;
      case 'status_change': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"><Activity className="w-3 h-3" /> Status</span>;
      case 'login': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"><Lock className="w-3 h-3" /> Kirish</span>;
      case 'export': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-700 text-slate-200 border border-slate-600"><Download className="w-3 h-3" /> Eksport</span>;
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
                  Tizim Tarixi & IP Audit Nazorati
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                  Maxfiy Rejim (tarix)
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Har bir IP manzildagi insonlar, qurilmalar va HR xodimlarining faoliyat monitoringi
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
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
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

      {/* Real-time Metrics Banner (4 Smart Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Jami IP Manzillar</span>
            <Globe className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-2xl font-black text-cyan-300">{stats.uniqueIps} ta IP</span>
          <span className="text-[11px] text-slate-400 mt-1">Har bir IP alohida kategoriya</span>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Jami Qurilmalar</span>
            <Smartphone className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-2xl font-black text-purple-300">{stats.uniqueDevices} ta</span>
          <span className="text-[11px] text-slate-400 mt-1">
            {stats.multiDeviceUsersCount > 0 ? (
              <span className="text-amber-400 font-bold">⚠️ {stats.multiDeviceUsersCount} hisobda ko'p qurilma</span>
            ) : (
              'Barcha qurilmalar barqaror'
            )}
          </span>
        </div>

        <div className={`border rounded-2xl p-4 flex flex-col justify-between ${
          stats.isHrActiveToday 
            ? 'bg-emerald-950/30 border-emerald-800/60' 
            : 'bg-rose-950/20 border-rose-800/40'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">HR Faolligi</span>
            <User className={`w-4 h-4 ${stats.isHrActiveToday ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${stats.isHrActiveToday ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            <span className={`text-xl font-black ${stats.isHrActiveToday ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.isHrActiveToday ? 'Bugun Kirgan' : 'Bugun Kirmagan'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 truncate" title={stats.lastHrTime}>
            Oxirgi kirish: {stats.lastHrTime.split(' ')[1] || stats.lastHrTime}
          </span>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Oxirgi Amal</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-sm font-black text-amber-300 truncate">{stats.lastActivity}</span>
          <span className="text-[11px] text-slate-400 mt-1">Bugun jami: {stats.todayCount} ta amal</span>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-700/80 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('ip_categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'ip_categories'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
              : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>🌐 IP Manzillar Kategoriyasi ({ipGroups.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('devices_hr')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'devices_hr'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>📱 Qurilmalar & HR Tahlili</span>
          {stats.multiDeviceUsersCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-900">
              {stats.multiDeviceUsersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all_logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'all_logs'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>📋 Barcha Audit Qaydlari ({filteredLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: IP KATEGORIYALARI (YANGI IP = YANGI TARIX) */}
      {activeTab === 'ip_categories' && (
        <div className="space-y-4">
          {/* Quick Search */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="IP manzil, ism yoki amal bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Har bir IP manzil ustiga bossangiz, aynan o'sha IP dan qilingan amallar to'liq xronologiyasi ochiladi.
            </div>
          </div>

          {/* IP Cards Grid */}
          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="text-xs font-semibold text-slate-400">IP manzillar bo'yicha tarix saralanmoqda...</span>
            </div>
          ) : ipGroups.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-12 text-center text-slate-400">
              <Globe className="w-12 h-12 mx-auto text-slate-600 mb-3 opacity-60" />
              <p className="text-base font-bold text-slate-300">Hech qanday IP manzili topilmadi</p>
              <p className="text-xs text-slate-500 mt-1">Qidiruv parametrlarini tozalab ko'ring</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ipGroups.map((grp) => {
                const userNames = Array.from(grp.usersMap.keys());
                const devices = Array.from(grp.devicesSet);
                const isSelected = selectedIpForDetail === grp.ip;

                return (
                  <div
                    key={grp.ip}
                    onClick={() => setSelectedIpForDetail(grp.ip)}
                    className={`bg-slate-800/90 border rounded-2xl p-5 transition-all cursor-pointer hover:scale-[1.01] hover:shadow-xl relative overflow-hidden group ${
                      isSelected 
                        ? 'border-cyan-400 shadow-cyan-900/30 ring-2 ring-cyan-500/50' 
                        : 'border-slate-700/80 hover:border-cyan-500/50'
                    }`}
                  >
                    {/* Top row: IP Badge & Total actions */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold shrink-0">
                          IP
                        </div>
                        <div>
                          <div className="text-base font-black font-mono text-white tracking-wide flex items-center gap-2">
                            <span>{grp.ip}</span>
                            {grp.ip === '127.0.0.1' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-700 text-slate-300">Lokal</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Oxirgi faollik: {grp.lastActive.split(' ')[1]} ({grp.lastActive.split(' ')[0]})
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shrink-0">
                        {grp.logs.length} ta amal
                      </span>
                    </div>

                    {/* Middle: People who logged from this IP */}
                    <div className="bg-slate-900/80 rounded-xl p-3 mb-3 border border-slate-700/50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Ushbu IP dan kirgan shaxslar ({userNames.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {userNames.length > 0 ? (
                          userNames.map(name => {
                            const role = grp.usersMap.get(name) || '';
                            const isHR = /hr|kadr/i.test(role);
                            return (
                              <span 
                                key={name} 
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border ${
                                  isHR 
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                                    : 'bg-slate-800 text-slate-200 border-slate-700'
                                }`}
                              >
                                <User className="w-3 h-3 text-slate-400" />
                                <span>{name}</span>
                                <span className="text-[10px] opacity-75 font-normal">({role})</span>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-slate-500">Noma'lum foydalanuvchi</span>
                        )}
                      </div>
                    </div>

                    {/* Devices used */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-700/50">
                      <div className="flex items-center gap-1.5 truncate max-w-[220px]" title={devices.join(', ')}>
                        <Smartphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{devices.length > 0 ? devices[0] : 'Standart qurilma'}</span>
                        {devices.length > 1 && (
                          <span className="text-[10px] font-bold text-purple-400">+{devices.length - 1}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-cyan-400 text-xs font-bold group-hover:translate-x-1 transition-transform shrink-0">
                        <span>Amallar</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QURILMALAR & HR FAOLLIGI (MULTI-DEVICE & HR TRACKER) */}
      {activeTab === 'devices_hr' && (
        <div className="space-y-6">
          {/* HR Monitoring Special Card */}
          <div className="bg-gradient-to-r from-purple-950/40 via-slate-800/80 to-slate-800/80 border border-purple-700/40 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>Kadrlar Bo'limi (HR) Faoliyat Tahlili</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      stats.isHrActiveToday ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}>
                      {stats.isHrActiveToday ? 'Bugun Tizimda Bo\'lgan' : 'Bugun Kirmagan'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    HR xodimlarining tizimga kirish vaqti, foydalangan qurilmasi va bajargan operatsiyalari nazorati
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-slate-300">Oxirgi amal vaqti:</div>
                <div className="text-sm font-mono font-black text-amber-400">{stats.lastHrTime}</div>
              </div>
            </div>

            {/* List HR users */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {userAccountGroups.filter(u => u.isHR || /hr|kadr/i.test(u.role)).map(hrUser => (
                <div key={hrUser.userName} className="bg-slate-900/90 border border-slate-700 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-sm">{hrUser.userName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      hrUser.isOnlineToday ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {hrUser.isOnlineToday ? 'Bugun Faol' : 'Bugun Kirmagan'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Roli: <span className="text-slate-200 font-semibold">{hrUser.role}</span></div>
                    <div>Oxirgi kirish: <span className="text-amber-400 font-mono font-bold">{hrUser.lastLogin}</span></div>
                    <div>Qurilmalar: <span className="text-cyan-400 font-bold">{hrUser.uniqueDevicesCount} ta qurilma</span></div>
                    <div>Jami amallari: <span className="text-slate-200 font-bold">{hrUser.logs.length} ta</span></div>
                  </div>
                </div>
              ))}
              {userAccountGroups.filter(u => u.isHR || /hr|kadr/i.test(u.role)).length === 0 && (
                <div className="col-span-full py-4 text-center text-xs text-slate-500">
                  Hali HR roli bo'yicha tizim qaydlari mavjud emas. HR xodimi kirishi bilan avtomatik bu yerda paydo bo'ladi.
                </div>
              )}
            </div>
          </div>

          {/* Multi-Device Login Accounts List */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-purple-400" />
                  <span>Bitta Login/Paroldan Kirilgan Qurilmalar Tahlili</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bir xil hisobdan nechta har xil telefon yoki kompyuter orqali kirilgani (Hisob almashinuvini aniqlash)
                </p>
              </div>

              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300">
                Jami hisoblar: {userAccountGroups.length} ta
              </span>
            </div>

            <div className="space-y-3">
              {userAccountGroups.map((u) => (
                <div 
                  key={u.userName}
                  className={`bg-slate-900/90 border rounded-xl p-4 transition-all ${
                    u.isMultiDevice 
                      ? 'border-amber-500/50 bg-amber-950/10' 
                      : 'border-slate-700/70'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        u.isMultiDevice ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-700 text-slate-200'
                      }`}>
                        {u.userName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{u.userName}</span>
                          <span className="text-xs text-slate-400 font-normal">({u.role})</span>
                          {u.isMultiDevice && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              ⚠️ {u.uniqueDevicesCount} ta Qurilmadan Kirilgan!
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Oxirgi kirish vaqti: <span className="font-mono text-slate-300">{u.lastLogin}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-400">
                      Jami amallar: <span className="text-cyan-400">{u.logs.length} ta</span>
                    </div>
                  </div>

                  {/* Devices detail list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                    {u.devicesList.map((devItem, idx) => (
                      <div key={idx} className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60 text-xs">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-slate-200 truncate" title={devItem.device}>
                            📱 {devItem.device}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded">
                            {devItem.ip}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between">
                          <span>Vaqti:</span>
                          <span className="font-mono text-slate-300">{devItem.lastSeen}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BARCHA AUDIT QAYDLARI (JURNAL) */}
      {activeTab === 'all_logs' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Amal, admin, tavsif yoki IP qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
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

          {/* Table */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex-1 flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-700/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4 w-44">Sana & Vaqt</th>
                    <th className="py-3.5 px-4 w-32">Modul</th>
                    <th className="py-3.5 px-4 w-28 text-center">Turi</th>
                    <th className="py-3.5 px-4 w-48">Bajaruvchi</th>
                    <th className="py-3.5 px-4">Amal & Batafsil Tafsilot</th>
                    <th className="py-3.5 px-4 w-44">IP & Qurilma</th>
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
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIpForDetail(item.ipAddress || '127.0.0.1');
                          }}
                          className="text-xs font-mono text-cyan-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Globe className="w-3 h-3" />
                          <span>{item.ipAddress || '127.0.0.1'}</span>
                        </button>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]" title={item.device}>
                          {item.device || 'Noma\'lum'}
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-900/90 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Yashirin joydan chiqish uchun yuqoridagi <b>"HRMS ga qaytish"</b> tugmasini yoki klaviaturadagi <b>ESC</b> tugmasini bosing.</span>
              </div>
              <span className="font-semibold text-slate-300">
                Jami: {logs.length} ta yozuv saqlanmoqda
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / DRAWER: SELECTED IP DETAILS (AYNAN O'SHA IP DAGI INSON QILGAN ISHLAR) */}
      {selectedIpGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="p-5 bg-slate-900/90 border-b border-slate-700 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono font-bold shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black font-mono text-white tracking-wide">
                      IP: {selectedIpGroup.ip}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {selectedIpGroup.logs.length} ta operatsiya
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ushbu IP dan kirgan shaxslar: <span className="text-slate-200 font-semibold">{Array.from(selectedIpGroup.usersMap.keys()).join(', ') || 'Noma\'lum'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const exportRows = selectedIpGroup.logs.map((l, idx) => ({
                      '№': idx + 1,
                      'Vaqt': l.timestamp,
                      'IP': l.ipAddress,
                      'Qurilma': l.device,
                      'Foydalanuvchi': l.performedBy,
                      'Roli': l.role,
                      'Modul': l.module,
                      'Amal': l.action,
                      'Tafsilot': l.details
                    }));
                    exportToExcel(exportRows, `IP_${selectedIpGroup.ip}_Faoliyat_Tarixi`);
                    showToast(`${selectedIpGroup.ip} bo'yicha tarix Excelga yuklandi!`);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 flex items-center gap-1.5 cursor-pointer"
                  title="Ushbu IP tarixini Excelga yuklash"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIpForDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body Timeline */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Aynan ushbu IP dan bajarilgan amallarning to'liq vaqtlar xronologiyasi:
              </div>

              <div className="relative border-l-2 border-slate-700 pl-4 sm:pl-6 ml-2 sm:ml-4 space-y-6">
                {selectedIpGroup.logs.map((item, idx) => (
                  <div key={item.id || idx} className="relative group">
                    {/* Circle dot on line */}
                    <div className="absolute -left-[23px] sm:-left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-cyan-400"></div>

                    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 hover:border-slate-600 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-cyan-300">
                            🕒 {item.timestamp}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getModuleBadge(item.module)}`}>
                            {item.module}
                          </span>
                          {getTypeBadge(item.type)}
                        </div>

                        <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.performedBy}</span>
                          <span className="text-[10px] text-slate-400">({item.role})</span>
                        </div>
                      </div>

                      <div className="text-sm font-bold text-white mb-1">
                        {item.action}
                      </div>

                      <div className="text-xs text-slate-300 leading-relaxed font-normal mb-2">
                        {item.details}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                        <span>Qurilma: <b className="text-slate-400">{item.device || 'Standart Kompyuter'}</b></span>
                        <span className="font-mono">ID: {item.id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900/90 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
              <span>Birinchi kirgan vaqt: <b className="text-slate-300">{selectedIpGroup.firstSeen}</b></span>
              <button
                type="button"
                onClick={() => setSelectedIpForDetail(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

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
