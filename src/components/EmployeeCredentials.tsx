import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Users, 
  Key, 
  Lock, 
  Unlock, 
  Search, 
  Plus, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Edit3, 
  Trash2, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  UserCheck, 
  UserX,
  FileSpreadsheet,
  Download,
  ExternalLink,
  ChevronRight,
  Send,
  X,
  Clock,
  Save,
  RefreshCw,
  SlidersHorizontal,
  Info,
  Camera
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../lib/export';
import { ExportButtons } from './ExportButtons';
import { ModuleHeaderLogo, ToyonaBrand } from './Logo';
import { DEFAULT_GEOZONES, BranchGeozone, deduplicateGeozones } from './BranchGeozones';
import { INITIAL_EMPLOYEES, Employee } from './Employees';
import { 
  getFirebaseEmployees, 
  saveFirebaseEmployee, 
  deleteFirebaseEmployee,
  subscribeFirebaseEmployees,
  saveFirebaseUser,
  getFirebaseUsers,
  getFirebaseGeozones,
  syncUserPasswordInBothCollections
} from '../firebase';

export interface EmployeeWithCredentials extends Employee {
  username?: string;
  password?: string;
  isAccountActive?: boolean;
  lastLoginAt?: string;
  accountCreatedAt?: string;
}

interface EmployeeCredentialsProps {
  currentUser?: any;
  isSuperAdmin?: boolean;
}

