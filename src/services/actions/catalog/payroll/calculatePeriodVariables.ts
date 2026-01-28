import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { PayrollVariables } from '../contracts/types';

const CalculatePeriodVariablesSchema = z.object({
  facilityId: z.string(),
  month: z.number().min(1).max(12),
  year: z.number(),
});

interface CalculatePeriodVariablesResult {
  variables: Record<string, PayrollVariables>;
  totalEmployees: number;
  totalStandardHours: number;
  totalOvertimeHours: number;
  warnings: string[];
}

export const calculatePeriodVariablesAction: ActionDefinition<typeof CalculatePeriodVariablesSchema, CalculatePeriodVariablesResult> = {
  id: "payroll.calculate_period_variables",
  fileLocation: "src/services/actions/catalog/payroll/calculatePeriodVariables.ts",
  
  requiredPermission: "admin.access",
  
  label: "Calculate Payroll Period Variables",
  description: "Aggregate hours from calendar and time clock for payroll",
  keywords: ["payroll", "calculate", "hours", "aggregate"],
  icon: "Calculator",
  
  schema: CalculatePeriodVariablesSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { facilityId, month, year } = input;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const shiftsRef = collection(db, 'shifts');
    const q = query(
      shiftsRef,
      where('facilityId', '==', facilityId),
      where('status', '==', 'COMPLETED'),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr)
    );

    const snapshot = await getDocs(q);
    const shifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const userVariables: Record<string, PayrollVariables> = {};
    const warnings: string[] = [];

    for (const shift of shifts) {
      if (!shift.userId) continue;

      if (!userVariables[shift.userId]) {
        userVariables[shift.userId] = {
          userId: shift.userId,
          standardHours: 0,
          overtimeHours: 0,
          sundayHours: 0,
          nightHours: 0,
          vacationDaysTaken: 0,
          sickDays: 0,
        };
      }

      const startTime = parseTime(shift.startTime);
      const endTime = parseTime(shift.endTime);
      const duration = calculateDuration(startTime, endTime);

      const shiftDate = new Date(shift.date);
      const dayOfWeek = shiftDate.getDay();
      const isSunday = dayOfWeek === 0;

      const isNight = startTime >= 20 || endTime <= 6;

      if (shift.type === 'OVERTIME') {
        userVariables[shift.userId].overtimeHours += duration;
      } else if (isSunday) {
        userVariables[shift.userId].sundayHours += duration;
      } else if (isNight) {
        userVariables[shift.userId].nightHours += duration;
      } else {
        userVariables[shift.userId].standardHours += duration;
      }
    }

    const leaveRef = collection(db, 'leave_requests');
    const leaveQuery = query(
      leaveRef,
      where('facilityId', '==', facilityId),
      where('status', '==', 'APPROVED')
    );

    const leaveSnapshot = await getDocs(leaveQuery);
    
    for (const leaveDoc of leaveSnapshot.docs) {
      const leave = leaveDoc.data();
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);

      if (leaveStart <= endDate && leaveEnd >= startDate) {
        if (!userVariables[leave.userId]) {
          userVariables[leave.userId] = {
            userId: leave.userId,
            standardHours: 0,
            overtimeHours: 0,
            sundayHours: 0,
            nightHours: 0,
            vacationDaysTaken: 0,
            sickDays: 0,
          };
        }

        if (leave.type === 'VACATION') {
          userVariables[leave.userId].vacationDaysTaken += leave.daysRequested || 0;
        } else if (leave.type === 'SICK') {
          userVariables[leave.userId].sickDays += leave.daysRequested || 0;
        }
      }
    }

    const draftShiftsQuery = query(
      shiftsRef,
      where('facilityId', '==', facilityId),
      where('status', '==', 'DRAFT'),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr)
    );

    const draftSnapshot = await getDocs(draftShiftsQuery);
    if (!draftSnapshot.empty) {
      warnings.push(`${draftSnapshot.size} DRAFT shifts still exist for this period. Lock will fail.`);
    }

    let totalStandardHours = 0;
    let totalOvertimeHours = 0;

    Object.values(userVariables).forEach(v => {
      totalStandardHours += v.standardHours;
      totalOvertimeHours += v.overtimeHours;
    });

    await ctx.auditLogger('payroll.calculate_period_variables', 'SUCCESS', {
      facilityId,
      month,
      year,
      employeeCount: Object.keys(userVariables).length,
    });

    return {
      variables: userVariables,
      totalEmployees: Object.keys(userVariables).length,
      totalStandardHours,
      totalOvertimeHours,
      warnings,
    };
  }
};

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
}

function calculateDuration(start: number, end: number): number {
  if (end < start) {
    return (24 - start) + end;
  }
  return end - start;
}

