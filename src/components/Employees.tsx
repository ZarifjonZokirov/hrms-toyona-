import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { exportToExcel, exportToPDF } from '../lib/export';
import { ExportButtons } from './ExportButtons';
import { 
  Search, 
  Plus, 
  Filter, 
  User, 
  Building, 
  Network, 
  Phone, 
  Mail, 
  Calendar, 
  Award, 
  GraduationCap,
  Globe,
  MoreVertical, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff,
  Copy,
  Key,
  Check,
  X, 
  CheckCircle2, 
  Briefcase, 
  MapPin, 
  Grid, 
  List, 
  Download, 
  UserCheck, 
  UserX,
  Clock, 
  ShieldCheck, 
  BadgeCheck, 
  PhoneCall,
  ChevronRight,
  ChevronDown,
  Sparkles,
  FileText,
  ArrowRightLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { ModuleHeaderLogo, ToyonaBrand } from './Logo';
import { DEFAULT_GEOZONES, BranchGeozone } from './BranchGeozones';
import { 
  getFirebaseEmployees, 
  saveFirebaseEmployee, 
  deleteFirebaseEmployee, 
  saveFirebaseTransfer,
  DismissedEmployee,
  getFirebaseDismissedEmployees,
  subscribeFirebaseDismissedEmployees,
  saveFirebaseDismissedEmployee,
  deleteFirebaseDismissedEmployee,
  getFirebaseCandidates,
  deleteFirebaseCandidate
} from '../firebase';
import { Candidate } from './Candidates';
import { recordSystemHistory } from './SystemHistory';

export interface Employee {
  id: string;
  fullName: string;
  position: string;
  department: string;
  branch: string;
  phone: string;
  email: string;
  hireDate: string;
  status: 'active' | 'leave' | 'probation' | 'intern' | 'blacklisted';
  avatarUrl: string;
  staffId: string;
  salary?: string;
  address?: string;
  birthDate?: string;
  gender?: 'Erkak' | 'Ayol';
  username?: string;
  password?: string;
  educationLevel?: string;
  graduationYear?: string;
  pastExperience?: string;
  experienceYears?: number;
  languages?: string[];
  skills?: string[];
  // Davlat hisoboti va qonuniy ma'lumotlar (YAMMT / Soliq / Mehnat Kodeksi)
  jshshir?: string; // 14 xonali PINFL
  passportSeriesNumber?: string; // Pasport / ID seriya va raqami
  contractNumber?: string; // Mehnat shartnomasi raqami
  contractDate?: string; // Mehnat shartnomasi sanasi
  decreeNumber?: string; // Ishga qabul qilish buyrug'i raqami
  decreeDate?: string; // Buyruq sanasi
  bankAccount?: string; // 20 xonali hisob raqam (IBAN)
  emergencyContactName?: string; // Favqulodda bog'lanish shaxsi
  emergencyContactPhone?: string; // Favqulodda telefon
  militaryStatus?: string; // Harbiy hisob holati
}

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-101',
    fullName: 'Zarifjon Zokirov',
    position: 'Bosh Direktor (CEO)',
    department: 'Ijroiya Boshqaruvi',
    branch: 'Bosh ofis',
    phone: '+998 90 123 45 67',
    email: 'zarifjon@toyona.uz',
    hireDate: '2020-03-15',
    status: 'active',
    avatarUrl: 'https://hrms-toyona.vercel.app/zarifjon.jpg',
    staffId: 'TS-0001',
    salary: '25,000,000 UZS',
    address: 'Toshkent sh., Yunusobod t.',
    birthDate: '1990-05-12',
    gender: 'Erkak',
    username: '',
    password: '',
    jshshir: '31205901230045',
    passportSeriesNumber: 'AD 1234567',
    contractNumber: 'MS-2020/01',
    contractDate: '2020-03-15',
    decreeNumber: 'B-01',
    decreeDate: '2020-03-15',
    bankAccount: '20208000900123456789',
    emergencyContactName: 'Zokirov Sardor (Akasi)',
    emergencyContactPhone: '+998 90 987 65 43',
    militaryStatus: 'Harbiy hisobda turadi'
  }
];

const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="fixed bottom-6 right-6 z-[80] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800"
    >
      <CheckCircle2 className="w-5 h-5 text-[#00A651]" />
      <span className="text-xs font-bold">{message}</span>
    </motion.div>
  );
};

interface EmployeesProps { currentUser?: any; }

