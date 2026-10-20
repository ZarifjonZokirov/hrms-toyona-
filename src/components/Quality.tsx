import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Award,
  Clock,
  Users,
  Search,
  Filter,
  X,
  Briefcase,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  BookOpen,
  Globe,
  Sparkles,
  BarChart3,
  PieChart as PieIcon,
  CheckCircle2
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { ToyonaBrand } from './Logo';
import { Employee, INITIAL_EMPLOYEES } from './Employees';
import { getFirebaseEmployees } from '../firebase';
import { exportToExcel, exportToPDF } from '../lib/export';
import { ExportButtons } from './ExportButtons';

// Helper to determine derived or explicit quality attributes
export interface QualityProfile {
  employee: Employee;
  education: string;
  experienceYears: number;
  pastExperience: string;
  age: number;
  ageBracket: '<25' | '25-35' | '35-45' | '45+';
  experienceBracket: '<1 yil' | '1-3 yil' | '3-5 yil' | '5+ yil';
  languages: string[];
  skills: string[];
  qualificationLevel: 'Boshlang\'ich' | 'Mutaxassis' | 'Katta mutaxassis' | 'Yetakchi';
}

function calculateAge(birthDate?: string): number {
  if (!birthDate) return 28;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return 28;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age > 16 && age < 80 ? age : 28;
}

function calculateExperienceYears(hireDate?: string, explicitYears?: number): number {
  if (explicitYears && explicitYears > 0) return explicitYears;
  if (!hireDate) return 1;
  const hire = new Date(hireDate);
  if (isNaN(hire.getTime())) return 1;
  const diffTime = Math.abs(Date.now() - hire.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = +(diffDays / 365).toFixed(1);
  return years > 0 ? years : 0.5;
}

// Generate complete quality profile
function enrichEmployeeQuality(emp: Employee): QualityProfile {
  const age = calculateAge(emp.birthDate);
  const expYears = calculateExperienceYears(emp.hireDate, emp.experienceYears);

  // Age bracket
  let ageBracket: '<25' | '25-35' | '35-45' | '45+' = '25-35';
  if (age < 25) ageBracket = '<25';
  else if (age <= 35) ageBracket = '25-35';
  else if (age <= 45) ageBracket = '35-45';
  else ageBracket = '45+';

  // Experience bracket
  let experienceBracket: '<1 yil' | '1-3 yil' | '3-5 yil' | '5+ yil' = '1-3 yil';
  if (expYears < 1) experienceBracket = '<1 yil';
  else if (expYears <= 3) experienceBracket = '1-3 yil';
  else if (expYears <= 5) experienceBracket = '3-5 yil';
  else experienceBracket = '5+ yil';

  // Education fallback
  let education = emp.educationLevel?.trim() || '';
  if (!education) {
    const pos = (emp.position || '').toLowerCase();
    if (pos.includes('direktor') || pos.includes('rahbar') || pos.includes('boshqaruvchi') || pos.includes('menejer')) {
      education = 'Oliy';
    } else if (pos.includes('mutaxassis') || pos.includes('operator') || pos.includes('kassir')) {
      education = 'O\'rta-maxsus';
    } else {
      education = 'O\'rta-maxsus';
    }
  }

  // Work experience fallback
  let pastExp = emp.pastExperience?.trim() || '';
  if (!pastExp) {
    if (expYears > 3) {
      pastExp = `${emp.position} sohasida ${Math.floor(expYears)} yillik muvaffaqiyatli tajriba`;
    } else {
      pastExp = 'Savdo va xizmat ko\'rsatish yo\'nalishida tajribaga ega';
    }
  }

  // Languages
  let languages = emp.languages && emp.languages.length > 0 ? emp.languages : ['O\'zbek tili'];
  if (emp.position?.toLowerCase().includes('menejer') || emp.position?.toLowerCase().includes('direktor')) {
    languages = ['O\'zbek tili', 'Rus tili'];
  }

  // Skills
  let skills = emp.skills && emp.skills.length > 0 ? emp.skills : [];
  if (skills.length === 0) {
    const p = (emp.position || '').toLowerCase();
    if (p.includes('sotuvchi') || p.includes('kassir')) {
      skills = ['Mijozlar bilan muloqot', '1C Savdo', 'Kassa intizomi'];
    } else if (p.includes('menejer') || p.includes('direktor')) {
      skills = ['Liderlik', 'Jamoani boshqarish', 'Analitika', 'KPI monitoring'];
    } else if (p.includes('ombor')) {
      skills = ['Inventarizatsiya', 'Yuk logistikasi', 'Hisobot yuritish'];
    } else {
      skills = ['Mas\'uliyatlilik', 'Muloqot madaniyati', 'Jamoaviy ishlash'];
    }
  }

  // Qualification Level
  let qualificationLevel: 'Boshlang\'ich' | 'Mutaxassis' | 'Katta mutaxassis' | 'Yetakchi' = 'Mutaxassis';
  if (expYears >= 4 || education.toLowerCase().includes('magistr')) {
    qualificationLevel = 'Yetakchi';
  } else if (expYears >= 2 || education.toLowerCase().includes('oliy')) {
    qualificationLevel = 'Katta mutaxassis';
  } else if (expYears >= 1) {
    qualificationLevel = 'Mutaxassis';
  } else {
    qualificationLevel = 'Boshlang\'ich';
  }

  return {
    employee: emp,
    education,
    experienceYears: expYears,
    pastExperience: pastExp,
    age,
    ageBracket,
    experienceBracket,
    languages,
    skills,
    qualificationLevel
  };
}

const EDUCATION_COLORS: Record<string, string> = {
  'Oliy': '#00A651',
  'Magistr': '#059669',
  'O\'rta-maxsus': '#3b82f6',
  'O\'rta maxsus': '#3b82f6',
  'O\'rta': '#f59e0b',
  'Boshqa': '#8b5cf6'
};

const QUALIFICATION_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  'Yetakchi': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  'Katta mutaxassis': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  'Mutaxassis': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  'Boshlang\'ich': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' }
};

