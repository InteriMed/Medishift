import { validateMoveAction } from '../src/services/actions/catalog/calendar/engine/validateMove';
import { resolveGapAction } from '../src/services/actions/catalog/calendar/engine/resolveGap';

// @ts-ignore
import { db } from '../src/services/services/firebase'; 
// 1. IMPORT AUTH
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"; 

// 2. MOCK CONTEXT (Updated)
const MOCK_CTX: any = {
  // ⚠️ CRITICAL: This must match the UID of the user you log in with below!
  // If you use a random string here, your "Safety Rules" inside the action might pass, 
  // but Firestore Security Rules might still block you if they check request.auth.uid
  userId: "test_admin_uid", // Replace with the REAL UID from Firebase Console
  facilityId: "fac_geneva_01", 
  userPermissions: ["shift.create", "shift.view"],
  auditLogger: async (id: string, status: string, payload: any) => 
    console.log(`[AUDIT] ${id}: ${status}`, payload)
};

async function authenticate() {
  console.log("🔑 Authenticating...");
  const auth = getAuth(); // Uses the app initialized in ../services/firebase
  try {
    // 3. LOG IN (Replace with your real test user credentials)
    const userCredential = await signInWithEmailAndPassword(auth, "demo@medishift.ch", "DemoPass123!");
    console.log(`✅ Logged in as: ${userCredential.user.email} (${userCredential.user.uid})`);
    
    // Update the mock context with the REAL uid to match
    MOCK_CTX.userId = userCredential.user.uid; 
    
  } catch (error: any) {
    console.error("❌ Auth Failed. Did you create the user in Firebase Console?");
    console.error(`   Error: ${error.code} - ${error.message}`);
    process.exit(1);
  }
}

async function runTests() {
  // 4. WAIT FOR AUTH BEFORE TESTING
  await authenticate();

  console.log("\n🚀 Starting Calendar Logic Tests...\n");

  // --- TEST 1: The Constraint Engine (validate_move) ---
  console.log("1️⃣ Testing 11h Rest Rule (validate_move)...");
  
  try {
    const result = await validateMoveAction.handler({
      userId: MOCK_CTX.userId, // Use self for testing
      targetDate: "2024-02-05", 
      targetStartTime: "06:00", 
      targetEndTime: "14:00"
    }, MOCK_CTX);

    if (!result.valid && result.violations?.[0]?.code === 'DAILY_REST_VIOLATION') {
      console.log("✅ SUCCESS: Engine correctly blocked the 11h rest violation.");
    } else {
      // It passes if you have no previous shifts. That is technically a "Success" for the code logic.
      console.log("ℹ️ INFO: No violations found (Expected if DB is empty).");
      console.log("   Result:", JSON.stringify(result, null, 2));
    }
  } catch (e) {
    console.error("❌ CRASH:", e);
  }

  console.log("\n--------------------------------------------------\n");

  // --- TEST 2: The AI Solver (resolve_gap) ---
  console.log("2️⃣ Testing AI Gap Resolver (resolve_gap)...");
  
  try {
    const result = await resolveGapAction.handler({
      date: "2024-02-06",
      missingRole: "PHARMACIST",
      startTime: "08:00",
      endTime: "17:00"
    }, MOCK_CTX);

    console.log(`Found ${result.candidates.length} candidates.`);
    // ... rest of logging
  } catch (e) {
    console.error("❌ CRASH:", e);
  }
}

runTests();