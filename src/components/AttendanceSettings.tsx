import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, Calendar, AlertTriangle, CheckCircle2, Save, 
  HelpCircle, RefreshCw, Sun, Moon, Coffee, ShieldAlert,
  Percent, DollarSign, ArrowRight, Search, Filter, Download, 
  User, Building2, Check, X, ShieldCheck, FileSpreadsheet, 
  AlertCircle, FileText, ChevronDown, Undo2, Award, Info,
  UserX, UserCheck
} from 'lucide-react';
import { ModuleHeaderLogo, ToyonaBrand } from './Logo';
import { 
  getFirebaseAttendance, 
  saveFirebaseAttendance, 
  updateAttendanceWithAudit,
  getFirebaseEmployees,
  getFirebaseDismissedEmployees,
  getFirebaseBranches,
  getFirebaseGeozones,
  getFirebasePenaltySettings,
  saveFirebasePenaltySettings
} from '../firebase';
import { exportToExcel, exportToPDF } from '../lib/export';
import { ExportButtons } from './ExportButtons';
import { DEFAULT_GEOZONES } from './BranchGeozones';
import { BRANCHES_LIST } from './Candidates';

export interface PenaltyRecord {
  id: string;
  date: string; // YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  branch: string;
  department?: string;
  position?: string;
  checkIn: string;
  scheduledTime: string;
  delayMinutes: number;
  penaltyAmount: number;
  penaltyFormatted: string;
  isWaived: boolean;
  waivedReason?: string;
  waivedBy?: string;
  waivedAt?: string;
  status: string;
  notes?: string;
  isDismissed?: boolean;
}

interface AttendanceSettingsProps {
  currentUser?: any;
  isSuperAdmin?: boolean;
}

const WAIVER_REASONS = [
  "Rahbar topshirig'i (Ombor / Boshqa filialda bo'lgan)",
  "Transport tirbandligi / Yo'l harakati favqulodda to'xtashi",
  "Salomatlik / Shifokor qabuli (Ma'lumotnoma asosida)",
  "Texnik / Face ID yoki internet nosozligi",
  "Boshqa uzrli sabab"
];

