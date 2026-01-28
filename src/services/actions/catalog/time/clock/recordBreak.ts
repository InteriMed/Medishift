import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const RecordBreakSchema = z.object({
  duration: z.number().positive(),
  comment: z.string().optional(),
});

interface RecordBreakResult {
  breakId: string;
}

export const recordBreakAction: ActionDefinition<typeof RecordBreakSchema, RecordBreakResult> = {
  id: "time.record_break",
  fileLocation: "src/services/actions/catalog/time/clock/recordBreak.ts",
  
  requiredPermission: "time.record_break",
  
  label: "Record Break",
  description: "Log break duration (Swiss law allows block entry)",
  keywords: ["time", "break", "lunch", "pause"],
  icon: "Coffee",
  
  schema: RecordBreakSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { duration, comment } = input;

    const clocksRef = collection(db, 'time_clock_entries');
    const breakDoc = await addDoc(clocksRef, {
      userId: ctx.userId,
      type: 'BREAK_START',
      timestamp: serverTimestamp(),
      duration,
      comment,
      method: 'BLOCK_ENTRY',
      status: 'VALID',
    });

    await ctx.auditLogger('time.record_break', 'SUCCESS', {
      breakId: breakDoc.id,
      duration,
    });

    return {
      breakId: breakDoc.id,
    };
  }
};

