import { z } from "zod";
import { ActionDefinition, ValidationResult } from "../../../types";
import { validateShiftConstraints } from '../constraints';

const ValidateMoveSchema = z.object({
  userId: z.string(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  targetEndTime: z.string().regex(/^\d{2}:\d{2}$/),
  existingShiftId: z.string().optional(),
});

export const validateMoveAction: ActionDefinition<typeof ValidateMoveSchema, ValidationResult> = {
  id: "calendar.validate_move",
  fileLocation: "src/services/actions/catalog/calendar/engine/validateMove.ts",
  
  requiredPermission: "shift.view",
  
  label: "Validate Move (Dry Run)",
  description: "Check if shift assignment is valid without committing",
  keywords: ["validate", "check", "dry run", "constraints"],
  icon: "CheckCircle",
  
  schema: ValidateMoveSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { userId, targetDate, targetStartTime, targetEndTime, existingShiftId } = input;

    const validation = await validateShiftConstraints(
      userId,
      ctx.facilityId,
      {
        date: targetDate,
        startTime: targetStartTime,
        endTime: targetEndTime,
      },
      existingShiftId,
      false
    );

    await ctx.auditLogger('calendar.validate_move', 'SUCCESS', {
      userId,
      targetDate,
      valid: validation.valid,
      violationCount: validation.violations.length,
    });

    return validation;
  }
};

