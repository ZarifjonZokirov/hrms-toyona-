import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  Lock,
  ShieldAlert,
  Check,
  Eye,
  Clock,
  Calendar,
  Building2,
  User,
  ArrowRight,
  FileText,
  Loader2,
  UserCheck,
  Briefcase
} from 'lucide-react';
import { UserItem } from './UsersManagement';
import { 
  getFirebaseTransfers, 
  saveFirebaseTransfer, 
  deleteFirebaseTransfer, 
  saveFirebaseEmployee, 
  getFirebaseEmployees,
  getFirebaseBranches,
  getFirebaseGeozones,
  getFirebaseCandidates
} from '../firebase';
import { DEFAULT_GEOZONES } from './BranchGeozones';
import { BRANCHES_LIST, POSITIONS_LIST } from './Candidates';
import { recordSystemHistory } from './SystemHistory';

export const REGIONS_LIST = [
  "Farg'ona viloyati",
  "Andijon viloyati",
  "Namangan viloyati",
  "Toshkent shahri",
  "Toshkent viloyati",
  "Samarqand viloyati",
  "Buxoro viloyati",
  "Qashqadaryo viloyati",
  "Surxondaryo viloyati",
  "Xorazm viloyati",
  "Navoiy viloyati",
  "Jizzax viloyati",
  "Sirdaryo viloyati"
];
import { exportToExcel, exportToPDF } from '../lib/export';
import { ExportButtons } from './ExportButtons';

export interface TransferItem {
  id: string;
  num: number;
  fio: string;
  filial: string;
  viloyat: string;
  kategoriya: string;
  qaysiLavozimdan: string;
  qaysiLavozimga: string;
  status: 'Yakunlangan' | 'Kutilmoqda' | 'Hujjatlashtirish' | 'Bekor qilingan' | 'Suhbatga qo\'yilgan';
  sana: string;
  boshlanganSana?: string;
  yakunlanganSana?: string;
  sababi?: string;
  tasdiqlovchi?: string;
}

const INITIAL_TRANSFERS: TransferItem[] = [];

const Toast = ({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'warning'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3200);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.95 }}
      className={`fixed bottom-6 right-6 z-[80] px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border ${
        type === 'warning' 
          ? 'bg-amber-900 text-amber-100 border-amber-800' 
          : 'bg-slate-900 text-white border-slate-800'
      }`}
    >
      {type === 'warning' ? (
        <ShieldAlert className="w-5 h-5 text-amber-400" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-[#70B42C]" />
      )}
      <span className="text-xs font-semibold">{message}</span>
    </motion.div>
  );
};

interface TransfersProps {
  isSuperAdmin?: boolean;
  currentUser?: UserItem;
}

