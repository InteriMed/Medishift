import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const DeclarePiquetInterventionSchema = z.object({
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  patientCaseId: z.string().optional(),
  travelTimeMinutes: z.number().default(0),
  comment: z.string().optional(),
});

interface DeclarePiquetInterventionResult {
  interventionId: string;
  compensationRate: number;
  totalHours: number;
}

export const declarePiquetInterventionAction: ActionDefinition<typeof DeclarePiquetInterventionSchema, DeclarePiquetInterventionResult> = {
  id: "time.declare_piquet_intervention",
  fileLocation: "src/services/actions/catalog/time/piquet/declarePiquetIntervention.ts",
  
  requiredPermission: "time.declare_piquet_intervention",
  
  label: "Declare Piquet Intervention (Swiss On-Call)",
  description: "Switch from on-call to active work (150% + travel time)",
  keywords: ["piquet", "on-call", "intervention", "swiss"],
  icon: "AlertCircle",
  
  schema: DeclarePiquetInterventionSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
    isSwiss: true,
  },

  handler: async (input, ctx) => {
    const { date, startTime, endTime, patientCaseId, travelTimeMinutes, comment } = input;

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    const activeMinutes = (end.getTime() - start.getTime()) / 60000;
    const totalMinutes = activeMinutes + travelTimeMinutes;
    const totalHours = totalMinutes / 60;

    const piquetRate = 1.5;

    const interventionsRef = collection(db, 'piquet_interventions');
    const interventionDoc = await addDoc(interventionsRef, {
      userId: ctx.userId,
      date,
      startTime,
      endTime,
      activeMinutes,
      travelTimeMinutes,
      totalHours,
      compensationRate: piquetRate,
      patientCaseId: patientCaseId || null,
      comment,
      status: 'ACTIVE_WORK',
      createdAt: serverTimestamp(),
    });

    const balanceRef = doc(db, 'time_balances', ctx.userId);
    const balanceSnap = await getDoc(balanceRef);
    
    if (balanceSnap.exists()) {
      await updateDoc(balanceRef, {
        piquet_hours_worked: (balanceSnap.data().piquet_hours_worked || 0) + totalHours,
      });
    }

    const lastRestRef = doc(db, 'rest_tracking', ctx.userId);
    await updateDoc(lastRestRef, {
      lastWorkEnd: serverTimestamp(),
      lastInterventionType: 'PIQUET',
      resetReason: 'Piquet intervention resets 11h rest clock',
    });

    await appendAudit('piquet_interventions', interventionDoc.id, {
      uid: ctx.userId,
      action: 'PIQUET_INTERVENTION_DECLARED',
      metadata: { totalHours, compensationRate: piquetRate },
      severity: 'MEDIUM',
    });

    await ctx.auditLogger('time.declare_piquet_intervention', 'SUCCESS', {
      interventionId: interventionDoc.id,
      totalHours,
      compensationRate: piquetRate,
    });

    return {
      interventionId: interventionDoc.id,
      compensationRate: piquetRate,
      totalHours,
    };
  }
};

