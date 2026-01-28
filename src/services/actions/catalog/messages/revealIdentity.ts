import { z } from "zod";
import { ActionDefinition } from "../../types";
import { db } from '../../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../common/utils';

const RevealIdentitySchema = z.object({
  reportId: z.string(),
  reason: z.string().min(10),
});

interface RevealIdentityResult {
  userId: string;
  email: string;
  revealedAt: number;
}

export const revealIdentityAction: ActionDefinition<typeof RevealIdentitySchema, RevealIdentityResult> = {
  id: "reporting.reveal_identity",
  fileLocation: "src/services/actions/catalog/messages/revealIdentity.ts",
  
  requiredPermission: "reporting.reveal_identity",
  
  label: "Reveal Anonymous Identity",
  description: "Break glass: Reveal identity of anonymous reporter (HR Admin only)",
  keywords: ["reveal", "identity", "anonymous", "break glass"],
  icon: "AlertTriangle",
  
  schema: RevealIdentitySchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { reportId, reason } = input;

    const reportRef = doc(db, 'hr_reports', reportId);
    const { getDoc } = await import('firebase/firestore');
    const reportSnap = await getDoc(reportRef);

    if (!reportSnap.exists()) {
      throw new Error('Report not found');
    }

    const reportData = reportSnap.data();

    if (!reportData.isAnonymous) {
      throw new Error('This report is not anonymous');
    }

    if (reportData.revealedBy) {
      throw new Error('Identity already revealed');
    }

    const createdByHash = reportData.createdByHash;
    
    const usersRef = await import('firebase/firestore').then(m => m.collection(db, 'users'));
    const usersSnap = await getDocs(usersRef);
    
    let revealedUserId = null;
    let revealedEmail = null;

    for (const userDoc of usersSnap.docs) {
      const hash = hashUserId(userDoc.id);
      if (hash === createdByHash) {
        revealedUserId = userDoc.id;
        revealedEmail = userDoc.data().email;
        break;
      }
    }

    if (!revealedUserId) {
      throw new Error('Could not resolve user identity');
    }

    const revealedAt = Date.now();

    await updateDoc(reportRef, {
      revealedBy: ctx.userId,
      revealedAt: serverTimestamp(),
      revealedReason: reason,
      updatedAt: serverTimestamp(),
    });

    await appendAudit('hr_reports', reportId, {
      uid: ctx.userId,
      action: 'IDENTITY_REVEALED',
      metadata: {
        reason,
        revealedUserId,
        severity: 'HIGH',
      },
    });

    await ctx.auditLogger('reporting.reveal_identity', 'SUCCESS', {
      reportId,
      reason,
      revealedUserId,
    });

    const { logSecurityEvent } = await import('../../../services/audit');
    await logSecurityEvent('IDENTITY_REVEALED', ctx.userId, {
      reportId,
      revealedUserId,
      reason,
      facilityId: ctx.facilityId,
    });

    return {
      userId: revealedUserId,
      email: revealedEmail,
      revealedAt,
    };
  }
};

function hashUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `HASH_${Math.abs(hash).toString(36)}`;
}

async function getDocs(ref: any) {
  const { getDocs: getDocsFirestore } = await import('firebase/firestore');
  return getDocsFirestore(ref);
}

