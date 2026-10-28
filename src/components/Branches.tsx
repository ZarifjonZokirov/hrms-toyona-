import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Network, 
  Phone, 
  Clock, 
  MapPin, 
  Users, 
  Building2, 
  Save, 
  Mail, 
  Briefcase, 
  UserCheck, 
  Eye,
  Filter,
  RotateCcw,
  Sparkles,
  User,
  CheckCircle2,
  Layers,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ModuleHeaderLogo, ToyonaBrand } from './Logo';
import { DEFAULT_GEOZONES, BranchGeozone } from './BranchGeozones';
import { Employee, INITIAL_EMPLOYEES } from './Employees';
import { Vacancy, INITIAL_21_VACANCIES } from './Vacancies';
import { 
  getFirebaseBranches, 
  saveFirebaseBranch, 
  deleteFirebaseBranch,
  saveFirebaseGeozone,
  deleteFirebaseGeozone,
  getFirebaseEmployees, 
  getFirebaseVacancies, 
  subscribeFirebaseVacancies 
} from '../firebase';
import { exportToExcel, exportToPDF } from '../lib/export';
import { ExportButtons } from './ExportButtons';

export type BranchCategory = 'A' | 'B' | 'C' | 'D' | 'Mini';

export interface Branch {
  id: string;
  nameUz: string;
  nameRu: string;
  region: string;
  category: BranchCategory;
  vacancyCount: number | string;
  date: string;
  description?: string;
  address?: string;
  landmark?: string;
  phone?: string;
  workHours?: string;
  manager?: string;
}

// Helper to filter vacancies belonging to a specific branch
export const getBranchVacancies = (branchName: string, vacancyList: Vacancy[]): Vacancy[] => {
  if (!branchName || !vacancyList || vacancyList.length === 0) return [];
  return vacancyList.filter(vac => {
    if (vac.status === "To'ldirilgan") return false;
    return matchEmployeeToBranch(vac.branch, branchName);
  });
};

// Helper to calculate total open vacancy quota headcount for a branch
export const getBranchVacancyQuota = (branchName: string, vacancyList: Vacancy[]): number => {
  const vacs = getBranchVacancies(branchName, vacancyList);
  return vacs.reduce((sum, v) => sum + (Number(v.headcount) || 1), 0);
};

export const matchEmployeeToBranch = (empBranch: string | undefined, branchName: string): boolean => {
  if (!empBranch || !branchName) return false;
  const e = empBranch.toLowerCase().trim();
  const b = branchName.toLowerCase().trim();
  
  if (e === b) return true;
  if (e.includes(b) || b.includes(e)) return true;
  
  // Clean prefixes / suffixes
  const strip = (s: string) => s
    .replace(/\b(filiali|filial|markaziy|toshkent|shahri|shahar|viloyati)\b/gi, '')
    .replace(/[()]/g, '')
    .trim();

  const se = strip(e);
  const sb = strip(b);
  if (se && sb && (se.includes(sb) || sb.includes(se))) return true;

  // Head office synonyms
  const isHeadE = e.includes('bosh ofis') || e.includes('bosh idora') || e.includes('bosh bino') || e.includes('idora');
  const isHeadB = b.includes('bosh ofis') || b.includes('bosh idora') || b.includes('bosh bino') || b.includes('idora');
  if (isHeadE && isHeadB) return true;

  // Legacy city matches
  if (e.includes('andijon') && (b.includes('turkiston') || b.includes('andijon'))) return true;
  if (e.includes('namangan') && (b.includes('istiqlol') || b.includes('namangan'))) return true;
  if (e.includes("farg'ona") && (b.includes('mingtut') || b.includes("farg'ona"))) return true;
  if (e.includes('samarqand') && (b.includes('pop') || b.includes('samarqand'))) return true;

  return false;
};

export const getBranchForEmployee = (emp: Employee, branchList: Branch[]): Branch | undefined => {
  return branchList.find(b => matchEmployeeToBranch(emp.branch, b.nameUz));
};

export const getEmployeeRegion = (emp: Employee, branchList: Branch[]): string => {
  const branch = getBranchForEmployee(emp, branchList);
  if (branch && branch.region) return branch.region;
  
  const eb = (emp.branch || '').toLowerCase();
  if (eb.includes('andijon') || eb.includes('turkiston')) return 'Andijon viloyati';
  if (eb.includes('farg\'ona') || eb.includes('mingtut') || eb.includes('qo\'qon')) return "Farg'ona viloyati";
  if (eb.includes('namangan') || eb.includes('istiqlol')) return 'Namangan viloyati';
  if (eb.includes('toshkent') || eb.includes('bosh ofis') || eb.includes('bosh idora')) return 'Toshkent shahri';
  if (eb.includes('samarqand') || eb.includes('pop')) return 'Samarqand viloyati';
  return "Farg'ona viloyati";
};

const initialBranches: Branch[] = [
  { id: '1', nameUz: 'Andijon', nameRu: 'Андижан', region: 'Andijon viloyati', category: 'A', vacancyCount: 1, date: '7.9.2026' },
  { id: '2', nameUz: 'Andijon', nameRu: 'Андижан', region: 'Andijon viloyati', category: 'B', vacancyCount: 4, date: '7.9.2026' },
  { id: '3', nameUz: 'Andijon', nameRu: 'Андижан', region: 'Andijon viloyati', category: 'C', vacancyCount: 0, date: '7.9.2026' },
  { id: '4', nameUz: 'Andijon', nameRu: 'Андижан', region: 'Andijon viloyati', category: 'D', vacancyCount: 1, date: '7.9.2026' },
  { id: '5', nameUz: 'Andijon', nameRu: 'Андижан', region: 'Andijon viloyati', category: 'Mini', vacancyCount: 0, date: '7.9.2026' },
];

const categoryColors: Record<BranchCategory, string> = {
  'A': 'bg-emerald-100 text-emerald-700',
  'B': 'bg-cyan-100 text-cyan-700',
  'C': 'bg-blue-600 text-white',
  'D': 'bg-red-100 text-red-600',
  'Mini': 'bg-pink-100 text-pink-600',
};

interface BranchesProps {
  onNavigateToVacancies?: () => void;
}

