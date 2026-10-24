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
  name: string;
  code: string;
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
    .replace(/\b(branch|campus|hub|center|terminal|office|regional)\b/gi, '')
    .replace(/[()]/g, '')
    .trim();

  const se = strip(e);
  const sb = strip(b);
  if (se && sb && (se.includes(sb) || sb.includes(se))) return true;

  // Head office synonyms
  const isHeadE = e.includes('headquarters') || e.includes('corporate') || e.includes('hq');
  const isHeadB = b.includes('headquarters') || b.includes('corporate') || b.includes('hq');
  if (isHeadE && isHeadB) return true;

  return false;
};

export const getBranchForEmployee = (emp: Employee, branchList: Branch[]): Branch | undefined => {
  return branchList.find(b => matchEmployeeToBranch(emp.branch, b.name));
};

export const getEmployeeRegion = (emp: Employee, branchList: Branch[]): string => {
  const branch = getBranchForEmployee(emp, branchList);
  if (branch && branch.region) return branch.region;
  
  const eb = (emp.branch || '').toLowerCase();
  if (eb.includes('manhattan') || eb.includes('new york') || eb.includes('headquarters')) return 'New York City';
  if (eb.includes('brooklyn') || eb.includes('queens')) return 'New York Metro';
  if (eb.includes('california') || eb.includes('silicon') || eb.includes('francisco') || eb.includes('angeles')) return 'California Region';
  if (eb.includes('texas') || eb.includes('austin')) return 'Texas Region';
  if (eb.includes('chicago') || eb.includes('illinois')) return 'Illinois Metro';
  if (eb.includes('boston') || eb.includes('massachusetts')) return 'Massachusetts Metro';
  return "East Coast Region";
};