export default function Employees({ currentUser }: EmployeesProps = {}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const actorName = currentUser?.name || currentUser?.fullName || 'Zarifjon Zokirov';
  const actorRole = currentUser?.role || 'Super Admin';
  const [isLoading, setIsLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'employees' | 'dismissed'>('employees');

  // Dismissed Employees states
  const [dismissedEmployees, setDismissedEmployees] = useState<DismissedEmployee[]>([]);
  const [isDismissModalOpen, setIsDismissModalOpen] = useState(false);
  const [dismissingEmployee, setDismissingEmployee] = useState<Employee | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [dismissCategory, setDismissCategory] = useState('Doimiy ishda');
  const [rehiringDismissedId, setRehiringDismissedId] = useState<string | null>(null);
  const [deleteDismissConfirmId, setDeleteDismissConfirmId] = useState<string | null>(null);
  const [dismissSearchQuery, setDismissSearchQuery] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('Barchasi');
  const [selectedBranch, setSelectedBranch] = useState<string>('Barchasi');
  const [selectedPosition, setSelectedPosition] = useState<string>('Barchasi');
  const [selectedStatus, setSelectedStatus] = useState<string>('Barchasi');
  const [selectedGender, setSelectedGender] = useState<string>('Barchasi');
  const [sortField, setSortField] = useState<'staffId' | 'fullName' | 'position' | 'department' | 'branch' | 'phone' | 'hireDate' | 'salary' | 'status'>('staffId');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Modals state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showCardPassword, setShowCardPassword] = useState(false);
  const [cardCopiedField, setCardCopiedField] = useState<string | null>(null);

  // Helper for generating/resolving username and password
  const getEmployeeUsername = (emp: Employee): string => {
    if (emp.username) return emp.username;
    const parts = (emp.fullName || '').toLowerCase().replace(/['`ʻ’]/g, '').split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[1]}.${parts[0]}`.replace(/[^a-z0-9._]/g, '');
    }
    return (parts[0] || 'xodim') + (emp.staffId ? emp.staffId.replace(/\D/g, '') : '101');
  };

  const getEmployeePassword = (emp: Employee): string => {
    return emp.password || 'Toyona#2026';
  };

  const handleCopyCard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCardCopiedField(field);
    setToastMessage(`"${text}" nusxalandi!`);
    setTimeout(() => setCardCopiedField(null), 2000);
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Transfer to another branch modal state
  const [transferringEmployee, setTransferringEmployee] = useState<Employee | null>(null);
  const [targetBranch, setTargetBranch] = useState<string>('');
  const [targetPosition, setTargetPosition] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  
  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);

  useEffect(() => {
    async function loadBranches() {
      try {
        const savedGeozones = localStorage.getItem('toyonasavdo_branch_geozones');
        if (savedGeozones) {
          const parsed: BranchGeozone[] = JSON.parse(savedGeozones);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAvailableBranches(parsed.map(g => g.name));
            return;
          }
        }
      } catch (e) {}
      setAvailableBranches(DEFAULT_GEOZONES.map(g => g.name));
    }
    loadBranches();
  }, []);

  const [formData, setFormData] = useState<Partial<Employee>>({
    fullName: '',
    position: '',
    department: 'Savdo va Chakana',
    branch: '',
    phone: '+998 ',
    email: '',
    hireDate: new Date().toISOString().split('T')[0],
    status: 'active',
    salary: '',
    address: '',
    birthDate: '',
    gender: 'Erkak',
    educationLevel: 'Oliy',
    graduationYear: '',
    pastExperience: '',
    experienceYears: undefined,
    languages: ['O\'zbek tili']
  });

  // Candidates for quick import
  const [candidatesList, setCandidatesList] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');

  const loadCandidates = async () => {
    try {
      const cands = await getFirebaseCandidates();
      if (Array.isArray(cands)) {
        setCandidatesList(cands as Candidate[]);
      }
    } catch (e) {
      console.error("Candidates load error:", e);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    if (!candidateId) return;
    const cand = candidatesList.find(c => c.id === candidateId);
    if (!cand) return;

    setFormData(prev => ({
      ...prev,
      fullName: cand.fullName || prev.fullName,
      position: cand.jobPosition || cand.position || prev.position,
      phone: cand.phone1 || cand.phone2 || prev.phone,
      branch: cand.targetBranch || cand.region || prev.branch,
      address: cand.address || cand.exactAddress || cand.region || prev.address,
      birthDate: cand.dob || prev.birthDate,
      gender: (cand.gender === 'Ayol' ? 'Ayol' : 'Erkak') as 'Erkak' | 'Ayol',
      educationLevel: cand.educationLevel || prev.educationLevel,
      graduationYear: cand.graduationYear || prev.graduationYear,
      pastExperience: cand.pastExperience || prev.pastExperience
    }));
  };

  useEffect(() => {
    if (availableBranches.length > 0 && !formData.branch) {
      setFormData(prev => ({ ...prev, branch: availableBranches[0] }));
    }
  }, [availableBranches, formData.branch]);

  // Fetch live employees and dismissed employees from Firebase Firestore on mount
  useEffect(() => {
    let active = true;
    async function syncData() {
      setIsLoading(true);
      try {
        // Fetch active employees
        const fbEmps = await getFirebaseEmployees();
        if (!active) return;
        
        if (fbEmps && fbEmps.length > 0) {
          setEmployees(fbEmps as Employee[]);
        } else {
          setEmployees(INITIAL_EMPLOYEES);
        }

        // Fetch dismissed employees
        const fbDismissed = await getFirebaseDismissedEmployees();
        if (!active) return;
        if (fbDismissed) {
          setDismissedEmployees(fbDismissed);
        }
      } catch (error) {
        console.error("Employee sync error:", error);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    syncData();
    return () => { active = false; };
  }, []);

  const departmentsList = useMemo(() => ['Barchasi', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean))).sort()], [employees]);
  const branchesList = useMemo(() => ['Barchasi', ...Array.from(new Set([...employees.map(e => e.branch).filter(Boolean), ...availableBranches])).sort()], [employees, availableBranches]);
  const positionsList = useMemo(() => ['Barchasi', ...Array.from(new Set(employees.map(e => e.position).filter(Boolean))).sort()], [employees]);

  const isAnyFilterActive = 
    searchQuery.trim() !== '' ||
    selectedDept !== 'Barchasi' ||
    selectedBranch !== 'Barchasi' ||
    selectedPosition !== 'Barchasi' ||
    selectedStatus !== 'Barchasi' ||
    selectedGender !== 'Barchasi';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedDept('Barchasi');
    setSelectedBranch('Barchasi');
    setSelectedPosition('Barchasi');
    setSelectedStatus('Barchasi');
    setSelectedGender('Barchasi');
  };

  // Comprehensive Filtering Logic
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = !q || 
        (emp.fullName || '').toLowerCase().includes(q) ||
        (emp.position && emp.position.toLowerCase().includes(q)) ||
        (emp.staffId && emp.staffId.toLowerCase().includes(q)) ||
        (emp.phone && emp.phone.includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q)) ||
        (emp.address && emp.address.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.branch && emp.branch.toLowerCase().includes(q));

      const matchesDept = selectedDept === 'Barchasi' || emp.department === selectedDept;
      const matchesBranch = selectedBranch === 'Barchasi' || emp.branch === selectedBranch;
      const matchesPosition = selectedPosition === 'Barchasi' || emp.position === selectedPosition;
      const matchesStatus = selectedStatus === 'Barchasi' || emp.status === selectedStatus;
      const matchesGender = selectedGender === 'Barchasi' || emp.gender === selectedGender;

      return matchesSearch && matchesDept && matchesBranch && matchesPosition && matchesStatus && matchesGender;
    });
  }, [employees, searchQuery, selectedDept, selectedBranch, selectedPosition, selectedStatus, selectedGender]);

  // Dismissed Employees Filtering
  const filteredDismissed = useMemo(() => {
    return dismissedEmployees.filter(emp => {
      const q = (dismissSearchQuery || '').toLowerCase().trim();
      return !q || 
        (emp.fullName || '').toLowerCase().includes(q) ||
        (emp.position && emp.position.toLowerCase().includes(q)) ||
        (emp.staffId && emp.staffId.toLowerCase().includes(q)) ||
        (emp.phone && emp.phone.includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q)) ||
        (emp.branch && emp.branch.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.dismissReason && emp.dismissReason.toLowerCase().includes(q)) ||
        (emp.dismissCategory && emp.dismissCategory.toLowerCase().includes(q));
    });
  }, [dismissedEmployees, dismissSearchQuery]);

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      if (sortField === 'hireDate') {
        const aDate = new Date(a.hireDate).getTime() || 0;
        const bDate = new Date(b.hireDate).getTime() || 0;
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }
      if (sortField === 'salary') {
        const parseSalary = (s?: string) => {
          if (!s) return 0;
          const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
          return isNaN(num) ? 0 : num;
        };
        const aSal = parseSalary(a.salary);
        const bSal = parseSalary(b.salary);
        return sortDirection === 'asc' ? aSal - bSal : bSal - aSal;
      }
      let aVal = (a[sortField] || '').toString().toLowerCase();
      let bVal = (b[sortField] || '').toString().toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredEmployees, sortField, sortDirection]);

  const activeCount = useMemo(() => employees.filter(e => e.status === 'active').length, [employees]);
  const leaveCount = useMemo(() => employees.filter(e => e.status === 'leave').length, [employees]);
  const probationCount = useMemo(() => employees.filter(e => e.status === 'probation').length, [employees]);
  const internCount = useMemo(() => employees.filter(e => e.status === 'intern').length, [employees]);
  const blacklistedCount = useMemo(() => employees.filter(e => e.status === 'blacklisted').length, [employees]);

  const totalFilteredPayroll = useMemo(() => {
    return filteredEmployees.reduce((sum, emp) => {
      if (!emp.salary) return sum;
      const num = parseInt(emp.salary.replace(/[^0-9]/g, ''), 10);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [filteredEmployees]);

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.position || isSaving) return;

    setIsSaving(true);
    try {
      if (editingEmployee) {
        // Edit
        const updated: Employee = { ...editingEmployee, ...formData } as Employee;
        setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? updated : emp));
        if (selectedEmployee?.id === editingEmployee.id) {
          setSelectedEmployee(updated);
        }
        await saveFirebaseEmployee(updated);
        recordSystemHistory({
          action: "Xodim ma'lumotlari tahrirlandi",
          module: 'Xodimlar',
          type: 'update',
          performedBy: actorName,
          role: actorRole,
          details: `Xodim ma'lumotlari tahrirlandi: ${formData.fullName} (${formData.position}, ${formData.branch})`
        });
        setToastMessage(`Xodim "${formData.fullName}" ma'lumotlari yangilandi!`);
        setEditingEmployee(null);
      } else {
        // Add New - Sequential Staff ID (e.g. TS-0016)
        const numericIds = employees
          .map(e => parseInt((e.staffId || '').replace(/\D/g, ''), 10))
          .filter(n => !isNaN(n));
        const maxId = numericIds.length > 0 ? Math.max(...numericIds) : employees.length;
        const nextStaffId = `TS-${String(maxId + 1).padStart(4, '0')}`;

        const newEmp: Employee = {
          id: `emp-${Date.now()}`,
          fullName: formData.fullName || 'Yangi Xodim',
          position: formData.position || 'Xodim',
          department: formData.department || 'Savdo va Chakana',
          branch: formData.branch || availableBranches[0] || 'Bosh ofis',
          phone: formData.phone || '+998 90 000 00 00',
          email: formData.email || `${formData.fullName?.toLowerCase().replace(/\s+/g, '.')}@toyona.uz`,
          hireDate: formData.hireDate || new Date().toISOString().split('T')[0],
          status: formData.status as any || 'active',
          avatarUrl: formData.avatarUrl || '',
          staffId: nextStaffId,
          salary: formData.salary || '7,000,000 UZS',
          address: formData.address || 'Toshkent sh.',
          birthDate: formData.birthDate || '1995-01-01',
          gender: formData.gender as any || 'Erkak',
          educationLevel: formData.educationLevel || 'Oliy',
          graduationYear: formData.graduationYear,
          pastExperience: formData.pastExperience || 'Mavjud emas',
          experienceYears: formData.experienceYears || (formData.pastExperience ? 2 : 1),
          jshshir: formData.jshshir || '',
          passportSeriesNumber: formData.passportSeriesNumber || '',
          contractNumber: formData.contractNumber || '',
          contractDate: formData.contractDate || '',
          decreeNumber: formData.decreeNumber || '',
          decreeDate: formData.decreeDate || '',
          bankAccount: formData.bankAccount || '',
          emergencyContactName: formData.emergencyContactName || '',
          emergencyContactPhone: formData.emergencyContactPhone || '',
          militaryStatus: formData.militaryStatus || 'Harbiy xizmatga majbur'
        };
        setEmployees(prev => [newEmp, ...prev]);
        await saveFirebaseEmployee(newEmp);

        if (selectedCandidateId) {
          await deleteFirebaseCandidate(selectedCandidateId);
          setCandidatesList(prev => prev.filter(c => c.id !== selectedCandidateId));
          setSelectedCandidateId('');
        }

        // If we are rehiring, delete them from dismissed archive
        if (rehiringDismissedId) {
          await deleteFirebaseDismissedEmployee(rehiringDismissedId);
          setDismissedEmployees(prev => prev.filter(d => d.id !== rehiringDismissedId));
          setRehiringDismissedId(null);
          recordSystemHistory({
            action: "Xodim qayta ishga olindi",
            module: 'Xodimlar',
            type: 'create',
            performedBy: actorName,
            role: actorRole,
            details: `Xodim "${newEmp.fullName}" qayta ishga olindi: ${newEmp.position} (${newEmp.branch})`
          });
          setToastMessage(`Xodim "${newEmp.fullName}" muvaffaqiyatli qayta ishga olindi!`);
        } else {
          recordSystemHistory({
            action: "Yangi xodim qo'shildi",
            module: 'Xodimlar',
            type: 'create',
            performedBy: actorName,
            role: actorRole,
            details: `Yangi xodim ro'yxatga olindi: ${newEmp.fullName} (${newEmp.position}, ${newEmp.branch})`
          });
          setToastMessage(`Yangi xodim "${newEmp.fullName}" muvaffaqiyatli qo'shildi!`);
        }
      }

      setIsAddModalOpen(false);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const openDismissModal = (emp: Employee) => {
    setDismissingEmployee(emp);
    setDismissReason('');
    
    // Pre-map status to human-readable Uzb category
    const statusMap: Record<string, string> = {
      'active': 'Doimiy ishda',
      'probation': 'Sinovda',
      'intern': 'Stajyor',
      'blacklisted': 'Qora ro\'yxatda',
      'leave': 'Ta\'tilda'
    };
    setDismissCategory(statusMap[emp.status] || 'Doimiy ishda');
    setIsDismissModalOpen(true);
  };

  const handleExecuteDismiss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dismissingEmployee) return;

    const dismissedObj: DismissedEmployee = {
      id: `dism-${Date.now()}`,
      fullName: dismissingEmployee.fullName,
      position: dismissingEmployee.position,
      department: dismissingEmployee.department,
      branch: dismissingEmployee.branch,
      phone: dismissingEmployee.phone,
      email: dismissingEmployee.email,
      hireDate: dismissingEmployee.hireDate,
      dismissDate: new Date().toISOString().split('T')[0],
      dismissReason: dismissReason || "Sabab ko'rsatilmadi",
      dismissCategory: dismissCategory,
      staffId: dismissingEmployee.staffId
    };

    const saved = await saveFirebaseDismissedEmployee(dismissedObj);
    if (saved) {
      await deleteFirebaseEmployee(dismissingEmployee.id);
      setEmployees(prev => prev.filter(emp => emp.id !== dismissingEmployee.id));
      setDismissedEmployees(prev => [dismissedObj, ...prev]);

      recordSystemHistory({
        action: "Xodim ishdan bo'shatildi",
        module: 'Xodimlar',
        type: 'delete',
        performedBy: actorName,
        role: actorRole,
        details: `Xodim "${dismissingEmployee.fullName}" ishdan bo'shatildi. Toifa: ${dismissCategory}. Sabab: ${dismissReason}`
      });

      setToastMessage(`"${dismissingEmployee.fullName}" ishdan bo'shatildi va arxivlandi!`);
    } else {
      setToastMessage("Xatolik yuz berdi. Qayta urinib ko'ring.");
    }

    setIsDismissModalOpen(false);
    setDismissingEmployee(null);
  };

  const handleDelete = async (id: string) => {
    const target = employees.find(e => e.id === id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    setDeleteConfirmId(null);
    if (selectedEmployee?.id === id) setSelectedEmployee(null);
    await deleteFirebaseEmployee(id);
    if (target) {
      recordSystemHistory({
        action: "Xodim tizimdan o'chirildi",
        module: 'Xodimlar',
        type: 'delete',
        performedBy: actorName,
        role: actorRole,
        details: `Xodim "${target.fullName}" (${target.position}, ${target.branch}) bazadan o'chirildi`
      });
    }
    setToastMessage(`Xodim "${target?.fullName || ''}" tizimdan o'chirildi`);
  };

  const handleDeleteDismissed = async (id: string) => {
    const target = dismissedEmployees.find(d => d.id === id);
    setDismissedEmployees(prev => prev.filter(d => d.id !== id));
    setDeleteDismissConfirmId(null);
    await deleteFirebaseDismissedEmployee(id);
    if (target) {
      recordSystemHistory({
        action: "Bo'shatilgan xodim arxivi o'chirildi",
        module: 'Xodimlar',
        type: 'delete',
        performedBy: actorName,
        role: actorRole,
        details: `Ishdan bo'shatilgan xodim "${target.fullName}" arxivi butunlay o'chirildi`
      });
    }
    setToastMessage("Xodim arxivi butunlay o'chirildi!");
  };

  const handleRehireEmployee = (dismissed: DismissedEmployee) => {
    setFormData({
      fullName: dismissed.fullName,
      position: dismissed.position,
      department: dismissed.department,
      branch: dismissed.branch,
      phone: dismissed.phone,
      email: dismissed.email,
      hireDate: new Date().toISOString().split('T')[0],
      status: 'active',
      salary: '',
      address: '',
      birthDate: '',
      gender: 'Erkak'
    });
    setRehiringDismissedId(dismissed.id);
    setIsAddModalOpen(true);
  };

  const openTransferModal = (emp: Employee) => {
    setTransferringEmployee(emp);
    const otherBranch = availableBranches.find(b => b !== emp.branch) || availableBranches[0] || 'Mingtut';
    setTargetBranch(otherBranch);
    setTargetPosition(emp.position);
    setTransferReason("Filiallararo xizmat rotatsiyasi va kadrlar taqsimoti");
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringEmployee || !targetBranch) return;

    const oldBranch = transferringEmployee.branch;
    const newPos = targetPosition || transferringEmployee.position;
    const updatedEmp: Employee = {
      ...transferringEmployee,
      branch: targetBranch,
      position: newPos
    };

    setEmployees(prev => prev.map(emp => emp.id === transferringEmployee.id ? updatedEmp : emp));
    if (selectedEmployee?.id === transferringEmployee.id) {
      setSelectedEmployee(updatedEmp);
    }
    saveFirebaseEmployee(updatedEmp).catch(console.error);

    const now = new Date();
    const nowStr = `${now.toLocaleDateString('uz-UZ')}, ${now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;
    const transferRecord = {
      id: `tr-${Date.now()}`,
      num: Date.now() % 100000,
      fio: transferringEmployee.fullName,
      filial: targetBranch,
      viloyat: "Farg'ona",
      kategoriya: transferringEmployee.department,
      qaysiLavozimdan: `${transferringEmployee.position} (${oldBranch})`,
      qaysiLavozimga: `${newPos} (${targetBranch})`,
      status: 'Yakunlangan' as const,
      sana: `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`,
      boshlanganSana: nowStr,
      yakunlanganSana: nowStr,
      sababi: transferReason || "Filiallararo xizmat rotatsiyasi",
      tasdiqlovchi: "Zarifjon Zokirov"
    };

    saveFirebaseTransfer(transferRecord).catch(console.error);

    try {
      const existing = JSON.parse(localStorage.getItem('hrms_transfers_v3') || '[]');
      localStorage.setItem('hrms_transfers_v3', JSON.stringify([transferRecord, ...existing]));
      window.dispatchEvent(new Event('hrms_transfers_updated'));
    } catch (err) {}

    recordSystemHistory({
      action: "Xodim boshqa filialga o'tkazildi",
      module: 'Rotatsiya',
      type: 'update',
      performedBy: actorName,
      role: actorRole,
      details: `Xodim "${transferringEmployee.fullName}" "${oldBranch}" filialidan "${targetBranch}" filialiga muvaffaqiyatli o'tkazildi`
    });

    setToastMessage(`"${transferringEmployee.fullName}" muvaffaqiyatli ${targetBranch} filialiga o'tkazildi!`);
    setTransferringEmployee(null);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData(emp);
    setIsAddModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      position: '',
      department: 'Savdo va Chakana',
      branch: availableBranches[0] || 'Bosh Idora (Toshkent)',
      phone: '+998 ',
      email: '',
      hireDate: new Date().toISOString().split('T')[0],
      status: 'active',
      salary: '',
      address: '',
      birthDate: '',
      gender: 'Erkak',
      educationLevel: 'Oliy',
      graduationYear: '',
      pastExperience: '',
      experienceYears: undefined,
      languages: ['O\'zbek tili'],
      jshshir: '',
      passportSeriesNumber: '',
      contractNumber: '',
      contractDate: '',
      decreeNumber: '',
      decreeDate: '',
      bankAccount: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      militaryStatus: 'Harbiy xizmatga majbur'
    });
    setSelectedCandidateId('');
    setEditingEmployee(null);
  };

  const handleExportEmployees = (format: 'excel' | 'pdf') => {
    const headers = ['№', 'ID', 'F.I.O', 'Lavozim', 'Filial', 'Telefon', 'Maosh', 'Jinsi', 'Status', 'Ishga kirgan sana'];
    const data = filteredEmployees.map((e, idx) => [
      idx + 1,
      e.staffId,
      e.fullName,
      e.position,
      e.branch,
      e.phone,
      e.salary || 'Kelishilgan',
      e.gender || '-',
      e.status === 'active' ? 'Doimiy ishda' : e.status === 'leave' ? 'Ta\'tilda' : e.status === 'probation' ? 'Sinovda' : e.status === 'intern' ? 'Stajyor' : 'Qora ro\'yxatda',
      e.hireDate
    ]);
    const fileName = `Toyona_Xodimlar_Jadvali_${new Date().toISOString().split('T')[0]}`;
    if (format === 'excel') {
      const excelData = filteredEmployees.map((e, idx) => ({
        '№': idx + 1,
        'ID': e.staffId,
        'F.I.O': e.fullName,
        'Lavozim': e.position,
        'Filial': e.branch,
        'Telefon': e.phone,
        'Email': e.email,
        'Maosh': e.salary || 'Kelishilgan',
        'Jinsi': e.gender || '-',
        'Holati': e.status === 'active' ? 'Doimiy ishda' : e.status === 'leave' ? 'Ta\'tilda' : e.status === 'probation' ? 'Sinovda' : e.status === 'intern' ? 'Stajyor' : 'Qora ro\'yxatda',
        'Ishga kirgan sana': e.hireDate,
        'Manzil': e.address || '-'
      }));
      exportToExcel(excelData, fileName);
    } else {
      exportToPDF(headers, data, fileName, "Toyona Savdo - Xodimlar Jadvali (HRMS)");
    }
  };

  const handleExportDismissed = (format: 'excel' | 'pdf') => {
    const headers = ['№', 'ID', 'F.I.O', 'Lavozim', 'Filial', 'Telefon', 'Ishga kirgan', 'Bo\'shatilgan', 'Toifasi', 'Sababi'];
    const data = filteredDismissed.map((e, idx) => [
      idx + 1,
      e.staffId,
      e.fullName,
      e.position,
      e.branch,
      e.phone,
      e.hireDate,
      e.dismissDate?.split('-').reverse().join('.') || e.dismissDate || '-',
      e.dismissCategory,
      e.dismissReason
    ]);
    const fileName = `Toyona_Bo'shatilgan_Xodimlar_${new Date().toISOString().split('T')[0]}`;
    if (format === 'excel') {
      const excelData = filteredDismissed.map((e, idx) => ({
        '№': idx + 1,
        'ID': e.staffId,
        'F.I.O': e.fullName,
        'Lavozim': e.position,
        'Filial': e.branch,
        'Telefon': e.phone,
        'Email': e.email,
        'Ishga kirgan sana': e.hireDate,
        'Bo\'shatilgan sana': e.dismissDate,
        'Bo\'shatilgan vaqtdagi toifa': e.dismissCategory,
        'Sababi': e.dismissReason
      }));
      exportToExcel(excelData, fileName);
    } else {
      exportToPDF(headers, data, fileName, "Toyona Savdo - Ishdan Bo'shatilganlar Arxivi");
    }
  };

  const getStatusBadge = (status: Employee['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-extrabold">
            <span className="w-2 h-2 rounded-full bg-[#00A651] animate-pulse"></span>
            Doimiy ishda
          </span>
        );
      case 'leave':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[11px] font-extrabold">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Ta'tilda
          </span>
        );
      case 'probation':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[11px] font-extrabold">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Sinovda
          </span>
        );
      case 'intern':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-[11px] font-extrabold">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            Stajyor
          </span>
        );
      case 'blacklisted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[11px] font-extrabold">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Qora ro'yxatda
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50/50 rounded-2xl border border-slate-200/80 p-5 space-y-5 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
        )}
      </AnimatePresence>

      {/* Module Header */}
      <ModuleHeaderLogo 
        title="Xodimlar Ro'yxati va Tashkiliy Tuzilma"
        icon={UserCheck} 
      />

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-5 py-3 text-sm font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'employees'
              ? 'border-[#00A651] text-[#00A651]'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Xodimlar Ro'yxati</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold">
            {employees.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('dismissed')}
          className={`px-5 py-3 text-sm font-extrabold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'dismissed'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>Ishdan Bo'shatilganlar</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold">
            {dismissedEmployees.length}
          </span>
        </button>
      </div>

      {/* 1. FAOL XODIMLAR TAB VIEW */}
      {activeTab === 'employees' && (
        <>
          {/* Top Action & Status Pills Bar (HR talabiga ko'ra ixcham status paneli) */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Quick Status Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedStatus('Barchasi')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedStatus === 'Barchasi'
                ? 'bg-[#00A651] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>Barchasi</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${selectedStatus === 'Barchasi' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
              {employees.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedStatus === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Doimiy xodimlar</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${selectedStatus === 'active' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'}`}>
              {activeCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('leave')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedStatus === 'leave'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Ta'tildagilar</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${selectedStatus === 'leave' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'}`}>
              {leaveCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('probation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedStatus === 'probation'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Sinovda</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${selectedStatus === 'probation' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200'}`}>
              {probationCount}
            </span>
          </button>
        </div>

        {/* Right actions: Export and Add Employee */}
        <div className="flex items-center gap-2.5">
          <ExportButtons 
            onExportExcel={() => handleExportEmployees('excel')}
            onExportPDF={() => handleExportEmployees('pdf')}
          />
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[#00A651] hover:bg-[#008d44] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#00A651]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Xodim Qo'shish</span>
          </button>
        </div>
      </div>

      {/* Multi-Dimensional Filter Toolbar (HR barcha filtrlardan foydalana olishi uchun) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#00A651]" />
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Xodimlar Filtrlash Paneli
            </span>
          </div>
          {isAnyFilterActive && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-3 py-1 rounded-lg border border-rose-200/60 dark:border-rose-800/60 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Filtrlarni tozalash</span>
            </button>
          )}
        </div>

        {/* Filter inputs grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* 1. Global Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="F.I.O, ID, lavozim, telefon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] transition-all"
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

          {/* 2. Filial Filter */}
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer appearance-none truncate pr-7"
            >
              <option value="Barchasi">Barcha filiallar</option>
              {branchesList.filter(b => b !== 'Barchasi').map(br => (
                <option key={br} value={br}>{br}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 3. Lavozim Filter */}
          <div className="relative">
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer appearance-none truncate pr-7"
            >
              <option value="Barchasi">Barcha lavozimlar</option>
              {positionsList.filter(p => p !== 'Barchasi').map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 4. Jinsi Filter */}
          <div className="relative">
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer appearance-none truncate pr-7"
            >
              <option value="Barchasi">Barcha jinslar</option>
              <option value="Erkak">Erkak</option>
              <option value="Ayol">Ayol</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Row 2: Status indicator & Active chips */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00A651] animate-pulse"></span>
            <span className="text-slate-700 dark:text-slate-200 font-bold">
              Bazada jami: <span className="text-[#00A651] font-black">{employees.length} nafar</span> xodim mavjud
              {filteredEmployees.length !== employees.length && (
                <span className="text-slate-500 dark:text-slate-400 font-normal ml-2">
                  (filtr natijasi: <strong className="text-slate-800 dark:text-slate-100 font-bold">{filteredEmployees.length} nafar</strong>)
                </span>
              )}
            </span>
          </div>

          {/* Active Filter Chips */}
          {isAnyFilterActive && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedBranch !== 'Barchasi' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold">
                  Filial: {selectedBranch}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedBranch('Barchasi')} />
                </span>
              )}
              {selectedPosition !== 'Barchasi' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-[#00A651] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold">
                  Lavozim: {selectedPosition}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedPosition('Barchasi')} />
                </span>
              )}
              {selectedGender !== 'Barchasi' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold">
                  Jinsi: {selectedGender}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedGender('Barchasi')} />
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Master Employee Table (Cardlar o'rniga to'liq professional HR jadvali) */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200/80 dark:border-slate-800 text-center space-y-3 my-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
            <User className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base">Hech qanday xodim topilmadi</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
            Qidiruv so'rovi yoki filtrlash shartlariga mos keladigan xodimlar ro'yxatda mavjud emas.
          </p>
          <button
            onClick={resetAllFilters}
            className="px-4 py-2 bg-[#00A651] text-white text-xs font-bold rounded-xl hover:bg-[#008d44] transition-all cursor-pointer shadow-xs"
          >
            Filtrlarni tozalash
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-extrabold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 select-none">
                <tr>
                  <th className="py-2 px-1.5 w-7 text-center text-slate-400 dark:text-slate-500">№</th>
                  
                  <th className="py-2 px-2">
                    <button 
                      onClick={() => handleSort('fullName')}
                      className="flex items-center gap-1 font-extrabold hover:text-[#00A651] transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <span>Xodim (F.I.O)</span>
                      {sortField === 'fullName' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00A651]" /> : <ArrowDown className="w-3 h-3 text-[#00A651]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </th>

                  <th className="py-2 px-1.5 w-14">
                    <button 
                      onClick={() => handleSort('staffId')}
                      className="flex items-center gap-1 font-extrabold hover:text-[#00A651] transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <span>ID</span>
                      {sortField === 'staffId' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00A651]" /> : <ArrowDown className="w-3 h-3 text-[#00A651]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </th>

                  <th className="py-2 px-1.5">
                    <button 
                      onClick={() => handleSort('branch')}
                      className="flex items-center gap-1 font-extrabold hover:text-[#00A651] transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <span>Filial</span>
                      {sortField === 'branch' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00A651]" /> : <ArrowDown className="w-3 h-3 text-[#00A651]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </th>

                  <th className="py-2 px-1.5">
                    <button 
                      onClick={() => handleSort('position')}
                      className="flex items-center gap-1 font-extrabold hover:text-[#00A651] transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <span>Lavozimi</span>
                      {sortField === 'position' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00A651]" /> : <ArrowDown className="w-3 h-3 text-[#00A651]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </th>

                  <th className="py-2 px-1.5">
                    <button 
                      onClick={() => handleSort('phone')}
                      className="flex items-center gap-1 font-extrabold hover:text-[#00A651] transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <span>Telefon</span>
                      {sortField === 'phone' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00A651]" /> : <ArrowDown className="w-3 h-3 text-[#00A651]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </th>

                  <th className="py-2 px-1.5">
                    <button 
                      onClick={() => handleSort('salary')}
                      className="flex items-center gap-1 font-extrabold hover:text-[#00A651] transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <span>Maosh</span>
                      {sortField === 'salary' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00A651]" /> : <ArrowDown className="w-3 h-3 text-[#00A651]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </th>

                  <th className="py-2 px-1.5">
                    <button 
                      onClick={() => handleSort('hireDate')}
                      className="flex items-center gap-1 font-extrabold hover:text-[#00A651] transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <span>Ishga kirgan</span>
                      {sortField === 'hireDate' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00A651]" /> : <ArrowDown className="w-3 h-3 text-[#00A651]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </th>

                  <th className="py-2 px-1 text-center w-12">Jinsi</th>

                  <th className="py-2 px-1 text-center w-24">
                    <button 
                      onClick={() => handleSort('status')}
                      className="inline-flex items-center gap-0.5 font-extrabold hover:text-[#00A651] transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <span>Holati</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[#00A651]" /> : <ArrowDown className="w-3 h-3 text-[#00A651]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </th>

                  <th className="py-2 px-2 text-right w-24">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-[#00A651] animate-spin" />
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Xodimlar ro'yxati Firebase bazasidan yuklanmoqda...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : sortedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                        <UserX className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-600 dark:text-slate-400 text-xs">Xodimlar topilmadi</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">Qidiruv yoki filtr parametrlarini o'zgartirib ko'ring</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedEmployees.map((emp, index) => (
                  <tr 
                    key={`${emp.id || index}-${index}`} 
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors group"
                  >
                    {/* № */}
                    <td className="py-2 px-1.5 text-center font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      #{index + 1}
                    </td>

                    {/* Xodim (Avatar + Ism + Email) */}
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="relative shrink-0">
                          <img 
                            src={emp.avatarUrl} 
                            alt={emp.fullName}
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                          />
                        </div>
                        <div className="min-w-0 max-w-[130px]">
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 block text-[11px] group-hover:text-[#00A651] transition-colors truncate">
                            {emp.fullName}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block">
                            {emp.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="py-2 px-1.5 whitespace-nowrap">
                      <span className="inline-block px-1.5 py-0.5 font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200/80 dark:border-slate-700">
                        {emp.staffId}
                      </span>
                    </td>

                    {/* Filial */}
                    <td className="py-2 px-1.5">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50/70 dark:bg-emerald-950/40 text-[#00A651] dark:text-emerald-400 text-[10px] font-bold border border-emerald-100 dark:border-emerald-900/40">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate max-w-[105px]">{emp.branch}</span>
                      </span>
                    </td>

                    {/* Lavozim */}
                    <td className="py-2 px-1.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-[#00A651] shrink-0" />
                        <span className="truncate max-w-[125px]">{emp.position}</span>
                      </span>
                    </td>

                    {/* Telefon */}
                    <td className="py-2 px-1.5 font-mono text-[10px] font-bold whitespace-nowrap">
                      <a 
                        href={`tel:${emp.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#00A651] hover:underline flex items-center gap-0.5"
                      >
                        <Phone className="w-2.5 h-2.5 text-slate-400" />
                        <span>{emp.phone}</span>
                      </a>
                    </td>

                    {/* Oylik Maosh */}
                    <td className="py-2 px-1.5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold text-[#00A651]">
                        {emp.salary || 'Kelishilgan'}
                      </span>
                    </td>

                    {/* Ishga kirgan sana */}
                    <td className="py-2 px-1.5 text-slate-600 dark:text-slate-400 text-[10px] font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{emp.hireDate?.split('-').reverse().join('.') || emp.hireDate}</span>
                      </div>
                    </td>

                    {/* Jinsi */}
                    <td className="py-2 px-1 text-center whitespace-nowrap">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        emp.gender === 'Ayol' 
                          ? 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800' 
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {emp.gender || 'Erkak'}
                      </span>
                    </td>

                    {/* Holati */}
                    <td className="py-2 px-1 text-center whitespace-nowrap">
                      {getStatusBadge(emp.status)}
                    </td>

                    {/* Amallar */}
                    <td className="py-2 px-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => openTransferModal(emp)}
                          className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-400 hover:text-[#00A651] rounded-md transition-all cursor-pointer"
                          title="Boshqa filialga o'tkazish (Rotatsiya)"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-400 hover:text-blue-600 rounded-md transition-all cursor-pointer"
                          title="Tahrirlash"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDismissModal(emp)}
                          className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-600 dark:text-slate-400 hover:text-amber-600 rounded-md transition-all cursor-pointer"
                          title="Ishdan bo'shatish"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(emp.id)}
                          className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded-md transition-all cursor-pointer"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Summary */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-3 flex-wrap">
              <span>Jami ko'rsatilmoqda: <strong className="text-slate-800 dark:text-slate-100 font-bold">{filteredEmployees.length}</strong> nafar xodim</span>
              <span>•</span>
              <span className="text-[#00A651] font-semibold">Doimiy: {filteredEmployees.filter(e => e.status === 'active').length} nafar</span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">Ta'tilda: {filteredEmployees.filter(e => e.status === 'leave').length} nafar</span>
              <span>•</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">Sinovda: {filteredEmployees.filter(e => e.status === 'probation').length} nafar</span>
              {totalFilteredPayroll > 0 && (
                <>
                  <span>•</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">
                    Oylik maosh fondi: <strong className="text-[#00A651]">{totalFilteredPayroll.toLocaleString()} UZS</strong>
                  </span>
                </>
              )}
            </div>
            <span className="text-[11px] text-slate-400">
              Saralash: {sortField} ({sortDirection === 'asc' ? 'o\'sish' : 'kamayish'})
            </span>
          </div>
        </div>
      )}
        </>
      )}

      {/* 2. DISMISSED EMPLOYEES TAB VIEW */}
      {activeTab === 'dismissed' && (
        <div className="space-y-4">
          {/* Action and Search Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Bo'shatilgan xodimlar bo'yicha qidiruv (ism, sabab, toifa)..."
                value={dismissSearchQuery}
                onChange={(e) => setDismissSearchQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600"
              />
              {dismissSearchQuery && (
                <button
                  onClick={() => setDismissSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-2">
              <ExportButtons 
                onExportExcel={() => handleExportDismissed('excel')}
                onExportPDF={() => handleExportDismissed('pdf')}
              />
            </div>
          </div>

          {/* Dismissed table */}
          {isLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-16 border border-slate-200/80 dark:border-slate-800 text-center">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Arxivdagi xodimlar ro'yxati yuklanmoqda...
                </span>
              </div>
            </div>
          ) : filteredDismissed.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
                <UserX className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base">Bo'shatilgan xodimlar topilmadi</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                Tizimda hozircha ishdan bo'shatilgan yoki qidiruvga mos keladigan xodimlar ro'yxati mavjud emas.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
              <div className="w-full">
                <table className="w-full text-left text-[10px] border-collapse table-auto">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-extrabold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 select-none">
                    <tr>
                      <th className="py-2.5 px-2 w-8 text-center text-slate-400 dark:text-slate-500">№</th>
                      <th className="py-2.5 px-2">Xodim (F.I.O)</th>
                      <th className="py-2.5 px-2 w-16">ID</th>
                      <th className="py-2.5 px-2 w-28">Filial</th>
                      <th className="py-2.5 px-2 w-28">Lavozim</th>
                      <th className="py-2.5 px-2 w-20">Kirgan</th>
                      <th className="py-2.5 px-2 w-20">Ketgan</th>
                      <th className="py-2.5 px-2 w-24">Toifasi</th>
                      <th className="py-2.5 px-2 min-w-[120px] max-w-[180px]">Sababi</th>
                      <th className="py-2.5 px-2 text-right w-36">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredDismissed.map((emp, index) => (
                      <tr 
                        key={`${emp.id || index}-${index}`} 
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          #{index + 1}
                        </td>
                        <td className="py-2 px-2">
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 block text-[11px] truncate max-w-[120px]" title={emp.fullName}>
                            {emp.fullName}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block truncate max-w-[120px]" title={emp.email}>
                            {emp.email}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className="inline-block px-1.5 py-0.5 font-mono text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200/80 dark:border-slate-700">
                            {emp.staffId}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50/70 dark:bg-emerald-950/40 text-[#00A651] dark:text-emerald-400 text-[9px] font-bold border border-emerald-100 dark:border-emerald-900/40">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate max-w-[90px]" title={emp.branch}>{emp.branch}</span>
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-[10px] flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-[#00A651] shrink-0" />
                            <span className="truncate max-w-[75px]" title={emp.position}>{emp.position}</span>
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono text-[10px]">
                          {emp.hireDate?.split('-').reverse().join('.')}
                        </td>
                        <td className="py-2 px-2 font-mono text-[10px] font-extrabold text-amber-600">
                          {emp.dismissDate?.split('-').reverse().join('.')}
                        </td>
                        <td className="py-2 px-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                            emp.dismissCategory === 'Doimiy ishda' 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200'
                              : emp.dismissCategory === 'Sinovda'
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200'
                              : emp.dismissCategory === 'Stajyor'
                              ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200'
                              : emp.dismissCategory === 'Ta\'tilda'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200'
                          }`}>
                            {emp.dismissCategory}
                          </span>
                        </td>
                        <td className="py-2 px-2 max-w-[180px] text-[10px] text-slate-600 dark:text-slate-400 font-semibold leading-normal" title={emp.dismissReason}>
                          <div className="line-clamp-1" style={{ wordBreak: 'break-word' }}>
                            {emp.dismissReason || '-'}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleRehireEmployee(emp)}
                              className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-[#00A651]/10 text-[#00A651] dark:text-emerald-400 rounded-lg transition-all cursor-pointer font-extrabold text-[9px] flex items-center gap-0.5 border border-emerald-200 dark:border-emerald-800"
                              title="Qayta ishga qabul qilish"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Qayta olish</span>
                            </button>
                            <button
                              onClick={() => setDeleteDismissConfirmId(emp.id)}
                              className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                              title="Arxivdan butunlay o'chirish"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-bold">
                Jami arxivlangan xodimlar soni: {filteredDismissed.length} nafar
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT EMPLOYEE */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#00A651]/10 text-[#00A651] rounded-xl">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">
                      {editingEmployee ? "Xodim Ma'lumotlarini Tahrirlash" : "Yangi Xodim Qo'shish"}
                    </h3>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEmployee} className="space-y-3.5 text-xs font-bold">
                {/* Nomzodlardan tanlash (faqat yangi xodim qo'shilayotganda) */}
                {!editingEmployee && (
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-extrabold text-[#00A651] dark:text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Nomzodlardan to'ldirish (ixtiyoriy)</span>
                      </label>
                      {selectedCandidateId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCandidateId('');
                            resetForm();
                          }}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Tozalash
                        </button>
                      )}
                    </div>
                    <select
                      value={selectedCandidateId}
                      onChange={(e) => handleSelectCandidate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer"
                    >
                      <option value="">-- Nomzodni tanlang (yoki qo'lda kiriting) --</option>
                      {candidatesList.map(cand => (
                        <option key={cand.id} value={cand.id}>
                          {cand.fullName} — {cand.jobPosition || cand.position || 'Nomzod'} ({cand.targetBranch || cand.region || 'Filial'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">To'liq Ism va Familiya *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Sardor Komilov"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Lavozimi *</label>
                    <input
                      type="text"
                      required
                      placeholder="Masalan: Savdo Konsultanti"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Telefon Raqami *</label>
                    <input
                      type="text"
                      required
                      placeholder="+998 90 123 45 67"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Filiali</label>
                    <select
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                    >
                      {availableBranches.map(br => (
                        <option key={br} value={br}>{br}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Jinsi</label>
                    <select
                      value={formData.gender || 'Erkak'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                    >
                      <option value="Erkak">Erkak</option>
                      <option value="Ayol">Ayol</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Ishga Kirgan Sanasi</label>
                    <input
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Xodimlari Holati</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                    >
                      <option value="active">Doimiy ishda</option>
                      <option value="probation">Sinovda</option>
                      <option value="intern">Stajyor</option>
                      <option value="blacklisted">Qora ro'yxatda</option>
                      <option value="leave">Ta'tilda</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Belgilangan Maoshi</label>
                    <input
                      type="text"
                      placeholder="Masalan: 8,000,000 UZS"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Elektron Pochtasi</span>
                      <span className="text-[10px] text-slate-400 font-normal">Ixtiyoriy</span>
                    </label>
                    <input
                      type="email"
                      required={false}
                      placeholder="Ixtiyoriy (masalan: email@toyona.uz)"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Yashash Manzili</label>
                  <input
                    type="text"
                    placeholder="Viloyat, shahar, tuman..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                  />
                </div>

                {/* ========================================================================= */}
                {/* SIFAT TARKIBI VA MALAKA BO'LIMI (Education, Experience, Languages, etc.) */}
                {/* ========================================================================= */}
                <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-[#00A651] border-b border-emerald-200/50 dark:border-emerald-800/40 pb-2">
                    <GraduationCap className="w-4 h-4 shrink-0" />
                    <div>
                      <span className="text-xs font-black">Sifat Tarkibi va Malaka Ma'lumotlari</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Ma'lumot darajasi, staj, oldingi ish tajribasi va til bilishi</p>
                    </div>
                  </div>

                  {/* Ma'lumoti va Bitirgan yili */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">Ma'lumot Darajasi</label>
                      <select
                        value={formData.educationLevel || 'Oliy'}
                        onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer"
                      >
                        <option value="Oliy">Oliy (Bakalavr)</option>
                        <option value="Magistr">Oliy (Magistr)</option>
                        <option value="O'rta-maxsus">O'rta-maxsus (Kollej / Litsey)</option>
                        <option value="O'rta">O'rta (Maktab)</option>
                        <option value="Tugallanmagan oliy">Tugallanmagan oliy</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">Bitirgan Yili</label>
                      <input
                        type="text"
                        placeholder="Masalan: 2021"
                        value={formData.graduationYear || ''}
                        onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                      />
                    </div>
                  </div>

                  {/* Tug'ilgan sana va Umumiy staj (yil) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">Tug'ilgan Sanasi (Yoshi uchun)</label>
                      <input
                        type="date"
                        value={formData.birthDate || ''}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">Umumiy Ish Staji (Yillarda)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="Masalan: 3"
                        value={formData.experienceYears !== undefined ? formData.experienceYears : ''}
                        onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                      />
                    </div>
                  </div>

                  {/* Oldingi Ish Tajribasi va Faoliyati */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Oldingi Ish Tajribasi va Faoliyati</span>
                      <span className="text-[10px] text-slate-400 font-normal">Kompaniyalar, lavozimlar</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Masalan: Korzinka supermarketida 2 yil katta kassir, Texnomartda 1 yil maslahatchi..."
                      value={formData.pastExperience || ''}
                      onChange={(e) => setFormData({ ...formData, pastExperience: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 resize-none"
                    />
                  </div>

                  {/* Til Bilish Darajasi */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      <span>Til Bilish Darajasi</span>
                    </label>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {["O'zbek tili", "Rus tili", "Ingliz tili", "Turk tili"].map((lang) => {
                        const currentLangs = formData.languages || ["O'zbek tili"];
                        const isSelected = currentLangs.includes(lang);
                        return (
                          <button
                            type="button"
                            key={lang}
                            onClick={() => {
                              if (isSelected) {
                                if (currentLangs.length > 1) {
                                  setFormData({ ...formData, languages: currentLangs.filter(l => l !== lang) });
                                }
                              } else {
                                setFormData({ ...formData, languages: [...currentLangs, lang] });
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* 4. DAVLAT HISOBOTLARI VA QONUNIY HUJJATLAR (YAMMT / PINFL) */}
                  {/* ========================================================= */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#00A651]" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Davlat hisoboti va qonuniy ma'lumotlar (YAMMT / Soliq / MK)
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1">
                          JSHSHIR (PINFL - 14 raqamli)
                        </label>
                        <input
                          type="text"
                          maxLength={14}
                          placeholder="Masalan: 31205901230045"
                          value={formData.jshshir || ''}
                          onChange={(e) => setFormData({ ...formData, jshshir: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1">
                          Pasport / ID karta seriya & raqami
                        </label>
                        <input
                          type="text"
                          placeholder="Masalan: AD 1234567"
                          value={formData.passportSeriesNumber || ''}
                          onChange={(e) => setFormData({ ...formData, passportSeriesNumber: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 uppercase"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1">
                          Mehnat shartnomasi raqami & sanasi
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Shartnoma №"
                            value={formData.contractNumber || ''}
                            onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                          />
                          <input
                            type="date"
                            value={formData.contractDate || ''}
                            onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1">
                          Ishga qabul qilish buyrug'i № & sanasi
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Buyruq №"
                            value={formData.decreeNumber || ''}
                            onChange={(e) => setFormData({ ...formData, decreeNumber: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                          />
                          <input
                            type="date"
                            value={formData.decreeDate || ''}
                            onChange={(e) => setFormData({ ...formData, decreeDate: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1">
                          Bank hisob raqami (20 xonali IBAN)
                        </label>
                        <input
                          type="text"
                          maxLength={20}
                          placeholder="20208000..."
                          value={formData.bankAccount || ''}
                          onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1">
                          Harbiy hisob holati
                        </label>
                        <select
                          value={formData.militaryStatus || 'Harbiy xizmatga majbur'}
                          onChange={(e) => setFormData({ ...formData, militaryStatus: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                        >
                          <option value="Harbiy xizmatga majbur">Harbiy xizmatga majbur</option>
                          <option value="Harbiy hisobda turadi">Harbiy hisobda turadi (Zaxirada)</option>
                          <option value="Harbiy xizmatga yaroqsiz">Harbiy xizmatga yaroqsiz</option>
                          <option value="Harbiy hisobdan chiqarilgan">Harbiy hisobdan chiqarilgan</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1">
                          Favqulodda bog'lanish (Yaqin qarindoshi F.I.O)
                        </label>
                        <input
                          type="text"
                          placeholder="Masalan: Karimov Alisher (Otasi)"
                          value={formData.emergencyContactName || ''}
                          onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1">
                          Favqulodda telefon raqami
                        </label>
                        <input
                          type="text"
                          placeholder="+998 90 123 45 67"
                          value={formData.emergencyContactPhone || ''}
                          onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-[#00A651] hover:bg-[#008d44] disabled:bg-[#00A651]/60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md shadow-[#00A651]/20 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saqlanmoqda...</span>
                      </>
                    ) : (
                      editingEmployee ? "O'zgarishlarni Saqlash" : "Xodimni Saqlash"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center"
            >
              <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Rostdan ham o'chirilsinmi?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ushbu xodim ma'lumotlari tizimdan batamom o'chiriladi. Ushbu amalni ortga qaytarib bo'lmaydi.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Ha, O'chirilsin
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 4: TRANSFER TO ANOTHER BRANCH */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {transferringEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-[#00A651] rounded-2xl">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Filialga O'tkazish (Rotatsiya)</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Xodimni boshqa filial yoki yangi lavozimga biriktirish</p>
                  </div>
                </div>
                <button 
                  onClick={() => setTransferringEmployee(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Employee Quick Info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center gap-3">
                <img 
                  src={transferringEmployee.avatarUrl} 
                  alt={transferringEmployee.fullName}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm block truncate">{transferringEmployee.fullName}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block truncate">{transferringEmployee.position} • {transferringEmployee.department}</span>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md w-fit">
                    <span>Hozirgi filial:</span>
                    <span className="font-extrabold">{transferringEmployee.branch}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleExecuteTransfer} className="space-y-3.5 text-xs font-bold">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-extrabold">Yangi Filialni Tanlang *</label>
                  <select
                    required
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  >
                    {availableBranches.map((br) => (
                      <option key={br} value={br} disabled={br === transferringEmployee.branch}>
                        {br} {br === transferringEmployee.branch ? "(Hozirgi filiali)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-extrabold">Yangi Lavozim (ixtiyoriy)</label>
                  <input
                    type="text"
                    value={targetPosition}
                    onChange={(e) => setTargetPosition(e.target.value)}
                    placeholder={transferringEmployee.position}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">Bo'sh qoldirilsa oldingi lavozimi saqlanadi</span>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-extrabold">O'tkazish Sababi / Asos</label>
                  <input
                    type="text"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="Masalan: Filiallararo xizmat rotatsiyasi va resurslar taqsimoti"
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTransferringEmployee(null)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#00A651] hover:bg-[#008d44] text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>O'tkazishni Tasdiqlash</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 5: DISMISS EMPLOYEE (ISHDAN BO'SHATISH) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isDismissModalOpen && dismissingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-2xl">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Ishdan Bo'shatish (Arxivlash)</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Xodim bilan tuzilgan mehnat shartnomasini bekor qilish</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsDismissModalOpen(false);
                    setDismissingEmployee(null);
                  }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Employee Info Card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center gap-3">
                <img 
                  src={dismissingEmployee.avatarUrl} 
                  alt={dismissingEmployee.fullName}
                  className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm block truncate">{dismissingEmployee.fullName}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block truncate">{dismissingEmployee.position} • {dismissingEmployee.branch}</span>
                </div>
              </div>

              <form onSubmit={handleExecuteDismiss} className="space-y-3.5 text-xs font-bold">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-extrabold">Ishdan Bo'shash Vaqtidagi Toifasi *</label>
                  <select
                    required
                    value={dismissCategory}
                    onChange={(e) => setDismissCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600"
                  >
                    <option value="Doimiy ishda">Doimiy ishda</option>
                    <option value="Sinovda">Sinovda</option>
                    <option value="Stajyor">Stajyor</option>
                    <option value="Ta'tilda">Ta'tilda</option>
                    <option value="Qora ro'yxatda">Qora ro'yxatda</option>
                  </select>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Xodimning so'nggi toifasi yoki qora ro'yxatga kiritish asosi</span>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-extrabold">Ishdan Bo'shatish Sababi *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Masalan: O'z xohishiga ko'ra arizasiga binoan, yoki intizomiy jazo chorasi sifatida..."
                    value={dismissReason}
                    onChange={(e) => setDismissReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDismissModalOpen(false);
                      setDismissingEmployee(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Tasdiqlash va Arxivlash</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 6: DELETE DISMISSED ARCHIVE CONFIRMATION */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {deleteDismissConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center"
            >
              <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Arxiv butunlay o'chirilsinmi?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ushbu sobiq xodimning barcha arxiv ma'lumotlari tizimdan qaytarib bo'lmas darajada o'chib ketadi.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteDismissConfirmId(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={() => handleDeleteDismissed(deleteDismissConfirmId)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Ha, Arxivni O'chirish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
