import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, 
  CheckCircle2, 
  Clock, 
  X, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  User, 
  Building2, 
  Search, 
  Eye, 
  ShieldCheck, 
  Check,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export interface PhotoUpdateRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  position: string;
  currentPhotoUrl: string;
  newPhotoUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

interface PhotoRequestsManagerProps {
  onPhotoApproved?: (employeeId: string, newPhotoUrl: string) => void;
  onNavigateToJournal?: () => void;
}

export default function PhotoRequestsManager({ 
  onPhotoApproved, 
  onNavigateToJournal 
}: PhotoRequestsManagerProps) {
  const [requests, setRequests] = useState<PhotoUpdateRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reject modal state
  const [rejectModalReq, setRejectModalReq] = useState<PhotoUpdateRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Image zoom modal state
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/attendance/photo-requests');
      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error("fetchRequests error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 12000);
    return () => clearInterval(interval);
  }, []);

  const counts = useMemo(() => {
    return {
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      all: requests.length
    };
  }, [requests]);

  const branches = useMemo(() => {
    const list = Array.from(new Set(requests.map(r => r.branch).filter(Boolean)));
    return ['all', ...list];
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        r.employeeName.toLowerCase().includes(q) || 
        r.employeeId.toLowerCase().includes(q) ||
        r.position.toLowerCase().includes(q);
      const matchesBranch = branchFilter === 'all' || r.branch === branchFilter;
      return matchesStatus && matchesSearch && matchesBranch;
    });
  }, [requests, statusFilter, searchQuery, branchFilter]);

  const handleApprove = async (req: PhotoUpdateRequest) => {
    setProcessingId(req.id);
    try {
      const res = await fetch('/api/attendance/photo-request/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: req.id,
          employeeId: req.employeeId,
          action: 'approve',
          reviewerName: 'HR Menejer'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ ${req.employeeName} surati muvaffaqiyatli tasdiqlandi va Face ID etaloniga o'rnatildi!`);
        if (onPhotoApproved) {
          onPhotoApproved(req.employeeId, req.newPhotoUrl);
        }
        await fetchRequests();
      } else {
        showToast(data.message || "Approve Photoda xatolik yuz berdi");
      }
    } catch (err: any) {
      showToast(err.message || "Server xatoligi");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalReq) return;
    setProcessingId(rejectModalReq.id);
    try {
      const reason = rejectReason.trim() || "Yuz aniq ko'rinmagan yoki sifat talabga javob bermaydi";
      const res = await fetch('/api/attendance/photo-request/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: rejectModalReq.id,
          employeeId: rejectModalReq.employeeId,
          action: 'reject',
          reviewerName: 'HR Menejer',
          rejectionReason: reason
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`❌ ${rejectModalReq.employeeName} surati rad etildi. Employeega sabab yetkazildi.`);
        setRejectModalReq(null);
        setRejectReason('');
        await fetchRequests();
      } else {
        showToast(data.message || "Reject Photoda xatolik");
      }
    } catch (err: any) {
      showToast(err.message || "Server xatoligi");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (reqId: string) => {
    if (!confirm("Ushbu so'rov tarixini ro'yxatdan butunlay o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`/api/attendance/photo-request/${reqId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast("So'rov o'chirildi.");
        await fetchRequests();
      }
    } catch {
      showToast("O'chirishda xatolik");
    }
  };

  const REJECT_PRESETS = [
    "Yuz qorong'i tushgan, iltimos yaxshi yorug'likda rasmga tushing",
    "Yuz kameraga to'g'ri qaramagan yoki chetga burilgan",
    "Ko'zoynak, niqob yoki bosh kiyim yuzni to'sib turibdi",
    "Rasm sifati xira yoki piksellashgan",
    "Begona shaxs yoki fotosuratning surati yuklangan"
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans p-4 sm:p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-800 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
              <Camera className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Surat so'rovlari & Rasmlar keldi-ketdisi
            </h1>
            {counts.pending > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse">
                {counts.pending} ta yangi
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-500">
            Employeelar mobil ilovadan yuborgan Face ID fotosuratlari, tasdiqlash va qabul qilingan rasmlar jurnali
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onNavigateToJournal && (
            <button
              onClick={onNavigateToJournal}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Attendance Timesheet & Journalga qaytish</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={fetchRequests}
            disabled={isLoading}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : 'text-slate-500'}`} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* KPI Stats / Keldi-ketdi hisoboti */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div 
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-500/10 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Pending Review
            </span>
            {counts.pending > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono">
            {counts.pending}
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-0.5">
            Tasdiq kutayotgan yangi rasmlar
          </p>
        </div>

        <div 
          onClick={() => setStatusFilter('approved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'approved'
              ? 'bg-emerald-500/10 border-emerald-300 ring-2 ring-emerald-400'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Tasdiqlangan
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono">
            {counts.approved}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
            Face ID ga o'rnatilgan rasmlar
          </p>
        </div>

        <div 
          onClick={() => setStatusFilter('rejected')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'rejected'
              ? 'bg-rose-500/10 border-rose-300 ring-2 ring-rose-400'
              : 'bg-white border-slate-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-rose-900 mb-1">
            <span className="flex items-center gap-1.5">
              <X className="w-4 h-4 text-rose-600" />
              Rad etilgan
            </span>
          </div>
          <div className="text-2xl font-black text-rose-950 font-mono">
            {counts.rejected}
          </div>
          <p className="text-[11px] text-rose-700 font-medium mt-0.5">
            Talabga javob bermagan rasmlar
          </p>
        </div>

        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-purple-500/10 border-purple-300 ring-2 ring-purple-400'
              : 'bg-white border-slate-200 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-purple-900 mb-1">
            <span className="flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-purple-600" />
              Jami keldi-ketdi
            </span>
          </div>
          <div className="text-2xl font-black text-purple-950 font-mono">
            {counts.all}
          </div>
          <p className="text-[11px] text-purple-700 font-medium mt-0.5">
            Barcha surat aylanmasi
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {(['pending', 'all', 'approved', 'rejected'] as const).map((st) => {
            const labels: Record<string, string> = {
              pending: '⏳ Pending Review',
              all: 'Barcha keldi-ketdi',
              approved: '✓ Tasdiqlangan',
              rejected: '✕ Rad etilgan'
            };
            const c = counts[st];
            const isAct = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isAct 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{labels[st]}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  st === 'pending' && c > 0 
                    ? 'bg-rose-500 text-white' 
                    : isAct ? 'bg-slate-200 text-slate-800' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {c}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Branch Select */}
        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Employee ismi yoki ID bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>

          {branches.length > 2 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
            >
              <option value="all">All Branches</option>
              {branches.filter(b => b !== 'all').map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Content List */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
        {isLoading && requests.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-purple-600" />
            <p className="text-sm font-bold">Surat so'rovlari yuklanmoqda...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center text-2xl border border-purple-100 shadow-inner">
              📸
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {statusFilter === 'pending' 
                  ? "Kutilayotgan yangi surat so'rovlari yo'q" 
                  : "So'rovlar topilmadi"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {statusFilter === 'pending'
                  ? "Employeelar o'z profilidan yangi surat yuklaganida ular zudlik bilan shu yerda paydo bo'ladi."
                  : "Qidiruv parametrlarini o'zgartiring yoki filtrlarni tozalang."}
              </p>
            </div>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved';
            const isRejected = req.status === 'rejected';
            const isBusy = processingId === req.id;

            return (
              <div
                key={req.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all bg-white shadow-2xs ${
                  isPending
                    ? 'border-amber-300 ring-2 ring-amber-100'
                    : isApproved
                    ? 'border-emerald-200 bg-emerald-50/15'
                    : 'border-slate-200 bg-slate-50/40'
                }`}
              >
                {/* Top header row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                      <img
                        src={req.currentPhotoUrl || req.newPhotoUrl}
                        alt={req.employeeName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>{req.employeeName}</span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                          {req.employeeId}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {req.branch || 'Headquarters'} &bull; {req.position || 'Employee'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(req.submittedAt).toLocaleString('uz-UZ', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>

                    {isPending && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        Pending Review
                      </span>
                    )}

                    {isApproved && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        Tasdiqlangan
                      </span>
                    )}

                    {isRejected && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                        <X className="w-3.5 h-3.5 text-rose-700" />
                        Rad etilgan
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(req.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      title="Tarixdan o'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Visual side-by-side comparison */}
                <div className="py-4 my-3 bg-gradient-to-r from-slate-50 via-purple-50/20 to-slate-50 rounded-xl px-4 border border-slate-100 flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10">
                  {/* Current / Old Photo */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      Joriy etalon rasm
                    </span>
                    <div 
                      onClick={() => req.currentPhotoUrl && setZoomImage({ url: req.currentPhotoUrl, title: `${req.employeeName} (Joriy rasm)` })}
                      className="w-28 h-36 rounded-2xl overflow-hidden bg-white border border-slate-300 shadow-sm relative group cursor-pointer"
                    >
                      {req.currentPhotoUrl ? (
                        <>
                          <img
                            src={req.currentPhotoUrl}
                            alt="Joriy rasm"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-5 h-5" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center text-xs font-bold bg-slate-100">
                          <User className="w-6 h-6 mb-1 text-slate-300" />
                          Oldingi rasm yo'q
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Hozirgi etalon</span>
                  </div>

                  {/* Transition Arrow */}
                  <div className="flex flex-col items-center text-purple-600">
                    <span className="text-2xl font-black hidden md:block">➔</span>
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 uppercase tracking-widest mt-1">
                      Almashmoqda
                    </span>
                  </div>

                  {/* New Proposed Photo */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Yangi yuborilgan rasm
                    </span>
                    <div 
                      onClick={() => req.newPhotoUrl && setZoomImage({ url: req.newPhotoUrl, title: `${req.employeeName} (Yangi so'ralgan rasm)` })}
                      className="w-28 h-36 rounded-2xl overflow-hidden bg-white border-3 border-purple-500 shadow-md ring-4 ring-purple-100 relative group cursor-pointer"
                    >
                      <img
                        src={req.newPhotoUrl}
                        alt="Yangi rasm"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye className="w-5 h-5" />
                      </div>
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-purple-600 text-white text-[9px] font-black uppercase">
                        Yangi
                      </span>
                    </div>
                    <span className="text-[11px] text-purple-700 font-bold">Yangi Face ID uchun</span>
                  </div>
                </div>

                {/* Status info bar */}
                {isApproved && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Ushbu rasm <strong>Face ID etalon bazasiga muvaffaqiyatli biriktirildi</strong>. Employee endi shu rasm orqali bemalol davomat qila oladi.
                    </span>
                    {req.reviewedBy && (
                      <span className="text-[11px] font-bold text-emerald-700 whitespace-nowrap ml-2">
                        {req.reviewedBy} &bull; {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString('uz-UZ') : ''}
                      </span>
                    )}
                  </div>
                )}

                {isRejected && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Rad etildi: </span>
                        <span>{req.rejectionReason || "Talabga mos kelmagani sababli rad etildi."}</span>
                        {req.reviewedBy && (
                          <span className="text-[11px] font-semibold text-rose-600 block mt-0.5">
                            Ko'rib chiquvchi: {req.reviewedBy} ({req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString('uz-UZ') : ''})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons for Pending */}
                {isPending && (
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setRejectModalReq(req);
                        setRejectReason('');
                      }}
                      className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject Photo</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleApprove(req)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      {isBusy ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Tasdiqlanmoqda...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Approve Photo & Yangi rasmga almashtirish</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                  <X className="w-4 h-4" />
                </span>
                Rasmni rad etish
              </h3>
              <button 
                onClick={() => setRejectModalReq(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>{rejectModalReq.employeeName}</strong> yuborgan rasmni nima sababdan rad etayotganingizni ko'rsating. Ushbu sabab xodimning ilovasida ko'rsatiladi:
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Tayyor sabablar (Birini tanlang):
              </label>
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                {REJECT_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReason(p)}
                    className="text-left text-xs p-2 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-800 text-slate-700 transition-colors border border-slate-100 cursor-pointer"
                  >
                    &bull; {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Yoki o'zingiz yozing:
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reject Photo sababini batafsil yozing..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={processingId === rejectModalReq.id}
                onClick={handleRejectConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {processingId === rejectModalReq.id ? "Rad etilmoqda..." : "Reject Photoni tasdiqlash"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div 
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-lg w-full bg-white rounded-3xl p-4 shadow-2xl space-y-3 cursor-default"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-800">{zoomImage.title}</h4>
              <button 
                onClick={() => setZoomImage(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
              <img
                src={zoomImage.url}
                alt={zoomImage.title}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-center">
              <span className="text-[11px] text-slate-400 font-medium">
                Yuzning yorug'ligi va sifatini batafsil ko'rib chiqing
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
