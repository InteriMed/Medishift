import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const BlockUserSchema = z.object({
  targetUserId: z.string(),
  scope: z.enum(['THIS_FACILITY', 'ENTIRE_ORG']),
  reason: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

export const blockUserAction: ActionDefinition<typeof BlockUserSchema, void> = {
  id: "risk.block_user",
  fileLocation: "src/services/actions/catalog/risk/blockUser.ts",
  
  requiredPermission: "risk.block_user",
  
  label: "Block User (Blacklist)",
  description: "Instant ban + scheduler purge (theft, misconduct)",
  keywords: ["risk", "block", "ban", "blacklist", "security"],
  icon: "Shield",
  
  schema: BlockUserSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { targetUserId, scope, reason, severity } = input;

    const blocklistRef = doc(db, 'user_blocklist', targetUserId);
    
    await setDoc(blocklistRef, {
      userId: targetUserId,
      scope,
      blockedBy: ctx.userId,
      blockedFacilityId: scope === 'THIS_FACILITY' ? ctx.facilityId : null,
      reason,
      severity,
      createdAt: serverTimestamp(),
    });

    const shiftsRef = collection(db, 'calendar_shifts');
    const futureShiftsQuery = query(
      shiftsRef,
      where('userId', '==', targetUserId),
      where('date', '>=', new Date().toISOString().split('T')[0])
    );
    const futureShiftsSnapshot = await getDocs(futureShiftsQuery);

    for (const shiftDoc of futureShiftsSnapshot.docs) {
      const shift = shiftDoc.data();
      
      if (scope === 'ENTIRE_ORG' || shift.facilityId === ctx.facilityId) {
        await deleteDoc(shiftDoc.ref);
      }
    }

    const userRef = doc(db, 'users', targetUserId);
    await setDoc(userRef, {
      status: 'BLOCKED',
      blockedReason: reason,
      blockedAt: serverTimestamp(),
    }, { merge: true });

    await appendAudit('user_blocklist', targetUserId, {
      uid: ctx.userId,
      action: 'USER_BLOCKED',
      metadata: { scope, reason, severity },
      severity: 'CRITICAL',
    });

    await ctx.auditLogger('risk.block_user', 'SUCCESS', {
      targetUserId,
      scope,
      reason,
      shiftsRemoved: futureShiftsSnapshot.size,
    });
  }
};

