# NovaHR™ — Step-by-Step Installation & Deployment Guide

This guide walks you through setting up **NovaHR** locally, connecting your own Google Firebase Firestore database, and deploying to Vercel.

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Connecting Firebase Firestore](#3-connecting-firebase-firestore)
4. [Deploying to Vercel](#4-deploying-to-vercel)
5. [Default Admin Credentials & Security](#5-default-admin-credentials--security)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Prerequisites

Before starting, ensure you have:
- **Node.js** v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm** v9+ (comes bundled with Node.js)
- A free **Google Cloud / Firebase account** ([Firebase Console](https://console.firebase.google.com/))
- A free **Vercel account** ([Vercel Sign Up](https://vercel.com/signup))

---

## 2. Local Development Setup

1. **Extract / Clone the project:**
   ```bash
   cd CodeCanyon
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:5173`.
   
   > 💡 **Demo Mode:** By default, if no Firebase credentials are provided, NovaHR launches in **Demo Mode** with fully populated mock branches, candidates, employees, and analytics.

---

## 3. Connecting Firebase Firestore

To connect your own real-time production database:

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**, enter a project name (e.g., `my-company-hrms`), and continue.
3. In the project dashboard, click the **Web icon (`</>`)** to register a web app.
4. Copy the `firebaseConfig` object values provided by Firebase.

### Step 2: Enable Cloud Firestore
1. In the Firebase console left sidebar, navigate to **Build ➔ Firestore Database**.
2. Click **Create database**.
3. Choose your nearest database location (e.g., `us-central1` or `europe-west1`).
4. Select **Start in test mode** for initial setup, then click **Enable**.

### Step 3: Configure Environment Variables
You have two easy ways to set your credentials:

#### Option A: Using `.env` (Recommended for Vercel & Production)
Create a `.env` file in the project root based on `.env.example`:
```env
VITE_FIREBASE_API_KEY=AIzaSyA...YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

#### Option B: Using `firebase-config.json`
Open `firebase-config.json` in the root folder and paste your keys:
```json
{
  "apiKey": "AIzaSyA...YOUR_API_KEY",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project",
  "storageBucket": "your-project.firebasestorage.app",
  "messagingSenderId": "123456789012",
  "appId": "1:123456789012:web:abcdef123456"
}
```

---

## 4. Deploying to Vercel

NovaHR is pre-configured with `vercel.json` for seamless 1-click deployment on Vercel.

### Method 1: Deploy from GitHub (Easiest)
1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of NovaHR"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```
2. Open [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New ➔ Project**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add the `VITE_FIREBASE_*` variables from your `.env` file.
5. Click **Deploy**.

### Method 2: Deploy using Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## 5. Default Admin Credentials & Security

### Default Super Admin:
- **Username:** `admin`
- **Password:** `admin123`

### 🔒 Post-Installation Security Checklist:
1. Immediately log in and navigate to **Users Management**.
2. Click **Edit Credentials** on the Super Admin account to set a strong, custom password.
3. Create dedicated accounts with restricted module access for your HR Managers, Branch Supervisors, and Accountants.
4. Update your Firestore Security Rules in the Firebase Console to enforce role-based write access.

---

## 6. Troubleshooting

- **White screen on load:** Check browser DevTools console (F12). Ensure modern browser supporting ES Modules is used.
- **Biometric Face ID camera permission denied:** Ensure your site is served over HTTPS (standard on Vercel and `localhost`). Browsers restrict webcam access over unencrypted HTTP.
- **GPS Coordinates outside range:** Ensure branch latitude and longitude are entered in decimal format (e.g., `41.311081`, `69.240562`) and geofence radius is at least 150-300 meters to account for mobile GPS drift.

---
© NovaHR Enterprise. All rights reserved.
