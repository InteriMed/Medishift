// scripts/seed-admin.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// 1. Load the Service Account Key
const serviceAccountPath = path.resolve('service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ ERROR: 'service-account.json' not found.");
  console.error("👉 Please download it from Firebase Console > Project Settings > Service Accounts");
  console.error("👉 Place it in the root directory of your project.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// 2. Initialize Admin SDK
// Only initialize if not already done (prevents hot-reload errors)
const app = getApps().length === 0 
  ? initializeApp({ credential: cert(serviceAccount) })
  : getApps()[0];

// ⚠️ THE FIX: Connect specifically to the 'medishift' database
// If this fails, try removing the 'medishift' argument to default to '(default)'
const db = getFirestore(app, 'medishift'); 

// 3. CONFIG
const FACILITY_ID = "fac_geneva_01";
const TIRED_NURSE_ID = "test_user_demo_2026"; 
const FRESH_PHARMA_ID = "user_pharma_candidate";

async function seed() {
  console.log(`🌱 Starting Admin Seeding on database: 'medishift'...`);

  // --- SCENARIO A: The "Tired Nurse" ---
  console.log("1. Creating 'Tired Nurse' Profile & Shift...");

  await db.collection("users").doc(TIRED_NURSE_ID).set({
    email: "demo@medishift.ch",
    firstName: "Demo",
    lastName: "Nurse",
    role: "NURSE",
    facilityId: FACILITY_ID,
    status: "ACTIVE",
    employmentType: "INTERNAL"
  });

  await db.collection("shifts").doc("shift_yesterday_1").set({
    userId: TIRED_NURSE_ID,
    facilityId: FACILITY_ID,
    date: "2024-02-04", 
    startTime: "14:00",
    endTime: "23:00",
    role: "NURSE",
    type: "STANDARD",
    status: "PUBLISHED"
  });

  // --- SCENARIO B: The "Perfect Candidate" ---
  console.log("2. Creating 'Fresh Pharmacist'...");
  
  await db.collection("users").doc(FRESH_PHARMA_ID).set({
    email: "pharma@test.com",
    firstName: "Maria",
    lastName: "Tester",
    role: "PHARMACIST",      
    facilityId: FACILITY_ID, 
    status: "ACTIVE",       
    employmentType: "INTERNAL"
  });

  console.log("3. Creating Contract...");
  await db.collection("contracts").doc(`contract_${FRESH_PHARMA_ID}`).set({
    userId: FRESH_PHARMA_ID,
    facilityId: FACILITY_ID,
    status: "ACTIVE",
    annualVacationDays: 25,
    maxWeeklyHours: 42
  });

  console.log("✅ Admin Seeding Complete!");
  console.log("👉 Now run: tsx scripts/test-calendar.ts");
}

seed().catch((error) => {
  console.error("❌ Seeding Failed:");
  console.error(error);
  // Helpful hint for the next error
  if (error.code === 5) {
    console.error("\n💡 TIP: Check your Firebase Console > Firestore Database.");
    console.error("   Does a database named 'medishift' actually exist?");
    console.error("   If you are using the default database, remove 'medishift' from getFirestore().");
  }
});