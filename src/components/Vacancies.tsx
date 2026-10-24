import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Plus, Briefcase, Building2, MapPin, Users, UserCheck, 
  Trash2, Edit2, CheckCircle2, Clock, DollarSign, X, Phone, 
  ChevronRight, ArrowUpDown, UserX, AlertCircle, FileText, Check, Eye, Loader2
} from 'lucide-react';
import { POSITIONS_LIST, BRANCHES_LIST, Candidate } from './Candidates';
import { exportToExcel, exportToPDF } from '../lib/export';
import { ExportButtons } from './ExportButtons';
import { db, getFirebaseVacancies, saveFirebaseVacancy, deleteFirebaseVacancy } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface Vacancy {
  id: string;
  title: string;          // Job title / position (e.g. from 21 positions)
  branch: string;         // Branch name (e.g. Headquarters, Downtown Manhattan Branch, etc.)
  department: string;     // Department name (e.g. Sales & Retail, Kassalar va Moliya, etc.)
  headcount: number;      // Number of open quotas (e.g. 2)
  salaryRange: string;    // Salary (e.g. "4,000,000 - 6,000,000 USD")
  requirements: string;   // Requirements / descriptions
  status: 'Open' | 'Active' | 'Muzlatilgan' | 'To\'ldirilgan';
  createdAt: string;
}

