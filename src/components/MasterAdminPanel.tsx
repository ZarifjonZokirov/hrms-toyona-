import React, { useState, useEffect, useMemo } from 'react';
import { 
  Crown, Shield, Key, Eye, EyeOff, Lock, Unlock, Users, UserCheck, 
  RefreshCw, Download, Send, AlertTriangle, CheckCircle2, X, Sparkles, 
  Terminal, Activity, Smartphone, Globe, ArrowRight, Zap, Settings, 
  ShieldCheck, UserX, Clock, Database, Copy, Check, Briefcase, Building2
} from 'lucide-react';
import { UserItem, ALL_MODULE_DEFS } from './UsersManagement';
import { 
  getFirebaseUsers, 
  saveFirebaseUser, 
  syncUserPasswordInBothCollections,
  getFirebaseEmployees,
  getFirebaseCandidates,
  getFirebaseVacancies,
  getFirebaseGeozones,
  getFirebaseHistory
} from '../firebase';
import { recordSystemHistory } from './SystemHistory';

export const MASTER_ROOT_USER: UserItem = {
  id: 999999,
  name: 'Zarifjon Zokirov',
  username: '20090915zzokirov2009@z',
  role: 'Super Super Super Admin',
  branch: 'Barcha Filiallar (Root)',
  email: 'zarifjon.zokirov@hrms.uz',
  phone: '+998 90 000 00 00',
  isOnline: true,
  lastActive: 'Hozir',
  avatarBg: 'linear-gradient(135deg, #10b981, #059669)',
  allowedModules: ALL_MODULE_DEFS.map(m => m.id),
  password: '20090915ZZOKIROV2009@z',
  isGhost: true,
  isMasterRoot: true
};

interface MasterAdminPanelProps {
  onBack: () => void;
  currentUser: any;
  allUsers: UserItem[];
  setUsers: React.Dispatch<React.SetStateAction<UserItem[]>>;
  onSwitchUser: (user: UserItem) => void;
  onOpenHistory: () => void;
}

