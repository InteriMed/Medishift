import { z } from "zod";
import { ActionDefinition } from "../../types";
import { db } from '../../../services/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

const CreateTicketWithCapaSchema = z.object({
  description: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const),
  isBug: z.boolean().default(false),
  category: z.string().optional(),
  attachments: z.array(z.string().url()).optional(),
});

interface CreateTicketWithCapaResult {
  ticketId: string;
  capaId?: string;
}

export const createTicketWithCapaAction: ActionDefinition<typeof CreateTicketWithCapaSchema, CreateTicketWithCapaResult> = {
  id: "support.create_ticket_with_capa",
  fileLocation: "src/services/actions/catalog/support/createTicketWithCapa.ts",
  
  requiredPermission: "thread.create",
  
  label: "Create Support Ticket",
  description: "Open ticket with automatic CAPA for bugs/high severity",
  keywords: ["support", "ticket", "capa", "help"],
  icon: "AlertCircle",
  
  schema: CreateTicketWithCapaSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof CreateTicketWithCapaSchema>, ctx) => {
    const { description, severity, isBug, category, attachments } = input;

    const ticketsRef = collection(db, 'support_tickets');
    const ticketDoc = await addDoc(ticketsRef, {
      userId: ctx.userId,
      facilityId: ctx.facilityId,
      description,
      severity,
      isBug,
      category,
      attachments: attachments || [],
      status: 'OPEN',
      createdAt: serverTimestamp(),
    });

    let capaId: string | undefined;

    if (isBug || severity === 'HIGH' || severity === 'CRITICAL') {
      const capaRef = collection(db, 'capa_entries');
      const capaDoc = await addDoc(capaRef, {
        ticketId: ticketDoc.id,
        status: 'INVESTIGATION',
        createdAt: serverTimestamp(),
        initiatedBy: ctx.userId,
      });
      capaId = capaDoc.id;

      await updateDoc(doc(db, 'support_tickets', ticketDoc.id), { capaId: capaDoc.id });
    }

    await ctx.auditLogger('support.create_ticket_with_capa', 'SUCCESS', {
      ticketId: ticketDoc.id,
      severity,
      isBug,
      capaInitiated: !!capaId,
    });

    return {
      ticketId: ticketDoc.id,
      capaId,
    };
  }
};

