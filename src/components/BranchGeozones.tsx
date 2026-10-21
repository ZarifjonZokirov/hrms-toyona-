import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Plus, 
  Map as MapIcon, 
  Lock, 
  Unlock, 
  PlusCircle, 
  Trash2, 
  Search,
  Check,
  FileText,
  Pencil,
  Crosshair,
  XCircle,
  Loader2
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { exportToExcel, exportToPDF } from '../lib/export';
import { ExportButtons } from './ExportButtons';
import { 
  getFirebaseGeozones, 
  saveFirebaseGeozone,
  deleteFirebaseGeozone
} from '../firebase';

// Fix Leaflet's default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom SVG Icons for active vs inactive branches with exact tip anchor
const activeBranchIcon = L.divIcon({
  className: '',
  html: `
    <div style="position: relative; width: 32px; height: 42px; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">
      <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16C0 27.5 16 42 16 42C16 42 32 27.5 32 16C32 7.163 24.837 0 16 0Z" fill="#ED1C24" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="16" cy="15" r="5.5" fill="#FFFFFF"/>
      </svg>
      <div style="position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%); width: 8px; height: 3px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(1px);"></div>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42]
});

const defaultBranchIcon = L.divIcon({
  className: '',
  html: `
    <div style="position: relative; width: 26px; height: 35px; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.25));">
      <svg width="26" height="35" viewBox="0 0 26 35" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 0C5.82 0 0 5.82 0 13C0 22.5 13 35 13 35C13 35 26 22.5 26 13C26 5.82 20.18 0 13 0Z" fill="#00A651" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="13" cy="12" r="4.5" fill="#FFFFFF"/>
      </svg>
    </div>
  `,
  iconSize: [26, 35],
  iconAnchor: [13, 35],
  popupAnchor: [0, -35]
});

declare global {
  interface Window {
    ymaps: any;
  }
}

export interface BranchGeozone {
  id: string;
  name: string;
  description?: string;
  lat: number;
  lon: number;
  radius: number; // in meters
  address: string;
  isCustom?: boolean;
  isNewUnsaved?: boolean;
  updatedAt?: string;
}

export const DEFAULT_GEOZONES: BranchGeozone[] = [
  {
    id: 'branch-1',
    name: 'Turkiston filiali',
    description: 'Qo\'qon markazidagi bosh savdo do\'koni. Mo\'ljal: Markaziy xiyobon ro\'parasi',
    lat: 40.5283,
    lon: 70.9425,
    radius: 270,
    address: 'Qo\'qon shahar, Turkiston ko\'chasi, 45-uy'
  },
  {
    id: 'branch-2',
    name: 'Navoiy filiali',
    description: 'A.Navoiy shoh ko\'chasidagi supermarket. Mo\'ljal: Markaziy bozor yonida',
    lat: 40.5312,
    lon: 70.9388,
    radius: 500,
    address: 'Qo\'qon shahar, A.Navoiy shoh ko\'chasi, 12-uy'
  },
  {
    id: 'branch-3',
    name: 'Istiqlol (Gorod) filiali',
    description: 'Shahar markazi, Istiqlol savdo majmuasi 1-qavati',
    lat: 40.5345,
    lon: 70.9450,
    radius: 100,
    address: 'Qo\'qon shahar, Istiqlol ko\'chasi, 88-uy'
  },
  {
    id: 'branch-4',
    name: 'Mingtut filiali',
    description: 'Mingtut mavzesidagi savdo markazi, aholi gavjum nuqta',
    lat: 40.5200,
    lon: 70.9350,
    radius: 150,
    address: 'Qo\'qon shahar, Mingtut mavzesi, 5-savdo markazi'
  },
  {
    id: 'branch-5',
    name: 'Yakkatut filiali',
    description: 'Yakkatut ko\'chasidagi oziq-ovqat va maishiy mahsulotlar savdo bo\'limi',
    lat: 40.5400,
    lon: 70.9500,
    radius: 100,
    address: 'Qo\'qon shahar, Yakkatut ko\'chasi, 10-uy'
  },
  {
    id: 'branch-6',
    name: 'Bosh ofis',
    description: 'Toyona Savdo bosh boshqarmasi, ma\'muriyat va omborxona',
    lat: 40.55441164458834,
    lon: 71.10088818840296,
    radius: 500,
    address: 'Qo\'qon shahar, Markaziy bino, Bosh ofis'
  },
  {
    id: 'branch-7',
    name: 'Pop filiali',
    description: 'Pop shahri markazidagi rasmiy savdo filiali',
    lat: 40.8750,
    lon: 71.1070,
    radius: 120,
    address: 'Pop shahar, Markaziy ko\'cha, 18-uy'
  },
  {
    id: 'branch-8',
    name: 'Furqat filiali',
    description: 'Furqat tumani markaziy do\'koni',
    lat: 40.5300,
    lon: 70.7600,
    radius: 100,
    address: 'Furqat tumani, Navbahor shaharchasi'
  },
  {
    id: 'branch-9',
    name: 'Buvayda filiali',
    description: 'Buvayda tumani Ibrat MFY savdo nuqtasi',
    lat: 40.5800,
    lon: 71.0500,
    radius: 100,
    address: 'Buvayda tumani, Ibrat MFY'
  },
  {
    id: 'branch-10',
    name: 'Yangiqo\'rg\'on (Buvayda) filiali',
    description: 'Yangiqo\'rg\'on markazidagi savdo shoxobchasi',
    lat: 40.5900,
    lon: 71.0700,
    radius: 100,
    address: 'Buvayda, Yangiqo\'rg\'on markazi'
  },
  {
    id: 'branch-11',
    name: 'Yaypan filiali',
    description: 'Yaypan shahri markazi, Mustaqillik shoh ko\'chasidagi do\'kon',
    lat: 40.3700,
    lon: 70.8150,
    radius: 120,
    address: 'O\'zbekiston tumani, Yaypan shahar, Mustaqillik shoh ko\'chasi'
  },
  {
    id: 'branch-12',
    name: 'Marg\'ilon filiali',
    description: 'Marg\'ilon shahridagi zamonaviy supermarket va chakana savdo markazi. Mo\'ljal: Ipakchilar xiyoboni ro\'parasi',
    lat: 40.4720,
    lon: 71.7140,
    radius: 120,
    address: 'Marg\'ilon shahar, B.Marg\'inoniy ko\'chasi, 42-uy'
  },
  {
    id: 'branch-13',
    name: 'Toshkent Chilonzor filiali',
    description: 'Toshkent shahridagi yirik savdo majmuasi va tezkor logistika tarqatish markazi. Mo\'ljal: Bunyodkor stadioni yaqinida',
    lat: 41.2825,
    lon: 69.2045,
    radius: 150,
    address: 'Toshkent shahar, Chilonzor tumani, Bunyodkor shoh ko\'chasi, 15-uy'
  }
];

export function deduplicateGeozones(items: BranchGeozone[]): BranchGeozone[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const result: BranchGeozone[] = [];

  for (const item of items) {
    const rawId = item.id || (item as any).firestoreId;
    const cleanId = rawId ? String(rawId).trim() : '';
    const normName = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    if (cleanId && seenIds.has(cleanId)) continue;
    if (normName && seenNames.has(normName)) continue;

    if (cleanId) seenIds.add(cleanId);
    if (normName) seenNames.add(normName);

    result.push({
      ...item,
      id: cleanId || `branch-gen-${result.length + 1}`
    });
  }
  return result;
}

function loadSavedLocalGeozones(): BranchGeozone[] {
  try {
    const raw = localStorage.getItem('toyonasavdo_branch_geozones');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Eski Bosh ofis test koordinatasini yangi Bosh ofis koordinatasiga avtomatik to'g'rilash
        const fixed = parsed.map((b: BranchGeozone) => {
          if (b.id === 'branch-6' && Math.abs(Number(b.lat) - 40.563128) < 0.0001 && Number(b.radius) === 260) {
            return {
              ...b,
              lat: 40.55441164458834,
              lon: 71.10088818840296,
              radius: 500
            };
          }
          return b;
        });
        return deduplicateGeozones(fixed);
      }
    }
  } catch {}
  return deduplicateGeozones(DEFAULT_GEOZONES);
}

export default function BranchGeozones() {
  // Load initial geozones (localStorage + DEFAULT_GEOZONES)
  const [geozones, setGeozones] = useState<BranchGeozone[]>(() => loadSavedLocalGeozones());
  const [isLoading, setIsLoading] = useState(true);

  const [selectedBranchId, setSelectedBranchId] = useState<string>(DEFAULT_GEOZONES[0].id);

  // Sync with Backend API & Firebase on mount
  useEffect(() => {
    async function initData() {
      try {
        const localSaved = loadSavedLocalGeozones();
        let fetchedGeozones: BranchGeozone[] = [];
        try {
          const res = await fetch('/api/geozones');
          if (res.ok) {
            const apiData = await res.json();
            if (Array.isArray(apiData) && apiData.length > 0) {
              fetchedGeozones = apiData;
            }
          }
        } catch (apiErr) {
          console.warn("API geozones fetch notice:", apiErr);
        }

        if (fetchedGeozones.length === 0) {
          const fbGeozones = await getFirebaseGeozones();
          if (fbGeozones && fbGeozones.length > 0) {
            fetchedGeozones = fbGeozones;
          }
        }

        const map = new Map<string, BranchGeozone>();
        DEFAULT_GEOZONES.forEach(def => map.set(def.id, { ...def }));
        localSaved.forEach(loc => map.set(loc.id, { ...map.get(loc.id), ...loc }));

        if (fetchedGeozones.length > 0) {
          fetchedGeozones.forEach(item => {
            const rawId = item.id || (item as any).firestoreId || '';
            const normName = (item.name || '').trim().toLowerCase();
            let targetKey = rawId;
            if (!map.has(targetKey)) {
              for (const [k, existing] of map.entries()) {
                if ((existing.name || '').trim().toLowerCase() === normName) {
                  targetKey = k;
                  break;
                }
              }
            }
            const prev = map.get(targetKey);
            // Eski default Bosh ofis koordinatasi kelib qolsa, foydalanuvchi o'zgartirgan yangi koordinatani ustidan yozib yubormaslik:
            const isStaleDefaultBoshOfis =
              targetKey === 'branch-6' &&
              Math.abs(Number(item.lat) - 40.563128) < 0.0001 &&
              Number(item.radius) === 260;

            if (!isStaleDefaultBoshOfis) {
              map.set(targetKey || `branch-${map.size + 1}`, {
                ...prev,
                ...item,
                id: targetKey || item.id,
                description: item.description || prev?.description || '',
                lat: Number(item.lat) || prev?.lat || 40.5283,
                lon: Number(item.lon) || prev?.lon || 70.9425,
                radius: Number(item.radius) || prev?.radius || 100
              });
            }
          });
        }

        const merged = deduplicateGeozones(Array.from(map.values()));
        setGeozones(merged);
        try {
          localStorage.setItem('toyonasavdo_branch_geozones', JSON.stringify(merged));
        } catch {}

        const first = merged.find(b => b.id === selectedBranchId) || merged[0] || DEFAULT_GEOZONES[0];
        setSelectedBranchId(first.id);
        setEditName(first.name);
        setEditDescription(first.description || '');
        setEditLat(first.lat);
        setEditLon(first.lon);
        setEditRadius(first.radius);
        setEditAddress(first.address);
      } catch (error) {
        console.warn("Geozones sync notice:", error);
        setGeozones(loadSavedLocalGeozones());
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, []);

  const currentBranch = geozones.find(b => b.id === selectedBranchId) || geozones[0] || DEFAULT_GEOZONES[0];

  // Locking state: true = frozen / view mode; false = edit mode
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const isLockedRef = useRef<boolean>(true);
  isLockedRef.current = isLocked;

  // Search filter for branches list
  const [searchBranchQuery, setSearchBranchQuery] = useState<string>('');

  // Modals state
  const [showNewBranchModal, setShowNewBranchModal] = useState<boolean>(false);
  const [showDeleteBranchModal, setShowDeleteBranchModal] = useState<boolean>(false);

  // New branch form state
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [newBranchDescription, setNewBranchDescription] = useState<string>('');
  const [newBranchAddress, setNewBranchAddress] = useState<string>('');
  const [newBranchRadius, setNewBranchRadius] = useState<number>(100);

  // Current editing values
  const [editName, setEditName] = useState<string>(currentBranch?.name || '');
  const [editDescription, setEditDescription] = useState<string>(currentBranch?.description || '');
  const [editLat, setEditLat] = useState<number>(currentBranch?.lat || 40.5283);
  const [editLon, setEditLon] = useState<number>(currentBranch?.lon || 70.9425);
  const [editRadius, setEditRadius] = useState<number>(currentBranch?.radius || 100);
  const [editAddress, setEditAddress] = useState<string>(currentBranch?.address || '');

  // Status & Feedback
  const [isSavingGeozone, setIsSavingGeozone] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Leaflet map container and elements refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const activeCircleRef = useRef<L.Circle | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || leafletMapRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [editLat, editLon],
        zoom: 16,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      map.on('click', (e: L.LeafletMouseEvent) => {
        if (!isLockedRef.current) {
          setEditLat(e.latlng.lat);
          setEditLon(e.latlng.lng);
        }
      });

      leafletMapRef.current = map;
    } catch (err: any) {
      console.error("Leaflet init error:", err);
      setMapError("Xaritani yuklashda xatolik yuz berdi");
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update map markers, circle and pan when branch or coordinates change
  useEffect(() => {
    const map = leafletMapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Pan map to current branch
    map.setView([editLat, editLon], map.getZoom(), { animate: true });

    // Clear old markers
    markersLayer.clearLayers();

    // Render branch markers
    geozones.forEach((branch) => {
      const isSelected = branch.id === selectedBranchId;
      const bLat = isSelected ? editLat : branch.lat;
      const bLon = isSelected ? editLon : branch.lon;

      const marker = L.marker([bLat, bLon], {
        icon: isSelected ? activeBranchIcon : defaultBranchIcon,
        draggable: !isLocked && isSelected,
        title: branch.name
      });

      marker.on('click', () => {
        selectBranch(branch.id, geozones);
      });

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setEditLat(pos.lat);
        setEditLon(pos.lng);
      });

      marker.addTo(markersLayer);
    });

    // Render active geozone radius circle
    if (activeCircleRef.current) {
      activeCircleRef.current.remove();
      activeCircleRef.current = null;
    }

    const circle = L.circle([editLat, editLon], {
      radius: editRadius,
      color: isLocked ? '#00A651' : '#ED1C24',
      fillColor: isLocked ? '#00A651' : '#ED1C24',
      fillOpacity: 0.25,
      weight: 2
    }).addTo(map);

    activeCircleRef.current = circle;
  }, [geozones, selectedBranchId, editLat, editLon, editRadius, isLocked]);

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // Explicit branch selection handler
  const selectBranch = (branchId: string, customList?: BranchGeozone[]) => {
    const list = customList || geozones;
    const b = list.find(item => item.id === branchId) || list[0];
    if (!b) return;

    setSelectedBranchId(b.id);
    setEditName(b.name);
    setEditDescription(b.description || '');
    setEditLat(b.lat);
    setEditLon(b.lon);
    setEditRadius(b.radius);
    setEditAddress(b.address);

    const shouldBeLocked = !b.isNewUnsaved;
    setIsLocked(shouldBeLocked);
    isLockedRef.current = shouldBeLocked;
  };

  // Start editing
  const handleStartEditing = () => {
    setIsLocked(false);
    isLockedRef.current = false;
  };

  // Cancel editing (revert to stored state)
  const handleCancelEditing = () => {
    const b = geozones.find(item => item.id === selectedBranchId) || geozones[0];
    setEditName(b.name);
    setEditDescription(b.description || '');
    setEditAddress(b.address || '');
    setEditLat(b.lat);
    setEditLon(b.lon);
    setEditRadius(b.radius);
    setIsLocked(true);
    isLockedRef.current = true;
  };

  // Update radius
  const handleRadiusChange = (newRadius: number) => {
    if (isLocked) {
      setIsLocked(false);
      isLockedRef.current = false;
    }
    const clamped = Math.max(20, Math.min(1000, newRadius));
    setEditRadius(clamped);
  };

  // Update coordinates
  const handleCoordsChange = (lat: number, lon: number) => {
    setEditLat(lat);
    setEditLon(lon);
  };

  // Single unified Save handler
  const handleSaveAndLockGeozone = async () => {
    if (isSavingGeozone) return;
    setIsSavingGeozone(true);
    const trimmedName = editName.trim() || currentBranch.name;
    const trimmedDesc = editDescription.trim();
    const trimmedAddress = editAddress.trim();

    try {
      const updated = geozones.map(b => {
        if (b.id === selectedBranchId) {
          return {
            ...b,
            name: trimmedName,
            description: trimmedDesc,
            lat: editLat,
            lon: editLon,
            radius: editRadius,
            address: trimmedAddress,
            isNewUnsaved: false,
            updatedAt: new Date().toISOString()
          };
        }
        return b;
      });

      setGeozones(updated);
      try {
        localStorage.setItem('toyonasavdo_branch_geozones', JSON.stringify(updated));
      } catch {}

      // Save to Backend API (Firestore REST + server memory) and Client Firebase
      const branchToSave = updated.find(b => b.id === selectedBranchId);
      if (branchToSave) {
        await Promise.allSettled([
          fetch('/api/branch-geozones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(branchToSave)
          }),
          saveFirebaseGeozone(branchToSave)
        ]);
      }

      // Freeze in place
      setIsLocked(true);
      isLockedRef.current = true;

      setSaveSuccess(`"${trimmedName}" filiali parametrlari muvaffaqiyatli saqlandi!`);
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      console.error("Save geozone error:", err);
      showError("Filialni saqlashda xatolik yuz berdi!");
    } finally {
      setIsSavingGeozone(false);
    }
  };

  // Create new branch
  const handleCreateNewBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) {
      showError("Iltimos, filial nomini kiriting");
      return;
    }

    const initialLat = 40.5283;
    const initialLon = 70.9425;

    const newId = `branch-${Date.now()}`;
    const newBranch: BranchGeozone = {
      id: newId,
      name: newBranchName.trim(),
      description: newBranchDescription.trim(),
      lat: initialLat,
      lon: initialLon,
      radius: newBranchRadius || 100,
      address: newBranchAddress.trim() || 'Qo\'qon shahar',
      isCustom: true,
      isNewUnsaved: true,
      updatedAt: new Date().toISOString()
    };

    const updatedList = [newBranch, ...geozones];
    setGeozones(updatedList);
    try {
      localStorage.setItem('toyonasavdo_branch_geozones', JSON.stringify(updatedList));
    } catch {}

    await Promise.allSettled([
      fetch('/api/branch-geozones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBranch)
      }),
      saveFirebaseGeozone(newBranch)
    ]);

    setNewBranchName('');
    setNewBranchDescription('');
    setNewBranchAddress('');
    setNewBranchRadius(100);
    setShowNewBranchModal(false);

    setSelectedBranchId(newId);
    setEditName(newBranch.name);
    setEditDescription(newBranch.description || '');
    setEditLat(newBranch.lat);
    setEditLon(newBranch.lon);
    setEditRadius(newBranch.radius);
    setEditAddress(newBranch.address);

    setIsLocked(false);
    isLockedRef.current = false;

    setSaveSuccess(`Yangi "${newBranch.name}" qo'shildi. Xaritada joyini belgilang va "Saqlash" tugmasini bosing.`);
    setTimeout(() => setSaveSuccess(null), 5000);
  };

  // Delete branch
  const handleDeleteCurrentBranch = async () => {
    if (geozones.length <= 1) {
      showError("Kamida bitta filial qolishi kerak");
      return;
    }
    const idToDelete = selectedBranchId;
    const updated = geozones.filter(b => b.id !== idToDelete);
    try {
      localStorage.setItem('toyonasavdo_branch_geozones', JSON.stringify(updated));
    } catch {}

    await Promise.allSettled([
      fetch(`/api/branch-geozones/${encodeURIComponent(idToDelete)}`, { method: 'DELETE' }),
      deleteFirebaseGeozone(idToDelete)
    ]);

    setGeozones(updated);
    setShowDeleteBranchModal(false);
    selectBranch(updated[0].id, updated);
  };

  // GPS My Location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showError("Brauzeringizda geolokatsiya qo'llab-quvvatlanmaydi");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        handleCoordsChange(lat, lon);
        
        // Auto-unlock if locked so user can see it moving
        if (isLocked) {
          setIsLocked(false);
          isLockedRef.current = false;
        }
      },
      (err) => {
        let msg = "Joylashuvni aniqlab bo'lmadi. Iltimos, brauzer sozlamalarida geolokatsiyaga ruxsat berilganligini tekshiring.";
        if (err) {
          const code = (err as any).code;
          if (code === 1) msg = "Geolokatsiyaga ruxsat berilmagan.";
          else if (code === 2) msg = "Joylashuvni aniqlab bo'lmadi.";
          else if (code === 3) msg = "Joylashuvni aniqlash vaqti tugadi.";
        }
        showError(msg);
      },
      { enableHighAccuracy: true }
    );
  };

  // Remove Yandex Map initialization effect as we use Google Maps
  useEffect(() => {
    // This component now relies solely on @vis.gl/react-google-maps in the JSX
    // Removed old Yandex initialization logic to keep app clean and focused.
  }, []);

  const filteredBranches = geozones.filter(b => 
    b.name.toLowerCase().includes(searchBranchQuery.toLowerCase()) ||
    b.address.toLowerCase().includes(searchBranchQuery.toLowerCase())
  );

  const handleExportGeozones = (type: 'excel' | 'pdf') => {
    const fileName = `Toyona_Geozonalar_${new Date().toISOString().slice(0, 10)}`;
    const headers = ['№', 'Filial Nomi', 'Manzili', 'Radius (metr)', 'Kenglik (Lat)', 'Uzunlik (Lon)'];
    const data = filteredBranches.map((b, i) => [
      i + 1,
      b.name,
      b.address,
      `${b.radius} m`,
      b.lat.toFixed(6),
      b.lon.toFixed(6)
    ]);

    if (type === 'excel') {
      const excelData = filteredBranches.map((b, i) => ({
        '№': i + 1,
        'Filial Nomi': b.name,
        'Manzili': b.address,
        'Radius (metr)': b.radius,
        'Kenglik (Latitude)': b.lat,
        'Uzunlik (Longitude)': b.lon,
        'Tavsif': b.description || '-'
      }));
      exportToExcel(excelData, fileName);
    } else {
      exportToPDF(headers, data, fileName, "Toyona Savdo - Filial Geozonalari va Koordinatalari");
    }
  };

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 bg-white rounded-2xl shadow-xs border border-slate-200 p-3 sm:p-3.5 font-sans space-y-2 overflow-hidden">
      
      {/* 1. TOP HEADER (Simple, clean, single edit/save control) */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 bg-[#00A651]/10 text-[#00A651] rounded-lg shrink-0">
            <MapPin className="w-4 h-4 text-[#ED1C24]" />
          </span>
          <h1 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight truncate">
            Filial Geozonalarini Belgilash
          </h1>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
            isLocked 
              ? 'bg-emerald-50 text-[#00A651] border border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border border-amber-300 animate-pulse'
          }`}>
            {isLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
            <span className="hidden sm:inline">{isLocked ? 'Qulflangan' : 'Tahrirlanmoqda'}</span>
          </span>
        </div>

        {/* PRIMARY UNIFIED ACTION BUTTONS */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Excel va PDF Yuklab olish */}
          <ExportButtons 
            onExportExcel={() => handleExportGeozones('excel')}
            onExportPDF={() => handleExportGeozones('pdf')}
          />

          <button
            type="button"
            onClick={() => setShowNewBranchModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#00A651]" />
            <span className="hidden sm:inline">+ Yangi Filial</span>
            <span className="sm:hidden">+ Yangi</span>
          </button>

          {isLocked ? (
            <button
              type="button"
              onClick={handleStartEditing}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Tahrirlash</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={isSavingGeozone}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleSaveAndLockGeozone}
                disabled={isSavingGeozone}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00A651] hover:bg-[#008f45] active:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingGeozone ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saqlanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saqlash</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TOAST SUCCESS ALERT */}
      {saveSuccess && (
        <div className="flex items-center gap-2 py-1.5 px-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold shrink-0 animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#00A651] shrink-0" />
          <span className="truncate">{saveSuccess}</span>
        </div>
      )}

      {/* TOAST ERROR ALERT */}
      {errorMessage && (
        <div className="flex items-center gap-2 py-1.5 px-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-lg text-xs font-semibold shrink-0 animate-fadeIn">
          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="truncate">{errorMessage}</span>
        </div>
      )}

      {/* 2. MAIN WORKSPACE (Left Settings, Right Map) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Branches List & Selected Branch Settings */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-2 min-h-0 h-full overflow-hidden">
          
          {/* BRANCHES LIST CARD */}
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-col shrink-0 h-[40%] min-h-[150px]">
            <div className="flex items-center justify-between mb-1 shrink-0 px-1">
              <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#00A651]" />
                Filiallar ({geozones.length} ta)
              </label>
            </div>

            {/* Search Input */}
            <div className="relative mb-1 shrink-0 px-1">
              <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Qidirish..."
                value={searchBranchQuery}
                onChange={(e) => setSearchBranchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2 py-1 text-[11px] outline-none focus:border-[#00A651]"
              />
            </div>

            {/* Branch List Items */}
            <div className="overflow-y-auto space-y-1 pr-1 flex-1 min-h-0 px-1 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Loader2 className="w-5 h-5 text-[#00A651] animate-spin" />
                  <span className="text-[10px] text-slate-400 font-medium">Geozonalar yuklanmoqda...</span>
                </div>
              ) : filteredBranches.length === 0 ? (
                <div className="text-center py-6 text-[11px] text-slate-400">Filiallar topilmadi</div>
              ) : (
                filteredBranches.map((b, bIdx) => {
                const isCurrent = b.id === selectedBranchId;
                return (
                  <div
                    key={`${b.id || b.name}-${bIdx}`}
                    onClick={() => selectBranch(b.id)}
                    className={`flex items-center justify-between p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isCurrent
                        ? isLocked 
                          ? 'bg-emerald-50 border-[#00A651] text-emerald-950 font-bold shadow-sm' 
                          : 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-sm'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
                      <div className="truncate flex-1 min-w-0">
                        <div className="truncate font-bold text-[11px] flex items-center gap-1">
                          <span className="truncate">{b.name}</span>
                          {b.isNewUnsaved && (
                            <span className="text-[8px] font-black bg-rose-100 text-rose-700 px-1 rounded shrink-0">
                              YANGI
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-500 truncate leading-tight">
                          {b.address || 'Qo\'qon shahar'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-1 rounded border border-slate-200">
                        {b.radius}m
                      </span>
                      {b.isCustom && (
                        <button
                          type="button"
                          title="Filialni o'chirish"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBranchId(b.id);
                            setShowDeleteBranchModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>

          {/* SELECTED BRANCH SETTINGS CARD */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 shrink-0">
              <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-[#00A651] shrink-0" />
                <span className="truncate">{currentBranch.name}</span>
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                isLocked 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border border-amber-300'
              }`}>
                {isLocked ? 'Qulflangan' : 'Tahrirlanmoqda'}
              </span>
            </div>

            {/* Branch Name Input */}
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">
                Filial Nomi
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none transition-all ${
                  isLocked 
                    ? 'bg-slate-50 text-slate-600 border-slate-200 cursor-default' 
                    : 'bg-white border-[#00A651] focus:ring-1 focus:ring-[#00A651]/20'
                }`}
              />
            </div>

            {/* Branch Address & Description */}
            <div className="space-y-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-slate-400" />
                  Manzil
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none transition-all ${
                    isLocked 
                      ? 'bg-slate-50 text-slate-600 border-slate-200 cursor-default' 
                      : 'bg-white border-slate-300 focus:border-[#00A651]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5 flex items-center gap-1">
                  <FileText className="w-2.5 h-2.5 text-slate-400" />
                  Mo'ljal
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none transition-all ${
                    isLocked 
                      ? 'bg-slate-50 text-slate-600 border-slate-200 cursor-default' 
                      : 'bg-white border-slate-300 focus:border-[#00A651]'
                  }`}
                />
              </div>
            </div>

            {/* Radius Slider */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase">
                  Radius (Davomat doirasi)
                </label>
                <span className="text-[11px] font-black text-[#00A651] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {editRadius} metr
                </span>
              </div>

              <input
                type="range"
                min="20"
                max="500"
                step="10"
                value={editRadius}
                onChange={(e) => handleRadiusChange(Number(e.target.value))}
                className="w-full accent-[#00A651] h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />

              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {[50, 100, 150, 200].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRadiusChange(r)}
                    className={`text-[10px] font-bold px-2 py-1 rounded border transition-all cursor-pointer ${
                      editRadius === r
                        ? 'bg-[#00A651] text-white border-[#00A651]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r}m
                  </button>
                ))}
              </div>
            </div>

            {/* Coordinates */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <div className="font-mono text-[10px] font-bold">
                {editLat.toFixed(6)}, {editLon.toFixed(6)}
              </div>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="text-[9px] font-bold text-slate-600 hover:text-[#00A651] flex items-center gap-1 cursor-pointer bg-slate-50 px-2 py-1 rounded border border-slate-200"
              >
                <Crosshair className="w-2.5 h-2.5" />
                <span>GPS</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 mt-auto">
              {isLocked ? (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Parametrlarni Tahrirlash</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    disabled={isSavingGeozone}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAndLockGeozone}
                    disabled={isSavingGeozone}
                    className="py-2 px-3 bg-[#00A651] hover:bg-[#008f45] text-white text-[11px] font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSavingGeozone ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saqlanmoqda...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Saqlash</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: OPENSTREETMAP LEAFLET VIEWPORT */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs h-full min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <MapIcon className="w-3.5 h-3.5 text-[#00A651] shrink-0" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider truncate">
                OpenStreetMap — {currentBranch.name}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                Radius: <strong className="text-[#00A651] font-extrabold">{editRadius} m</strong>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                isLocked ? 'bg-emerald-50 text-[#00A651]' : 'bg-amber-50 text-amber-600 animate-pulse'
              }`}>
                {isLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                <span className="hidden sm:inline">{isLocked ? "Qulflangan" : "Harakatlanmoqda"}</span>
              </span>
            </div>
          </div>

          {/* Map Canvas */}
          <div className="relative w-full flex-1 min-h-[280px] h-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            <div 
              ref={mapContainerRef} 
              className="w-full h-full"
              style={{ zIndex: 1 }}
            />

            {/* Top status indicator ribbon */}
            {!isLocked ? (
              <div className="absolute top-2.5 left-2.5 right-2.5 sm:right-36 bg-amber-500/95 backdrop-blur-xs text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md z-10 flex items-center gap-2 animate-fadeIn">
                <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                <span className="truncate">
                  ✏️ Tahrirlash: Dumaloq yoki qizil markerni suring, chetidan radiusni o'zgartiring!
                </span>
              </div>
            ) : (
              <div className="absolute top-2.5 left-2.5 bg-slate-900/70 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-medium shadow-sm z-10 flex items-center gap-1 pointer-events-none">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Geozona qulflangan: {editRadius}m doira qimirlamaydi</span>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 bg-slate-900/80 text-white flex flex-col items-center justify-center p-6 text-center z-20">
                <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                <div className="text-sm font-bold mb-1">{mapError}</div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-2 px-3 py-1.5 bg-[#00A651] text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Qayta yuklash
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* NEW BRANCH MODAL */}
      {showNewBranchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 text-[#00A651] rounded-xl">
                  <Building2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Yangi Filial Qo'shish
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewBranchModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewBranch} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Filial Nomi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Masalan: Quva filiali, Marg'ilon filiali..."
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#00A651]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Filial Manzili
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Marg'ilon shahar, B.Marg'iloniy ko'chasi"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#00A651]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Mo'ljal / Tavsif
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Markaziy bozor ro'parasi"
                  value={newBranchDescription}
                  onChange={(e) => setNewBranchDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#00A651]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">
                    Boshlang'ich Radius
                  </label>
                  <span className="text-xs font-bold text-[#00A651]">
                    {newBranchRadius} metr
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="300"
                  step="10"
                  value={newBranchRadius}
                  onChange={(e) => setNewBranchRadius(Number(e.target.value))}
                  className="w-full accent-[#00A651] h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewBranchModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00A651] hover:bg-[#008f45] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Qo'shish va Xaritada Belgilash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteBranchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-5">
            <h3 className="text-base font-bold text-slate-800 mb-2">
              Filialni o'chirish
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              <strong>"{currentBranch.name}"</strong> filialini o'chirmoqchimisiz?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteBranchModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleDeleteCurrentBranch}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