export default function Quality() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedBranch, setSelectedBranch] = useState<string>('Barchasi');
  const [selectedEducation, setSelectedEducation] = useState<string>('Barchasi');
  const [selectedAgeBracket, setSelectedAgeBracket] = useState<string>('Barchasi');
  const [selectedExperienceBracket, setSelectedExperienceBracket] = useState<string>('Barchasi');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<QualityProfile | null>(null);
  const [viewTab, setViewTab] = useState<'table' | 'analytics'>('table');

  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoading(true);
      let localList: Employee[] = [];
      try {
        localList = JSON.parse(localStorage.getItem('hrms_employees_v1') || '[]');
      } catch (e) {}

      if (localList.length === 0) {
        localList = INITIAL_EMPLOYEES;
      }
      setEmployees(localList);

      try {
        const firestoreList = await getFirebaseEmployees();
        if (firestoreList && firestoreList.length > 0) {
          setEmployees(firestoreList as Employee[]);
        }
      } catch (err) {
        console.error("Firebase employees fetch error in Quality:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Enriched profiles for all employees
  const qualityProfiles = useMemo(() => {
    return employees.map(emp => enrichEmployeeQuality(emp));
  }, [employees]);

  // Unique branches
  const branches = useMemo(() => {
    const allBranches = employees.map(e => e.branch).filter(Boolean);
    return Array.from(new Set(allBranches)).sort();
  }, [employees]);

  // Unique educations
  const educationList = useMemo(() => {
    const set = new Set<string>();
    qualityProfiles.forEach(p => set.add(p.education));
    return ['Barchasi', ...Array.from(set).sort()];
  }, [qualityProfiles]);

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    return qualityProfiles.filter(p => {
      const e = p.employee;
      const matchesBranch = selectedBranch === 'Barchasi' || (e.branch || '') === selectedBranch;
      const matchesEdu = selectedEducation === 'Barchasi' || p.education === selectedEducation;
      const matchesAge = selectedAgeBracket === 'Barchasi' || p.ageBracket === selectedAgeBracket;
      const matchesExp = selectedExperienceBracket === 'Barchasi' || p.experienceBracket === selectedExperienceBracket;

      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = !q ||
        (e.fullName || '').toLowerCase().includes(q) ||
        (e.position || '').toLowerCase().includes(q) ||
        (e.staffId && e.staffId.toLowerCase().includes(q)) ||
        (p.education && p.education.toLowerCase().includes(q)) ||
        (p.pastExperience && p.pastExperience.toLowerCase().includes(q));

      return matchesBranch && matchesEdu && matchesAge && matchesExp && matchesSearch;
    });
  }, [qualityProfiles, selectedBranch, selectedEducation, selectedAgeBracket, selectedExperienceBracket, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = filteredProfiles.length;
    if (total === 0) {
      return { total: 0, higherEduPct: 0, avgAge: 0, avgExp: 0, highSkillPct: 0 };
    }
    const higherEduCount = filteredProfiles.filter(p =>
      p.education.toLowerCase().includes('oliy') || p.education.toLowerCase().includes('magistr')
    ).length;
    const higherEduPct = Math.round((higherEduCount / total) * 100);

    const sumAge = filteredProfiles.reduce((acc, p) => acc + p.age, 0);
    const avgAge = +(sumAge / total).toFixed(1);

    const sumExp = filteredProfiles.reduce((acc, p) => acc + p.experienceYears, 0);
    const avgExp = +(sumExp / total).toFixed(1);

    const highSkillCount = filteredProfiles.filter(p =>
      p.qualificationLevel === 'Yetakchi' || p.qualificationLevel === 'Katta mutaxassis'
    ).length;
    const highSkillPct = Math.round((highSkillCount / total) * 100);

    return { total, higherEduPct, avgAge, avgExp, highSkillPct };
  }, [filteredProfiles]);

  // Education Chart Data
  const educationChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredProfiles.forEach(p => {
      counts[p.education] = (counts[p.education] || 0) + 1;
    });
    return Object.keys(counts).map(name => ({
      name,
      value: counts[name]
    })).sort((a, b) => b.value - a.value);
  }, [filteredProfiles]);

  // Age Distribution Chart Data
  const ageChartData = useMemo(() => {
    const counts: Record<string, number> = { '<25 yosh': 0, '25-35 yosh': 0, '35-45 yosh': 0, '45+ yosh': 0 };
    filteredProfiles.forEach(p => {
      if (p.ageBracket === '<25') counts['<25 yosh']++;
      else if (p.ageBracket === '25-35') counts['25-35 yosh']++;
      else if (p.ageBracket === '35-45') counts['35-45 yosh']++;
      else counts['45+ yosh']++;
    });
    return Object.keys(counts).map(name => ({
      name,
      xodimlar: counts[name]
    }));
  }, [filteredProfiles]);

  // Experience Distribution Chart Data
  const experienceChartData = useMemo(() => {
    const counts: Record<string, number> = { '<1 yil': 0, '1-3 yil': 0, '3-5 yil': 0, '5+ yil': 0 };
    filteredProfiles.forEach(p => {
      counts[p.experienceBracket] = (counts[p.experienceBracket] || 0) + 1;
    });
    return Object.keys(counts).map(name => ({
      name,
      xodimlar: counts[name]
    }));
  }, [filteredProfiles]);

  // Branch Quality Ranking
  const branchQualityData = useMemo(() => {
    return branches.map(branchName => {
      const branchProfiles = qualityProfiles.filter(p => p.employee.branch === branchName);
      const total = branchProfiles.length;
      if (total === 0) return { branch: branchName, total: 0, higherEduPct: 0, avgAge: 0, avgExp: 0 };
      const higherCount = branchProfiles.filter(p =>
        p.education.toLowerCase().includes('oliy') || p.education.toLowerCase().includes('magistr')
      ).length;
      const higherEduPct = Math.round((higherCount / total) * 100);
      const avgAge = +(branchProfiles.reduce((s, p) => s + p.age, 0) / total).toFixed(1);
      const avgExp = +(branchProfiles.reduce((s, p) => s + p.experienceYears, 0) / total).toFixed(1);
      return { branch: branchName, total, higherEduPct, avgAge, avgExp };
    }).sort((a, b) => b.total - a.total);
  }, [branches, qualityProfiles]);

  // Export handlers
  const handleExport = (type: 'excel' | 'pdf') => {
    const title = selectedBranch !== 'Barchasi'
      ? `Toyona Savdo - ${selectedBranch} Xodimlari Sifat Tarkibi`
      : `Toyona Savdo - Barcha Filiallar Xodimlari Sifat Tarkibi`;
    const fileName = `Toyona_Sifat_Tarkibi_${selectedBranch !== 'Barchasi' ? selectedBranch.replace(/\s+/g, '_') : 'Barchasi'}_${new Date().toISOString().slice(0, 10)}`;

    const headers = ['№', 'Tabel ID', 'Xodim (F.I.Sh)', 'Filial', 'Lavozim', 'Ma\'lumoti', 'Yoshi', 'Staj (yil)', 'Darajasi', 'Oldingi tajribasi'];
    const data = filteredProfiles.map((p, i) => [
      i + 1,
      p.employee.staffId || '-',
      p.employee.fullName,
      p.employee.branch || '-',
      p.employee.position || '-',
      p.education,
      p.age,
      `${p.experienceYears} yil`,
      p.qualificationLevel,
      p.pastExperience
    ]);

    if (type === 'excel') {
      const excelData = filteredProfiles.map((p, i) => ({
        '№': i + 1,
        'Tabel ID': p.employee.staffId || '-',
        'F.I.Sh': p.employee.fullName,
        'Filial': p.employee.branch,
        'Lavozim': p.employee.position,
        'Ma\'lumoti': p.education,
        'Yoshi': p.age,
        'Ish staji': `${p.experienceYears} yil`,
        'Malaka darajasi': p.qualificationLevel,
        'Oldingi ish tajribasi': p.pastExperience,
        'Tillar': p.languages.join(', '),
        'Telefon': p.employee.phone || '-'
      }));
      exportToExcel(excelData, fileName);
    } else {
      exportToPDF(headers, data, fileName, title);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/40 relative rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#00A651] to-emerald-400 text-white flex items-center justify-center shrink-0 shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Sifat Tarkibi va Kompetensiyalar
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-[#00A651] border border-emerald-200 dark:border-emerald-800">
                Tahlil & Daraja
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Xodimlarning ma'lumoti, yoshi, ish tajribasi (staji) va malaka salohiyati tahlili
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ExportButtons
            onExportExcel={() => handleExport('excel')}
            onExportPDF={() => handleExport('pdf')}
          />
          <ToyonaBrand />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-5">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#00A651] flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Jami xodimlar</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.total} nafar</h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedBranch === 'Barchasi' ? 'Barcha filiallar' : selectedBranch}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Oliy ma'lumotlilar</p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.higherEduPct}%</h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Bakalavr va Magistrlar ulushi
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/50">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">O'rtacha staj</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.avgExp} <span className="text-base font-bold text-slate-500">yil</span></h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Kompaniyadagi o'rtacha tajriba
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/50">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">O'rtacha yosh</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.avgAge} <span className="text-base font-bold text-slate-500">yosh</span></h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Faol va yosh mutaxassislar
              </p>
            </div>
          </div>
        </div>

        {/* Analytics Visual Charts (Always visible or togglable) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart 1: Education Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#00A651]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Ma'lumot darajasi bo'yicha
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">{filteredProfiles.length} nafar</span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={educationChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {educationChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={EDUCATION_COLORS[entry.name] || '#64748b'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    formatter={(val: any, name: any) => [`${val} nafar xodim`, name]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Age Bracket Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Yosh toifalari kesimida
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Demografiya</span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    formatter={(val: any) => [`${val} nafar`, 'Xodimlar soni']}
                  />
                  <Bar dataKey="xodimlar" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Experience Bracket Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Ish staji / Tajriba kesimida
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Tajriba</span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={experienceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    formatter={(val: any) => [`${val} nafar`, 'Xodimlar soni']}
                  />
                  <Bar dataKey="xodimlar" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher: Jadval vs Filiallar Tahlili */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <button
                onClick={() => setViewTab('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewTab === 'table'
                    ? 'bg-white dark:bg-slate-700 text-[#00A651] shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Sifat Tarkibi Jadvali ({filteredProfiles.length})
              </button>
              <button
                onClick={() => setViewTab('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewTab === 'analytics'
                    ? 'bg-white dark:bg-slate-700 text-[#00A651] shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Filiallar Reytingi ({branches.length})
              </button>
            </div>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer"
            >
              <option value="Barchasi">Barcha filiallar ({employees.length})</option>
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Education Filter */}
            <select
              value={selectedEducation}
              onChange={(e) => setSelectedEducation(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer"
            >
              {educationList.map(ed => (
                <option key={ed} value={ed}>{ed === 'Barchasi' ? 'Barcha ma\'lumotlar' : ed}</option>
              ))}
            </select>

            {/* Age Filter */}
            <select
              value={selectedAgeBracket}
              onChange={(e) => setSelectedAgeBracket(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer"
            >
              <option value="Barchasi">Barcha yoshlar</option>
              <option value="<25">&lt; 25 yosh</option>
              <option value="25-35">25 - 35 yosh</option>
              <option value="35-45">35 - 45 yosh</option>
              <option value="45+">45+ yosh</option>
            </select>

            {/* Experience Filter */}
            <select
              value={selectedExperienceBracket}
              onChange={(e) => setSelectedExperienceBracket(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A651]/20 cursor-pointer"
            >
              <option value="Barchasi">Barcha stajlar</option>
              <option value="<1 yil">&lt; 1 yil staj</option>
              <option value="1-3 yil">1 - 3 yil staj</option>
              <option value="3-5 yil">3 - 5 yil staj</option>
              <option value="5+ yil">5+ yil staj</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="F.I.Sh, ma'lumoti, tajriba..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A651]/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Sifat Tarkibi Jadvali */}
        {viewTab === 'table' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[1000px]">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-extrabold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                  <tr>
                    <th className="py-3.5 px-3.5 w-12 text-center text-slate-400">№</th>
                    <th className="py-3.5 px-3.5">Xodim (F.I.Sh)</th>
                    <th className="py-3.5 px-3.5">Tabel ID</th>
                    <th className="py-3.5 px-3.5">Filiali</th>
                    <th className="py-3.5 px-3.5">Lavozimi</th>
                    <th className="py-3.5 px-3.5">Ma'lumoti</th>
                    <th className="py-3.5 px-3.5 text-center">Yoshi</th>
                    <th className="py-3.5 px-3.5 text-center">Umumiy Staji</th>
                    <th className="py-3.5 px-3.5">Malaka Darajasi</th>
                    <th className="py-3.5 px-3.5">Oldingi Tajribasi</th>
                    <th className="py-3.5 px-3.5 text-right w-24">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredProfiles.map((profile, idx) => {
                    const emp = profile.employee;
                    const badge = QUALIFICATION_BADGES[profile.qualificationLevel] || QUALIFICATION_BADGES['Mutaxassis'];
                    return (
                      <tr
                        key={`${emp.id}-${idx}`}
                        onClick={() => setSelectedProfile(profile)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-3.5 text-center font-mono text-[11px] text-slate-400">
                          #{idx + 1}
                        </td>
                        <td className="py-3.5 px-3.5 font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#00A651] transition-colors">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={emp.avatarUrl}
                              alt={emp.fullName}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                            <span className="truncate">{emp.fullName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3.5 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {emp.staffId}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {emp.branch}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 font-medium text-slate-800 dark:text-slate-200">
                          {emp.position}
                        </td>
                        <td className="py-3.5 px-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            profile.education.toLowerCase().includes('oliy') || profile.education.toLowerCase().includes('magistr')
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#00A651] border border-emerald-200 dark:border-emerald-800'
                              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          }`}>
                            <GraduationCap className="w-3 h-3 shrink-0" />
                            {profile.education}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                          {profile.age} yosh
                        </td>
                        <td className="py-3.5 px-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px]">
                            {profile.experienceYears} yil
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] border ${badge.bg} ${badge.text} ${badge.border}`}>
                            <Award className="w-3 h-3 shrink-0" />
                            {profile.qualificationLevel}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={profile.pastExperience}>
                          {profile.pastExperience}
                        </td>
                        <td className="py-3.5 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedProfile(profile)}
                            className="px-2.5 py-1 bg-[#00A651]/10 hover:bg-[#00A651] text-[#00A651] hover:text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                          >
                            Tahlil &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProfiles.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                        Hech qanday ma'lumot topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Jami: <strong className="text-slate-800 dark:text-slate-100 font-bold">{filteredProfiles.length}</strong> nafar xodim sifat tarkibi</span>
              <span>Oliy ma'lumot: <strong className="text-emerald-600 font-bold">{stats.higherEduPct}%</strong> | O'rtacha yosh: <strong className="text-slate-700 dark:text-slate-300 font-bold">{stats.avgAge}</strong></span>
            </div>
          </div>
        ) : (
          /* Tab 2: Filiallar Sifat Reytingi */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Filiallar Kesimida Sifat Salohiyati</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Har bir filialning ma'lumot darajasi, o'rtacha yoshi va staj ko'rsatkichi</p>
              </div>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-extrabold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center text-slate-400">№</th>
                    <th className="py-3 px-4">Filial Nomi</th>
                    <th className="py-3 px-4">Xodimlar Soni</th>
                    <th className="py-3 px-4">Oliy Ma'lumot Ulushi</th>
                    <th className="py-3 px-4 text-center">O'rtacha Yosh</th>
                    <th className="py-3 px-4 text-center">O'rtacha Staj</th>
                    <th className="py-3 px-4 text-right w-36">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {branchQualityData.map((row, idx) => (
                    <tr
                      key={row.branch}
                      onClick={() => {
                        setSelectedBranch(row.branch);
                        setViewTab('table');
                      }}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-400">
                        #{idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#00A651] transition-colors">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span>{row.branch}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                          {row.total} nafar
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#00A651] h-full rounded-full"
                              style={{ width: `${row.higherEduPct}%` }}
                            />
                          </div>
                          <span className="text-[#00A651]">{row.higherEduPct}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        {row.avgAge} yosh
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">
                        {row.avgExp} yil
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedBranch(row.branch);
                            setViewTab('table');
                          }}
                          className="px-3 py-1.5 bg-[#00A651]/10 hover:bg-[#00A651] text-[#00A651] hover:text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                        >
                          Xodimlarni ko'rish &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Sifat Tarkibi & Kompetensiyalar Kartochkasi Modal (Passport olib tashlangan, Tajriba & Ma'lumot asosiy) */}
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-white to-white dark:from-slate-900 dark:to-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00A651] to-emerald-400 text-white flex items-center justify-center shrink-0 shadow-md">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg leading-tight">
                      Xodim Sifat va Kompetensiya Kartochkasi
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Ma'lumot, yosh, ish tajribasi va ko'nikmalar tahlili
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                {/* Employee Profile Top Summary */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <img
                    src={selectedProfile.employee.avatarUrl}
                    alt={selectedProfile.employee.fullName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-900 dark:text-slate-100 text-base truncate">
                        {selectedProfile.employee.fullName}
                      </h4>
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                        {selectedProfile.employee.staffId}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#00A651] mt-0.5">
                      {selectedProfile.employee.position} &bull; {selectedProfile.employee.branch}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Award className="w-3 h-3" />
                        {selectedProfile.qualificationLevel}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3 h-3" />
                        {selectedProfile.experienceYears} yil staj
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid of Key Quality Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
                      <GraduationCap className="w-3.5 h-3.5 text-[#00A651]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Ma'lumot Darajasi</span>
                    </div>
                    <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                      {selectedProfile.education}
                    </div>
                    {selectedProfile.employee.graduationYear && (
                      <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                        Bitirgan yili: {selectedProfile.employee.graduationYear}
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Yoshi & Tug'ilgan Sana</span>
                    </div>
                    <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                      {selectedProfile.age} yosh
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                      {selectedProfile.employee.birthDate?.split('-').reverse().join('.') || 'Ko\'rsatilmagan'}
                    </div>
                  </div>
                </div>

                {/* Work Experience Section (Oldingi Ish Faoliyati va Tajriba) */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-black uppercase tracking-wider">Ish Faoliyati va Tajribasi</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700">
                    {selectedProfile.pastExperience}
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-1">
                    <span>Toyona Savdoga kirgan sana: {selectedProfile.employee.hireDate?.split('-').reverse().join('.') || '-'}</span>
                    <span className="text-emerald-600 font-bold">Staj: {selectedProfile.experienceYears} yil</span>
                  </div>
                </div>

                {/* Skills & Competencies */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-black uppercase tracking-wider">Kasbiy Ko'nikmalar & Malaka</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedProfile.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black uppercase tracking-wider">Til Bilish Darajasi</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedProfile.languages.map((lang, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 text-right">
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Yopish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
