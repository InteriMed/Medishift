import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db, auth } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const GrantAuditorAccessSchema = z.object({
  email: z.string().email(),
  expiryHours: z.number().default(24),
  auditorName: z.string(),
});

interface GrantAuditorAccessResult {
  auditorId: string;
  temporaryPassword: string;
  expiresAt: string;
}

export const grantAuditorAccessAction: ActionDefinition<typeof GrantAuditorAccessSchema, GrantAuditorAccessResult> = {
  id: "time.grant_auditor_access",
  fileLocation: "src/services/actions/catalog/time/audit/grantAuditorAccess.ts",
  
  requiredPermission: "admin.access",
  
  label: "Grant Auditor Access (Temporary)",
  description: "Create guest account for SECO inspector (24h, compliance-only)",
  keywords: ["auditor", "access", "temporary", "seco", "compliance"],
  icon: "UserCheck",
  
  schema: GrantAuditorAccessSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
    isSwiss: true,
  },

  handler: async (input, ctx) => {
    const { email, expiryHours, auditorName } = input;

    const temporaryPassword = generateSecurePassword();

    const userCredential = await createUserWithEmailAndPassword(auth, email, temporaryPassword);
    const auditorUid = userCredential.user.uid;

    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const auditorsRef = collection(db, 'temporary_auditors');
    await addDoc(auditorsRef, {
      uid: auditorUid,
      email,
      auditorName,
      role: 'GUEST_AUDITOR',
      permissions: ['time.audit_view', 'docs.compliance_view'],
      allowedRoutes: ['/time/audit', '/docs/compliance'],
      grantedBy: ctx.userId,
      grantedAt: serverTimestamp(),
      expiresAt,
    });

    await ctx.auditLogger('time.grant_auditor_access', 'SUCCESS', {
      auditorEmail: email,
      expiresAt: expiresAt.toISOString(),
      severity: 'CRITICAL',
    });

    return {
      auditorId: auditorUid,
      temporaryPassword,
      expiresAt: expiresAt.toISOString(),
    };
  }
};

function generateSecurePassword(): string {
  return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();
}

