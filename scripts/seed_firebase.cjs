const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDocs, collection } = require('firebase/firestore');
const config = require('../firebase-applet-config.json');

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const users = [
  {
    id: 1,
    name: 'Zarifjon Zokirov',
    username: 'zarif_admin',
    password: 'Toyona2026!Admin',
    email: 'zarifjon@toyonasavdo.uz',
    role: 'Super Admin',
    branch: 'Bosh ofis',
    status: 'Faol',
    isOnline: true,
    lastActive: 'Hozir',
    allowedModules: [
      'users_management', 'branches', 'statistics', 'departments',
      'candidates', 'transfers', 'requests', 'vacancies',
      'employees', 'quality', 'attendance'
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Anvar Toshmatov',
    username: 'anvar_hr',
    password: 'HR#Pass2026!',
    email: 'anvar@toyonasavdo.uz',
    role: 'HR Menejer',
    branch: 'Bosh ofis',
    status: 'Faol',
    isOnline: true,
    lastActive: '10 daqiqa oldin',
    allowedModules: ['branches', 'departments', 'candidates', 'vacancies', 'employees', 'quality', 'attendance', 'transfers', 'requests'],
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Sardor Rahmatov',
    username: 'sardor_mudir',
    password: 'Filial#Chorsu2026',
    email: 'sardor@toyonasavdo.uz',
    role: 'Filial Mudiri',
    branch: 'Turkiston filiali',
    status: 'Faol',
    isOnline: false,
    lastActive: '1 soat oldin',
    allowedModules: ['branches', 'candidates', 'vacancies', 'employees', 'attendance'],
    updatedAt: new Date().toISOString()
  },
  {
    id: 4,
    name: 'Malika Umarova',
    username: 'malika_recruiter',
    password: 'Recruiter#9911!',
    email: 'malika@toyonasavdo.uz',
    role: 'Recruiter',
    branch: 'Bosh ofis',
    status: 'Faol',
    isOnline: true,
    lastActive: '2 soat oldin',
    allowedModules: ['candidates', 'vacancies', 'requests'],
    updatedAt: new Date().toISOString()
  },
  {
    id: 5,
    name: 'Jamshid Aliyev',
    username: 'jamshid_operator',
    password: 'Op#123456!',
    email: 'jamshid@toyonasavdo.uz',
    role: 'Operator',
    branch: 'Navoiy filiali',
    status: 'Muzlatilgan',
    isOnline: false,
    lastActive: '2 kun oldin',
    allowedModules: ['candidates', 'requests'],
    updatedAt: new Date().toISOString()
  }
];

const branches = [
  {
    id: 'branch-1',
    name: 'Turkiston filiali',
    region: 'Farg\'ona viloyati, Qo\'qon sh.',
    category: 'A',
    address: 'Qo\'qon shahar, Turkiston ko\'chasi, 45-uy',
    description: 'Qo\'qon markazidagi bosh savdo do\'koni. Mo\'ljal: Markaziy xiyobon ro\'parasi',
    lat: 40.5283,
    lon: 70.9425,
    radius: 100,
    vacancyCount: 3,
    phone: '+998 73 542 11 22',
    date: '15.09.2026'
  },
  {
    id: 'branch-2',
    name: 'Navoiy filiali',
    region: 'Farg\'ona viloyati, Qo\'qon sh.',
    category: 'A',
    address: 'Qo\'qon shahar, A.Navoiy shoh ko\'chasi, 12-uy',
    description: 'A.Navoiy shoh ko\'chasidagi supermarket. Mo\'ljal: Markaziy bozor yonida',
    lat: 40.5312,
    lon: 70.9388,
    radius: 120,
    vacancyCount: 2,
    phone: '+998 73 542 33 44',
    date: '15.09.2026'
  },
  {
    id: 'branch-3',
    name: 'Istiqlol (Gorod) filiali',
    region: 'Farg\'ona viloyati, Qo\'qon sh.',
    category: 'B',
    address: 'Qo\'qon shahar, Istiqlol ko\'chasi, 88-uy',
    description: 'Shahar markazi, Istiqlol savdo majmuasi 1-qavati',
    lat: 40.5345,
    lon: 70.9450,
    radius: 100,
    vacancyCount: 1,
    phone: '+998 73 542 55 66',
    date: '15.09.2026'
  },
  {
    id: 'branch-4',
    name: 'G\'ishtko\'prik filiali',
    region: 'Farg\'ona viloyati, Qo\'qon sh.',
    category: 'B',
    address: 'Qo\'qon shahar, Muqimiy ko\'chasi, 15-uy',
    description: 'G\'ishtko\'prik hududi, avtovokzal yaqinidagi do\'kon',
    lat: 40.5220,
    lon: 70.9510,
    radius: 150,
    vacancyCount: 2,
    phone: '+998 73 542 77 88',
    date: '15.09.2026'
  },
  {
    id: 'branch-5',
    name: 'Chodak filiali',
    region: 'Namangan viloyati, Pop tumani',
    category: 'C',
    address: 'Pop tumani, Chodak qishlog\'i, Markaziy ko\'cha',
    description: 'Chodak dam olish maskani yo\'nalishidagi savdo nuqtasi',
    lat: 40.8920,
    lon: 70.9230,
    radius: 200,
    vacancyCount: 1,
    phone: '+998 69 432 10 20',
    date: '15.09.2026'
  },
  {
    id: 'branch-6',
    name: 'Beshariq filiali',
    region: 'Farg\'ona viloyati, Beshariq tumani',
    category: 'B',
    address: 'Beshariq shahri, O\'zbekiston ko\'chasi, 102-uy',
    description: 'Beshariq markaziy dehqon bozori ro\'parasi',
    lat: 40.4350,
    lon: 70.6120,
    radius: 150,
    vacancyCount: 4,
    phone: '+998 73 612 34 56',
    date: '15.09.2026'
  },
  {
    id: 'branch-7',
    name: 'Yaypan (O\'zbekiston tumani) filiali',
    region: 'Farg\'ona viloyati, Yaypan sh.',
    category: 'B',
    address: 'Yaypan shahri, Ibn Sino ko\'chasi, 4-uy',
    description: 'Yaypan markazi, tuman hokimiyati yaqinida',
    lat: 40.3750,
    lon: 70.8200,
    radius: 120,
    vacancyCount: 2,
    phone: '+998 73 532 90 12',
    date: '15.09.2026'
  },
  {
    id: 'branch-8',
    name: 'Bosh ofis',
    region: 'Toshkent shahri / Qo\'qon',
    category: 'Boshqaruv',
    address: 'Markaziy boshqaruv idorasi',
    description: 'Boshqaruv, HR va moliya departamenti',
    lat: 40.5280,
    lon: 70.9420,
    radius: 100,
    vacancyCount: 1,
    phone: '+998 71 200 00 00',
    date: '15.09.2026'
  }
];

const employees = [
  {
    id: 'emp-101',
    fullName: 'Zarifjon Zokirov',
    position: 'Bosh Direktor (CEO)',
    department: 'Ijroiya Boshqaruvi',
    branch: 'Bosh ofis',
    phone: '+998 90 123 45 67',
    email: 'zarifjon@toyona.uz',
    hireDate: '2020-03-15',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    staffId: 'TS-0001',
    salary: '25,000,000 UZS',
    address: 'Toshkent sh., Yunusobod t.',
    birthDate: '1990-05-12',
    gender: 'Erkak'
  },
  {
    id: 'emp-102',
    fullName: 'Anvar Toshmatov',
    position: 'Kadrlar bo\'limi boshlig\'i (HR Director)',
    department: 'HR va Kadrlar',
    branch: 'Bosh ofis',
    phone: '+998 91 234 56 78',
    email: 'anvar.hr@toyona.uz',
    hireDate: '2021-06-01',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    staffId: 'TS-0012',
    salary: '14,000,000 UZS',
    address: 'Qo\'qon sh., Turkiston k.',
    birthDate: '1988-11-20',
    gender: 'Erkak'
  },
  {
    id: 'emp-103',
    fullName: 'Malika Umarova',
    position: 'Bosh Rekruter (Lead Recruiter)',
    department: 'HR va Kadrlar',
    branch: 'Bosh ofis',
    phone: '+998 93 345 67 89',
    email: 'malika.recruiter@toyona.uz',
    hireDate: '2022-01-10',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    staffId: 'TS-0024',
    salary: '9,500,000 UZS',
    address: 'Farg\'ona sh., Sayilgoh k.',
    birthDate: '1995-04-18',
    gender: 'Ayol'
  },
  {
    id: 'emp-104',
    fullName: 'Sardor Rahmatov',
    position: 'Filial Boshqaruvchisi (Store Manager)',
    department: 'Savdo va Chakana',
    branch: 'Turkiston filiali',
    phone: '+998 94 456 78 90',
    email: 'sardor.turkiston@toyona.uz',
    hireDate: '2021-09-15',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    staffId: 'TS-0035',
    salary: '11,000,000 UZS',
    address: 'Qo\'qon sh., Charxiy k.',
    birthDate: '1992-08-30',
    gender: 'Erkak'
  },
  {
    id: 'emp-105',
    fullName: 'Dilnoza Karimova',
    position: 'Katta Kassir va Hisobchi',
    department: 'Moliya va G\'azna',
    branch: 'Turkiston filiali',
    phone: '+998 90 567 89 01',
    email: 'dilnoza.k@toyona.uz',
    hireDate: '2022-04-05',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    staffId: 'TS-0048',
    salary: '6,800,000 UZS',
    address: 'Qo\'qon sh., Navoiy k.',
    birthDate: '1996-02-14',
    gender: 'Ayol'
  },
  {
    id: 'emp-106',
    fullName: 'Bobur Mirzayev',
    position: 'Katta Sotuvchi-Konsultant',
    department: 'Savdo va Chakana',
    branch: 'Navoiy filiali',
    phone: '+998 91 678 90 12',
    email: 'bobur.m@toyona.uz',
    hireDate: '2022-08-20',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    staffId: 'TS-0052',
    salary: '5,500,000 UZS',
    address: 'Qo\'qon sh., Istiqlol k.',
    birthDate: '1998-07-22',
    gender: 'Erkak'
  },
  {
    id: 'emp-107',
    fullName: 'Nargiza Olimova',
    position: 'Sotuvchi-Maslahatchi',
    department: 'Savdo va Chakana',
    branch: 'Navoiy filiali',
    phone: '+998 97 789 01 23',
    email: 'nargiza.o@toyona.uz',
    hireDate: '2023-02-10',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    staffId: 'TS-0063',
    salary: '4,800,000 UZS',
    address: 'Qo\'qon sh., Muqimiy k.',
    birthDate: '2001-09-05',
    gender: 'Ayol'
  },
  {
    id: 'emp-108',
    fullName: 'Javohir Qodirov',
    position: 'Omborxona Mudiri (Warehouse Supervisor)',
    department: 'Logistika va Ombor',
    branch: 'Istiqlol (Gorod) filiali',
    phone: '+998 93 890 12 34',
    email: 'javohir.q@toyona.uz',
    hireDate: '2021-11-01',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    staffId: 'TS-0071',
    salary: '7,500,000 UZS',
    address: 'Qo\'qon sh., Bobur k.',
    birthDate: '1993-12-10',
    gender: 'Erkak'
  },
  {
    id: 'emp-109',
    fullName: 'Shahlo Yusupova',
    position: 'Filial Administratori',
    department: 'Savdo va Chakana',
    branch: 'G\'ishtko\'prik filiali',
    phone: '+998 90 901 23 45',
    email: 'shahlo.y@toyona.uz',
    hireDate: '2023-05-15',
    status: 'leave',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    staffId: 'TS-0085',
    salary: '5,200,000 UZS',
    address: 'Qo\'qon sh., Marg\'ilon k.',
    birthDate: '1997-03-28',
    gender: 'Ayol'
  },
  {
    id: 'emp-110',
    fullName: 'Otabek Soliyev',
    position: 'Katta Sotuvchi va Merchandiser',
    department: 'Savdo va Chakana',
    branch: 'Beshariq filiali',
    phone: '+998 94 012 34 56',
    email: 'otabek.s@toyona.uz',
    hireDate: '2022-10-01',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    staffId: 'TS-0092',
    salary: '5,000,000 UZS',
    address: 'Beshariq sh., Markaz k.',
    birthDate: '1999-06-17',
    gender: 'Erkak'
  },
  {
    id: 'emp-111',
    fullName: 'Madina Xasanova',
    position: 'Kassir-Operator',
    department: 'Moliya va G\'azna',
    branch: 'Yaypan (O\'zbekiston tumani) filiali',
    phone: '+998 91 123 78 90',
    email: 'madina.x@toyona.uz',
    hireDate: '2023-08-12',
    status: 'probation',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    staffId: 'TS-0104',
    salary: '4,200,000 UZS',
    address: 'Yaypan sh., Ibn Sino k.',
    birthDate: '2002-10-04',
    gender: 'Ayol'
  },
  {
    id: 'emp-112',
    fullName: 'Rustam Ahmedov',
    position: 'Logistika va Yetkazib berish koordinatori',
    department: 'Logistika va Ombor',
    branch: 'Chodak filiali',
    phone: '+998 93 234 89 01',
    email: 'rustam.a@toyona.uz',
    hireDate: '2023-01-20',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    staffId: 'TS-0115',
    salary: '5,800,000 UZS',
    address: 'Pop tumani, Chodak q.',
    birthDate: '1994-01-30',
    gender: 'Erkak'
  }
];

async function seedAll() {
  console.log('--- Starting Firebase Firestore Seeding ---');

  // 1. Seed Users
  console.log('Seeding Users (with passwords and roles)...');
  for (const user of users) {
    await setDoc(doc(db, 'users', `user-${user.id}`), user, { merge: true });
    console.log(`Saved user: ${user.username} (${user.name})`);
  }

  // 2. Seed Branches
  console.log('Seeding Branches...');
  for (const branch of branches) {
    await setDoc(doc(db, 'branches', branch.id), branch, { merge: true });
    console.log(`Saved branch: ${branch.name}`);
  }

  // 3. Seed Branch Geozones
  console.log('Seeding Branch Geozones...');
  for (const branch of branches) {
    await setDoc(doc(db, 'branch_geozones', branch.id), {
      id: branch.id,
      name: branch.name,
      description: branch.description,
      lat: branch.lat,
      lon: branch.lon,
      radius: branch.radius,
      address: branch.address,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  // 4. Seed Employees
  console.log('Seeding Employees...');
  for (const emp of employees) {
    await setDoc(doc(db, 'employees', emp.id), emp, { merge: true });
  }
  console.log(`Saved ${employees.length} employees`);

  // 5. Seed Statistics summary
  console.log('Seeding Statistics summary...');
  const statsSummary = {
    id: 'overview',
    totalUsers: users.length,
    totalBranches: branches.length,
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => e.status === 'active').length,
    probationEmployees: employees.filter(e => e.status === 'probation').length,
    leaveEmployees: employees.filter(e => e.status === 'leave').length,
    totalVacancies: branches.reduce((sum, b) => sum + (b.vacancyCount || 0), 0),
    departmentsCount: 5,
    attendanceRateToday: 94.5,
    lastCalculatedAt: new Date().toISOString()
  };
  await setDoc(doc(db, 'statistics', 'overview'), statsSummary, { merge: true });
  console.log('Saved statistics overview');

  console.log('--- Firebase Firestore Seeding Completed Successfully! ---');
  process.exit(0);
}

seedAll().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
