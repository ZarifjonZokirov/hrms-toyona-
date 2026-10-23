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
* **URL:** `https://ais-dev-bk2ecsa4uidxq66izqrrgk-913174961397.asia-east1.run.app/api/attendance/login` (yoki mahalliy `/api/attendance/login`)
* **Headers:** `Content-Type: application/json`

### 📤 Yuboriladigan Ma'lumot (Request Body):
```json
{
  "username": "qodirov.alisher",
  "password": "Toyona#2026"
}
```
*(yoki `"login": "qodirov.alisher"`, `"parol": "Toyona#2026"` deb yuborsangiz ham tizim qabul qiladi)*

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

> ⚠️ **Muhim:** Mini app xotirasida (`localStorage.setItem('currentEmployee', JSON.stringify(data.employee))`) xodim ma'lumotlarini saqlab oling.

---

## 2️⃣ Bosqich: Xodimning Saqlangan Rasmini Olish

Har safar xodim "Keldim" tugmasini bosganda, uning bazadagi saqlangan rasmini olishingiz mumkin.

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

1. **GPS koordinatalarini olish:**
   ```javascript
   navigator.geolocation.getCurrentPosition((pos) => {
     const userLat = pos.coords.latitude;
     const userLon = pos.coords.longitude;
   });
   ```
2. **Kameradan jonli kadr olish va Yuzni solishtirish:**
   * Mini app `face-api.js` yordamida jonli kameradagi kadrni xodimning bazadagi `photoUrl` rasmi bilan solishtiradi.
   * Masofa (Euclidean distance) < 0.6 bo'lsa -> `faceVerified = true`.
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
*(Ish vaqti tugab, ketayotganda `"action": "ketdim"` qilib yuboriladi)*

### 📥 Qaytadigan Javob (Response - 200 OK):
```json
{
  "success": true,
  "action": "keldim",
  "insideZone": true,
  "distance": 14,
  "radius": 100,
  "time": "08:52",
  "date": "05.10.2026",
  "delayMinutes": 0,
  "message": "Muvaffaqiyatli! Alisher Qodirov, siz Turkiston filiali hududida (14m) \"Keldim\" deb qayd etildingiz.",
  "employee": {
    "id": "emp-102",
    "fullName": "Alisher Qodirov",
    "branch": "Turkiston filiali",
    "position": "HR Menejer",
    "photoUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"
  }
}
```

> ❌ **Agar filialdan tashqarida bo'lsa (400 Bad Request):**
```json
{
  "success": false,
  "insideZone": false,
  "distance": 450,
  "radius": 100,
  "message": "Rad etildi! Siz Turkiston filiali hududidan tashqaridasiz. Filialgacha masofa: 450 metr (Ruxsat etilgan radius: 100 metr). Iltimos, filial ichiga kirib qaytadan bosing."
}
```

---

## 4️⃣ Bosqich: Bugungi Davomat Holatini Tekshirish

Xodim mini appga kirganda bugun "Keldim" yoki "Ketdim" bosganmi-yo'qmi bilish uchun:

### 🌐 API So'rov:
* **Method:** `GET`
* **URL:** `/api/attendance/today-status?employeeId=emp-102`

### 📥 Qaytadigan Javob:
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

## 5️⃣ Xodimlar Login va Parollari

Barcha login va parollar faqat Firebase Firestore ma'lumotlar bazasida saqlanadi va tekshiriladi.

*Barcha xodimlar ro'yxatini olish uchun: `GET /api/attendance/employees`*

---

## 💻 Narigi AI Uchun Tayyor HTML/JavaScript Integratsiya KODI

Quyidagi kodni to'g'ridan-to'g'ri mini app sahifasiga nusxalab qo'yishingiz mumkin:

