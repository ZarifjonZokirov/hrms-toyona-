import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Shield, Key, Plus, Search, Edit2, Trash2, CheckCircle2, X, Lock, 
  UserCheck, ShieldAlert, Check, Building, Mail, Phone, RefreshCw, Eye, EyeOff, Copy, Sparkles,
  SlidersHorizontal, CheckSquare, Square, Layers, User, Filter, ArrowRight, Save
} from 'lucide-react';
import { ModuleHeaderLogo, ToyonaBrand, ToyonaSvg } from './Logo';
import { exportToExcel, exportToPDF } from '../lib/export';
import { ExportButtons } from './ExportButtons';
import { saveFirebaseUser, deleteFirebaseUser, syncUserPasswordInBothCollections } from '../firebase';

export interface UserItem {
  id: number;
  name: string;
  username: string;
  password?: string;
  email: string;
  role: string;
  branch: string;
  status?: string;
  lastActive: string;
  allowedModules: string[];
}

export interface RoleItem {
  id: number;
  name: string;
  description: string;
  usersCount: number;
  color: string;
  defaultModules: string[];
}

export interface ModulePermission {
  moduleId: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export const ALL_MODULE_DEFS = [
  { id: 'users_management', label: 'Foydalanuvchilar Boshqaruvi', desc: 'Tizim foydalanuvchilari, rollar va kirish huquqlarini nazorat qilish', cat: 'Ma\'muriy' },
  { id: 'branches', label: 'Filiallar', desc: 'Kompaniya filiallari va hududiy bo\'limlar ro\'yxati', cat: 'Tuzilma' },
  { id: 'statistics', label: 'Statistika', desc: 'Karyera, nomzodlar va HR tahlil hisobotlari', cat: 'Analitika' },
  { id: 'candidates', label: 'Nomzodlar', desc: 'Arizalar, nomzodlar ro\'yxati va suhbatlar', cat: 'Rekruting' },
  { id: 'transfers', label: 'O\'tkazmalar', desc: 'Xodimlarni lavozimdan lavozimga o\'tkazish va buyruqlar', cat: 'Kadrlar' },
  { id: 'vacancies', label: 'Bo\'sh ish o\'rinlari', desc: 'Filiallardagi vakansiyalar va talablar', cat: 'Rekruting' },
  { id: 'employees', label: 'Xodimlar', desc: 'Mavjud xodimlar bazasi va ma\'lumotlari', cat: 'Kadrlar' },
  { id: 'quality', label: 'Sifat tarkibi', desc: 'Kadrlar tarkibi sifati va baholash ko\'rsatkichlari', cat: 'Analitika' },
  { id: 'attendance', label: 'Davomat va kechikishlar', desc: 'Xodimlar kunlik davomati, kelib-ketish vaqtlari va kechikishlar hisoboti', cat: 'Kadrlar' },
  { id: 'attendance_settings', label: 'Ish vaqti, jarima & dam kunlari', desc: 'Ish vaqti, daqiqa/soatlik kechikish jarimasi va dam olish kunlarini boshqarish', cat: 'Kadrlar' },
];

export const ALL_BRANCHES = [
  'Bosh Idora',
  'Turkiston filiali',
  'Navoiy filiali',
  'Istiqlol (Gorod) filiali',
  'Mingtut filiali',
  'Yakkatut filiali',
  'Pop filiali',
  'Furqat filiali',
  'Buvayda filiali',
  'Yangiqo\'rg\'on filiali',
  'Yaypan filiali',
  'Marg\'ilon filiali',
  'Toshkent Chilonzor filiali'
];

export const INITIAL_USERS_DATA: UserItem[] = [
  { 
    id: 1, 
    name: 'Zarifjon Zokirov', 
    username: '20090915', 
    password: 'ZZOKIROV2009@z', 
    email: 'zarifjon@toyonasavdo.uz', 
    role: 'Super Admin', 
    branch: 'Bosh Idora', 
    lastActive: 'Hozir',
    allowedModules: ALL_MODULE_DEFS.map(m => m.id)
  }
];

export const INITIAL_ROLES_DATA: RoleItem[] = [
  { id: 1, name: 'Super Admin', description: 'Tizim bo\'yicha to\'liq cheksiz huquqlar va modul nazorati', usersCount: 1, color: 'bg-[#ED1C24]', defaultModules: ALL_MODULE_DEFS.map(m => m.id) },
  { id: 2, name: 'HR Menejer', description: 'Nomzodlar, anketalar va xodimlarni boshqarish huquqi', usersCount: 0, color: 'bg-[#00A651]', defaultModules: ['branches', 'candidates', 'vacancies', 'employees', 'quality', 'attendance', 'transfers'] },
  { id: 3, name: 'Filial Mudiri', description: 'O\'z filialidagi bo\'sh o\'rinlar va nomzodlarni ko\'rish', usersCount: 0, color: 'bg-blue-500', defaultModules: ['branches', 'candidates', 'vacancies', 'employees', 'attendance'] },
  { id: 4, name: 'Recruiter', description: 'Suhbatlar o\'tkazish va nomzodlar statusini o\'zgartirish', usersCount: 0, color: 'bg-amber-500', defaultModules: ['candidates', 'vacancies'] },
  { id: 5, name: 'Operator', description: 'Anketalarni kiritish va ko\'rish huquqi', usersCount: 0, color: 'bg-indigo-500', defaultModules: ['candidates'] },
];

// Helper to create initial default permission set for a role
const createDefaultPermissionsForRole = (roleName: string, allowedIds: string[]): ModulePermission[] => {
  return ALL_MODULE_DEFS.map(mod => {
    const isAllowed = allowedIds.includes(mod.id);
    const isSuper = roleName === 'Super Admin';
    return {
      moduleId: mod.id,
      view: isSuper ? true : isAllowed,
      create: isSuper ? true : isAllowed,
      edit: isSuper ? true : isAllowed,
      delete: isSuper ? true : false
    };
  });
};

interface UsersManagementProps {
  users?: UserItem[];
  setUsers?: React.Dispatch<React.SetStateAction<UserItem[]>>;
  currentUserId?: number;
  setCurrentUserId?: (id: number) => void;
}

export default function UsersManagement({ 
  users: externalUsers,
  setUsers: externalSetUsers,
  currentUserId = 1,
  setCurrentUserId
}: UsersManagementProps) {
  // Users state
  const [localUsers, setLocalUsers] = useState<UserItem[]>(INITIAL_USERS_DATA);
  const users = externalUsers || localUsers;
  const setUsers = externalSetUsers || setLocalUsers;

  // Roles reference list
  const [roles] = useState<RoleItem[]>(INITIAL_ROLES_DATA);

  // Filters state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('Barchasi');
  const [branchFilter, setBranchFilter] = useState<string>('Barchasi');

  // Modals state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUserForCreds, setSelectedUserForCreds] = useState<UserItem | null>(null);
  const [selectedUserForModules, setSelectedUserForModules] = useState<UserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);