export default function AttendanceSettings({ currentUser, isSuperAdmin }: AttendanceSettingsProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'penalties' | 'settings'>('penalties');

  // ==========================================
  // 1. SETTINGS STATE (Ish vaqti & Stavka)
  // ==========================================
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('18:00');
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number | string>(15);
  const [penaltyType, setPenaltyType] = useState<'minute' | 'hour'>('minute');
  const [penaltyRate, setPenaltyRate] = useState<number | string>(1000);
  const [restDays, setRestDays] = useState<number[]>([0]); // 0: Yakshanba
  const [customHolidays, setCustomHolidays] = useState<string[]>([]);
  const [newHolidayInput, setNewHolidayInput] = useState('');
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // ==========================================
  // 2. PENALTIES MONITORING STATE
  // ==========================================
  const [penalties, setPenalties] = useState<PenaltyRecord[]>([]);
  const [isLoadingPenalties, setIsLoadingPenalties] = useState(true);
  const [allBranches, setAllBranches] = useState<string[]>(BRANCHES_LIST);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'waived'>('all');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'all' | 'active' | 'dismissed'>('all');

  // Waiver Modal state
  const [waivingRecord, setWaivingRecord] = useState<PenaltyRecord | null>(null);
  const [waiverReasonCategory, setWaiverReasonCategory] = useState(WAIVER_REASONS[0]);
  const [waiverComment, setWaiverComment] = useState('');
  const [isSubmittingWaiver, setIsSubmittingWaiver] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const daysOfWeek = [
    { id: 1, label: 'Dushanba' },
    { id: 2, label: 'Seshanba' },
    { id: 3, label: 'Chorshanba' },
    { id: 4, label: 'Payshanba' },
    { id: 5, label: 'Juma' },
    { id: 6, label: 'Shanba' },
    { id: 0, label: 'Yakshanba' },
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ------------------------------------------
  // Load Settings from API & Firebase
  // ------------------------------------------
  const loadSettings = async () => {
    setIsLoadingSettings(true);
    try {
      let loaded = false;
      try {
        const res = await fetch('/api/attendance/penalty-settings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings) {
            const s = data.settings;
            if (s.workStartTime) setWorkStartTime(s.workStartTime);
            if (s.workEndTime) setWorkEndTime(s.workEndTime);
            if (s.gracePeriodMinutes !== undefined) setGracePeriodMinutes(s.gracePeriodMinutes);
            if (s.penaltyType) setPenaltyType(s.penaltyType);
            if (s.penaltyRate !== undefined) setPenaltyRate(s.penaltyRate);
            if (Array.isArray(s.restDays)) setRestDays(s.restDays);
            if (Array.isArray(s.customHolidays)) setCustomHolidays(s.customHolidays);
            loaded = true;
          }
        }
      } catch {}

      if (!loaded) {
        // Fallback to Firestore directly
        const fbSettings = await getFirebasePenaltySettings();
        if (fbSettings) {
          if (fbSettings.workStartTime) setWorkStartTime(fbSettings.workStartTime);
          if (fbSettings.workEndTime) setWorkEndTime(fbSettings.workEndTime);
          if (fbSettings.gracePeriodMinutes !== undefined) setGracePeriodMinutes(fbSettings.gracePeriodMinutes);
          if (fbSettings.penaltyType) setPenaltyType(fbSettings.penaltyType);
          if (fbSettings.penaltyRate !== undefined) setPenaltyRate(fbSettings.penaltyRate);
          if (Array.isArray(fbSettings.restDays)) setRestDays(fbSettings.restDays);
          if (Array.isArray(fbSettings.customHolidays)) setCustomHolidays(fbSettings.customHolidays);
        }
      }
    } catch (err) {
      console.warn('Sozlamalarni yuklab bo\'lmadi:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // ------------------------------------------
  // Load Penalties from Firebase & API
  // ------------------------------------------
  const loadPenaltiesData = async () => {
    setIsLoadingPenalties(true);
    try {
      const [rawAttRecords, emps, dismissedEmps, branches, geozones] = await Promise.all([
        getFirebaseAttendance().catch(() => []),
        getFirebaseEmployees().catch(() => []),
        getFirebaseDismissedEmployees().catch(() => []),
        getFirebaseBranches().catch(() => []),
        getFirebaseGeozones().catch(() => [])
      ]);

      // Filiallar ro'yxatini jamlash
      const branchSet = new Set<string>(BRANCHES_LIST);
      DEFAULT_GEOZONES.forEach(g => branchSet.add(g.name));
      (branches || []).forEach((b: any) => { if (b.name || b.nameUz) branchSet.add(b.name || b.nameUz); });
      (geozones || []).forEach((g: any) => { if (g.name) branchSet.add(g.name); });
      (emps || []).forEach((e: any) => { if (e.branch) branchSet.add(e.branch); });
      (dismissedEmps || []).forEach((d: any) => { if (d.branch) branchSet.add(d.branch); });
      setAllBranches(Array.from(branchSet).filter(Boolean).sort());

      // Faol xodimlar xaritasi (ID bo'yicha)
      const empMap = new Map<string, any>();
      (emps || []).forEach((e: any) => {
        if (e.id) empMap.set(String(e.id), e);
        if (e.staffId) empMap.set(String(e.staffId), e);
        if (e.fullName) empMap.set(String(e.fullName).toLowerCase().trim(), e);
      });

      // Ishdan bo'shagan / arxivdagi xodimlar xaritasi
      const dismissedMap = new Map<string, any>();
      (dismissedEmps || []).forEach((d: any) => {
        if (d.id) dismissedMap.set(String(d.id), d);
        if (d.staffId) dismissedMap.set(String(d.staffId), d);
        if (d.fullName) dismissedMap.set(String(d.fullName).toLowerCase().trim(), d);
      });

      // Stavka (agar sozlamadan olingan bo'lsa)
      const currentRate = typeof penaltyRate === 'number' ? penaltyRate : parseInt(String(penaltyRate) || '1000', 10);

      // Kechikishlarni filtrlash va normalizatsiya qilish
      const penaltyList: PenaltyRecord[] = [];

      (rawAttRecords || []).forEach((rec: any) => {
        const delayMin = Number(rec.delayMinutes) || 0;
        const isLate = delayMin > 0 || (rec.status && String(rec.status).toLowerCase().includes('kech'));
        if (!isLate && !rec.penalty) return;

        const matchedEmp = empMap.get(String(rec.employeeId)) || 
                           empMap.get(String(rec.employeeName || '').toLowerCase().trim());
        const matchedDismissed = dismissedMap.get(String(rec.employeeId)) || 
                                 dismissedMap.get(String(rec.employeeName || '').toLowerCase().trim());

        const matched = matchedEmp || matchedDismissed;

        // Xodim hozir faolmi yoki ishdan bo'shaganmi?
        // 1. dismissedMap da bo'lsa
        // 2. Faol ro'yxatda statusi 'resigned' | 'dismissed' | 'inactive' | 'left' bo'lsa
        // 3. Faol ro'yxatda umuman topilmasa (avval ro'yxatdan o'chirilgan bo'lsa ham turaveradi)
        const isDismissed = Boolean(
          matchedDismissed || 
          (matchedEmp && (matchedEmp.status === 'resigned' || matchedEmp.status === 'dismissed' || matchedEmp.status === 'inactive' || matchedEmp.workStatus === 'left')) ||
          (!matchedEmp)
        );

        const empName = rec.employeeName || matched?.fullName || (isDismissed ? `Sobiq xodim #${rec.employeeId || 'Noma\'lum'}` : 'Noma\'lum xodim');
        const empBranch = rec.branch || matched?.branch || 'Bosh ofis';
        const empDept = rec.department || matched?.department || (isDismissed ? "Sobiq xodim" : "Savdo bo'limi");
        const empPos = matched?.position || (isDismissed ? "Ishdan bo'shagan" : 'Xodim');

        // Jarima hisoblash
        const isWaived = Boolean(rec.isWaived || rec.status === 'Kechirilgan' || (rec.penalty && String(rec.penalty).includes('Kechirilgan')));
        
        let calculatedPenalty = 0;
        if (rec.penaltyAmount !== undefined && rec.penaltyAmount !== null) {
          calculatedPenalty = Number(rec.penaltyAmount) || 0;
        } else if (delayMin > 0) {
          calculatedPenalty = penaltyType === 'hour' 
            ? Math.ceil(delayMin / 60) * currentRate 
            : delayMin * currentRate;
        }

        const formattedPenalty = isWaived 
          ? "0 so'm (Kechirilgan)" 
          : `- ${calculatedPenalty.toLocaleString('uz-UZ')} so'm`;

        penaltyList.push({
          id: rec.id || `att-${rec.employeeId}-${rec.date}`,
          date: rec.date || new Date().toISOString().slice(0, 10),
          employeeId: String(rec.employeeId || matched?.id || ''),
          employeeName: empName,
          branch: empBranch,
          department: empDept,
          position: empPos,
          checkIn: rec.checkIn || '--:--',
          scheduledTime: rec.scheduledTime || workStartTime || '09:00',
          delayMinutes: delayMin,
          penaltyAmount: isWaived ? 0 : calculatedPenalty,
          penaltyFormatted: formattedPenalty,
          isWaived,
          waivedReason: rec.waivedReason || rec.editReason,
          waivedBy: rec.waivedBy || rec.editedBy,
          waivedAt: rec.waivedAt || rec.editedAt,
          status: isWaived ? 'Kechirilgan (Uzrli)' : 'Jarima hisoblangan',
          notes: rec.notes || rec.delayReason,
          isDismissed
        });
      });

      // Sanalar bo'yicha eng yangisini tepaga saralash
      penaltyList.sort((a, b) => b.date.localeCompare(a.date));
      setPenalties(penaltyList);

    } catch (e) {
      console.error("Error loading penalties:", e);
    } finally {
      setIsLoadingPenalties(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadPenaltiesData();
  }, []);

  // ------------------------------------------
  // Filtered Penalties Logic
  // ------------------------------------------
  const filteredPenalties = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);

    const weekAgoDate = new Date();
    weekAgoDate.setDate(weekAgoDate.getDate() - 7);
    const weekAgo = weekAgoDate.toISOString().slice(0, 10);

    const currentYearMonth = today.slice(0, 7); // YYYY-MM

    return penalties.filter(item => {
      // 1. Text Search (F.I.O, ID, Branch, Position)
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesQuery = 
          (item.employeeName || '').toLowerCase().includes(q) ||
          (item.employeeId || '').toLowerCase().includes(q) ||
          (item.branch || '').toLowerCase().includes(q) ||
          (item.position || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Branch Filter
      if (selectedBranchFilter !== 'all' && item.branch !== selectedBranchFilter) {
        return false;
      }

      // 3. Employee Status Filter (Faol vs Ishdan bo'shagan)
      if (employeeStatusFilter === 'active' && item.isDismissed) return false;
      if (employeeStatusFilter === 'dismissed' && !item.isDismissed) return false;

      // 4. Status Filter (active vs waived)
      if (statusFilter === 'active' && item.isWaived) return false;
      if (statusFilter === 'waived' && !item.isWaived) return false;

      // 5. Date Filter
      if (dateRangeFilter === 'today' && item.date !== today) return false;
      if (dateRangeFilter === 'yesterday' && item.date !== yesterday) return false;
      if (dateRangeFilter === 'week' && (item.date < weekAgo || item.date > today)) return false;
      if (dateRangeFilter === 'month' && !item.date.startsWith(currentYearMonth)) return false;
      if (dateRangeFilter === 'custom') {
        if (customStartDate && item.date < customStartDate) return false;
        if (customEndDate && item.date > customEndDate) return false;
      }

      return true;
    });
  }, [penalties, searchQuery, selectedBranchFilter, statusFilter, employeeStatusFilter, dateRangeFilter, customStartDate, customEndDate]);

  // ------------------------------------------
  // KPI Metrics Calculation
  // ------------------------------------------
  const metrics = useMemo(() => {
    let totalDelays = filteredPenalties.length;
    let totalDelayMinutes = 0;
    let totalPenaltyAmount = 0;
    let totalWaivedAmount = 0;
    let dismissedCount = 0;
    const branchCountMap = new Map<string, number>();

    filteredPenalties.forEach(p => {
      if (p.isDismissed) dismissedCount++;
      totalDelayMinutes += p.delayMinutes || 0;
      if (p.isWaived) {
        totalWaivedAmount += p.penaltyAmount || (p.delayMinutes * 1000);
      } else {
        totalPenaltyAmount += p.penaltyAmount || 0;
      }
      const b = p.branch || 'Bosh ofis';
      branchCountMap.set(b, (branchCountMap.get(b) || 0) + 1);
    });

    let mostLateBranch = 'Mavjud emas';
    let maxCount = 0;
    branchCountMap.forEach((cnt, b) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        mostLateBranch = `${b} (${cnt} ta)`;
      }
    });

    const hours = Math.floor(totalDelayMinutes / 60);
    const mins = totalDelayMinutes % 60;
    const formattedTotalTime = hours > 0 ? `${hours} soat ${mins} daq` : `${mins} daqiqa`;

    return {
      totalDelays,
      formattedTotalTime,
      totalPenaltyAmount,
      totalWaivedAmount,
      mostLateBranch,
      dismissedCount
    };
  }, [filteredPenalties]);

  // ------------------------------------------
  // Waiver (Jarimani kechirish) Action
  // ------------------------------------------
  const handleOpenWaiverModal = (record: PenaltyRecord) => {
    setWaivingRecord(record);
    setWaiverReasonCategory(WAIVER_REASONS[0]);
    setWaiverComment('');
  };

  const handleConfirmWaiver = async () => {
    if (!waivingRecord) return;
    setIsSubmittingWaiver(true);

    const fullReason = waiverComment.trim() 
      ? `${waiverReasonCategory} — ${waiverComment.trim()}`
      : waiverReasonCategory;

    const currentUserName = (currentUser as any)?.fullName || (currentUser as any)?.name || "Zarifjon Zokirov (Super Admin)";

    try {
      await updateAttendanceWithAudit({
        recordId: waivingRecord.id,
        updates: {
          status: 'Kechirilgan' as any,
          isWaived: true as any,
          waivedReason: fullReason as any,
          waivedBy: currentUserName as any,
          waivedAt: new Date().toISOString() as any,
          penalty: "0 so'm (Kechirilgan)" as any,
          notes: `Jarima bekor qilindi: ${fullReason}` as any
        },
        performedBy: currentUserName,
        role: (currentUser as any)?.role || 'Super Admin',
        reason: `Kechikish jarimasi bekor qilindi: ${fullReason}`
      });

      // Update local state
      setPenalties(prev => prev.map(p => {
        if (p.id === waivingRecord.id) {
          return {
            ...p,
            isWaived: true,
            penaltyAmount: 0,
            penaltyFormatted: "0 so'm (Kechirilgan)",
            status: 'Kechirilgan (Uzrli)',
            waivedReason: fullReason,
            waivedBy: currentUserName,
            waivedAt: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
          };
        }
        return p;
      }));

      showToast(`✅ ${waivingRecord.employeeName}ning jarimasi muvaffaqiyatli kechirildi va bekor qilindi!`);
      setWaivingRecord(null);
    } catch (err) {
      console.error(err);
      showToast("Xatolik: Jarimani kechirishda xatolik yuz berdi");
    } finally {
      setIsSubmittingWaiver(false);
    }
  };

  const handleUndoWaiver = async (record: PenaltyRecord) => {
    const currentRate = typeof penaltyRate === 'number' ? penaltyRate : parseInt(String(penaltyRate) || '1000', 10);
    const restoredPenalty = penaltyType === 'hour' 
      ? Math.ceil(record.delayMinutes / 60) * currentRate 
      : record.delayMinutes * currentRate;

    const currentUserName = (currentUser as any)?.fullName || (currentUser as any)?.name || "Zarifjon Zokirov (Super Admin)";

    try {
      await saveFirebaseAttendance({
        id: record.id,
        isWaived: false,
        status: 'Kech qolgan',
        waivedReason: null,
        waivedBy: null,
        waivedAt: null,
        penalty: `- ${restoredPenalty.toLocaleString('uz-UZ')} so'm`,
        notes: `${record.delayMinutes} daqiqa kechikkan (qayta tiklandi)`
      });

      setPenalties(prev => prev.map(p => {
        if (p.id === record.id) {
          return {
            ...p,
            isWaived: false,
            penaltyAmount: restoredPenalty,
            penaltyFormatted: `- ${restoredPenalty.toLocaleString('uz-UZ')} so'm`,
            status: 'Jarima hisoblangan',
            waivedReason: undefined,
            waivedBy: undefined
          };
        }
        return p;
      }));

      showToast(`Jarima qayta tiklandi: - ${restoredPenalty.toLocaleString()} so'm`);
    } catch (e) {
      console.error(e);
      showToast("Qayta tiklashda xatolik yuz berdi");
    }
  };

  // ------------------------------------------
  // Excel & PDF Export
  // ------------------------------------------
  const handleExport = (type: 'excel' | 'pdf') => {
    const fileName = `Toyona_Kechikishlar_Jarimalar_${new Date().toISOString().slice(0, 10)}`;
    const headers = ['№', 'Sana', 'Xodim F.I.O', 'Xodim Holati', 'Filial', 'Bo\'lim', 'Lavozim', 'Kelgan vaqt', 'Kechikish (daq)', 'Jarima (so\'m)', 'Holati', 'Izoh / Sabab'];
    
    const rows = filteredPenalties.map((p, idx) => [
      idx + 1,
      p.date,
      p.employeeName,
      p.isDismissed ? "Ishdan bo'shagan" : "Faol",
      p.branch,
      p.department || '-',
      p.position || '-',
      p.checkIn,
      p.delayMinutes,
      p.isWaived ? "0 (Kechirilgan)" : p.penaltyAmount,
      p.status,
      p.waivedReason || p.notes || '-'
    ]);

    if (type === 'excel') {
      const excelData = filteredPenalties.map((p, idx) => ({
        '№': idx + 1,
        'Sana': p.date,
        'Xodim F.I.O': p.employeeName,
        'Xodim Holati': p.isDismissed ? "Ishdan bo'shagan" : "Faol",
        'Filial': p.branch,
        'Bo\'lim': p.department || '-',
        'Lavozim': p.position || '-',
        'Rejadagi vaqt': p.scheduledTime,
        'Kelgan vaqt': p.checkIn,
        'Kechikish (daqiqa)': p.delayMinutes,
        'Jarima summasi (so\'m)': p.isWaived ? 0 : p.penaltyAmount,
        'Holati': p.status,
        'Uzrli sabab / Izoh': p.waivedReason || p.notes || '-',
        'Mas\'ul shaxs': p.waivedBy || '-'
      }));
      exportToExcel(excelData, fileName);
    } else {
      exportToPDF(headers, rows, fileName, "Toyona Savdo - Xodimlar Kechikishlari va Jarimalari Jurnali");
    }
  };

  // ------------------------------------------
  // Save Settings
  // ------------------------------------------
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const parsedGrace = typeof gracePeriodMinutes === 'string' ? (parseInt(gracePeriodMinutes, 10) || 0) : gracePeriodMinutes;
      const parsedRate = typeof penaltyRate === 'string' ? (parseInt(penaltyRate, 10) || 0) : penaltyRate;

      const payload = {
        workStartTime,
        workEndTime,
        gracePeriodMinutes: parsedGrace,
        penaltyType,
        penaltyRate: parsedRate,
        restDays,
        customHolidays
      };

      // 1. Firebase Firestore bazasiga mustahkam saqlash
      await saveFirebasePenaltySettings(payload).catch(err => {
        console.warn('Firestorega sozlamalarni saqlashda ogohlantirish:', err);
      });

      // 2. Server API ga saqlash
      try {
        await fetch('/api/attendance/penalty-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('Server API ga saqlashda ogohlantirish:', err);
      }

      showToast('✅ Ish vaqti, jarima stavkasi va dam kunlari muvaffaqiyatli saqlandi!');
      loadPenaltiesData();
    } catch (e: any) {
      showToast('Sozlamalarni saqlashda xatolik yuz berdi');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const toggleRestDay = (dayId: number) => {
    setRestDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const handleAddHoliday = () => {
    if (!newHolidayInput) return;
    if (!customHolidays.includes(newHolidayInput)) {
      setCustomHolidays(prev => [...prev, newHolidayInput].sort());
    }
    setNewHolidayInput('');
  };

  const handleRemoveHoliday = (h: string) => {
    setCustomHolidays(prev => prev.filter(x => x !== h));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans p-6 rounded-2xl border border-slate-200 dark:border-slate-800 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SARLAVHA VA ASOSIY TABLAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
              <Clock className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Ish Vaqti, Kechikishlar & Jarimalar
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Filiallar bo'yicha xodimlarning kechikish jurnali, hisoblangan jarimalar monitoringi va ish qoidalari sozlamasi
          </p>
        </div>

        {/* Tab tugmalari */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('penalties')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'penalties'
                ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Kechikishlar & Jarimalar Jurnali</span>
            {penalties.filter(p => !p.isWaived).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-extrabold">
                {penalties.filter(p => !p.isWaived).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-900 text-[#00A651] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#00A651]" />
            <span>Ish Vaqti & Stavka Sozlamalari</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KECHIKISHLAR VA JARIMALAR JURNALI (MONITORING & WAIVER) */}
      {/* ========================================================================= */}
      {activeTab === 'penalties' && (
        <div className="space-y-6">
          {/* 4 TA STATISTIK KARTA (KPIS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Karta 1 */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>Jami Kechikishlar</span>
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {metrics.totalDelays} <span className="text-xs font-bold text-slate-400">ta holat</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-400">
                {metrics.dismissedCount > 0 ? (
                  <span className="text-rose-500 dark:text-rose-400 font-bold">
                    Shundan {metrics.dismissedCount} tasi ishdan bo'shaganlarda
                  </span>
                ) : (
                  "Tanlangan davr bo'yicha kechikishlar"
                )}
              </div>
            </div>

            {/* Karta 2 */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>Umumiy Kechikish Vaqti</span>
                <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
                {metrics.formattedTotalTime}
              </div>
              <div className="text-[11px] font-semibold text-slate-400">
                Imtiyozdan keyingi jami yo'qotilgan daqiqalar
              </div>
            </div>

            {/* Karta 3 */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>Hisoblangan Jarima</span>
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {metrics.totalPenaltyAmount.toLocaleString('uz-UZ')} <span className="text-xs font-bold">so'm</span>
              </div>
              <div className="text-[11px] font-semibold text-rose-500">
                Oylik maoshdan ushlanishi kerak bo'lgan summa
              </div>
            </div>

            {/* Karta 4 */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>Kechirilgan (Uzrli) Jarima</span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {metrics.totalWaivedAmount.toLocaleString('uz-UZ')} <span className="text-xs font-bold">so'm</span>
              </div>
              <div className="text-[11px] font-semibold text-emerald-600">
                HR/Rahbar tomonidan uzrli deb topilgan
              </div>
            </div>
          </div>

          {/* BOSHQARUV PANEL: QIDIRUV VA FILTRLAR */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Qidiruv */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Xodim F.I.O, ID raqami yoki lavozimi bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/40 outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
                />
              </div>

              {/* Sana Filtri */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['today', 'yesterday', 'week', 'month', 'all'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setDateRangeFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      dateRangeFilter === f
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'today' && 'Bugun'}
                    {f === 'yesterday' && 'Kecha'}
                    {f === 'week' && 'Oxirgi 7 kun'}
                    {f === 'month' && 'Shu oy'}
                    {f === 'all' && 'Barchasi'}
                  </button>
                ))}

                {/* Filial tanlash */}
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 outline-none cursor-pointer"
                >
                  <option value="all">Barcha filiallar ({allBranches.length})</option>
                  {allBranches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                {/* Status tanlash */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 outline-none cursor-pointer"
                >
                  <option value="all">Barcha jarima statuslari</option>
                  <option value="active">🔴 Faol jarimada</option>
                  <option value="waived">🟢 Kechirilgan (Uzrli)</option>
                </select>

                {/* Xodim faolligi tanlash (Faol / Ishdan bo'shagan) */}
                <select
                  value={employeeStatusFilter}
                  onChange={(e) => setEmployeeStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 outline-none cursor-pointer"
                  title="Xodim holati bo'yicha saralash"
                >
                  <option value="all">Barcha xodimlar</option>
                  <option value="active">🟢 Faol xodimlar</option>
                  <option value="dismissed">🔴 Ishdan bo'shaganlar</option>
                </select>

                {/* Export & Refresh */}
                <div className="flex items-center gap-1 ml-auto">
                  <ExportButtons onExport={handleExport} />
                  <button
                    onClick={loadPenaltiesData}
                    className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 transition-colors cursor-pointer"
                    title="Ma'lumotlarni qayta yangilash"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* JADVAL */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">№</th>
                    <th className="py-3 px-3">Sana</th>
                    <th className="py-3 px-3">Xodim F.I.O & Holati</th>
                    <th className="py-3 px-3">Filial & Bo'lim</th>
                    <th className="py-3 px-2 text-center">Reja</th>
                    <th className="py-3 px-2 text-center">Kelgan vaqti</th>
                    <th className="py-3 px-3 text-center">Kechikish</th>
                    <th className="py-3 px-3 text-right">Jarima Summasi</th>
                    <th className="py-3 px-3 text-center">Holati</th>
                    <th className="py-3 px-3">Izoh / Sabab</th>
                    <th className="py-3 px-3 text-center">Amallar</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {isLoadingPenalties ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-bold text-xs">
                        Kechikishlar va jarimalar yuklanmoqda...
                      </td>
                    </tr>
                  ) : filteredPenalties.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500/70" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            Tanlangan davrda kechikish va jarimalar topilmadi!
                          </span>
                          <span className="text-xs text-slate-400">
                            Xodimlar o'z vaqtida kelgan yoki filtr parametrlari bo'yicha ma'lumot yo'q.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPenalties.map((item, idx) => {
                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            item.isWaived ? 'bg-emerald-50/20' : ''
                          }`}
                        >
                          {/* № */}
                          <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Sana */}
                          <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-800 dark:text-slate-100">
                            {item.date}
                          </td>

                          {/* Xodim */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-[13px]">
                                {item.employeeName}
                              </span>
                              {item.isDismissed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-xs" title="Ushbu xodim hozirda ishdan bo'shagan / tizimda yo'q">
                                  <UserX className="w-2.5 h-2.5 text-rose-600" />
                                  Ishdan bo'shagan
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  <UserCheck className="w-2.5 h-2.5 text-emerald-600" />
                                  Faol
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {item.position || 'Hodim'} {item.employeeId ? `• #${item.employeeId}` : ''}
                            </div>
                          </td>

                          {/* Filial & Bo'lim */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-bold text-[#1E3A8A] text-xs">
                              {item.branch}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.department || "Savdo bo'limi"}
                            </div>
                          </td>

                          {/* Reja */}
                          <td className="py-3 px-2 text-center font-mono text-slate-500 font-semibold text-xs">
                            {item.scheduledTime || '09:00'}
                          </td>

                          {/* Kelgan vaqt */}
                          <td className="py-3 px-2 text-center font-mono font-bold text-rose-600 text-xs">
                            {item.checkIn}
                          </td>

                          {/* Kechikish */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-black text-xs">
                              +{item.delayMinutes} daq
                            </span>
                          </td>

                          {/* Jarima Summasi */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            {item.isWaived ? (
                              <span className="text-xs font-bold text-emerald-600">
                                0 so'm (Kechirilgan)
                              </span>
                            ) : (
                              <span className="font-black text-rose-600 text-xs">
                                - {item.penaltyAmount.toLocaleString('uz-UZ')} so'm
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {item.isWaived ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Kechirilgan (Uzrli)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>Jarima hisoblangan</span>
                              </span>
                            )}
                          </td>

                          {/* Sabab / Izoh */}
                          <td className="py-3 px-3 max-w-[200px] truncate text-[11px] text-slate-500" title={item.waivedReason || item.notes}>
                            {item.waivedReason ? (
                              <span className="font-semibold text-emerald-700">
                                {item.waivedReason}
                              </span>
                            ) : (
                              item.notes || 'Sabab kiritilmagan'
                            )}
                          </td>

                          {/* Harakatlar */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {!item.isWaived ? (
                              <button
                                onClick={() => handleOpenWaiverModal(item)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer shadow-2xs"
                                title="Uzrli sabab kiritish va jarimani 0 so'm qilish"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Kechirish</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUndoWaiver(item)}
                                className="px-2 py-1 text-slate-500 hover:text-rose-600 text-[11px] font-semibold transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                                title="Kechirishni bekor qilish va jarimani qayta tiklash"
                              >
                                <Undo2 className="w-3 h-3" />
                                <span>Tiklash</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Jadval osti xulosasi */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 font-bold gap-2">
              <span>Jami ko'rsatilmoqda: {filteredPenalties.length} ta yozuv</span>
              <div className="flex items-center gap-4">
                <span>Jami jarima: <span className="text-rose-600 font-black">{metrics.totalPenaltyAmount.toLocaleString()} so'm</span></span>
                <span>Kechirilgan: <span className="text-emerald-600 font-black">{metrics.totalWaivedAmount.toLocaleString()} so'm</span></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ISH VAQTI VA STAVKA SOZLAMALARI */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-4xl">
          {isLoadingSettings ? (
            <div className="p-12 text-center text-xs font-bold text-slate-500">
              Sozlamalar yuklanmoqda...
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* 1-BLOK: ISH VAQTI VA GRAFIK */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                      1. Rasmiy Ish Vaqti (Grafik)
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    Kechikish hisobi shu vaqtdan boshlanadi
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Ish boshlanish vaqti:
                    </label>
                    <input 
                      type="time" 
                      required
                      value={workStartTime} 
                      onChange={(e) => setWorkStartTime(e.target.value)} 
                      className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/50 outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Standart vaqt: 09:00</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Ish tugash vaqti:
                    </label>
                    <input 
                      type="time" 
                      required
                      value={workEndTime} 
                      onChange={(e) => setWorkEndTime(e.target.value)} 
                      className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/50 outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Standart vaqt: 18:00</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Imtiyozli vaqt (Grace Period):
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="0"
                        max="60"
                        value={gracePeriodMinutes} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setGracePeriodMinutes(val === '' ? '' : Number(val));
                        }} 
                        className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/50 outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 font-mono pr-14"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        daqiqa
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Shu vaqtgacha jarima qo'llanilmaydi</p>
                  </div>
                </div>
              </div>

              {/* 2-BLOK: HAR BIR DAQIQA VA SOAT UCHUN JARIMA */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                      2. Kechikish Jarimasi Hisobi
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-rose-600">
                    Avtomatik kadrlar hisobiga yoziladi
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                      Jarima hisoblash birligi (Rejim):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setPenaltyType('minute')}
                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          penaltyType === 'minute' 
                            ? 'border-[#00A651] bg-[#00A651]/5 text-slate-800 dark:text-slate-100 font-bold' 
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Percent className={`w-4 h-4 ${penaltyType === 'minute' ? 'text-[#00A651]' : 'text-slate-400'}`} />
                          <div>
                            <div className="text-xs">Daqiqalik hisob</div>
                            <div className="text-[11px] text-slate-400 font-normal">Har bir kechikkan daqiqa uchun alohida</div>
                          </div>
                        </div>
                        {penaltyType === 'minute' && <CheckCircle2 className="w-4 h-4 text-[#00A651]" />}
                      </div>

                      <div
                        onClick={() => setPenaltyType('hour')}
                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          penaltyType === 'hour' 
                            ? 'border-[#00A651] bg-[#00A651]/5 text-slate-800 dark:text-slate-100 font-bold' 
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Clock className={`w-4 h-4 ${penaltyType === 'hour' ? 'text-[#00A651]' : 'text-slate-400'}`} />
                          <div>
                            <div className="text-xs">Soatlik hisob</div>
                            <div className="text-[11px] text-slate-400 font-normal">To'liq yoki to'liq bo'lmagan soat uchun</div>
                          </div>
                        </div>
                        {penaltyType === 'hour' && <CheckCircle2 className="w-4 h-4 text-[#00A651]" />}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      {penaltyType === 'minute' ? 'Har 1 daqiqa uchun jarima summasi:' : 'Har 1 soat uchun jarima summasi:'}
                    </label>
                    <div className="relative max-w-sm">
                      <input 
                        type="number" 
                        min="0"
                        step="500"
                        value={penaltyRate} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setPenaltyRate(val === '' ? '' : Number(val));
                        }} 
                        className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/50 outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 font-mono pr-14"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        so'm
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {penaltyType === 'minute' 
                        ? 'Misol: 1 000 so\'m/daqiqa (15 daqiqa kechikkan xodim 15 000 so\'m jarimaga tortiladi)' 
                        : 'Misol: 30 000 so\'m/soat'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3-BLOK: DAM OLISH KUNLARI VA BAYRAMLAR */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                      3. Dam Olish Kunlari va Bayramlar
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    Bu kunlarda davomat va kechikish hisoblanmaydi
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                      Haftalik dam olish kunlari:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map(d => {
                        const isSelected = restDays.includes(d.id);
                        return (
                          <button
                            type="button"
                            key={d.id}
                            onClick={() => toggleRestDay(d.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Maxsus bayram yoki dam olish sanalari:
                    </label>
                    <div className="flex gap-2 max-w-sm mb-2">
                      <input 
                        type="date" 
                        value={newHolidayInput}
                        onChange={(e) => setNewHolidayInput(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddHoliday}
                        className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Qo'shish
                      </button>
                    </div>

                    {customHolidays.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {customHolidays.map(h => (
                          <span 
                            key={h}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold"
                          >
                            <span>{h}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveHoliday(h)}
                              className="text-blue-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SAQLASH TUGMASI */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl text-xs font-black shadow-lg shadow-[#00A651]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSettings ? 'Saqlanmoqda...' : 'Sozlamalarni Saqlash'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* WAIVER MODAL: JARIMANI KECHIRISH (UZRLI SABAB KIRITISH) */}
      {/* ========================================================================= */}
      {waivingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    Kechikish Jarimasini Bekor Qilish
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    Uzrli sabab kiritilib, jarima 0 so'm qilinadi
                  </div>
                </div>
              </div>
              <button
                onClick={() => setWaivingRecord(null)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Employee info card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Xodim</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {waivingRecord.employeeName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {waivingRecord.branch} • {waivingRecord.date}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block">Kechikish</span>
                  <div className="font-mono font-black text-rose-600 text-sm">
                    +{waivingRecord.delayMinutes} daq
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">
                    {waivingRecord.penaltyAmount.toLocaleString()} so'm
                  </div>
                </div>
              </div>

              {/* Sabab tanlash */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Uzrli sabab toifasi:
                </label>
                <select
                  value={waiverReasonCategory}
                  onChange={(e) => setWaiverReasonCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer"
                >
                  {WAIVER_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Qo'shimcha izoh */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Batafsil izoh yoki rahbar tasdig'i:
                </label>
                <textarea
                  rows={3}
                  placeholder="Masalan: Filial boshqaruvchisi topshirig'i bilan omborga tovar olishga yuborilgan..."
                  value={waiverComment}
                  onChange={(e) => setWaiverComment(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/50 outline-none focus:ring-2 focus:ring-[#00A651]/20"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setWaivingRecord(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={isSubmittingWaiver}
                  onClick={handleConfirmWaiver}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingWaiver ? 'Saqlanmoqda...' : 'Tasdiqlash (0 so\'m qilish)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
