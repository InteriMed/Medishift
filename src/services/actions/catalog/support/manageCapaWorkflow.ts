import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const ManageCapaWorkflowSchema = z.object({
  ticketId: z.string(),
  step: z.enum(['INVESTIGATION', 'IMPLEMENTATION', 'VERIFICATION']),
  notes: z.object({
    rootCauseAnalysis: z.string().optional(),
    correction: z.string().optional(),
    prevention: z.string().optional(),
    verification: z.string().optional(),
  }),
});

export const manageCapaWorkflowAction: ActionDefinition<typeof ManageCapaWorkflowSchema, void> = {
  id: "support.manage_capa_workflow",
  fileLocation: "src/services/actions/catalog/support/manageCapaWorkflow.ts",
  
  requiredPermission: "admin.access",
  
  label: "Manage CAPA Workflow",
  description: "Update corrective and preventive action process (admin only)",
  keywords: ["capa", "quality", "workflow", "admin"],
  icon: "CheckCircle",
  
  schema: ManageCapaWorkflowSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { ticketId, step, notes } = input;

    const ticketRef = doc(db, 'support_tickets', ticketId);
    const ticketSnap = await getDoc(ticketRef);

    if (!ticketSnap.exists()) {
      throw new Error('Ticket not found');
    }

    const ticket = ticketSnap.data();
    const capaRef = doc(db, 'capa_entries', ticket.capaId);

    const updates: any = {
      status: step,
      [`${step.toLowerCase()}At`]: serverTimestamp(),
      ...notes,
    };

    if (step === 'VERIFICATION' && notes.verification) {
      updates.status = 'COMPLETED';
      updates.completedAt = serverTimestamp();
      
      await updateDoc(ticketRef, {
        status: 'RESOLVED',
        resolvedAt: serverTimestamp(),
      });
    }

    await updateDoc(capaRef, updates);

    await appendAudit('capa_entries', ticket.capaId, {
      uid: ctx.userId,
      action: `CAPA_${step}`,
      metadata: notes,
      severity: 'HIGH',
    });

    await ctx.auditLogger('support.manage_capa_workflow', 'SUCCESS', {
      ticketId,
      step,
    });
  }
};