export default function Transfers({ isSuperAdmin, currentUser }: TransfersProps) {
  // Determine if current user is Super Admin
  const effectiveIsSuperAdmin = isSuperAdmin ?? (
    currentUser?.role === 'Super Admin' || 
    currentUser?.id === 1 
  );

  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [allBranches, setAllBranches] = useState<string[]>(BRANCHES_LIST);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allCandidates, setAllCandidates] = useState<any[]>([]);
  const [transferSourceType, setTransferSourceType] = useState<'employee' | 'candidate'>('employee');
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Barcha kategor...');
  const [selectedViloyat, setSelectedViloyat] = useState('Barcha viloyatlar...');
  const [selectedFilial, setSelectedFilial] = useState('Barcha filiallar...');

  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<TransferItem | null>(null);
  
  // Detail modal state: "ustiga bossa toliq informatsiya chiqsin qachon boshlangan va qachon yakunlangan"
  const [selectedDetailTransfer, setSelectedDetailTransfer] = useState<TransferItem | null>(null);

  // Direct status dropdown popover for Super Admin
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);

  // Delete confirm modal state
  const [deletingTransfer, setDeletingTransfer] = useState<TransferItem | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'warning' } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<TransferItem>>({
    fio: '',
    filial: BRANCHES_LIST[0] || "Turkiston filiali",
    viloyat: "Farg'ona viloyati",
    kategoriya: "Savdo bo'limi",
    qaysiLavozimdan: '',
    qaysiLavozimga: '',
    status: 'Kutilmoqda',
    sana: '14.9.2026',
    boshlanganSana: '',
    yakunlanganSana: '',
    sababi: '',
    tasdiqlovchi: ''
  });

  useEffect(() => {
    let active = true;

    // Filiallarni Firebase (branches + geozones) va DEFAULT ro'yxatdan to'liq olib birlashtirish
    async function loadBranchesAndEmployees() {
      try {
        const [fbBranches, fbGeozones, fbEmps, fbCandidates] = await Promise.all([
          getFirebaseBranches().catch(() => []),
          getFirebaseGeozones().catch(() => []),
          getFirebaseEmployees().catch(() => []),
          getFirebaseCandidates().catch(() => [])
        ]);
        if (!active) return;

        const branchNames = new Set<string>(BRANCHES_LIST);
        DEFAULT_GEOZONES.forEach(g => branchNames.add(g.name));
        (fbBranches || []).forEach((b: any) => {
          const name = b.name || b.nameUz;
          if (name) branchNames.add(name);
        });
        (fbGeozones || []).forEach((g: any) => {
          if (g.name) branchNames.add(g.name);
        });
        (fbEmps || []).forEach((e: any) => {
          if (e.branch) branchNames.add(e.branch);
        });

        const sortedBranches = Array.from(branchNames).filter(Boolean).sort();
        setAllBranches(sortedBranches);
        setAllEmployees(fbEmps || []);
        setAllCandidates(fbCandidates || []);
      } catch (err) {
        console.error("Error loading branches/employees in Transfers:", err);
      }
    }
    loadBranchesAndEmployees();

    async function syncTransfers() {
      setIsLoading(true);
      try {
        const fbTransfers = await getFirebaseTransfers();
        if (!active) return;
        
        if (fbTransfers && Array.isArray(fbTransfers) && fbTransfers.length > 0) {
          setTransfers(fbTransfers as TransferItem[]);
        } else {
          setTransfers([]);
        }
      } catch (error) {
        console.error("Transfers sync error:", error);
        if (active) setTransfers([]);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    syncTransfers();

    const handleTransfersUpdated = () => {
      syncTransfers();
      loadBranchesAndEmployees();
    };
    window.addEventListener('hrms_transfers_updated', handleTransfersUpdated);
    window.addEventListener('hrms_employees_updated', loadBranchesAndEmployees);

    return () => { 
      active = false;
      window.removeEventListener('hrms_transfers_updated', handleTransfersUpdated);
      window.removeEventListener('hrms_employees_updated', loadBranchesAndEmployees);
    };
  }, []);

  // Dynamic filter options - endi barcha real kiritilgan filiallar to'liq chiqadi!
  const filiallarList = useMemo(() => {
    const list = new Set<string>();
    allBranches.forEach(b => list.add(b));
    transfers.forEach(t => { if (t.filial) list.add(t.filial); });
    return ['Barcha filiallar...', ...Array.from(list).sort()];
  }, [allBranches, transfers]);

  const viloyatlarList = useMemo(() => {
    const list = new Set<string>();
    REGIONS_LIST.forEach(r => list.add(r));
    transfers.forEach(t => { if (t.viloyat) list.add(t.viloyat); });
    return ['Barcha viloyatlar...', ...Array.from(list).sort()];
  }, [transfers]);

  const categoriesList = useMemo(() => {
    const list = new Set<string>();
    ['Savdo bo\'limi', 'Kassa va hisob-kitob', 'Omborxona va logistika', 'Ma\'muriyat', 'Xizmat ko\'rsatish'].forEach(c => list.add(c));
    transfers.forEach(t => { if (t.kategoriya) list.add(t.kategoriya); });
    return ['Barcha kategor...', ...Array.from(list).sort()];
  }, [transfers]);

  // Filtering and Auto-sorting Logic:
  // "otkazmalarda status yakunlagan bolsa avtomatik pastga yakunlangan deb tushib qolsin"
  const filteredTransfers = useMemo(() => {
    const filtered = transfers.filter(item => {
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = !q ||
        (item.fio || '').toLowerCase().includes(q) ||
        (item.filial || '').toLowerCase().includes(q) ||
        (item.qaysiLavozimdan || '').toLowerCase().includes(q) ||
        (item.qaysiLavozimga || '').toLowerCase().includes(q);

      const matchesCategory = selectedCategory === 'Barcha kategor...' || item.kategoriya === selectedCategory;
      const matchesViloyat = selectedViloyat === 'Barcha viloyatlar...' || item.viloyat === selectedViloyat;
      const matchesFilial = selectedFilial === 'Barcha filiallar...' || item.filial === selectedFilial;

      return matchesSearch && matchesCategory && matchesViloyat && matchesFilial;
    });

    // Avtomatik ravishda "Yakunlangan" statusidagilar ro'yxatning pastiga tushadi!
    return [...filtered].sort((a, b) => {
      const aDone = a.status === 'Yakunlangan';
      const bDone = b.status === 'Yakunlangan';
      if (aDone && !bDone) return 1; // Yakunlangan bo'lsa ro'yxat oxiriga (pastga)
      if (!aDone && bDone) return -1;
      return (b.num || 0) - (a.num || 0);
    });
  }, [transfers, searchQuery, selectedCategory, selectedViloyat, selectedFilial]);

  // Render Status Badge strictly matching the image
  const renderStatusBadge = (item: TransferItem, index: number = 0) => {
    const status = item.status;
    let badgeColor = 'bg-[#70B42C]';

    switch (status) {
      case 'Yakunlangan':
        badgeColor = 'bg-[#70B42C]';
        break;
      case 'Kutilmoqda':
        badgeColor = 'bg-[#C86428]';
        break;
      case 'Hujjatlashtirish':
        badgeColor = 'bg-[#C53030]';
        break;
      case 'Bekor qilingan':
        badgeColor = 'bg-[#E53E3E]';
        break;
      case 'Suhbatga qo\'yilgan':
        badgeColor = 'bg-[#4C6EF5]';
        break;
    }

    const handleClickBadge = () => {
      if (!effectiveIsSuperAdmin) {
        setToastMessage({
          text: "Statusni o'zgartirish faqat Super Admin (Zarifjon Zokirov)ga ruxsat etilgan!",
          type: 'warning'
        });
        return;
      }
      setActiveStatusDropdownId(prev => prev === item.id ? null : item.id);
    };

    return (
      <div className="relative inline-block">
        <button
          onClick={handleClickBadge}
          className={`inline-block px-3.5 py-1.5 rounded-lg text-white text-[12px] font-bold tracking-tight shadow-2xs text-center cursor-pointer transition-transform hover:scale-[1.02] ${badgeColor}`}
          title={effectiveIsSuperAdmin ? "Statusni o'zgartirish uchun bosing (Super Admin)" : "Faqat Super Admin tahrirlashi mumkin"}
        >
          {status}
        </button>

        {/* Quick status dropdown for Super Admin */}
        {effectiveIsSuperAdmin && activeStatusDropdownId === item.id && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setActiveStatusDropdownId(null)} 
            />
            {/* If it's one of the first 2 rows, open downwards (top-full mt-1.5) so it doesn't get cut off by table header / top edge. Otherwise open upwards (bottom-full mb-1.5) */}
            <div className={`absolute left-1/2 -translate-x-1/2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-left ${
              index < 2 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
            }`}>
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                Statusni tanlang
              </div>
              {(['Yakunlangan', 'Kutilmoqda', 'Hujjatlashtirish', 'Suhbatga qo\'yilgan', 'Bekor qilingan'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => {
                    handleQuickStatusChange(item.id, st);
                    setActiveStatusDropdownId(null);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    st === status ? 'text-[#00A651] font-bold bg-[#00A651]/10' : 'text-slate-700'
                  }`}
                >
                  <span>{st}</span>
                  {st === status && <Check className="w-3.5 h-3.5 text-[#00A651]" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const syncEmployeeBranchIfCompleted = async (transferItem: TransferItem) => {
    if (transferItem.status !== 'Yakunlangan') return;
    try {
      const emps = await getFirebaseEmployees();
      if (emps && emps.length > 0) {
        const targetEmp = emps.find((e: any) => 
          e.fullName.trim().toLowerCase() === transferItem.fio.trim().toLowerCase()
        );
        if (targetEmp) {
          targetEmp.branch = transferItem.filial;
          if (transferItem.qaysiLavozimga) {
            targetEmp.position = transferItem.qaysiLavozimga.replace(/\s*\(.*?\)\s*/g, '').trim() || targetEmp.position;
          }
          await saveFirebaseEmployee(targetEmp);
        }
      }
    } catch (e) {}
  };

  const handleQuickStatusChange = async (id: string, newStatus: TransferItem['status']) => {
    if (!effectiveIsSuperAdmin) {
      setToastMessage({
        text: "Statusni o'zgartirish faqat Super Adminga ruxsat etilgan!",
        type: 'warning'
      });
      return;
    }
    const now = new Date();
    const nowStr = `${now.toLocaleDateString('uz-UZ')}, ${now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;
    
    let updatedItem: TransferItem | null = null;
    setTransfers(prev => prev.map(t => {
      if (t.id === id) {
        const item: TransferItem = { 
          ...t, 
          status: newStatus,
          yakunlanganSana: newStatus === 'Yakunlangan' ? (t.yakunlanganSana || nowStr) : t.yakunlanganSana
        };
        updatedItem = item;
        return item;
      }
      return t;
    }));

    if (updatedItem) {
      await saveFirebaseTransfer(updatedItem);
      if ((updatedItem as TransferItem).status === 'Yakunlangan') {
        await syncEmployeeBranchIfCompleted(updatedItem);
      }
    }

    if (newStatus === 'Yakunlangan') {
      setToastMessage({ 
        text: `Status "Yakunlangan" ga o'tkazildi va avtomatik pastga tushirildi!`, 
        type: 'success' 
      });
    } else {
      setToastMessage({ text: `Status "${newStatus}" ga o'zgartirildi!`, type: 'success' });
    }
  };

  const handleOpenAddModal = () => {
    setEditingTransfer(null);
    const now = new Date();
    const nowStr = `${now.toLocaleDateString('uz-UZ')}, ${now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;
    setFormData({
      fio: '',
      filial: "Uchko'prik",
      viloyat: "Farg'ona",
      kategoriya: "Omborxona",
      qaysiLavozimdan: "Ombor sektori mutaxassisi",
      qaysiLavozimga: "Tovar teruvchi",
      status: 'Kutilmoqda',
      sana: "14.9.2026",
      boshlanganSana: nowStr,
      yakunlanganSana: '',
      sababi: "Ichki rotatsiya va tajriba oshirish",
      tasdiqlovchi: (currentUser as any)?.fullName || (currentUser as any)?.name || "Zarifjon Zokirov"
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (item: TransferItem) => {
    if (!effectiveIsSuperAdmin) {
      setToastMessage({
        text: "Tahrirlash va statusni o'zgartirish faqat Super Admin (Zarifjon Zokirov)ga ruxsat etilgan!",
        type: 'warning'
      });
      return;
    }
    setEditingTransfer(item);
    setFormData(item);
    setIsAddEditModalOpen(true);
  };

  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fio || !formData.qaysiLavozimdan || !formData.qaysiLavozimga) return;

    const now = new Date();
    const nowStr = `${now.toLocaleDateString('uz-UZ')}, ${now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;

    if (editingTransfer) {
      if (!effectiveIsSuperAdmin) {
        setToastMessage({
          text: "Tahrirlash huquqi faqat Super Adminga berilgan!",
          type: 'warning'
        });
        setIsAddEditModalOpen(false);
        return;
      }
      const updated: TransferItem = {
        ...editingTransfer,
        ...formData,
        yakunlanganSana: formData.status === 'Yakunlangan' 
          ? (formData.yakunlanganSana || editingTransfer.yakunlanganSana || nowStr) 
          : formData.yakunlanganSana
      } as TransferItem;

      setTransfers(prev => prev.map(t => t.id === editingTransfer.id ? updated : t));
      saveFirebaseTransfer(updated);
      if (updated.status === 'Yakunlangan') {
        syncEmployeeBranchIfCompleted(updated);
      }

      setToastMessage({ text: `O'tkazma ma'lumoti muvaffaqiyatli tahrirlandi!`, type: 'success' });
    } else {
      const maxNum = transfers.length > 0 ? Math.max(...transfers.map(t => t.num)) : 0;
      const newTransfer: TransferItem = {
        id: `tr-${Date.now()}`,
        num: maxNum + 1,
        fio: formData.fio || '',
        filial: formData.filial || "Uchko'prik",
        viloyat: formData.viloyat || "Farg'ona",
        kategoriya: formData.kategoriya || "Omborxona",
        qaysiLavozimdan: formData.qaysiLavozimdan || '',
        qaysiLavozimga: formData.qaysiLavozimga || '',
        status: (formData.status as any) || 'Kutilmoqda',
        sana: formData.sana || '14.9.2026',
        boshlanganSana: formData.boshlanganSana || nowStr,
        yakunlanganSana: formData.status === 'Yakunlangan' ? (formData.yakunlanganSana || nowStr) : '',
        sababi: formData.sababi || "Ichki rotatsiya va tajriba oshirish",
        tasdiqlovchi: (currentUser as any)?.fullName || (currentUser as any)?.name || "Zarifjon Zokirov"
      };
      setTransfers(prev => [newTransfer, ...prev]);
      saveFirebaseTransfer(newTransfer);
      if (newTransfer.status === 'Yakunlangan') {
        syncEmployeeBranchIfCompleted(newTransfer);
      }
      setToastMessage({ text: `Yangi o'tkazma muvaffaqiyatli qo'shildi!`, type: 'success' });
      recordSystemHistory({
        action: "Xodim o'tkazmasi (rotatsiyasi) kiritildi",
        module: 'Rotatsiya',
        type: 'create',
        performedBy: (currentUser as any)?.fullName || (currentUser as any)?.name || "Zarifjon Zokirov",
        role: (currentUser as any)?.role || "Super Admin",
        details: `Xodim: ${newTransfer.fio} (Filial: ${newTransfer.filial}, Lavozim: ${newTransfer.qaysiLavozimdan} -> ${newTransfer.qaysiLavozimga})`
      });
    }

    setIsAddEditModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingTransfer) return;
    if (!effectiveIsSuperAdmin) {
      setToastMessage({
        text: "O'tkazmani o'chirish faqat Super Adminga ruxsat etilgan!",
        type: 'warning'
      });
      setDeletingTransfer(null);
      return;
    }
    const removedItem = deletingTransfer;
    setTransfers(prev => {
      const updated = prev.filter(t => t.id !== removedItem.id);
      try {
        localStorage.setItem('hrms_transfers_v3', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    deleteFirebaseTransfer(removedItem.id).catch(console.error);
    try {
      window.dispatchEvent(new Event('hrms_transfers_updated'));
    } catch {}
    setToastMessage({ text: `O'tkazma ma'lumoti o'chirildi`, type: 'success' });
    recordSystemHistory({
      action: "Xodim o'tkazmasi o'chirildi",
      module: 'Rotatsiya',
      type: 'delete',
      performedBy: (currentUser as any)?.fullName || (currentUser as any)?.name || "Zarifjon Zokirov",
      role: (currentUser as any)?.role || "Super Admin",
      details: `O'tkazma ID: ${removedItem.id}, Xodim: ${removedItem.fio} rotatsiya ma'lumoti o'chirildi`
    });
    setDeletingTransfer(null);
  };

  const handleExportTransfers = (type: 'excel' | 'pdf') => {
    const fileName = `Toyona_Otkazmalar_${new Date().toISOString().slice(0, 10)}`;
    const headers = ['№', 'F.I.O', 'Filial', 'Viloyat', 'Kategoriya', 'Oldingi Lavozim', 'Yangi Lavozim', 'Status', 'Sana'];
    const data = filteredTransfers.map((t, i) => [
      i + 1,
      t.fio,
      t.filial,
      t.viloyat || '-',
      t.kategoriya || '-',
      t.qaysiLavozimdan,
      t.qaysiLavozimga,
      t.status,
      t.sana
    ]);

    if (type === 'excel') {
      const excelData = filteredTransfers.map((t, i) => ({
        '№': i + 1,
        'F.I.O': t.fio,
        'Filial': t.filial,
        'Viloyat': t.viloyat || '-',
        'Kategoriya': t.kategoriya || '-',
        'Oldingi Lavozim': t.qaysiLavozimdan,
        'Yangi Lavozim': t.qaysiLavozimga,
        'Status': t.status,
        'Sana': t.sana,
        'Boshlangan sana': t.boshlanganSana || '-',
        'Yakunlangan sana': t.yakunlanganSana || '-',
        'Sababi': t.sababi || '-',
        'Tasdiqlovchi': t.tasdiqlovchi || '-'
      }));
      exportToExcel(excelData, fileName);
    } else {
      exportToPDF(headers, data, fileName, "Toyona Savdo - Xodimlar O'tkazmalari (Rotatsiya)");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-100 p-6 space-y-6 relative font-sans text-slate-800">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <Toast 
            message={toastMessage.text} 
            type={toastMessage.type} 
            onClose={() => setToastMessage(null)} 
          />
        )}
      </AnimatePresence>

      {/* TOP BAR: Title + Search Pill + Dropdowns + Add Button (EXACT IMAGE LOOK) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left Side: Title & Search */}
        <div className="flex items-center gap-6 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">O'tkazmalar</h1>

          {/* Search Bar Pill */}
          <div className="relative w-64 sm:w-72">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Qidiruv"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-white border border-slate-200/90 rounded-full text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#70B42C]/20 focus:border-[#70B42C] transition-all shadow-2xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Filters + Add Button */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Dropdown 1: Barcha kategor... */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-600 text-xs font-normal py-2 pl-3.5 pr-8 rounded-lg focus:outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
            >
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Dropdown 2: Barcha viloyatlar... */}
          <div className="relative">
            <select
              value={selectedViloyat}
              onChange={(e) => setSelectedViloyat(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-600 text-xs font-normal py-2 pl-3.5 pr-8 rounded-lg focus:outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
            >
              {viloyatlarList.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Dropdown 3: Barcha filiallar... */}
          <div className="relative">
            <select
              value={selectedFilial}
              onChange={(e) => setSelectedFilial(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-600 text-xs font-normal py-2 pl-3.5 pr-8 rounded-lg focus:outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
            >
              {filiallarList.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Excel va PDF Yuklab olish */}
          <ExportButtons 
            onExportExcel={() => handleExportTransfers('excel')}
            onExportPDF={() => handleExportTransfers('pdf')}
          />

          {/* Add Transfer Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 bg-white border border-[#70B42C] text-[#70B42C] hover:bg-[#70B42C] hover:text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            <span>O'tkazma qo'shish+</span>
          </button>
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="w-full pt-2 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse table-auto min-w-[760px]">
          <thead>
            <tr className="border-b border-slate-100 text-[#8A92A6] text-[11px] font-semibold uppercase tracking-wider">
              <th className="py-3 px-2 w-8 text-left font-semibold">№</th>
              <th className="py-3 px-3 font-semibold">FIO</th>
              <th className="py-3 px-2 font-semibold">FILIAL</th>
              <th className="py-3 px-3 font-semibold">QAYSI LAVOZIMDAN</th>
              <th className="py-3 px-3 font-semibold">QAYSI LAVOZIMGA</th>
              <th className="py-3 px-3 font-semibold text-center">STATUS</th>
              <th className="py-3 px-2 font-semibold">SANA</th>
              <th className="py-3 px-2 font-semibold text-center">Harakatlar</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100/80 text-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#70B42C] animate-spin" />
                    <span className="text-xs font-semibold text-slate-500">
                      O'tkazmalar yuklanmoqda...
                    </span>
                  </div>
                </td>
              </tr>
            ) : filteredTransfers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                  Hech qanday o'tkazma topilmadi
                </td>
              </tr>
            ) : (
              filteredTransfers.map((item, index) => {
                const isCompleted = item.status === 'Yakunlangan';
                return (
                  <tr 
                    key={`${item.id || index}-${index}`} 
                    onClick={() => setSelectedDetailTransfer(item)}
                    className={`transition-colors cursor-pointer group ${
                      isCompleted 
                        ? 'bg-emerald-50/25 hover:bg-emerald-50/50' 
                        : 'hover:bg-slate-50/80'
                    }`}
                    title="Batafsil ma'lumotlarni ko'rish uchun bosing"
                  >
                    {/* № */}
                    <td className="py-3.5 px-2 text-[#8A92A6] text-xs font-normal">
                      #{item.num || index + 1}
                    </td>

                    {/* FIO */}
                    <td className="py-3.5 px-3 font-bold text-[#1E293B] text-[12px] sm:text-[13px] leading-tight group-hover:text-emerald-700 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span>{item.fio}</span>
                        {isCompleted && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100/70 text-emerald-700 font-semibold border border-emerald-200">
                            Yakunlangan
                          </span>
                        )}
                      </div>
                    </td>

                    {/* FILIAL */}
                    <td className="py-3.5 px-2 font-bold text-[#1E3A8A] text-[12px] sm:text-[13px] whitespace-nowrap">
                      {item.filial}
                    </td>

                    {/* QAYSI LAVOZIMDAN */}
                    <td className="py-3.5 px-3 text-[#64748B] font-normal text-[12px] sm:text-[13px]">
                      {item.qaysiLavozimdan}
                    </td>

                    {/* QAYSI LAVOZIMGA */}
                    <td className="py-3.5 px-3 text-[#64748B] font-normal text-[12px] sm:text-[13px]">
                      {item.qaysiLavozimga}
                    </td>

                    {/* STATUS */}
                    <td 
                      className="py-3.5 px-3 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderStatusBadge(item, index)}
                    </td>

                    {/* SANA */}
                    <td className="py-3.5 px-2 text-[#64748B] font-normal text-[12px] sm:text-[13px] whitespace-nowrap">
                      {item.sana}
                    </td>

                    {/* HARAKATLAR */}
                    <td 
                      className="py-3.5 px-2 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View Details icon */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDetailTransfer(item);
                          }}
                          className="p-1 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                          title="Batafsil ma'lumot (Qachon boshlangan va qachon yakunlangan)"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit icon */}
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className={`p-1 transition-colors cursor-pointer ${
                            effectiveIsSuperAdmin 
                              ? 'text-slate-600 hover:text-[#00A651]' 
                              : 'text-slate-300 hover:text-slate-400'
                          }`}
                          title={effectiveIsSuperAdmin ? "Tahrirlash va statusni o'zgartirish (Super Admin)" : "Faqat Super Admin tahrirlashi mumkin"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete icon */}
                        <button
                          onClick={() => {
                            if (!effectiveIsSuperAdmin) {
                              setToastMessage({
                                text: "O'chirish faqat Super Adminga ruxsat etilgan!",
                                type: 'warning'
                              });
                              return;
                            }
                            setDeletingTransfer(item);
                          }}
                          className={`p-1 transition-colors cursor-pointer ${
                            effectiveIsSuperAdmin 
                              ? 'text-slate-500 hover:text-rose-600' 
                              : 'text-slate-300 hover:text-slate-400'
                          }`}
                          title={effectiveIsSuperAdmin ? "O'chirish" : "Faqat Super Admin o'chira oladi"}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION CARD IN THE CENTER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {deletingTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 text-center space-y-4 relative"
            >
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">
                  Rostdan ham o'chirilsinmi?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ushbu o'tkazmani o'chirib tashlamoqchimisiz? Ma'lumot qayta tiklanmaydi.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-left text-xs font-semibold text-slate-700">
                <div>{deletingTransfer.fio}</div>
                <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                  {deletingTransfer.filial} — {deletingTransfer.sana}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingTransfer(null)}
                  className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Ha, o'chirish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* ADD / EDIT TRANSFER MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAddEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-base">
                    {editingTransfer ? "O'tkazmani Tahrirlash" : "O'tkazma Qo'shish"}
                  </h3>
                  {editingTransfer && (
                    <span className="text-[11px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Super Admin
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTransfer} className="space-y-3.5 text-xs font-semibold">
                {/* Turini tanlash: Mavjud xodim rotatsiyasi YOKI Nomzoddan ishga qabul qilish */}
                {!editingTransfer && (
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setTransferSourceType('employee');
                        setFormData({
                          ...formData,
                          fio: '',
                          qaysiLavozimdan: '',
                          qaysiLavozimga: '',
                          sababi: 'Ichki rotatsiya va tajriba oshirish'
                        });
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        transferSourceType === 'employee'
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <User className="w-3.5 h-3.5 text-[#00A651]" />
                      Mavjud xodim rotatsiyasi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferSourceType('candidate');
                        setFormData({
                          ...formData,
                          fio: '',
                          qaysiLavozimdan: 'Nomzod / Vakansiya',
                          qaysiLavozimga: '',
                          sababi: "Vakansiyadan xodimlikka qabul qilish"
                        });
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        transferSourceType === 'candidate'
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      Nomzoddan qabul qilish
                    </button>
                  </div>
                )}

                {/* Xodim yoki Nomzod tanlash */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700">
                      {transferSourceType === 'candidate' ? "Nomzod FIO *" : "Xodim FIO *"}
                    </label>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {transferSourceType === 'candidate' 
                        ? `${allCandidates.length} ta nomzod mavjud` 
                        : `${allEmployees.length} ta xodim mavjud`}
                    </span>
                  </div>

                  {transferSourceType === 'candidate' ? (
                    <select
                      value={formData.fio}
                      onChange={(e) => {
                        const val = e.target.value;
                        const cand = allCandidates.find(c => (c.name || c.fio || '') === val);
                        if (cand) {
                          setFormData({
                            ...formData,
                            fio: cand.name || cand.fio || val,
                            qaysiLavozimdan: "Nomzod / Vakansiya",
                            qaysiLavozimga: cand.jobPosition || cand.position || formData.qaysiLavozimga || '',
                            filial: cand.targetBranch || cand.branch || formData.filial,
                            viloyat: cand.region || formData.viloyat || "Farg'ona",
                            kategoriya: cand.department || formData.kategoriya || "Savdo bo'limi",
                            sababi: `Vakansiyadan ishga qabul qilish: ${cand.jobPosition || ''}`
                          });
                        } else {
                          setFormData({ ...formData, fio: val });
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#70B42C]/20 cursor-pointer"
                    >
                      <option value="">-- Nomzodni tanlang ({allCandidates.length} ta) --</option>
                      {allCandidates.map((cand, idx) => (
                        <option key={cand.id || idx} value={cand.name || cand.fio}>
                          {cand.name || cand.fio} — {cand.jobPosition || cand.position || 'Lavozim kiritilmagan'} ({cand.targetBranch || cand.branch || 'Bosh ofis'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <input
                        type="text"
                        required
                        list="employees-transfer-list"
                        placeholder="Xodim ismini yozing yoki tanlang..."
                        value={formData.fio}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = allEmployees.find(emp => (emp.fullName || '').toLowerCase() === val.toLowerCase());
                          if (matched) {
                            setFormData({
                              ...formData,
                              fio: matched.fullName,
                              qaysiLavozimdan: matched.position || formData.qaysiLavozimdan,
                              filial: matched.branch || formData.filial,
                              kategoriya: matched.department || formData.kategoriya
                            });
                          } else {
                            setFormData({ ...formData, fio: val });
                          }
                        }}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#70B42C]/20 focus:border-[#70B42C]"
                      />
                      <datalist id="employees-transfer-list">
                        {allEmployees.map(emp => (
                          <option key={emp.id || emp.fullName} value={emp.fullName}>
                            {emp.position ? `${emp.position} (${emp.branch || 'Bosh ofis'})` : emp.branch}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1">
                      {transferSourceType === 'candidate' ? "Qabul qilinadigan filial *" : "Qaysi filialga o'tkaziladi *"}
                    </label>
                    <select
                      value={formData.filial}
                      onChange={(e) => setFormData({ ...formData, filial: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#70B42C]/20 cursor-pointer"
                    >
                      {allBranches.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">Viloyat</label>
                    <select
                      value={formData.viloyat}
                      onChange={(e) => setFormData({ ...formData, viloyat: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#70B42C]/20 cursor-pointer"
                    >
                      {REGIONS_LIST.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1">Qaysi lavozimdan *</label>
                    <input
                      type="text"
                      required
                      placeholder="Masalan: Sotuvchi yoki Nomzod"
                      value={formData.qaysiLavozimdan}
                      onChange={(e) => setFormData({ ...formData, qaysiLavozimdan: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#70B42C]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">Qaysi lavozimga *</label>
                    <input
                      type="text"
                      required
                      list="positions-list"
                      placeholder="Yangi lavozimni tanlang yoki yozing"
                      value={formData.qaysiLavozimga}
                      onChange={(e) => setFormData({ ...formData, qaysiLavozimga: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#70B42C]/20"
                    />
                    <datalist id="positions-list">
                      {POSITIONS_LIST.map(pos => (
                        <option key={pos} value={pos} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1">
                      Status (Faqat Super Admin)
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#70B42C]/20"
                    >
                      <option value="Yakunlangan">Yakunlangan</option>
                      <option value="Kutilmoqda">Kutilmoqda</option>
                      <option value="Hujjatlashtirish">Hujjatlashtirish</option>
                      <option value="Bekor qilingan">Bekor qilingan</option>
                      <option value="Suhbatga qo'yilgan">Suhbatga qo'yilgan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">Sana</label>
                    <input
                      type="text"
                      placeholder="14.9.2026"
                      value={formData.sana}
                      onChange={(e) => setFormData({ ...formData, sana: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#70B42C]/20"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddEditModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#70B42C] hover:bg-[#609d26] text-white rounded-xl font-bold text-xs shadow-md shadow-[#70B42C]/20 cursor-pointer"
                  >
                    Saqlash
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* DETAILED TRANSFER INFO MODAL (QACHON BOSHLANGAN VA QACHON YAKUNLANGAN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedDetailTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                      O'tkazma to'liq ma'lumotlari
                    </h3>
                    <div className="text-xs text-slate-500">
                      ID: #{selectedDetailTransfer.num || 1} • {selectedDetailTransfer.filial}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDetailTransfer(null)}
                  className="p-1.5 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Employee card */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Xodim F.I.O</span>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">{selectedDetailTransfer.fio}</h4>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {selectedDetailTransfer.viloyat} • {selectedDetailTransfer.filial} ({selectedDetailTransfer.kategoriya})
                    </div>
                  </div>
                  <div>
                    {renderStatusBadge(selectedDetailTransfer)}
                  </div>
                </div>

                {/* Positions Transition */}
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100/70">
                  <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block mb-2">Lavozim o'zgarishi</span>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <div className="flex-1 bg-white p-2.5 rounded-lg border border-blue-200/60 text-slate-700">
                      <span className="text-[10px] text-slate-400 block font-normal">Avvalgi lavozim</span>
                      <span className="font-bold text-slate-800">{selectedDetailTransfer.qaysiLavozimdan}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="flex-1 bg-white p-2.5 rounded-lg border border-blue-200/60 text-slate-700">
                      <span className="text-[10px] text-slate-400 block font-normal">Yangi lavozim</span>
                      <span className="font-bold text-emerald-700">{selectedDetailTransfer.qaysiLavozimga}</span>
                    </div>
                  </div>
                </div>

                {/* CRITICAL: QACHON BOSHLANGAN VA QACHON YAKUNLANGAN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Boshlangan sana */}
                  <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/40 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-sky-700 font-bold text-xs">
                      <Clock className="w-4 h-4" />
                      <span>Qachon boshlangan</span>
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      {selectedDetailTransfer.boshlanganSana || selectedDetailTransfer.sana}
                    </div>
                    <div className="text-[11px] text-sky-700/80 font-medium">
                      Rasmiylashtirish ochilgan vaqt
                    </div>
                  </div>

                  {/* Yakunlangan sana */}
                  <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                    selectedDetailTransfer.status === 'Yakunlangan'
                      ? 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
                      : 'border-amber-200 bg-amber-50/40 text-amber-900'
                  }`}>
                    <div className={`flex items-center gap-1.5 font-bold text-xs ${
                      selectedDetailTransfer.status === 'Yakunlangan' ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {selectedDetailTransfer.status === 'Yakunlangan' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      <span>Qachon yakunlangan</span>
                    </div>
                    <div className="text-sm font-bold">
                      {selectedDetailTransfer.status === 'Yakunlangan'
                        ? (selectedDetailTransfer.yakunlanganSana || selectedDetailTransfer.sana)
                        : "Hali yakunlanmagan"}
                    </div>
                    <div className="text-[11px] font-medium opacity-80">
                      {selectedDetailTransfer.status === 'Yakunlangan'
                        ? "Muvaffaqiyatli yakunlangan"
                        : `Jarayonda (${selectedDetailTransfer.status})`}
                    </div>
                  </div>
                </div>

                {/* Additional Info: Sababi & Tasdiqlovchi */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">O'tkazma sababi</span>
                    <p className="text-slate-700 font-medium leading-relaxed">
                      {selectedDetailTransfer.sababi || "Xodim talabi va ichki kadrlar almashinuvi asosida"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <span className="text-slate-400 font-medium">Tasdiqlovchi mas'ul:</span>
                    <span className="font-bold text-slate-800">{selectedDetailTransfer.tasdiqlovchi || "Zarifjon Zokirov"}</span>
                  </div>
                </div>

                {/* Super admin action in modal: Mark as completed directly */}
                {effectiveIsSuperAdmin && selectedDetailTransfer.status !== 'Yakunlangan' && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        handleQuickStatusChange(selectedDetailTransfer.id, 'Yakunlangan');
                        const nowStr = `${new Date().toLocaleDateString('uz-UZ')}, ${new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;
                        setSelectedDetailTransfer({
                          ...selectedDetailTransfer,
                          status: 'Yakunlangan',
                          yakunlanganSana: nowStr
                        });
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Yakunlangan deb belgilash (avtomatik pastga tushadi)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {selectedDetailTransfer.status === 'Yakunlangan' 
                    ? "Status yakunlanganligi sababli ro'yxatning pastida turadi" 
                    : "Faol o'tkazma"}
                </span>
                <button
                  onClick={() => setSelectedDetailTransfer(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Yopish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