export default function EmployeeCredentials({ currentUser, isSuperAdmin = false }: EmployeeCredentialsProps) {
  // Branchlar va Employees holati
  const [branches, setBranches] = useState<BranchGeozone[]>(DEFAULT_GEOZONES);
  const [employees, setEmployees] = useState<EmployeeWithCredentials[]>([]);
  const [selectedBranchName, setSelectedBranchName] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<'all' | 'with_account' | 'no_account'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Tanlangan xodim to'liq ma'lumoti modali
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithCredentials | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Parolni ko'rsatish/yashirish holati
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit / Yangi hisob formasi
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Yangi xodim qo'shish modali
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    fullName: '',
    position: '',
    department: 'Savdo va Chakana',
    branch: 'Downtown Branch',
    phone: '+998 ',
    email: '',
    staffId: '',
    salary: '4,000,000 USD',
    username: '',
    password: ''
  });

  // Branchlar va xodimlarni Firebase'dan yuklash
  useEffect(() => {
    let active = true;

    const normalizeEmployeeList = (rawList: any[]): EmployeeWithCredentials[] => {
      return rawList.map(emp => {
        const uname = emp.username || (emp as any).login || '';
        const upass = emp.password || (emp as any).parol || '';
        return {
          ...emp,
          id: emp.id || (emp as any).firestoreId || 'emp-101',
          fullName: emp.fullName || (emp as any).name || (emp as any).fio || 'Noma\'lum',
          position: emp.position || (emp as any).jobPosition || (emp as any).lavozim || 'Employee',
          department: emp.department || 'Savdo va Chakana',
          branch: emp.branch || (emp as any).targetBranch || (emp as any).filial || 'Headquarters',
          phone: emp.phone || (emp as any).phone1 || '',
          staffId: emp.staffId || 'TS-0001',
          avatarUrl: emp.avatarUrl || (emp as any).photoUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(emp.fullName || 'User')}&backgroundColor=e2e8f0`,
          username: uname,
          password: upass,
          isAccountActive: !!(uname && upass && emp.isAccountActive !== false)
        };
      });
    };

    // Branchlarni olish
    getFirebaseGeozones().then((cloudBranches) => {
      if (!active) return;
      if (cloudBranches && cloudBranches.length > 0) {
        const merged = deduplicateGeozones([...cloudBranches, ...DEFAULT_GEOZONES]);
        setBranches(merged);
        if (!selectedBranchName && merged[0]?.name) {
          setSelectedBranchName(merged[0].name);
        }
      } else {
        setBranches(deduplicateGeozones(DEFAULT_GEOZONES));
      }
    }).catch(() => {
      if (active) setBranches(deduplicateGeozones(DEFAULT_GEOZONES));
    });

    // Employeesni real-time eshitish va tezkor kesh/API orqali yuklash
    const unsub = subscribeFirebaseEmployees((cloudEmployees) => {
      if (!active) return;
      if (cloudEmployees && cloudEmployees.length > 0) {
        setEmployees(normalizeEmployeeList(cloudEmployees));
      } else {
        setEmployees(prev => prev.length > 0 ? prev : normalizeEmployeeList(INITIAL_EMPLOYEES));
      }
      setIsLoading(false);
    });

    // Safety fallback timer so spinner never hangs
    const safetyTimer = setTimeout(() => {
      if (!active) return;
      setEmployees(prev => prev.length > 0 ? prev : normalizeEmployeeList(INITIAL_EMPLOYEES));
      setIsLoading(false);
    }, 2000);

    return () => {
      active = false;
      clearTimeout(safetyTimer);
      unsub();
    };
  }, []);

  // Username generator
  function generateDefaultUsername(fullName?: string): string {
    if (!fullName) return 'xodim' + Math.floor(100 + Math.random() * 900);
    const parts = (fullName || '').toLowerCase().replace(/['`ʻ’]/g, '').split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[1]}.${parts[0]}`.replace(/[^a-z0-9._]/g, '');
    }
    return (parts[0] || 'xodim') + Math.floor(100 + Math.random() * 900);
  }

  // Parol generator
  function generateDefaultPassword(fullName?: string): string {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    let pass = 'Toyona#';
    for (let i = 0; i < 4; i++) {
      pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return pass;
  }

  // Tasodifiy yangi parol yaratish
  const handleGenerateRandomPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const nums = '23456789';
    const syms = '#$%&!';
    
    let pass = '';
    pass += upper.charAt(Math.floor(Math.random() * upper.length));
    pass += lower.charAt(Math.floor(Math.random() * lower.length));
    pass += nums.charAt(Math.floor(Math.random() * nums.length));
    pass += syms.charAt(Math.floor(Math.random() * syms.length));
    
    const all = upper + lower + nums + syms;
    for (let i = 0; i < 4; i++) {
      pass += all.charAt(Math.floor(Math.random() * all.length));
    }
    setFormPassword(pass);
    showNotice('Yangi xavfsiz parol yaratildi!', 'success');
  };

  const showNotice = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message: msg });
    setTimeout(() => setNotification(null), 3500);
  };

  // Clipboard copy
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showNotice(`"${text}" copied to clipboard!`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Employeeni tanlash va uning ma'lumotlarini modalda ochish
  const handleOpenDetail = (emp: EmployeeWithCredentials) => {
    setSelectedEmployee(emp);
    setFormUsername(emp.username || generateDefaultUsername(emp.fullName));
    setFormPassword(emp.password || generateDefaultPassword(emp.fullName));
    setFormIsActive(emp.isAccountActive !== false);
    setShowPassword(false);
    setIsDetailModalOpen(true);
  };

  // Employeening yangi login/parolini saqlash (Firebase)
  const handleSaveCredentials = async () => {
    if (!selectedEmployee) return;
    if (!formUsername.trim()) {
      showNotice('Username bo\'sh bo\'lishi mumkin emas!', 'error');
      return;
    }
    if (!formPassword.trim() || formPassword.length < 4) {
      showNotice('Parol kamida 4 belgidan iborat bo\'lishi kerak!', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updatedEmp: EmployeeWithCredentials = {
        ...selectedEmployee,
        username: formUsername.trim(),
        password: formPassword.trim(),
        isAccountActive: formIsActive,
        accountCreatedAt: selectedEmployee.accountCreatedAt || new Date().toISOString().split('T')[0]
      };

      // 1. Employee to'plamiga saqlash
      await saveFirebaseEmployee(updatedEmp);

      // 2. Firebase va serverlar bo'ylab 'users' va 'employees' to'plamlarida darhol sinxronlashtirish
      syncUserPasswordInBothCollections(formUsername.trim(), formPassword.trim(), updatedEmp.id).catch(() => {});

      // Mahalliy holatni yangilash
      setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
      setSelectedEmployee(updatedEmp);
      setIsDetailModalOpen(false);
      showNotice(`"${updatedEmp.fullName}" uchun login va parol muvaffaqiyatli saqlandi!`, 'success');
    } catch (err: any) {
      showNotice(err.message || 'Save Credentialsda xatolik yuz berdi', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Employee hisobini (login/parol) yoki xodimni to'g'ridan-to'g'ri o'chirish
  const handleDeleteCredentials = async (emp: EmployeeWithCredentials | null) => {
    if (!emp) return;

    const confirmMsg = emp.username
      ? `"${emp.fullName}" xodimining davomat logini va parolini o'chirishni tasdiqlaysizmi?`
      : `"${emp.fullName}" xodimini tizimdan butunlay o'chirishni tasdiqlaysizmi?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      // Serverdagi xotiradan ham zudlik bilan o'chirish
      fetch(`/api/attendance/employees/${emp.id}`, { method: 'DELETE' }).catch(() => {});

      if (emp.username) {
        // Login va parolni tozalash
        const updatedEmp: EmployeeWithCredentials = {
          ...emp,
          username: '',
          password: '',
          isAccountActive: false
        };
        await saveFirebaseEmployee(updatedEmp);
        setEmployees(prev => prev.map(e => e.id === emp.id ? updatedEmp : e));
        if (selectedEmployee?.id === emp.id) {
          setIsDetailModalOpen(false);
          setSelectedEmployee(null);
        }
        showNotice(`"${emp.fullName}" xodimining login va paroli o'chirildi!`, 'success');
      } else {
        // Employeeni o'chirish
        await deleteFirebaseEmployee(emp.id);
        setEmployees(prev => prev.filter(e => e.id !== emp.id));
        if (selectedEmployee?.id === emp.id) {
          setIsDetailModalOpen(false);
          setSelectedEmployee(null);
        }
        showNotice(`"${emp.fullName}" xodimi muvaffaqiyatli o'chirildi!`, 'success');
      }
    } catch (err: any) {
      showNotice(err.message || "Deleteda xatolik yuz berdi", 'error');
    }
  };

  // Employeega SMS / Telegram uchun tayyor matn nusxalash
  const handleCopyShareText = () => {
    if (!selectedEmployee) return;
    const branchInfo = branches.find(b => b.name === selectedEmployee.branch);
    const text = `Assalomu alaykum, ${selectedEmployee.fullName}!
Siz uchun "Toyona Savdo" Davomat Tizimi hisobi yaratildi:

🏢 Biriktirilgan Branch: ${selectedEmployee.branch}
📍 Branch manzili: ${branchInfo?.address || 'Qo\'qon shahar'}
👤 Username: ${formUsername}
🔑 Password: ${formPassword}

Please, ish joyingizga kelganda mobil brauzeringiz orqali davomat tizimiga kiring va o'z filaligingiz hududida "Check-inm" tugmasini bosing!`;

    navigator.clipboard.writeText(text);
    showNotice('SMS / Telegram uchun xabar matni copied to clipboard!', 'success');
  };

  // Yangi xodim va hisob qo'shish
  const handleAddNewEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.fullName.trim()) {
      showNotice('Employee F.I.SH kiritilishi shart!', 'error');
      return;
    }

    const username = newEmployee.username.trim() || generateDefaultUsername(newEmployee.fullName);
    const password = newEmployee.password.trim() || generateDefaultPassword(newEmployee.fullName);

    const empId = `emp-${Date.now()}`;
    const numericIds = employees
      .map(e => parseInt((e.staffId || '').replace(/\D/g, ''), 10))
      .filter(n => !isNaN(n));
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : employees.length;
    const computedStaffId = `TS-${String(maxId + 1).padStart(4, '0')}`;

    const created: EmployeeWithCredentials = {
      id: empId,
      fullName: newEmployee.fullName.trim(),
      position: newEmployee.position.trim() || 'Employee',
      department: newEmployee.department,
      branch: newEmployee.branch,
      phone: newEmployee.phone.trim(),
      email: newEmployee.email.trim() || `${username}@toyona.uz`,
      hireDate: new Date().toISOString().split('T')[0],
      status: 'active',
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newEmployee.fullName)}&background=00A651&color=fff`,
      staffId: computedStaffId,
      salary: newEmployee.salary,
      username,
      password,
      isAccountActive: true,
      accountCreatedAt: new Date().toISOString().split('T')[0]
    };

    setIsSaving(true);
    try {
      await saveFirebaseEmployee(created);
      await saveFirebaseUser({
        id: Date.now(),
        name: created.fullName,
        username,
        password,
        email: created.email,
        role: 'Staff',
        branch: created.branch,
        lastActive: 'Hozirgina qo\'shildi',
        allowedModules: ['employee_portal']
      });

      setEmployees(prev => [created, ...prev]);
      setIsAddEmployeeModalOpen(false);
      showNotice(`Yangi xodim "${created.fullName}" va uning hisobi yaratildi!`, 'success');
      // Reset form
      setNewEmployee({
        fullName: '',
        position: '',
        department: 'Savdo va Chakana',
        branch: selectedBranchName || 'Downtown Branch',
        phone: '+998 ',
        email: '',
        staffId: '',
        salary: '4,000,000 USD',
        username: '',
        password: ''
      });
    } catch (err: any) {
      showNotice(err.message || 'Error yuz berdi', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Branchlar bo'yicha xodimlar soni va statistikasi
  const branchStats = deduplicateGeozones(branches).map(branch => {
    const branchEmployees = employees.filter(e => e.branch === branch.name);
    const withAccountCount = branchEmployees.filter(e => e.username && e.password && e.isAccountActive !== false).length;
    return {
      ...branch,
      totalEmployees: branchEmployees.length,
      withAccount: withAccountCount,
      withoutAccount: branchEmployees.length - withAccountCount
    };
  });

  // Hozirgi tanlangan filial xodimlari
  const currentBranchEmployees = useMemo(() => {
    const list = employees.filter(emp => {
      // Branch bo'yicha
      const matchesBranch = selectedBranchName === 'all' || (emp.branch || '') === selectedBranchName;
      
      // Search bo'yicha (Ism va Familya bo'yicha)
      const query = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = !query || 
        (emp.fullName || '').toLowerCase().includes(query) ||
        (emp.position || '').toLowerCase().includes(query) ||
        (emp.phone || '').toLowerCase().includes(query) ||
        (emp.username && emp.username.toLowerCase().includes(query)) ||
        (emp.staffId && emp.staffId.toLowerCase().includes(query));

      // Hisob filteri bo'yicha
      const hasAccount = Boolean(emp.username && emp.password);
      const matchesFilter = 
        accountFilter === 'all' ? true :
        accountFilter === 'with_account' ? hasAccount :
        !hasAccount;

      // Viloyat bo'yicha (Region filter)
      let matchesRegion = true;
      if (selectedRegion !== 'all') {
        const regionLower = selectedRegion.toLowerCase();
        const empAddress = (emp.address || '').toLowerCase();
        const empBranch = (emp.branch || '').toLowerCase();
        
        // Map branches to their respective default regions
        let resolvedRegion = '';
        if (
          empBranch.includes('turkiston') || 
          empBranch.includes('navoiy') || 
          empBranch.includes('istiqlol') || 
          empBranch.includes('mingtut') || 
          empBranch.includes('qo\'qon') ||
          empBranch.includes('fergana') ||
          empBranch.includes('farg\'ona')
        ) {
          resolvedRegion = 'farg\'ona';
        } else if (
          empBranch.includes('bosh ofis') || 
          empBranch.includes('toshkent')
        ) {
          resolvedRegion = 'toshkent';
        } else if (empBranch.includes('andijon')) {
          resolvedRegion = 'andijon';
        } else if (empBranch.includes('namangan')) {
          resolvedRegion = 'namangan';
        }

        matchesRegion = 
          empAddress.includes(regionLower) || 
          empBranch.includes(regionLower) ||
          resolvedRegion.includes(regionLower);
      }

      return matchesBranch && matchesSearch && matchesFilter && matchesRegion;
    });

    const uniqueMap = new Map<string, EmployeeWithCredentials>();
    list.forEach((emp, i) => {
      const key = emp.id || emp.staffId || `${emp.fullName}_${i}`;
      uniqueMap.set(key, emp);
    });
    return Array.from(uniqueMap.values());
  }, [employees, selectedBranchName, searchQuery, accountFilter, selectedRegion]);

  // Umumiy statistika
  const totalEmployeesCount = employees.length;
  const totalAccountsCount = employees.filter(e => e.username && e.password).length;
  const selectedBranchData = branches.find(b => b.name === selectedBranchName);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-[9999] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-900/40' 
                : 'bg-rose-600 text-white border-rose-400 shadow-rose-900/40'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-semibold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER & LOGO */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#00A651] shadow-xs">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Employees Davomat Hisoblari (Login & Parol)</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00A651]/10 text-[#00A651]">
                  Davomat Moduli
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Branchlar bo'yicha xodimlarga davomat tizimi uchun shaxsiy login va parollarni yaratish va boshqarish
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setNewEmployee(prev => ({ ...prev, branch: selectedBranchName || 'Downtown Branch' }));
                setIsAddEmployeeModalOpen(true);
              }}
              className="px-3.5 py-2 bg-[#00A651] hover:bg-[#008d44] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi Employee va Hisob</span>
            </button>

            <ExportButtons 
              onExportExcel={() => exportToExcel(currentBranchEmployees.map(e => ({
                "F.I.SH": e.fullName,
                "Branch": e.branch,
                "Department": e.department,
                "Designation": e.position,
                "Tabel raqami": e.staffId,
                "Telefon": e.phone,
                "Username": e.username || '-',
                "Parol": e.password || '-',
                "Hisob": e.username ? 'Mavjud' : 'Kiritilmagan'
              })), `Employees_Login_Parol_${selectedBranchName}`)}
              onExportPDF={() => exportToPDF(
                ['F.I.SH', 'Branch', 'Designation', 'Username', 'Parol', 'Hisob'],
                currentBranchEmployees.map(e => [
                  e.fullName,
                  e.branch,
                  e.position,
                  e.username || '-',
                  e.password || '-',
                  e.username ? 'Mavjud' : 'Kiritilmagan'
                ]),
                `Employees_Login_Parol_${selectedBranchName}`,
                `Employees Login va Parollari - ${selectedBranchName}`
              )}
            />
          </div>
        </div>

        {/* STATISTIKA BLOKLARI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Jami Branchlar</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-black text-slate-800">{branches.length} ta</span>
              <Building2 className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">Total Employees</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-black text-blue-900">{totalEmployeesCount} nafar</span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
          </div>

          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
            <span className="text-[11px] font-semibold text-[#00A651] uppercase tracking-wider block">Login Berilgan</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-black text-emerald-900">{totalAccountsCount} nafar</span>
              <ShieldCheck className="w-5 h-5 text-[#00A651]" />
            </div>
          </div>

          <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Tanlangan Branch</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-bold text-amber-900 truncate max-w-[130px]">{selectedBranchName === 'all' ? 'All Branches' : selectedBranchName}</span>
              <MapPin className="w-5 h-5 text-amber-500 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* XODIMLAR RO'YXATI VA HISOBLARI */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00A651] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {selectedBranchName === 'all' 
                  ? 'Barcha Branchlar Employeesi' 
                  : `"${selectedBranchName}" xodimlari ro'yxati`}
              </h2>
              <p className="text-xs text-slate-500">
                Istalgan xodim ustiga bosib uning barcha shaxsiy ma'lumotlarini va login/parolini boshqaring
              </p>
            </div>
          </div>

          {/* Filterlar va Search */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            {/* Ism va familya bo'yicha */}
            <div className="relative min-w-[180px] flex-1 sm:flex-none">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Ism, familya yoki lavozim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651] focus:outline-none"
              />
            </div>

            {/* Branchlar bo'yicha */}
            <select
              value={selectedBranchName}
              onChange={(e) => setSelectedBranchName(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-[#00A651] focus:outline-none cursor-pointer"
            >
              <option value="all">All Branches</option>
              {deduplicateGeozones(branches).map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>

            {/* Viloyat bo'yicha */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-[#00A651] focus:outline-none cursor-pointer"
            >
              <option value="all">Barcha viloyatlar</option>
              <option value="farg'ona">Farg'ona viloyati</option>
              <option value="toshkent">Toshkent viloyati / sh.</option>
              <option value="andijon">Andijon viloyati</option>
              <option value="namangan">Namangan viloyati</option>
            </select>

            {/* Hisob holati bo'yicha */}
            <select
              value={accountFilter}
              onChange={(e: any) => setAccountFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-[#00A651] focus:outline-none cursor-pointer"
            >
              <option value="all">Barcha hisoblar</option>
              <option value="with_account">Faqat hisobi borlar</option>
              <option value="no_account">Hisob kiritilmaganlar</option>
            </select>
          </div>
        </div>

        {/* Employees ro'yxati (Jadval yoki Kartochkalar) */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00A651]" />
            Ma'lumotlar yuklanmoqda...
          </div>
        ) : currentBranchEmployees.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">Ushbu filialda xodimlar topilmadi</p>
            <p className="text-xs text-slate-400 mt-1">Yangi xodim qo'shish yoki qidiruv parametrlarini o'zgartirib ko'ring</p>
            <button
              onClick={() => {
                setNewEmployee(prev => ({ ...prev, branch: selectedBranchName || 'Downtown Branch' }));
                setIsAddEmployeeModalOpen(true);
              }}
              className="mt-3 px-3 py-1.5 bg-[#00A651] text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yangi xodim qo'shish</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3">Employee (F.I.SH)</th>
                  <th className="py-3 px-3">Designation & Department</th>
                  <th className="py-3 px-3">Branch</th>
                  <th className="py-3 px-3">Davomat Logini</th>
                  <th className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span>Parol</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllPasswords(!showAllPasswords);
                        }}
                        className="p-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                        title={showAllPasswords ? "Yashirish" : "Ko'rsatish"}
                      >
                        {showAllPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {currentBranchEmployees.map((emp, index) => {
                  const hasCreds = Boolean(emp.username && emp.password);
                  return (
                    <motion.tr
                      key={`${emp.id || index}-${index}`}
                      whileHover={{ backgroundColor: 'rgba(0, 166, 81, 0.03)' }}
                      onClick={() => handleOpenDetail(emp)}
                      className="cursor-pointer transition-colors group"
                    >
                      {/* Employee F.I.SH va Avatar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={emp.avatarUrl}
                            alt={emp.fullName}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                            onError={(e) => {
                              (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.fullName)}&background=00A651&color=fff`;
                            }}
                          />
                          <div>
                            <span className="font-bold text-slate-900 block group-hover:text-[#00A651] transition-colors">
                              {emp.fullName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {emp.staffId || 'ID yo\'q'} • {emp.phone}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Designation & Department */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block">{emp.position}</span>
                        <span className="text-[11px] text-slate-500">{emp.department}</span>
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          <MapPin className="w-3 h-3 text-[#00A651]" />
                          {emp.branch}
                        </span>
                      </td>

                      {/* Login */}
                      <td className="py-3 px-3">
                        {hasCreds ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-[#00A651] border border-emerald-200 font-mono text-[11px] font-bold">
                            <Key className="w-3 h-3" />
                            <span>{emp.username}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Yaratilmagan
                          </span>
                        )}
                      </td>

                      {/* Parol */}
                      <td className="py-3 px-3">
                        {hasCreds ? (
                          <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <span className="font-bold">{showAllPasswords ? emp.password : '••••••••'}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(emp.password || '', 'password');
                              }}
                              className="p-1 text-slate-400 hover:text-[#00A651] rounded-md transition-colors shrink-0"
                              title="Parolni nusxalash"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions: Ko'rish va Delete */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(emp);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-[#00A651] hover:text-white text-slate-700 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Batafsil ko'rish va tahrirlash"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ko'rish</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCredentials(emp);
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                            title={emp.username ? "Login va parolni o'chirish" : "Employeeni o'chirish"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3-QADAM: XODIMNING USTIGA BOSILGANDA OCHILADIGAN TO'LIQ MA'LUMOTLAR MODALI */}
      <AnimatePresence>
        {isDetailModalOpen && selectedEmployee && (
          <div 
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setIsDetailModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8"
            >
              {/* MODAL HEADER */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedEmployee.avatarUrl}
                    alt={selectedEmployee.fullName}
                    className="w-11 h-11 rounded-2xl object-cover border border-white/20 shrink-0"
                    onError={(e) => {
                      (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmployee.fullName)}&background=00A651&color=fff`;
                    }}
                  />
                  <div>
                    <h3 className="text-sm font-extrabold text-white">{selectedEmployee.fullName}</h3>
                    <p className="text-[11px] text-emerald-400 font-semibold">{selectedEmployee.position}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* MODAL BODY (SODDA: LAVOZIM, FILIAL, LOGIN, PAROL) */}
              <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
                {/* 1. LAVOZIM */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Designation</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Briefcase className="w-4 h-4 text-[#00A651]" />
                    {selectedEmployee.position}
                  </span>
                </div>

                {/* 2. FILIAL */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Branch</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-4 h-4 text-[#00A651]" />
                    {selectedEmployee.branch}
                  </span>
                </div>

                {/* 3. LOGIN */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Username</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(formUsername, 'username')}
                      className="text-[11px] text-[#00A651] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedField === 'username' ? 'Nusxalandi!' : 'Logini nusxalash'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-[#00A651] focus:outline-none"
                    placeholder="masalan: rustam.aliyev"
                  />
                </div>

                {/* 4. PAROL */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Parol</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleGenerateRandomPassword}
                        className="text-[11px] text-amber-700 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Yangi parol</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(formPassword, 'password')}
                        className="text-[11px] text-[#00A651] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedField === 'password' ? 'Nusxalandi!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-[#00A651] focus:outline-none pr-10"
                      placeholder="Kamida 4 ta belgi"
                    />
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setShowPassword(!showPassword); 
                        setTimeout(() => {
                          passwordInputRef.current?.focus();
                        }, 0);
                      }}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 4. FACE ID ETALON FOTOSURATI (SKANER UCHUN) */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                      Face ID Etalon Rasmi (Skaner uchun)
                    </span>
                    <label className="text-[11px] text-purple-700 hover:underline flex items-center gap-1 font-bold cursor-pointer">
                      <Camera className="w-3.5 h-3.5 text-purple-600" />
                      <span>Fayldan surat yuklash</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const base64 = reader.result as string;
                              setSelectedEmployee(prev => prev ? { ...prev, avatarUrl: base64 } : null);
                              // Send to backend
                              fetch('/api/attendance/employee-photo', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  employeeId: selectedEmployee.id,
                                  username: formUsername || selectedEmployee.username,
                                  photoUrl: base64
                                })
                              }).catch(() => {});
                              setNotification({ type: 'success', message: "Surat tanlandi! Save Credentials tugmasini bosing." });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedEmployee.avatarUrl}
                      alt="Face ID photo"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-300 shrink-0 bg-slate-200"
                      onError={(e) => {
                        (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmployee.fullName)}&background=8b5cf6&color=fff`;
                      }}
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={selectedEmployee.avatarUrl || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedEmployee(prev => prev ? { ...prev, avatarUrl: val } : null);
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        placeholder="Yoki rasm URL havolasini kiriting..."
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Narigi AI xodim "Check-inm" deb kameraga qaraganda aynan shu rasmni oladi.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteCredentials(selectedEmployee)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Employeening login va parolini o'chirish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hisobni o'chirish</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-white transition-all cursor-pointer"
                  >
                    Yopish
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveCredentials}
                    className="px-5 py-2 bg-[#00A651] hover:bg-[#008d44] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saqlanmoqda...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Credentials</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* YANGI XODIM VA HISOB QO'SHISH MODALI */}
      <AnimatePresence>
        {isAddEmployeeModalOpen && (
          <div 
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setIsAddEmployeeModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8"
            >
              <div className="bg-[#00A651] text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/20 text-white">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Yangi Employee va Davomat Hisobi</h3>
                    <p className="text-xs text-white/80">Branchga yangi xodim qo'shish va unga login/parol belgilash</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddEmployeeModalOpen(false)}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddNewEmployee} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employee F.I.SH *</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.fullName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewEmployee(prev => ({
                        ...prev,
                        fullName: val,
                        username: generateDefaultUsername(val)
                      }));
                    }}
                    placeholder="Masalan: Sardor Komilov"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={newEmployee.position}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="Sotuvchi, Kassir..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Biriktirilgan Branch</label>
                    <select
                      value={newEmployee.branch}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, branch: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651] focus:outline-none"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Telefon raqam</label>
                    <input
                      type="text"
                      value={newEmployee.phone}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+998 90 123 45 67"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00A651] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tabel raqami</label>
                    <input
                      type="text"
                      value={newEmployee.staffId}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, staffId: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#00A651] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                  <span className="text-xs font-extrabold text-[#00A651] block uppercase tracking-wider">
                    Davomat hisobi ma'lumotlari:
                  </span>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Username:</label>
                    <input
                      type="text"
                      value={newEmployee.username}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Avtomatik yaratiladi..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#00A651] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Password:</label>
                    <input
                      type="text"
                      value={newEmployee.password}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Toyona#2026"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#00A651] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddEmployeeModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-[#00A651] hover:bg-[#008d44] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? "Saqlanmoqda..." : "Employee va Hisobni Yaratish"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
