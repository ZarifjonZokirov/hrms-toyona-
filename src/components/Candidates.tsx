import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, ChevronDown, Trash2, CheckCircle2, X, Phone, MapPin, 
  User, Calendar, Briefcase, UserCheck, GraduationCap, Building2, 
  Heart, Filter, RefreshCw, Loader2, Camera, Upload,
  FileText, Eye, Download, Image as ImageIcon, AlertCircle
} from 'lucide-react';
import { ToyonaBrand, ModuleHeaderLogo } from './Logo';
import { db, handleFirestoreError } from '../firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { exportToExcel, exportToPDF } from '../lib/export';
import { ExportButtons } from './ExportButtons';

export interface Candidate {
  id: string;
  fullName: string;
  fatherName?: string;
  jobPosition: string;
  position?: string;
  targetBranch?: string;
  region: string;
  address?: string;
  exactAddress?: string;
  phone1: string;
  phone2?: string;
  gender?: string;
  dob?: string;
  maritalStatus?: string;
  educationLevel?: string;
  graduationYear?: string;
  pastExperience?: string;
  status: string;
  submittedAt: string;
  date?: string;
  candidateMessage?: string;
  isViewed?: boolean;
  photoUrl?: string;
  passportFrontUrl?: string;
  passportBackUrl?: string;
}

export const POSITIONS_LIST = [
  "Sotuvchi maslahatchi",
  "Bosh sotuvchi maslahatchisi",
  "Kassir yordamchisi",
  "Shartnoma rasmiylashtirish bo‘limi bosh mutaxassisi",
  "Shartnoma rasmiylashtirish bo‘limi mutaxassisi",
  "Savdo bo‘limi boshlig‘i (Boshqaruvchi)",
  "Taklif va shikoyatlar bilan ishlash operatori",
  "Ombor sektori mudiri",
  "Ombor sektori mutaxassisi",
  "Oshpaz",
  "Oshxona ishchisi",
  "Hudud tozalovchi",
  "Haydovchi",
  "Kuryer",
  "Undiruv bo‘limi mutaxassisi",
  "Marketolog",
  "Targetolog",
  "SMM menejer",
  "Texnik",
  "Motion designer",
  "Copywriter"
];

export const BRANCHES_LIST = [
  "Turkiston filiali",
  "Navoiy filiali",
  "Istiqlol (Gorod) filiali",
  "Mingtut filiali",
  "Yakkatut filiali",
  "Bosh ofis",
  "Pop filiali",
  "Furqat filiali",
  "Buvayda filiali",
  "Yangiqo'rg'on (Buvayda) filiali",
  "Yaypan filiali",
  "Marg'ilon filiali",
  "Toshkent Chilonzor filiali"
];

export const EDUCATION_LEVELS_LIST = [
  "O'rta ma'lumot",
  "O'rta-maxsus (Kollej/Litsey)",
  "Tugallanmagan oliy",
  "Oliy (Bakalavr)",
  "Oliy (Magistratura / PhD)"
];

const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="fixed bottom-6 right-6 z-[60] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3"
    >
      <CheckCircle2 className="w-5 h-5 text-[#00A651]" />
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
};

