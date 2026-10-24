import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  Filter, 
  Search, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  Building2, 
  CheckCircle2, 
  ArrowUpDown,
  Download,
  CalendarDays,
  MapPin,
  ListFilter,
  Plane,
  Leaf,
  Loader2
} from 'lucide-react';
import { BRANCHES_LIST } from './Candidates';
import BranchGeozones from './BranchGeozones';
import { formatDelayText, formatDelayShort } from './AttendanceJournal';

interface AttendanceProps {
  currentUser?: any;
  isSuperAdmin?: boolean;
  initialTab?: 'journal' | 'branches' | string;
  onTabChange?: (tab: 'journal' | 'branches') => void;
}

export default function Attendance({ 
  currentUser, 
  isSuperAdmin,
  initialTab = 'journal',
  onTabChange
}: AttendanceProps) {
  const [activeMainTab, setActiveMainTab] = useState<'journal' | 'branches'>(() => {
    return initialTab === 'branches' ? 'branches' : 'journal';
  });

  useEffect(() => {
    if (initialTab === 'branches' || initialTab === 'journal') {
      setActiveMainTab(initialTab);
    }
  }, [initialTab]);

  const handleSwitchTab = (tab: 'journal' | 'branches') => {
    setActiveMainTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'present' | 'late' | 'absent'>('all');

  // Namuna davomat va kechikishlar yozuvlari
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [firestoreRecords, setFirestoreRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real-time attendance logs and records from Firestore
  useEffect(() => {
    let active = true;
    async function syncLogs() {
      setIsLoading(true);
      try {
        const { getFirebaseAttendanceLogs, subscribeFirebaseAttendance } = await import('../firebase');
        const fbLogs = await getFirebaseAttendanceLogs();
        if (active && fbLogs && fbLogs.length > 0) {
          setLiveLogs(fbLogs);
        }

        const unsub = subscribeFirebaseAttendance((records) => {
          if (active) {
            setFirestoreRecords(records);
            setIsLoading(false);
          }
        }, selectedDate);

        return () => unsub();
      } catch (error) {
        console.error("Attendance logs sync error:", error);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    const cleanupPromise = syncLogs();
    return () => { 
      active = false; 
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [activeMainTab, selectedDate]);

  const baseSampleRecords: any[] = [
    {
      id: 'att-1',
      employeeName: 'Rustam Aliyev',
      position: 'Katta sotuvchi-maslahatchi',
      branch: 'Downtown Branch',
      department: 'Savdo bo\'limi',
      scheduledTime: '09:00',
      checkInTime: '08:52',
      status: 'on_time',
      delayMinutes: 0,
      notes: 'O\'z vaqtida keldi (GPS tasdiqlangan)'
    },
    {
      id: 'att-2',
      employeeName: 'Nodira Qodirova',
      position: 'Kassir-operator',
      branch: 'Westside Branch',
      department: 'Kassalar va Moliya',
      scheduledTime: '09:00',
      checkInTime: '09:24',
      status: 'late',
      delayMinutes: 24,
      notes: 'Yo\'l tirbandligi sababli kechikkan'
    },
    {
      id: 'att-3',
      employeeName: 'Shohruh Bekmirzayev',
      position: 'Ombor sektori mutaxassisi',
      branch: 'Downtown Branch',
      department: 'Omborxona va Logistika',
      scheduledTime: '08:30',
      checkInTime: '09:05',
      status: 'late',
      delayMinutes: 35,
      notes: 'Kechikish qayd etildi'
    },
    {
      id: 'att-4',
      employeeName: 'Zilola Ergasheva',
      position: 'Mijozlar bilan aloqa operatori',
      branch: 'Headquarters',
      department: 'Mijozlar bilan ishlash',
      scheduledTime: '09:00',
      checkInTime: '08:55',
      status: 'on_time',
      delayMinutes: 0,
      notes: 'O\'z vaqtida keldi'
    },
    {
      id: 'att-5',
      employeeName: 'Jasur Temirov',
      position: 'Yetkazib beruvchi kuryer',
      branch: 'Central Branch',
      department: 'Logistika va Yetkazib berish',
      scheduledTime: '09:00',
      checkInTime: '-',
      status: 'absent',
      delayMinutes: 0,
      notes: 'Kasallik varaqasi (Sababli)'
    }
  ];

  // Convert live logs into record format
  const dynamicLogs: any[] = liveLogs.map(l => ({
    id: l.id,
    employeeName: l.employeeName,
    position: 'Employee',
    branch: l.branchName,
    department: 'Branch Staff',
    scheduledTime: '09:00',
    checkInTime: l.timeFormatted,
    status: l.success ? 'on_time' : 'late',
    delayMinutes: 0,
    notes: `GPS "Keldim" (${l.distanceMeters}m masofadan)`
  }));

  // Map real Firestore attendance records
  const mappedFirestore = firestoreRecords.map(r => ({
    id: r.id,
    employeeName: r.employeeName,
    position: 'Employee',
    branch: r.branch || 'Headquarters',
    department: r.department || 'Savdo',
    scheduledTime: r.scheduledTime || '09:00',
    checkInTime: r.checkIn || '-',
    status: r.status === 'Kech qolgan' ? 'late' : 
            r.status === 'Kelmadi' ? 'absent' : 
            r.status === 'Ta\'tilda' ? 'leave' :
            r.status === 'Ish yuzasidan safarda' ? 'trip' : 'on_time',
    delayMinutes: r.delayMinutes || 0,
    durationDays: r.durationDays,
    notes: r.notes || (r.status === 'Kech qolgan' ? `${formatDelayText(r.delayMinutes)} kech qoldi` : 'Vaqtida kelgan')
  }));

  const allRecords = [...mappedFirestore, ...dynamicLogs, ...baseSampleRecords];

  const filteredRecords = allRecords.filter(item => {
    const matchesSearch = !searchQuery || 
      item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.branch.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch = selectedBranch === 'all' || item.branch === selectedBranch;

    if (activeTab === 'present') return matchesSearch && matchesBranch && item.status === 'on_time';
    if (activeTab === 'late') return matchesSearch && matchesBranch && item.status === 'late';
    if (activeTab === 'absent') return matchesSearch && matchesBranch && item.status === 'absent';

    return matchesSearch && matchesBranch;
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden relative p-5 select-none font-sans">
      
      {/* HEADER & MAIN NAVIGATION TABS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-[#00A651]/10 text-[#00A651] rounded-xl">
              <Clock className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Attendance & Late Arrivals
            </h1>
            <span className="ml-2 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#00A651]/15 text-[#00A651] border border-[#00A651]/20">
              Yandex Xarita Integratsiyasi
            </span>
          </div>
        </div>

        {/* TOP TAB SWITCHER: JURNAL vs FILIALNI BELGILASH */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => handleSwitchTab('journal')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'journal'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-4 h-4 text-[#00A651]" />
            <span>Attendance Timesheet</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('branches')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'branches'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4 text-[#ED1C24]" />
            <span>Branch GPS Geozones & Map</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: FILIALNI BELGILASH (GEOZONES & RADIUS) */}
      {activeMainTab === 'branches' ? (
        <div className="mt-4">
          <BranchGeozones />
        </div>
      ) : (
        /* VIEW 2: DAVOMAT JURNALI */
        <>
          {/* DATE & EXPORT ACTIONS */}
          <div className="flex items-center justify-between gap-2.5 mt-4">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSwitchTab('branches')}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#00A651]/10 hover:bg-[#00A651]/20 text-[#00A651] text-xs font-bold rounded-xl transition-all cursor-pointer border border-[#00A651]/20"
              >
                <MapPin className="w-4 h-4" />
                <span>Configure Branch Geozones</span>
              </button>

              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Eksport</span>
              </button>
            </div>
          </div>

          {/* TOP STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 my-4">
            <div 
              onClick={() => setActiveTab('all')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                activeTab === 'all' 
                  ? 'bg-slate-100 border-slate-300 shadow-2xs' 
                  : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Total Employees</span>
                <CalendarDays className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-xl font-extrabold text-slate-800 mt-1">248 nafar</div>
            </div>

            <div 
              onClick={() => setActiveTab('present')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                activeTab === 'present' 
                  ? 'bg-emerald-100/70 border-emerald-300 shadow-2xs' 
                  : 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-emerald-700 text-[11px] font-semibold uppercase tracking-wider">Vaqtida Kelganlar</span>
                <UserCheck className="w-4 h-4 text-[#00A651]" />
              </div>
              <div className="text-xl font-extrabold text-emerald-800 mt-1">224 nafar</div>
            </div>

            <div 
              onClick={() => setActiveTab('late')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                activeTab === 'late' 
                  ? 'bg-amber-100/70 border-amber-300 shadow-2xs' 
                  : 'bg-amber-50/50 border-amber-100 hover:bg-amber-100/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-amber-700 text-[11px] font-semibold uppercase tracking-wider">Kechikkanlar</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-extrabold text-amber-800 mt-1">18 nafar</div>
            </div>

            <div 
              onClick={() => setActiveTab('absent')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                activeTab === 'absent' 
                  ? 'bg-rose-100/70 border-rose-300 shadow-2xs' 
                  : 'bg-rose-50/50 border-rose-100 hover:bg-rose-100/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-rose-700 text-[11px] font-semibold uppercase tracking-wider">Kelmaganlar</span>
                <UserX className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-xl font-extrabold text-rose-800 mt-1">6 nafar</div>
            </div>
          </div>

          {/* FILTER & SEARCH */}
          <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80 mb-4 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by employee name, role or branch..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 focus:border-[#00A651]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 outline-none focus:border-[#00A651] cursor-pointer"
              >
                <option value="all">All Branches</option>
                {BRANCHES_LIST.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ATTENDANCE TABLE */}
          <div className="flex-1 overflow-auto rounded-xl border border-slate-200/80 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Employee Full Name</th>
                  <th className="py-3 px-4">Lavozim & Bo'lim</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4 text-center">Ish Vaqti</th>
                  <th className="py-3 px-4 text-center">Kelgan Vaqti</th>
                  <th className="py-3 px-4 text-center">Kechikish</th>
                  <th className="py-3 px-4 text-center">Holat</th>
                  <th className="py-3 px-4">Izoh & GPS Manba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-[#00A651] animate-spin" />
                        <span className="text-xs font-semibold text-slate-500">
                          Loading attendance logs...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      No attendance records found for selected criteria
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record, idx) => (
                  <tr key={`${record.id || idx}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {record.employeeName}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-700 font-medium">{record.position}</div>
                      <div className="text-[11px] text-slate-400">{record.department}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {record.branch}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600">
                      {record.scheduledTime}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-800">
                      {record.checkInTime}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {record.delayMinutes > 0 ? (
                        <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 whitespace-nowrap">
                          +{formatDelayShort(record.delayMinutes)} kech qoldi
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {record.status === 'on_time' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#00A651] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Vaqtida
                        </span>
                      ) : record.status === 'late' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          Kechikkan
                        </span>
                      ) : record.status === 'leave' || record.status === 'Ta\'tilda' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                          <Plane className="w-3 h-3 text-sky-600" />
                          Ta'tilda {record.durationDays ? `(${record.durationDays}k)` : ''}
                        </span>
                      ) : record.status === 'trip' || record.status === 'Ish yuzasidan safarda' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Leaf className="w-3 h-3 text-emerald-600" />
                          Safarda {record.durationDays ? `(${record.durationDays}k)` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          <UserX className="w-3 h-3" />
                          Kelmagan
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500 italic">
                      {record.notes}
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
}
