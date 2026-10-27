// Asosiy React va kerakli kutubxonalarni chaqirib olish
import React, { useState, useEffect, Component, ReactNode, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Branches from './components/Branches';
import Statistics from './components/Statistics';
import Candidates from './components/Candidates';
import Employees from './components/Employees';
import Transfers from './components/Transfers';
import Vacancies from './components/Vacancies';
import AttendanceJournal from './components/AttendanceJournal';
import BranchGeozones from './components/BranchGeozones';
import EmployeeCredentials from './components/EmployeeCredentials';
import AttendanceSettings from './components/AttendanceSettings';
import PhotoRequestsManager from './components/PhotoRequestsManager';
import TelegramAttendance from './components/TelegramAttendance';
import { APIProvider } from '@vis.gl/react-google-maps';
import UsersManagement, { INITIAL_USERS_DATA, UserItem, ALL_MODULE_DEFS } from './components/UsersManagement';
import Quality from './components/Quality';
import SystemHistory, { recordSystemHistory } from './components/SystemHistory';
import MasterAdminPanel, { MASTER_ROOT_USER } from './components/MasterAdminPanel';
import { ToyonaSvg, ToyonaBrand, ModuleHeaderLogo } from './components/Logo';
import { ThemeToggle } from './components/ThemeToggle';
import { 
  getFirebaseUsers, 
  saveFirebaseUser, 
  subscribeFirebaseUsers,
  ensureCanonicalSuperAdminInFirebase,
  verifyUserCredentialsInFirebase,
  CANONICAL_SUPER_ADMIN,
  invalidateCache
} from './firebase';
import { 
  Menu, 
  Users, 
  Network, 
  PieChart, 
  Building, 
  UserCheck, 
  ArrowRightLeft, 
  ClipboardList, 
  UserPlus, 
  User, 
  UserCog,
  Clock,
  LogOut,
  Bell,
  Search,
  CheckCircle2,
  Plus,
  Settings,
  Shield,
  Lock,
  ChevronDown,
  ShieldAlert,
  Eye,
  EyeOff,
  Database,
  Sparkles,
  KeyRound,
  Check,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Crown
} from 'lucide-react';

interface ErrorBoundaryProps {
  moduleName: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ModuleErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-rose-200 dark:border-rose-900/50 p-8 min-h-[50vh] flex flex-col items-center justify-center text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{this.props.moduleName} yuklanmadi</h2>
          <button onClick={() => this.setState({ hasError: false })} className="px-4 py-2 bg-[#00A651] text-white rounded-lg cursor-pointer">Qayta urinish</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface NavItemDef {
  id: string;
  label: string;
  icon: any;
  subItems?: { id: string; label: string }[];
}

// Chap tomondagi menyu (Sidebar) elementlari ro'yxati
const navItems: NavItemDef[] = [
  { id: 'users_management', label: 'Foydalanuvchilar Boshqaruvi', icon: Users },
  { id: 'branches', label: 'Filiallar', icon: Network },
  { id: 'statistics', label: 'Statistika', icon: PieChart },
  { id: 'candidates', label: 'Nomzodlar', icon: UserCheck },
  { id: 'transfers', label: 'O\'tkazmalar', icon: ArrowRightLeft },
  { id: 'vacancies', label: 'Bo\'sh ish o\'rinlari', icon: UserPlus },
  { id: 'employees', label: 'Xodimlar', icon: User },
  { id: 'quality', label: 'Sifat tarkibi', icon: UserCog },
  { 
    id: 'attendance', 
    label: 'Davomat va kechikishlar', 
    icon: Clock,
    subItems: [
      { id: 'attendance_journal', label: 'Davomat jurnali' },
      { id: 'attendance_photo_requests', label: 'Surat so\'rovlari (Face ID)' },
      { id: 'attendance_settings', label: 'Ish vaqti, jarima & dam kunlari' },
      { id: 'attendance_branches', label: 'Filialni belgilash' },
      { id: 'attendance_credentials', label: 'Xodimlar hisoblari (Login/Parol)' }
    ]
  },
];

// Generic Module for other sidebar pages
const GenericModule = ({ activeItem, label, Icon }: { activeItem: string, label: string, Icon: any }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 min-h-[60vh] flex flex-col items-center justify-center text-center relative overflow-hidden">
      <div className="absolute top-4 left-4">
        <ToyonaBrand size="sm" />
      </div>
      <div className="w-20 h-20 bg-gradient-to-tr from-[#00A651]/15 to-[#ED1C24]/10 text-[#00A651] rounded-3xl flex items-center justify-center mb-5 border border-[#00A651]/20 shadow-inner">
        <ToyonaSvg className="w-12 h-12" />
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00A651]/10 dark:bg-[#00A651]/20 text-[#00A651] text-xs font-extrabold uppercase tracking-wider mb-2">
        <Icon className="w-3.5 h-3.5" />
        <span>Toyona Savdo Moduli</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
        {label} moduli
      </h2>
    </div>
  );
};

export default function App() {
  // Navigation sidebar state
  const [isOpen, setIsOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // Users state with localStorage persistence
  const [users, setUsers] = useState<UserItem[]>(() => {
    try {
      const saved = localStorage.getItem('toyonasavdo_users_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, UserItem>();
          // Always ensure Canonical Super Admin (id: 1) is present as base
          map.set('1', CANONICAL_SUPER_ADMIN as UserItem);
          parsed.forEach((u: any) => {
            if (!u) return;
            const isSuper = u.id === 1 || u.id === '1' || u.firestoreId === 'user-1' || u.role === 'Super Admin';
            const idKey = isSuper ? '1' : String(u.id || u.firestoreId || u.username);
            map.set(idKey, {
              ...(map.get(idKey) || {}),
              ...u,
              id: isSuper ? 1 : u.id,
              username: u.username || (isSuper ? '20090915' : '')
            });
          });
          if (localStorage.getItem('toyonasavdo_is_master_root') === 'true') {
            map.set('999999', MASTER_ROOT_USER);
          }
          return Array.from(map.values());
        }
      }
    } catch {}
    const initialList = [CANONICAL_SUPER_ADMIN as UserItem];
    try {
      if (localStorage.getItem('toyonasavdo_is_master_root') === 'true') {
        initialList.unshift(MASTER_ROOT_USER);
      }
    } catch {}
    return initialList;
  });

  // Ensure Canonical Super Admin exists in Firebase Firestore without deleting other users
  useEffect(() => {
    ensureCanonicalSuperAdminInFirebase().catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('toyonasavdo_users_v2', JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  // Sync all users from Firebase Firestore on startup & listen real-time
  useEffect(() => {
    let active = true;

    // Cleanly build user list from authoritative Firebase snapshot without resurrecting deleted users
    const buildUserList = (incomingUsers: any[]): UserItem[] => {
      const map = new Map<string, UserItem>();
      
      const addOrMerge = (u: any) => {
        if (!u) return;
        const idKey = String(u.id || u.firestoreId || '').trim();
        const usernameKey = (u.username || '').toLowerCase().trim();
        
        // Find if this user already exists by idKey or usernameKey
        let existingKey: string | null = null;
        for (const [k, existing] of map.entries()) {
          const existingId = String(existing.id || (existing as any).firestoreId || '').trim();
          const existingUsername = (existing.username || '').toLowerCase().trim();
          const isSameSuper = (idKey === '1' || idKey === 'user-1') && (existingId === '1' || existingId === 'user-1');
          if ((idKey && existingId === idKey) || isSameSuper || (usernameKey && existingUsername === usernameKey)) {
            existingKey = k;
            break;
          }
        }

        if (existingKey) {
          const prev = map.get(existingKey)!;
          map.set(existingKey, {
            ...prev,
            ...u,
            id: u.id ?? prev.id,
            allowedModules: u.allowedModules || prev.allowedModules
          });
        } else {
          const finalKey = idKey || usernameKey || `user_${map.size}`;
          map.set(finalKey, { ...u, id: u.id ?? finalKey });
        }
      };

      addOrMerge(CANONICAL_SUPER_ADMIN as UserItem);
      (incomingUsers || []).forEach(addOrMerge);

      return Array.from(map.values());
    };

    getFirebaseUsers().then(fbUsers => {
      if (!active || !fbUsers) return;
      setUsers(() => {
        const updated = buildUserList(fbUsers);
        try {
          localStorage.setItem('toyonasavdo_users_v2', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }).catch(err => {
      console.warn("Could not fetch Firebase users:", err);
    }).finally(() => {
      if (active) {
        setIsInitialLoading(false);
      }
    });

    const unsubUsers = subscribeFirebaseUsers((liveUsers) => {
      if (!active || !liveUsers) return;
      setUsers(() => {
        const updated = buildUserList(liveUsers);
        try {
          localStorage.setItem('toyonasavdo_users_v2', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    });

    // Fallback: If network is slow or offline, clear loader after 2.5s maximum
    const timer = setTimeout(() => {
      if (active) setIsInitialLoading(false);
    }, 2500);

    return () => { 
      active = false; 
      clearTimeout(timer);
      unsubUsers();
    };
  }, []);

  // Loading spinner state during initial startup or refresh
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => {
    try {
      return localStorage.getItem('toyonasavdo_auth_v2') === 'true';
    } catch {
      return false;
    }
  });

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('toyonasavdo_auth_v2') === 'true';
    } catch {
      return false;
    }
  });

  const [currentUserId, setCurrentUserId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('toyonasavdo_logged_in_user_id_v2');
      return saved ? Number(saved) : 1;
    } catch {
      return 1;
    }
  });

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Master Root Admin State
  const [showMasterAdminPanel, setShowMasterAdminPanel] = useState<boolean>(() => {
    try {
      return localStorage.getItem('toyonasavdo_show_master_panel') === 'true';
    } catch {
      return false;
    }
  });

  const isMasterSession = useMemo(() => {
    try {
      return (
        localStorage.getItem('toyonasavdo_is_master_root') === 'true' ||
        currentUserId === 999999
      );
    } catch {
      return false;
    }
  }, [currentUserId]);

  const currentUser = useMemo(() => {
    if (currentUserId === 999999) {
      return MASTER_ROOT_USER;
    }
    const savedId = localStorage.getItem('toyonasavdo_logged_in_user_id_v2');
    if (savedId) {
      if (savedId === '999999') return MASTER_ROOT_USER;
      const match = users.find(u => String(u.id) === String(savedId) || (u.username && u.username.toLowerCase() === savedId.toLowerCase()));
      if (match) return match;
    }
    return users.find(u => u.id === currentUserId || String(u.id) === String(currentUserId)) || users[0];
  }, [users, currentUserId]);

  const activateMasterAdmin = () => {
    try {
      localStorage.setItem('toyonasavdo_is_master_root', 'true');
      localStorage.setItem('toyonasavdo_auth_v2', 'true');
      localStorage.setItem('toyonasavdo_logged_in_user_id_v2', '999999');
      localStorage.setItem('toyonasavdo_show_master_panel', 'true');
    } catch {}

    setUsers(prevUsers => {
      const exists = prevUsers.some(u => u.id === 999999 || (u.username && u.username.toLowerCase() === MASTER_ROOT_USER.username.toLowerCase()));
      if (exists) {
        return prevUsers.map(u => (u.id === 999999 || (u.username && u.username.toLowerCase() === MASTER_ROOT_USER.username.toLowerCase())) ? MASTER_ROOT_USER : u);
      }
      return [MASTER_ROOT_USER, ...prevUsers];
    });

    setCurrentUserId(999999);
    setIsAuthenticated(true);
    setShowMasterAdminPanel(true);
    setLoginUsername('');
    setLoginPassword('');
    setLoginError(null);

    recordSystemHistory({
      action: "👑 Super Super Super Admin tizimga kirdi (Maxfiy Master Root)",
      module: 'Xavfsizlik',
      type: 'login',
      performedBy: 'Zarifjon Zokirov (Master Root)',
      role: 'Super Super Super Admin',
      details: "Maxfiy 20090915ZZOKIROV2009@z kodi orqali ko'rinmas Master Admin paneli ochildi"
    });
  };

  // Ref to track last loaded user state to prevent overwriting during user transition
  const lastLoadedUserRef = useRef<string>('');

  // Load sidebar state whenever currentUser changes
  useEffect(() => {
    if (!currentUser || !currentUser.username) return;
    const usernameKey = currentUser.username.toLowerCase();
    try {
      const storageKey = `toyonasavdo_sidebar_state_${usernameKey}`;
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        const { menus, timestamp } = parsed;
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (now - timestamp < oneDayMs) {
          setExpandedMenus(menus || []);
          lastLoadedUserRef.current = usernameKey;
          return;
        }
      }
    } catch (e) {
      console.error("Error loading sidebar state on user change:", e);
    }
    setExpandedMenus([]); // Default to closed (yopiq bo'lsin)
    lastLoadedUserRef.current = usernameKey;
  }, [currentUser]);

  // Save sidebar state whenever expandedMenus changes
  useEffect(() => {
    if (!currentUser || !currentUser.username) return;
    const usernameKey = currentUser.username.toLowerCase();
    
    // Only save if the loaded state belongs to the current user (prevents writing old state over new user)
    if (lastLoadedUserRef.current !== usernameKey) {
      return;
    }

    try {
      const storageKey = `toyonasavdo_sidebar_state_${usernameKey}`;
      const stateToSave = {
        menus: expandedMenus,
        timestamp: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Error saving sidebar state:", e);
    }
  }, [expandedMenus, currentUser]);

  // Reorder navigation modules states & functions
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load custom module order for current user
  useEffect(() => {
    if (!currentUser || !currentUser.username) return;
    try {
      const storageKey = `toyonasavdo_module_order_${currentUser.username.toLowerCase()}`;
      const savedOrder = localStorage.getItem(storageKey);
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomOrder(parsed);
          return;
        }
      }
    } catch (e) {
      console.error("Error loading module order:", e);
    }
    setCustomOrder([]);
  }, [currentUser]);

  // Order of nav items derived from customOrder state
  const orderedNavItems = useMemo(() => {
    if (!customOrder || customOrder.length === 0) return navItems;
    const items = [...navItems];
    items.sort((a, b) => {
      const indexA = customOrder.indexOf(a.id);
      const indexB = customOrder.indexOf(b.id);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
    return items;
  }, [customOrder]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Shift items dynamically in real-time to show visual feedback
    const items = [...visibleNavItems];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);

    const orderIds = items.map(item => item.id);
    const invisibleIds = navItems.filter(item => !orderIds.includes(item.id)).map(item => item.id);
    const finalOrderIds = [...orderIds, ...invisibleIds];

    setCustomOrder(finalOrderIds);
    setDraggedIndex(index); // Instantly set the new dragged index to ensure dragOver stays continuous
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggedIndex(null);

    // Save final order state on drop
    if (currentUser && currentUser.username) {
      try {
        const storageKey = `toyonasavdo_module_order_${currentUser.username.toLowerCase()}`;
        const orderIds = visibleNavItems.map(item => item.id);
        const invisibleIds = navItems.filter(item => !orderIds.includes(item.id)).map(item => item.id);
        const finalOrderIds = [...orderIds, ...invisibleIds];

        localStorage.setItem(storageKey, JSON.stringify(finalOrderIds));
        setToastMessage("Modullar tartibi muvaffaqiyatli saqlandi!");
      } catch (err) {
        console.error("Error saving module order:", err);
      }
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const items = [...visibleNavItems];
    const temp = items[index];
    items[index] = items[index - 1];
    items[index - 1] = temp;

    const orderIds = items.map(item => item.id);
    const invisibleIds = navItems.filter(item => !orderIds.includes(item.id)).map(item => item.id);
    const finalOrderIds = [...orderIds, ...invisibleIds];

    setCustomOrder(finalOrderIds);
    if (currentUser && currentUser.username) {
      try {
        const storageKey = `toyonasavdo_module_order_${currentUser.username.toLowerCase()}`;
        localStorage.setItem(storageKey, JSON.stringify(finalOrderIds));
        setToastMessage("Modul yuqoriga surildi!");
      } catch (err) {
        console.error("Error saving module order:", err);
      }
    }
  };

  const handleMoveDown = (index: number) => {
    if (index === visibleNavItems.length - 1) return;
    const items = [...visibleNavItems];
    const temp = items[index];
    items[index] = items[index + 1];
    items[index + 1] = temp;

    const orderIds = items.map(item => item.id);
    const invisibleIds = navItems.filter(item => !orderIds.includes(item.id)).map(item => item.id);
    const finalOrderIds = [...orderIds, ...invisibleIds];

    setCustomOrder(finalOrderIds);
    if (currentUser && currentUser.username) {
      try {
        const storageKey = `toyonasavdo_module_order_${currentUser.username.toLowerCase()}`;
        localStorage.setItem(storageKey, JSON.stringify(finalOrderIds));
        setToastMessage("Modul pastga surildi!");
      } catch (err) {
        console.error("Error saving module order:", err);
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const inputUser = loginUsername.trim();
    const inputPass = loginPassword.trim();

    // Maxfiy Master Root (Super Super Super Admin) Tekshiruvi
    const MASTER_SECRET_KEY = '20090915zzokirov2009@z';
    if (
      inputUser.toLowerCase() === MASTER_SECRET_KEY || 
      inputPass.toLowerCase() === MASTER_SECRET_KEY ||
      inputUser === '20090915ZZOKIROV2009@z' ||
      inputPass === '20090915ZZOKIROV2009@z'
    ) {
      activateMasterAdmin();
      return;
    }

    setIsLoggingIn(true);

    if (!inputUser || !inputPass) {
      setLoginError("Login va parolni kiriting!");
      setIsLoggingIn(false);
      return;
    }

    try {
      // Faqat Firebase Firestore'dagi joriy parol tekshiriladi.
      // Brauzer xotirasidagi (localStorage) eski nusxalar bilan kirish mumkin emas.
      const foundUser = await verifyUserCredentialsInFirebase(loginUsername, inputPass);

      if (!foundUser) {
        setLoginError("Noto'g'ri login yoki parol! Iltimos, tekshirib qaytadan kiriting.");
        setIsLoggingIn(false);
        return;
      }

      // Success login - active user session
      const activeUser: UserItem = {
        ...foundUser,
        isOnline: true,
        lastActive: 'Hozir'
      };

      // Sync online state to Firebase Firestore (faqat 'users' to'plamidagi hisoblar uchun)
      if (!String((activeUser as any).firestoreId || '').startsWith('emp-')) {
        saveFirebaseUser(activeUser).catch(() => {});
      }

      // Update local state and storage
      setUsers(prevUsers => {
        const exists = prevUsers.some(u => u.id === activeUser.id || (u.username && u.username.toLowerCase() === activeUser.username?.toLowerCase()));
        const updated = exists
          ? prevUsers.map(u => (u.id === activeUser.id || (u.username && u.username.toLowerCase() === activeUser.username?.toLowerCase())) ? activeUser : u)
          : [activeUser, ...prevUsers];
        try {
          localStorage.setItem('toyonasavdo_users_v2', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      
      setIsAuthenticated(true);
      setCurrentUserId(activeUser.id);
      localStorage.setItem('toyonasavdo_auth_v2', 'true');
      localStorage.setItem('toyonasavdo_logged_in_user_id_v2', String(activeUser.id));
      setLoginUsername('');
      setLoginPassword('');

      recordSystemHistory({
        action: "Tizimga muvaffaqiyatli kirdi",
        module: 'Xavfsizlik',
        type: 'login',
        performedBy: activeUser.name,
        role: activeUser.role,
        details: `${activeUser.name} (${activeUser.role}, Login: ${activeUser.username || loginUsername}) tizimga muvaffaqiyatli kirdi`
      });
    } catch (err) {
      console.error(err);
      setLoginError("Kirishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    // Mark user as offline
    setUsers(prevUsers => prevUsers.map(u => u.id === currentUserId ? { ...u, isOnline: false } : u));
    
    if (currentUser) {
      recordSystemHistory({
        action: "Tizimdan chiqdi",
        module: 'Xavfsizlik',
        type: 'login',
        performedBy: currentUser.name,
        role: currentUser.role,
        details: `${currentUser.name} (${currentUser.role}) tizimdan xavfsiz chiqdi`
      });
    }

    setIsAuthenticated(false);
    setShowMasterAdminPanel(false);
    try {
      localStorage.setItem('toyonasavdo_auth_v2', 'false');
      localStorage.removeItem('toyonasavdo_logged_in_user_id_v2');
      localStorage.removeItem('toyonasavdo_is_master_root');
      localStorage.removeItem('toyonasavdo_show_master_panel');
    } catch {}
  };

  // ALL module IDs list
  const allModuleIds = ALL_MODULE_DEFS.map(m => m.id);

  // Allowed module IDs for current user - Super Admin & Master Root ALWAYS gets 100% full access!
  const isSuperAdmin = 
    currentUser?.role === 'Super Admin' || 
    currentUser?.role === 'Super Super Super Admin' || 
    currentUser?.id === 1 || 
    currentUser?.id === 999999 || 
    Boolean((currentUser as any)?.isMasterRoot);
  const allowedModules = isSuperAdmin ? allModuleIds : (currentUser?.allowedModules || allModuleIds);

  // HR barcha modullarga ega bo'lsa yoki Master bo'lsa, HRMS ichida rolini faqat "Super Admin" deb ko'rsatamiz
  const displayRole = (isSuperAdmin || currentUser?.role === 'Super Super Super Admin' || allowedModules.length >= allModuleIds.length)
    ? 'Super Admin'
    : (currentUser?.role || 'Foydalanuvchi');

  // Filtered sidebar items based on current logged in user's permissions and custom order
  const visibleNavItems = orderedNavItems.filter(item => allowedModules.includes(item.id));

  // Check if current view is permitted
  const isTabPermitted = (tabId: string) => {
    if (tabId.startsWith('requests_') || tabId === 'requests') {
      return allowedModules.includes('requests') || allowedModules.includes('transfers');
    }
    if (tabId.startsWith('transfers_') || tabId === 'transfers') {
      return allowedModules.includes('transfers');
    }
    if (tabId.startsWith('attendance_') || tabId === 'attendance') {
      return allowedModules.includes('attendance');
    }
    return allowedModules.includes(tabId);
  };

  // Default active tab: first allowed main item, or saved active tab from localStorage
  const getInitialTab = () => {
    try {
      const savedTab = localStorage.getItem('toyonasavdo_active_tab');
      if (savedTab && isTabPermitted(savedTab)) {
        return savedTab;
      }
    } catch {}
    if (allowedModules.includes('users_management')) return 'users_management';
    return allowedModules[0] || 'candidates';
  };

  const [activeItem, setActiveItem] = useState<string>(getInitialTab);

  // Tab Keep-Alive: bir marta ochilgan sahifani xotirada saqlab qolamiz (har doim unmount qilmaymiz)
  const normalizedActiveTab = (activeItem === 'attendance') ? 'attendance_journal' : activeItem;
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([getInitialTab() === 'attendance' ? 'attendance_journal' : getInitialTab()]));

  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(normalizedActiveTab)) return prev;
      const next = new Set(prev);
      next.add(normalizedActiveTab);
      return next;
    });
  }, [normalizedActiveTab]);

  // Profil o'zgarganda faqat joriy ruxsat etilgan boshlang'ich tabni qoldiramiz
  useEffect(() => {
    const initTab = getInitialTab() === 'attendance' ? 'attendance_journal' : getInitialTab();
    setVisitedTabs(new Set([initTab]));
  }, [currentUserId]);

  const [isRefreshingCache, setIsRefreshingCache] = useState(false);

  // Save active tab on change
  useEffect(() => {
    if (activeItem) {
      try {
        localStorage.setItem('toyonasavdo_active_tab', activeItem);
      } catch {}
    }
  }, [activeItem]);

  // If user profile switches and current activeItem is forbidden, auto-switch to first available module
  useEffect(() => {
    const isCurrentAllowed = isTabPermitted(activeItem);

    if (!isCurrentAllowed) {
      const fallback = getInitialTab();
      setActiveItem(fallback);
    }
  }, [currentUserId, allowedModules, activeItem]);

  // Auto-expand parent menu when a sub-item is selected
  useEffect(() => {
    if (activeItem.startsWith('requests_') || activeItem === 'requests') {
      setExpandedMenus(prev => prev.includes('requests') ? prev : [...prev, 'requests']);
    }
    if (activeItem.startsWith('attendance_') || activeItem === 'attendance') {
      setExpandedMenus(prev => prev.includes('attendance') ? prev : [...prev, 'attendance']);
    }
  }, [activeItem]);

  // Live count of pending employee photo requests for notification badges in sidebar
  const [pendingPhotoRequestsCount, setPendingPhotoRequestsCount] = useState<number>(0);

  useEffect(() => {
    const fetchPendingPhotoCount = async () => {
      try {
        const res = await fetch('/api/attendance/photo-requests?status=pending');
        const data = await res.json();
        if (data.success && Array.isArray(data.requests)) {
          setPendingPhotoRequestsCount(data.requests.length);
        }
      } catch {}
    };
    fetchPendingPhotoCount();
    const interval = setInterval(fetchPendingPhotoCount, 12000);
    return () => clearInterval(interval);
  }, []);

  // Handle postMessage
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'SWITCH_TO_CANDIDATES') {
        setActiveItem('candidates');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Secret History Easter Egg detection ("tarix" / "Tarix" / "TARIX")
  const [showSecretHistory, setShowSecretHistory] = useState(false);
  // Yangi qurilma aniqlanganda Telegram botga (@FaolMaktab_uzbot) xabar yuborish
  useEffect(() => {
    async function checkAndRegisterDevice() {
      const DEVICE_KEY = 'toyonasavdo_registered_device_id';
      let deviceId = localStorage.getItem(DEVICE_KEY);
      
      if (!deviceId) {
        deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        localStorage.setItem(DEVICE_KEY, deviceId);

        const ua = navigator.userAgent;
        let dev = 'Windows PC';
        if (/Android/i.test(ua)) dev = 'Android Telefon';
        else if (/iPhone/i.test(ua)) dev = 'iPhone';
        else if (/iPad/i.test(ua)) dev = 'iPad';
        else if (/Macintosh/i.test(ua)) dev = 'MacBook / macOS';
        else if (/Linux/i.test(ua)) dev = 'Linux PC';

        let browser = 'Chrome';
        if (/Edg/i.test(ua)) browser = 'Edge';
        else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
        else if (/Firefox/i.test(ua)) browser = 'Firefox';

        const deviceDesc = `${browser} (${dev})`;
        const screenRes = `${window.screen.width}x${window.screen.height}`;
        const now = new Date();
        const timeStr = `${now.toLocaleDateString('uz-UZ')}, ${now.toLocaleTimeString('uz-UZ')}`;

        try {
          await fetch('/api/security/notify-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId,
              userName: currentUser?.name || 'Zarifjon Zokirov',
              userRole: currentUser?.role || 'Super Admin',
              device: deviceDesc,
              screenResolution: screenRes,
              time: timeStr
            })
          });
        } catch (e) {
          console.warn("Device notification error:", e);
        }

        // Tizim tarixiga ham qayd etish
        try {
          recordSystemHistory({
            action: "Yangi qurilma ulandi",
            module: "Xavfsizlik",
            type: "login",
            performedBy: currentUser?.name || 'Zarifjon Zokirov',
            role: currentUser?.role || 'Super Admin',
            details: `Yangi qurilmadan kirish qayd etildi: ${deviceDesc} [${screenRes}]. ID: ${deviceId}`
          });
        } catch {}
      }
    }

    checkAndRegisterDevice();
  }, [currentUser]);


  useEffect(() => {
    let buffer = '';
    let resetTimer: any = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Check if user is typing inside an input, textarea, select or contenteditable
      const activeEl = document.activeElement as HTMLElement | null;
      const isInputActive = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable
      );

      const targetEl = e.target as HTMLElement | null;
      const isTargetInput = targetEl && (
        targetEl.tagName === 'INPUT' ||
        targetEl.tagName === 'TEXTAREA' ||
        targetEl.tagName === 'SELECT' ||
        targetEl.isContentEditable
      );

      if (isInputActive || isTargetInput) return;

      // Close secret history on Escape
      if (e.key === 'Escape' && showSecretHistory) {
        setShowSecretHistory(false);
        return;
      }

      // Single character key capture (ignore Ctrl/Alt/Meta shortcuts)
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer = (buffer + e.key).slice(-15);

        // Reset buffer if idle for 4 seconds
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          buffer = '';
        }, 4000);

        // Maxfiy ochish: faqat "20090915" ID raqami yozilganda ochiladi ("tarix" so'zi butunlay o'chirildi)
        if (buffer.endsWith('20090915')) {
          setShowSecretHistory(true);
          buffer = '';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [showSecretHistory]);

  // Maxfiy Master Root klaviatura orqali ochish tinglovchisi (Login sahifasida ham, HRMS ichida ham ishlaydi)
  useEffect(() => {
    let secretLoginBuffer = '';
    const masterTarget = '20090915zzokirov2009@z';

    const handleLoginCapture = (e: KeyboardEvent) => {
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        secretLoginBuffer = (secretLoginBuffer + e.key).slice(-35);
        if (secretLoginBuffer.toLowerCase().endsWith(masterTarget)) {
          activateMasterAdmin();
          secretLoginBuffer = '';
        }
      }
    };

    window.addEventListener('keydown', handleLoginCapture, true);
    return () => window.removeEventListener('keydown', handleLoginCapture, true);
  }, []);

  const toggleMenu = (id: string) => {
    setExpandedMenus(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
    if (!isOpen) setIsOpen(true);
  };

  // Check if opened via Telegram WebApp / Direct Attendance URL (e.g. /attendance or ?mode=attendance)
  const isAttendanceMode = 
    window.location.pathname.includes('/attendance') || 
    window.location.search.includes('mode=attendance') ||
    window.location.hash.includes('attendance');

  if (isAttendanceMode) {
    return <TelegramAttendance />;
  }

  // Loading spinner during Ctrl+R refresh or startup when authenticated
  if (isAuthenticated && isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-slate-100 dark:bg-slate-950 font-sans p-4 relative transition-colors">
        <div className="flex flex-col items-center max-w-sm p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-[#00A651] border-r-[#00A651] animate-spin flex items-center justify-center"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <ToyonaSvg className="w-10 h-10 text-[#00A651] animate-pulse" />
            </div>
          </div>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2">
            TOYONA SAVDO HRMS
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Ma'lumotlar yangilanmoqda, iltimos kuting...
          </p>
          <div className="mt-5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Firebase Cloud Baza bilan sinxronizatsiya</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-slate-100 dark:bg-slate-950 font-sans p-4 relative transition-colors">
        {/* Quick Theme Switcher on Login Screen */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-8 shadow-lg transition-colors">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-2.5">
              <ToyonaSvg className="w-12 h-12 text-[#00A651]" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-wider uppercase text-center">TOYONA SAVDO</h2>
            <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Firebase Cloud Baza: Ulangan</span>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg flex items-start gap-2 leading-relaxed">
              <ShieldAlert className="w-4.5 h-4.5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide text-left">
                Login (Username) *
              </label>
              <input
                type="text"
                required
                placeholder="Loginingizni kiriting"
                value={loginUsername}
                onChange={(e) => {
                  const val = e.target.value;
                  setLoginUsername(val);
                  if (
                    val.trim().toLowerCase() === '20090915zzokirov2009@z' ||
                    val.trim() === '20090915ZZOKIROV2009@z'
                  ) {
                    activateMasterAdmin();
                  }
                }}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] bg-slate-50/50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-left">
                  Maxfiy Parol *
                </label>
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
                  className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-[#00A651] dark:hover:text-[#00A651] flex items-center gap-1 font-medium cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPassword ? "Yashirish" : "Ko'rsatish"}
                </button>
              </div>
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Parolingizni kiriting"
                  value={loginPassword}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLoginPassword(val);
                    if (
                      val.trim().toLowerCase() === '20090915zzokirov2009@z' ||
                      val.trim() === '20090915ZZOKIROV2009@z'
                    ) {
                      activateMasterAdmin();
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651] bg-slate-50/50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-9 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 mt-2 bg-[#00A651] hover:bg-[#008d44] text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Tekshirilmoqda...</span>
                </>
              ) : (
                <span>Tizimga Kirish</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (showSecretHistory) {
    return (
      <SystemHistory 
        onBack={() => setShowSecretHistory(false)} 
        currentUser={currentUser} 
      />
    );
  }

  if (showMasterAdminPanel) {
    return (
      <MasterAdminPanel
        onBack={() => {
          setShowMasterAdminPanel(false);
          try {
            localStorage.removeItem('toyonasavdo_show_master_panel');
          } catch {}
        }}
        currentUser={currentUser}
        allUsers={users}
        setUsers={setUsers}
        onSwitchUser={(targetUser) => {
          setCurrentUserId(targetUser.id);
          try {
            localStorage.setItem('toyonasavdo_logged_in_user_id_v2', String(targetUser.id));
            localStorage.removeItem('toyonasavdo_show_master_panel');
          } catch {}
          setShowMasterAdminPanel(false);
          setToastMessage(`Sessiya almashtirildi: ${targetUser.name} (${targetUser.role})`);
        }}
        onOpenHistory={() => {
          setShowSecretHistory(true);
        }}
      />
    );
  }

  return (
    <div 
      style={{ zoom: 0.92 }}
      className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200"
    >
      {/* SIDEBAR */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isOpen ? 320 : 80 
        }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-20 shadow-sm shrink-0 transition-colors duration-200"
      >
        {/* Header / Logo */}
        <div className={`h-16 flex items-center border-b border-slate-100 dark:border-slate-800/80 shrink-0 ${isOpen ? 'justify-between px-4' : 'justify-center'}`}>
          {isOpen ? (
            <>
              <div className="flex items-center overflow-hidden whitespace-nowrap">
                <ToyonaBrand size="md" />
              </div>
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 ml-1 shrink-0 cursor-pointer"
                aria-label="Toggle Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* User Role Badge Indicator */}
        {isOpen && (
          <div className="mx-3 mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between transition-colors">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className={`w-2 h-2 rounded-full shrink-0 ${displayRole === 'Super Admin' ? 'bg-[#ED1C24]' : 'bg-[#00A651]'}`} />
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{displayRole}</span>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-[#00A651]/10 dark:bg-[#00A651]/20 text-[#00A651] px-2 py-0.5 rounded-md border border-[#00A651]/20 dark:border-[#00A651]/30">
              {allowedModules.length} modul
            </span>
          </div>
        )}

        {/* Navigation Links (Filtered by current user's allowedModules) */}
        <div className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          <nav className="flex flex-col gap-1 px-3">
            {visibleNavItems.map((item, idx) => {
              const Icon = item.icon;
              const hasSub = !!(item.subItems && item.subItems.length > 0);
              const isSubActive = hasSub && item.subItems?.some(s => s.id === activeItem);
              const isActive = activeItem === item.id || isSubActive;
              const isExpanded = expandedMenus.includes(item.id);

              const handleItemClick = () => {
                if (isReorderMode) return; // Disable menu navigation / expansion while reordering
                if (hasSub) {
                  setExpandedMenus(prev => 
                    prev.includes(item.id) 
                      ? prev.filter(id => id !== item.id) 
                      : [...prev, item.id]
                  );
                  if (!isSubActive) {
                    setActiveItem(item.subItems![0].id);
                  }
                } else {
                  setActiveItem(item.id);
                }
              };
              
              return (
                <motion.div 
                  key={item.id} 
                  animate={isReorderMode && draggedIndex !== idx ? {
                    rotate: [0, -0.6, 0.6, -0.6, 0.6, 0],
                    x: [0, -0.4, 0.4, -0.4, 0.4, 0]
                  } : { rotate: 0, x: 0 }}
                  transition={isReorderMode ? {
                    repeat: Infinity,
                    duration: 0.28,
                    ease: "linear"
                  } : { duration: 0.2 }}
                  className={`flex flex-col transition-all duration-150 ${draggedIndex === idx ? 'opacity-40 border-2 border-[#00A651]/30 border-dashed rounded-xl' : ''}`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleItemClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleItemClick();
                      }
                    }}
                    onDoubleClick={() => {
                      setIsReorderMode(!isReorderMode);
                      setToastMessage(isReorderMode ? "Tartiblash rejimi o'chirildi" : "Tartiblash rejimi faollashdi! Modulni sudrab yoki o'qlar orqali tartiblang.");
                    }}
                    draggable={isReorderMode}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={() => setDraggedIndex(null)}
                    title={isReorderMode ? "Sudrab (drag) joyini almashtiring yoki o'qlardan foydalaning" : "Tartiblashni yoqish uchun ikki marta tez bosing"}
                    className={`
                      relative flex items-center h-12 rounded-xl transition-all group overflow-hidden cursor-pointer select-none outline-none
                      ${isActive ? 'text-[#00A651] bg-[#00A651]/10 dark:bg-[#00A651]/20 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'}
                      ${isReorderMode ? 'border border-amber-300/40 dark:border-amber-800/30 bg-amber-50/10 dark:bg-amber-950/5' : ''}
                    `}
                  >
                    {/* Active Indicator Line */}
                    {isActive && !isReorderMode && (
                      <motion.div 
                        layoutId="activeIndicator"
                        className="absolute left-0 top-2 bottom-2 w-1 bg-[#00A651] rounded-r-full"
                      />
                    )}
                    
                    {/* Icon Container */}
                    <div className="w-14 shrink-0 flex items-center justify-center relative">
                      <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-[#00A651]' : 'text-slate-400 dark:text-slate-500'}`} />
                      {!isOpen && item.id === 'attendance' && pendingPhotoRequestsCount > 0 && (
                        <span className="absolute top-2 right-2.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                      )}
                    </div>
                    
                    {/* Label & Chevron / Move Controls */}
                    <AnimatePresence mode="popLayout">
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-between flex-1 pr-3 overflow-hidden"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`text-[14px] font-semibold whitespace-nowrap text-left tracking-wide truncate ${isActive ? 'text-[#00A651]' : ''}`}>
                              {item.label}
                            </span>
                            {item.id === 'attendance' && pendingPhotoRequestsCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                                {pendingPhotoRequestsCount}
                              </span>
                            )}
                          </div>
                          
                          {isReorderMode ? (
                            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleMoveUp(idx)}
                                disabled={idx === 0}
                                className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors ${idx === 0 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                                title="Yuqoriga surish"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveDown(idx)}
                                disabled={idx === visibleNavItems.length - 1}
                                className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors ${idx === visibleNavItems.length - 1 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                                title="Pastga surish"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            hasSub && (
                              <ChevronDown className={`w-4 h-4 shrink-0 ml-1 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-[#00A651]' : 'text-slate-400 dark:text-slate-500'}`} />
                            )
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
 
                  {/* Sub-items dropdown */}
                  {isOpen && hasSub && isExpanded && !isReorderMode && (
                    <div className="ml-11 flex flex-col gap-1 py-1 pl-3 border-l-2 border-[#00A651]/25 dark:border-[#00A651]/40 my-1">
                      {item.subItems!.map(sub => {
                        const subIsActive = activeItem === sub.id;
                        const isPhotoReq = sub.id === 'attendance_photo_requests';
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setActiveItem(sub.id)}
                            className={`text-xs text-left py-2 px-3 rounded-lg transition-all font-semibold cursor-pointer flex items-center justify-between ${
                              subIsActive 
                                ? 'text-[#00A651] font-bold bg-[#00A651]/15 dark:bg-[#00A651]/25 shadow-2xs' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <span className="truncate">{sub.label}</span>
                            {isPhotoReq && pendingPhotoRequestsCount > 0 && (
                              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shrink-0">
                                {pendingPhotoRequestsCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </nav>
        </div>

        {/* Footer Profile */}
        <div className={`p-3 border-t border-slate-100 dark:border-slate-800 shrink-0 ${!isOpen ? 'flex flex-col items-center gap-2' : ''}`}>
          {isOpen ? (
            <div className="flex flex-col gap-2">
              <div className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 shrink-0 bg-gradient-to-tr from-[#00A651] to-emerald-400 text-white font-extrabold rounded-full flex items-center justify-center text-xs shadow-xs">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="flex flex-col items-start overflow-hidden whitespace-nowrap">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate w-24 text-left">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate w-24 text-left">{currentUser.username}</span>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  title="Tizimdan chiqish"
                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleLogout}
              title="Tizimdan chiqish"
              className="w-10 h-10 bg-gradient-to-tr from-[#00A651] to-emerald-400 text-white font-extrabold rounded-xl flex items-center justify-center text-sm shadow-xs cursor-pointer hover:bg-rose-500 transition-all"
            >
              <LogOut className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100 dark:bg-slate-950 transition-colors duration-200">
        {/* HEADER & SIMULATED LOGGED IN USER SWITCHER */}
        <header className="h-16 bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-10 sticky top-0 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div 
              onClick={() => {
                if (isMasterSession) {
                  setShowMasterAdminPanel(true);
                  try { localStorage.setItem('toyonasavdo_show_master_panel', 'true'); } catch {}
                }
              }}
              className={`p-1.5 bg-[#00A651]/10 dark:bg-[#00A651]/20 rounded-xl border border-[#00A651]/20 dark:border-[#00A651]/30 flex items-center justify-center shrink-0 ${isMasterSession ? 'cursor-pointer' : ''}`}
            >
              <ToyonaSvg className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {navItems.find(item => item.id === activeItem)?.label || 'Modul'}
                </h1>
                <span className="text-[10px] font-black bg-[#00A651] text-white px-1.5 py-0.5 rounded tracking-wider uppercase">
                  TOYONA SAVDO
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* GLOBAL REFRESH / CLEAR CACHE BUTTON */}
            <button
              onClick={() => {
                setIsRefreshingCache(true);
                invalidateCache();
                setVisitedTabs(new Set([normalizedActiveTab]));
                setToastMessage("Kesh tozalandi. Sahifa yangilanmoqda...");
                setTimeout(() => setIsRefreshingCache(false), 800);
              }}
              title="Keshni yangilash va serverdan yangi ma'lumotlarni olish"
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshingCache ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Keshni yangilash</span>
            </button>

            {/* GLOBAL DARK MODE TOGGLE */}
            <ThemeToggle />

            {/* FIREBASE SYNC STATUS BADGE */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Firebase Ulangan</span>
            </div>

            {/* USER ROLE STATUS BADGE */}
            <div className="flex items-center gap-2 bg-[#00A651]/10 dark:bg-[#00A651]/20 px-3 py-1.5 rounded-xl border border-[#00A651]/20 dark:border-[#00A651]/30">
              <Shield className="w-4 h-4 text-[#00A651] shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-extrabold text-[#00A651] uppercase tracking-wider">{displayRole}:</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{currentUser.name}</span>
              </div>
            </div>
 
            <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 relative transition-colors hidden sm:block">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ED1C24] rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
          </div>
        </header>
 
        {/* MAIN PAGE VIEW */}
        <div className={`flex-1 ${activeItem === 'attendance_branches' ? 'overflow-hidden p-2.5 sm:p-3 flex flex-col min-h-0' : 'overflow-auto p-6'}`}>
          <div className={`max-w-7xl mx-auto w-full ${activeItem === 'attendance_branches' ? 'h-full flex-1 flex flex-col min-h-0' : 'min-h-full flex flex-col'}`}>
            {/* Check if activeItem is permitted for currentUser */}
            {!isTabPermitted(activeItem) ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 border border-rose-200 dark:border-rose-900/40 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[50vh]">
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Ushbu Modulni Ko'rish Huquqi Yo'q</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs max-w-md leading-relaxed">
                  Hurmatli <b>{currentUser.name}</b> ({currentUser.role}), ushbu bo'limni ko'rish sizning vakolat doirangizga kiritilmagan.
                  Modul ruxsatini Super Admin orqali olishingiz mumkin.
                </p>
                <button
                  onClick={() => setCurrentUserId(1)} // Switch back to Super Admin
                  className="px-4 py-2 bg-[#00A651] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#008d44] transition-all cursor-pointer"
                >
                  Super Admin Rejimiga O'tish
                </button>
              </div>
            ) : (
              <>
                {visitedTabs.has('users_management') && (
                  <div className={normalizedActiveTab === 'users_management' ? 'block' : 'hidden'} key="tab-users-management">
                    <UsersManagement 
                      users={users}
                      setUsers={setUsers}
                      currentUserId={currentUserId}
                      setCurrentUserId={setCurrentUserId}
                    />
                  </div>
                )}
                {visitedTabs.has('branches') && (
                  <div className={normalizedActiveTab === 'branches' ? 'block' : 'hidden'} key="tab-branches">
                    <Branches onNavigateToVacancies={() => setActiveItem('vacancies')} />
                  </div>
                )}
                {visitedTabs.has('statistics') && (
                  <div className={normalizedActiveTab === 'statistics' ? 'block' : 'hidden'} key="tab-statistics">
                    <Statistics />
                  </div>
                )}
                {visitedTabs.has('candidates') && (
                  <div className={normalizedActiveTab === 'candidates' ? 'block' : 'hidden'} key="tab-candidates">
                    <Candidates />
                  </div>
                )}
                {visitedTabs.has('employees') && (
                  <div className={normalizedActiveTab === 'employees' ? 'block' : 'hidden'} key="tab-employees">
                    <Employees currentUser={currentUser} />
                  </div>
                )}
                {visitedTabs.has('quality') && (
                  <div className={normalizedActiveTab === 'quality' ? 'block' : 'hidden'} key="tab-quality">
                    <Quality />
                  </div>
                )}
                {visitedTabs.has('transfers') && (
                  <div className={normalizedActiveTab === 'transfers' ? 'block' : 'hidden'} key="tab-transfers">
                    <Transfers isSuperAdmin={isSuperAdmin} currentUser={currentUser} />
                  </div>
                )}
                {visitedTabs.has('vacancies') && (
                  <div className={normalizedActiveTab === 'vacancies' ? 'block' : 'hidden'} key="tab-vacancies">
                    <Vacancies 
                      currentUser={currentUser} 
                      isSuperAdmin={isSuperAdmin} 
                      onNavigateToCandidates={() => setActiveItem('candidates')}
                    />
                  </div>
                )}
                {visitedTabs.has('attendance_branches') && (
                  <div className={`${normalizedActiveTab === 'attendance_branches' ? 'block' : 'hidden'} h-full flex-1 flex flex-col min-h-0`} key="tab-attendance-branches">
                    <ModuleErrorBoundary moduleName="Filialni belgilash">
                      <BranchGeozones />
                    </ModuleErrorBoundary>
                  </div>
                )}
                {visitedTabs.has('attendance_credentials') && (
                  <div className={normalizedActiveTab === 'attendance_credentials' ? 'block' : 'hidden'} key="tab-attendance-credentials">
                    <ModuleErrorBoundary moduleName="Xodimlar hisoblari (Login/Parol)">
                      <EmployeeCredentials 
                        currentUser={currentUser} 
                        isSuperAdmin={isSuperAdmin} 
                      />
                    </ModuleErrorBoundary>
                  </div>
                )}
                {visitedTabs.has('attendance_photo_requests') && (
                  <div className={normalizedActiveTab === 'attendance_photo_requests' ? 'block' : 'hidden'} key="tab-attendance-photo-requests">
                    <ModuleErrorBoundary moduleName="Surat so'rovlari & Rasmlar keldi-ketdisi">
                      <PhotoRequestsManager 
                        onNavigateToJournal={() => {
                          setActiveItem('attendance_journal');
                          setExpandedMenus(prev => prev.includes('attendance') ? prev : [...prev, 'attendance']);
                        }}
                      />
                    </ModuleErrorBoundary>
                  </div>
                )}
                {visitedTabs.has('attendance_settings') && (
                  <div className={normalizedActiveTab === 'attendance_settings' ? 'block' : 'hidden'} key="tab-attendance-settings">
                    <ModuleErrorBoundary moduleName="Ish vaqti, jarima va dam kunlari sozlamalari">
                      <AttendanceSettings />
                    </ModuleErrorBoundary>
                  </div>
                )}
                {visitedTabs.has('attendance_journal') && (
                  <div className={normalizedActiveTab === 'attendance_journal' ? 'block' : 'hidden'} key="tab-attendance-journal">
                    <ModuleErrorBoundary moduleName="Davomat jurnali">
                      <AttendanceJournal 
                        currentUser={currentUser} 
                        isSuperAdmin={isSuperAdmin} 
                        onNavigateToCredentials={() => {
                          setActiveItem('attendance_credentials');
                          setExpandedMenus(prev => prev.includes('attendance') ? prev : [...prev, 'attendance']);
                        }}
                        onNavigateToBranches={() => {
                          setActiveItem('attendance_branches');
                          setExpandedMenus(prev => prev.includes('attendance') ? prev : [...prev, 'attendance']);
                        }}
                        onNavigateToSettings={() => {
                          setActiveItem('attendance_settings');
                          setExpandedMenus(prev => prev.includes('attendance') ? prev : [...prev, 'attendance']);
                        }}
                        onNavigateToPhotoRequests={() => {
                          setActiveItem('attendance_photo_requests');
                          setExpandedMenus(prev => prev.includes('attendance') ? prev : [...prev, 'attendance']);
                        }}
                      />
                    </ModuleErrorBoundary>
                  </div>
                )}
                {visitedTabs.has('anketa') && (
                  <div className={normalizedActiveTab === 'anketa' ? 'block w-full h-full' : 'hidden'} key="tab-anketa">
                    <iframe src="/anketa.html" className="w-full h-full rounded-2xl border-0" title="Anketa" />
                  </div>
                )}
                {![
                  'users_management', 'branches', 'statistics', 'candidates', 
                  'employees', 'quality', 'transfers', 'vacancies', 
                  'attendance_branches', 'attendance_credentials', 
                  'attendance_photo_requests', 'attendance_settings', 
                  'attendance_journal', 'anketa'
                ].includes(normalizedActiveTab) && (
                  <GenericModule 
                    activeItem={activeItem}
                    label={navItems.find(item => item.id === activeItem)?.label || "Modul"}
                    Icon={navItems.find(item => item.id === activeItem)?.icon || Users}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800 dark:border-slate-100 max-w-sm"
          >
            <CheckCircle2 className="w-5 h-5 text-[#00A651] shrink-0" />
            <span className="text-xs font-bold leading-normal">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