// 21 ta asosiy ish o'rinlari va ularning tegishli bo'lim hamda filiallari
export const INITIAL_21_VACANCIES: Vacancy[] = [
  {
    id: 'vac-1',
    title: 'Senior Sales Representative',
    branch: 'Headquarters',
    department: 'Savdo bo\'limi',
    headcount: 3,
    salaryRange: '4,000,000 - 6,000,000 USD',
    requirements: 'Chakana savdo tajribasi, xaridorlarga xushmuomala xizmat ko\'rsatish',
    status: 'Active',
    createdAt: '01.09.2026'
  },
  {
    id: 'vac-2',
    title: 'Lead Sales Consultant',
    branch: 'Headquarters',
    department: 'Savdo bo\'limi',
    headcount: 1,
    salaryRange: '5,500,000 - 7,500,000 USD',
    requirements: 'Savdo zali boshqaruvi, tovarlar aylanmasi va inventarizatsiya',
    status: 'Open',
    createdAt: '02.09.2026'
  },
  {
    id: 'vac-3',
    title: 'Assistant Cashier',
    branch: 'Downtown Manhattan Branch',
    department: 'Kassalar va Moliya bo\'limi',
    headcount: 2,
    salaryRange: '3,800,000 - 5,000,000 USD',
    requirements: 'Kassa apparati, to\'lov terminallari va hisob-kitoblar aniqligi',
    status: 'Active',
    createdAt: '03.09.2026'
  },
  {
    id: 'vac-4',
    title: 'Contracts & Compliance Lead',
    branch: 'Headquarters',
    department: 'Shartnomalar bo\'limi',
    headcount: 1,
    salaryRange: '7,000,000 - 10,000,000 USD',
    requirements: 'Huquqiy hujjatlar, muddatli to\'lov shartnomalari tahlili',
    status: 'Active',
    createdAt: '04.09.2026'
  },
  {
    id: 'vac-5',
    title: 'Contracts Operations Specialist',
    branch: 'Westside Operations Hub',
    department: 'Shartnomalar bo\'limi',
    headcount: 2,
    salaryRange: '4,500,000 - 6,500,000 USD',
    requirements: 'Manage CRM contracts and customer billing workflows',
    status: 'Open',
    createdAt: '04.09.2026'
  },
  {
    id: 'vac-6',
    title: 'Store Operations Manager',
    branch: 'Brooklyn Logistics Center',
    department: 'Savdo bo\'limi',
    headcount: 1,
    salaryRange: '8,000,000 - 12,000,000 USD',
    requirements: 'Branch savdo rejasini bajarish, sotuvchilar jamoasini boshqarish',
    status: 'Active',
    createdAt: '05.09.2026'
  },
  {
    id: 'vac-7',
    title: 'Customer Support Specialist',
    branch: 'Headquarters',
    department: 'Mijozlar bilan ishlash bo\'limi',
    headcount: 2,
    salaryRange: '4,000,000 - 5,500,000 USD',
    requirements: 'Mijozlar bilan telefon orqali muloqot, CRM tizimida arizalar bilan ishlash',
    status: 'Open',
    createdAt: '06.09.2026'
  },
  {
    id: 'vac-8',
    title: 'Logistics & Warehouse Manager',
    branch: 'Headquarters',
    department: 'Omborxona va Logistika bo\'limi',
    headcount: 1,
    salaryRange: '7,000,000 - 9,500,000 USD',
    requirements: '1C Ombor tizimi, tovarlar qabul qilish va kirim-chiqim nazorati',
    status: 'Active',
    createdAt: '07.09.2026'
  },
  {
    id: 'vac-9',
    title: 'Inventory & Stock Specialist',
    branch: 'Queens Distribution Terminal',
    department: 'Omborxona va Logistika bo\'limi',
    headcount: 2,
    salaryRange: '4,000,000 - 5,500,000 USD',
    requirements: 'Yuklarni saralash, yorliqlash va inventarizatsiyada ishtirok etish',
    status: 'Open',
    createdAt: '07.09.2026'
  },
  {
    id: 'vac-10',
    title: 'Cafeteria Chef',
    branch: 'Headquarters',
    department: 'Oshxona va Xo\'jalik bo\'limi',
    headcount: 1,
    salaryRange: '4,500,000 - 6,500,000 USD',
    requirements: 'Prepare corporate cafeteria meals and enforce food safety protocols',
    status: 'Active',
    createdAt: '08.09.2026'
  },
  {
    id: 'vac-11',
    title: 'Kitchen Assistant',
    branch: 'Headquarters',
    department: 'Oshxona va Xo\'jalik bo\'limi',
    headcount: 1,
    salaryRange: '3,000,000 - 4,000,000 USD',
    requirements: 'Maintain hygiene and corporate kitchen inventory standards',
    status: 'Open',
    createdAt: '08.09.2026'
  },
  {
    id: 'vac-12',
    title: 'Facilities Custodian',
    branch: 'Downtown Manhattan Branch',
    department: 'Oshxona va Xo\'jalik bo\'limi',
    headcount: 2,
    salaryRange: '2,800,000 - 3,800,000 USD',
    requirements: 'Branch zali va hudud tozaligini ta\'minlash',
    status: 'Active',
    createdAt: '09.09.2026'
  },
  {
    id: 'vac-13',
    title: 'Corporate Driver',
    branch: 'Brooklyn Logistics Center',
    department: 'Logistika va Transport bo\'limi',
    headcount: 2,
    salaryRange: '4,500,000 - 6,000,000 USD',
    requirements: 'B va C toifali haydovchilik guvohnomasi, 3+ yil haydash tajribasi',
    status: 'Active',
    createdAt: '09.09.2026'
  },
  {
    id: 'vac-14',
    title: 'Dispatch Courier',
    branch: 'Westside Operations Hub',
    department: 'Logistika va Yetkazib berish bo\'limi',
    headcount: 3,
    salaryRange: '4,000,000 - 6,500,000 USD',
    requirements: 'Mijozlarga buyurtmalarni o\'z vaqtida yetkazish, shahar ko\'chalarini yaxshi bilish',
    status: 'Open',
    createdAt: '10.09.2026'
  },
  {
    id: 'vac-15',
    title: 'Accounts Receivable Specialist',
    branch: 'Headquarters',
    department: 'Undiruv bo\'limi',
    headcount: 2,
    salaryRange: '5,000,000 - 8,000,000 USD',
    requirements: 'Kechikkan to\'lovlar bo\'yicha mijozlar bilan muzokaralar olib borish',
    status: 'Active',
    createdAt: '10.09.2026'
  },
  {
    id: 'vac-16',
    title: 'Brand Marketing Specialist',
    branch: 'Headquarters',
    department: 'Marketing va Reklama bo\'limi',
    headcount: 1,
    salaryRange: '8,000,000 - 12,000,000 USD',
    requirements: 'Chakana savdo marketing strategiyasi, aksiyalar va mijozlar oqimi tahlili',
    status: 'Active',
    createdAt: '11.09.2026'
  },
  {
    id: 'vac-17',
    title: 'Performance Ads Specialist',
    branch: 'Headquarters',
    department: 'Marketing va Reklama bo\'limi',
    headcount: 1,
    salaryRange: '6,000,000 - 9,000,000 USD',
    requirements: 'Facebook Ads, Instagram, Telegram reklama kampaniyalari va ROAS nazorati',
    status: 'Open',
    createdAt: '11.09.2026'
  },
  {
    id: 'vac-18',
    title: 'Social Media Coordinator',
    branch: 'Headquarters',
    department: 'Marketing va Reklama bo\'limi',
    headcount: 1,
    salaryRange: '5,000,000 - 7,500,000 USD',
    requirements: 'Ijtimoiy tarmoqlar (Instagram, Telegram) kontent rejasi va postlar yozish',
    status: 'Active',
    createdAt: '12.09.2026'
  },
  {
    id: 'vac-19',
    title: 'Maintenance Technician',
    branch: 'Headquarters',
    department: 'Axborot Texnologiyalari (IT) bo\'limi',
    headcount: 1,
    salaryRange: '4,500,000 - 6,500,000 USD',
    requirements: 'Branch kompyuterlari, kassa printerlari va internet tarmoqlarini sozlash',
    status: 'Open',
    createdAt: '12.09.2026'
  },
  {
    id: 'vac-20',
    title: 'Motion Graphics Designer',
    branch: 'Headquarters',
    department: 'Marketing va Dizayn bo\'limi',
    headcount: 1,
    salaryRange: '7,000,000 - 11,000,000 USD',
    requirements: 'After Effects, Premiere Pro, ijtimoiy tarmoqlar uchun dinamik video roliklar',
    status: 'Active',
    createdAt: '13.09.2026'
  },
  {
    id: 'vac-21',
    title: 'Content & Copywriting Specialist',
    branch: 'Headquarters',
    department: 'Marketing va Kontent bo\'limi',
    headcount: 1,
    salaryRange: '5,000,000 - 7,000,000 USD',
    requirements: 'Savdo matnlari, banner shiorlari va reklama ssenariylari yaratish',
    status: 'Active',
    createdAt: '13.09.2026'
  }
];

