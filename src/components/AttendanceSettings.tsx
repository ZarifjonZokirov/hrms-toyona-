import React, { useState, useEffect } from 'react';
import { 
  Clock, Calendar, AlertTriangle, CheckCircle2, Save, 
  HelpCircle, RefreshCw, Sun, Moon, Coffee, ShieldAlert,
  Percent, DollarSign, ArrowRight
} from 'lucide-react';
import { ModuleHeaderLogo, ToyonaBrand } from './Logo';

export default function AttendanceSettings() {
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('18:00');
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number | string>(15);
  const [penaltyType, setPenaltyType] = useState<'minute' | 'hour'>('minute');
  const [penaltyRate, setPenaltyRate] = useState<number | string>(1000);
  const [restDays, setRestDays] = useState<number[]>([0]); // 0: Sunday
  const [customHolidays, setCustomHolidays] = useState<string[]>([]);
  const [newHolidayInput, setNewHolidayInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const daysOfWeek = [
    { id: 1, label: 'Monday' },
    { id: 2, label: 'Tuesday' },
    { id: 3, label: 'Wednesday' },
    { id: 4, label: 'Thursday' },
    { id: 5, label: 'Friday' },
    { id: 6, label: 'Saturday' },
    { id: 0, label: 'Sunday' },
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadSettings = () => {
    setIsLoading(true);
    fetch('/api/attendance/penalty-settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          const s = data.settings;
          if (s.workStartTime) setWorkStartTime(s.workStartTime);
          if (s.workEndTime) setWorkEndTime(s.workEndTime);
          if (s.gracePeriodMinutes !== undefined) setGracePeriodMinutes(s.gracePeriodMinutes);
          if (s.penaltyType) setPenaltyType(s.penaltyType);
          if (s.penaltyRate !== undefined) setPenaltyRate(s.penaltyRate);
          if (Array.isArray(s.restDays)) setRestDays(s.restDays);
          if (Array.isArray(s.customHolidays)) setCustomHolidays(s.customHolidays);
        }
      })
      .catch(err => {
        console.warn('Sozlamalarni yuklab bo\'lmadi:', err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedGrace = typeof gracePeriodMinutes === 'string' ? (parseInt(gracePeriodMinutes, 10) || 0) : gracePeriodMinutes;
      const parsedRate = typeof penaltyRate === 'string' ? (parseInt(penaltyRate, 10) || 0) : penaltyRate;

      const res = await fetch('/api/attendance/penalty-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workStartTime,
          workEndTime,
          gracePeriodMinutes: parsedGrace,
          penaltyType,
          penaltyRate: parsedRate,
          restDays,
          customHolidays
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Jarima, ish vaqti va dam kunlari muvaffaqiyatli saqlandi!');
      } else {
        showToast(data.message || 'Xatolik yuz berdi');
      }
    } catch (e: any) {
      showToast('Server bilan bog\'lanishda xatolik yuz berdi');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans p-6 rounded-2xl border border-slate-200 dark:border-slate-800 relative">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sarlavha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
              <Clock className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Ish Vaqti, Jarimalar & Weekly Rest Days
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Kechikkanlar uchun har bir minutes yoki hourslik jarima miqdori, rasmiy ish hourslari va dam kunlarini belgilash
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadSettings}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Qayta yuklash</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-500">
          Loading attendance configuration...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
          {/* 1-BLOK: ISH VAQTI VA GRAFIK */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  1. Official Shift Hours & Work Schedule
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                Late arrival tracking calculates past this threshold
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Shift Start Time:
                </label>
                <div className="relative">
                  <input 
                    type="time" 
                    required
                    value={workStartTime} 
                    onChange={(e) => setWorkStartTime(e.target.value)} 
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/50 outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Default time: 09:00</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Shift End Time:
                </label>
                <div className="relative">
                  <input 
                    type="time" 
                    required
                    value={workEndTime} 
                    onChange={(e) => setWorkEndTime(e.target.value)} 
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/50 outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Default time: 18:00</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Grace Period (Leniency Buffer):
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
                    minutes
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Delays within this buffer incur no deduction</p>
              </div>
            </div>
          </div>

          {/* 2-BLOK: HAR BIR DAQIQA VA SOAT UCHUN JARIMA */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  2. Late Arrival Penalty Calculation
                </h3>
              </div>
              <span className="text-[11px] font-bold text-rose-600">
                Calculated automatically for payroll deduction
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  Penalty Calculation Mode:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setPenaltyType('minute')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      penaltyType === 'minute'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${penaltyType === 'minute' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-100">
                          Per-Minute Penalty Tier
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Fixed deduction applied for every minute late
                        </div>
                      </div>
                    </div>
                    {penaltyType === 'minute' && (
                      <CheckCircle2 className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                  </div>

                  <div
                    onClick={() => setPenaltyType('hour')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      penaltyType === 'hour'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${penaltyType === 'hour' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-100">
                          Hourly Penalty Tier
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Delays rounded to nearest full hour
                        </div>
                      </div>
                    </div>
                    {penaltyType === 'hour' && (
                      <CheckCircle2 className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  {penaltyType === 'minute' 
                    ? '1 minutes kechikish uchun jarima stavkasi (so\'mda):' 
                    : '1 hours kechikish uchun jarima stavkasi (so\'mda):'}
                </label>
                <div className="relative max-w-sm">
                  <input 
                    type="number" 
                    min="0"
                    step="500"
                    placeholder="e.g. 5"
                    value={penaltyRate} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setPenaltyRate('');
                      } else {
                        // Agar 0 bilan boshlansa va orqasidan son yozilsa, 0 ni olib tashlaymiz (masalan "0500" -> 500)
                        const cleaned = val.replace(/^0+(?=\d)/, '');
                        setPenaltyRate(cleaned === '' ? '' : Number(cleaned));
                      }
                    }} 
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/50 outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20 font-mono pr-16"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    USD
                  </span>
                </div>
                <div className="mt-2 p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Example: If employee arrives 20 minutes late (5 min past 15 min grace period): 
                    <b> 5 min &times; {(Number(penaltyRate) || 0).toLocaleString()} USD = {(5 * (Number(penaltyRate) || 0)).toLocaleString()} USD</b> penalty will be deducted.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3-BLOK: HAFTALIK DAM OLISH KUNLARI */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  3. Weekly Scheduled Rest Days
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-600">
                Dam kunlarida kelganda jarima olinmaydi
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-3">
                Xodimlar dam oladigan kunlarni belgilang (Bir yoki bir nechta kunni tanlash mumkin):
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {daysOfWeek.map(d => {
                  const isChecked = restDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleRestDay(d.id)}
                      className={`py-3 px-2 rounded-xl text-xs font-black transition-all text-center border cursor-pointer flex flex-col items-center gap-1 ${
                        isChecked 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{d.label}</span>
                      <span className="text-[10px] font-normal opacity-90">
                        {isChecked ? 'Dam kuni ✓' : 'Work Day'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4-BLOK: MAXSUS BAYRAM VA TA'TIL KUNLARI */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  4. Rasmiy Bayram va Maxsus Dam Olish Sanalari
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                Yil davomidagi alohida dam sanalari
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-3">
                Yangi yil, Navro'z, Hayit yoki boshqa rasmiy bayram kunlarini qo'shing:
              </p>

              <div className="flex gap-2 max-w-md mb-3">
                <input 
                  type="date" 
                  value={newHolidayInput}
                  onChange={(e) => setNewHolidayInput(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50/50 dark:bg-slate-800/50 outline-none flex-1 font-bold dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddHoliday}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Sana qo'shish
                </button>
              </div>

              {customHolidays.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {customHolidays.map(h => (
                    <span 
                      key={h} 
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2 shadow-2xs"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>{h}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveHoliday(h)} 
                        className="text-rose-500 hover:text-rose-700 font-black cursor-pointer text-sm"
                        title="Remove"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Hali maxsus bayram sanalari qo'shilmagan.</p>
              )}
            </div>
          </div>

          {/* SAQLASH TUGMASI */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-2 active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Barcha Sozlamalarni Save Policy Changes"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
