import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { validateShiftConstraints } from '../constraints';

const ApplyPatternSchema = z.object({
  userId: z.string(),
  patternId: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  force: z.boolean().optional(),
});

interface ApplyPatternResult {
  createdShifts: string[];
  failedDates: Array<{ date: string; reason: string }>;
}

export const applyPatternAction: ActionDefinition<typeof ApplyPatternSchema, ApplyPatternResult> = {
  id: "calendar.apply_pattern",
  fileLocation: "src/services/actions/catalog/calendar/planning/applyPattern.ts",
  
  requiredPermission: "shift.create",
  
  label: "Apply Shift Pattern",
  description: "Bulk-create shifts based on employee's contract template",
  keywords: ["pattern", "template", "bulk", "schedule"],
  icon: "Copy",
  
  schema: ApplyPatternSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { userId, patternId, startDate, endDate, force } = input;

    const patternRef = doc(db, 'shift_patterns', patternId);
    const patternSnap = await getDoc(patternRef);

    if (!patternSnap.exists()) {
      throw new Error('Pattern not found');
    }

    const pattern = patternSnap.data();

    const start = new Date(startDate);
    const end = new Date(endDate);
    const createdShifts: string[] = [];
    const failedDates: Array<{ date: string; reason: string }> = [];

    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0];

      const dayPattern = pattern.schedule[dayOfWeek];
      
      if (dayPattern && dayPattern.works) {
        try {
          const validation = await validateShiftConstraints(
            userId,
            ctx.facilityId,
            {
              date: dateStr,
              startTime: dayPattern.startTime,
              endTime: dayPattern.endTime,
            },
            undefined,
            force || false
          );

          if (!validation.valid) {
            failedDates.push({
              date: dateStr,
              reason: validation.violations.map(v => v.message).join('; '),
            });
          } else {
            const shift = {
              userId,
              facilityId: ctx.facilityId,
              date: dateStr,
              startTime: dayPattern.startTime,
              endTime: dayPattern.endTime,
              role: pattern.role,
              type: dayPattern.type || 'STANDARD',
              status: 'DRAFT',
              isOpen: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              createdBy: ctx.userId,
              patternId,
              auditHistory: [{
                uid: ctx.userId,
                action: 'CREATED_FROM_PATTERN',
                timestamp: Date.now(),
                metadata: { patternId },
              }],
            };

            const shiftRef = await addDoc(collection(db, 'shifts'), shift);
            createdShifts.push(shiftRef.id);
          }
        } catch (error) {
          failedDates.push({
            date: dateStr,
            reason: (error as Error).message,
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    await ctx.auditLogger('calendar.apply_pattern', 'SUCCESS', {
      userId,
      patternId,
      createdCount: createdShifts.length,
      failedCount: failedDates.length,
    });

    return {
      createdShifts,
      failedDates,
    };
  }
};

