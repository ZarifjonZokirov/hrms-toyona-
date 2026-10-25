import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { 
  getFirebaseEmployees, 
  getFirebaseGeozones, 
  recordCheckIn, 
  AttendanceRecord
} from '../firebase';
import { Employee } from './Employees';
import { BranchGeozone } from './BranchGeozones';
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  RefreshCw, 
  ShieldCheck, 
  User, 
  Building2, 
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';
import { ToyonaSvg } from './Logo';

// Haversine formula to compute distance in meters between two lat/lon coordinates
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Smart Face-Centering Avatar: Automatically detects the face position inside the photo
// and aligns the object-position so that the face is perfectly centered in the circle
function SmartFaceAvatar({ 
  src, 
  alt, 
  className = "w-11 h-11 rounded-full object-cover border border-slate-600",
  modelsLoaded = false 
}: { 
  src: string; 
  alt: string; 
  className?: string;
  modelsLoaded?: boolean;
}) {
  const [objectPosition, setObjectPosition] = useState<string>("50% 35%"); // Default focuses higher on face
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src || !modelsLoaded) return;
    let isCancelled = false;

    async function detectFacePosition() {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });

        if (img.width && img.height) {
          const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions());
          if (detection && !isCancelled) {
            const box = detection.box;
            // Calculate center of face in percentage
            const faceCenterX = ((box.x + box.width / 2) / img.width) * 100;
            const faceCenterY = ((box.y + box.height / 2) / img.height) * 100;
            setObjectPosition(`${faceCenterX.toFixed(1)}% ${faceCenterY.toFixed(1)}%`);
          }
        }
      } catch {
        // Fallback to top-center focus
        if (!isCancelled) setObjectPosition("50% 35%");
      }
    }

    detectFacePosition();
    return () => { isCancelled = true; };
  }, [src, modelsLoaded]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      style={{ objectPosition }}
    />
  );
}

