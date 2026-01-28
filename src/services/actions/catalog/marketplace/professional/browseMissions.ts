import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, DocumentData } from 'firebase/firestore';
// ⚠️ Helper function for Distance (Put this in utils later)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const BrowseMissionsSchema = z.object({
  filters: z.object({
    role: z.string().optional(),
    minRate: z.number().optional(),
    maxDistanceKM: z.number().optional(),
    dateRange: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
    cantons: z.array(z.string()).optional(),
  }).optional(),
  sortBy: z.enum(['distance', 'rate', 'date'] as const).default('date'),
});

interface BrowseMissionsResult {
  missions: any[];
}

export const browseMissionsAction: ActionDefinition<typeof BrowseMissionsSchema, BrowseMissionsResult> = {
  id: "marketplace.browse_missions",
  fileLocation: "src/services/actions/catalog/marketplace/professional/browseMissions.ts",
  requiredPermission: "marketplace.browse_missions",
  label: "Browse Missions",
  description: "Search available job postings with geo-sorting",
  keywords: ["marketplace", "browse", "missions", "jobs"],
  icon: "Search",
  schema: BrowseMissionsSchema,
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },
  handler: async (input: z.infer<typeof BrowseMissionsSchema>, ctx: ActionContext) => {
    const { filters, sortBy } = input;

    // 1. 🔍 Correct Collection Reference (From your Schema Summary)
    const positionsRef = collection(db, 'positions');
    
    // 2. 🛡️ Base Query
    let q = query(
      positionsRef,
      where('status', '==', 'open') // Schema says 'open', not 'PUBLISHED'
    );

    // 3. ⚡ Apply Firestore Filters (Server-Side)
    // Note: Firestore requires composite indexes for multiple range/equality filters.
    if (filters?.role) {
      // Assuming 'title' or a dedicated 'role' field exists in your schema
      q = query(q, where('title', '==', filters.role)); 
    }
    // Optimization: If sorting by date, pre-sort in DB
    if (sortBy === 'date') {
      q = query(q, orderBy('startTime', 'desc')); // Schema uses 'startTime'
    }

    const snapshot = await getDocs(q);
    
    let userLocation: { lat: number; lng: number } | null = null;
    if (sortBy === 'distance' || filters?.maxDistanceKM) {
      // Fetch specifically the professionalProfile, NOT the sensitive 'users' doc
      const profileSnap = await getDoc(doc(db, 'professionalProfiles', ctx.userId));
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        // Assuming location is stored as { lat: number, lng: number } inside 'professionalDetails' or root
        userLocation = data.contact?.location || data.location; 
      }
    }

    // 5. 🧶 Client-Side Processing (Filtering & Sorting)
    let missions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    // A. Filter by Canton (Client-side because array-contains-any is limited)
    if (filters?.cantons && filters.cantons.length > 0) {
      missions = missions.filter(m => filters.cantons?.includes(m.location?.canton));
    }

    // B. Calculate Distances & Filter by Radius
    if (userLocation && (filters?.maxDistanceKM || sortBy === 'distance')) {
      missions = missions.map(m => {
        const dist = m.location?.coordinates && userLocation ? calculateDistance(
          userLocation.lat, userLocation.lng,
          m.location.coordinates.lat, m.location.coordinates.lng
        ) : Infinity;
        return { ...m, _distance: dist };
      });

      if (filters?.maxDistanceKM) {
        missions = missions.filter(m => m._distance <= filters.maxDistanceKM!);
      }
    }

    // C. Apply Sorts
    if (sortBy === 'distance') {
      missions.sort((a, b) => (a._distance || 9999) - (b._distance || 9999));
    } else if (sortBy === 'rate') {
      missions.sort((a, b) => (b.compensation?.amount || 0) - (a.compensation?.amount || 0));
    }

    // 6. 📝 Audit (Simplified)
    // Don't log the full result set, just the count
    // The hook.ts wrapper usually handles this, but here is manual if needed:
    // ctx.auditLogger('marketplace.browse_missions', 'SUCCESS', { count: missions.length });

    return {
      missions: missions.slice(0, 50), // Pagination Limit
    };
  }
};