export default function MasterAdminPanel({
  onBack,
  currentUser,
  allUsers,
  setUsers,
  onSwitchUser,
  onOpenHistory
}: MasterAdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'control' | 'credentials' | 'telegram' | 'vault'>('control');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Credentials State
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  
  // Password Edit Modal
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Telegram Broadcast State
  const [telegramStatus, setTelegramStatus] = useState<any>(null);
  const [broadcastText, setBroadcastText] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Emergency Toggles
  const [bypassGeozones, setBypassGeozones] = useState<boolean>(() => {
    return localStorage.getItem('toyonasavdo_master_bypass_geozones') === 'true';
  });
  const [waivePenalties, setWaivePenalties] = useState<boolean>(() => {
    return localStorage.getItem('toyonasavdo_master_waive_penalties') === 'true';
  });
  const [systemMaintenance, setSystemMaintenance] = useState<boolean>(() => {
    return localStorage.getItem('toyonasavdo_master_maintenance') === 'true';
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load all system accounts (Users + Employees with credentials)
  const loadAllAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const [fbUsers, fbEmployees] = await Promise.all([
        getFirebaseUsers().catch(() => []),
        getFirebaseEmployees().catch(() => [])
      ]);

      const list: any[] = [];
      const seen = new Set<string>();

      // 1. Process System Users
      (fbUsers || []).forEach((u: any) => {
        if (!u || u.id === 999999 || (u as any).isGhost) return; // Hide master root itself
        const key = `user_${u.username || u.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: u.id,
            type: 'Admin / Ma\'mur',
            name: u.name || 'Admin',
            username: u.username || '',
            password: u.password || '******',
            role: u.role || 'Admin',
            branch: u.branch || 'Bosh Idora',
            raw: u
          });
        }
      });

      // 2. Process Employees with usernames
      (fbEmployees || []).forEach((emp: any) => {
        if (!emp || !emp.username) return;
        const key = `emp_${emp.username}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: emp.id,
            type: 'Xodim',
            name: emp.fullName || emp.name || 'Xodim',
            username: emp.username,
            password: emp.password || '******',
            role: emp.position || emp.role || 'Xodim',
            branch: emp.branch || 'Filial',
            raw: emp
          });
        }
      });

      setAccounts(list);
    } catch (err) {
      console.error("Accounts load error:", err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    loadAllAccounts();

    // Check telegram status
    fetch('/api/security/telegram-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setTelegramStatus(data); })
      .catch(() => {});
  }, []);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenPasswordEdit = (account: any) => {
    setEditingAccount(account);
    setNewPasswordInput(account.password === '******' ? '' : account.password);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !newPasswordInput.trim()) return;

    setIsSavingPassword(true);
    try {
      const cleanPass = newPasswordInput.trim();
      await syncUserPasswordInBothCollections(editingAccount.username, cleanPass, editingAccount.id);

      // Update local state
      setAccounts(prev => prev.map(acc => {
        if (acc.username === editingAccount.username) {
          return { ...acc, password: cleanPass };
        }
        return acc;
      }));

      recordSystemHistory({
        action: "👑 Master: Parol o'zgartirildi",
        module: 'Xavfsizlik',
        type: 'update',
        performedBy: 'Zarifjon Zokirov (Master Root)',
        role: 'Super Super Super Admin',
        details: `Master Admin tomonidan "${editingAccount.name}" (Login: ${editingAccount.username}) paroli to'g'ridan-to'g'ri yangilandi`
      });

      showToast(`"${editingAccount.name}" hisobining paroli yangilandi!`);
      setEditingAccount(null);
    } catch (err: any) {
      alert("Parolni yangilashda xatolik: " + err.message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSendTelegramBroadcast = async () => {
    if (!broadcastText.trim()) {
      alert("Xabar matnini kiriting!");
      return;
    }

    setIsSendingBroadcast(true);
    try {
      const res = await fetch('/api/security/notify-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'master_root_broadcast',
          userName: 'Zarifjon Zokirov (Master Root)',
          userRole: 'Super Super Super Admin',
          device: 'Master Command Center',
          screenResolution: 'Root Override',
          time: new Date().toLocaleString('uz-UZ'),
          customMessage: broadcastText.trim()
        })
      });

      if (res.ok) {
        showToast("Telegram xabarnomasi barcha adminlarga yuborildi!");
        setBroadcastText('');
      } else {
        throw new Error("Xabar yuborilmadi");
      }
    } catch (e: any) {
      alert("Telegram xabarnoma xatosi: " + e.message);
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Full Database Backup JSON download
  const handleDownloadFullBackup = async () => {
    showToast("To'liq bulut bazasi zaxiralanmoqda...");
    try {
      const [users, emps, cands, vacs, geoz, logs] = await Promise.all([
        getFirebaseUsers().catch(() => []),
        getFirebaseEmployees().catch(() => []),
        getFirebaseCandidates().catch(() => []),
        getFirebaseVacancies().catch(() => []),
        getFirebaseGeozones().catch(() => []),
        getFirebaseHistory().catch(() => [])
      ]);

      const fullDatabaseBackup = {
        exportedAt: new Date().toISOString(),
        exportedBy: 'Zarifjon Zokirov (Super Super Super Admin)',
        systemVersion: 'HRMS Toyona 5.4 Root Master',
        data: {
          users,
          employees: emps,
          candidates: cands,
          vacancies: vacs,
          geozones: geoz,
          historyLogs: logs
        }
      };

      const blob = new Blob([JSON.stringify(fullDatabaseBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Toyona_HRMS_FULL_VAULT_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast("To'liq baza zaxirasi kompyuteringizga yuklandi!");
    } catch (err: any) {
      alert("Zaxiralashda xatolik: " + err.message);
    }
  };

  const handleToggleBypassGeozones = () => {
    const next = !bypassGeozones;
    setBypassGeozones(next);
    localStorage.setItem('toyonasavdo_master_bypass_geozones', String(next));
    showToast(next ? "GPS Geozona cheklovlari chetlab o'tildi!" : "GPS Geozona nazorati tiklandi.");
  };

  const handleToggleWaivePenalties = () => {
    const next = !waivePenalties;
    setWaivePenalties(next);
    localStorage.setItem('toyonasavdo_master_waive_penalties', String(next));
    showToast(next ? "Barcha kechikish jarimalari nolga tenglashtirildi!" : "Standart jarima qoidalari tiklandi.");
  };

  const handleToggleMaintenance = () => {
    const next = !systemMaintenance;
    setSystemMaintenance(next);
    localStorage.setItem('toyonasavdo_master_maintenance', String(next));
    showToast(next ? "Tizim texnik rejimga o'tkazildi!" : "Tizim to'liq ishchi rejimda.");
  };

  // Filtered accounts list
  const filteredAccounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return accounts;
    return accounts.filter(acc => 
      (acc.name || '').toLowerCase().includes(q) ||
      (acc.username || '').toLowerCase().includes(q) ||
      (acc.role || '').toLowerCase().includes(q) ||
      (acc.branch || '').toLowerCase().includes(q)
    );
  }, [accounts, searchQuery]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[120] bg-gradient-to-r from-amber-600 to-rose-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-amber-400/40 text-xs font-bold animate-fadeIn">
          <Sparkles className="w-4 h-4 text-amber-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP MASTER HEADER */}
      <header className="px-6 py-4 bg-slate-900/95 border-b border-amber-500/30 backdrop-blur-md flex items-center justify-between shrink-0 shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-purple-700 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0 animate-pulse">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
              <Crown className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400">
                MUTLAQ BOSHQARUVCHI PANELI
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                Super Super Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-2 mt-0.5">
              <span>👤 Zarifjon Zokirov</span>
              <span>•</span>
              <span className="text-emerald-400 font-mono text-[11px]">🔑 Kalit: 20090915ZZOKIROV2009@z</span>
              <span>•</span>
              <span className="text-purple-400 font-semibold text-[11px]">👁️‍🗨️ Ko'rinmas Rejim: Faol</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenHistory}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Maxfiy Tizim Tarixini ochish"
          >
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Tizim Tarixi (20090915)</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00A651] hover:bg-[#008d44] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#00A651]/20 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>HRMS Asosiy Oynasiga Qaytish</span>
          </button>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('control')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'control'
              ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>Mutlaq Tizim Boshqaruvi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('credentials')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'credentials'
              ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
          }`}
        >
          <Key className="w-4 h-4 text-amber-300" />
          <span>Barcha Hisoblar & Parollar ({accounts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('telegram')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'telegram'
              ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
          }`}
        >
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span>Telegram Xavfsizlik Boti (@FaolMaktab_uzbot)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vault')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'vault'
              ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Baza Zaxira & Vault</span>
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ============================================================== */}
        {/* TAB 1: MUTLAQ TIZIM BOSHQARUVI (CONTROL & IMPERSONATION) */}
        {/* ============================================================== */}
        {activeTab === 'control' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            
            {/* Master Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-amber-400">
                <Crown className="w-48 h-48" />
              </div>
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-extrabold uppercase tracking-wider mb-3">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Cheksiz Hokimiyat Rejimi</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
                  Tizim to'liq sizning nazoratingiz ostida
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Ushbu rejim orqali siz istalgan rol yoki xodim hisobiga bir zumda o'tishingiz, barcha parollarni boshqarishingiz, cheklovlarni yechishingiz va butun ma'lumotlar bazasini xavfsiz zaxiralashingiz mumkin.
                </p>
              </div>
            </div>

            {/* Quick Impersonation Roles Grid */}
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Bir Zumda Har Qanday Rolga O'tish (Impersonation)</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                
                {/* 1. Super Admin */}
                <div 
                  onClick={() => {
                    const u = allUsers.find(x => x.id === 1 || x.role === 'Super Admin') || allUsers[0];
                    if (u) onSwitchUser(u);
                  }}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/60 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold mb-3 border border-rose-500/30">
                      SA
                    </div>
                    <h4 className="font-bold text-white text-sm group-hover:text-rose-400 transition-colors">
                      Super Admin
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Asosiy admin ko'rinishida tizimni tekshirish
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-xs font-bold text-rose-400">
                    <span>O'tish</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 2. HR Menejer */}
                <div 
                  onClick={() => {
                    const u = allUsers.find(x => x.id === 2 || x.role === 'HR Menejer') || {
                      id: 2, name: 'HR Menejer (Nazorat)', username: 'hr_manager', role: 'HR Menejer', branch: 'Bosh Idora', allowedModules: ['branches', 'candidates', 'vacancies', 'employees', 'quality', 'attendance', 'transfers']
                    } as any;
                    onSwitchUser(u);
                  }}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-[#00A651]/60 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-[#00A651]/20 text-[#00A651] flex items-center justify-center font-bold mb-3 border border-[#00A651]/30">
                      HR
                    </div>
                    <h4 className="font-bold text-white text-sm group-hover:text-[#00A651] transition-colors">
                      HR Menejer
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Kadrlar, nomzodlar va davomat modullarini ko'rish
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-xs font-bold text-[#00A651]">
                    <span>O'tish</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 3. Filial Mudiri */}
                <div 
                  onClick={() => {
                    const u = allUsers.find(x => x.id === 3 || x.role === 'Filial Mudiri') || {
                      id: 3, name: 'Filial Mudiri', username: 'branch_manager', role: 'Filial Mudiri', branch: 'Turkiston filiali', allowedModules: ['branches', 'candidates', 'vacancies', 'employees', 'attendance']
                    } as any;
                    onSwitchUser(u);
                  }}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/60 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold mb-3 border border-blue-500/30">
                      FM
                    </div>
                    <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">
                      Filial Mudiri
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Filial doirasidagi cheklangan ruxsatlarni sinash
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-xs font-bold text-blue-400">
                    <span>O'tish</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* 4. Operator */}
                <div 
                  onClick={() => {
                    const u = allUsers.find(x => x.id === 5 || x.role === 'Operator') || {
                      id: 5, name: 'Operator', username: 'operator_user', role: 'Operator', branch: 'Bosh Idora', allowedModules: ['candidates']
                    } as any;
                    onSwitchUser(u);
                  }}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/60 transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold mb-3 border border-purple-500/30">
                      OP
                    </div>
                    <h4 className="font-bold text-white text-sm group-hover:text-purple-400 transition-colors">
                      Operator
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Faqat nomzodlar bilan ishlash vakolati
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between text-xs font-bold text-purple-400">
                    <span>O'tish</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </div>
            </div>

            {/* Master Emergency Switches */}
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Favqulodda Master Sozlamalar</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Switch 1: Bypass Geozones */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">GPS Geozona Cheklovi</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {bypassGeozones ? "Cheklov o'chirilgan (Har yerdan tasdiqlanadi)" : "Qat'iy filial radiusi nazorati"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBypassGeozones}
                    className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${
                      bypassGeozones ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      bypassGeozones ? 'right-1' : 'left-1'
                    }`} />
                  </button>
                </div>

                {/* Switch 2: Waive Penalties */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">Kechikish Jarimalari</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {waivePenalties ? "Barcha jarimalar kechirilgan (0 UZS)" : "Standart mehnat kodeksi 30% chegarasi"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleWaivePenalties}
                    className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${
                      waivePenalties ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      waivePenalties ? 'right-1' : 'left-1'
                    }`} />
                  </button>
                </div>

                {/* Switch 3: System Maintenance */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">Texnik Ta'mirlash</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {systemMaintenance ? "Vaqtinchalik to'xtatilgan" : "Tizim to'liq faol"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleMaintenance}
                    className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${
                      systemMaintenance ? 'bg-rose-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      systemMaintenance ? 'right-1' : 'left-1'
                    }`} />
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: BARCHA HISOBLAR & PAROLLAR (MASTER CREDENTIALS VAULT) */}
        {/* ============================================================== */}
        {activeTab === 'credentials' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Barcha Hisoblar va Asl Parollar</h3>
                  <p className="text-[11px] text-slate-400">
                    Barcha foydalanuvchilar va xodimlarning parollarini ko'rish va o'zgartirish
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ism, login yoki rol bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-400 w-64"
                />
                <button
                  type="button"
                  onClick={loadAllAccounts}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700"
                  title="Qayta yuklash"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingAccounts ? 'animate-spin text-amber-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-700/80 text-[10px]">
                    <th className="py-3 px-4">Turi</th>
                    <th className="py-3 px-4">F.I.SH / Ism</th>
                    <th className="py-3 px-4">Login (Username)</th>
                    <th className="py-3 px-4">Maxfiy Parol</th>
                    <th className="py-3 px-4">Roli & Filiali</th>
                    <th className="py-3 px-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Hisoblar topilmadi
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc, idx) => {
                      const isRevealed = visiblePasswords[acc.username];
                      return (
                        <tr key={acc.username || idx} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              acc.type.includes('Admin') ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {acc.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            {acc.name}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {acc.username}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                                {isRevealed ? acc.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(acc.username)}
                                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md cursor-pointer"
                                title={isRevealed ? "Yashirish" : "Ko'rsatish"}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            <span className="text-white font-semibold">{acc.role}</span>
                            <span className="text-slate-500 text-[11px] block">{acc.branch}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenPasswordEdit(acc)}
                                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold rounded-lg transition-all border border-amber-500/30 text-[11px] cursor-pointer"
                              >
                                Parolni o'zgartirish
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onSwitchUser(acc.raw || acc);
                                }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-all border border-slate-700 text-[11px] cursor-pointer"
                                title="Ushbu hisob sifatida kirish"
                              >
                                Kirish
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: TELEGRAM XAVFSIZLIK BOTI (@FaolMaktab_uzbot) */}
        {/* ============================================================== */}
        {activeTab === 'telegram' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Telegram Xavfsizlik Boti: @FaolMaktab_uzbot
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Token: <code className="text-cyan-300 font-mono text-[11px]">8975567213:AAGDNAyKPKGNoIrBsipqAgASO88KEY6ThS4</code>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Bot Holati</span>
                  <span className="text-sm font-black text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Faol va Ulangan</span>
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">Yangi qurilmalar kirishi avtomatik yuboriladi</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Xabar Qabul Qiluvchilar</span>
                  <span className="text-sm font-black text-white">
                    {telegramStatus?.registeredChatIds?.length || 0} ta chat
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">Botga /start bosgan barcha adminlar</span>
                </div>
              </div>

              {/* Broadcast section */}
              <div className="mt-6 pt-5 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Barcha Adminlarga Favqulodda Signal Yuborish (Telegram Broadcast)
                </label>
                <textarea
                  rows={3}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="Favqulodda xabarnoma matnini yozing..."
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 outline-none focus:border-cyan-400 resize-none font-sans"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Xabar to'g'ridan-to'g'ri barcha ulangan Telegram hisoblarga yetkaziladi
                  </span>
                  <button
                    type="button"
                    onClick={handleSendTelegramBroadcast}
                    disabled={isSendingBroadcast}
                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-600/20 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSendingBroadcast ? "Yuborilmoqda..." : "Telegramga Yuborish"}</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: BAZA ZAXIRA & VAULT (DATABASE VAULT) */}
        {/* ============================================================== */}
        {activeTab === 'vault' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Tizim Ma'lumotlar Bazasini Mutlaq Zaxiralash (Vault)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Firebase Cloud Firestore: Xodimlar, Nomzodlar, Vakansiyalar, Davomat va Foydalanuvchilar
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">To'liq Bulut Zaxirasi (JSON Backup)</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg">
                    Barcha 6 ta asosiy to'plamdagi jami ma'lumotlarni 1 ta to'liq shifrlangan JSON fayl ko'rinishida kompyuteringizga yuklab oling.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadFullBackup}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Zaxirani Yuklab Olish</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between mt-4">
                <div>
                  <h4 className="font-bold text-white text-sm">Tizim Keshini Tozalash</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg">
                    Brauzerdagi vaqtinchalik xotira va eski kesh nusxalarini tozalab, bulut bazasi bilan 100% qayta sinxronizatsiya qilish.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('toyonasavdo_employees');
                    localStorage.removeItem('toyonasavdo_candidates');
                    localStorage.removeItem('toyonasavdo_vacancies');
                    localStorage.removeItem('toyonasavdo_system_history_v1');
                    showToast("Tizim keshi tozalandi va qayta yuklandi!");
                    setTimeout(() => window.location.reload(), 1000);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Keshni Tozalash</span>
                </button>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* MODAL: EDIT PASSWORD */}
      {editingAccount && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Key className="w-5 h-5" />
                <h3 className="font-bold text-white text-sm">Parolni O'zgartirish</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-300">
                Foydalanuvchi: <b className="text-white">{editingAccount.name}</b>
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Login: <b className="text-amber-300">{editingAccount.username}</b>
              </p>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Yangi Maxfiy Parol *
                </label>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Yangi parolni kiriting"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-300 font-mono outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {isSavingPassword ? "Saqlanmoqda..." : "Parolni Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