export const DEPARTMENTS_LIST = [
  'Barcha bo\'limlar',
  'Savdo bo\'limi',
  'Kassalar va Moliya bo\'limi',
  'Shartnomalar bo\'limi',
  'Omborxona va Logistika bo\'limi',
  'Oshxona va Xo\'jalik bo\'limi',
  'Logistika va Transport bo\'limi',
  'Logistika va Yetkazib berish bo\'limi',
  'Undiruv bo\'limi',
  'Marketing va Reklama bo\'limi',
  'Marketing va Dizayn bo\'limi',
  'Marketing va Kontent bo\'limi',
  'Mijozlar bilan ishlash bo\'limi',
  'Axborot Texnologiyalari (IT) bo\'limi'
];

interface VacanciesProps {
  currentUser?: any;
  isSuperAdmin?: boolean;
  onNavigateToCandidates?: () => void;
}

export default function Vacancies({ currentUser, isSuperAdmin, onNavigateToCandidates }: VacanciesProps) {
  // Vacancies State with persistence
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Candidates list state
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [onlyWithCandidates, setOnlyWithCandidates] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVacancyForCandidates, setSelectedVacancyForCandidates] = useState<Vacancy | null>(null);
  const [vacancyToDelete, setVacancyToDelete] = useState<Vacancy | null>(null);
  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState<Candidate | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form for new vacancy
  const [formData, setFormData] = useState({
    title: POSITIONS_LIST[0] || '',
    branch: BRANCHES_LIST[0] || '',
    department: 'Savdo bo\'limi',
    headcount: 1,
    salaryRange: '4,000,000 - 6,000,000 USD',
    requirements: '',
    status: 'Active' as Vacancy['status']
  });

  // Fetch vacancies from Firebase
  useEffect(() => {
    let active = true;
    async function syncVacancies() {
      setIsLoading(true);
      try {
        const fbVacancies = await getFirebaseVacancies();
        if (!active) return;
        
        if (fbVacancies && fbVacancies.length > 0) {
          setVacancies(fbVacancies as Vacancy[]);
        } else {
          // If Firestore is empty, seed it with INITIAL_21_VACANCIES
          setVacancies(INITIAL_21_VACANCIES);
          for (const vac of INITIAL_21_VACANCIES) {
            await saveFirebaseVacancy(vac);
          }
        }
      } catch (error) {
        console.error("Vacancies sync error:", error);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    syncVacancies();
    return () => { active = false; };
  }, []);

  // Toast handler
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch candidates from API
  const fetchCandidates = async () => {
    setIsLoadingCandidates(true);
    try {
      const snap = await getDocs(collection(db, 'candidates'));
      const apiList = snap.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          fullName: d.fullName || d.fio || "Noma'lum",
          position: d.position || d.jobPosition || "Noma'lum",
          jobPosition: d.jobPosition || d.position || "Noma'lum",
          region: d.region || "Noma'lum",
          status: d.status || 'Yangi nomzod',
          date: d.date || new Date().toLocaleDateString('uz-UZ'),
          submittedAt: d.submittedAt || d.date || new Date().toISOString(),
          phone1: d.phone1 || d.phone || '',
          phone2: d.phone2 || '',
          targetBranch: d.targetBranch || d.branch || d.filial || '',
          fatherName: d.fatherName || '',
          exactAddress: d.exactAddress || d.address || '',
          maritalStatus: d.maritalStatus || '',
          educationLevel: d.educationLevel || '',
          graduationYear: d.graduationYear || '',
          gender: d.gender || 'Erkak',
          dob: d.dob || '',
          candidateMessage: d.candidateMessage || d.pastExperience || '',
          pastExperience: d.pastExperience || d.candidateMessage || '',
          isViewed: false
        } as Candidate;
      });
      setCandidates(apiList);
    } catch (err) {
      console.warn("Candidates fetch notice:", err);
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    const interval = setInterval(fetchCandidates, 10000); // 10s is enough for background sync

    return () => clearInterval(interval);
  }, []);

  const getMatchedCandidatesForVacancy = (vac: Vacancy): Candidate[] => {
    const normVJob = (vac.title || '').toLowerCase().trim().replace(/['`‘ʻ’]/g, '');
    const normVBranch = (vac.branch || '').toLowerCase().trim().replace(/['`‘ʻ’]/g, '');

    return candidates.filter(cand => {
      const candJob = (cand.jobPosition || cand.position || '').toLowerCase().trim().replace(/['`‘ʻ’]/g, '');
      const candBranch = (cand.targetBranch || cand.region || '').toLowerCase().trim().replace(/['`‘ʻ’]/g, '');
      
      const jobMatch = candJob.includes(normVJob) || normVJob.includes(candJob);
      const branchMatch = candBranch === '' || candBranch === 'barchasi' || candBranch === normVBranch || candBranch.includes(normVBranch) || normVBranch.includes(candBranch);
      
      return jobMatch && branchMatch;
    });
  };

  // Filtered Vacancies
  const filteredVacancies = useMemo(() => {
    return vacancies.filter(v => {
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = !q || 
        (v.title || '').toLowerCase().includes(q) ||
        (v.branch || '').toLowerCase().includes(q) ||
        (v.department || '').toLowerCase().includes(q) ||
        (v.requirements || '').toLowerCase().includes(q);

      const matchesBranch = selectedBranch === 'all' || v.branch === selectedBranch;
      const matchesDept = selectedDepartment === 'all' || v.department === selectedDepartment;
      const matchesStatus = selectedStatus === 'all' || v.status === selectedStatus;

      if (onlyWithCandidates) {
        const count = getMatchedCandidatesForVacancy(v).length;
        if (count === 0) return false;
      }

      return matchesSearch && matchesBranch && matchesDept && matchesStatus;
    });
  }, [vacancies, searchQuery, selectedBranch, selectedDepartment, selectedStatus, onlyWithCandidates, candidates]);

  // Handle Add Vacancy
  const handleCreateVacancy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("Please enter the job designation / title!");
      return;
    }

    const newVacancy: Vacancy = {
      id: `vac-${Date.now()}`,
      title: formData.title.trim(),
      branch: formData.branch,
      department: formData.department,
      headcount: Number(formData.headcount) || 1,
      salaryRange: formData.salaryRange.trim() || "Kelishilgan",
      requirements: formData.requirements.trim() || "Talablar suhbat jarayonida tushuntiriladi",
      status: formData.status,
      createdAt: new Date().toLocaleDateString('uz-UZ').replace(/\//g, '.')
    };

    setVacancies(prev => [newVacancy, ...prev]);
    saveFirebaseVacancy(newVacancy);
    setIsAddModalOpen(false);
    showToast(`"${newVacancy.title}" bo'sh ish o'rni yaratildi!`);

    // Reset form
    setFormData({
      title: POSITIONS_LIST[0] || '',
      branch: BRANCHES_LIST[0] || '',
      department: 'Savdo bo\'limi',
      headcount: 1,
      salaryRange: '4,000,000 - 6,000,000 USD',
      requirements: '',
      status: 'Active'
    });
  };

  // Handle Delete Vacancy
  const confirmDeleteVacancy = async () => {
    if (!vacancyToDelete) return;
    const deletedTitle = vacancyToDelete.title;
    setVacancies(prev => prev.filter(v => v.id !== vacancyToDelete.id));
    await deleteFirebaseVacancy(vacancyToDelete.id);
    if (selectedVacancyForCandidates?.id === vacancyToDelete.id) {
      setSelectedVacancyForCandidates(null);
    }
    setVacancyToDelete(null);
    showToast(`"${deletedTitle}" o'chirildi`);
  };

  // Stats calculation
  const totalSpots = useMemo(() => vacancies.reduce((acc, v) => acc + (v.headcount || 1), 0), [vacancies]);
  const vacanciesWithCandidatesCount = useMemo(() => {
    return vacancies.filter(v => getMatchedCandidatesForVacancy(v).length > 0).length;
  }, [vacancies, candidates]);

  const handleExportVacancies = (type: 'excel' | 'pdf') => {
    const fileName = `Toyona_Vakansiyalar_${new Date().toISOString().slice(0, 10)}`;
    const headers = ['№', 'Job Title', 'Branch', 'Department', 'Quota / Headcount', 'Salary', 'Status', 'Candidates', 'Sana'];
    const data = filteredVacancies.map((v, i) => {
      const candCount = getMatchedCandidatesForVacancy(v).length;
      return [
        i + 1,
        v.title,
        v.branch,
        v.department,
        `${v.headcount} ta`,
        v.salaryRange,
        v.status,
        `${candCount} ta`,
        v.createdAt
      ];
    });

    if (type === 'excel') {
      const excelData = filteredVacancies.map((v, i) => {
        const candCount = getMatchedCandidatesForVacancy(v).length;
        return {
          '№': i + 1,
          'Lavozim': v.title,
          'Branch': v.branch,
          'Department': v.department,
          'Kvota / Open o\'rin': v.headcount,
          'Salary Range': v.salaryRange,
          'Status': v.status,
          'Tegishli nomzodlar soni': candCount,
          'Talablar': v.requirements || '-',
          'Yaratilgan sana': v.createdAt
        };
      });
      exportToExcel(excelData, fileName);
    } else {
      exportToPDF(headers, data, fileName, "Toyona Savdo - Bo'sh Ish O'rinlari (Vakansiyalar)");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden relative p-5 select-none font-sans">
      
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[80] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700"
          >
            <CheckCircle2 className="w-5 h-5 text-[#00A651]" />
            <span className="text-xs font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER STRIP */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-[#00A651]/10 text-[#00A651] rounded-xl">
              <Briefcase className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Bo'sh Ish O'rinlari (Vakansiyalar)
            </h1>
            <span className="ml-2 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#00A651]/15 text-[#00A651] border border-[#00A651]/20">
              {vacancies.length} ta ish o'rni
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Excel va PDF Yuklab olish */}
          <ExportButtons 
            onExportExcel={() => handleExportVacancies('excel')}
            onExportPDF={() => handleExportVacancies('pdf')}
          />

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#00A651] hover:bg-[#008d44] text-white text-xs font-bold rounded-xl shadow-md shadow-[#00A651]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Bo'sh Ish O'rni Yaratish</span>
          </button>
        </div>
      </div>

      {/* COMPACT INTERACTIVE STATUS FILTER PILLS (HR talabiga binoan ixcham status filtri) */}
      <div className="bg-slate-50/80 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 my-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">Holat:</span>
          
          <button
            type="button"
            onClick={() => { setSelectedStatus('all'); setOnlyWithCandidates(false); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === 'all' && !onlyWithCandidates
                ? 'bg-[#00A651] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Barchasi ({vacancies.length})
          </button>

          <button
            type="button"
            onClick={() => { setSelectedStatus('Open'); setOnlyWithCandidates(false); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === 'Open'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Open ({vacancies.filter(v => v.status === 'Open').length})
          </button>

          <button
            type="button"
            onClick={() => { setSelectedStatus('Active'); setOnlyWithCandidates(false); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === 'Active'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Active ({vacancies.filter(v => v.status === 'Active').length})
          </button>

          <button
            type="button"
            onClick={() => { setSelectedStatus('Muzlatilgan'); setOnlyWithCandidates(false); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === 'Muzlatilgan'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Muzlatilgan ({vacancies.filter(v => v.status === 'Muzlatilgan').length})
          </button>

          <button
            type="button"
            onClick={() => setOnlyWithCandidates(!onlyWithCandidates)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              onlyWithCandidates
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Nomzodi borlar ({vacanciesWithCandidatesCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
            Jami shtat kvotasi: <b>{totalSpots} ta o'rin</b>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
            Nomzodlar bazasi: <b>{candidates.length} nafar</b>
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-slate-50/70 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 mb-3 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by position, branch, department or qualifications..."
            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
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

        <div className="flex items-center flex-wrap gap-2">
          {/* Branch filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-[#00A651] cursor-pointer"
          >
            <option value="all">All Branches</option>
            {BRANCHES_LIST.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Department filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-[#00A651] cursor-pointer"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS_LIST.filter(d => d !== 'Barcha bo\'limlar').map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {(searchQuery || selectedBranch !== 'all' || selectedDepartment !== 'all' || selectedStatus !== 'all' || onlyWithCandidates) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedBranch('all');
                setSelectedDepartment('all');
                setSelectedStatus('all');
                setOnlyWithCandidates(false);
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tozalash</span>
            </button>
          )}
        </div>
      </div>

      {/* ROW-BY-ROW TABLE / LIST (HR talabiga ko'ra sof jadval) */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">Bo'sh Ish O'rni (Lavozim)</th>
              <th className="py-3 px-4">Branch</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4 text-center">Kvota / Shtat</th>
              <th className="py-3 px-4">Salary</th>
              <th className="py-3 px-4 text-center">Kelgan Nomzodlar</th>
              <th className="py-3 px-4 text-center">Holat</th>
              <th className="py-3 px-4 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#00A651] animate-spin" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Vakansiyalar ro'yxati yuklanmoqda...
                    </span>
                  </div>
                </td>
              </tr>
            ) : filteredVacancies.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600 dark:text-slate-400">Mos keluvchi ish o'rinlari topilmadi</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Filtr parametrlarini o'zgartirib ko'ring yoki yangi ish o'rni qo'shing</p>
                </td>
              </tr>
            ) : (
              filteredVacancies.map((vacancy, index) => {
                const matched = getMatchedCandidatesForVacancy(vacancy);
                const hasCandidates = matched.length > 0;

                return (
                  <tr
                    key={`${vacancy.id || index}-${index}`}
                    onClick={() => setSelectedVacancyForCandidates(vacancy)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    {/* Index */}
                    <td className="py-3.5 px-4 text-center text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                      {index + 1}
                    </td>

                    {/* Job Title */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#00A651]/10 text-[#00A651] flex items-center justify-center shrink-0 border border-[#00A651]/20">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100 text-[13px] group-hover:text-[#00A651] transition-colors flex items-center gap-1.5">
                            <span>{vacancy.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 max-w-xs mt-0.5">
                            {vacancy.requirements}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{vacancy.branch}</span>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium text-[11px]">
                        <Building2 className="w-3 h-3 text-blue-500" />
                        <span>{vacancy.department}</span>
                      </div>
                    </td>

                    {/* Headcount */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        {vacancy.headcount} ta o'rin
                      </span>
                    </td>

                    {/* Salary */}
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {vacancy.salaryRange}
                    </td>

                    {/* Matched Candidates live status badge */}
                    <td className="py-3.5 px-4 text-center">
                      {hasCandidates ? (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVacancyForCandidates(vacancy);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#00A651] animate-pulse"></span>
                          <span>{matched.length}  candidates kelgan</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[11px] font-medium">
                          Nomzod yo'q
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        vacancy.status === 'Active' || vacancy.status === 'Open'
                          ? 'bg-[#00A651]/10 text-[#00A651] border border-[#00A651]/20'
                          : vacancy.status === 'Muzlatilgan'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {vacancy.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedVacancyForCandidates(vacancy)}
                          title="Ushbu ishga kelgan nomzodlarni ko'rish"
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#00A651] hover:bg-[#00A651]/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setVacancyToDelete(vacancy)}
                          title="Delete"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
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
      {/* MODAL 1: CANDIDATES FOR THIS SPECIFIC VACANCY AND BRANCH */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedVacancyForCandidates && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/80 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-[#00A651]/15 text-[#00A651] rounded-lg">
                      <Briefcase className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                      {selectedVacancyForCandidates.title}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 bg-[#00A651]/10 text-[#00A651] font-bold rounded-full border border-[#00A651]/20">
                      {selectedVacancyForCandidates.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Branch: <b className="text-slate-800 dark:text-slate-100">{selectedVacancyForCandidates.branch}</b>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      Department: <b className="text-slate-800 dark:text-slate-100">{selectedVacancyForCandidates.department}</b>
                    </span>
                    <span>•</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                      {selectedVacancyForCandidates.salaryRange}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedVacancyForCandidates(null)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Matched Candidates List */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {(() => {
                  const matched = getMatchedCandidatesForVacancy(selectedVacancyForCandidates);

                  if (matched.length === 0) {
                    return (
                      <div className="p-10 text-center flex flex-col items-center justify-center space-y-3 bg-slate-50/60 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                          <UserX className="w-7 h-7" />
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                          Ushbu filialdagi "{selectedVacancyForCandidates.title}" has no candidates yet
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                          Currently, <b className="text-slate-700 dark:text-slate-300">{selectedVacancyForCandidates.branch}</b> branchga ushbu lavozim bo'yicha ariza tushmagan. Nomzodlar anketani to'ldirishi bilan bu yerda bir zumda ko'rinadi.
                        </p>
                        <div className="pt-2 flex items-center gap-2">
                          <a
                            href="/anketa.html"
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-[#00A651] hover:bg-[#008d44] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Anketa Shaklini View / Test Qilish</span>
                          </a>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Total candidate applications for this position: <b className="text-[#00A651]">{matched.length}  candidates</b>
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          Ro'yxat jonli yangilanadi
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {matched.map((cand, candIdx) => (
                          <div
                            key={`${cand.id || candIdx}-${candIdx}`}
                            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:border-[#00A651]/40 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{cand.fullName}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-[#00A651] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                                  {cand.status}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                {cand.phone1 && (
                                  <a 
                                    href={`tel:${cand.phone1}`} 
                                    className="font-mono text-slate-700 dark:text-slate-300 hover:text-[#00A651] font-semibold flex items-center gap-1"
                                  >
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {cand.phone1}
                                  </a>
                                )}
                                <span>•</span>
                                <span>{cand.region || cand.address || "Manzil ko'rsatilmagan"}</span>
                                <span>•</span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                  Topshirgan sana: {new Date(cand.submittedAt).toLocaleDateString('uz-UZ')}
                                </span>
                              </div>

                              {cand.pastExperience && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 italic bg-slate-50 dark:bg-slate-700/60 px-2 py-0.5 rounded-md mt-1 border border-slate-100 dark:border-slate-600">
                                  "{cand.pastExperience}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedCandidateDetail(cand)}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                To'liq Ma'lumot
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  ID: <span className="font-mono">{selectedVacancyForCandidates.id}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedVacancyForCandidates(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Yopish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: CANDIDATE DETAIL CARD POPUP */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedCandidateDetail && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">{selectedCandidateDetail.fullName}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedCandidateDetail.jobPosition} • {selectedCandidateDetail.targetBranch || "Umumiy"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCandidateDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl space-y-2 text-xs border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500">Telefon:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedCandidateDetail.phone1}</span>
                </div>
                {selectedCandidateDetail.phone2 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500">Qo'shimcha tel:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedCandidateDetail.phone2}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500">Viloyat / Manzil:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedCandidateDetail.region} {selectedCandidateDetail.address ? `(${selectedCandidateDetail.address})` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500">Jinsi / Tug'ilgan yili:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedCandidateDetail.gender || 'Erkak'} {selectedCandidateDetail.dob ? `• ${selectedCandidateDetail.dob}` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500">Ma'lumoti:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedCandidateDetail.educationLevel || "O'rta"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-500">Status:</span>
                  <span className="font-bold text-[#00A651]">{selectedCandidateDetail.status}</span>
                </div>
                {selectedCandidateDetail.pastExperience && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-500 block mb-1 font-semibold">Ish tajribasi / Xabar:</span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      {selectedCandidateDetail.pastExperience}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCandidateDetail(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Yopish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE NEW VACANCY MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-[#00A651]/10 text-[#00A651] rounded-xl">
                    <Plus className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Yangi Bo'sh Ish O'rni Yaratish</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateVacancy} className="p-6 space-y-4">
                {/* 1. Job title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ish Nomi / Lavozim *
                  </label>
                  <input
                    type="text"
                    list="positions-datalist"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Masalan: Senior Sales Representative"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  />
                  <datalist id="positions-datalist">
                    {POSITIONS_LIST.map(p => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* 2. Branch */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Branch *
                    </label>
                    <select
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#00A651] cursor-pointer"
                    >
                      {BRANCHES_LIST.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Department */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Department *
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#00A651] cursor-pointer"
                    >
                      {DEPARTMENTS_LIST.filter(d => d !== 'Barcha bo\'limlar').map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* 4. Headcount */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Open O'rinlar Soni
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={formData.headcount}
                      onChange={(e) => setFormData({ ...formData, headcount: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#00A651]"
                    />
                  </div>

                  {/* 5. Salary Range */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Salary Amount
                    </label>
                    <input
                      type="text"
                      value={formData.salaryRange}
                      onChange={(e) => setFormData({ ...formData, salaryRange: e.target.value })}
                      placeholder="4,000,000 - 6,000,000 USD"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#00A651]"
                    />
                  </div>

                  {/* 6. Status */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Holati
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#00A651] cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Open">Open</option>
                      <option value="Muzlatilgan">Muzlatilgan</option>
                      <option value="Filled">Filled</option>
                    </select>
                  </div>
                </div>

                {/* 7. Requirements */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Talablar va Qisqacha Tavsif
                  </label>
                  <textarea
                    rows={2}
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    placeholder="Masalan: Tajriba, kompyuter savodxonligi, xushmuomalalik..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[#00A651] resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#00A651] hover:bg-[#008d44] text-white text-xs font-bold rounded-xl shadow-md shadow-[#00A651]/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Ish O'rnini Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION CARD IN THE CENTER (ROSTDAN HAM O'CHIRILSINMI?) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {vacancyToDelete && (
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
                  Ushbu bo'sh ish o'rnini o'chirib tashlamoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">
                <div className="font-bold text-slate-800 dark:text-slate-100">{vacancyToDelete.title}</div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                  {vacancyToDelete.branch} • {vacancyToDelete.department}
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                  {vacancyToDelete.salaryRange}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setVacancyToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteVacancy}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Ha, o'chirilsin
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