export default function TelegramAttendance() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [geozones, setGeozones] = useState<BranchGeozone[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  // Status & steps
  const [step, setStep] = useState<'select' | 'geo' | 'camera' | 'success' | 'error'>('select');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Modellar yuklanmoqda...');
  const [errorMessage, setErrorMessage] = useState('');
  const [successRecord, setSuccessRecord] = useState<AttendanceRecord | null>(null);

  // Geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [matchedGeozone, setMatchedGeozone] = useState<BranchGeozone | null>(null);
  const [distanceToBranch, setDistanceToBranch] = useState<number | null>(null);
  const [isVerifyingGeo, setIsVerifyingGeo] = useState(false);

  // Camera & Face Verification
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [matchScore, setMatchScore] = useState<number | null>(null);

  // 1. Initial Load: face-api models + Firebase data
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        setStatusMessage("Face ID neyron to'ri yuklanmoqda...");
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        if (!isMounted) return;
        setModelsLoaded(true);
        setStatusMessage("Xodimlar ma'lumotlari yuklanmoqda...");

        // Load employees and geozones directly from Firebase
        const [empList, gzList] = await Promise.all([
          getFirebaseEmployees(),
          getFirebaseGeozones()
        ]);

        if (!isMounted) return;
        setEmployees(empList.filter(e => e.status === 'active' || !e.status));
        setGeozones(gzList);
        setStatusMessage("Tayyor!");

        // Check if employee is passed via Telegram WebApp initData or URL search param
        const urlParams = new URLSearchParams(window.location.search);
        const staffIdParam = urlParams.get('staffId') || urlParams.get('id');
        if (staffIdParam) {
          const found = empList.find(e => 
            (e.staffId && e.staffId.toLowerCase() === staffIdParam.toLowerCase()) || 
            (e.id && String(e.id) === staffIdParam)
          );
          if (found) {
            handleSelectEmployee(found, gzList);
          }
        }
      } catch (err: any) {
        console.error("Initialization error:", err);
        setErrorMessage("Modellarni yuklashda xatolik yuz berdi. Sahifani qayta yuklang.");
      }
    }

    init();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  // 2. Select Employee and verify Geolocation
  const handleSelectEmployee = (emp: Employee, customGeozones?: BranchGeozone[]) => {
    setSelectedEmp(emp);
    setStep('geo');
    verifyLocation(emp, customGeozones || geozones);
  };

  const verifyLocation = (emp: Employee, gzList: BranchGeozone[]) => {
    setIsVerifyingGeo(true);
    setErrorMessage('');

    if (!navigator.geolocation) {
      setErrorMessage("Qurilmangizda GPS (geolokatsiya) qo'llab-quvvatlanmaydi.");
      setIsVerifyingGeo(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserLocation({ lat: uLat, lng: uLng });

        // Match with branch geozone
        const clean = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanEmpBranch = clean(emp.branch || '');

        let matched = gzList.find(gz => clean(gz.name) === cleanEmpBranch);
        if (!matched) {
          matched = gzList.find(gz => {
            const cleanG = clean(gz.name);
            return cleanG.includes(cleanEmpBranch) || cleanEmpBranch.includes(cleanG);
          });
        }
        if (!matched) {
          const firstWord = (emp.branch || '').trim().split(/\s+/)[0]?.toLowerCase();
          if (firstWord && firstWord.length > 2) {
            matched = gzList.find(gz => gz.name.toLowerCase().includes(firstWord));
          }
        }

        if (!matched || !matched.lat || !matched.lon) {
          // Eng yaqin rasmiy geozonani tekshiramiz
          let closestZone: BranchGeozone | null = null;
          let minDistance = Infinity;

          for (const gz of gzList) {
            if (gz.lat && gz.lon) {
              const d = calculateDistanceMeters(uLat, uLng, gz.lat, gz.lon);
              if (d < minDistance) {
                minDistance = d;
                closestZone = gz;
              }
            }
          }

          if (closestZone && minDistance <= (closestZone.radius || 150)) {
            matched = closestZone;
          } else {
            setIsVerifyingGeo(false);
            const distMsg = Number.isFinite(minDistance) ? ` (Eng yaqin filialgacha: ${Math.round(minDistance)} metr)` : '';
            setErrorMessage(`Xavfsizlik talabi: Siz belgilangan filial hududidan tashqaridasiz${distMsg}. Davomat faqat rasmiy filial hududi ichida olinadi.`);
            return;
          }
        }

        const dist = calculateDistanceMeters(uLat, uLng, matched.lat, matched.lon);
        setMatchedGeozone(matched);
        setDistanceToBranch(Math.round(dist));
        setIsVerifyingGeo(false);

        const allowedRadius = matched.radius || 150;
        if (dist <= allowedRadius) {
          // Within branch area
          startCameraStep();
        } else {
          setErrorMessage(`Siz filial hududidan tashqaridasiz! Filialgacha masofa: ${Math.round(dist)} metr. Ruxsat etilgan radius: ${allowedRadius} metr.`);
        }
      },
      (err) => {
        console.warn("Geo error:", err);
        setIsVerifyingGeo(false);
        setErrorMessage("GPS joylashuvni aniqlab bo'lmadi. Iltimos, brauzerda geolokatsiyaga ruxsat bering.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 3. Start Camera
  const startCameraStep = async () => {
    setStep('camera');
    setErrorMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsScanning(true);
      startFaceMatcher();
    } catch (err: any) {
      console.error("Camera access error:", err);
      setErrorMessage("Kameraga ulanib bo'lmadi. Iltimos, kameradan foydalanishga ruxsat bering.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // 4. Face Recognition Matching Loop
  const startFaceMatcher = async () => {
    if (!selectedEmp) return;

    // Load reference face from employee's photo
    let referenceDescriptor: Float32Array | null = null;

    if (selectedEmp.avatarUrl) {
      try {
        const refImg = await faceapi.fetchImage(selectedEmp.avatarUrl);
        const refDetection = await faceapi
          .detectSingleFace(refImg, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (refDetection) {
          referenceDescriptor = refDetection.descriptor;
        }
      } catch (e) {
        console.warn("Could not compute reference descriptor from avatarUrl:", e);
      }
    }

    let attempts = 0;
    const maxAttempts = 50;

    const interval = setInterval(async () => {
      attempts++;
      setScanProgress(Math.min(95, Math.round((attempts / 25) * 100)));

      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        return;
      }

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          if (referenceDescriptor) {
            // Compute Euclidean distance between current face and reference
            const distance = faceapi.euclideanDistance(detection.descriptor, referenceDescriptor);
            const confidence = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
            setMatchScore(confidence);

            // Match threshold: distance < 0.55 means identical person
            if (distance < 0.55) {
              clearInterval(interval);
              stopCamera();
              completeAttendance(selectedEmp, confidence);
              return;
            }
          } else {
            // Agar xodimning bazada rasmiy Face ID namunasi bo'lmasa, soxta davomatni oldini olish uchun rad etiladi
            clearInterval(interval);
            stopCamera();
            setErrorMessage("Xavfsizlik ogohlantirishi: Tizimda sizning rasmiy Face ID namunaviy suratingiz mavjud emas. Iltimos, kadrlar bo'limiga murojaat qilib profilingizga rasm biriktiring.");
            setStep('error');
            return;
          }
        }
      } catch (err) {
        console.error("Frame detection error:", err);
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        stopCamera();
        setErrorMessage("Yuz aniqlanmadi yoki mos kelmadi. Iltimos, yuzingizni yorug'roq joyda kameraga to'g'rilab qayta urinib ko'ring.");
      }
    }, 300);
  };

  // 5. Save attendance record directly into Firebase Firestore
  const completeAttendance = async (emp: Employee, confidence: number) => {
    setStatusMessage("Davomat qayd qilinmoqda...");
    try {
      const res = await recordCheckIn({
        employeeId: emp.id || emp.staffId || 'emp',
        employeeName: emp.fullName,
        branch: emp.branch || 'Bosh ofis',
        department: emp.department || 'Boshqaruv'
      });

      if (res.success) {
        setSuccessRecord(res.record || null);
        setStep('success');
      } else {
        setErrorMessage(res.message);
        setStep('error');
      }
    } catch (err: any) {
      console.error("Attendance save error:", err);
      setErrorMessage("Davomatni saqlashda xatolik yuz berdi: " + (err.message || 'Server xatosi'));
      setStep('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="p-4 bg-slate-800/80 backdrop-blur-md border-b border-slate-700/60 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00A651] to-emerald-400 flex items-center justify-center text-white shadow-md">
            <ToyonaSvg className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>TOYONA SAVDO</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Face ID
              </span>
            </h1>
            <p className="text-xs text-slate-400">Telegram Mobil Davomat Tizimi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {modelsLoaded ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Onlayn
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold bg-amber-950/60 border border-amber-800/50 px-2.5 py-1 rounded-full">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Yuklanmoqda...
            </span>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 flex flex-col justify-center">
        {/* Step 1: Select Employee */}
        {step === 'select' && (
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <User className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-white">Xodimni tanlang</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Davomatdan o'tish uchun o'z ism-familiyangizni tanlang
              </p>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <button
                    key={emp.id || emp.staffId}
                    onClick={() => handleSelectEmployee(emp)}
                    className="w-full text-left p-3.5 rounded-xl bg-slate-700/50 hover:bg-emerald-950/40 border border-slate-600/60 hover:border-emerald-500/50 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <SmartFaceAvatar 
                        src={emp.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'} 
                        alt={emp.fullName}
                        className="w-11 h-11 rounded-full object-cover border border-slate-600 group-hover:border-emerald-500 transition-colors"
                        modelsLoaded={modelsLoaded}
                      />
                      <div>
                        <div className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                          {emp.fullName}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{emp.position || 'Xodim'}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">{emp.branch}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  {statusMessage}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Geolocation Verification */}
        {step === 'geo' && (
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
              <MapPin className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Geolokatsiya tekshirilmoqda</h2>
              <p className="text-xs text-slate-400 mt-1">
                {selectedEmp?.fullName} ({selectedEmp?.branch})
              </p>
            </div>

            {isVerifyingGeo ? (
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 flex items-center justify-center gap-3 text-xs text-slate-300">
                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>GPS koordinatalaringiz aniqlanmoqda...</span>
              </div>
            ) : errorMessage ? (
              <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-left space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-rose-300 leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => selectedEmp && verifyLocation(selectedEmp, geozones)}
                    className="flex-1 py-2 text-xs font-bold text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    Qayta tekshirish
                  </button>
                  <button
                    onClick={() => setStep('select')}
                    className="py-2 px-4 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Step 3: Camera & Face Scanning */}
        {step === 'camera' && (
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-5">
            <div className="text-center">
              <h2 className="text-base font-bold text-white flex items-center justify-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span>Yuzingizni kameraga to'g'rilang</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedEmp?.fullName} • {selectedEmp?.branch}
              </p>
            </div>

            {/* Video Viewfinder */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border-2 border-slate-700 shadow-inner">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Scanning Overlay Animation */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-60 border-2 border-dashed border-emerald-400/70 rounded-3xl relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse"></div>
                </div>
              </div>

              {/* Progress & Confidence */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md text-[11px] font-bold text-white">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  Skanerlanmoqda: {scanProgress}%
                </span>
                {matchScore !== null && (
                  <span>Moslik: {matchScore}%</span>
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={startCameraStep}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Qayta skanerlash
              </button>
              <button
                onClick={() => { stopCamera(); setStep('select'); }}
                className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Chiqish
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success Message */}
        {step === 'success' && (
          <div className="bg-slate-800/90 rounded-2xl border border-emerald-500/40 p-6 shadow-xl space-y-6 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Davomat Qabul Qilindi!</h2>
              <p className="text-xs text-emerald-400 font-semibold mt-1">
                Yuzingiz muvaffaqiyatli tanildi va Firebase bazasiga yozildi
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/60 text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Xodim:</span>
                <span className="font-bold text-white">{selectedEmp?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Filial:</span>
                <span className="font-bold text-white">{selectedEmp?.branch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sana:</span>
                <span className="font-mono text-slate-200">{new Date().toLocaleDateString('uz-UZ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kelgan vaqti:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <button
              onClick={() => { setStep('select'); setSelectedEmp(null); }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
            >
              Yangi davomat qilish
            </button>
          </div>
        )}

        {/* Step 5: Error State */}
        {step === 'error' && (
          <div className="bg-slate-800/90 rounded-2xl border border-rose-500/40 p-6 shadow-xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Davomat Saqlanmadi</h2>
              <p className="text-xs text-rose-300 mt-1 max-w-xs mx-auto">
                {errorMessage}
              </p>
            </div>

            <button
              onClick={() => setStep('select')}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition-all"
            >
              Boshidan boshlash
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-[11px] text-slate-500 border-t border-slate-800">
        Toyona Savdo • Barcha huquqlar himoyalangan © 2026
      </footer>
    </div>
  );
}
