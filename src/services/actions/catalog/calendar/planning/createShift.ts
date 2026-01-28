import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { validateShiftConstraints } from '../constraints';
import { appendAudit } from '../../common/utils';

const CreateShiftSchema = z.object({
  userId: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  role: z.string(),
  type: z.enum(['STANDARD', 'NIGHT', 'ON_CALL', 'OVERTIME']).default('STANDARD'),
  force: z.boolean().optional(),
});

interface CreateShiftResult {
  shiftId: string;
  isOpen: boolean;
  validationWarnings?: string[];
}

export const createShiftAction: ActionDefinition<typeof CreateShiftSchema, CreateShiftResult> = {
  id: "calendar.create_shift",
  fileLocation: "src/services/actions/catalog/calendar/planning/createShift.ts",
  
  requiredPermission: "shift.create",
  
  label: "Create Shift",
  description: "Create a new shift (assigned or open/ghost slot)",
  keywords: ["shift", "schedule", "create", "roster"],
  icon: "CalendarPlus",
  
  schema: CreateShiftSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { userId, force, ...shiftData } = input;
    const isOpen = !userId;

    let validationWarnings: string[] = [];

    if (userId) {
      const validation = await validateShiftConstraints(
        userId,
        ctx.facilityId,
        {
          date: shiftData.date,
          startTime: shiftData.startTime,
          endTime: shiftData.endTime,
        },
        undefined,
        force || false
      );

      if (!validation.valid) {
        throw new Error(
          `Shift validation failed: ${validation.violations.map(v => v.message).join('; ')}`
        );
      }

      validationWarnings = validation.warnings;

      if (force && validation.violations.length > 0) {
        await ctx.auditLogger('calendar.create_shift', 'START', {
          action: 'FORCE_OVERRIDE',
          violations: validation.violations,
          reason: 'Manager override',
        });
      }
    }

    const shift = {
      userId: userId || null,
      facilityId: ctx.facilityId,
      date: shiftData.date,
      startTime: shiftData.startTime,
      endTime: shiftData.endTime,
      role: shiftData.role,
      type: shiftData.type,
      status: 'DRAFT',
      isOpen,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: ctx.userId,
      auditHistory: [{
        uid: ctx.userId,
        action: isOpen ? 'CREATED_OPEN_SHIFT' : 'CREATED_SHIFT',
        timestamp: Date.now(),
        metadata: {
          date: shiftData.date,
          userId: userId || 'OPEN',
        },
      }],
    };

    const shiftRef = await addDoc(collection(db, 'shifts'), shift);

    await ctx.auditLogger('calendar.create_shift', 'SUCCESS', {
      shiftId: shiftRef.id,
      userId: userId || 'OPEN',
      date: shiftData.date,
      isOpen,
    });

    return {
      shiftId: shiftRef.id,
      isOpen,
      validationWarnings,
    };
  }
};

