# 🏢 "Toyona Savdo" — Xodimlar "Keldim/Ketdim" Mini App Integratsiya Qo'llanmasi
*(Yuz tanish (Face Recognition) va HTML mini app yaratgan boshqa AI hamda dasturchilar uchun texnik qo'llanma)*

---

## 📌 Umumiy Arxitektura va Ishlash Tartibi (Workflow)

```
[XODIM TELEFONI (Mini App)]
        │
        ├── 1. Login va Parol kiritadi ──> [POST /api/attendance/login]
        │                                         │
        │   <── Faqat shu xodim ma'lumotlari ─────┘
        │       (ism, familiya, lavozim, filial, saqlangan rasm, filial geozonasi)
        │
        ├── 2. "Keldim" tugmasi bosiladi
        │       ├── A. GPS koordinata olinadi (navigator.geolocation)
        │       ├── B. Kameradan xodim yuzi suratga olinadi
        │       └── C. Saqlangan rasm bilan solishtiriladi (Face Match)
        │                                         │
        └── 3. Natija serverga yuboriladi ───────> [POST /api/attendance/check-in]
                                                  │
            <── Muvaffaqiyatli tasdiq ────────────┴──> Firestore CRM bazasiga saqlanadi
```

---

## 1️⃣ Bosqich: Xodim Tizimga Kirishi (Login / Parol)

Xodim o'ziga berilgan **login** va **parol** orqali mini appga kiradi. Har bir xodim faqat o'z profiliga kiradi va faqat o'z ma'lumotlarini ko'radi.

### 🌐 API So'rov:
* **Method:** `POST`
* **URL:** `/api/attendance/login`
* **Headers:** `Content-Type: application/json`

### 📤 Yuboriladigan Ma'lumot (Request Body):
```json
{
  "username": "qodirov.alisher",
  "password": "Toyona#2026"
}
```

### 📥 Qaytadigan Javob (Response - 200 OK):
```json
{
  "success": true,
  "message": "Xush kelibsiz, Alisher Qodirov!",
  "employee": {
    "id": "emp-102",
    "staffId": "TS-0012",
    "fullName": "Alisher Qodirov",
    "firstName": "Alisher",
    "lastName": "Qodirov",
    "position": "HR Menejer",
    "lavozim": "HR Menejer",
    "branch": "Turkiston filiali",
    "filial": "Turkiston filiali",
    "department": "HR va Kadrlar",
    "phone": "+998 91 234 56 78",
    "email": "alisher.q@toyona.uz",
    "photoUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
    "rasmUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
    "username": "qodirov.alisher",
    "status": "active"
  },
  "branchGeozone": {
    "id": "branch-1",
    "name": "Turkiston filiali",
    "lat": 40.5283,
    "lon": 70.9425,
    "radius": 100,
    "address": "Qo'qon shahar, Turkiston ko'chasi, 45-uy"
  },
  "sessionToken": "token_emp-102_1728114000000"
}
```

---

## 2️⃣ Bosqich: Xodimning Saqlangan Rasmini Olish

Har safar xodim "Keldim" tugmasini bosganda, uning bazadagi saqlangan etalon rasmini olishingiz mumkin.

### 🌐 API So'rov:
* **Method:** `GET`
* **URL:** `/api/attendance/employee-photo?employeeId=emp-102` (yoki `?username=qodirov.alisher`)

### 📥 Qaytadigan Javob:
```json
{
  "success": true,
  "employeeId": "emp-102",
  "fullName": "Alisher Qodirov",
  "position": "HR Menejer",
  "branch": "Turkiston filiali",
  "photoUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
  "message": "Xodimning tizimda saqlangan rasmi muvaffaqiyatli yuborildi."
}
```

---

## 3️⃣ Bosqich: Yuz Tanish (Face Verification) va "Keldim" / "Ketdim" Bosish

Xodim filialga kelib "Keldim" tugmasini bosganda mini app quyidagi 3 ishni bajaradi:

1. **GPS koordinatalarini olish:** (`navigator.geolocation.getCurrentPosition`)
2. **Kameradan jonli kadr olish va Yuzni solishtirish:**
   * Mini app `face-api.js` yordamida jonli kameradagi kadrni xodimning bazadagi `photoUrl` rasmi bilan solishtiradi.
3. **Natijani Serverga yuborish:**

### 🌐 API So'rov:
* **Method:** `POST`
* **URL:** `/api/attendance/check-in`
* **Headers:** `Content-Type: application/json`

### 📤 Yuboriladigan Ma'lumot (Request Body):
```json
{
  "employeeId": "emp-102",
  "username": "qodirov.alisher",
  "action": "keldim", 
  "userLat": 40.5283,
  "userLon": 70.9425,
  "capturedPhoto": "data:image/jpeg;base64,...",
  "faceVerified": true,
  "faceConfidence": 0.96
}
```

---

## 4️⃣ Bosqich: Bugungi Davomat Holatini Tekshirish

### 🌐 API So'rov:
* **Method:** `GET`
* **URL:** `/api/attendance/today-status?employeeId=emp-102`

```json
{
  "success": true,
  "hasCheckedIn": true,
  "checkInTime": "08:52",
  "hasCheckedOut": false,
  "checkOutTime": null,
  "todayDate": "05.10.2026"
}
```

---

## 5️⃣ Real Xodimlar Login va Parollari (Barchasi Firestore Bazasida Faol)

| № | Ism Familiya | Filial | Lavozim | Login (Username) | Parol |
|---|---|---|---|---|---|
| 1 | **Zarifjon Zokirov** | Bosh ofis | Bosh Direktor (CEO) | `20090915` (yoki `zarif_admin`) | `ZZOKIROV20009@z` |
| 2 | **Alisher Qodirov** | Turkiston filiali | HR Menejer | `qodirov.alisher` | `Toyona#6976` (yoki `Toyona#2026`) |
| 3 | **Dilnoza Karimova** | Bosh ofis | Bosh Hisobchi | `karimova.dilnoza` | `Toyona#2026` |
| 4 | **Bobur Saidov** | Turkiston filiali | Filial Mudiri | `saidov.bobur` | `Toyona#2026` |
| 5 | **Malika Umarova** | Navoiy filiali | Sifat Nazorati Mutaxassisi | `umarova.malika` | `Toyona#2026` |
| 6 | **Jahongir Rahimov** | Bosh ofis | IT Administrator | `rahimov.jahongir` | `Toyona#2026` |
| 7 | **Sevara Yusupova** | Istiqlol (Gorod) filiali | Kassa Nazoratchisi | `yusupova.sevara` | `Toyona#2026` |
| 8 | **Sardor Mansurov** | Mingtut filiali | Logistika va Ombor Mudiri | `mansurov.sardor` | `Toyona#2026` |
| 9 | **Zulxumor Ahmedova** | Yakkatut filiali | Marketing Mutaxassisi | `oripova.gulnoza` | `Toyona#2026` |
| 10 | **Bekzod Niyozov** | Pop filiali | Savdo Konsultanti | `jorayev.otabek` | `Toyona#2026` |
| 11 | **Nodirbek Qodirov** | Yaypan filiali | Filial Boshqaruvchisi | `madina.xasanova` | `Toyona#2026` |
| 12 | **Rustam Alimov** | Furqat filiali | Filial Boshqaruvchisi | `rustam.ahmedov` | `Toyona#2026` |

---

## 6️⃣ Qo'llab-quvvatlanadigan Real API Yo'llari (Barcha Serverlarda Faol)

* **Xodim tizimga kirishi (Login):**
  * `POST /api/attendance/login` va `POST /api/qatnashish/kirish`
* **Davomat qayd etish (Check-in/Check-out):**
  * `POST /api/attendance/check-in` va `POST /api/qatnashish/check-in`
* **Filial geozonalari (Barcha 11 filial):**
  * `GET /api/geozones` va `GET /api/branch-geozones` va `GET /api/qatnashish/geozonalar`
* **Xodimlar ro'yxati (Barcha ma'lumotlar bilan):**
  * `GET /api/attendance/employees`
* **Davomat tarixi (Firestore'dan real vaqtda):**
  * `GET /api/attendance/history` va `GET /api/qatnashish/tarix`
* **Ta'til (✈️) va Xizmat safari (🍃) belgilash:**
  * `POST /api/attendance/leave-sync` va `POST /api/qatnashish/tatil-sync`