const initialBranches: Branch[] = [
  { id: '1', name: 'Downtown Manhattan Campus', code: 'DMC-01', region: 'New York State', category: 'A', vacancyCount: 1, date: '7.9.2026' },
  { id: '2', name: 'Midtown Technology Center', code: 'MTC-02', region: 'New York State', category: 'B', vacancyCount: 4, date: '7.9.2026' },
  { id: '3', name: 'Brooklyn Logistics Center', code: 'BLC-03', region: 'New York State', category: 'C', vacancyCount: 2, date: '7.9.2026' },
  { id: '4', name: 'Queens Operations Terminal', code: 'QOT-04', region: 'New York State', category: 'D', vacancyCount: 1, date: '7.9.2026' },
  { id: '5', name: 'Silicon Valley Campus', code: 'SVC-05', region: 'California Region', category: 'Mini', vacancyCount: 2, date: '7.9.2026' },
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
      const savedGeozones = localStorage.getItem('novahr_branch_geozones');
      if (savedGeozones) {
        const parsed = JSON.parse(savedGeozones);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((g: BranchGeozone, idx: number) => ({
            id: g.id || String(idx + 1),
            name: g.name,
            code: g.name,
            description: g.description,
            region: 'New York Metro',
            category: (['A', 'B', 'C', 'D', 'Mini'][idx % 5] || 'A') as BranchCategory,
            vacancyCount: Math.floor(Math.random() * 4) + 1,
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
      name: g.name,
      code: g.name,
      description: g.description,
      region: 'New York Metro',
      category: (['A', 'B', 'C', 'D', 'Mini'][idx % 5] || 'A') as BranchCategory,
      vacancyCount: 2,
      date: '15.9.2026',
      address: g.address
    }));
  });

  // Dynamic employees state connected with Employees (Employees) module
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('hrms_employees');
      if (saved) {
        const parsed: Employee[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(emp => {
            if (emp.branch === 'Headquarters (Toshkent)') return { ...emp, branch: 'Headquarters' };
            if (emp.branch === 'Downtown Manhattan Branch') return { ...emp, branch: 'Downtown Manhattan Branch' };
            if (emp.branch === 'Namangan Branchi') return { ...emp, branch: 'Brooklyn Logistics Center' };
            if (emp.branch === "Farg'ona Branchi") return { ...emp, branch: 'Queens Distribution Terminal' };
            if (emp.branch === 'Samarqand Branchi') return { ...emp, branch: 'Chicago Central Hub' };
            return emp;
          });
        }
      }
    } catch (e) {}
    return INITIAL_EMPLOYEES;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Listen for real-time employee changes from Employees (Employees) module
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getFirebaseBranches().then(fbBranches => {
        const defaultBranchItems: Branch[] = DEFAULT_GEOZONES.map((g, idx) => ({
          id: g.id,
          name: g.name,
          code: g.name,
          description: g.description,
          region: g.region || 'New York Metro',
          category: (['A', 'B', 'C', 'D', 'Mini'][idx % 5] || 'A') as BranchCategory,
          vacancyCount: 2,
          date: '15.9.2026',
          address: g.address
        }));

        if (fbBranches && fbBranches.length > 0) {
          setBranches(prev => {
            const map = new Map<string, Branch>();
            const seenNames = new Set<string>();

            // Process defaults first
            defaultBranchItems.forEach(def => {
              const norm = def.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              seenNames.add(norm);
              map.set(def.id, def);
            });

            // Overlay Firebase branches
            fbBranches.forEach((fb: any) => {
              const rawId = fb.id || fb.firestoreId || '';
              const branchName = fb.name || fb.name || '';
              const norm = branchName.toLowerCase().replace(/[^a-z0-9]/g, '');
              
              const item: Branch = {
                id: rawId || `branch-fb-${map.size + 1}`,
                name: branchName,
                code: fb.code || branchName,
                description: fb.description,
                region: fb.region || 'New York Metro',
                category: fb.category || 'A',
                vacancyCount: fb.vacancyCount ?? 2,
                date: fb.date || '15.9.2026',
                address: fb.address,
                landmark: fb.landmark,
                phone: fb.phone,
                workHours: fb.workHours,
                manager: fb.manager
              };

              let existingKey: string | null = null;
              for (const [k, v] of map.entries()) {
                if (k === rawId || v.name.toLowerCase().replace(/[^a-z0-9]/g, '') === norm) {
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
    return () => {
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
  const [selectedPositionFilter, setSelectedPositionFilter] = useState('All');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('All');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  // In-modal branch card employee filters
  const [cardEmpSearch, setCardEmpSearch] = useState('');
  const [cardEmpPosition, setCardEmpPosition] = useState('All');
  const [cardEmpStatus, setCardEmpStatus] = useState('All');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Branch>>({
    name: '',
    code: '',
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
    setCardEmpPosition('All');
    setCardEmpStatus('All');
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
            if (g.id === selectedBranchCard.id || g.name === selectedBranchCard.name) {
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
      name: '',
      code: '',
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
          const updatedGeozones = list.filter(g => g.id !== branchToDelete && g.name !== targetBranch?.name);
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
      code: formData.code || formData.name || '',
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
            if (g.id === editingBranch.id || g.name === editingBranch.name) {
              const gz = {
                ...g,
                name: (submittedData.name || g.name),
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

      // Also sync to branch geozones so it appears in "Branch Geolocation & Radii"
      try {
        const savedGeozones = localStorage.getItem('novahr_branch_geozones');
        const list: BranchGeozone[] = savedGeozones ? JSON.parse(savedGeozones) : DEFAULT_GEOZONES;
        const newGeozone: BranchGeozone = {
          id: targetBranch.id,
          name: targetBranch.name,
          description: targetBranch.description,
          lat: 40.5283 + (Math.random() * 0.04 - 0.02),
          lon: 70.9425 + (Math.random() * 0.04 - 0.02),
          radius: 100,
          address: targetBranch.address || 'Corporate Headquarters',
          isCustom: true,
          updatedAt: new Date().toISOString()
        };
        const updatedGeozones = [newGeozone, ...list];
        localStorage.setItem('novahr_branch_geozones', JSON.stringify(updatedGeozones));
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
      'New York State',
      'California Region',
      'New York Metro',
      'Illinois Metro',
      'Texas Region',
      'Florida Region',
      'Washington Metro',
      'Massachusetts Metro',
      'Colorado Hub',
      'Georgia Metro',
      'New York City',
      'Mid-Atlantic Region',
      'Pacific Northwest',
      'Qoraqalpog\'iston Respublikasi'
    ].forEach(r => set.add(r));
    return Array.from(set).sort();
  }, [branches]);

  const isAnyFilterActive = 
    searchQuery.trim() !== '' || 
    searchEmployeeName.trim() !== '' || 
    selectedPositionFilter !== 'All' || 
    selectedRegionFilter !== 'All' || 
    selectedCategoryFilter !== 'All';

  const activeFilterCount = [
    searchQuery.trim() !== '',
    searchEmployeeName.trim() !== '',
    selectedPositionFilter !== 'All',
    selectedRegionFilter !== 'All',
    selectedCategoryFilter !== 'All'
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSearchQuery('');
    setSearchEmployeeName('');
    setSelectedPositionFilter('All');
    setSelectedRegionFilter('All');
    setSelectedCategoryFilter('All');
  };

  // Filter branches according to all active criteria including employee name, position, and region
  const filteredBranches = useMemo(() => {
    return branches.filter(b => {
      // 1. Category filter
      if (selectedCategoryFilter !== 'All' && b.category !== selectedCategoryFilter) {
        return false;
      }

      // 2. Region filter
      if (selectedRegionFilter !== 'All') {
        const matchesRegion = b.region.toLowerCase().includes(selectedRegionFilter.toLowerCase()) ||
                              selectedRegionFilter.toLowerCase().includes(b.region.toLowerCase());
        if (!matchesRegion) return false;
      }

      const branchEmps = employees.filter(emp => matchEmployeeToBranch(emp.branch, b.name));

      // 3. Employee Position filter (Designation bo'yicha)
      if (selectedPositionFilter !== 'All') {
        const hasMatchingPosition = branchEmps.some(emp => 
          emp.position?.toLowerCase().trim() === selectedPositionFilter.toLowerCase().trim()
        );
        if (!hasMatchingPosition) return false;
      }

      // 4. Employee Name filter (Employee ismi orqali)
      const empNameQuery = (searchEmployeeName || '').toLowerCase().trim();
      if (empNameQuery) {
        const hasMatchingName = branchEmps.some(emp => 
          (emp.fullName || '').toLowerCase().includes(empNameQuery) ||
          (emp.staffId || '').toLowerCase().includes(empNameQuery)
        );
        if (!hasMatchingName) return false;
      }

      // 5. General search query (Branch Name, manzil, yoki xodim ma'lumotlari)
      const q = (searchQuery || '').toLowerCase().trim();
      if (q) {
        const matchesBranch = 
          (b.name || '').toLowerCase().includes(q) ||
          (b.code || '').toLowerCase().includes(q) ||
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
      // 1. Employee Name filter (Employee ismi orqali)
      const empNameQuery = (searchEmployeeName || '').toLowerCase().trim();
      if (empNameQuery) {
        if (!(emp.fullName || '').toLowerCase().includes(empNameQuery) && !(emp.staffId || '').toLowerCase().includes(empNameQuery)) {
          return false;
        }
      }

      // 2. Position filter (Designation bo'yicha)
      if (selectedPositionFilter !== 'All') {
        if ((emp.position || '').toLowerCase().trim() !== selectedPositionFilter.toLowerCase().trim()) {
          return false;
        }
      }

      // 3. Region filter (Viloyat bo'yicha)
      if (selectedRegionFilter !== 'All') {
        const empRegion = (emp.computedRegion || '').toLowerCase();
        const filtRegion = (selectedRegionFilter || '').toLowerCase();
        if (!empRegion.includes(filtRegion) && !filtRegion.includes(empRegion)) {
          return false;
        }
      }

      // 4. Branch Category filter
      if (selectedCategoryFilter !== 'All') {
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
          (emp.assignedBranch && emp.assignedBranch.name && emp.assignedBranch.name.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [employees, branches, searchEmployeeName, selectedPositionFilter, selectedRegionFilter, selectedCategoryFilter, searchQuery]);

  // Filtered employees for the opened branch card
  const branchCardEmployees = useMemo(() => {
    if (!selectedBranchCard) return [];
    const list = employees.filter(emp => matchEmployeeToBranch(emp.branch, selectedBranchCard.name));
    return list.filter(emp => {
      if (cardEmpSearch.trim()) {
        const q = (cardEmpSearch || '').toLowerCase().trim();
        const match = 
          (emp.fullName || '').toLowerCase().includes(q) ||
          (emp.staffId && emp.staffId.toLowerCase().includes(q)) ||
          (emp.phone && emp.phone.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (cardEmpPosition !== 'All') {
        if (emp.position?.toLowerCase().trim() !== cardEmpPosition.toLowerCase().trim()) return false;
      }
      if (cardEmpStatus !== 'All') {
        if (emp.status !== cardEmpStatus) return false;
      }
      return true;
    });
  }, [selectedBranchCard, employees, cardEmpSearch, cardEmpPosition, cardEmpStatus]);

  const handleExport = (type: 'excel' | 'pdf') => {
    if (activeTab === 'branches') {
      const fileName = `Toyona_Branchlar_${new Date().toISOString().slice(0, 10)}`;
      const headers = ['#', 'Branch Name', 'Region', 'Category', 'Total Employees', 'Open Vacancies', 'Date', 'Physical Address'];
      const data = filteredBranches.map((b, i) => {
        const bEmps = employees.filter(emp => matchEmployeeToBranch(emp.branch, b.name));
        return [
          i + 1,
          b.name,
          b.region,
          b.category,
          `${bEmps.length} ta`,
          `${b.vacancyCount || 0} ta`,
          b.date,
          b.address || '-'
        ];
      });

      if (type === 'excel') {
        const excelData = filteredBranches.map((b, i) => {
          const bEmps = employees.filter(emp => matchEmployeeToBranch(emp.branch, b.name));
          return {
            '№': i + 1,
            'Branch Nomi (UZ)': b.name,
            'Branch Nomi (RU)': b.code || '-',
            'Region': b.region,
            'Category': b.category,
            'Employee Count': bEmps.length,
            'Vakansiyalar': b.vacancyCount || 0,
            'Date': b.date,
            'Physical Address': b.address || '-',
            'Telefon': b.phone || '-',
            'Operating Hours': b.workHours || '-',
            'Branch mudiri': b.manager || '-'
          };
        });
        exportToExcel(excelData, fileName);
      } else {
        exportToPDF(headers, data, fileName, "NovaHR - Branches Directory Report");
      }
    } else {
      const fileName = `Toyona_Branch_Employeesi_${new Date().toISOString().slice(0, 10)}`;
      const headers = ['№', 'Full Name', 'Employee ID', 'Branch', 'Region', 'Designation', 'Department', 'Telefon', 'Status'];
      const data = filteredEmployees.map((emp, i) => [
        i + 1,
        emp.fullName,
        emp.staffId,
        emp.assignedBranch?.name || emp.branch,
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
          'Employee ID': emp.staffId,
          'Branch': emp.assignedBranch?.name || emp.branch,
          'Region': emp.computedRegion,
          'Position': emp.position,
          'Department': emp.department,
          'Telefon': emp.phone,
          'Ish holati': emp.status === 'active' ? 'Doimiy' : emp.status === 'leave' ? 'Ta\'tilda' : 'Sinovda'
        }));
        exportToExcel(excelData, fileName);
      } else {
        exportToPDF(headers, data, fileName, "Toyona Savdo - Branch Personnel Ro'yxati");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden p-5">
      {/* Module Header with Toyona Savdo Logo */}
      <ModuleHeaderLogo title="Branchlar va Employees Boshqaruvi" icon={Network} />

      {/* Branches & Employees Statistics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-[#00A651] flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Total Branches</div>
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
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Total Staff</div>
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
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Staffed Branches</div>
            <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
              {branches.filter(b => employees.some(e => matchEmployeeToBranch(e.branch, b.name))).length} ta
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Open Vacancies</div>
            <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
              {branches.reduce((acc, b) => acc + (Number(b.vacancyCount) || 0), 0)} ta
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
            <span>By Branches & Locations</span>
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
            <span>By Branch Personnel</span>
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
            <span>Add Branch</span>
          </button>
        </div>
      </div>

      {/* Comprehensive Multi-Filter Bar: Ismi, Designationi, Viloyati, Toifasi */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-2xs mb-4 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#00A651]" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Filter Panel</span>
            {isAnyFilterActive && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                {activeFilterCount} active filters
              </span>
            )}
          </div>

          {isAnyFilterActive && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100/80 px-2.5 py-1 rounded-lg border border-rose-200/60 dark:border-rose-900/60 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Inputs Grid: 1. Employee ismi, 2. Designation, 3. Viloyat, 4. Toifa, 5. Umumiy qidiruv */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* 1. Employee ismi orqali filtrlash */}
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Employee full name..." 
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

          {/* 2. Designation bo'yicha filtrlash */}
          <div className="relative">
            <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select 
              value={selectedPositionFilter}
              onChange={(e) => setSelectedPositionFilter(e.target.value)}
              className="appearance-none w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg pl-9 pr-7 py-2 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer font-medium"
            >
              <option value="All">All Designations</option>
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
              <option value="All">All Regions</option>
              {availableRegions.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* 4. Branch toifasi bo'yicha filtrlash */}
          <div className="relative">
            <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select 
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="appearance-none w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg pl-9 pr-7 py-2 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer font-medium"
            >
              <option value="All">All Categories</option>
              <option value="A">Category A</option>
              <option value="B">Category B</option>
              <option value="C">Category C</option>
              <option value="D">Category D</option>
              <option value="Mini">Category Mini</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* 5. Umumiy qidiruv (Branch Name / Physical Address) */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Branch name or address..." 
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
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Active filters:</span>

            {searchEmployeeName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
                <User className="w-3 h-3 text-emerald-600" />
                <span>Employee: <strong>{searchEmployeeName}</strong></span>
                <button onClick={() => setSearchEmployeeName('')} className="hover:text-emerald-900 cursor-pointer ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedPositionFilter !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-medium">
                <Briefcase className="w-3 h-3 text-blue-600" />
                <span>Designation: <strong>{selectedPositionFilter}</strong></span>
                <button onClick={() => setSelectedPositionFilter('All')} className="hover:text-blue-900 cursor-pointer ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedRegionFilter !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                <MapPin className="w-3 h-3 text-amber-600" />
                <span>Region: <strong>{selectedRegionFilter}</strong></span>
                <button onClick={() => setSelectedRegionFilter('All')} className="hover:text-amber-900 cursor-pointer ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCategoryFilter !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-medium">
                <Building2 className="w-3 h-3 text-purple-600" />
                <span>Category: <strong>Category {selectedCategoryFilter}</strong></span>
                <button onClick={() => setSelectedCategoryFilter('All')} className="hover:text-purple-900 cursor-pointer ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-medium">
                <Search className="w-3 h-3 text-slate-500" />
                <span>Search: <strong>{searchQuery}</strong></span>
                <button onClick={() => setSearchQuery('')} className="hover:text-slate-900 cursor-pointer ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main View Area: Tab 1. Branchlar kesimida, Tab 2. Employees kesimida */}
      {activeTab === 'branches' ? (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">№</th>
                <th className="p-4">BRANCH NAME</th>
                <th className="p-4">REGION / STATE</th>
                <th className="p-4">CATEGORY</th>
                <th className="p-4">BRANCH EMPLOYEES (HRMS)</th>
                <th className="p-4">VACANCIES</th>
                <th className="p-4">ESTABLISHED DATE</th>
                <th className="p-4 w-28 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-[#00A651] animate-spin" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Loading branch roster...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredBranches.map((branch, index) => {
                const branchEmps = employees.filter(emp => matchEmployeeToBranch(emp.branch, branch.name));
                const isExpanded = expandedBranchId === branch.id;

                // Match specific employees if employee name or position filter is active
                const matchingEmps = branchEmps.filter(emp => {
                  const nameMatch = !searchEmployeeName.trim() || 
                     (emp.fullName || '').toLowerCase().includes(searchEmployeeName.toLowerCase().trim()) ||
                     (emp.staffId && emp.staffId.toLowerCase().includes(searchEmployeeName.toLowerCase().trim()));
                  const posMatch = selectedPositionFilter === 'All' ||
                    (emp.position || '').toLowerCase().trim() === selectedPositionFilter.toLowerCase().trim();
                  return nameMatch && posMatch;
                });

                const isEmployeeFiltered = searchEmployeeName.trim() !== '' || selectedPositionFilter !== 'All';

                return (
                  <tr 
                    key={`${branch.id || branch.name || index}-${index}`}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-4 text-slate-400 dark:text-slate-500 text-center font-mono text-xs">#{index + 1}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {branch.name}
                      </div>
                      {branch.manager && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5 mt-0.5">
                          <User className="w-3 h-3 text-[#00A651] shrink-0" />
                          <span>Manager: <strong>{branch.manager}</strong></span>
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
                        Category {branch.category}
                      </span>
                    </td>
                    
                    {/* Employees Ustuni - Shunchaki soni ko'rinib turadi, card ochilmaydi */}
                    <td className="p-4">
                      {branchEmps.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40">
                          <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{branchEmps.length} employees</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          No assigned staff
                        </span>
                      )}
                    </td>

                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{branch.vacancyCount} ta</td>
                    <td className="p-4 text-slate-500 dark:text-slate-500 font-mono text-xs">{branch.date}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => openEditModal(branch)}
                          title="Edit"
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-[#00A651] dark:hover:text-emerald-400 hover:bg-[#00A651]/10 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDelete(branch.id)}
                          title="Delete"
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
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">No Branches or Employees Found</p>
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
        /* Tab 2. Branch xodimlari kesimida (Direct consolidated list of all branch employees) */
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">№</th>
                <th className="p-4">EMPLOYEE NAME</th>
                <th className="p-4">ASSIGNED BRANCH</th>
                <th className="p-4">REGION / STATE</th>
                <th className="p-4">DESIGNATION</th>
                <th className="p-4">DEPARTMENT</th>
                <th className="p-4">PHONE</th>
                <th className="p-4">STATUS</th>
                <th className="p-4 w-28 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-[#00A651] animate-spin" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Loading branch staff roster...
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
                    
                    {/* Employee ismi va rasmi */}
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

                    {/* Branch */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-slate-800 dark:text-slate-100">
                          {emp.assignedBranch ? emp.assignedBranch.name : emp.branch}
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

                    {/* Designation */}
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#00A651] dark:text-emerald-400">
                        <Briefcase className="w-3.5 h-3.5 shrink-0" />
                        {emp.position}
                      </span>
                    </td>

                    {/* Department */}
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
                          <span>Branch</span>
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
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">No Branch Employees Found</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                No employees match the specified search query.
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
                  {editingBranch ? 'Edit Branch Details' : 'Add New Branch'}
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
                  {/* Branch Nomi */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Branch Name <span className="text-rose-500">*</span></label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value, code: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      placeholder="Masalan: Downtown Manhattan Branch"
                    />
                  </div>

                  {/* Viloyat */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Region / State <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <select
                        required
                        value={formData.region}
                        onChange={e => setFormData({...formData, region: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] appearance-none"
                      >
                        <option value="">Select Region / State...</option>
                        {availableRegions.map(reg => (
                          <option key={reg} value={reg}>{reg}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Mas'ul shaxs (Branch mudiri) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Manager / Supervisor Name</label>
                    <input
                      type="text"
                      value={formData.manager || ''}
                      onChange={e => setFormData({...formData, manager: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      placeholder="e.g. Alexander Mitchell"
                    />
                  </div>

                  {/* Telefon (Nomer) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      placeholder="+1 (555) 019-2834"
                    />
                  </div>

                  {/* Aniq manzil (Joylashuvi) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Physical Address <span className="text-rose-500">*</span></label>
                    <input
                      required
                      type="text"
                      value={formData.address || ''}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      placeholder="Street, suite, building number..."
                    />
                  </div>

                  {/* Aniq mo'ljal */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Landmark / Cross Street</label>
                    <input
                      type="text"
                      value={formData.landmark || ''}
                      onChange={e => setFormData({...formData, landmark: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      placeholder="e.g. Opposite City Plaza, Suite 400"
                    />
                  </div>

                  {/* Operating Hours */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Operating Hours</label>
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
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Branch Category Tier</label>
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-[#00A651] hover:bg-[#009045] rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {editingBranch ? 'Save Branch' : 'Create Branch'}
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
                Confirm Branch Deletion
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Are you sure you want to delete this branch? This action cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={closeDeleteModal}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Yes, Delete Branch
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
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{selectedBranchCard.name} Branchi</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${categoryColors[selectedBranchCard.category]}`}>
                        {selectedBranchCard.category} Category
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
                        Branch Details
                      </h3>
                      {!cardEditMode ? (
                        <button 
                          onClick={() => setCardEditMode(true)}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#00A651] bg-[#00A651]/10 px-3 py-1.5 rounded-lg hover:bg-[#00A651]/20 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setCardEditMode(false)}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={saveCardEdits}
                            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#00A651] px-3 py-1.5 rounded-lg hover:bg-[#009045] shadow-xs transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save Branch
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Physical Address */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Physical Address</label>
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
                            {selectedBranchCard.address || "Not Specified"}
                          </div>
                        )}
                      </div>
                      
                      {/* Telefon */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" /> Phone Number
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

                      {/* Operating Hours */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Operating Hours
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
                          Branch Employeesi
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                          All active employees assigned to this branch
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-[#00A651]/10 text-[#00A651] font-extrabold text-xs px-3.5 py-1.5 rounded-full">
                          {branchCardEmployees.length} / {employees.filter(emp => matchEmployeeToBranch(emp.branch, selectedBranchCard.name)).length} employees
                        </span>
                      </div>
                    </div>

                    {/* In-Card Employee Filter Controls */}
                    <div className="p-3.5 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search personnel by name..."
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
                          <option value="All">Barcha lavozimlar</option>
                          {Array.from(new Set(employees.filter(e => matchEmployeeToBranch(e.branch, selectedBranchCard.name)).map(e => e.position))).filter(Boolean).map(pos => (
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
                          <option value="All">Barcha statuslar</option>
                          <option value="active">Active</option>
                          <option value="leave">On Leave</option>
                          <option value="probation">Probation</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>

                      {(cardEmpSearch || cardEmpPosition !== 'All' || cardEmpStatus !== 'All') && (
                        <button
                          onClick={() => {
                            setCardEmpSearch('');
                            setCardEmpPosition('All');
                            setCardEmpStatus('All');
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
                            <th className="p-4 w-16">Photo</th>
                            <th className="p-4">Full Name</th>
                            <th className="p-4">Designation</th>
                            <th className="p-4">Department</th>
                            <th className="p-4">Phone</th>
                            <th className="p-4">Hire Date</th>
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
                                    {employee.status === 'active' ? 'Active' : employee.status === 'leave' ? 'On Leave' : 'Probation'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                                No employees found matching the search criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
