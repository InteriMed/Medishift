// scripts/seed-data.ts
// @ts-ignore
import { db } from '../src/services/services/firebase';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

// 1. CONFIG
const FACILITY_ID = "fac_geneva_01";
const TIRED_NURSE_ID = "test_user_demo_2026"; // The user you are logging in as
const FRESH_PHARMA_ID = "user_pharma_candidate";

async function seed() {
  console.log("🌱 Starting Database Seeding...");
  
  // Login first (needed for write permissions if using Client SDK)
  const auth = getAuth();
  await signInWithEmailAndPassword(auth, "demo@medishift.ch", "DemoPass123!");

  // --- SCENARIO A: Create the "Tired Nurse" History ---
  // We create a shift that ended LATE yesterday (Feb 4th at 23:00)
  // This means if they start today (Feb 5th at 06:00), they only had 7h rest.
  console.log("1. Creating 'Yesterday Shift' for violation test...");
  
  await setDoc(doc(db, "shifts", "shift_yesterday_1"), {
    userId: TIRED_NURSE_ID,
    facilityId: FACILITY_ID,
    date: "2024-02-04",      // Yesterday
    startTime: "14:00",
    endTime: "23:00",        // Ends late!
    role: "NURSE",
    type: "STANDARD",
    status: "PUBLISHED"
  });

  // --- SCENARIO B: Create the "Perfect Candidate" ---
  // A pharmacist who belongs to the facility and is active
  console.log("2. Creating 'Candidate User' for AI test...");
  
  await setDoc(doc(db, "users", FRESH_PHARMA_ID), {
    email: "pharma@test.com",
    firstName: "Maria",
    lastName: "Tester",
    role: "PHARMACIST",      // Matches the search query
    facilityId: FACILITY_ID, // Matches the facility
    status: "ACTIVE",        // Must be active
    employmentType: "INTERNAL"
  });

  // Also give her a contract so we can calculate vacation balance (optional but good)
  await setDoc(doc(db, "contracts", `contract_${FRESH_PHARMA_ID}`), {
    userId: FRESH_PHARMA_ID,
    facilityId: FACILITY_ID,
    status: "ACTIVE",
    annualVacationDays: 25,
    maxWeeklyHours: 42
  });

  console.log("✅ Seeding Complete!");
}

seed().catch(console.error);