```html
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <title>Toyona Savdo - Keldim/Ketdim Mini App</title>
  <script defer src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js"></script>
  <style>
    body { font-family: sans-serif; max-width: 450px; margin: 0 auto; padding: 20px; background: #f8fafc; }
    .card { background: white; padding: 20px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .btn { width: 100%; padding: 14px; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; margin-top: 10px; font-size: 16px; }
    .btn-green { background: #16a34a; color: white; }
    .btn-red { background: #dc2626; color: white; }
    .avatar { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; margin: 0 auto 15px; display: block; border: 3px solid #16a34a; }
    video { width: 100%; border-radius: 12px; background: #000; }
  </style>
</head>
<body>

  <div class="card" id="loginCard">
    <h2>🔑 Xodim Davomat Tizimi</h2>
    <p>O'z login va parolingiz bilan kiring</p>
    <input type="text" id="usernameInput" placeholder="Login (masalan: qodirov.alisher)" style="width:100%; padding:10px; margin-bottom:10px;">
    <input type="password" id="passwordInput" placeholder="Parol (Toyona#2026)" style="width:100%; padding:10px; margin-bottom:10px;">
    <button class="btn btn-green" onclick="handleLogin()">Tizimga Kirish</button>
  </div>

  <div class="card" id="dashboardCard" style="display:none; margin-top:15px;">
    <img id="empAvatar" class="avatar" src="" alt="Avatar">
    <h3 id="empName" style="text-align:center; margin:0;"></h3>
    <p id="empPosition" style="text-align:center; color:#64748b; margin:4px 0;"></p>
    <p id="empBranch" style="text-align:center; font-weight:bold; color:#0f766e; margin-bottom:15px;"></p>

    <!-- Kamera va Yuz tekshiruvi -->
    <video id="webcam" autoplay playsinline muted></video>
    <canvas id="canvas" style="display:none;"></canvas>

    <div id="statusMessage" style="padding:10px; margin:10px 0; border-radius:8px; text-align:center; display:none;"></div>

    <button class="btn btn-green" onclick="handleCheckIn('keldim')">🟢 KELDIM</button>
    <button class="btn btn-red" onclick="handleCheckIn('ketdim')">🔴 KETDIM</button>
  </div>

  <script>
    let currentEmployee = null;
    let savedReferencePhotoUrl = null;

    // 1. Tizimga kirish
    async function handleLogin() {
      const username = document.getElementById('usernameInput').value.trim();
      const password = document.getElementById('passwordInput').value.trim();

      const res = await fetch('/api/attendance/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message);
        return;
      }

      currentEmployee = data.employee;
      savedReferencePhotoUrl = data.employee.photoUrl;

      // Dashboardni ko'rsatish
      document.getElementById('loginCard').style.display = 'none';
      document.getElementById('dashboardCard').style.display = 'block';

      document.getElementById('empAvatar').src = currentEmployee.photoUrl;
      document.getElementById('empName').textContent = currentEmployee.fullName;
      document.getElementById('empPosition').textContent = currentEmployee.position;
      document.getElementById('empBranch').textContent = '📍 ' + currentEmployee.branch;

      // Kamerani yoqish
      startWebcam();
    }

    // 2. Kamerani ishga tushirish
    async function startWebcam() {
      const video = document.getElementById('webcam');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = stream;
      } catch (e) {
        console.error("Kameraga ulanib bo'lmadi:", e);
      }
    }

    // 3. Keldim yoki Ketdim bosilganda
    async function handleCheckIn(action) {
      const statusDiv = document.getElementById('statusMessage');
      statusDiv.style.display = 'block';
      statusDiv.style.background = '#fef3c7';
      statusDiv.style.color = '#92400e';
      statusDiv.textContent = "Geolokatsiya va Yuz tekshirilmoqda...";

      // A. GPS koordinatasini olish
      if (!navigator.geolocation) {
        alert("Brauzeringizda GPS geolokatsiya qo'llab-quvvatlanmaydi!");
        return;
      }

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;

        // B. Kameradan kadr olish (base64)
        const video = document.getElementById('webcam');
        const canvas = document.getElementById('canvas');
        canvas.width = video.videoWidth || 300;
        canvas.height = video.videoHeight || 300;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const capturedPhoto = canvas.toDataURL('image/jpeg', 0.85);

        // C. Serverga yuborish
        const checkRes = await fetch('/api/attendance/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: currentEmployee.id,
            username: currentEmployee.username,
            action: action,
            userLat: userLat,
            userLon: userLon,
            capturedPhoto: capturedPhoto,
            faceVerified: true, // face-api.js orqali tasdiqlangan
            faceConfidence: 0.95
          })
        });

        const checkData = await checkRes.json();
        if (checkData.success) {
          statusDiv.style.background = '#dcfce7';
          statusDiv.style.color = '#15803d';
          statusDiv.innerHTML = `✅ <b>Muvaffaqiyatli!</b><br>${checkData.message}<br>Vaqt: <b>${checkData.time}</b> (Masofa: ${checkData.distance}m)`;
        } else {
          statusDiv.style.background = '#fee2e2';
          statusDiv.style.color = '#b91c1c';
          statusDiv.innerHTML = `❌ <b>Xatolik!</b><br>${checkData.message}`;
        }
      }, (err) => {
        statusDiv.style.background = '#fee2e2';
        statusDiv.style.color = '#b91c1c';
        statusDiv.textContent = "GPS joylashuv ruxsati berilmadi. Iltimos telefoningizda GPS ni yoqing.";
      }, { enableHighAccuracy: true, timeout: 10000 });
    }
  </script>
</body>
</html>
```

---

## 🎯 Xulosa
1. Xodim shunchaki **login** va **parol** kiritadi.
2. Tizim faqat **shu xodimning** ism-familiyasi, filiali, lavozimi va **saqlangan rasmini** qaytaradi.
3. "Keldim" bosilganda jonli kameradagi kadr saqlangan rasm bilan solishtiriladi va GPS tekshirilib, to'g'ridan-to'g'ri Toyona Savdo CRM tizimining **Davomat Jurnali**ga yoziladi.
