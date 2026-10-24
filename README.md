# NovaHR™ — Enterprise Workforce & Human Resource Management System

![NovaHR Banner](https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80)

> **NovaHR** is an enterprise-grade, all-in-one Human Resource Management System (HRMS) designed for modern corporations, retail networks, and multi-branch enterprises. Built with **React 19**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Firebase Firestore / Node.js backend**, featuring AI Face Recognition attendance and GPS Geofenced check-ins.

---

## 🌟 Key Features

### 1. 📍 Smart Attendance & Geofencing
- **Biometric Face ID:** AI-driven facial recognition model running client-side with `@vladmandic/face-api`.
- **GPS Multi-Branch Geofencing:** Radius calculation using high-precision Haversine formula to prevent remote clock-in abuse.
- **Automated Delay & Penalty Calculation:** Granular grace periods, delay tiers, overtime bonuses, and automated payroll deduction estimations.
- **Live Daily Timesheet:** Real-time visibility into who is currently clocked in, late, on leave, or on business trip.

### 2. 🏢 Branch & Organizational Structure
- Multi-branch hierarchy management with individual GPS coordinates and radius configurations.
- Department mapping, staff headcount quotas, and branch-specific performance tracking.
- Interactive branch maps powered by **Leaflet** & **OpenStreetMap**.

### 3. 👥 Employee Management & 360° Profiles
- Comprehensive digital staff files: contracts, salary agreements, ID copies, and emergency contacts.
- Career timeline tracking: internal promotions, salary adjustments, and disciplinary history.
- Auto-generated staff login credentials and printable welcome access slips.

### 4. 🎯 Recruitment & ATS (Applicant Tracking System)
- Visual Kanban candidate pipeline: *Applied ➔ Screening ➔ Interview ➔ Offer ➔ Hired / Rejected*.
- Online public job application form (`/anketa.html`) with file attachment upload.
- One-click applicant onboarding directly into employee roster.

### 5. 🔄 Employee Transfers & Rotations
- Formal inter-branch employee rotation workflow with historical audit logs.
- Super Admin approval gates and role transition tracking.

### 6. ⭐ Quality Control & KPI Scorecards
- Service quality audits, mystery shopper evaluations, and branch compliance inspections.
- Weighted scoring metrics with actionable remediation notes.

### 7. 📊 Executive Analytics & Export
- Interactive charts and workforce trend metrics powered by **Recharts**.
- One-click exports to **Excel (.xlsx)** and print-ready **PDF (.pdf)** reports.
- Immutable system audit trail capturing every login, edit, and privilege change.

---

## 🚀 Live Demo Credentials

The application includes an **Offline Demo Mode** out of the box so you can test all features immediately without configuring Firebase:

- **URL:** [Deploy on Vercel or run locally]
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Super Administrator (Full access to all 12 modules)

---

## 💻 Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite
- **UI Components & Icons:** Lucide React, Motion (Framer Motion)
- **Mapping & GIS:** Leaflet, OpenStreetMap
- **Computer Vision:** @vladmandic/face-api
- **Charts:** Recharts
- **Database / Auth:** Google Cloud Firestore / Firebase v12 (with zero-config Demo Mode fallback)
- **Deployment:** Vercel (Edge / Serverless Functions ready)

---

## 📦 Quick Start Guide

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd novahr
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Build for Production
```bash
npm run build
```

---

## ☁️ Connecting Your Own Firebase Backend

See the detailed step-by-step guide in [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md).

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Paste your Firebase Web App configuration keys into `.env` (or `firebase-config.json`).
3. Deploy to Vercel with a single click!

---

## 📄 License & Support

Commercial license for Envato / CodeCanyon buyers.
For technical inquiries or custom enterprise extensions, please open a ticket on your purchase dashboard.