export default function Branches({ onNavigateToVacancies }: BranchesProps = {}) {
  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      const savedGeozones = localStorage.getItem('toyonasavdo_branch_geozones');
      if (savedGeozones) {
        const parsed = JSON.parse(savedGeozones);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((g: BranchGeozone, idx: number) => ({
            id: g.id || String(idx + 1),
            nameUz: g.name,
            nameRu: g.name,
            description: g.description,
            region: 'Farg\'ona viloyati',
            category: (['A', 'B', 'C', 'D', 'Mini'][idx % 5] || 'A') as BranchCategory,
            vacancyCount: 0,
            date: '15.9.2026',
            address: g.address
          }));
        }
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_GEOZONES.map((g, idx) => ({
      id: g.id,
      nameUz: g.name,
      nameRu: g.name,
      description: g.description,
      region: 'Farg\'ona viloyati',
      category: (['A', 'B', 'C', 'D', 'Mini'][idx % 5] || 'A') as BranchCategory,
      vacancyCount: 0,
      date: '15.9.2026',
      address: g.address
    }));
  });

  // Real-time vacancies state connected with Bo'sh ish o'rinlari (Vacancies) module
  const [vacancies, setVacancies] = useState<Vacancy[]>(INITIAL_21_VACANCIES);

  // Dynamic employees state connected with Xodimlar (Employees) module
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('hrms_employees');
      if (saved) {
        const parsed: Employee[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(emp => {
            if (emp.branch === 'Bosh Idora (Toshkent)') return { ...emp, branch: 'Bosh ofis' };
            if (emp.branch === 'Andijon Markaziy') return { ...emp, branch: 'Turkiston filiali' };
            if (emp.branch === 'Namangan Filiali') return { ...emp, branch: 'Istiqlol (Gorod) filiali' };
            if (emp.branch === "Farg'ona Filiali") return { ...emp, branch: 'Mingtut filiali' };
            if (emp.branch === 'Samarqand Filiali') return { ...emp, branch: 'Pop filiali' };
            return emp;
          });
        }
      }
    } catch (e) {}
    return INITIAL_EMPLOYEES;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Listen for real-time employee changes from Xodimlar (Employees) module
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getFirebaseBranches().then(fbBranches => {
        const defaultBranchItems: Branch[] = DEFAULT_GEOZONES.map((g, idx) => ({
          id: g.id,
          nameUz: g.name,
          nameRu: g.name,
          description: g.description,
          region: g.name.includes('Toshkent') ? 'Toshkent shahri' : "Farg'ona viloyati",
          category: (['A', 'B', 'C', 'D', 'Mini'][idx % 5] || 'A') as BranchCategory,
          vacancyCount: 0,
          date: '15.9.2026',
          address: g.address
        }));

        if (fbBranches && fbBranches.length > 0) {
          setBranches(prev => {
            const map = new Map<string, Branch>();
            const seenNames = new Set<string>();

            // Process defaults first
            defaultBranchItems.forEach(def => {
              const norm = def.nameUz.toLowerCase().replace(/[^a-z0-9]/g, '');
              seenNames.add(norm);
              map.set(def.id, def);
            });

            // Overlay Firebase branches
            fbBranches.forEach((fb: any) => {
              const rawId = fb.id || fb.firestoreId || '';
              const branchName = fb.name || fb.nameUz || '';
              const norm = branchName.toLowerCase().replace(/[^a-z0-9]/g, '');
              
              const item: Branch = {
                id: rawId || `branch-fb-${map.size + 1}`,
                nameUz: branchName,
                nameRu: fb.nameRu || branchName,
                description: fb.description,
                region: fb.region || (branchName.includes('Toshkent') ? 'Toshkent shahri' : "Farg'ona viloyati"),
                category: fb.category || 'A',
                vacancyCount: 0,
                date: fb.date || '15.9.2026',
                address: fb.address,
                landmark: fb.landmark,
                phone: fb.phone,
                workHours: fb.workHours,
                manager: fb.manager
              };

              let existingKey: string | null = null;
              for (const [k, v] of map.entries()) {
                if (k === rawId || v.nameUz.toLowerCase().replace(/[^a-z0-9]/g, '') === norm) {
                  existingKey = k;
                  break;
                }
              }

              if (existingKey) {
                map.set(existingKey, { ...map.get(existingKey)!, ...item, id: existingKey });
              } else {
                map.set(item.id, item);
              }
            });

            return Array.from(map.values());
          });
        } else {
          setBranches(defaultBranchItems);
        }
      }),
      getFirebaseEmployees().then(fbEmployees => {
        if (fbEmployees && fbEmployees.length > 0) {
          setEmployees(fbEmployees as Employee[]);
        }
      }),
      getFirebaseVacancies().then(fbVacs => {
        if (fbVacs && fbVacs.length > 0) {
          setVacancies(fbVacs as Vacancy[]);
        }
      })
    ]).finally(() => {
      if (active) setIsLoading(false);
    });

    const handleEmployeesSync = () => {
      try {
        const saved = localStorage.getItem('hrms_employees');
        if (saved) {
          const parsed: Employee[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEmployees(parsed);
          }
        }
      } catch (e) {}
    };

    window.addEventListener('storage', handleEmployeesSync);
    window.addEventListener('hrms_employees_updated', handleEmployeesSync);
    const unsubVacancies = subscribeFirebaseVacancies((liveVacancies) => {
      if (!active) return;
      if (liveVacancies && liveVacancies.length > 0) {
        setVacancies(liveVacancies as Vacancy[]);
      }
    });

    return () => {
      active = false;
      unsubVacancies();
      window.removeEventListener('storage', handleEmployeesSync);
      window.removeEventListener('hrms_employees_updated', handleEmployeesSync);
    };
  }, []);

  // Sync branches to Firestore on changes
  useEffect(() => {
    branches.forEach(b => {
      saveFirebaseBranch(b).catch(() => {});
    });
  }, [branches]);

  // View and Filter states
  const [activeTab, setActiveTab] = useState<'branches' | 'employees'>('branches');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchEmployeeName, setSearchEmployeeName] = useState('');
  const [selectedPositionFilter, setSelectedPositionFilter] = useState('Barchasi');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('Barchasi');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Barchasi');

  // In-modal branch card employee filters
  const [cardEmpSearch, setCardEmpSearch] = useState('');
  const [cardEmpPosition, setCardEmpPosition] = useState('Barchasi');
  const [cardEmpStatus, setCardEmpStatus] = useState('Barchasi');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Branch>>({
    nameUz: '',
    nameRu: '',
    description: '',
    region: '',
    category: 'A',
    vacancyCount: '',
    address: '',
    landmark: '',
    phone: '',
    workHours: '',
    manager: '',
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  
  // Full-screen card state
  const [selectedBranchCard, setSelectedBranchCard] = useState<Branch | null>(null);
  const [cardEditMode, setCardEditMode] = useState(false);
  const [cardEditPhone, setCardEditPhone] = useState('');
  const [cardEditHours, setCardEditHours] = useState('');
  const [cardEditAddress, setCardEditAddress] = useState('');
  const [cardEditCategory, setCardEditCategory] = useState<BranchCategory>('A');

  const openBranchCard = (branch: Branch) => {
    setSelectedBranchCard(branch);
    setCardEditPhone(branch.phone || '');
    setCardEditHours(branch.workHours || '');
    setCardEditAddress(branch.address || '');
    setCardEditCategory(branch.category || 'A');
    setCardEditMode(false);
    setCardEmpSearch('');
    setCardEmpPosition('Barchasi');
    setCardEmpStatus('Barchasi');
  };

  const saveCardEdits = async () => {
    if (selectedBranchCard) {
      const updatedItem = { 
        ...selectedBranchCard, 
        phone: cardEditPhone, 
        workHours: cardEditHours,
        address: cardEditAddress,
        category: cardEditCategory
      };
      const updated = branches.map(b => 
        b.id === selectedBranchCard.id ? updatedItem : b
      );
      setBranches(updated);
      setSelectedBranchCard(updatedItem);
      setCardEditMode(false);

      // Save to Firebase Firestore immediately
      try {
        await saveFirebaseBranch(updatedItem);
      } catch (err) {
        console.error("Firebase saveBranch error:", err);
      }

      // Sync to geozones in localStorage and Firebase
      try {
        const savedGeozones = localStorage.getItem('toyonasavdo_branch_geozones');
        if (savedGeozones) {
          const list: BranchGeozone[] = JSON.parse(savedGeozones);
          const updatedGeozones = list.map(g => {
            if (g.id === selectedBranchCard.id || g.name === selectedBranchCard.nameUz) {
              const gz = {
                ...g,
                phone: cardEditPhone,
                workHours: cardEditHours,
                address: cardEditAddress || g.address,
                updatedAt: new Date().toISOString()
              };
              saveFirebaseGeozone(gz).catch(() => {});
              return gz;
            }
            return g;
          });
          localStorage.setItem('toyonasavdo_branch_geozones', JSON.stringify(updatedGeozones));
        }
      } catch (err) {}

      // Broadcast global event so Davomat, Transfers, Employees update immediately
      window.dispatchEvent(new CustomEvent('hrms_branches_updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('toyonasavdo_data_sync'));
    }
  };

  const openAddModal = () => {
    setEditingBranch(null);
    setFormData({
      nameUz: '',
      nameRu: '',
      description: '',
      region: '',
      category: 'A',
      vacancyCount: '',
      address: '',
      landmark: '',
      phone: '',
      workHours: '',
      manager: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData(branch);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const confirmDelete = (id: string) => {
    setBranchToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (branchToDelete) {
      const targetBranch = branches.find(b => b.id === branchToDelete);
      const updated = branches.filter(b => b.id !== branchToDelete);
      setBranches(updated);
      
      // Delete from Firebase
      try {
        await deleteFirebaseBranch(branchToDelete);
      } catch (err) {
        console.error("Firebase deleteBranch error:", err);
      }

      // Sync deletion to geozones in localStorage and Firebase
      try {
        const savedGeozones = localStorage.getItem('toyonasavdo_branch_geozones');
        if (savedGeozones) {
          const list: BranchGeozone[] = JSON.parse(savedGeozones);
          const updatedGeozones = list.filter(g => g.id !== branchToDelete && g.name !== targetBranch?.nameUz);
          localStorage.setItem('toyonasavdo_branch_geozones', JSON.stringify(updatedGeozones));
        }
        await deleteFirebaseGeozone(branchToDelete);
      } catch (err) {}

      // Broadcast global event so Davomat, Transfers, Employees update immediately
      window.dispatchEvent(new CustomEvent('hrms_branches_updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('toyonasavdo_data_sync'));

      setIsDeleteModalOpen(false);
      setBranchToDelete(null);
    }
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setBranchToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const date = new Date();
    const formattedDate = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    
    const submittedData = {
      ...formData,
      nameRu: formData.nameRu || formData.nameUz || '',
      vacancyCount: formData.vacancyCount === '' ? 0 : formData.vacancyCount
    };

    let targetBranch: Branch;

    if (editingBranch) {
      targetBranch = { ...editingBranch, ...submittedData as Branch };
      const updated = branches.map(b => b.id === editingBranch.id ? targetBranch : b);
      setBranches(updated);

      // Save to Firebase Firestore
      try {
        await saveFirebaseBranch(targetBranch);
      } catch (err) {
        console.error("Firebase saveBranch error:", err);
      }

      // Sync changes to geozones in localStorage and Firebase
      try {
        const savedGeozones = localStorage.getItem('toyonasavdo_branch_geozones');
        if (savedGeozones) {
          const list: BranchGeozone[] = JSON.parse(savedGeozones);
          const updatedGeozones = list.map(g => {
            if (g.id === editingBranch.id || g.name === editingBranch.nameUz) {
              const gz = {
                ...g,
                name: (submittedData.nameUz || g.name),
                description: submittedData.description,
                address: (submittedData.address || g.address),
                updatedAt: new Date().toISOString()
              };
              saveFirebaseGeozone(gz).catch(() => {});
              return gz;
            }
            return g;
          });
          localStorage.setItem('toyonasavdo_branch_geozones', JSON.stringify(updatedGeozones));
        }
      } catch (err) {}

      // Broadcast global event so Davomat, Transfers, Employees update immediately
      window.dispatchEvent(new CustomEvent('hrms_branches_updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('toyonasavdo_data_sync'));
    } else {
      targetBranch = {
        ...(submittedData as Branch),
        id: `branch-${Date.now()}`,
        date: formattedDate,
      };
      const updated = [...branches, targetBranch];
      setBranches(updated);

      // Save to Firebase Firestore
      try {
        await saveFirebaseBranch(targetBranch);
      } catch (err) {
        console.error("Firebase saveBranch error:", err);
      }

      // Also sync to branch geozones so it appears in "Filialni belgilash"
      try {
        const savedGeozones = localStorage.getItem('toyonasavdo_branch_geozones');
        const list: BranchGeozone[] = savedGeozones ? JSON.parse(savedGeozones) : DEFAULT_GEOZONES;
        const newGeozone: BranchGeozone = {
          id: targetBranch.id,
          name: targetBranch.nameUz,
          description: targetBranch.description,
          lat: 40.5283 + (Math.random() * 0.04 - 0.02),
          lon: 70.9425 + (Math.random() * 0.04 - 0.02),
          radius: 100,
          address: targetBranch.address || 'Qo\'qon shahar',
          isCustom: true,
          updatedAt: new Date().toISOString()
        };
        const updatedGeozones = [newGeozone, ...list];
        localStorage.setItem('toyonasavdo_branch_geozones', JSON.stringify(updatedGeozones));
        await saveFirebaseGeozone(newGeozone);
      } catch (err) {}

      // Broadcast global event so Davomat, Transfers, Employees update immediately
      window.dispatchEvent(new CustomEvent('hrms_branches_updated', { detail: updated }));
      window.dispatchEvent(new CustomEvent('toyonasavdo_data_sync'));
    }
    closeModal();
  };

  // Available unique positions from employees
  const availablePositions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(emp => {
      if (emp.position && emp.position.trim()) {
        set.add(emp.position.trim());
      }
    });
    return Array.from(set).sort();
  }, [employees]);

  // Available unique regions from branches and employees
  const availableRegions = useMemo(() => {
    const set = new Set<string>();
    branches.forEach(b => {
      if (b.region && b.region.trim()) {
        set.add(b.region.trim());
      }
    });
    [
      'Andijon viloyati',
      'Buxoro viloyati',
      'Farg\'ona viloyati',
      'Jizzax viloyati',
      'Namangan viloyati',
      'Navoiy viloyati',
      'Qashqadaryo viloyati',
      'Samarqand viloyati',
      'Sirdaryo viloyati',
      'Surxondaryo viloyati',
      'Toshkent shahri',
      'Toshkent viloyati',
      'Xorazm viloyati',
      'Qoraqalpog\'iston Respublikasi'
    ].forEach(r => set.add(r));
    return Array.from(set).sort();
  }, [branches]);

  const isAnyFilterActive = 
    searchQuery.trim() !== '' || 
    searchEmployeeName.trim() !== '' || 
    selectedPositionFilter !== 'Barchasi' || 
    selectedRegionFilter !== 'Barchasi' || 
    selectedCategoryFilter !== 'Barchasi';

  const activeFilterCount = [
    searchQuery.trim() !== '',
    searchEmployeeName.trim() !== '',
    selectedPositionFilter !== 'Barchasi',
    selectedRegionFilter !== 'Barchasi',
    selectedCategoryFilter !== 'Barchasi'
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSearchQuery('');
    setSearchEmployeeName('');
    setSelectedPositionFilter('Barchasi');
    setSelectedRegionFilter('Barchasi');
    setSelectedCategoryFilter('Barchasi');
  };

  // Filter branches according to all active criteria including employee name, position, and region
  const filteredBranches = useMemo(() => {
    return branches.filter(b => {
      // 1. Category filter
      if (selectedCategoryFilter !== 'Barchasi' && b.category !== selectedCategoryFilter) {
        return false;
      }

      // 2. Region filter
      if (selectedRegionFilter !== 'Barchasi') {
        const matchesRegion = b.region.toLowerCase().includes(selectedRegionFilter.toLowerCase()) ||
                              selectedRegionFilter.toLowerCase().includes(b.region.toLowerCase());
        if (!matchesRegion) return false;
      }

      const branchEmps = employees.filter(emp => matchEmployeeToBranch(emp.branch, b.nameUz));

      // 3. Employee Position filter (Lavozim bo'yicha)
      if (selectedPositionFilter !== 'Barchasi') {
        const hasMatchingPosition = branchEmps.some(emp => 
          emp.position?.toLowerCase().trim() === selectedPositionFilter.toLowerCase().trim()
        );
        if (!hasMatchingPosition) return false;
      }

      // 4. Employee Name filter (Xodim ismi orqali)
      const empNameQuery = (searchEmployeeName || '').toLowerCase().trim();
      if (empNameQuery) {
        const hasMatchingName = branchEmps.some(emp => 
          (emp.fullName || '').toLowerCase().includes(empNameQuery) ||
          (emp.staffId || '').toLowerCase().includes(empNameQuery)
        );
        if (!hasMatchingName) return false;
      }

      // 5. General search query (Filial nomi, manzil, yoki xodim ma'lumotlari)
      const q = (searchQuery || '').toLowerCase().trim();
      if (q) {
        const matchesBranch = 
          (b.nameUz || '').toLowerCase().includes(q) ||
          (b.nameRu || '').toLowerCase().includes(q) ||
          (b.region || '').toLowerCase().includes(q) ||
          (b.description && b.description.toLowerCase().includes(q)) ||
          (b.address && b.address.toLowerCase().includes(q)) ||
          (b.phone && b.phone.toLowerCase().includes(q)) ||
          (b.manager && b.manager.toLowerCase().includes(q));

        const matchesEmps = branchEmps.some(emp => 
          (emp.fullName || '').toLowerCase().includes(q) ||
          (emp.position && emp.position.toLowerCase().includes(q)) ||
          (emp.phone && emp.phone.toLowerCase().includes(q)) ||
          (emp.staffId && emp.staffId.toLowerCase().includes(q))
        );

        if (!matchesBranch && !matchesEmps) return false;
      }

      return true;
    });
  }, [branches, employees, selectedCategoryFilter, selectedRegionFilter, selectedPositionFilter, searchEmployeeName, searchQuery]);

  // Filter employees across all branches with their assigned branch and region
  const filteredEmployees = useMemo(() => {
    return employees.map(emp => {
      const assignedBranch = getBranchForEmployee(emp, branches);
      const computedRegion = assignedBranch ? assignedBranch.region : getEmployeeRegion(emp, branches);
      return {
        ...emp,
        assignedBranch,
        computedRegion
      };
    }).filter(emp => {
      // 1. Employee Name filter (Xodim ismi orqali)
      const empNameQuery = (searchEmployeeName || '').toLowerCase().trim();
      if (empNameQuery) {
        if (!(emp.fullName || '').toLowerCase().includes(empNameQuery) && !(emp.staffId || '').toLowerCase().includes(empNameQuery)) {
          return false;
        }
      }

      // 2. Position filter (Lavozim bo'yicha)
      if (selectedPositionFilter !== 'Barchasi') {
        if ((emp.position || '').toLowerCase().trim() !== selectedPositionFilter.toLowerCase().trim()) {
          return false;
        }
      }

      // 3. Region filter (Viloyat bo'yicha)
      if (selectedRegionFilter !== 'Barchasi') {
        const empRegion = (emp.computedRegion || '').toLowerCase();
        const filtRegion = (selectedRegionFilter || '').toLowerCase();
        if (!empRegion.includes(filtRegion) && !filtRegion.includes(empRegion)) {
          return false;
        }
      }

      // 4. Branch Category filter
      if (selectedCategoryFilter !== 'Barchasi') {
        if (!emp.assignedBranch || emp.assignedBranch.category !== selectedCategoryFilter) {
          return false;
        }
      }

      // 5. General search query
      const q = (searchQuery || '').toLowerCase().trim();
      if (q) {
        const matches = 
          (emp.fullName || '').toLowerCase().includes(q) ||
          (emp.position && emp.position.toLowerCase().includes(q)) ||
          (emp.department && emp.department.toLowerCase().includes(q)) ||
          (emp.phone && emp.phone.toLowerCase().includes(q)) ||
          (emp.branch && emp.branch.toLowerCase().includes(q)) ||
          (emp.computedRegion && emp.computedRegion.toLowerCase().includes(q)) ||
          (emp.assignedBranch && emp.assignedBranch.nameUz && emp.assignedBranch.nameUz.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [employees, branches, searchEmployeeName, selectedPositionFilter, selectedRegionFilter, selectedCategoryFilter, searchQuery]);

  // Filtered employees for the opened branch card
  const branchCardEmployees = useMemo(() => {
    if (!selectedBranchCard) return [];
    const list = employees.filter(emp => matchEmployeeToBranch(emp.branch, selectedBranchCard.nameUz));
    return list.filter(emp => {
      if (cardEmpSearch.trim()) {
        const q = (cardEmpSearch || '').toLowerCase().trim();
        const match = 
          (emp.fullName || '').toLowerCase().includes(q) ||
          (emp.staffId && emp.staffId.toLowerCase().includes(q)) ||
          (emp.phone && emp.phone.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (cardEmpPosition !== 'Barchasi') {
        if (emp.position?.toLowerCase().trim() !== cardEmpPosition.toLowerCase().trim()) return false;
      }
      if (cardEmpStatus !== 'Barchasi') {
        if (emp.status !== cardEmpStatus) return false;
      }
      return true;
    });
  }, [selectedBranchCard, employees, cardEmpSearch, cardEmpPosition, cardEmpStatus]);

  const handleExport = (type: 'excel' | 'pdf') => {
    if (activeTab === 'branches') {
      const fileName = `Toyona_Filiallar_${new Date().toISOString().slice(0, 10)}`;
      const headers = ['№', 'Filial Nomi', 'Viloyat', 'Kategoriya', 'Xodimlar Soni', 'Vakansiya', 'Sana', 'Manzil'];
      const data = filteredBranches.map((b, i) => {
        const bEmps = employees.filter(emp => matchEmployeeToBranch(emp.branch, b.nameUz));
        return [
          i + 1,
          b.nameUz,
          b.region,
          b.category,
          `${bEmps.length} ta`,
          `${getBranchVacancies(b.nameUz, vacancies).length} ta (${getBranchVacancyQuota(b.nameUz, vacancies)} o'rin)`,
          b.date,
          b.address || '-'
        ];
      });

      if (type === 'excel') {
        const excelData = filteredBranches.map((b, i) => {
          const bEmps = employees.filter(emp => matchEmployeeToBranch(emp.branch, b.nameUz));
          return {
            '№': i + 1,
            'Filial Nomi (UZ)': b.nameUz,
            'Filial Nomi (RU)': b.nameRu || '-',
            'Viloyat': b.region,
            'Kategoriya': b.category,
            'Xodimlar Soni': bEmps.length,
            'Vakansiyalar': `${getBranchVacancies(b.nameUz, vacancies).length} ta (${getBranchVacancyQuota(b.nameUz, vacancies)} o'rin)`,
            'Sana': b.date,
            'Manzil': b.address || '-',
            'Telefon': b.phone || '-',
            'Ish vaqti': b.workHours || '-',
            'Filial mudiri': b.manager || '-'
          };
        });
        exportToExcel(excelData, fileName);
      } else {
        exportToPDF(headers, data, fileName, "Toyona Savdo - Filiallar Ro'yxati");
      }
    } else {
      const fileName = `Toyona_Filial_Xodimlari_${new Date().toISOString().slice(0, 10)}`;
      const headers = ['№', 'F.I.O', 'Xodim ID', 'Filial', 'Viloyat', 'Lavozim', 'Bo\'lim', 'Telefon', 'Status'];
      const data = filteredEmployees.map((emp, i) => [
        i + 1,
        emp.fullName,
        emp.staffId,
        emp.assignedBranch?.nameUz || emp.branch,
        emp.computedRegion,
        emp.position,
        emp.department,
        emp.phone,
        emp.status === 'active' ? 'Doimiy' : emp.status === 'leave' ? 'Ta\'tilda' : 'Sinovda'
      ]);

      if (type === 'excel') {
        const excelData = filteredEmployees.map((emp, i) => ({
          '№': i + 1,
          'F.I.O': emp.fullName,
          'Xodim ID': emp.staffId,
          'Filial': emp.assignedBranch?.nameUz || emp.branch,
          'Viloyat': emp.computedRegion,
          'Lavozim': emp.position,
          'Bo\'lim': emp.department,
          'Telefon': emp.phone,
          'Ish holati': emp.status === 'active' ? 'Doimiy' : emp.status === 'leave' ? 'Ta\'tilda' : 'Sinovda'
        }));
        exportToExcel(excelData, fileName);
      } else {
        exportToPDF(headers, data, fileName, "Toyona Savdo - Filial Xodimlari Ro'yxati");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden p-5">
      {/* Module Header with Toyona Savdo Logo */}
      <ModuleHeaderLogo title="Filiallar va Xodimlar Boshqaruvi" icon={Network} />

      {/* Branches & Employees Statistics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-[#00A651] flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Jami filiallar</div>
            <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
              {isAnyFilterActive ? (
                <span>{filteredBranches.length} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 font-normal">/ {branches.length} ta</span></span>
              ) : (
                <span>{branches.length} ta</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Filial xodimlari</div>
            <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
              {isAnyFilterActive ? (
                <span>{filteredEmployees.length} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 font-normal">/ {employees.length} nafar</span></span>
              ) : (
                <span>{employees.length} nafar</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Xodimli filiallar</div>
            <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
              {branches.filter(b => employees.some(e => matchEmployeeToBranch(e.branch, b.nameUz))).length} ta
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Bo'sh o'rinlar</div>
            <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
              {(() => {
                const openVacs = vacancies.filter(v => v.status !== "To'ldirilgan" && v.status !== "Yopilgan");
                const totalSpots = openVacs.reduce((acc, v) => acc + (Number(v.headcount) || 1), 0);
                return `${openVacs.length} ta (${totalSpots} o'rin)`;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs & Action Bar */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 mb-3">
        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
          <button
            onClick={() => setActiveTab('branches')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'branches'
                ? 'bg-[#00A651] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Filiallar kesimida</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'branches' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {filteredBranches.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'employees'
                ? 'bg-[#00A651] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Filial xodimlari kesimida</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'employees' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {filteredEmployees.length}
            </span>
          </button>
        </div>

        {/* Export & Add Branch */}
        <div className="flex items-center gap-2.5">
          <ExportButtons 
            onExportExcel={() => handleExport('excel')}
            onExportPDF={() => handleExport('pdf')}
          />
          
          <button 
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-[#00A651] hover:bg-[#009045] text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Filial qo'shish</span>
          </button>
        </div>
      </div>

      {/* Comprehensive Multi-Filter Bar: Ismi, Lavozimi, Viloyati, Toifasi */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-2xs mb-4 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#00A651]" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Filtrlash paneli</span>
            {isAnyFilterActive && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                {activeFilterCount} ta filtr faol
              </span>
            )}
          </div>

          {isAnyFilterActive && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100/80 px-2.5 py-1 rounded-lg border border-rose-200/60 dark:border-rose-900/60 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Filtrlarni tozalash</span>
            </button>
          )}
        </div>

        {/* Filter Inputs Grid: 1. Xodim ismi, 2. Lavozim, 3. Viloyat, 4. Toifa, 5. Umumiy qidiruv */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* 1. Xodim ismi orqali filtrlash */}
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Xodim ismi (F.I.O)..." 
              value={searchEmployeeName}
              onChange={(e) => setSearchEmployeeName(e.target.value)}
              className="pl-9 pr-7 py-2 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 rounded-lg text-xs transition-all outline-none"
            />
            {searchEmployeeName && (
              <button
                onClick={() => setSearchEmployeeName('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Lavozim bo'yicha filtrlash */}
          <div className="relative">
            <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select 
              value={selectedPositionFilter}
              onChange={(e) => setSelectedPositionFilter(e.target.value)}
              className="appearance-none w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg pl-9 pr-7 py-2 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer font-medium"
            >
              <option value="Barchasi">Barcha lavozimlar</option>
              {availablePositions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* 3. Viloyat bo'yicha filtrlash */}
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select 
              value={selectedRegionFilter}
              onChange={(e) => setSelectedRegionFilter(e.target.value)}
              className="appearance-none w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg pl-9 pr-7 py-2 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer font-medium"
            >
              <option value="Barchasi">Barcha viloyatlar</option>
              {availableRegions.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* 4. Filial toifasi bo'yicha filtrlash */}
          <div className="relative">
            <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select 
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="appearance-none w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg pl-9 pr-7 py-2 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer font-medium"
            >
              <option value="Barchasi">Barcha toifalar</option>
              <option value="A">A toifa</option>
              <option value="B">B toifa</option>
              <option value="C">C toifa</option>
              <option value="D">D toifa</option>
              <option value="Mini">Mini toifa</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* 5. Umumiy qidiruv (Filial nomi / Manzil) */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filial nomi yoki manzil..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-7 py-2 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 rounded-lg text-xs transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Chips */}
        {isAnyFilterActive && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Faol filtrlar:</span>

            {searchEmployeeName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
                <User className="w-3 h-3 text-emerald-600" />
                <span>Xodim: <strong>{searchEmployeeName}</strong></span>
                <button onClick={() => setSearchEmployeeName('')} className="hover:text-emerald-900 cursor-pointer ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedPositionFilter !== 'Barchasi' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-medium">
                <Briefcase className="w-3 h-3 text-blue-600" />
                <span>Lavozim: <strong>{selectedPositionFilter}</strong></span>
                <button onClick={() => setSelectedPositionFilter('Barchasi')} className="hover:text-blue-900 cursor-pointer ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedRegionFilter !== 'Barchasi' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                <MapPin className="w-3 h-3 text-amber-600" />
                <span>Viloyat: <strong>{selectedRegionFilter}</strong></span>
                <button onClick={() => setSelectedRegionFilter('Barchasi')} className="hover:text-amber-900 cursor-pointer ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCategoryFilter !== 'Barchasi' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-medium">
                <Building2 className="w-3 h-3 text-purple-600" />
                <span>Toifa: <strong>{selectedCategoryFilter} toifa</strong></span>
                <button onClick={() => setSelectedCategoryFilter('Barchasi')} className="hover:text-purple-900 cursor-pointer ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-medium">
                <Search className="w-3 h-3 text-slate-500" />
                <span>Qidiruv: <strong>{searchQuery}</strong></span>
                <button onClick={() => setSearchQuery('')} className="hover:text-slate-900 cursor-pointer ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main View Area: Tab 1. Filiallar kesimida, Tab 2. Xodimlar kesimida */}
      {activeTab === 'branches' ? (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">№</th>
                <th className="p-4">FILIAL NOMI</th>
                <th className="p-4">VILOYAT</th>
                <th className="p-4">KATEGORIYA</th>
                <th className="p-4">FILIAL XODIMLARI (HRMS)</th>
                <th className="p-4">VAKANSIYA</th>
                <th className="p-4">FILIAL OCHILGAN SANA</th>
                <th className="p-4 w-28 text-right">AMALLAR</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-[#00A651] animate-spin" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Filiallar ro'yxati yuklanmoqda...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredBranches.map((branch, index) => {
                const branchEmps = employees.filter(emp => matchEmployeeToBranch(emp.branch, branch.nameUz));
                const isExpanded = expandedBranchId === branch.id;

                // Match specific employees if employee name or position filter is active
                const matchingEmps = branchEmps.filter(emp => {
                  const nameMatch = !searchEmployeeName.trim() || 
                     (emp.fullName || '').toLowerCase().includes(searchEmployeeName.toLowerCase().trim()) ||
                     (emp.staffId && emp.staffId.toLowerCase().includes(searchEmployeeName.toLowerCase().trim()));
                  const posMatch = selectedPositionFilter === 'Barchasi' ||
                    (emp.position || '').toLowerCase().trim() === selectedPositionFilter.toLowerCase().trim();
                  return nameMatch && posMatch;
                });

                const isEmployeeFiltered = searchEmployeeName.trim() !== '' || selectedPositionFilter !== 'Barchasi';

                return (
                  <tr 
                    key={`${branch.id || branch.nameUz || index}-${index}`}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-4 text-slate-400 dark:text-slate-500 text-center font-mono text-xs">#{index + 1}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {branch.nameUz}
                      </div>
                      {branch.manager && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5 mt-0.5">
                          <User className="w-3 h-3 text-[#00A651] shrink-0" />
                          <span>Mas'ul: <strong>{branch.manager}</strong></span>
                        </div>
                      )}
                      {branch.phone && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{branch.phone}</span>
                        </div>
                      )}
                      {branch.address && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{branch.address}</span>
                          {branch.landmark && (
                            <span className="text-slate-400 font-normal">({branch.landmark})</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        {branch.region}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColors[branch.category]}`}>
                        {branch.category} toifa
                      </span>
                    </td>
                    
                    {/* Xodimlar Ustuni - Shunchaki soni ko'rinib turadi, card ochilmaydi */}
                    <td className="p-4">
                      {branchEmps.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40">
                          <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{branchEmps.length} nafar xodim</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Xodim yo'q
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {(() => {
                        const branchVacs = getBranchVacancies(branch.nameUz, vacancies);
                        const branchQuota = getBranchVacancyQuota(branch.nameUz, vacancies);
                        if (branchVacs.length > 0) {
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onNavigateToVacancies) onNavigateToVacancies();
                              }}
                              title="Bo'sh ish o'rinlari moduliga o'tish"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-amber-50/80 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors cursor-pointer group"
                            >
                              <Briefcase className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                              <span>{branchVacs.length} ta vakansiya</span>
                              <span className="text-[10px] opacity-75">({branchQuota} o'rin)</span>
                            </button>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            Vakansiya yo'q
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-500 font-mono text-xs">{branch.date}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => openEditModal(branch)}
                          title="Tahrirlash"
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-[#00A651] dark:hover:text-emerald-400 hover:bg-[#00A651]/10 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDelete(branch.id)}
                          title="O'chirish"
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {!isLoading && filteredBranches.length === 0 && (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Filiallar yoki xodimlar topilmadi</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-md mx-auto mb-4">
                Kiritilgan xodim ismi, lavozim, viloyat yoki kategoriya bo'yicha filial topilmadi. Filtrlarni tozalab qayta urinib ko'ring.
              </p>
              {isAnyFilterActive && (
                <button
                  onClick={resetAllFilters}
                  className="px-4 py-2 bg-[#00A651] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#009045] transition-colors cursor-pointer"
                >
                  Filtrlarni tozalash
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Tab 2. Filial xodimlari kesimida (Direct consolidated list of all branch employees) */
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">№</th>
                <th className="p-4">XODIM (F.I.O)</th>
                <th className="p-4">BIRIKTIRILGAN FILIAL</th>
                <th className="p-4">VILOYAT</th>
                <th className="p-4">LAVOZIM</th>
                <th className="p-4">BO'LIM</th>
                <th className="p-4">TELEFON</th>
                <th className="p-4">STATUS</th>
                <th className="p-4 w-28 text-right">AMAL</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-[#00A651] animate-spin" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Filial xodimlari ro'yxati yuklanmoqda...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.map((emp, idx) => {
                return (
                  <tr 
                    key={`${emp.id || idx}-${idx}`}
                    onClick={() => emp.assignedBranch && openBranchCard(emp.assignedBranch)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="p-4 text-slate-400 dark:text-slate-500 text-center font-mono text-xs">#{idx + 1}</td>
                    
                    {/* Xodim ismi va rasmi */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={emp.avatarUrl} 
                          alt={emp.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0" 
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate flex items-center gap-1.5">
                            {emp.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                            ID: {emp.staffId}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Filial */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-slate-800 dark:text-slate-100">
                          {emp.assignedBranch ? emp.assignedBranch.nameUz : emp.branch}
                        </div>
                        {emp.assignedBranch && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryColors[emp.assignedBranch.category]}`}>
                            {emp.assignedBranch.category}
                          </span>
                        )}
                      </div>
                      {emp.assignedBranch?.address && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs mt-0.5">
                          📍 {emp.assignedBranch.address}
                        </div>
                      )}
                    </td>

                    {/* Viloyat */}
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        {emp.computedRegion}
                      </span>
                    </td>

                    {/* Lavozim */}
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#00A651] dark:text-emerald-400">
                        <Briefcase className="w-3.5 h-3.5 shrink-0" />
                        {emp.position}
                      </span>
                    </td>

                    {/* Bo'lim */}
                    <td className="p-4 text-slate-600 dark:text-slate-400 text-xs font-medium">
                      {emp.department}
                    </td>

                    {/* Telefon */}
                    <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>{emp.phone}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        emp.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' :
                        emp.status === 'leave' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      }`}>
                        {emp.status === 'active' ? 'Doimiy' : emp.status === 'leave' ? 'Ta\'tilda' : 'Sinovda'}
                      </span>
                    </td>

                    {/* Amal */}
                    <td className="p-4 text-right">
                      {emp.assignedBranch ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openBranchCard(emp.assignedBranch!);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#00A651] dark:text-emerald-400 bg-[#00A651]/10 dark:bg-emerald-950/20 hover:bg-[#00A651]/20 dark:hover:bg-emerald-950/35 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Filial</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!isLoading && filteredEmployees.length === 0 && (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Filial xodimlari topilmadi</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                Kiritilgan ism, lavozim yoki viloyat bo'yicha xodim topilmadi. Filtrlarni tozalab qayta qidiring.
              </p>
              {isAnyFilterActive && (
                <button
                  onClick={resetAllFilters}
                  className="px-4 py-2 bg-[#00A651] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#009045] transition-colors cursor-pointer"
                >
                  Filtrlarni tozalash
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {editingBranch ? 'Filialni tahrirlash' : 'Yangi filial qo\'shish'}
                </h3>
                <button 
                  onClick={closeModal}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Filial Nomi */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Filial nomi <span className="text-rose-500">*</span></label>
                    <input
                      required
                      type="text"
                      value={formData.nameUz}
                      onChange={e => setFormData({...formData, nameUz: e.target.value, nameRu: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      placeholder="Masalan: Turkiston filiali"
                    />
                  </div>

                  {/* Viloyat */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Viloyat / Hudud <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <select
                        required
                        value={formData.region}
                        onChange={e => setFormData({...formData, region: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] appearance-none"
                      >
                        <option value="">Viloyatni tanlang...</option>
                        {availableRegions.map(reg => (
                          <option key={reg} value={reg}>{reg}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Mas'ul shaxs (Filial mudiri) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mas'ul shaxs nomi</label>
                    <input
                      type="text"
                      value={formData.manager || ''}
                      onChange={e => setFormData({...formData, manager: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      placeholder="Masalan: Alisher Vohidov"
                    />
                  </div>

                  {/* Telefon (Nomer) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Aloqa telefoni (Nomer)</label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      placeholder="+998 90 123 45 67"
                    />
                  </div>

                  {/* Aniq manzil (Joylashuvi) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Joylashuvi (Aniq manzil) <span className="text-rose-500">*</span></label>
                    <input
                      required
                      type="text"
                      value={formData.address || ''}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      placeholder="Ko'cha, bino raqami..."
                    />
                  </div>

                  {/* Aniq mo'ljal */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Aniq mo'ljal</label>
                    <input
                      type="text"
                      value={formData.landmark || ''}
                      onChange={e => setFormData({...formData, landmark: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      placeholder="Masalan: Markaziy bozor ro'parasida, 2-qavat"
                    />
                  </div>

                  {/* Ish vaqti */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ish vaqti</label>
                    <input
                      type="text"
                      value={formData.workHours || ''}
                      onChange={e => setFormData({...formData, workHours: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      placeholder="09:00 - 18:00"
                    />
                  </div>
                </div>

                {/* Toifa tanlash */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Filial Toifasi</label>
                  <div className="grid grid-cols-5 gap-2">
                    {(['A', 'B', 'C', 'D', 'Mini'] as BranchCategory[]).map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setFormData({...formData, category: cat})}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          formData.category === cat 
                            ? 'bg-[#00A651] text-white border-[#00A651] shadow-xs' 
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-[#00A651] hover:bg-[#009045] rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {editingBranch ? 'Saqlash' : 'Qo\'shish'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={closeDeleteModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center"
            >
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                Rostdan ham o'chirilsinmi?
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Ushbu filialni o'chirib tashlamoqchimisiz? Ushbu amalni ortga qaytarib bo'lmaydi.
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={closeDeleteModal}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Ha, o'chirilsin
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Branch Card Modal Overlay */}
      <AnimatePresence>
        {selectedBranchCard && (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-sm overflow-hidden"
            onClick={() => setSelectedBranchCard(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col relative border border-slate-200/80 dark:border-slate-800 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-tr from-[#00A651] to-emerald-400 rounded-xl flex items-center justify-center text-white shadow-sm">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{selectedBranchCard.nameUz} Filiali</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${categoryColors[selectedBranchCard.category]}`}>
                        {selectedBranchCard.category} Kategoriya
                      </span>
                      <span>•</span>
                      <span className="dark:text-slate-400">{selectedBranchCard.region}</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedBranchCard(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                  
                  {/* Branch Details editable section */}
                  <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#00A651]" />
                        Filial Ma'lumotlari
                      </h3>
                      {!cardEditMode ? (
                        <button 
                          onClick={() => setCardEditMode(true)}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#00A651] bg-[#00A651]/10 px-3 py-1.5 rounded-lg hover:bg-[#00A651]/20 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Tahrirlash
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setCardEditMode(false)}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            Bekor qilish
                          </button>
                          <button 
                            onClick={saveCardEdits}
                            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#00A651] px-3 py-1.5 rounded-lg hover:bg-[#009045] shadow-xs transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Saqlash
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Manzil */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Manzil</label>
                        {cardEditMode ? (
                          <input 
                            type="text" 
                            value={cardEditAddress}
                            onChange={(e) => setCardEditAddress(e.target.value)}
                            className="w-full text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-[#00A651] focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                            placeholder="Aniq manzil..."
                          />
                        ) : (
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            {selectedBranchCard.address || "Kiritilmagan"}
                          </div>
                        )}
                      </div>
                      
                      {/* Telefon */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" /> Telefon raqam
                        </label>
                        {cardEditMode ? (
                          <input 
                            type="text" 
                            value={cardEditPhone}
                            onChange={(e) => setCardEditPhone(e.target.value)}
                            className="w-full text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-[#00A651] focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                            placeholder="+998 XX XXX XX XX"
                          />
                        ) : (
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            {selectedBranchCard.phone || "Kiritilmagan"}
                          </div>
                        )}
                      </div>

                      {/* Ish vaqti */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Ish vaqti
                        </label>
                        {cardEditMode ? (
                          <input 
                            type="text" 
                            value={cardEditHours}
                            onChange={(e) => setCardEditHours(e.target.value)}
                            className="w-full text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-[#00A651] focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
                            placeholder="09:00 - 18:00"
                          />
                        ) : (
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            {selectedBranchCard.workHours || "09:00 - 18:00"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Employees List in Branch Detail Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <Users className="w-5 h-5 text-[#00A651]" />
                          Filial Xodimlari
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                          Ushbu filialga biriktirilgan barcha xodimlar
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-[#00A651]/10 text-[#00A651] font-extrabold text-xs px-3.5 py-1.5 rounded-full">
                          {branchCardEmployees.length} / {employees.filter(emp => matchEmployeeToBranch(emp.branch, selectedBranchCard.nameUz)).length} nafar xodim
                        </span>
                      </div>
                    </div>

                    {/* In-Card Employee Filter Controls */}
                    <div className="p-3.5 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <input
                          type="text"
                          placeholder="Filial xodimini ismi bo'yicha qidirish..."
                          value={cardEmpSearch}
                          onChange={(e) => setCardEmpSearch(e.target.value)}
                          className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs outline-none focus:border-[#00A651]"
                        />
                        {cardEmpSearch && (
                          <button
                            onClick={() => setCardEmpSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="relative min-w-[160px]">
                        <select
                          value={cardEmpPosition}
                          onChange={(e) => setCardEmpPosition(e.target.value)}
                          className="appearance-none w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg pl-3 pr-7 py-1.5 outline-none focus:border-[#00A651] cursor-pointer"
                        >
                          <option value="Barchasi">Barcha lavozimlar</option>
                          {Array.from(new Set(employees.filter(e => matchEmployeeToBranch(e.branch, selectedBranchCard.nameUz)).map(e => e.position))).filter(Boolean).map(pos => (
                            <option key={pos} value={pos}>{pos}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>

                      <div className="relative min-w-[130px]">
                        <select
                          value={cardEmpStatus}
                          onChange={(e) => setCardEmpStatus(e.target.value)}
                          className="appearance-none w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg pl-3 pr-7 py-1.5 outline-none focus:border-[#00A651] cursor-pointer"
                        >
                          <option value="Barchasi">Barcha statuslar</option>
                          <option value="active">Doimiy</option>
                          <option value="leave">Ta'tilda</option>
                          <option value="probation">Sinovda</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>

                      {(cardEmpSearch || cardEmpPosition !== 'Barchasi' || cardEmpStatus !== 'Barchasi') && (
                        <button
                          onClick={() => {
                            setCardEmpSearch('');
                            setCardEmpPosition('Barchasi');
                            setCardEmpStatus('Barchasi');
                          }}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 cursor-pointer"
                        >
                          Tozalash
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                            <th className="p-4 w-16">Rasm</th>
                            <th className="p-4">F.I.O</th>
                            <th className="p-4">Lavozim</th>
                            <th className="p-4">Bo'lim</th>
                            <th className="p-4">Telefon</th>
                            <th className="p-4">Qabul sanasi</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
                          {branchCardEmployees.length > 0 ? (
                            branchCardEmployees.map((employee, empIdx) => (
                              <tr key={`${employee.id || empIdx}-${empIdx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="p-4">
                                  <img src={employee.avatarUrl} alt={employee.fullName} className="w-10 h-10 rounded-full object-cover shadow-xs border border-slate-200 dark:border-slate-700" />
                                </td>
                                <td className="p-4">
                                  <div className="font-bold text-slate-800 dark:text-slate-100">{employee.fullName}</div>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{employee.staffId}</div>
                                </td>
                                <td className="p-4">
                                  <div className="font-medium text-slate-700 dark:text-slate-300">{employee.position}</div>
                                </td>
                                <td className="p-4">
                                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{employee.department}</div>
                                </td>
                                <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                    <span>{employee.phone}</span>
                                  </div>
                                </td>
                                <td className="p-4 text-slate-500 dark:text-slate-500 text-xs font-mono">{employee.hireDate}</td>
                                <td className="p-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                    employee.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' :
                                    employee.status === 'leave' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' :
                                    'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                  }`}>
                                    {employee.status === 'active' ? 'Doimiy' : employee.status === 'leave' ? 'Ta\'tilda' : 'Sinovda'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                                Qidiruvga mos keluvchi xodimlar topilmadi.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Vacancies List in Branch Detail Card */}
                  {(() => {
                    const branchVacs = getBranchVacancies(selectedBranchCard.nameUz, vacancies);
                    const branchQuota = getBranchVacancyQuota(selectedBranchCard.nameUz, vacancies);
                    return (
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                              <Briefcase className="w-5 h-5 text-amber-500" />
                              Filialdagi Bo'sh Ish O'rinlari
                            </h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                              Ushbu filial bo'yicha qidirilayotgan ochiq vakansiyalar
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-amber-500/10 text-amber-700 dark:text-amber-300 font-extrabold text-xs px-3.5 py-1.5 rounded-full border border-amber-200/60 dark:border-amber-800/40">
                              {branchVacs.length} ta vakansiya • {branchQuota} ta ochiq o'rin
                            </span>
                            {onNavigateToVacancies && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBranchCard(null);
                                  onNavigateToVacancies();
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00A651] hover:text-[#008d44] bg-[#00A651]/10 hover:bg-[#00A651]/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <span>Barcha vakansiyalarga o'tish</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {branchVacs.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                  <th className="p-4">Lavozim</th>
                                  <th className="p-4">Bo'lim</th>
                                  <th className="p-4">Kvota</th>
                                  <th className="p-4">Maosh</th>
                                  <th className="p-4">Holati</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {branchVacs.map(v => (
                                  <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{v.title}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400">{v.department}</td>
                                    <td className="p-4 font-semibold text-amber-600 dark:text-amber-400">{v.headcount || 1} ta o'rin</td>
                                    <td className="p-4 font-mono text-slate-700 dark:text-slate-300">{v.salaryRange || "Kelishilgan"}</td>
                                    <td className="p-4">
                                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                        {v.status || "Faol"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                            <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-60" />
                            <p className="font-semibold text-slate-600 dark:text-slate-400 text-xs">Ushbu filialda hozircha ochiq bo'sh ish o'rni mavjud emas</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