export default function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedEducation, setSelectedEducation] = useState('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isHiring, setIsHiring] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewImage) {
        setPreviewImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage]);

  const fetchCandidates = async () => {
    setIsRefreshing(true);
    try {
      let list: Candidate[] = [];

      // 1. Backend API orqali olish (eng ishonchli, to'liq ma'lumotlar va fotosuratlar)
      try {
        const res = await fetch('/api/candidates');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            list = data;
          }
        }
      } catch (apiErr) {
        console.warn("API candidates fetch notice:", apiErr);
      }

      // 2. Agar API dan bo'sh kelsa, bevosita Firebase SDK dan olish
      if (!list.length) {
        try {
          const { getFirebaseCandidates } = await import('../firebase');
          const fbCandidates = await getFirebaseCandidates();
          if (Array.isArray(fbCandidates) && fbCandidates.length > 0) {
            list = fbCandidates;
          }
        } catch (fbErr) {
          console.warn("Firebase candidates fetch notice:", fbErr);
        }
      }
      
      const normalized = list.map(c => {
        const passFront = 
          c.passportFrontUrl || 
          (c as any).passport_front_url || 
          (c as any).passport_front || 
          (c as any).passportFront || 
          (c as any).passFront || 
          (c as any).passportImage || 
          (c as any).passport_image || 
          (c as any).passportPhoto || 
          (c as any).passport1 || 
          '';

        const passBack = 
          c.passportBackUrl || 
          (c as any).passport_back_url || 
          (c as any).passport_back || 
          (c as any).passportBack || 
          (c as any).passBack || 
          (c as any).passport2 || 
          '';

        const photo = 
          c.photoUrl || 
          (c as any).photo_url || 
          (c as any).avatarUrl || 
          (c as any).photo || 
          '';

        return {
          ...c,
          id: c.id || (c as any).firestoreId || `cand_${Math.random()}`,
          fullName: c.fullName || (c as any).fio || (c as any).full_name || 'Noma\'lum',
          jobPosition: c.jobPosition || (c as any).position || (c as any).lavozim || (c as any).job_position || 'Noma\'lum',
          photoUrl: photo,
          passportFrontUrl: passFront,
          passportBackUrl: passBack,
        };
      });

      const combined = (normalized as Candidate[]).sort((a, b) => {
        const tA = new Date(a.submittedAt).getTime() || 0;
        const tB = new Date(b.submittedAt).getTime() || 0;
        return tB - tA;
      });

      setCandidates(combined);
    } catch (err) {
      console.warn("Candidates fetch notice:", err);
    } finally {
      setIsRefreshing(false);
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    const interval = setInterval(fetchCandidates, 10000); // 10s sync

    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'CANDIDATE_SUBMITTED') {
        fetchCandidates();
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('message', handleMessage);
    };
  }, []);
  
  const showToast = (msg: string) => setToastMessage(msg);

  const [isUploadingDoc, setIsUploadingDoc] = useState<string | null>(null);

  const handleDownloadImage = (url: string, filename: string) => {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleAttachDoc = async (field: 'photoUrl' | 'passportFrontUrl' | 'passportBackUrl', file: File) => {
    if (!selectedCandidate || !file) return;
    setIsUploadingDoc(field);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 1200;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            } else {
              resolve(e.target?.result as string);
            }
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const updated: Candidate = { ...selectedCandidate, [field]: base64 };
      setSelectedCandidate(updated);
      setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c));

      // Persist to Firebase Firestore
      const { saveFirebaseCandidate } = await import('../firebase');
      await saveFirebaseCandidate(updated);
      showToast("Rasm muvaffaqiyatli biriktirildi va saqlandi!");
    } catch (err) {
      console.error("Doc upload error:", err);
      showToast("Rasm yuklashda xatolik yuz berdi!");
    } finally {
      setIsUploadingDoc(null);
    }
  };
  const handleDirectHireCandidate = async (candidate: Candidate) => {
    setIsHiring(true);
    try {
      const { getFirebaseEmployees, saveFirebaseEmployee, saveFirebaseCandidate } = await import('../firebase');
      const existingEmps = await getFirebaseEmployees();
      const numericIds = existingEmps
        .map((e: any) => parseInt((e.staffId || '').replace(/\D/g, ''), 10))
        .filter((n: number) => !isNaN(n));
      const maxId = numericIds.length > 0 ? Math.max(...numericIds) : existingEmps.length;
      const nextStaffId = `TS-${String(maxId + 1).padStart(4, '0')}`;

      const newEmp: any = {
        id: `emp-${Date.now()}`,
        fullName: candidate.fullName || 'Yangi Xodim',
        position: candidate.jobPosition || candidate.position || 'Mutaxassis',
        department: 'Savdo va Chakana',
        branch: candidate.targetBranch || candidate.region || 'Bosh ofis',
        phone: candidate.phone1 || candidate.phone2 || '+998 90 000 00 00',
        email: `${(candidate.fullName || 'xodim').toLowerCase().replace(/\s+/g, '.')}@toyona.uz`,
        hireDate: new Date().toISOString().split('T')[0],
        status: 'active',
        avatarUrl: candidate.photoUrl || '',
        staffId: nextStaffId,
        salary: '5,000,000 UZS',
        address: candidate.address || candidate.exactAddress || candidate.region || 'O\'zbekiston',
        birthDate: candidate.dob || '',
        gender: candidate.gender === 'Ayol' ? 'Ayol' : 'Erkak',
        educationLevel: candidate.educationLevel || 'Oliy',
        graduationYear: candidate.graduationYear || '',
        pastExperience: candidate.pastExperience || 'Nomzod arizasi orqali qabul qilingan',
        experienceYears: 1
      };

      await saveFirebaseEmployee(newEmp);

      const updatedCandidate = { ...candidate, status: 'Qabul qilingan' };
      await saveFirebaseCandidate(updatedCandidate);

      setCandidates(prev => prev.map(c => c.id === candidate.id ? updatedCandidate : c));
      setSelectedCandidate(null);
      showToast(`"${candidate.fullName}" muvaffaqiyatli ishga qabul qilindi va Xodimlar safiga qo'shildi (${nextStaffId})!`);
      window.dispatchEvent(new CustomEvent('hrms_employees_updated'));
    } catch (err: any) {
      console.error("Direct hire error:", err);
      showToast("Ishga qabul qilishda xatolik yuz berdi: " + (err.message || ''));
    } finally {
      setIsHiring(false);
    }
  };


  const filteredCandidates = candidates.filter(c => {
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = !q || 
      (c.fullName || '').toLowerCase().includes(q) ||
      (c.fatherName && c.fatherName.toLowerCase().includes(q)) ||
      (c.jobPosition && c.jobPosition.toLowerCase().includes(q)) ||
      (c.position && c.position.toLowerCase().includes(q)) ||
      (c.targetBranch && c.targetBranch.toLowerCase().includes(q)) ||
      (c.phone1 && c.phone1.includes(q)) ||
      (c.phone2 && c.phone2.includes(q)) ||
      (c.region && c.region.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.exactAddress && c.exactAddress.toLowerCase().includes(q)) ||
      (c.educationLevel && c.educationLevel.toLowerCase().includes(q));

    const matchesBranch = selectedBranch === 'all' || 
      (c.targetBranch && c.targetBranch.toLowerCase().includes(selectedBranch.toLowerCase()));
    
    const matchesPosition = selectedPosition === 'all' || 
      (c.jobPosition && c.jobPosition.toLowerCase().includes(selectedPosition.toLowerCase())) ||
      (c.position && c.position.toLowerCase().includes(selectedPosition.toLowerCase()));

    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;
    
    const matchesEducation = selectedEducation === 'all' || 
      (c.educationLevel && c.educationLevel.toLowerCase().includes(selectedEducation.toLowerCase()));

    return matchesSearch && matchesBranch && matchesPosition && matchesStatus && matchesEducation;
  });

  const isAnyFilterActive = searchQuery !== '' || selectedBranch !== 'all' || selectedPosition !== 'all' || selectedStatus !== 'all' || selectedEducation !== 'all';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedBranch('all');
    setSelectedPosition('all');
    setSelectedStatus('all');
    setSelectedEducation('all');
  };

  const confirmDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    const targetId = candidateToDelete.id;

    // Instant optimistic removal from UI
    setCandidates(prev => prev.filter(c => c.id !== targetId));
    if (selectedCandidate?.id === targetId) setSelectedCandidate(null);
    setCandidateToDelete(null);
    showToast("Nomzod muvaffaqiyatli o'chirildi");

    try {
      const { deleteFirebaseCandidate } = await import('../firebase');
      await deleteFirebaseCandidate(targetId);
    } catch (e) {
      console.warn("Delete firestore candidate error:", e);
    }
  };

  const handleExportCandidates = (type: 'excel' | 'pdf') => {
    const fileName = `Toyona_Nomzodlar_${new Date().toISOString().slice(0, 10)}`;
    const headers = ['№', 'F.I.O', 'Lavozim', 'Filial', 'Viloyat', 'Telefon', 'Status', 'Sana'];
    const data = filteredCandidates.map((c, i) => [
      i + 1,
      c.fullName,
      c.jobPosition || c.position || '-',
      c.targetBranch || '-',
      c.region || '-',
      c.phone1 || '-',
      c.status || '-',
      c.date || (c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('uz-UZ') : '-')
    ]);

    if (type === 'excel') {
      const excelData = filteredCandidates.map((c, i) => ({
        '№': i + 1,
        'F.I.O': c.fullName,
        'Lavozim': c.jobPosition || c.position || '-',
        'Filial': c.targetBranch || '-',
        'Viloyat': c.region || '-',
        'Manzil': c.address || c.exactAddress || '-',
        'Telefon 1': c.phone1 || '-',
        'Telefon 2': c.phone2 || '-',
        'Ma\'lumoti': c.educationLevel || '-',
        'Status': c.status || '-',
        'Sana': c.date || (c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('uz-UZ') : '-')
      }));
      exportToExcel(excelData, fileName);
    } else {
      exportToPDF(headers, data, fileName, "Toyona Savdo - Nomzodlar Ro'yxati");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative p-5">
      <AnimatePresence>
        {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      </AnimatePresence>

      {/* Module Header with Toyona Savdo Logo */}
      <ModuleHeaderLogo title="Nomzodlar Boshqaruvi" icon={UserCheck} />

      {/* Top Header Controls & Multi-Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 bg-slate-50/70 dark:bg-slate-800/50 mb-4">
        
        {/* First Row: Search & Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Universal Search */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="F.I.O, lavozim, filial, telefon, manzil..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Position filter */}
          <div className="relative">
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all appearance-none cursor-pointer"
            >
              <option value="all">Barcha lavozimlar (21 ta)</option>
              {POSITIONS_LIST.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Branch filter */}
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all appearance-none cursor-pointer"
            >
              <option value="all">Barcha filiallar (11 ta)</option>
              {BRANCHES_LIST.map((br) => (
                <option key={br} value={br}>{br}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all appearance-none cursor-pointer"
            >
              <option value="all">Barcha statuslar</option>
              <option value="Yangi nomzod">Yangi nomzod</option>
              <option value="Suhbat belgilangan">Suhbat belgilangan</option>
              <option value="Ko'rib chiqilmoqda">Ko'rib chiqilmoqda</option>
              <option value="Qabul qilingan">Qabul qilingan</option>
              <option value="Rad etilgan">Rad etilgan</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Action Row & Active filter indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-700/60">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00A651] animate-pulse"></span>
            <span className="text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm">
              Jami nomzodlar: <span className="text-[#ED1C24] font-black">{candidates.length} ta</span>
              {filteredCandidates.length !== candidates.length && (
                <span className="text-slate-500 dark:text-slate-400 font-normal text-xs ml-2">({filteredCandidates.length} ta filtr natijasi)</span>
              )}
            </span>

            {isAnyFilterActive && (
              <button
                onClick={resetAllFilters}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer ml-2 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Filtrlarni tozalash</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={fetchCandidates}
              title="Yangilash"
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00A651]' : ''}`} />
              <span>Yangilash</span>
            </button>

            {/* Excel va PDF Yuklab olish */}
            <ExportButtons 
              onExportExcel={() => handleExportCandidates('excel')}
              onExportPDF={() => handleExportCandidates('pdf')}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-slate-50/30 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="w-full text-left border-separate border-spacing-y-1 min-w-[1050px] px-2">
          <thead>
            <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="p-3 w-12 text-center">№</th>
              <th className="p-3">Nomzod F.I.O</th>
              <th className="p-3">Lavozim</th>
              <th className="p-3">Tanlangan Filial</th>
              <th className="p-3">Ma'lumoti</th>
              <th className="p-3">Viloyat & Manzil</th>
              <th className="p-3">Aloqa raqamlari</th>
              <th className="p-3">Status</th>
              <th className="p-3">Sana</th>
              <th className="p-3 w-20 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 dark:text-slate-200">
            {isInitialLoading ? (
              <tr>
                <td colSpan={10} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#00A651] animate-spin" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Nomzodlar arizalari yuklanmoqda...
                    </span>
                  </div>
                </td>
              </tr>
            ) : filteredCandidates.map((candidate, index) => (
              <motion.tr 
                key={`${candidate.id || index}-${index}`}
                whileHover={{ scale: 1.003 }}
                transition={{ duration: 0.15 }}
                onClick={() => setSelectedCandidate(candidate)}
                className="bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-700/60 cursor-pointer relative z-0 hover:z-10 rounded-lg group hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs"
              >
                <td className="p-3 text-slate-400 dark:text-slate-500 text-center font-mono text-xs rounded-l-lg border-y border-l border-slate-100 dark:border-slate-700/60">
                  #{index + 1}
                </td>
                <td className="p-3 border-y border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    {candidate.photoUrl ? (
                      <img 
                        src={candidate.photoUrl} 
                        alt={candidate.fullName} 
                        className="w-8 h-8 rounded-full object-cover border border-emerald-500/40 shadow-xs shrink-0 cursor-pointer hover:scale-110 transition-transform" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage({ url: candidate.photoUrl!, title: `${candidate.fullName} - Fotosurat` });
                        }}
                        title="Rasmni ochish"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {candidate.fullName ? candidate.fullName.charAt(0) : 'N'}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#00A651] transition-colors">{candidate.fullName}</div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {candidate.fatherName && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">otasi: {candidate.fatherName}</span>
                        )}
                        {Boolean(candidate.passportFrontUrl || candidate.passportBackUrl) && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800/80 flex items-center gap-0.5" title="Pasport nusxasi biriktirilgan">
                            <FileText className="w-2.5 h-2.5" />
                            Pasport
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-3 border-y border-slate-100 dark:border-slate-700/60">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                    {candidate.jobPosition || candidate.position || 'Ko\'rsatilmadi'}
                  </span>
                </td>
                <td className="p-3 border-y border-slate-100 dark:border-slate-700/60">
                  {candidate.targetBranch ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                      <Building2 className="w-3 h-3 text-blue-500" />
                      {candidate.targetBranch}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">Ixtiyoriy filial</span>
                  )}
                </td>
                <td className="p-3 border-y border-slate-100 dark:border-slate-700/60">
                  {candidate.educationLevel ? (
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{candidate.educationLevel}</span>
                      {candidate.graduationYear && (
                        <span className="text-slate-400 dark:text-slate-500 font-normal">({candidate.graduationYear})</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">Kiritilmagan</span>
                  )}
                </td>
                <td className="p-3 text-slate-600 dark:text-slate-300 border-y border-slate-100 dark:border-slate-700/60">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                    {candidate.region || 'Noma\'lum'}
                  </div>
                  {(candidate.address || candidate.exactAddress) && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={candidate.address || candidate.exactAddress}>
                      {candidate.address || candidate.exactAddress}
                    </div>
                  )}
                </td>
                <td className="p-3 border-y border-slate-100 dark:border-slate-700/60">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#00A651] shrink-0" />
                    {candidate.phone1 || '—'}
                  </div>
                  {candidate.phone2 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      {candidate.phone2}
                    </div>
                  )}
                </td>
                <td className="p-3 border-y border-slate-100 dark:border-slate-700/60">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold text-white tracking-wide bg-[#00BCD4]">
                    {candidate.status}
                  </span>
                </td>
                <td className="p-3 text-slate-500 dark:text-slate-400 text-xs border-y border-slate-100 dark:border-slate-700/60 whitespace-nowrap">
                  {candidate.submittedAt ? new Date(candidate.submittedAt).toLocaleDateString('uz-UZ') : '-'}
                </td>
                <td className="p-3 rounded-r-lg border-y border-r border-slate-100 dark:border-slate-700/60 text-right" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => setCandidateToDelete(candidate)}
                    title="Nomzodni o'chirish"
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        
        {!isInitialLoading && filteredCandidates.length === 0 && (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
            <UserCheck className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Qidiruv bo'yicha nomzodlar topilmadi</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">Filtr parametrlarini o'zgartirib ko'ring</span>
            {isAnyFilterActive && (
              <button
                onClick={resetAllFilters}
                className="mt-2 px-3 py-1.5 bg-[#00A651] text-white rounded-lg text-xs font-bold hover:bg-[#008d44] transition-colors"
              >
                Filtrlarni tozalash
              </button>
            )}
          </div>
        )}
      </div>

      {/* Candidate Details Modal */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setSelectedCandidate(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 shrink-0">
                <div className="flex items-center gap-3">
                  {selectedCandidate.photoUrl ? (
                    <img 
                      src={selectedCandidate.photoUrl} 
                      alt={selectedCandidate.fullName} 
                      className="w-12 h-12 rounded-xl object-cover border-2 border-[#00A651] shadow-md shrink-0 cursor-pointer hover:opacity-90"
                      onClick={() => setPreviewImage({ url: selectedCandidate.photoUrl!, title: `${selectedCandidate.fullName} - Fotosurat` })}
                      title="Kattalashtirib ko'rish"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00A651] to-emerald-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md">
                      {selectedCandidate.fullName ? selectedCandidate.fullName.charAt(0) : 'N'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {selectedCandidate.fullName} {selectedCandidate.fatherName ? `(${selectedCandidate.fatherName})` : ''}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{selectedCandidate.jobPosition}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-md text-xs font-bold text-white bg-[#00BCD4]">
                    {selectedCandidate.status}
                  </span>
                  <button 
                    onClick={() => setSelectedCandidate(null)} 
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-slate-700 dark:text-slate-300 text-sm">
                
                {/* ========================================================= */}
                {/* HUJJATLAR VA RASMLAR (3x4 FOTOSURAT VA PASPORT NUSXALARI) */}
                {/* ========================================================= */}
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#00A651]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        Hujjatlar va Rasmlar (Pasport va Fotosurat)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      {selectedCandidate.passportFrontUrl || selectedCandidate.passportBackUrl ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-[#00A651] dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Pasport nusxalari mavjud
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Pasport biriktirilmagan
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                    {/* 1. 3x4 FOTOSURAT */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex flex-col justify-between space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-blue-500" />
                          3x4 Fotosurat
                        </span>
                        {selectedCandidate.photoUrl ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Mavjud" />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">Yo'q</span>
                        )}
                      </div>

                      {selectedCandidate.photoUrl ? (
                        <div className="space-y-2">
                          <div 
                            onClick={() => setPreviewImage({ url: selectedCandidate.photoUrl!, title: `${selectedCandidate.fullName} - 3x4 Fotosurat` })}
                            className="relative group cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 h-36 bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                          >
                            <img 
                              src={selectedCandidate.photoUrl} 
                              alt="Fotosurat" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <span className="px-2 py-1 bg-white/90 text-slate-800 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm">
                                <Eye className="w-3 h-3 text-[#00A651]" />
                                Ko'rish
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ url: selectedCandidate.photoUrl!, title: `${selectedCandidate.fullName} - 3x4 Fotosurat` })}
                              className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-[#00A651]" />
                              Ko'rish
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadImage(selectedCandidate.photoUrl!, `${selectedCandidate.fullName}_foto.jpg`)}
                              className="p-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Yuklab olish"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-36 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-3 text-center space-y-2">
                          <Camera className="w-6 h-6 text-slate-400" />
                          <span className="text-[11px] text-slate-400 font-semibold">3x4 rasm yo'q</span>
                          <label className="cursor-pointer px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-[11px] font-bold rounded-lg border border-blue-200 dark:border-blue-800 transition-colors inline-flex items-center gap-1">
                            {isUploadingDoc === 'photoUrl' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            <span>Yuklash</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAttachDoc('photoUrl', f);
                              }} 
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* 2. PASPORT OLDI TOMONI */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex flex-col justify-between space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-cyan-500" />
                          Pasport (Oldi tomoni)
                        </span>
                        {selectedCandidate.passportFrontUrl ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Mavjud" />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">Yo'q</span>
                        )}
                      </div>

                      {selectedCandidate.passportFrontUrl ? (
                        <div className="space-y-2">
                          <div 
                            onClick={() => setPreviewImage({ url: selectedCandidate.passportFrontUrl!, title: `${selectedCandidate.fullName} - Pasport (Oldi tomoni - Asosiy sahifa)` })}
                            className="relative group cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 h-36 bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                          >
                            <img 
                              src={selectedCandidate.passportFrontUrl} 
                              alt="Pasport oldi" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <span className="px-2 py-1 bg-white/90 text-slate-800 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm">
                                <Eye className="w-3 h-3 text-cyan-600" />
                                Ko'rish
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ url: selectedCandidate.passportFrontUrl!, title: `${selectedCandidate.fullName} - Pasport (Oldi tomoni - Asosiy sahifa)` })}
                              className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-cyan-600" />
                              Ko'rish
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadImage(selectedCandidate.passportFrontUrl!, `${selectedCandidate.fullName}_pasport_oldi.jpg`)}
                              className="p-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Yuklab olish"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-36 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-3 text-center space-y-2">
                          <FileText className="w-6 h-6 text-slate-400" />
                          <span className="text-[11px] text-slate-400 font-semibold">Pasport oldi yo'q</span>
                          <label className="cursor-pointer px-2.5 py-1 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 text-[11px] font-bold rounded-lg border border-cyan-200 dark:border-cyan-800 transition-colors inline-flex items-center gap-1">
                            {isUploadingDoc === 'passportFrontUrl' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            <span>Yuklash</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAttachDoc('passportFrontUrl', f);
                              }} 
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* 3. PASPORT ORQA TOMONI / PROPISKA */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex flex-col justify-between space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          Pasport (Orqa/Propiska)
                        </span>
                        {selectedCandidate.passportBackUrl ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Mavjud" />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">Yo'q</span>
                        )}
                      </div>

                      {selectedCandidate.passportBackUrl ? (
                        <div className="space-y-2">
                          <div 
                            onClick={() => setPreviewImage({ url: selectedCandidate.passportBackUrl!, title: `${selectedCandidate.fullName} - Pasport (Orqa tomoni / Propiska)` })}
                            className="relative group cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 h-36 bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                          >
                            <img 
                              src={selectedCandidate.passportBackUrl} 
                              alt="Pasport orqasi" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <span className="px-2 py-1 bg-white/90 text-slate-800 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm">
                                <Eye className="w-3 h-3 text-indigo-600" />
                                Ko'rish
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ url: selectedCandidate.passportBackUrl!, title: `${selectedCandidate.fullName} - Pasport (Orqa tomoni / Propiska)` })}
                              className="flex-1 py-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-indigo-600" />
                              Ko'rish
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadImage(selectedCandidate.passportBackUrl!, `${selectedCandidate.fullName}_pasport_orqa.jpg`)}
                              className="p-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Yuklab olish"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-36 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-3 text-center space-y-2">
                          <FileText className="w-6 h-6 text-slate-400" />
                          <span className="text-[11px] text-slate-400 font-semibold">Pasport orqasi yo'q</span>
                          <label className="cursor-pointer px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[11px] font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors inline-flex items-center gap-1">
                            {isUploadingDoc === 'passportBackUrl' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            <span>Yuklash</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAttachDoc('passportBackUrl', f);
                              }} 
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1. Shaxsiy ma'lumotlar */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#00A651]" />
                    <span>1. Shaxsiy ma'lumotlar</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">F.I.O</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{selectedCandidate.fullName}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Otasining ismi</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{selectedCandidate.fatherName || 'Ko\'rsatilmadi'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Jinsi</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{selectedCandidate.gender || 'Erkak'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Tug'ilgan yili / sana</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{selectedCandidate.dob || 'Ko\'rsatilmadi'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Oilaviy holati</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        {selectedCandidate.maritalStatus || 'Ko\'rsatilmadi'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Ariza topshirilgan sana</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {new Date(selectedCandidate.submittedAt).toLocaleString('uz-UZ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Tanlangan lavozim va Filial */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>2. Ish o'rni va Filial</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block">Tanlangan Lavozim (21 tadan biri)</span>
                      <span className="font-bold text-emerald-900 dark:text-emerald-200 text-base mt-0.5 block">{selectedCandidate.jobPosition}</span>
                    </div>
                    <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/40">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block">Ishlamoqchi bo'lgan filiali (11 tadan biri)</span>
                      <span className="font-bold text-blue-900 dark:text-blue-200 text-base mt-0.5 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        {selectedCandidate.targetBranch || 'Ixtiyoriy / Ko\'rsatilmadi'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Ma'lumoti va Ilmiy darajasi */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>3. Ma'lumoti va darajasi</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 block">Ma'lumoti / Ilmiy darajasi</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5 block">
                        {selectedCandidate.educationLevel || 'Ko\'rsatilmadi'}
                      </span>
                    </div>
                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 block">O'qishni tugatgan yili</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5 block">
                        {selectedCandidate.graduationYear || 'Ko\'rsatilmadi'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Yashash manzili va Aloqa raqamlari */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    <span>4. Yashash manzili va Aloqa</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Viloyat / Hudud</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{selectedCandidate.region || 'Ko\'rsatilmadi'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Aniq yashash manzili (ko'cha, uy)</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{selectedCandidate.address || 'Ko\'rsatilmadi'}</span>
                    </div>
                    <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block">Asosiy telefon (Aloqa 1)</span>
                      <span className="font-bold text-emerald-900 dark:text-emerald-200 text-base">{selectedCandidate.phone1 || 'Ko\'rsatilmadi'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">Qo'shimcha telefon (Aloqa 2)</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{selectedCandidate.phone2 || 'Ko\'rsatilmadi'}</span>
                    </div>
                  </div>
                </div>

                {/* 5. Ish tajribasi / Xabar */}
                {selectedCandidate.pastExperience && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                      Oldingi ish tajribasi va qo'shimcha ma'lumot
                    </span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedCandidate.pastExperience}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  ID: <span className="font-mono">{selectedCandidate.id}</span>
                </span>
                <div className="flex items-center gap-2">
                  {selectedCandidate.status !== 'Qabul qilingan' && (
                    <button
                      type="button"
                      onClick={() => handleDirectHireCandidate(selectedCandidate)}
                      disabled={isHiring}
                      className="px-4 py-2 bg-[#00A651] hover:bg-[#008d44] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#00A651]/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isHiring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                      <span>Ishga qabul qilish (Xodimlarga qo'shish)</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Yopish
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION CARD IN THE CENTER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {candidateToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 relative"
            >
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/40">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Rostdan ham o'chirilsinmi?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Ushbu nomzod anketasini o'chirib tashlamoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">
                <div className="font-bold text-slate-800 dark:text-slate-100">{candidateToDelete.fullName}</div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                  {candidateToDelete.jobPosition} • {candidateToDelete.targetBranch || candidateToDelete.region}
                </div>
                {candidateToDelete.phone1 && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    {candidateToDelete.phone1}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCandidateToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteCandidate}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Ha, o'chirilsin
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Telegram/Instagram Style Photo Lightbox Preview */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
              onClick={() => setPreviewImage(null)}
            />
            
            {/* Top Close Bar */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer backdrop-blur-md shadow-lg"
                title="Yopish (Esc)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {previewImage.title && (
              <div className="absolute top-5 left-6 text-white/90 text-sm font-semibold tracking-wide truncate max-w-[70vw] z-20 drop-shadow-md">
                {previewImage.title}
              </div>
            )}

            {/* Centered Image */}
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative max-w-[92vw] max-h-[85vh] flex items-center justify-center z-10"
              onClick={() => setPreviewImage(null)}
            >
              <img
                src={previewImage.url}
                alt={previewImage.title || "Nomzod rasmi"}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-white/15"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
