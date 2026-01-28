import { z } from "zod";

export type ShiftType = 'STANDARD' | 'NIGHT' | 'ON_CALL' | 'OVERTIME';
export type ShiftStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED';
export type LeaveType = 'VACATION' | 'UNPAID' | 'EDUCATION' | 'SICK' | 'MATERNITY';
export type AvailabilityStatus = 'PREFERRED' | 'AVAILABLE' | 'IMPOSSIBLE';
export type SwapStatus = 'PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface Shift {
  id: string;
  userId?: string | null;
  facilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  type: ShiftType;
  status: ShiftStatus;
  isOpen: boolean;
  createdAt: number;
  updatedAt: number;
  auditHistory: Array<{
    uid: string;
    action: string;
    timestamp: number;
    metadata?: Record<string, any>;
  }>;
}

export interface ConstraintViolation {
  code: string;
  severity: 'ERROR' | 'WARNING';
  message: string;
  affectedShifts?: string[];
}

export interface ValidationResult {
  valid: boolean;
  violations: ConstraintViolation[];
  burdenScore: number;
  warnings: string[];
}

export interface SwissLawConstraints {
  maxConsecutiveDays: number;
  minDailyRestHours: number;
  maxWeeklyHours: number;
  maxDailyHours: number;
  minWeeklyRestHours: number;
}

export const SWISS_LAW_DEFAULTS: SwissLawConstraints = {
  maxConsecutiveDays: 6,
  minDailyRestHours: 11,
  maxWeeklyHours: 50,
  maxDailyHours: 12,
  minWeeklyRestHours: 35,
};

export interface CoverageSlot {
  date: string;
  timeSlot: string;
  requiredStaff: number;
  actualStaff: number;
  deficit: number;
  roles: Record<string, { required: number; actual: number }>;
}

export interface CandidateScore {
  userId: string;
  score: number;
  reason: string;
  category: 'INTERNAL_LOW_BALANCE' | 'INTERNAL' | 'FLOATER' | 'OVERTIME' | 'EXTERNAL';
  violations: ConstraintViolation[];
  vacationBalance: number;
  weeklyHours: number;
}

