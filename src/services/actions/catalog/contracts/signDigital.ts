import { z } from "zod";
import { ActionDefinition } from "../../../flows/types";
import { db } from '../../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../common/utils';

const SignDigitalSchema = z.object({
  contractId: z.string(),
  signatureData: z.string(),
  confirmPassword: z.string(),
});

export const signDigitalAction: ActionDefinition<typeof SignDigitalSchema, void> = {
  id: "contracts.sign_digital",
  fileLocation: "src/services/actions/catalog/contracts/signDigital.ts",
  
  requiredPermission: "thread.create",
  
  label: "Sign Contract Digitally",
  description: "Sign contract with SES (Simple Electronic Signature) and re-auth",
  keywords: ["sign", "signature", "contract", "e-sign"],
  icon: "PenTool",
  
  schema: SignDigitalSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { contractId, signatureData, confirmPassword } = input;

    const { auth } = await import('../../../services/firebase');
    const { reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
    
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('User not authenticated');
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, confirmPassword);
      await reauthenticateWithCredential(user, credential);
    } catch (error) {
      throw new Error('Password verification failed. Cannot proceed with signature.');
    }

    const contractRef = doc(db, 'contracts', contractId);
    const contractSnap = await getDoc(contractRef);

    if (!contractSnap.exists()) {
      throw new Error('Contract not found');
    }

    const contract = contractSnap.data();

    if (contract.status !== 'PENDING_SIGNATURE') {
      throw new Error(`Contract cannot be signed. Current status: ${contract.status}`);
    }

    if (contract.userId !== ctx.userId) {
      throw new Error('You can only sign your own contracts');
    }

    const signatureMetadata = {
      ip: ctx.ipAddress || 'UNKNOWN',
      timestamp: Date.now(),
      method: 'SES_WITH_REAUTH',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SERVER',
    };

    await updateDoc(contractRef, {
      status: 'SIGNED',
      signedAt: serverTimestamp(),
      signedBy: ctx.userId,
      signatureData,
      signatureMetadata,
      updatedAt: serverTimestamp(),
    });

    await appendAudit('contracts', contractId, {
      uid: ctx.userId,
      action: 'SIGNED',
      ip: ctx.ipAddress,
      metadata: signatureMetadata,
    });

    await ctx.auditLogger('contracts.sign_digital', 'SUCCESS', {
      contractId,
      signatureMethod: 'SES_WITH_REAUTH',
    });
  }
};