  // Add User Form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('HR Menejer');
  const [newUserBranch, setNewUserBranch] = useState('Bosh Idora');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newUserModules, setNewUserModules] = useState<string[]>(['branches', 'candidates', 'vacancies', 'employees', 'quality']);

  // Edit User Modules temp state
  const [tempUserModules, setTempUserModules] = useState<string[]>([]);

  // Edit Credentials temp state
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const newUserPassRef = useRef<HTMLInputElement>(null);
  const editUserPassRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let pass = "Toyona#2026!";
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // When Add User role dropdown changes, automatically sync default modules for that role
  const handleUserRoleChange = (selectedRole: string) => {
    setNewUserRole(selectedRole);
    const matchedRole = roles.find(r => r.name === selectedRole);
    if (matchedRole) {
      setNewUserModules([...matchedRole.defaultModules]);
    }
  };

  // Submit Add User
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showToast("Iltimos, Ism va Email maydonlarini to'ldiring!");
      return;
    }

    const username = newUserUsername.trim() || newUserName.toLowerCase().trim().replace(/\s+/g, '_') + '_ts';
    const password = newUserPassword.trim() || generatePassword();

    const newUser: UserItem = {
      id: Date.now(),
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      branch: newUserBranch,
      username: username,
      password: password,
      lastActive: 'Hozir',
      allowedModules: newUserModules.length > 0 ? newUserModules : ['candidates', 'vacancies']
    };

    setUsers([newUser, ...users]);
    saveFirebaseUser(newUser).catch(() => {});

    // Reset Form
    setNewUserName('');
    setNewUserEmail('');
    setNewUserUsername('');
    setNewUserPassword('');
    setShowAddUserModal(false);

    showToast(`Yangi foydalanuvchi (${newUser.name}) muvaffaqiyatli qo'shildi! (${newUser.role})`);
  };

  // Open credentials edit modal
  const handleOpenCredsModal = (u: UserItem) => {
    setSelectedUserForCreds(u);
    setEditUsername(u.username || u.email.split('@')[0]);
    setEditPassword(u.password || '');
    setShowEditPassword(false);
  };

  // Save credentials
  const handleSaveCreds = () => {
    if (!selectedUserForCreds) return;
    const updatedUser = {
      ...selectedUserForCreds,
      username: editUsername,
      password: editPassword
    };
    setUsers(users.map(u => u.id === selectedUserForCreds.id ? updatedUser : u));
    saveFirebaseUser(updatedUser).catch(() => {});
    syncUserPasswordInBothCollections(editUsername, editPassword).catch(() => {});
    setSelectedUserForCreds(null);
    showToast(`"${selectedUserForCreds.name}" uchun Login va Parol yangilandi!`);
  };

  // Open modules per user modal
  const handleOpenModuleControl = (u: UserItem) => {
    setSelectedUserForModules(u);
    if (u.role === 'Super Admin' || u.id === 1) {
      setTempUserModules(ALL_MODULE_DEFS.map(m => m.id));
    } else {
      setTempUserModules([...(u.allowedModules || [])]);
    }
  };

  // Toggle user module access
  const toggleUserModuleAccess = (modId: string) => {
    if (selectedUserForModules?.role === 'Super Admin' || selectedUserForModules?.id === 1) {
      showToast("Super Admin uchun barcha modullar har doim ochiq bo'ladi!");
      return;
    }
    if (tempUserModules.includes(modId)) {
      setTempUserModules(tempUserModules.filter(m => m !== modId));
    } else {
      setTempUserModules([...tempUserModules, modId]);
    }
  };

  // Save per-user modules
  const handleSaveUserModules = () => {
    if (!selectedUserForModules) return;

    const updatedUser = {
      ...selectedUserForModules,
      allowedModules: tempUserModules
    };

    setUsers(users.map(u => u.id === selectedUserForModules.id ? updatedUser : u));
    saveFirebaseUser(updatedUser).catch(() => {});

    showToast(`"${selectedUserForModules.name}" uchun ruxsat berilgan modullar saqlandi (${tempUserModules.length} ta)!`);
    setSelectedUserForModules(null);
  };

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} nusxalandi!`);
  };

  // Delete user
  const requestDeleteUser = (u: UserItem) => {
    if (u.role === 'Super Admin' || u.id === 1) {
      showToast('Super Admin o\'chirilishi mumkin emas!');
      return;
    }
    setUserToDelete(u);
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    deleteFirebaseUser(userToDelete.id).catch(() => {});
    setUsers(users.filter(u => u.id !== userToDelete.id));
    showToast(`Foydalanuvchi "${userToDelete.name}" o'chirildi`);
    setUserToDelete(null);
  };

  // Filtered Users with strict deduplication
  const filteredUsers = useMemo(() => {
    const q = (userSearchQuery || '').toLowerCase().trim();
    const map = new Map<string, UserItem>();

    users.forEach((u, idx) => {
      if (!u) return;
      const idKey = String(u.id ?? (u as any).firestoreId ?? '').trim();
      const usernameKey = (u.username || '').toLowerCase().trim();

      let existingKey: string | null = null;
      for (const [k, existing] of map.entries()) {
        const existingId = String(existing.id ?? (existing as any).firestoreId ?? '').trim();
        const existingUsername = (existing.username || '').toLowerCase().trim();
        if ((idKey && existingId === idKey) || (usernameKey && existingUsername === usernameKey)) {
          existingKey = k;
          break;
        }
      }

      if (existingKey) {
        map.set(existingKey, { ...map.get(existingKey)!, ...u });
      } else {
        const key = idKey || usernameKey || `user_${idx}`;
        map.set(key, u);
      }
    });

    return Array.from(map.values()).filter(u => {
      const matchesSearch = !q ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q) ||
        (u.branch || '').toLowerCase().includes(q);

      const matchesRole = roleFilter === 'Barchasi' || u.role === roleFilter;
      const matchesBranch = branchFilter === 'Barchasi' || u.branch === branchFilter;

      return matchesSearch && matchesRole && matchesBranch;
    });
  }, [users, userSearchQuery, roleFilter, branchFilter]);

  const handleExportUsers = (type: 'excel' | 'pdf') => {
    const fileName = `Toyona_Foydalanuvchilar_${new Date().toISOString().slice(0, 10)}`;
    const headers = ['№', 'F.I.O', 'Login (Username)', 'Email', 'Rol', 'Filial', 'So\'nggi Faollik'];
    const data = filteredUsers.map((u, i) => [
      i + 1,
      u.name,
      u.username,
      u.email,
      u.role,
      u.branch,
      u.lastActive
    ]);

    if (type === 'excel') {
      const excelData = filteredUsers.map((u, i) => ({
        '№': i + 1,
        'F.I.O': u.name,
        'Login (Username)': u.username,
        'Email': u.email,
        'Rol': u.role,
        'Filial': u.branch,
        'So\'nggi Faollik': u.lastActive,
        'Ruxsat etilgan modullar': (u.allowedModules || []).join(', ')
      }));
      exportToExcel(excelData, fileName);
    } else {
      exportToPDF(headers, data, fileName, "Toyona Savdo - Foydalanuvchilar Ro'yxati");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 text-xs font-bold"
          >
            <CheckCircle2 className="w-5 h-5 text-[#00A651]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Logo & Title */}
      <ModuleHeaderLogo 
        title="Foydalanuvchilar Boshqaruvi" 
        icon={Users} 
      />

      {/* Top Bar with Count & Add Button */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-extrabold rounded-xl border border-slate-200">
            Jami foydalanuvchilar: <span className="text-[#00A651]">{users.length} ta</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Excel va PDF Yuklab olish */}
          <ExportButtons 
            onExportExcel={() => handleExportUsers('excel')}
            onExportPDF={() => handleExportUsers('pdf')}
          />

          <ToyonaBrand size="sm" />

          <button
            onClick={() => {
              const autoPass = generatePassword();
              setNewUserPassword(autoPass);
              const defaultRole = roles[1]?.name || 'HR Menejer';
              handleUserRoleChange(defaultRole);
              setShowAddUserModal(true);
            }}
            className="flex items-center gap-2 bg-[#00A651] hover:bg-[#008d44] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#00A651]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Foydalanuvchi Qo'shish</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Filter and Search Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ism, login, email bo'yicha qidirish..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
              />
            </div>

            {/* Filter by Role */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-xl text-xs">
              <Filter className="w-4 h-4 text-[#00A651] shrink-0" />
              <span className="text-slate-500 font-medium">Rol:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer w-full"
              >
                <option value="Barchasi">Barcha Rollar</option>
                {roles.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Filter by Branch */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-xl text-xs">
              <Building className="w-4 h-4 text-[#00A651] shrink-0" />
              <span className="text-slate-500 font-medium">Filial:</span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer w-full"
              >
                <option value="Barchasi">Barcha Filiallar</option>
                {ALL_BRANCHES.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(roleFilter !== 'Barchasi' || branchFilter !== 'Barchasi' || userSearchQuery) && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold">Saralash:</span>
              {roleFilter !== 'Barchasi' && (
                <span className="px-2.5 py-1 bg-emerald-50 text-[#00A651] border border-emerald-200 font-bold rounded-lg flex items-center gap-1.5">
                  <span>Rol: {roleFilter}</span>
                  <button onClick={() => setRoleFilter('Barchasi')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                </span>
              )}
              {branchFilter !== 'Barchasi' && (
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-lg flex items-center gap-1.5">
                  <span>Filial: {branchFilter}</span>
                  <button onClick={() => setBranchFilter('Barchasi')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                </span>
              )}
              <button
                onClick={() => {
                  setRoleFilter('Barchasi');
                  setBranchFilter('Barchasi');
                  setUserSearchQuery('');
                }}
                className="text-xs text-rose-600 font-bold hover:underline ml-2"
              >
                Filtrni tozalash
              </button>
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Foydalanuvchi</th>
                  <th className="p-3.5">Login va Parol</th>
                  <th className="p-3.5">Rol va Filial</th>
                  <th className="p-3.5">Modullar Ruxsati</th>
                  <th className="p-3.5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                      Kiritilgan qidiruv mezoniga mos foydalanuvchi topilmadi.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, index) => {
                    const allowedCount = u.allowedModules ? u.allowedModules.length : 0;
                    const totalCount = ALL_MODULE_DEFS.length;
                    const isFullAccess = allowedCount === totalCount;
                    const roleBadgeColor = roles.find(r => r.name === u.role)?.color || 'bg-emerald-500';

                    return (
                      <tr key={`${u.id ?? (u as any).firestoreId ?? u.username ?? index}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00A651] to-emerald-400 text-white font-extrabold flex items-center justify-center text-xs shadow-xs shrink-0">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {u.role === 'Super Admin' && (
                                  <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
                                    SUPER ADMIN
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* LOGIN & PASSWORD */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5 font-mono text-[11px] text-slate-800 font-semibold">
                              <Lock className="w-3 h-3 text-[#00A651]" />
                              <span>{u.username}</span>
                            </div>
                            <button
                              onClick={() => handleOpenCredsModal(u)}
                              title="Login va Parolni ko'rish"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#00A651] border border-emerald-200 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Parol</span>
                            </button>
                          </div>
                        </td>

                        {/* ROLE & BRANCH */}
                        <td className="p-3.5">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                              <span className={`w-2 h-2 rounded-full ${roleBadgeColor}`}></span>
                              <span>{u.role}</span>
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-400" />
                              <span>{u.branch}</span>
                            </span>
                          </div>
                        </td>

                        {/* PER-USER MODULE ACCESS BADGE */}
                        <td className="p-3.5">
                          <button
                            onClick={() => handleOpenModuleControl(u)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                              isFullAccess 
                                ? 'bg-emerald-50 text-[#00A651] border-emerald-200 hover:bg-emerald-100' 
                                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>{allowedCount} / {totalCount} Modul Ochiq</span>
                          </button>
                        </td>

                        {/* ACTIONS */}
                        <td className="p-3.5 text-right space-x-1">
                          <button 
                            onClick={() => handleOpenModuleControl(u)}
                            title="Modullar Ko'rish Huquqini Sozlash"
                            className="p-1.5 bg-[#00A651]/10 hover:bg-[#00A651]/20 text-[#00A651] rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenCredsModal(u)}
                            title="Login & Parol"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => requestDeleteUser(u)}
                            title="O'chirish"
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT USER CREDENTIALS (LOGIN & PASSWORD) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedUserForCreds && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-[#00A651] rounded-xl border border-emerald-200">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      {selectedUserForCreds.name} - Kalit va Login
                    </h3>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUserForCreds(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tizim Logini (Username)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(editUsername, "Login")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#00A651]"
                      title="Nusxalash"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Maxfiy Parol</label>
                    <button
                      type="button"
                      onClick={() => setEditPassword(generatePassword())}
                      className="text-[11px] text-[#00A651] font-bold hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Avto yaratish</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      ref={editUserPassRef}
                      type={showEditPassword ? "text" : "password"}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-16 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowEditPassword(!showEditPassword);
                          setTimeout(() => {
                            editUserPassRef.current?.focus();
                          }, 0);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700"
                      >
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(editPassword, "Parol")}
                        className="p-1 text-slate-400 hover:text-[#00A651]"
                        title="Nusxalash"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForCreds(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleSaveCreds}
                  className="px-5 py-2 bg-[#00A651] hover:bg-[#008d44] text-white rounded-xl font-bold text-xs shadow-md shadow-[#00A651]/20"
                >
                  Saqlash
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT USER MODULES (PER-USER MODULE ACCESS CONTROL) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedUserForModules && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#00A651]/10 rounded-xl border border-[#00A651]/20">
                    <Shield className="w-6 h-6 text-[#00A651]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      {selectedUserForModules.name} - Modullar Ko'rish Huquqlari
                    </h3>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUserForModules(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Select */}
              <div className="flex items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shrink-0">
                <span className="text-xs font-bold text-slate-600">
                  Tanlangan: <span className="text-[#00A651] font-black">{tempUserModules.length}</span> / {ALL_MODULE_DEFS.length} modul
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTempUserModules(ALL_MODULE_DEFS.map(m => m.id))}
                    className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-[#00A651] rounded-lg text-xs font-bold transition-all"
                  >
                    Barchasini Ruxsat Berish
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempUserModules([])}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
                  >
                    Barchasini Yopish
                  </button>
                </div>
              </div>

              {/* Module Checklist */}
              <div className="overflow-y-auto flex-1 pr-1 space-y-2.5 my-2">
                {ALL_MODULE_DEFS.map((mod) => {
                  const isChecked = tempUserModules.includes(mod.id);
                  return (
                    <div 
                      key={mod.id}
                      onClick={() => toggleUserModuleAccess(mod.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked 
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-xs' 
                          : 'bg-white border-slate-200 hover:border-slate-300 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isChecked ? 'bg-[#00A651] text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <ToyonaSvg className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800">{mod.label}</span>
                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                              {mod.cat}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by parent click
                          className="w-5 h-5 accent-[#00A651] cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForModules(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveUserModules}
                    className="px-5 py-2 bg-[#00A651] hover:bg-[#008d44] text-white rounded-xl font-bold text-xs shadow-md shadow-[#00A651]/20 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Ruxsatlarni Saqlash</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: ADD USER MODAL (ROLLAR VARIANTI, ISM, FAMILIYA, LOGIN, PAROL...) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAddUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-[#00A651]/10 text-[#00A651] rounded-xl border border-[#00A651]/20">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Yangi Foydalanuvchi Qo'shish</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddUserModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                {/* 1. ROLE VARIANTI DROPDOWN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Foydalanuvchi Roli (Rollar Varianti) *
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => handleUserRoleChange(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 2. ISM FAMILIYA */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">To'liq Ism va Familiya *</label>
                    <input
                      type="text"
                      required
                      placeholder="Masalan: Sardor Alimov"
                      value={newUserName}
                      onChange={(e) => {
                        setNewUserName(e.target.value);
                        if (!newUserUsername) {
                          setNewUserUsername(e.target.value.toLowerCase().trim().replace(/\s+/g, '_') + '_ts');
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                    />
                  </div>

                  {/* 3. EMAIL */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Manzili *</label>
                    <input
                      type="email"
                      required
                      placeholder="sardor@toyonasavdo.uz"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 4. LOGIN (USERNAME) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Tizim Logini *</label>
                      <button
                        type="button"
                        onClick={() => setNewUserUsername((newUserName ? newUserName.toLowerCase().trim().replace(/\s+/g, '_') : 'user') + '_' + Math.floor(100 + Math.random()*900))}
                        className="text-[10px] text-[#00A651] font-bold hover:underline"
                      >
                        Avto Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="sardor_alimov_ts"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                    />
                  </div>

                  {/* 5. PAROL */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Maxfiy Parol *</label>
                      <button
                        type="button"
                        onClick={() => setNewUserPassword(generatePassword())}
                        className="text-[10px] text-[#00A651] font-bold hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Generatsiya</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        ref={newUserPassRef}
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Parol kiritish..."
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                      />
                      <button
                        type="button"
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          setShowPassword(!showPassword); 
                          setTimeout(() => {
                            newUserPassRef.current?.focus();
                          }, 0);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6. FILIAL SELECT */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Biriktirilgan Filial *</label>
                  <select
                    value={newUserBranch}
                    onChange={(e) => setNewUserBranch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                  >
                    {ALL_BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* 7. MODULE CHECKLIST FOR THIS USER */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-slate-800">
                      Ruxsat Beriladigan Modullar ({newUserModules.length} / {ALL_MODULE_DEFS.length})
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewUserModules(ALL_MODULE_DEFS.map(m => m.id))}
                        className="text-[11px] text-[#00A651] font-bold hover:underline"
                      >
                        Hamma modulni tanlash
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {ALL_MODULE_DEFS.map(mod => {
                      const isChecked = newUserModules.includes(mod.id);
                      return (
                        <label
                          key={mod.id}
                          className={`p-2 rounded-lg border text-xs font-semibold cursor-pointer flex items-center justify-between transition-all ${
                            isChecked ? 'bg-white border-[#00A651] text-[#00A651] shadow-xs' : 'bg-white border-slate-200 text-slate-600 opacity-70'
                          }`}
                        >
                          <span className="truncate">{mod.label}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewUserModules([...newUserModules, mod.id]);
                              } else {
                                setNewUserModules(newUserModules.filter(m => m !== mod.id));
                              }
                            }}
                            className="w-4 h-4 accent-[#00A651] cursor-pointer"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#00A651] hover:bg-[#008d44] text-white rounded-xl font-bold text-xs shadow-md shadow-[#00A651]/20 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Foydalanuvchini Saqlash</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION CARD IN THE CENTER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 text-center space-y-4 relative"
            >
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">
                  Rostdan ham o'chirilsinmi?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ushbu foydalanuvchi akkauntini o'chirib tashlamoqchimisiz? Tizimga kirish huquqlari bekor qilinadi.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-left text-xs font-semibold text-slate-700">
                <div className="font-bold text-slate-800">{userToDelete.name}</div>
                <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                  {userToDelete.role} • {userToDelete.branch}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Login: <span className="font-mono text-slate-700">{userToDelete.username || userToDelete.email}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteUser}
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
