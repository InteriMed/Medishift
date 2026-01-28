import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';
import { sendNotificationToUser } from '../../../../services/notifications';

const SendForSignatureSchema = z.object({
  contractId: z.string(),
  provider: z.enum(['INTERNAL', 'SKRIBBLE', 'DOCUSIGN']).default('INTERNAL'),
});

interface SendForSignatureResult {
  signatureUrl?: string;
  emailSent: boolean;
}

export const sendForSignatureAction: ActionDefinition<typeof SendForSignatureSchema, SendForSignatureResult> = {
  id: "contracts.send_for_signature",
  fileLocation: "src/services/actions/catalog/contracts/sendForSignature.ts",
  
  requiredPermission: "admin.access",
  
  label: "Send Contract for Signature",
  description: "Lock draft and send signature request to employee",
  keywords: ["contract", "signature", "sign", "e-signature"],
  icon: "FileSignature",
  
  schema: SendForSignatureSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { contractId, provider } = input;

    const contractRef = doc(db, 'contracts', contractId);
    const contractSnap = await getDoc(contractRef);

    if (!contractSnap.exists()) {
      throw new Error('Contract not found');
    }

    const contract = contractSnap.data();

    if (contract.status !== 'DRAFT') {
      throw new Error(`Contract cannot be sent for signature. Current status: ${contract.status}`);
    }

    await updateDoc(contractRef, {
      status: 'PENDING_SIGNATURE',
      sentForSignatureAt: serverTimestamp(),
      sentBy: ctx.userId,
      signatureProvider: provider,
      updatedAt: serverTimestamp(),
    });

    await appendAudit('contracts', contractId, {
      uid: ctx.userId,
      action: 'SENT_FOR_SIGNATURE',
      metadata: { provider },
    });

    const userRef = doc(db, 'users', contract.userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    let signatureUrl: string | undefined;

    if (provider === 'INTERNAL') {
      signatureUrl = `/contracts/${contractId}/sign`;
    } else {
      signatureUrl = `https://${provider.toLowerCase()}.com/sign/${contractId}`;
    }

    await sendNotificationToUser(contract.userId, {
      title: 'Contract Ready to Sign',
      body: 'Your employment contract is ready for signature',
      priority: 'HIGH',
      actionUrl: signatureUrl,
      data: {
        contractId,
        type: 'CONTRACT_SIGNATURE',
      },
    });

    await ctx.auditLogger('contracts.send_for_signature', 'SUCCESS', {
      contractId,
      userId: contract.userId,
      provider,
    });

    return {
      signatureUrl,
      emailSent: true,
    };
  }
};

